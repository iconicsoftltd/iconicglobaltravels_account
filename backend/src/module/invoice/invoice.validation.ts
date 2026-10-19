import { z } from "zod";
import { verifyBody } from "../../middleware/validation";

const money = z.coerce.number().finite().min(0);

export const invoiceItemSchema = z.object({
  itemType: z.enum(["PRODUCT", "SERVICE", "CUSTOM"]).default("CUSTOM"),
  productVariationId: z.coerce.number().int().positive().optional(),
  serviceId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unit: z.string().trim().min(1).optional(),
  unitPrice: money,
  discountAmount: money.optional().default(0),
  taxAmount: money.optional().default(0),
});

const invoiceBody = z.object({
  branchId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  initialPaidAmount: money.optional().default(0),
  paymentAccountId: z.coerce.number().int().positive().optional(),
  paymentMethod: z.string().trim().min(1).optional().default("Cash"),
  referenceNo: z.string().trim().optional(),
  subtotal: money.optional(),
  discountAmount: money.optional().default(0),
  taxAmount: money.optional().default(0),
  deliveryAmount: money.optional().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  isDraft: z.coerce.boolean().optional().default(false),
  items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required"),
});

export const verifyCreateInvoice = verifyBody(invoiceBody);
export const verifyUpdateDraftInvoice = verifyBody(invoiceBody);

export const verifyPayment = verifyBody(
  z.object({
    branchId: z.coerce.number().int().positive(),
    paymentAccountId: z.coerce.number().int().positive(),
    amount: money.refine((value) => value > 0, "Payment amount must be greater than 0"),
    paymentDate: z.coerce.date().optional(),
    method: z.string().trim().min(1).optional().default("Cash"),
    referenceNo: z.string().trim().optional(),
    note: z.string().optional(),
  }),
);

export const verifyUpdatePayment = verifyPayment;
export const verifyCancelInvoice = verifyBody(
  z.object({
    branchId: z.coerce.number().int().positive(),
    reason: z.string().trim().optional(),
  }),
);

export const verifyRefundInvoice = verifyBody(
  z.object({
    branchId: z.coerce.number().int().positive(),
    paymentAccountId: z.coerce.number().int().positive(),
    amount: money.refine((value) => value > 0, "Refund amount must be greater than 0"),
    refundDate: z.coerce.date().optional(),
    note: z.string().trim().optional(),
  }),
);

