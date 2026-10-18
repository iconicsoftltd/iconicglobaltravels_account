import { InvoiceStatus, Prisma, VoucherType } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../utils/prisma";

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) =>
  Number(value ?? 0);

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const accountDelta = (account: string, entryType: "Debit" | "Credit", amount: number) => {
  const debitIncreases = account === "Assets" || account === "Expense";
  return debitIncreases === (entryType === "Debit") ? amount : -amount;
};

const calculateInvoiceAmounts = (body: any) => {
  const subtotal = body.items.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const itemDiscount = body.items.reduce((sum: number, item: any) => sum + Number(item.discountAmount || 0), 0);
  const itemTax = body.items.reduce((sum: number, item: any) => sum + Number(item.taxAmount || 0), 0);
  const discountAmount = itemDiscount + Number(body.discountAmount || 0);
  const taxAmount = itemTax + Number(body.taxAmount || 0);
  const deliveryAmount = Number(body.deliveryAmount || 0);
  const grandTotal = subtotal - discountAmount + taxAmount + deliveryAmount;
  return { subtotal, discountAmount, taxAmount, deliveryAmount, grandTotal };
};

const invoiceItems = (body: any) => body.items.map((item: any) => ({
  itemType: item.itemType,
  productVariationId: item.productVariationId,
  serviceId: item.serviceId,
  name: item.name,
  description: item.description,
  quantity: money(Number(item.quantity)),
  unit: item.unit || "pcs",
  unitPrice: money(Number(item.unitPrice)),
  discountAmount: money(Number(item.discountAmount || 0)),
  taxAmount: money(Number(item.taxAmount || 0)),
  lineTotal: money(Number(item.quantity) * Number(item.unitPrice) - Number(item.discountAmount || 0) + Number(item.taxAmount || 0)),
}));

async function createAutomaticVoucher(
  tx: Prisma.TransactionClient,
  args: {
    branchId: number;
    invoiceNo: string;
    type: VoucherType;
    date: Date;
    narration: string;
    entries: { particularId: number; type: "Debit" | "Credit"; amount: number }[];
  },
) {
  const debit = args.entries.filter((entry) => entry.type === "Debit").reduce((sum, entry) => sum + entry.amount, 0);
  const credit = args.entries.filter((entry) => entry.type === "Credit").reduce((sum, entry) => sum + entry.amount, 0);
  if (Math.abs(debit - credit) > 0.0001) throw new Error("Automatic voucher is not balanced");

  const sequence = await tx.voucher.count({ where: { branchId: args.branchId } });
  const voucher = await tx.voucher.create({
    data: {
      branchId: args.branchId,
      type: args.type,
      date: args.date,
      voucherNo: `INV-${args.invoiceNo}-${sequence + 1}`,
      narration: args.narration,
    },
  });

  const particulars = await tx.particular.findMany({
    where: { id: { in: args.entries.map((entry) => entry.particularId) } },
    include: { ledger: { include: { group: true } } },
  });

  for (const entry of args.entries) {
    const particular = particulars.find((item) => item.id === entry.particularId);
    if (!particular || particular.branchId !== args.branchId) throw new Error("Invoice account does not belong to the selected branch");
    const delta = accountDelta(particular.ledger.group.account, entry.type, entry.amount);
    await tx.particularOnVoucher.create({ data: { voucherId: voucher.id, particularId: particular.id, type: entry.type, amount: entry.amount } });
    await tx.particular.update({ where: { id: particular.id }, data: { balance: { increment: delta } } });
    await tx.ledger.update({ where: { id: particular.ledgerId }, data: { balance: { increment: delta } } });
  }

  return voucher;
}

async function salesIncomeParticular(tx: Prisma.TransactionClient, branchId: number) {
  const ledgers = await tx.ledger.findMany({
    where: { branchId, isActive: true },
    include: { particulars: { take: 1 } },
  });
  const preferredNames = ["sales", "sell", "service", "income", "product sale", "products sale"];
  const ledger = preferredNames
    .map((name) => ledgers.find((item) => item.ledgerType.trim().toLowerCase() === name && item.particulars[0]))
    .find(Boolean);
  const particular = ledger?.particulars[0];
  if (!ledger || !particular) {
    throw new Error("No active sales or income ledger with a linked particular is configured for this branch");
  }
  return particular;
}

