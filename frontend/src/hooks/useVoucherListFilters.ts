import { useEffect, useState } from "react";

type VoucherListFilters = {
  page: number;
  rowsPerPage: number;
  searchTerm: string;
  fromDate: string;
  toDate: string;
  activeTab: "active" | "archived";
};

const readFilters = (key: string): Partial<VoucherListFilters> => {
  if (typeof window === "undefined") return {};
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

export function useVoucherListFilters(key: string) {
  const saved = readFilters(key);
  const [page, setPage] = useState(saved.page ?? 1);
  const [rowsPerPage, setRowsPerPage] = useState(saved.rowsPerPage ?? 10);
  const [searchTerm, setSearchTerm] = useState(saved.searchTerm ?? "");
  const [fromDate, setFromDate] = useState(saved.fromDate ?? "");
  const [toDate, setToDate] = useState(saved.toDate ?? "");
  const [activeTab, setActiveTab] = useState<"active" | "archived">(
    saved.activeTab ?? "active",
  );

  useEffect(() => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ page, rowsPerPage, searchTerm, fromDate, toDate, activeTab }),
    );
  }, [key, page, rowsPerPage, searchTerm, fromDate, toDate, activeTab]);

  return {
    page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm,
    fromDate, setFromDate, toDate, setToDate, activeTab, setActiveTab,
  };
}

