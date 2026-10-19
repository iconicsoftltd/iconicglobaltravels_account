import { useGetArchivedIncomeStatementQuery } from "@/components/store/api/report/accountingReportApi";
import { selectCurrentCurrency } from "@/components/store/store";
import Heading from "@/components/typography/Heading";
import { Button } from "@/components/ui/button";
import ReportDateSelector from "@/utils/helper/ReportDateSelector";
import dayjs from "dayjs";
import { useState } from "react";
import { FaPrint } from "react-icons/fa6";
import { useSelector } from "react-redux";

const ArchivedIncomeStatementReport = () => {
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

  const { data, isLoading } = useGetArchivedIncomeStatementQuery(
    { ...queryParams },
    {
      skip: !shouldFetch || !queryParams.fromDate || !queryParams.toDate,
    }
  );

  const report = data?.data;

  return (
    <div className="p-6 space-y-6">
      <div className="border p-4 rounded-md bg-white">
        <Heading className="mb-4">Archived Income Statement Report</Heading>

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

        <div className="flex justify-end mt-2 gap-4">
          <Button disabled={!report}>
            <FaPrint /> Print
          </Button>
        </div>
      </div>

      {!isLoading && report && (
        <div className="border rounded-md p-4 bg-white space-y-4">
          {/* Revenue Section */}
          <div>
            <h3 className="font-semibold text-lg border-b pb-2 mb-2">Revenue</h3>
            {report.revenue?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between py-1 text-sm">
                <span>{item.account}</span>
                <span>{item.amount?.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Revenue</span>
              <span>{report.totalRevenue?.toFixed(2)}</span>
            </div>
          </div>

          {/* Expense Section */}
          <div>
            <h3 className="font-semibold text-lg border-b pb-2 mb-2">Expense</h3>
            {report.expense?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between py-1 text-sm">
                <span>{item.account}</span>
                <span>{item.amount?.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Expense</span>
              <span>{report.totalExpense?.toFixed(2)}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className="flex justify-between font-bold text-lg border-t-2 border-zinc-900 pt-3">
            <span>Net Income</span>
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-500 text-sm">{currentCurrency?.name}</span>
              <span className={report.netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(report.netIncome)?.toFixed(2)}
              </span>
              <span className="text-zinc-500 text-xs">
                {report.netIncome >= 0 ? "(Profit)" : "(Loss)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !report && shouldFetch && (
        <div className="text-center text-gray-500 mt-10">
          No archived income statement data found.
        </div>
      )}
    </div>
  );
};

export default ArchivedIncomeStatementReport;