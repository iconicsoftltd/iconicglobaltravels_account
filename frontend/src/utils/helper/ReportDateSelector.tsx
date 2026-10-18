import dayjs from "dayjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ParticularAccountType } from "@/pages/dashboard/accounting/PerticularAccountList";
import { useGetAllParticularQuery } from "@/components/store/api/particularAccount/particularAccountApi";
import ReusableDatePicker from "@/components/common/ReusableDatePicker";

interface ReportDateSelectorProps {
  reportType: string;
  setReportType: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  particular?: ParticularAccountType; // NEW
  setParticular?: (value: ParticularAccountType | undefined) => void; // NEW
  showParticular?: boolean; // NEW (optional)
  onSearch?: (payload: {
    reportType: string;
    fromDate: string;
    toDate: string;
    month: string;
    year: string;
    particular?: ParticularAccountType; // NEW
  }) => void;
}

export default function ReportDateSelector({
  reportType,
  setReportType,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  particular, // NEW
  setParticular, // NEW
  showParticular = false, // NEW (optional)
  onSearch,
}: ReportDateSelectorProps) {
  const [particularSearch, setParticularSearch] = useState("");
  // 🔥 handle search click
  const handleSearch = () => {
    const payload = {
      reportType,
      fromDate,
      toDate,
      month: selectedMonth,
      year: selectedYear,
      ...(showParticular && { particular }), // ADD ONLY IF enabled
    };

    if (onSearch) onSearch(payload);
  };

  const { data: particularData } = useGetAllParticularQuery({
    size: 3000,
  });
  const fiscalYearLabel = (year: number) => `FY ${year}-${year + 1} (Jul-Jun)`;
  const filteredParticulars = (particularData?.data ?? []).filter((item) => {
    const query = particularSearch.trim().toLowerCase();
    if (!query) return true;

    return [
      item.accountType,
      item?.ledger?.ledgerType,
      item?.ledger?.group?.account,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <>
    <div className="flex flex-wrap items-center gap-3">
      {/* Report Type Dropdown */}
      <Select value={reportType} onValueChange={setReportType}>
        <SelectTrigger className="w-[220px] h-[42px]">
          <SelectValue placeholder="Report Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Fiscal Year (Jul-Jun)</SelectItem>
        </SelectContent>
      </Select>

      {/* ===== Daily Range ===== */}
      {reportType === "daily" && (
        <div className="flex items-center gap-2">
          <ReusableDatePicker showLabel={false} date={fromDate} setDate={setFromDate} />
          <ReusableDatePicker showLabel={false} date={toDate} setDate={setToDate} />
        </div>
      )}

      {/* ===== Monthly Picker ===== */}
      {reportType === "monthly" && (
        <>
          {/* Month Select */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] h-[42px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const m = (i + 1).toString().padStart(2, "0");
                const monthName = dayjs(`${m}`, "MM").format("MMMM");
                return (
                  <SelectItem key={m} value={m}>
                    {monthName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Year Select */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[150px] h-[42px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => {
                const y = 2022 + i;
                return (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </>
      )}

      {/* ===== Yearly Picker ===== */}
      {reportType === "yearly" && (
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[220px] h-[42px]">
            <SelectValue placeholder="Select Fiscal Year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 8 }, (_, i) => {
              const y = 2022 + i;
              return (
                <SelectItem key={y} value={y.toString()}>
                  {fiscalYearLabel(y)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* ===== Particular Picker (Optional) ===== */}
      {showParticular && (
        <Select
          value={particular?.id ? String(particular.id) : "all"}
          onOpenChange={(open) => !open && setParticularSearch("")}
          onValueChange={(value) => {
            if (!setParticular) return;
            if (value === "all") {
              setParticular(undefined);
              return;
            }
            const found = particularData?.data?.find(
              (item) => String(item.id) === value,
            );
            if (found) setParticular(found);
          }}
        >
          <SelectTrigger className="w-[180px] h-[42px]">
            <SelectValue placeholder="Select Particular" />
          </SelectTrigger>
          <SelectContent>
            <div className="sticky top-0 z-10 bg-white p-2">
              <Input
                autoFocus
                placeholder="Search account..."
                value={particularSearch}
                onChange={(event) => setParticularSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
            <SelectItem value="all">All</SelectItem>
            {filteredParticulars.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.accountType} ({item?.ledger?.ledgerType})
              </SelectItem>
            ))}
            {!filteredParticulars.length && (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">
                No account found
              </div>
            )}
          </SelectContent>
        </Select>
      )}

      {/* ===== Search Button ===== */}
      <Button onClick={handleSearch}>Search</Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-600">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        Positive / Income / Profit
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
        Negative / Expense / Loss / Withdrawal
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
        Ending / Summary Balance
      </span>
    </div>
    </>
  );
}
