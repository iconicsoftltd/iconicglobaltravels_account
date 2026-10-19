import InvoiceSummaryReportPrint from "@/components/common/PrintPdf/InvoiceSummaryReportPrint";
import PdfInvoiceSummaryReport from "@/components/common/PrintPdf/PdfInvoiceSummaryReport";
import { useGetInvoiceSummaryReportQuery } from "@/components/store/api/invoice/invoiceApi";
import { selectCurrentCurrency } from "@/components/store/store";
import { Button } from "@/components/ui/button";
import ExcelReportButton from "@/components/common/ExcelReportButton";
import ReportDateSelector from "@/utils/helper/ReportDateSelector";
import dayjs from "dayjs";
import { useState } from "react";
import { FaFilePdf, FaPrint } from "react-icons/fa6";
import { useSelector } from "react-redux";

const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "DUE", label: "Due" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

export default function InvoiceSummaryReport() {
  const today = dayjs().format("YYYY-MM-DD");
  const currentMonth = dayjs().format("MM");
  const currentYear = dayjs().format("YYYY");
  const currentCurrency = useSelector(selectCurrentCurrency);
  const [reportType, setReportType] = useState("daily");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [status, setStatus] = useState("");
  const [queryParams, setQueryParams] = useState({ fromDate: today, toDate: today, status: "" });
  const { data: report, isLoading } = useGetInvoiceSummaryReportQuery(queryParams);
  const data = report?.data;

  const handleSearch = ({ reportType, fromDate, toDate, month, year }: any) => {
    let start = "";
    let end = "";
    if (reportType === "daily") {
      start = dayjs(fromDate).format("YYYY-MM-DD");
      end = dayjs(toDate).format("YYYY-MM-DD");
    } else if (reportType === "monthly") {
      start = dayjs(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD");
      end = dayjs(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD");
    } else {
      start = `${year}-07-01`;
      end = `${Number(year) + 1}-06-30`;
    }
    setQueryParams({ fromDate: start, toDate: end, status });
  };

  const handlePrint = () => {
    if (!data) return;
    InvoiceSummaryReportPrint({ data }, currentCurrency, queryParams);
  };

  const handlePdf = () => {
    if (!data) return;
    PdfInvoiceSummaryReport({ data }, currentCurrency, queryParams);
  };

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Invoice Summary Report</h1>
            <p className="text-sm text-muted-foreground">Summary of invoice totals, paid, refund, due and status-wise invoices.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} disabled={!data || isLoading}><FaPrint />Print</Button>
            <Button className="border-secondary bg-secondary text-white hover:bg-secondary" onClick={handlePdf} disabled={!data || isLoading}><FaFilePdf />PDF</Button>
          <ExcelReportButton filename="invoice-summary-report" sheetName="Report" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReportDateSelector
            reportType={reportType}
            setReportType={setReportType}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            onSearch={handleSearch}
            showParticular={false}
          />
          <select className="h-[42px] rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((option) => <option key={option.value || "ALL"} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Total Invoice</p><strong className="mt-2 block text-xl">{data?.totals?.invoiceCount || 0}</strong></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Grand Total</p><strong className="mt-2 block text-xl">{money(data?.totals?.grandTotal)}</strong></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Paid Total</p><strong className="mt-2 block text-xl text-emerald-700">{money(data?.totals?.paidAmount)}</strong></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Refund Total</p><strong className="mt-2 block text-xl text-red-600">{money(data?.totals?.refundAmount)}</strong></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-muted-foreground">Due Total</p><strong className="mt-2 block text-xl text-amber-700">{money(data?.totals?.dueAmount)}</strong></div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-3 text-sm">Paid invoices: <strong>{data?.statusSummary?.paid || 0}</strong></div>
        <div className="rounded-lg border bg-white p-3 text-sm">Due invoices: <strong>{data?.statusSummary?.due || 0}</strong></div>
        <div className="rounded-lg border bg-white p-3 text-sm">Partial invoices: <strong>{data?.statusSummary?.partiallyPaid || 0}</strong></div>
        <div className="rounded-lg border bg-white p-3 text-sm">Overdue invoices: <strong>{data?.statusSummary?.overdue || 0}</strong></div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="p-3 text-left">Invoice No</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-right">Items</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Refund</th>
              <th className="p-3 text-right">Due</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-8 text-center" colSpan={9}>Loading report...</td></tr>
            ) : data?.rows?.length ? (
              data.rows.map((invoice: any) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3 font-medium">{invoice.invoiceNo}</td>
                  <td className="p-3">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="p-3">{invoice.customerName}</td>
                  <td className="p-3 text-right">{invoice.itemCount}</td>
                  <td className="p-3 text-right">{money(invoice.grandTotal)}</td>
                  <td className="p-3 text-right text-emerald-700">{money(invoice.paidAmount)}</td>
                  <td className="p-3 text-right text-red-600">{money(invoice.refundAmount)}</td>
                  <td className="p-3 text-right text-amber-700">{money(invoice.dueAmount)}</td>
                  <td className="p-3 text-center">{String(invoice.status || "").replace(/_/g, " ")}</td>
                </tr>
              ))
            ) : (
              <tr><td className="p-10 text-center text-muted-foreground" colSpan={9}>Currently no invoice report data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




