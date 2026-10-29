"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { FaFilePdf, FaInbox, FaPrint } from "react-icons/fa6";
import { useSelector } from "react-redux";

import PdfProfitLossReport from "@/components/common/PrintPdf/PdfProfitLossReport";
import ProfitLossReportPrint from "@/components/common/PrintPdf/ProfitLossReportPrint";
import { useGetProfitAndLossQuery } from "@/components/store/api/report/accountingReportApi";
import { selectCurrentCurrency } from "@/components/store/store";
import Heading from "@/components/typography/Heading";
import { Button } from "@/components/ui/button";
import ExcelReportButton from "@/components/common/ExcelReportButton";
import GeneralLedgerModal, { SelectedLedger } from "@/components/common/GeneralLedgerModal";
import ReportDateSelector from "@/utils/helper/ReportDateSelector";
// Import your common helper
import { formatWithDrCr } from "@/utils/helper/accountingFormat";

interface ProfitLossData {
  totalSales: number;
  purchaseAmount: number;
  revenueAfterCOGS: number;
  adminExpenses: number;
  sellingExpenses: number;
  grossProfit: number;
  nonOperatingIncome: number;
  earningBeforeTax: number;
  taxAmount: number;
  earningAfterTax: number;
  drilldownIds: {
    totalSales: number[];
    purchaseAmount: number[];
    adminExpenses: number[];
    sellingExpenses: number[];
    nonOperatingIncome: number[];
  };
}

