import { useCancelInvoiceMutation, useDeleteInvoiceMutation, useGetInvoicesQuery, useRestoreDraftInvoiceMutation } from "@/components/store/api/invoice/invoiceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit } from "react-icons/fa";
import { FaEye, FaPen } from "react-icons/fa6";
import { useNavigate, useSearchParams } from "react-router-dom";

const statusClass: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  DUE: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-secondary/10 text-secondary",
  OVERDUE: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

const amount = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const invoiceItemNames = (invoice: any) =>
  invoice.itemNames ||
  invoice.items?.map((item: any) => item.name).filter(Boolean).join(", ") ||
  "-";

const invoiceCustomerName = (invoice: any) =>
  invoice.customerName || invoice.customer?.companyName || invoice.customer?.accountType || "-";

export default function InvoiceList({ initialStatus = "" }: { initialStatus?: string }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const selectedStatus = initialStatus || status;
  const { data, isLoading } = useGetInvoicesQuery({ page: 1, size: 50, search, status: selectedStatus });
  const [cancelInvoice, { isLoading: cancellingInvoice }] = useCancelInvoiceMutation();
  const [restoreDraftInvoice, { isLoading: restoringInvoice }] = useRestoreDraftInvoiceMutation();
  const [deleteInvoice, { isLoading: deletingInvoice }] = useDeleteInvoiceMutation();
  const invoices = useMemo(() => data?.data || [], [data]);
  const emptyMessage: Record<string, string> = {
    DUE: "Currently no due invoices.",
    PAID: "Currently no paid invoices.",
    OVERDUE: "Currently no overdue invoices.",
    PARTIALLY_PAID: "Currently no partially paid invoices.",
    DRAFT: "Currently no draft invoices.",
  };
  const noInvoiceMessage = emptyMessage[selectedStatus] || "Currently no invoices found.";

  const handleCancel = async (invoice: any) => {
    const confirmed = window.confirm(
      `Cancel invoice ${invoice.invoiceNo}? Accounting entries will be reversed automatically.`,
    );
    if (!confirmed) return;

    try {
      await cancelInvoice({ id: invoice.id, reason: "Invoice cancelled from invoice list" }).unwrap();
      toast.success("Invoice cancelled successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not cancel invoice");
    }
  };

  const handleRestoreDraft = async (invoice: any) => {
    const confirmed = window.confirm(`Restore invoice ${invoice.invoiceNo} as draft?`);
    if (!confirmed) return;

    try {
      await restoreDraftInvoice({ id: invoice.id, reason: "Invoice restored as draft from invoice list" }).unwrap();
      toast.success("Invoice restored as draft");
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not restore invoice as draft");
    }
  };

  const handlePermanentDelete = async (invoice: any) => {
    const confirmed = window.confirm(`Permanently delete invoice ${invoice.invoiceNo}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteInvoice({ id: invoice.id, reason: "Invoice permanently deleted from invoice list" }).unwrap();
      toast.success("Invoice permanently deleted");
    } catch (error: any) {
      toast.error(error?.data?.message || "Could not delete invoice");
    }
  };

  const renderActions = (invoice: any, isMobile = false) => {
    const isCancelled = invoice.status === "CANCELLED";
    const isDraft = invoice.status === "DRAFT";
    const isPaid = invoice.status === "PAID";
    const buttonClass = isMobile ? "h-9 flex-1 px-2" : "";

    return (
      <div className={`flex ${isMobile ? "grid grid-cols-3 gap-2" : "flex-nowrap justify-end gap-1 whitespace-nowrap sm:gap-2"}`}>
        <Button size="sm" className={`border-secondary bg-secondary text-white ${buttonClass}`} variant="outline" onClick={() => navigate(`/invoices/${invoice.id}`)} title="View">
          <FaEye />
        </Button>
        {!isCancelled && (
          <Button size="sm" className={`border-secondary bg-secondary text-white disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`} disabled={isPaid} onClick={() => navigate(`/invoices/${invoice.id}/edit`)} title={isPaid ? "Fully paid invoice cannot be edited" : isDraft ? "Edit Draft" : "Edit"}>
            {isDraft ? <FaPen /> : <FaEdit />}
          </Button>
        )}
        {isCancelled && (
          <Button size="sm" className={`border-amber-500 bg-amber-500 text-white hover:bg-amber-600 ${buttonClass}`} disabled={restoringInvoice} onClick={() => handleRestoreDraft(invoice)} title="Restore Draft">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        {(isDraft || isCancelled) ? (
          <Button size="sm" className={`border-red-600 bg-red-600 text-white hover:bg-red-700 ${buttonClass}`} disabled={deletingInvoice} onClick={() => handlePermanentDelete(invoice)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" className={`border-red-600 bg-red-600 text-white hover:bg-red-700 ${buttonClass}`} disabled={cancellingInvoice} onClick={() => handleCancel(invoice)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 p-2 sm:space-y-5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Invoices</h1>
          <p className="text-sm text-muted-foreground">Create, track and collect customer invoices.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => navigate("/invoices/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 rounded-lg border bg-white p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by invoice number" />
        </div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={selectedStatus}
          disabled={Boolean(initialStatus)}
          onChange={(event) => {
            const value = event.target.value;
            setStatus(value);
            setSearchParams(value ? { status: value } : {});
          }}
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="DUE">Due</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm">Loading invoices...</div>
      ) : invoices.length ? (
        <div className="space-y-3 md:hidden">
          {invoices.map((invoice: any) => (
            <div key={invoice.id} className="min-w-0 rounded-lg border bg-white p-3 shadow-sm">
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{invoice.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                  <p className="truncate text-xs text-muted-foreground">Customer: {invoiceCustomerName(invoice)}</p>
                  <p className="truncate text-xs text-muted-foreground">Item: {invoiceItemNames(invoice)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[invoice.status] || "bg-slate-100"}`}>
                  {String(invoice.status || "").replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{amount(invoice.grandTotal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-semibold text-emerald-700">{amount(invoice.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due</p>
                  <p className="font-semibold text-amber-700">{amount(invoice.dueAmount)}</p>
                </div>
              </div>

              <div className="mt-3">{renderActions(invoice, true)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground md:hidden">
          <FileText className="mx-auto mb-2 h-8 w-8" />
          {noInvoiceMessage}
        </div>
      )}

      <div className="hidden max-w-full overflow-x-auto overscroll-x-contain rounded-lg border bg-white md:block">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="p-3 text-left">Invoice No</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Item Name</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Due</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-8 text-center" colSpan={9}>Loading invoices...</td>
              </tr>
            ) : invoices.length ? (
              invoices.map((invoice: any) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3 font-medium">{invoice.invoiceNo}</td>
                  <td className="p-3">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="p-3">{invoiceCustomerName(invoice)}</td>
                  <td className="max-w-[240px] truncate p-3" title={invoiceItemNames(invoice)}>{invoiceItemNames(invoice)}</td>
                  <td className="p-3 text-right">{amount(invoice.grandTotal)}</td>
                  <td className="p-3 text-right text-emerald-700">{amount(invoice.paidAmount)}</td>
                  <td className="p-3 text-right text-amber-700">{amount(invoice.dueAmount)}</td>
                  <td className="p-3 text-center">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[invoice.status] || "bg-slate-100"}`}>
                      {String(invoice.status || "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3">{renderActions(invoice)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-10 text-center text-muted-foreground" colSpan={9}>
                  <FileText className="mx-auto mb-2 h-8 w-8" />
                  {noInvoiceMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




