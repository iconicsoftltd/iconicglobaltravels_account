import GeneralLedgerReportPrint from "@/components/common/PrintPdf/GeneralLedgerReportPrint";
import PdfGeneralLedgerReport from "@/components/common/PrintPdf/PdfGeneralLedgerReport";
import { ReusableTable } from "@/components/common/ReusableTable";
import { useGetArchivedVoucherLedgerQuery } from "@/components/store/api/report/accountingReportApi";
import { selectCurrentCurrency } from "@/components/store/store";
import Heading from "@/components/typography/Heading";
import { Button } from "@/components/ui/button";
import ExcelReportButton from "@/components/common/ExcelReportButton";
import ReportDateSelector from "@/utils/helper/ReportDateSelector";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useState } from "react";
import { FaFilePdf, FaPrint } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { ParticularAccountType } from "../accounting/PerticularAccountList";

interface VoucherRow {
  date: string;
  invoice: string;
  details: string;
  debit: number;
  credit: number;
}

const ArchivedVoucherLedgerReport = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const currentMonth = dayjs().format("MM");
  const currentYear = dayjs().format("YYYY");

  const [reportType, setReportType] = useState("daily");
  const [particular, setParticular] = useState<ParticularAccountType | undefined>(undefined);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [queryParams, setQueryParams] = useState({ fromDate, toDate });

  const currentCurrency = useSelector(selectCurrentCurrency);

  const handleSearch = ({ reportType, fromDate, toDate, month, year }) => {
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

  const { data, isLoading } = useGetArchivedVoucherLedgerQuery(
    { ...queryParams, particularId: particular?.id || "" },
    {
      skip:
        !shouldFetch ||
        !queryParams.fromDate ||
        !queryParams.toDate ||
        !particular?.id,
    }
  );

  const report = data?.data;

  const handlePrint = () => {
    if (!report) return;
    GeneralLedgerReportPrint({ data: report }, currentCurrency, queryParams, reportType);
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    PdfGeneralLedgerReport({ data: report }, currentCurrency, queryParams, reportType);
  };

  const columns: ColumnDef<VoucherRow>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => dayjs(row.original.date).format("DD-MM-YYYY"),
      footer: () => "",
    },
    {
      accessorKey: "invoice",
      header: "Invoice",
      footer: () => "",
    },
    {
      accessorKey: "details",
      header: "Details",
      footer: () => (
        <span className="font-semibold text-right w-full block">
          Total Amount
        </span>
      ),
    },
    {
      accessorKey: "debit",
      header: "Debit",
      cell: ({ row }) => row.original.debit?.toFixed(2),
      footer: () => (
        <span className="font-semibold">
          {currentCurrency?.name} {report?.totals?.totalDebit?.toFixed(2) ?? "0.00"}
        </span>
      ),
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: ({ row }) => row.original.credit?.toFixed(2),
      footer: () => (
        <span className="font-semibold">
          {currentCurrency?.name} {report?.totals?.totalCredit?.toFixed(2) ?? "0.00"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="border p-4 rounded-md bg-white">
        <Heading className="mb-4">Archived Voucher Ledger Report</Heading>

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
          particular={particular}
          setParticular={setParticular}
          showParticular={true}
        />

        <div className="flex justify-end mt-2 gap-4">
          <Button onClick={handlePrint} disabled={!report}>
            <FaPrint /> Print
          </Button>
          <Button variant={"red"} onClick={handleDownloadPdf} disabled={!report}>
            <FaFilePdf /> PDF
          </Button>
          <ExcelReportButton filename="archived-voucher-ledger-report" sheetName="Report" />
        </div>
      </div>

      {!isLoading && report && (
        <div>
          <ReusableTable<VoucherRow>
            columns={columns}
            data={report.rows}
            columnPriority={{
              date: 1,
              invoice: 2,
              details: 3,
              debit: 4,
              credit: 5,
            }}
          />

          <div className="w-full mt-4 px-6 py-4 flex justify-end">
            <div className="flex flex-col items-end border-t-2 border-zinc-900 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Final Account Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-600 font-medium text-xs">
                  {currentCurrency?.name}
                </span>
                <span className="text-xl font-black text-zinc-900">
                  {Math.abs(report.balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="text-zinc-600 font-bold text-[10px] ml-1">
                  {report.balance >= 0 ? "DR" : "CR"}
                </span>
              </div>
              <div className="w-full h-[3px] border-b border-t border-zinc-900 mt-1" />
            </div>
          </div>
        </div>
      )}

      {!isLoading && !report && shouldFetch && (
        <div className="text-center text-gray-500 mt-10">
          No archived voucher ledger data found.
        </div>
      )}
    </div>
  );
};

export default ArchivedVoucherLedgerReport;