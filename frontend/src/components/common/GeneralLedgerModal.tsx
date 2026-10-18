"use client";

import { useMemo, useState } from "react";

import VoucherDetailsModal, { SelectedVoucher } from "@/components/common/VoucherDetailsModal";
import { useGetGeneralLedgerQuery } from "@/components/store/api/report/accountingReportApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SelectedLedger = {
  particularId: number | number[];
  accountName: string;
};

type Props = {
  ledger: SelectedLedger | null;
  fromDate: string;
  toDate: string;
  onClose: () => void;
};

type LedgerRow = {
  date: string;
  invoice?: string;
  voucherId?: number;
  voucherType?: string;
  details?: string;
  narration?: string | null;
  debit: number;
  credit: number;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function GeneralLedgerModal({ ledger, fromDate, toDate, onClose }: Props) {
  const [selectedVoucher, setSelectedVoucher] = useState<SelectedVoucher | null>(null);
  const { data, isFetching, isError } = useGetGeneralLedgerQuery(
    {
      fromDate,
      toDate,
      particularId: ledger?.particularId ?? "",
    },
    { skip: !ledger || !fromDate || !toDate },
  );

  const report = data?.data;
  const rows = useMemo(() => {
    let balance = 0;
    return ((report?.rows ?? []) as LedgerRow[]).map((row) => {
      balance += Number(row.debit || 0) - Number(row.credit || 0);
      return { ...row, runningBalance: balance };
    });
  }, [report?.rows]);

  return (
    <Dialog open={Boolean(ledger)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="90vw" className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="relative z-30 shrink-0 border-b bg-white px-6 py-5">
          <DialogTitle>General Ledger — {ledger?.accountName}</DialogTitle>
          <DialogDescription>
            {fromDate} to {toDate}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-white px-6 pb-6">
          {isFetching ? (
            <div className="py-16 text-center text-zinc-500">Loading general ledger...</div>
          ) : isError ? (
            <div className="py-16 text-center text-red-600">General ledger could not be loaded.</div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-primary text-white shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Voucher / Invoice</th>
                  <th className="px-4 py-3 text-left">Details / Narration</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row, index) => (
                  <tr key={`${row.date}-${row.invoice}-${index}`} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-3">{row.date}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.voucherId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher({ id: row.voucherId!, type: row.voucherType })}
                          className="font-medium text-sky-700 underline-offset-4 hover:underline focus:underline"
                          title="View and print voucher"
                        >
                          {row.invoice || "-"}
                        </button>
                      ) : (
                        row.invoice || "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.details || row.narration || "-"}</div>
                      {row.details && row.narration && (
                        <div className="mt-1 text-xs text-zinc-500">{row.narration}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{money(row.debit)}</td>
                    <td className="px-4 py-3 text-right">{money(row.credit)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {money(Math.abs(row.runningBalance))} {row.runningBalance >= 0 ? "Dr" : "Cr"}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No ledger entries found.</td>
                  </tr>
                )}
              </tbody>
              {report && (
                <tfoot className="bg-zinc-100 font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right">{money(report.totals?.totalDebit)}</td>
                    <td className="px-4 py-3 text-right">{money(report.totals?.totalCredit)}</td>
                    <td className="px-4 py-3 text-right">
                      {money(Math.abs(report.balance))} {report.balance >= 0 ? "Dr" : "Cr"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </DialogContent>
      <VoucherDetailsModal voucher={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
    </Dialog>
  );
}

export type { SelectedLedger };