function invoiceStatus(grandTotal: number, paidAmount: number, dueDate?: Date | null) {
  const due = grandTotal - paidAmount;
  if (due <= 0.0001) return "PAID" as const;
  if (paidAmount > 0) return "PARTIALLY_PAID" as const;
  if (dueDate && dueDate < new Date()) return "OVERDUE" as const;
  return "DUE" as const;
}

async function nextInvoiceNo(tx: Prisma.TransactionClient, branchId: number, invoiceDate: Date) {
  const month = `${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;
  const lastInvoice = await tx.invoice.findFirst({
    where: { branchId, invoiceNo: { startsWith: `INV-${branchId}-${month}-` } },
    orderBy: { id: "desc" },
  });
  const lastSerial = lastInvoice ? Number(lastInvoice.invoiceNo.split("-").pop()) || 0 : 0;
  return `INV-${branchId}-${month}-${String(lastSerial + 1).padStart(4, "0")}`;
}

async function validateCustomer(tx: Prisma.TransactionClient, customerId: number, branchId: number) {
  const customer = await tx.particular.findUnique({ where: { id: customerId } });
  if (!customer || customer.branchId !== branchId) throw new Error("Customer does not belong to the selected branch");
  return customer;
}

async function postInitialInvoiceVouchers(
  tx: Prisma.TransactionClient,
  args: {
    invoiceId: number;
    invoiceNo: string;
    branchId: number;
    customerId: number;
    invoiceDate: Date;
    paidAmount: number;
    dueAmount: number;
    paymentAccountId?: number;
    paymentMethod?: string;
    referenceNo?: string;
    userId?: number;
  },
) {
  if (args.paidAmount <= 0 && args.dueAmount <= 0) return;
  const income = await salesIncomeParticular(tx, args.branchId);

  if (args.paidAmount > 0) {
    if (!args.paymentAccountId) throw new Error("Payment account is required when an initial payment is received");
    const receipt = await createAutomaticVoucher(tx, {
      branchId: args.branchId,
      invoiceNo: args.invoiceNo,
      type: "RECEIPT",
      date: args.invoiceDate,
      narration: `Invoice ${args.invoiceNo} initial receipt`,
      entries: [
        { particularId: args.paymentAccountId, type: "Debit", amount: args.paidAmount },
        { particularId: income.id, type: "Credit", amount: args.paidAmount },
      ],
    });
    await tx.invoicePayment.create({ data: { invoiceId: args.invoiceId, paymentAccountId: args.paymentAccountId, voucherId: receipt.id, amount: money(args.paidAmount), paymentDate: args.invoiceDate, method: args.paymentMethod || "Cash", referenceNo: args.referenceNo, receivedById: args.userId } });
    await tx.invoiceVoucher.create({ data: { invoiceId: args.invoiceId, voucherId: receipt.id, postingType: "INITIAL_PAID", amount: money(args.paidAmount) } });
  }

  if (args.dueAmount > 0) {
    const journal = await createAutomaticVoucher(tx, {
      branchId: args.branchId,
      invoiceNo: args.invoiceNo,
      type: "JOURNAL",
      date: args.invoiceDate,
      narration: `Invoice ${args.invoiceNo} customer receivable`,
      entries: [
        { particularId: args.customerId, type: "Debit", amount: args.dueAmount },
        { particularId: income.id, type: "Credit", amount: args.dueAmount },
      ],
    });
    await tx.invoiceVoucher.create({ data: { invoiceId: args.invoiceId, voucherId: journal.id, postingType: "INITIAL_DUE", amount: money(args.dueAmount) } });
  }
}


const activeInvoicePostingTypes = ["INITIAL_PAID", "INITIAL_DUE", "COLLECTION"] as const;

async function reverseActiveInvoicePostings(
  tx: Prisma.TransactionClient,
  invoice: { id: number; invoiceNo: string; branchId: number },
  reason: string,
  userId?: number,
) {
  const activeLinks = await tx.invoiceVoucher.findMany({
    where: { invoiceId: invoice.id, postingType: { in: [...activeInvoicePostingTypes] } },
  });
  if (!activeLinks.length) return;

  const vouchers = await tx.voucher.findMany({
    where: { id: { in: activeLinks.map((link) => link.voucherId) } },
    include: { particulars: true },
  });

  for (const voucher of vouchers) {
    const amount = voucher.particulars.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) / 2;
    const reverseVoucher = await createAutomaticVoucher(tx, {
      branchId: invoice.branchId,
      invoiceNo: invoice.invoiceNo,
      type: voucher.type === "JOURNAL" ? "JOURNAL" : "PAYMENT",
      date: new Date(),
      narration: `Invoice ${invoice.invoiceNo} ${reason}: reverse ${voucher.voucherNo}`,
      entries: voucher.particulars.map((entry) => ({
        particularId: entry.particularId,
        type: entry.type === "Debit" ? "Credit" : "Debit",
        amount: Number(entry.amount),
      })),
    });
    await tx.invoiceVoucher.create({ data: { invoiceId: invoice.id, voucherId: reverseVoucher.id, postingType: "REVERSAL", amount: money(amount) } });
  }

  await tx.invoicePayment.deleteMany({ where: { invoiceId: invoice.id } });
  await tx.invoiceVoucher.deleteMany({ where: { id: { in: activeLinks.map((link) => link.id) } } });
  await tx.invoiceAuditLog.create({ data: { invoiceId: invoice.id, branchId: invoice.branchId, userId, action: "REVERSE_POSTINGS", description: `Invoice ${invoice.invoiceNo} postings reversed for ${reason}` } });
}
export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const branchId = Number(body.branchId);
      const customerId = Number(body.customerId);
      const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
      const dueDate = body.dueDate ? new Date(body.dueDate) : null;
      const isDraft = Boolean(body.isDraft);
      if (dueDate && dueDate < invoiceDate) throw new Error("Due date cannot be before invoice date");

      await validateCustomer(tx, customerId, branchId);
      const amounts = calculateInvoiceAmounts(body);
      const initialPaidAmount = isDraft ? 0 : Number(body.initialPaidAmount || 0);
      if (initialPaidAmount > amounts.grandTotal) throw new Error("Initial payment cannot exceed invoice total");
      const dueAmount = amounts.grandTotal - initialPaidAmount;
      const invoiceNo = await nextInvoiceNo(tx, branchId, invoiceDate);
      const status: InvoiceStatus = isDraft ? "DRAFT" : invoiceStatus(amounts.grandTotal, initialPaidAmount, dueDate);

      const invoice = await tx.invoice.create({
        data: {
          branchId,
          customerId,
          invoiceNo,
          invoiceDate,
          dueDate,
          status,
          subtotal: money(amounts.subtotal),
          discountAmount: money(amounts.discountAmount),
          taxAmount: money(amounts.taxAmount),
          deliveryAmount: money(amounts.deliveryAmount),
          grandTotal: money(amounts.grandTotal),
          paidAmount: money(initialPaidAmount),
          dueAmount: money(dueAmount),
          notes: body.notes,
          terms: body.terms,
          createdById: req.user?.id,
          items: { create: invoiceItems(body) },
        },
        include: { items: true },
      });

      if (!isDraft) {
        await postInitialInvoiceVouchers(tx, {
          invoiceId: invoice.id,
          invoiceNo,
          branchId,
          customerId,
          invoiceDate,
          paidAmount: initialPaidAmount,
          dueAmount,
          paymentAccountId: body.paymentAccountId ? Number(body.paymentAccountId) : undefined,
          paymentMethod: body.paymentMethod,
          referenceNo: body.referenceNo,
          userId: req.user?.id,
        });
      }

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: invoice.id,
          branchId,
          userId: req.user?.id,
          action: isDraft ? "CREATE_DRAFT" : "CREATE",
          description: isDraft ? `Draft invoice ${invoiceNo} saved` : `Invoice ${invoiceNo} created`,
          data: { initialPaidAmount, dueAmount },
        },
      });
      return invoice;
    });
    res.status(201).json({ success: true, message: result.status === "DRAFT" ? "Draft invoice saved successfully" : "Invoice created successfully", data: result });
  } catch (error) { next(error); }
};

export const updateDraftInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const body = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!existing) throw new Error("Invoice not found");
      if (existing.status === "CANCELLED") throw new Error("Cancelled invoice cannot be edited");
      if (existing.status === "PAID") throw new Error("Fully paid invoices cannot be edited");
      const branchId = Number(body.branchId);
      const customerId = Number(body.customerId);
      if (existing.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");
      const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;
      const dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (dueDate && dueDate < invoiceDate) throw new Error("Due date cannot be before invoice date");
      await validateCustomer(tx, customerId, branchId);
      const amounts = calculateInvoiceAmounts(body);

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });

      if (existing.status === "DRAFT" || Boolean(body.isDraft)) {
        const updated = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            customerId,
            invoiceDate,
            dueDate,
            status: "DRAFT",
            subtotal: money(amounts.subtotal),
            discountAmount: money(amounts.discountAmount),
            taxAmount: money(amounts.taxAmount),
            deliveryAmount: money(amounts.deliveryAmount),
            grandTotal: money(amounts.grandTotal),
            paidAmount: money(0),
            dueAmount: money(amounts.grandTotal),
            notes: body.notes,
            terms: body.terms,
            items: { create: invoiceItems(body) },
          },
          include: { items: true },
        });
        await tx.invoiceAuditLog.create({ data: { invoiceId, branchId, userId: req.user?.id, action: "UPDATE_DRAFT", description: `Draft invoice ${existing.invoiceNo} updated` } });
        return updated;
      }

      const paymentSummary = await tx.invoicePayment.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
      });
      const alreadyPaidAmount = toNumber(paymentSummary._sum.amount);
      if (alreadyPaidAmount > amounts.grandTotal) {
        throw new Error("Invoice total cannot be less than already collected payments");
      }
      const dueAmount = amounts.grandTotal - alreadyPaidAmount;
      const status = invoiceStatus(amounts.grandTotal, alreadyPaidAmount, dueDate);

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          customerId,
          invoiceDate,
          dueDate,
          status,
          subtotal: money(amounts.subtotal),
          discountAmount: money(amounts.discountAmount),
          taxAmount: money(amounts.taxAmount),
          deliveryAmount: money(amounts.deliveryAmount),
          grandTotal: money(amounts.grandTotal),
          paidAmount: money(alreadyPaidAmount),
          dueAmount: money(dueAmount),
          notes: body.notes,
          terms: body.terms,
          items: { create: invoiceItems(body) },
        },
        include: { items: true },
      });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId, userId: req.user?.id, action: "UPDATE_FINAL", description: `Final invoice ${existing.invoiceNo} details updated without changing payment history`, data: { alreadyPaidAmount, dueAmount } } });
      return updated;
    });
    res.json({ success: true, message: result.status === "DRAFT" ? "Draft invoice updated successfully" : "Invoice updated successfully. Existing payment history was preserved.", data: result });
  } catch (error) { next(error); }
};
export const finalizeDraftInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const body = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!existing) throw new Error("Invoice not found");
      if (existing.status !== "DRAFT") throw new Error("Only draft invoices can be finalized");
      const branchId = Number(body.branchId);
      const customerId = Number(body.customerId);
      if (existing.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");
      const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;
      const dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (dueDate && dueDate < invoiceDate) throw new Error("Due date cannot be before invoice date");
      await validateCustomer(tx, customerId, branchId);
      const amounts = calculateInvoiceAmounts(body);
      const initialPaidAmount = Number(body.initialPaidAmount || 0);
      if (initialPaidAmount > amounts.grandTotal) throw new Error("Initial payment cannot exceed invoice total");
      if (initialPaidAmount > 0 && !body.paymentAccountId) throw new Error("Payment account is required when an initial payment is received");
      const dueAmount = amounts.grandTotal - initialPaidAmount;
      const status = invoiceStatus(amounts.grandTotal, initialPaidAmount, dueDate);

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          customerId,
          invoiceDate,
          dueDate,
          status,
          subtotal: money(amounts.subtotal),
          discountAmount: money(amounts.discountAmount),
          taxAmount: money(amounts.taxAmount),
          deliveryAmount: money(amounts.deliveryAmount),
          grandTotal: money(amounts.grandTotal),
          paidAmount: money(initialPaidAmount),
          dueAmount: money(dueAmount),
          notes: body.notes,
          terms: body.terms,
          items: { create: invoiceItems(body) },
        },
        include: { items: true },
      });

      await postInitialInvoiceVouchers(tx, {
        invoiceId,
        invoiceNo: existing.invoiceNo,
        branchId,
        customerId,
        invoiceDate,
        paidAmount: initialPaidAmount,
        dueAmount,
        paymentAccountId: body.paymentAccountId ? Number(body.paymentAccountId) : undefined,
        paymentMethod: body.paymentMethod,
        referenceNo: body.referenceNo,
        userId: req.user?.id,
      });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId, userId: req.user?.id, action: "FINALIZE_DRAFT", description: `Draft invoice ${existing.invoiceNo} finalized`, data: { initialPaidAmount, dueAmount } } });
      return updated;
    });
    res.json({ success: true, message: "Draft invoice finalized and vouchers posted successfully", data: result });
  } catch (error) { next(error); }
};

export const collectInvoicePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status === "CANCELLED") throw new Error("Invoice is not available for payment");
      if (invoice.status === "DRAFT") throw new Error("Draft invoice must be finalized before payment collection");
      const amount = Number(req.body.amount);
      const due = toNumber(invoice.dueAmount);
      if (amount > due) throw new Error("Payment cannot exceed the remaining due amount");
      const customer = await tx.particular.findUnique({ where: { id: invoice.customerId } });
      if (!customer) throw new Error("Invoice customer not found");
      const voucher = await createAutomaticVoucher(tx, {
        branchId: invoice.branchId,
        invoiceNo: invoice.invoiceNo,
        type: "RECEIPT",
        date: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        narration: `Invoice ${invoice.invoiceNo} due collection`,
        entries: [{ particularId: Number(req.body.paymentAccountId), type: "Debit", amount }, { particularId: customer.id, type: "Credit", amount }],
      });
      const paidAmount = toNumber(invoice.paidAmount) + amount;
      const dueAmount = toNumber(invoice.grandTotal) - paidAmount;
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: money(paidAmount), dueAmount: money(dueAmount), status: invoiceStatus(toNumber(invoice.grandTotal), paidAmount, invoice.dueDate) } });
      await tx.invoicePayment.create({ data: { invoiceId, paymentAccountId: Number(req.body.paymentAccountId), voucherId: voucher.id, amount: money(amount), paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(), method: req.body.method || "Cash", referenceNo: req.body.referenceNo, note: req.body.note, receivedById: req.user?.id } });
      await tx.invoiceVoucher.create({ data: { invoiceId, voucherId: voucher.id, postingType: "COLLECTION", amount: money(amount) } });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId: invoice.branchId, userId: req.user?.id, action: "COLLECTION", description: `Collected ${amount} for ${invoice.invoiceNo}` } });
      return updated;
    });
    res.json({ success: true, message: "Invoice payment collected successfully", data: result });
  } catch (error) { next(error); }
};
export const updateInvoicePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const paymentId = Number(req.params.paymentId);
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoicePayment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.invoiceId !== invoiceId) throw new Error("Invoice payment not found");

      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status === "CANCELLED") throw new Error("Invoice is not available for payment edit");
      if (invoice.status === "DRAFT") throw new Error("Draft invoice payment cannot be edited");
      if (invoice.branchId !== Number(req.body.branchId)) throw new Error("Invoice does not belong to the selected branch");
      if (invoice.status !== "PARTIALLY_PAID") throw new Error("Only partially paid invoice payments can be edited");

      const newAmount = Number(req.body.amount);
      const otherPayments = await tx.invoicePayment.aggregate({
        where: { invoiceId, id: { not: paymentId } },
        _sum: { amount: true },
      });
      const otherPaidAmount = toNumber(otherPayments._sum.amount);
      if (otherPaidAmount + newAmount > toNumber(invoice.grandTotal)) {
        throw new Error("Payment amount cannot exceed invoice total");
      }

      const customer = await tx.particular.findUnique({ where: { id: invoice.customerId } });
      if (!customer) throw new Error("Invoice customer not found");

      if (payment.voucherId) {
        const oldVoucher = await tx.voucher.findUnique({
          where: { id: payment.voucherId },
          include: { particulars: true },
        });
        if (oldVoucher?.particulars.length) {
          const reverseAmount = oldVoucher.particulars.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) / 2;
          const reverseVoucher = await createAutomaticVoucher(tx, {
            branchId: invoice.branchId,
            invoiceNo: invoice.invoiceNo,
            type: oldVoucher.type === "JOURNAL" ? "JOURNAL" : "PAYMENT",
            date: new Date(),
            narration: `Invoice ${invoice.invoiceNo} payment edit: reverse ${oldVoucher.voucherNo}`,
            entries: oldVoucher.particulars.map((entry) => ({
              particularId: entry.particularId,
              type: entry.type === "Debit" ? "Credit" : "Debit",
              amount: Number(entry.amount),
            })),
          });
          await tx.invoiceVoucher.create({ data: { invoiceId, voucherId: reverseVoucher.id, postingType: "REVERSAL", amount: money(reverseAmount) } });
        }
        await tx.invoiceVoucher.deleteMany({ where: { invoiceId, voucherId: payment.voucherId, postingType: "COLLECTION" } });
      }

      const newVoucher = await createAutomaticVoucher(tx, {
        branchId: invoice.branchId,
        invoiceNo: invoice.invoiceNo,
        type: "RECEIPT",
        date: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        narration: `Invoice ${invoice.invoiceNo} edited payment collection`,
        entries: [{ particularId: Number(req.body.paymentAccountId), type: "Debit", amount: newAmount }, { particularId: customer.id, type: "Credit", amount: newAmount }],
      });

      await tx.invoicePayment.update({
        where: { id: paymentId },
        data: {
          paymentAccountId: Number(req.body.paymentAccountId),
          voucherId: newVoucher.id,
          amount: money(newAmount),
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
          method: req.body.method || payment.method || "Cash",
          referenceNo: req.body.referenceNo,
          note: req.body.note,
        },
      });
      await tx.invoiceVoucher.create({ data: { invoiceId, voucherId: newVoucher.id, postingType: "COLLECTION", amount: money(newAmount) } });

      const paidAmount = otherPaidAmount + newAmount;
      const dueAmount = toNumber(invoice.grandTotal) - paidAmount;
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: money(paidAmount), dueAmount: money(dueAmount), status: invoiceStatus(toNumber(invoice.grandTotal), paidAmount, invoice.dueDate) } });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId: invoice.branchId, userId: req.user?.id, action: "UPDATE_PAYMENT", description: `Updated payment ${paymentId} for ${invoice.invoiceNo}`, data: { oldAmount: toNumber(payment.amount), newAmount } } });
      return updated;
    });
    res.json({ success: true, message: "Invoice payment updated successfully", data: result });
  } catch (error) { next(error); }
};


export const cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "CANCELLED") throw new Error("Invoice is already cancelled");
      const branchId = Number(req.body.branchId);
      if (invoice.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");
      if (invoice.status !== "DRAFT") await reverseActiveInvoicePostings(tx, invoice, "cancel", req.user?.id);
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED", paidAmount: money(0), dueAmount: money(0) } });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId, userId: req.user?.id, action: "CANCEL", description: req.body.reason || `Invoice ${invoice.invoiceNo} cancelled` } });
      return updated;
    });
    res.json({ success: true, message: "Invoice cancelled and accounting entries reversed successfully", data: result });
  } catch (error) { next(error); }
};

export const restoreDraftInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status !== "CANCELLED") throw new Error("Only cancelled invoices can be restored as draft");
      const branchId = Number(req.body.branchId);
      if (invoice.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");

      await tx.invoicePayment.deleteMany({ where: { invoiceId } });
      await tx.invoiceVoucher.deleteMany({ where: { invoiceId } });

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "DRAFT",
          paidAmount: money(0),
          dueAmount: invoice.grandTotal,
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          branchId,
          userId: req.user?.id,
          action: "RESTORE_DRAFT",
          description: req.body.reason || `Cancelled invoice ${invoice.invoiceNo} restored as draft`,
        },
      });

      return updated;
    });
    res.json({ success: true, message: "Invoice restored as draft successfully", data: result });
  } catch (error) { next(error); }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
        throw new Error("Only draft or cancelled invoices can be permanently deleted");
      }
      const branchId = Number(req.body.branchId);
      if (invoice.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");

      await tx.invoicePayment.deleteMany({ where: { invoiceId } });
      await tx.invoiceVoucher.deleteMany({ where: { invoiceId } });
      await tx.invoiceAuditLog.deleteMany({ where: { invoiceId } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoice.delete({ where: { id: invoiceId } });

      return invoice;
    });
    res.json({ success: true, message: "Invoice permanently deleted successfully", data: result });
  } catch (error) { next(error); }
};

export const refundInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status === "CANCELLED") throw new Error("Invoice is not available for refund");
      if (invoice.status === "DRAFT") throw new Error("Draft invoice cannot be refunded");
      const branchId = Number(req.body.branchId);
      if (invoice.branchId !== branchId) throw new Error("Invoice does not belong to the selected branch");
      const amount = Number(req.body.amount);
      const paidAmount = toNumber(invoice.paidAmount);
      if (amount > paidAmount) throw new Error("Refund amount cannot exceed paid amount");
      const paymentAccountId = Number(req.body.paymentAccountId);
      const income = await salesIncomeParticular(tx, branchId);
      const voucher = await createAutomaticVoucher(tx, {
        branchId,
        invoiceNo: invoice.invoiceNo,
        type: "PAYMENT",
        date: req.body.refundDate ? new Date(req.body.refundDate) : new Date(),
        narration: `Invoice ${invoice.invoiceNo} refund`,
        entries: [
          { particularId: income.id, type: "Debit", amount },
          { particularId: paymentAccountId, type: "Credit", amount },
        ],
      });
      const nextPaidAmount = paidAmount - amount;
      const nextDueAmount = toNumber(invoice.grandTotal) - nextPaidAmount;
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: money(nextPaidAmount), dueAmount: money(nextDueAmount), status: invoiceStatus(toNumber(invoice.grandTotal), nextPaidAmount, invoice.dueDate) } });
      await tx.invoicePayment.create({ data: { invoiceId, paymentAccountId, voucherId: voucher.id, amount: money(-amount), paymentDate: req.body.refundDate ? new Date(req.body.refundDate) : new Date(), method: "Refund", note: req.body.note || "Invoice refund", receivedById: req.user?.id } });
      await tx.invoiceVoucher.create({ data: { invoiceId, voucherId: voucher.id, postingType: "REFUND", amount: money(amount) } });
      await tx.invoiceAuditLog.create({ data: { invoiceId, branchId, userId: req.user?.id, action: "REFUND", description: req.body.note || `Refunded ${amount} for ${invoice.invoiceNo}`, data: { amount, paymentAccountId } } });
      return updated;
    });
    res.json({ success: true, message: "Invoice refund posted successfully", data: result });
  } catch (error) { next(error); }
};
export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const size = Math.min(Math.max(Number(req.query.size || 10), 1), 100);
    const branchId = Number(req.query.branchId);
    if (!branchId) throw new Error("branchId is required");
    const where: Prisma.InvoiceWhereInput = { branchId };
    const requestedStatus = String(req.query.status || "");
    if (requestedStatus === "DUE") {
      where.AND = [{ dueAmount: { gt: new Prisma.Decimal(0) } }, { status: { notIn: ["CANCELLED", "DRAFT"] } }];
    } else if (requestedStatus === "PAID") {
      where.AND = [{ paidAmount: { gt: new Prisma.Decimal(0) } }, { status: { notIn: ["CANCELLED", "DRAFT"] } }];
    } else if (requestedStatus === "OVERDUE") {
      where.AND = [
        { dueAmount: { gt: new Prisma.Decimal(0) } },
        { dueDate: { lt: new Date() } },
        { status: { notIn: ["CANCELLED", "DRAFT"] } },
      ];
    } else if (requestedStatus) {
      where.status = requestedStatus as any;
    }
    if (req.query.search) where.OR = [{ invoiceNo: { contains: String(req.query.search) } }];
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ where, include: { items: true, payments: true, vouchers: true }, orderBy: { id: "desc" }, skip: (page - 1) * size, take: size }),
      prisma.invoice.count({ where }),
    ]);
    const customers = await prisma.particular.findMany({
      where: { id: { in: invoices.map((invoice) => invoice.customerId) } },
      select: { id: true, accountType: true, companyName: true },
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const data = invoices.map((invoice) => {
      const customer = customerMap.get(invoice.customerId);
      return {
        ...invoice,
        customerName: customer?.companyName || customer?.accountType || "-",
        itemNames: invoice.items.map((item) => item.name).filter(Boolean).join(", "),
      };
    });
    res.json({ success: true, data, meta: { page, size, total, totalPage: Math.ceil(total / size) } });
  } catch (error) { next(error); }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: Number(req.params.id) }, include: { items: true, payments: true, vouchers: true, auditLogs: { orderBy: { createdAt: "desc" } } } });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const customer = await prisma.particular.findUnique({ where: { id: invoice.customerId } });
    const vouchers = await prisma.voucher.findMany({ where: { id: { in: invoice.vouchers.map((item) => item.voucherId) } } });
    res.json({ success: true, data: { ...invoice, customer, voucherDetails: vouchers } });
  } catch (error) { next(error); }
};

export const getInvoiceSummaryReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = Number(req.query.branchId);
    if (!branchId) throw new Error("branchId is required");

    const fromDate = req.query.fromDate ? new Date(String(req.query.fromDate)) : new Date();
    const toDate = req.query.toDate ? new Date(String(req.query.toDate)) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const status = String(req.query.status || "");
    const where: Prisma.InvoiceWhereInput = {
      branchId,
      invoiceDate: { gte: fromDate, lte: toDate },
      status: { notIn: ["CANCELLED", "DRAFT"] },
    };

    if (status === "DUE") {
      where.AND = [{ dueAmount: { gt: new Prisma.Decimal(0) } }];
    } else if (status === "PAID") {
      where.AND = [{ paidAmount: { gt: new Prisma.Decimal(0) } }];
    } else if (status === "OVERDUE") {
      where.AND = [{ dueAmount: { gt: new Prisma.Decimal(0) } }, { dueDate: { lt: new Date() } }];
    } else if (status === "DRAFT") {
      where.status = "DRAFT";
    } else if (status) {
      where.status = status as any;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { items: true, payments: true, vouchers: true },
      orderBy: { invoiceDate: "desc" },
    });

    const customers = await prisma.particular.findMany({
      where: { id: { in: invoices.map((invoice) => invoice.customerId) } },
      select: { id: true, accountType: true, mobileNumber: true },
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    const rows = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      customerName: customerMap.get(invoice.customerId)?.accountType || "N/A",
      customerMobile: customerMap.get(invoice.customerId)?.mobileNumber || "N/A",
      itemCount: invoice.items.length,
      grandTotal: toNumber(invoice.grandTotal),
      paidAmount: toNumber(invoice.paidAmount),
      refundAmount: invoice.vouchers.filter((voucher) => voucher.postingType === "REFUND").reduce((sum, voucher) => sum + toNumber(voucher.amount), 0),
      dueAmount: toNumber(invoice.dueAmount),
      status: invoice.status,
    }));

    const totals = invoices.reduce(
      (sum, invoice) => ({
        invoiceCount: sum.invoiceCount + 1,
        subtotal: sum.subtotal + toNumber(invoice.subtotal),
        discountAmount: sum.discountAmount + toNumber(invoice.discountAmount),
        taxAmount: sum.taxAmount + toNumber(invoice.taxAmount),
        deliveryAmount: sum.deliveryAmount + toNumber(invoice.deliveryAmount),
        grandTotal: sum.grandTotal + toNumber(invoice.grandTotal),
        paidAmount: sum.paidAmount + toNumber(invoice.paidAmount),
        refundAmount: sum.refundAmount + invoice.vouchers.filter((voucher) => voucher.postingType === "REFUND").reduce((total, voucher) => total + toNumber(voucher.amount), 0),
        dueAmount: sum.dueAmount + toNumber(invoice.dueAmount),
      }),
      { invoiceCount: 0, subtotal: 0, discountAmount: 0, taxAmount: 0, deliveryAmount: 0, grandTotal: 0, paidAmount: 0, refundAmount: 0, dueAmount: 0 },
    );

    const statusSummary = invoices.reduce(
      (sum, invoice) => {
        const dueAmount = toNumber(invoice.dueAmount);
        const paidAmount = toNumber(invoice.paidAmount);
        if (invoice.status === "DRAFT") sum.draft += 1;
        else if (dueAmount <= 0.0001) sum.paid += 1;
        else if (paidAmount > 0) sum.partiallyPaid += 1;
        else sum.due += 1;
        if (invoice.status !== "DRAFT" && dueAmount > 0 && invoice.dueDate && invoice.dueDate < new Date()) sum.overdue += 1;
        return sum;
      },
      { paid: 0, due: 0, partiallyPaid: 0, overdue: 0, draft: 0 },
    );

    res.json({ success: true, data: { rows, totals, statusSummary, query: { branchId, fromDate, toDate, status } } });
  } catch (error) { next(error); }
};


