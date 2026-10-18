import InvoicePrint from "@/components/common/PrintPdf/InvoicePrint";
import PdfInvoice from "@/components/common/PrintPdf/PdfInvoice";
import {
  useCancelInvoiceMutation,
  useGetInvoiceByIdQuery,
} from "@/components/store/api/invoice/invoiceApi";
import { useGetAllAccountsParticularQuery } from "@/components/store/api/particularAccount/particularAccountApi";
import { selectCurrentCurrency } from "@/components/store/store";
import { Button } from "@/components/ui/button";
import ExcelReportButton from "@/components/common/ExcelReportButton";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { FaFilePdf, FaPrint } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

const money = (value: unknown) =>
  Number(value || 0) < 0
    ? `(${Math.abs(Number(value || 0)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })})`
    : Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export default function InvoiceDetails() {
    console.log("🔥 COMPONENT RENDER STARTED"); // <-- এইটা সবচেয়ে আগে
  const { id } = useParams();
  const navigate = useNavigate();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { data, isLoading } = useGetInvoiceByIdQuery(id);
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const { data: accountsData } = useGetAllAccountsParticularQuery({
    page: 1,
    size: 1000,
    search: "",
  });
  const invoice = data?.data;
  console.log("invoice", invoice, data?.data);
  const accounts = accountsData?.data || [];
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
        (invoice?.voucherDetails || []).map((voucher: any) => [
          Number(voucher.id),
          voucher,
        ]),
      ),
    [invoice?.voucherDetails],
  );

  if (isLoading) return <div className="p-6">Loading invoice...</div>;
  if (!invoice) return <div className="p-6">Invoice not found.</div>;

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Cancel this invoice? Accounting entries will be reversed automatically.",
      )
    )
      return;
    try {
      await cancelInvoice({
        id: invoice.id,
        reason: "Invoice cancelled from invoice details",
      }).unwrap();
      toast.success("Invoice cancelled and accounting entries reversed");
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not cancel invoice");
    }
  };

  const handlePrint = () => {
    if (!invoice) return toast.error("No invoice data found to print");
    InvoicePrint(invoice, currentCurrency);
  };

  const handlePdf = () => {
    if (!invoice) return toast.error("No invoice data found to download");
    PdfInvoice(invoice, currentCurrency);
  };

  const isDraft = invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";
  const isPaid = invoice.status === "PAID";

  return (
    <div className="mx-auto container space-y-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.invoiceNo}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(invoice.invoiceDate).toLocaleDateString()} -{" "}
            {String(invoice.status || "").replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCancelled && (
            <Button
              disabled={isPaid}
              title={isPaid ? "Fully paid invoice cannot be edited" : undefined}
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            >
              {isDraft ? "Edit Draft" : "Edit Invoice"}
            </Button>
          )}
          {!isCancelled && (
            <Button
              variant="red_outeline"
              disabled={cancelling}
              onClick={handleCancel}
            >
              Cancel Invoice
            </Button>
          )}
          <Button onClick={handlePrint}>
            <FaPrint />
            Print
          </Button>
          <Button
            className="border-secondary bg-secondary text-white hover:bg-secondary"
            onClick={handlePdf}
          >
            <FaFilePdf />
            PDF
          </Button>
          <ExcelReportButton filename="invoice-details" sheetName="Report" />
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            Back to invoices
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          Total
          <strong className="mt-2 block text-xl">
            {money(invoice.grandTotal)}
          </strong>
        </div>
        <div className="rounded-lg border bg-white p-4">
          Paid
          <strong className="mt-2 block text-xl text-emerald-700">
            {money(invoice.paidAmount)}
          </strong>
        </div>
        <div className="rounded-lg border bg-white p-4">
          Due
          <strong className="mt-2 block text-xl text-amber-700">
            {money(invoice.dueAmount)}
          </strong>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Item</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="p-2">
                  {item.name}
                  <span className="block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </td>
                <td className="p-2 text-right">{money(item.quantity)}</td>
                <td className="p-2 text-right">{money(item.unitPrice)}</td>
                <td className="p-2 text-right">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Payment history</h2>
        {invoice.payments?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Account</th>
                  <th className="p-2">Method</th>
                  <th className="p-2">Reference</th>
                  <th className="p-2">Voucher</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...invoice.payments]
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
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          {accountMap.get(Number(payment.paymentAccountId)) ||
                            `#${payment.paymentAccountId}`}
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
                          {money(payment.amount)}
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

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Related vouchers</h2>
        {invoice.voucherDetails.length ? (
          invoice.voucherDetails.map((voucher: any) => (
            <div
              className="flex justify-between border-b py-2 text-sm"
              key={voucher.id}
            >
              <span>{voucher.voucherNo}</span>
              <span>{voucher.type}</span>
              <span>{voucher.narration}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No related voucher yet.
          </p>
        )}
      </section>
    </div>
  );
}
