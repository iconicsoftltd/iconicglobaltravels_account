interface VoucherDateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClear: () => void;
}

const VoucherDateRangeFilter = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onClear,
}: VoucherDateRangeFilterProps) => {
  const hasDateFilter = Boolean(fromDate || toDate);

  return (
    <div className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
      <span className="text-sm text-gray-700">Date range</span>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        From
        <input
          type="date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-secondary"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        To
        <input
          type="date"
          value={toDate}
          min={fromDate || undefined}
          onChange={(event) => onToDateChange(event.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-secondary"
        />
      </label>
      {hasDateFilter && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-gray-600 hover:text-secondary"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default VoucherDateRangeFilter;