const ProfitLossReport = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const currentMonth = dayjs().format("MM");
  const currentYear = dayjs().format("YYYY");

  const [reportType, setReportType] = useState("daily");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [queryParams, setQueryParams] = useState({ fromDate, toDate });
  const [selectedLedger, setSelectedLedger] = useState<SelectedLedger | null>(null);

  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyLabel = currentCurrency?.name?.toUpperCase() === "BDT" ? "৳" : currentCurrency?.name || "৳";

  const handleSearch = ({ reportType, fromDate, toDate, month, year }: any) => {
    let _fromDate = "";
    let _toDate = "";

    if (reportType === "daily") {
      if (!fromDate || !toDate) return;
      _fromDate = dayjs(fromDate).format("YYYY-MM-DD");
      _toDate = dayjs(toDate).format("YYYY-MM-DD");
    } else if (reportType === "monthly") {
      if (!month || !year) return;
      _fromDate = dayjs(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD");
      _toDate = dayjs(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD");
    } else if (reportType === "yearly") {
      if (!year) return;
      _fromDate = `${year}-07-01`;
      _toDate = `${Number(year) + 1}-06-30`;
    }

    setQueryParams({ fromDate: _fromDate, toDate: _toDate });
    setShouldFetch(true);
  };

  const { data, isLoading } = useGetProfitAndLossQuery(
    { ...queryParams },
    { skip: !shouldFetch || !queryParams.fromDate || !queryParams.toDate }
  );

  const report: ProfitLossData | undefined = data?.data;
  const drilldownIds = report?.drilldownIds ?? {
    totalSales: [],
    purchaseAmount: [],
    adminExpenses: [],
    sellingExpenses: [],
    nonOperatingIncome: [],
  };

  const handlePrint = () => {
    if (!report) return;
    ProfitLossReportPrint({ data: report }, currentCurrency, queryParams, reportType);
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    PdfProfitLossReport({ data: report }, currentCurrency, queryParams, reportType);
  };

  return (
    <div className="p-6 space-y-6 bg-zinc-50/50 min-h-screen">
      {/* ===================== Header & Filters ===================== */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Heading className="text-xl font-bold text-zinc-800">Profit & Loss Statement</Heading>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              disabled={!report}
              variant="outline"
              className="bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 transition-all shadow-none"
            >
              <FaPrint className="mr-2 text-secondary" /> Print
            </Button>
            <Button
              variant="destructive"
              onClick={handleDownloadPdf}
              disabled={!report}
              className="bg-red-600 hover:bg-red-700 transition-all shadow-none"
            >
              <FaFilePdf className="mr-2" /> PDF
            </Button>
          <ExcelReportButton filename="profit-loss-report" sheetName="Report" />
          </div>
        </div>

        <div className="p-5 bg-zinc-50/30">
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
          />
        </div>
      </div>

      {/* ===================== Styled Report Table ===================== */}
      {!isLoading && report && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-visible max-w-4xl mx-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-primary">
              <tr className="bg-primary text-white">
                <th className="sticky top-0 z-40 bg-primary px-6 py-4 text-left font-semibold uppercase tracking-wider text-[11px]">Description</th>
                <th className="sticky top-0 z-40 bg-primary px-6 py-4 text-right font-semibold uppercase tracking-wider text-[11px]">Amount ({currencyLabel})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* --- Trading Account Section --- */}
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium"><button type="button" onClick={() => setSelectedLedger({ particularId: drilldownIds.totalSales, accountName: "Total Sales Revenue" })} disabled={!drilldownIds.totalSales.length} className="text-left text-sky-700 underline-offset-4 enabled:hover:underline disabled:text-zinc-700">Total Sales Revenue</button></td>
                {/* <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatWithDrCr(report.totalSales, "Cr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right font-bold ">{formatWithDrCr(report.totalSales, "Cr", currencyLabel)}</td>
              </tr>
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium"><button type="button" onClick={() => setSelectedLedger({ particularId: drilldownIds.purchaseAmount, accountName: "Cost of Goods Sold (COGS)" })} disabled={!drilldownIds.purchaseAmount.length} className="text-left text-sky-700 underline-offset-4 enabled:hover:underline disabled:text-zinc-700">Cost of Goods Sold (COGS)</button></td>
                {/* <td className="px-6 py-4 text-right font-bold text-rose-600">{formatWithDrCr(report.purchaseAmount, "Dr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right font-bold ">{formatWithDrCr(report.purchaseAmount, "Dr", currencyLabel)}</td>
              </tr>
              <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                <td className="px-6 py-4 text-zinc-900 italic">Gross Profit</td>
                <td className="px-6 py-4 text-right text-zinc-900 border-b-2 border-double border-zinc-300">
                  {formatWithDrCr(report.grossProfit, undefined, currencyLabel)}
                </td>
              </tr>

              {/* --- Operating Expenses Section --- */}
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium pl-10"><button type="button" onClick={() => setSelectedLedger({ particularId: drilldownIds.adminExpenses, accountName: "Administrative Expenses" })} disabled={!drilldownIds.adminExpenses.length} className="text-left text-sky-700 underline-offset-4 enabled:hover:underline disabled:text-zinc-700">Administrative Expenses</button></td>
                {/* <td className="px-6 py-4 text-right text-rose-600 font-semibold">{formatWithDrCr(report.adminExpenses, "Dr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right  font-semibold">{formatWithDrCr(report.adminExpenses, "Dr", currencyLabel)}</td>
              </tr>
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium pl-10"><button type="button" onClick={() => setSelectedLedger({ particularId: drilldownIds.sellingExpenses, accountName: "Selling & Distribution Expenses" })} disabled={!drilldownIds.sellingExpenses.length} className="text-left text-sky-700 underline-offset-4 enabled:hover:underline disabled:text-zinc-700">Selling & Distribution Expenses</button></td>
                {/* <td className="px-6 py-4 text-right text-rose-600 font-semibold">{formatWithDrCr(report.sellingExpenses, "Dr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right  font-semibold">{formatWithDrCr(report.sellingExpenses, "Dr", currencyLabel)}</td>
              </tr>
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium pl-10"><button type="button" onClick={() => setSelectedLedger({ particularId: drilldownIds.nonOperatingIncome, accountName: "Other Non-Operating Income" })} disabled={!drilldownIds.nonOperatingIncome.length} className="text-left text-sky-700 underline-offset-4 enabled:hover:underline disabled:text-zinc-700">Other Non-Operating Income</button></td>
                {/* <td className="px-6 py-4 text-right text-emerald-600 font-semibold">{formatWithDrCr(report.nonOperatingIncome, "Cr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right  font-semibold">{formatWithDrCr(report.nonOperatingIncome, "Cr", currencyLabel)}</td>
              </tr>

              {/* --- EBT Section --- */}
              <tr className="bg-zinc-50 font-bold">
                <td className="px-6 py-4 text-zinc-900 italic">Earnings Before Tax (EBT)</td>
                <td className="px-6 py-4 text-right text-zinc-900 border-b-2 border-double border-zinc-300" >
                  {formatWithDrCr(report.earningBeforeTax, undefined, currencyLabel)}
                </td>
              </tr>
              <tr className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 text-zinc-700 font-medium">Income Tax Expense</td>
                {/* <td className="px-6 py-4 text-right text-rose-600 font-semibold">{formatWithDrCr(report.taxAmount, "Dr", currencyLabel)}</td> */}
                <td className="px-6 py-4 text-right font-semibold">{formatWithDrCr(report.taxAmount, "Dr", currencyLabel)}</td>
              </tr>

              {/* --- Final Result --- */}
              <tr className="bg-zinc-100 ">
                <td className="px-4 py-4 font-bold uppercase tracking-tight">Net Earnings After Tax</td>
                <td className={`px-4 py-4 text-right font-black  ${report.earningAfterTax < 0 ? "text-red-400" : "text-secondary"}`}>
                  {formatWithDrCr(report.earningAfterTax, undefined, currencyLabel)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Loading & Empty States. */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
          <div className="w-10 h-10 border-4 border-secondary/200 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Calculating Profit & Loss...</p>
        </div>
      )}

      {!isLoading && !report && shouldFetch && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-zinc-300">
          <FaInbox className="text-zinc-300 text-5xl mb-4" />
          <p className="text-zinc-500 font-medium text-lg">No data for the selected timeframe.</p>
        </div>
      )}
      <GeneralLedgerModal ledger={selectedLedger} fromDate={queryParams.fromDate} toDate={queryParams.toDate} onClose={() => setSelectedLedger(null)} />
    </div>
  );
};

export default ProfitLossReport;
