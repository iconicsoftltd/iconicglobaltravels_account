import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { FaRegEdit, FaTrashAlt } from "react-icons/fa";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FaEye, FaBoxArchive } from "react-icons/fa6";
import { ReusableTable } from "@/components/common/ReusableTable";
import { Link } from "react-router-dom";
import {
  useDeleteVoucherMutation,
  useGetAllVouchersQuery,
  useArchiveVoucherMutation, // নতুন
  useRestoreVoucherMutation, // নতুন
} from "@/components/store/api/voucher/receiptVoucherApi";

import HomeLoader from "@/components/loader/HomeLoader";
import getPermission from "@/utils/helper/getPermission";
import toast from "react-hot-toast";
import { DeleteConfirmModal } from "@/components/common/modals/DeleteConfirmModal";
import ReusableTableHeader from "@/components/common/ReusableTableHeader";
import VoucherDateRangeFilter from "@/components/common/VoucherDateRangeFilter";
import { MdRestore } from "react-icons/md";

interface VoucherRowType {
  id: number;
  invoice: string;
  date: string;
  rawDate: string;
  debit: string;
  credit: string;
  note: string;
}

const JournalVoucherList: React.FC = () => {
  // --- State Management ---
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active"); // নতুন

  const [deleteVoucher, { isLoading: isDeleting }] = useDeleteVoucherMutation();
  const [archiveVoucher] = useArchiveVoucherMutation(); // নতুন
  const [restoreVoucher] = useRestoreVoucherMutation(); // নতুন

  // --- Fetch Data ---
  const { data: voucherData, isLoading: isVoucherLoading } =
    useGetAllVouchersQuery({
      page: rowsPerPage === null ? 1 : page,
      size: rowsPerPage === null ? 99999 : rowsPerPage,
      search: searchTerm,
      fromDate,
      toDate,
      type: "JOURNAL",
      archived: activeTab === "archived", // নতুন
    });

  // --- Transform API data ---
  const dynamicData: VoucherRowType[] = useMemo(() => {
    if (!voucherData?.data) return [];

    return voucherData.data.map((voucher: any) => {
      const totalDebit = voucher.particulars
        .filter((p: any) => p.type === "Debit")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      const totalCredit = voucher.particulars
        .filter((p: any) => p.type === "Credit")
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      return {
        id: voucher.id,
        invoice: voucher.voucherNo,
        date: new Date(voucher.date).toLocaleDateString("en-GB"),
        rawDate: voucher.date,
        debit: totalDebit.toString(),
        credit: totalCredit.toString(),
        note: voucher.narration || "N/A",
      };
    });
  }, [voucherData]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  // --- Filter + Pagination ---
  const filteredData = dynamicData.filter((item) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = item.invoice.toLowerCase().includes(search);
    const itemDate = new Date(item.rawDate);
    itemDate.setHours(0, 0, 0, 0);
    const fromDateValue = fromDate ? new Date(fromDate) : null;
    const toDateValue = toDate ? new Date(toDate) : null;
    fromDateValue?.setHours(0, 0, 0, 0);
    toDateValue?.setHours(23, 59, 59, 999);
    const itemTime = itemDate.getTime();
    const fromTime = fromDateValue?.getTime();
    const toTime = toDateValue?.getTime();
    const matchesFromDate = fromTime === undefined || itemTime >= fromTime;
    const matchesToDate = toTime === undefined || itemTime <= toTime;

    return matchesSearch && matchesFromDate && matchesToDate;
  });

  // Date range is already applied by the paginated API. Keep its total so
  // filtered results can still move to the next page.
  const totalItems = voucherData?.meta?.total ?? filteredData.length;
  const paginatedData = filteredData;

  // --- Selection Logic ---
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData.map((item) => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((item) => item !== id));
    }
  };

  // --- Delete ---
  const handleDeleteClick = (voucher: any) => {
    setVoucherToDelete(voucher);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!voucherToDelete) return;
    try {
      await deleteVoucher(voucherToDelete.id).unwrap();
      toast.success("Voucher deleted successfully");
    } catch (error) {
      toast.error("Failed to delete voucher");
    } finally {
      setIsDeleteDialogOpen(false);
      setVoucherToDelete(null);
    }
  };

  // --- Archive ---
  const handleArchive = async (id: number) => {
    try {
      await archiveVoucher(id).unwrap();
      toast.success("Voucher archived successfully");
    } catch {
      toast.error("Failed to archive voucher");
    }
  };

  // --- Restore ---
  const handleRestore = async (id: number) => {
    try {
      await restoreVoucher(id).unwrap();
      toast.success("Voucher restored successfully");
    } catch {
      toast.error("Failed to restore voucher");
    }
  };

  // Tab change করলে page reset
  const handleTabChange = (tab: "active" | "archived") => {
    setActiveTab(tab);
    setPage(1);
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedRows([]);
  };

  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedRows.includes(item.id));

  const handleRowsPerPageChange = (newRowsPerPage: number | null) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  };

  // --- Table Columns ---
  const columns: ColumnDef<VoucherRowType>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRows.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleSelectOne(row.original.id, checked as boolean)
          }
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "id",
      header: "SL",
      cell: ({ row }) => row.index + 1 + (page - 1) * (rowsPerPage ?? 0),
    },
    { accessorKey: "invoice", header: "Invoice" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "debit", header: "Total Debit" },
    { accessorKey: "credit", header: "Total Credit" },
    { accessorKey: "note", header: "Note" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-3">
          {/* Active tab এ: View, Edit, Archive */}
          {activeTab === "active" && (
            <>
              {getPermission("Voucher", "read") && (
                <Link to={`/view-journal-voucher/${row.original.id}`}>
                  <Button variant="outline" className="bg-gray-100" size="icon">
                    <FaEye />
                  </Button>
                </Link>
              )}
              {getPermission("Voucher", "update") && (
                <Link to={`/edit-journal-voucher/${row.original.id}`}>
                  <Button variant="outline" className="bg-gray-100" size="icon">
                    <FaRegEdit />
                  </Button>
                </Link>
              )}
              {getPermission("Voucher", "archive") && (
                <Button
                  variant="outline"
                  className="bg-amber-50 text-amber-500"
                  size="icon"
                  title="Archive"
                  onClick={() => handleArchive(row.original.id)}
                >
                  <FaBoxArchive />
                </Button>
              )}

               {getPermission("Voucher", "delete") && (
                <Button
                  variant="outline"
                  className="bg-gray-100 text-red-400"
                  size="icon"
                  title="Permanent Delete"
                  onClick={() => handleDeleteClick(row.original)}
                >
                  <FaTrashAlt />
                </Button>
              )}
            </>
          )}

          {/* Archived tab এ: Restore, Permanent Delete */}
          {getPermission("Voucher", "archive") && activeTab === "archived" && (
            <>
              {getPermission("Voucher", "restore") && (
                <Button
                  variant="outline"
                  className="bg-green-50 text-green-600"
                  size="icon"
                  title="Restore"
                  onClick={() => handleRestore(row.original.id)}
                >
                  {/* <FaRegEdit /> */}
                  <MdRestore />
                </Button>
              )}
              {getPermission("Voucher", "delete") && (
                <Button
                  variant="outline"
                  className="bg-gray-100 text-red-400"
                  size="icon"
                  title="Permanent Delete"
                  onClick={() => handleDeleteClick(row.original)}
                >
                  <FaTrashAlt />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  if (isVoucherLoading) return <HomeLoader />;

  return (
    <div className="p-4 min-h-screen space-y-4">
      {/* Header */}
      <ReusableTableHeader
        title="Journal Voucher List"
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchReset={() => setPage(1)}
        hasCreatePermission={getPermission("Voucher", "create")}
        createButtonLabel="Create"
        createButtonIcon={<Plus size={20} />}
        createButtonLink="/create-journal-voucher"
        searchPlaceholder="Search by invoice"
      />

      <VoucherDateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={(value) => {
          setFromDate(value);
          setPage(1);
        }}
        onToDateChange={(value) => {
          setToDate(value);
          setPage(1);
        }}
        onClear={() => {
          setFromDate("");
          setToDate("");
          setPage(1);
        }}
      />

      {/* Tab Buttons — নতুন */}
      <div className="flex gap-0 border-b border-gray-200">
        <button
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "border-b-2 border-secondary text-secondary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => handleTabChange("active")}
        >
          Active
        </button>
        {getPermission("Voucher", "archive") && (
          <button
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "archived"
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("archived")}
          >
            Archived
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page</span>
          <Select
            value={rowsPerPage === null ? "all" : String(rowsPerPage)}
            onValueChange={(val) =>
              handleRowsPerPageChange(val === "all" ? null : Number(val))
            }
          >
            <SelectTrigger className="w-[70px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DeleteConfirmModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        itemName={voucherToDelete?.invoice}
        itemType="JournalVoucher"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      {/* Table */}
      <div className="space-y-4">
        {voucherData?.data?.length > 0 ? (
          <ReusableTable<VoucherRowType>
            columns={columns}
            data={paginatedData}
            currentPage={page}
            itemsPerPage={rowsPerPage ?? totalItems}
            totalItems={totalItems}
            setCurrentPage={setPage}
            columnPriority={{
              actions: 1,
              invoice: 2,
              date: 3,
              debit: 4,
              credit: 5,
              note: 6,
              id: 7,
              select: 8,
            }}
          />
        ) : (
          <div className="text-center mt-10 text-gray-500">
            {activeTab === "archived"
              ? "No archived vouchers found."
              : "No vouchers found."}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalVoucherList;
