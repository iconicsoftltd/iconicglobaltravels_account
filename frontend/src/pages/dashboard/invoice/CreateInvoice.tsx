import CreateParticularButton from "@/components/common/CreateParticularButton";
import {
  useCollectInvoicePaymentMutation,
  useCreateInvoiceMutation,
  useFinalizeDraftInvoiceMutation,
  useGetInvoiceByIdQuery,
  useRefundInvoiceMutation,
  useUpdateDraftInvoiceMutation,
  useUpdateInvoicePaymentMutation,
} from "@/components/store/api/invoice/invoiceApi";
import {
  useGetAllAccountsParticularQuery,
  useGetAllCustomerParticularQuery,
} from "@/components/store/api/particularAccount/particularAccountApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

type Item = {
  name: string;
  quantity: number;
  unitPrice: number;
  description: string;
};

const blankItem = (): Item => ({
  name: "",
  quantity: 1,
  unitPrice: 0,
  description: "",
});
const dateValue = (value: string | Date | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const money = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayInputValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function CreateInvoice() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [updateDraftInvoice, { isLoading: updatingDraft }] =
    useUpdateDraftInvoiceMutation();
  const [finalizeDraftInvoice, { isLoading: finalizingDraft }] =
    useFinalizeDraftInvoiceMutation();
  const [collect, { isLoading: collecting }] =
    useCollectInvoicePaymentMutation();
  const [refundInvoice, { isLoading: refunding }] = useRefundInvoiceMutation();
  const [updatePayment, { isLoading: updatingPayment }] =
    useUpdateInvoicePaymentMutation();
  const { data: draftData, isLoading: draftLoading } = useGetInvoiceByIdQuery(
    id,
    { skip: !isEditMode },
  );
  const [customerId, setCustomerId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState("");
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [refundAccountId, setRefundAccountId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentAccountId, setEditPaymentAccountId] = useState("");
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState(todayInputValue());
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const { data: customerData } = useGetAllCustomerParticularQuery({
    page: 1,
    size: 1000,
    search: "",
  });
  const { data: accountData } = useGetAllAccountsParticularQuery({
    page: 1,
    size: 1000,
    search: "",
  });
  const customers = customerData?.data || [];
  const accounts = accountData?.data || [];
  const draftInvoice = draftData?.data;
  const isDraftInvoice = draftInvoice?.status === "DRAFT";
  const isPaidInvoice = draftInvoice?.status === "PAID";
  const isCancelledInvoice = draftInvoice?.status === "CANCELLED";
  const isFinalInvoice = isEditMode && draftInvoice && !isDraftInvoice;
  const isSaving = creating || updatingDraft || finalizingDraft;
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [items],
  );
  const preservedPaidAmount = isFinalInvoice
    ? Number(draftInvoice?.paidAmount || 0)
    : initialPaidAmount;
  const due = Math.max(total - preservedPaidAmount, 0);
  const isOverPaidAfterEdit = isFinalInvoice && preservedPaidAmount > total;
  const accountMap = useMemo<Map<number, string>>(
    () =>
      new Map(
        accounts.map((account: any) => [
          Number(account.id),
          String(account.accountType || ""),
        ]),
      ),
    [accounts],
  );
  const voucherMap = useMemo<Map<number, any>>(
    () =>
      new Map(
        (draftInvoice?.voucherDetails || []).map((voucher: any) => [
          Number(voucher.id),
          voucher,
        ]),
      ),
    [draftInvoice?.voucherDetails],
  );

  useEffect(() => {
    if (!draftInvoice) return;
    setCustomerId(String(draftInvoice.customerId || ""));
    setInvoiceDate(dateValue(draftInvoice.invoiceDate));
    setDueDate(dateValue(draftInvoice.dueDate));
    setInitialPaidAmount(
      draftInvoice.status === "DRAFT"
        ? 0
        : Number(draftInvoice.paidAmount || 0),
    );
    setPaymentAccountId("");
    setItems(
      draftInvoice.items?.length
        ? draftInvoice.items.map((item: any) => ({
            name: item.name || "",
            quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
            unitPrice: Number(item.unitPrice || 0),
            description: item.description || "",
          }))
        : [blankItem()],
    );
  }, [draftInvoice]);

  const updateItem = (
    index: number,
    field: keyof Item,
    value: string | number,
  ) =>
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextValue =
          field === "quantity"
            ? Math.max(1, Math.floor(Number(value) || 1))
            : value;
        return { ...item, [field]: nextValue };
      }),
    );

  const payload = (isDraft: boolean) => ({
    customerId: Number(customerId),
    invoiceDate,
    dueDate: dueDate || undefined,
    initialPaidAmount: isDraft || isFinalInvoice ? 0 : initialPaidAmount,
    paymentAccountId:
      !isDraft && !isFinalInvoice && paymentAccountId
        ? Number(paymentAccountId)
        : undefined,
    isDraft,
    items: items.map((item) => ({ ...item, itemType: "CUSTOM" })),
  });

  const validateBase = () => {
    if (!customerId) {
      toast.error("Select a customer");
      return false;
    }
    if (!items.every((item) => item.name.trim())) {
      toast.error("Enter item name");
      return false;
    }
    if (isOverPaidAfterEdit) {
      toast.error("Invoice total cannot be less than already paid amount");
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validateBase()) return;
    try {
      const body = payload(true);
      const response = isEditMode
        ? await updateDraftInvoice({ id: Number(id), ...body }).unwrap()
        : await createInvoice(body).unwrap();
      toast.success(
        isEditMode ? "Draft invoice updated" : "Draft invoice saved",
      );
      navigate(`/invoices/${response.data.id}`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not save draft invoice");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isPaidInvoice)
      return toast.error("Fully paid invoices cannot be edited");
    if (!validateBase()) return;
    if (!isFinalInvoice) {
      if (initialPaidAmount > total)
        return toast.error("Initial payment cannot exceed invoice total");
      if (initialPaidAmount > 0 && !paymentAccountId)
        return toast.error("Select the payment account");
    }
    if (!dueDate) {
      toast.error("Due date is required");
      return false;
    }
    if (!dueDate) {
  toast.error("Due date is required");
  return false;
}

    try {
      const body = payload(false);
      const response = isEditMode
        ? isDraftInvoice
          ? await finalizeDraftInvoice({ id: Number(id), ...body }).unwrap()
          : await updateDraftInvoice({ id: Number(id), ...body }).unwrap()
        : await createInvoice(body).unwrap();
      toast.success(
        isEditMode
          ? isDraftInvoice
            ? "Draft finalized and vouchers posted"
            : "Invoice updated. Payment history preserved"
          : "Invoice created and vouchers posted automatically",
      );
      navigate(`/invoices/${response.data.id}`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not create invoice");
    }
  };

  // const collectPayment = async () => {
  //   if (!draftInvoice?.id || !accountId || !Number(amount))
  //     return toast.error("Enter an account and payment amount");
  //   try {
  //     await collect({
  //       id: draftInvoice.id,
  //       paymentAccountId: Number(accountId),
  //       amount: Number(amount),
  //       paymentDate,
  //       note: paymentNote,
  //     }).unwrap();
  //     toast.success("Receipt Voucher created");
  //     setAmount("");
  //     setAccountId("");
  //     setPaymentDate(todayInputValue());
  //     setPaymentNote("");
  //   } catch (error: any) {
  //     toast.error(error?.data?.message || "Could not collect payment");
  //   }
  // };

const collectPayment = async () => {
  if (!draftInvoice?.id || !accountId || !Number(amount)) return toast.error("Enter an account and payment amount");
  try {
    await collect({
      id: draftInvoice.id,
      paymentAccountId: Number(accountId),
      amount: Number(amount),
      paymentDate: todayInputValue(), // always today, never from state
      note: paymentNote,
    }).unwrap();
    toast.success("Receipt Voucher created");
    setAmount("");
    setAccountId("");
    setPaymentNote("");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not collect payment");
  }
};

  const handleRefund = async () => {
    if (!draftInvoice?.id || !refundAccountId || !Number(refundAmount))
      return toast.error("Enter refund account and amount");
    try {
      await refundInvoice({
        id: draftInvoice.id,
        paymentAccountId: Number(refundAccountId),
        amount: Number(refundAmount),
        note: "Invoice refund",
      }).unwrap();
      toast.success("Payment Voucher created for refund");
      setRefundAccountId("");
      setRefundAmount("");
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not refund invoice");
    }
  };

  const startEditPayment = (payment: any) => {
    setEditingPaymentId(Number(payment.id));
    setEditPaymentAccountId(String(payment.paymentAccountId || ""));
    setEditPaymentAmount(String(Number(payment.amount || 0)));
    setEditPaymentDate(
      payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().slice(0, 10)
        : todayInputValue(),
    );
    setEditPaymentNote(payment.note || "");
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setEditPaymentAccountId("");
    setEditPaymentAmount("");
    setEditPaymentDate(todayInputValue());
    setEditPaymentNote("");
  };

  const saveEditedPayment = async () => {
    if (
      !editingPaymentId ||
      !editPaymentAccountId ||
      !Number(editPaymentAmount)
    ) {
      return toast.error("Enter an account and payment amount");
    }
    try {
      await updatePayment({
        id: Number(id),
        paymentId: editingPaymentId,
        paymentAccountId: Number(editPaymentAccountId),
        amount: Number(editPaymentAmount),
        paymentDate: editPaymentDate,
        note: editPaymentNote,
      }).unwrap();
      toast.success("Payment updated and invoice recalculated");
      cancelEditPayment();
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not update payment");
    }
  };

  if (draftLoading) return <div className="p-2">Loading draft invoice...</div>;

  if (isPaidInvoice) {
    return (
      <div className="mx-auto container space-y-4 p-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <div className="rounded-lg border bg-white p-6">
          <h1 className="text-2xl font-semibold">
            Fully paid invoice cannot be edited
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invoice is already fully paid. Payment and invoice history
            should remain locked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto container space-y-5 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditMode
              ? isDraftInvoice
                ? "Edit Draft Invoice"
                : "Edit Invoice"
              : "Create Invoice"}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <section className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">
          Customer
          <div className="flex gap-2">
            <select
              required
              className="h-10 min-w-0 flex-1 rounded-md border px-3 font-normal"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.accountType}
                </option>
              ))}
            </select>
            <CreateParticularButton compact title="Create customer" />
          </div>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Invoice date
          <Input
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Due date
          <Input type="date" value={dueDate} min={invoiceDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Invoice items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((current) => [...current, blankItem()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add item
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-2 md:grid-cols-[1fr_2fr_130px_100px_130px_40px]"
            >
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Item name
                <Input
                  required
                  placeholder="Item name"
                  value={item.name}
                  onChange={(event) =>
                    updateItem(index, "name", event.target.value)
                  }
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Description
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(event) =>
                    updateItem(index, "description", event.target.value)
                  }
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Rate / Price
                <Input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(index, "unitPrice", Number(event.target.value))
                  }
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Quantity
                <Input
                  required
                  min="1"
                  step="1"
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, "quantity", Number(event.target.value))
                  }
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Total
                <div className="flex h-10 items-center justify-end rounded-md border px-3 text-sm font-semibold">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </div>
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-3">
        {!isFinalInvoice ? (
          <>
            <label className="space-y-1 text-sm font-medium">
              Initial paid amount
              <Input
                min="0"
                max={total}
                step="0.01"
                type="number"
                value={initialPaidAmount}
                onChange={(event) =>
                  setInitialPaidAmount(Number(event.target.value))
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Receive in account
              <select
                className="h-10 w-full rounded-md border px-3 font-normal"
                value={paymentAccountId}
                onChange={(event) => setPaymentAccountId(event.target.value)}
                disabled={!initialPaidAmount}
              >
                <option value="">Select cash/bank account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountType}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 md:col-span-2">
            Existing payment history is preserved. After changing item rate or
            quantity, paid, due and status will be recalculated from the saved
            payment records.
          </div>
        )}
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <p>
            Total: <strong>{total.toFixed(2)}</strong>
          </p>
          <p>
            Paid recorded:{" "}
            <strong className="text-emerald-700">
              {preservedPaidAmount.toFixed(2)}
            </strong>
          </p>
          <p>
            Due after update:{" "}
            <strong
              className={
                isOverPaidAfterEdit ? "text-red-600" : "text-amber-700"
              }
            >
              {due.toFixed(2)}
            </strong>
          </p>
          {isOverPaidAfterEdit && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Total cannot be less than already paid amount.
            </p>
          )}
        </div>
      </section>

      {isFinalInvoice &&
        !isCancelledInvoice &&
        Number(draftInvoice.dueAmount) > 0 && (
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 font-semibold">Collect due payment</h2>
            <div className="grid gap-3 md:grid-cols-[1fr_160px_180px_1fr_auto]">
              <label className="space-y-1 text-sm font-medium">
                Receive in account
                <select
                  className="h-10 w-full rounded-md border px-3 font-normal"
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  <option value="">Select cash/bank account</option>
                  {accounts.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.accountType}
                    </option>
                  ))}
                </select>
              </label>
              {/* <label className="space-y-1 text-sm font-medium">
                Payment date
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </label> */}

              <label className="space-y-1 text-sm font-medium">
                Payment date
                <Input
                  type="date"
                  value={todayInputValue()}
                  disabled
                  readOnly
                  title="Only today's date is allowed"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Amount
                <Input
                  type="number"
                  min="0.01"
                  max={Number(draftInvoice.dueAmount)}
                  step="0.01"
                  placeholder="Amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Payment note
                <Input
                  placeholder="Payment note"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                />
              </label>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  disabled={collecting}
                  onClick={collectPayment}
                  type="button"
                >
                  Collect payment
                </Button>
              </div>
            </div>
          </section>
        )}

      {isFinalInvoice &&
        !isCancelledInvoice &&
        Number(draftInvoice.paidAmount) > 0 && (
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 font-semibold">Refund payment</h2>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <select
                className="h-10 rounded-md border px-3"
                value={refundAccountId}
                onChange={(event) => setRefundAccountId(event.target.value)}
              >
                <option value="">Select refund cash/bank account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.accountType}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="0.01"
                max={Number(draftInvoice.paidAmount)}
                step="0.01"
                placeholder="Amount"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
              <Button
                variant="red"
                disabled={refunding}
                onClick={handleRefund}
                type="button"
              >
                Refund
              </Button>
            </div>
          </section>
        )}

      {isFinalInvoice && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Payment history</h2>
          {draftInvoice.payments?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Account</th>
                    <th className="p-2">Method</th>
                    <th className="p-2">Reference</th>
                    <th className="p-2">Voucher</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...draftInvoice.payments]
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.paymentDate).getTime() -
                        new Date(a.paymentDate).getTime(),
                    )
                    .map((payment: any) => {
                      const voucher = voucherMap.get(Number(payment.voucherId));
                      const paymentAmount = Number(payment.amount || 0);
                      const isRefundPayment =
                        paymentAmount < 0 || payment.method === "Refund";
                      return (
                        <tr key={payment.id} className="border-b">
                          <td className="p-2">
                            {editingPaymentId === payment.id ? (
                              <Input
                                type="date"
                                value={editPaymentDate}
                                onChange={(event) =>
                                  setEditPaymentDate(event.target.value)
                                }
                              />
                            ) : (
                              new Date(payment.paymentDate).toLocaleDateString()
                            )}
                          </td>
                          <td className="p-2">
                            {editingPaymentId === payment.id ? (
                              <select
                                className="h-10 w-full rounded-md border px-3"
                                value={editPaymentAccountId}
                                onChange={(event) =>
                                  setEditPaymentAccountId(event.target.value)
                                }
                              >
                                <option value="">Select account</option>
                                {accounts.map((account: any) => (
                                  <option key={account.id} value={account.id}>
                                    {account.accountType}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              accountMap.get(
                                Number(payment.paymentAccountId),
                              ) || `#${payment.paymentAccountId}`
                            )}
                          </td>
                          <td className="p-2">
                            {isRefundPayment
                              ? "Refund"
                              : payment.method || "Cash"}
                          </td>
                          <td className="p-2">{payment.referenceNo || "-"}</td>
                          <td className="p-2">{voucher?.voucherNo || "-"}</td>
                          <td
                            className={`p-2 text-right font-semibold ${isRefundPayment ? "text-red-600" : ""}`}
                          >
                            {editingPaymentId === payment.id ? (
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editPaymentAmount}
                                onChange={(event) =>
                                  setEditPaymentAmount(event.target.value)
                                }
                              />
                            ) : (
                              money(payment.amount)
                            )}
                            {editingPaymentId === payment.id && (
                              <Input
                                className="mt-2"
                                placeholder="Payment note"
                                value={editPaymentNote}
                                onChange={(event) =>
                                  setEditPaymentNote(event.target.value)
                                }
                              />
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {!isRefundPayment &&
                            editingPaymentId === payment.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={updatingPayment}
                                  onClick={saveEditedPayment}
                                  type="button"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={cancelEditPayment}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : !isRefundPayment ? (
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => startEditPayment(payment)}
                              >
                                Edit
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment has been collected yet.
            </p>
          )}
        </section>
      )}

      <div className="flex justify-end gap-3">
        {(!isEditMode || isDraftInvoice) && (
          <Button
            disabled={isSaving}
            type="button"
            variant="outline"
            onClick={saveDraft}
          >
            {isEditMode ? "Update Draft" : "Save Draft"}
          </Button>
        )}
        <Button disabled={isSaving || isOverPaidAfterEdit} type="submit">
          {isEditMode
            ? isDraftInvoice
              ? "Finalize Invoice"
              : "Update Invoice Details"
            : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
