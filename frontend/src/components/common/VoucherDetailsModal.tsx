"use client";

import { useMemo } from "react";

import { useVoucherPrint } from "@/components/common/voucherPrintPdf/VoucherPrint";
import { downloadVoucherPdf } from "@/components/common/voucherPrintPdf/VoucherPdf";
import { useGetVoucherByIdQuery } from "@/components/store/api/voucher/receiptVoucherApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appConfiguration } from "@/utils/constant/appConfiguration";
import { numberToBangladeshiCurrencyWords } from "@/utils/helper/numberToBangladeshiWords";

export type SelectedVoucher = {
  id: number;
  type?: string;
};

type Props = {
  voucher: SelectedVoucher | null;
  onClose: () => void;
};

const voucherTitle = (type?: string) => {
  const titles: Record<string, string> = {
    RECEIPT: "Receipt Voucher",
    PAYMENT: "Payment Voucher",
    CONTRA: "Contra Voucher",
    JOURNAL: "Journal Voucher",
    EXPENSE: "Expense Voucher",
    SALES: "Sales Voucher",
    SERVICE_SALES: "Service Sales Voucher",
    SALES_RETURN: "Sales Return Voucher",
    PURCHASE: "Purchase Voucher",
    PURCHASE_RETURN: "Purchase Return Voucher",
    SALARY: "Salary Voucher",
  };
  return type ? titles[type] || `${type.replace(/_/g, " ")} Voucher` : "Voucher";
};

const money = (value: number) => Number(value || 0).toFixed(2);

export default function VoucherDetailsModal({ voucher, onClose }: Props) {
  const { data, isFetching, isError } = useGetVoucherByIdQuery(voucher?.id ?? "", {
    skip: !voucher?.id,
  });
  const { printVoucher } = useVoucherPrint();
  const details = data?.data;

  const totals = useMemo(() => {
    const particulars = details?.particulars ?? [];
    return particulars.reduce(
      (sum: { debit: number; credit: number }, item: any) => {
        if (item.type === "Debit") sum.debit += Number(item.amount || 0);
        if (item.type === "Credit") sum.credit += Number(item.amount || 0);
        return sum;
      },
      { debit: 0, credit: 0 },
    );
  }, [details?.particulars]);

  const title = voucherTitle(details?.type || voucher?.type);
  const amount = totals.debit || totals.credit;
  const amountInWords = numberToBangladeshiCurrencyWords(amount);

  const getVoucherReportData = () => {
    if (!details) return null;
    return {
      voucherTitle: title,
      config: {
        logo: appConfiguration?.logo,
        address: appConfiguration?.address,
        email: appConfiguration?.email,
        phone: appConfiguration?.phone,
        website: appConfiguration?.website,
      },
      voucherNo: details.voucherNo,
      date: details.date,
      rows: details.particulars.map((item: any) => ({
        type: item.type,
        particulars: item.particular?.accountType || "N/A",
        debit: item.type === "Debit" ? Number(item.amount) : 0,
        credit: item.type === "Credit" ? Number(item.amount) : 0,
      })),
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      amountInWords,
      narration: details.narration,
    };
  };

  const handlePrint = () => {
    const reportData = getVoucherReportData();
    if (reportData) printVoucher(reportData);
  };

  const handlePdf = () => {
    const reportData = getVoucherReportData();
    if (reportData) downloadVoucherPdf(reportData);
  };

  return (
    <Dialog open={Boolean(voucher)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="90vw" className="z-[70] flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="relative z-30 shrink-0 border-b bg-white px-6 py-5">
          <DialogTitle>{title} Details</DialogTitle>
          <DialogDescription>
            {details ? `${details.voucherNo} · ${new Date(details.date).toLocaleDateString()}` : "Loading voucher details"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-white p-6">
          {isFetching ? (
            <div className="py-16 text-center text-zinc-500">Loading voucher details...</div>
          ) : isError || !details ? (
            <div className="py-16 text-center text-red-600">Voucher details could not be loaded.</div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <img src={appConfiguration?.logo} alt="Company logo" className="mx-auto h-16 w-auto object-contain" />
                <div className="mt-2 text-sm text-zinc-600">{appConfiguration?.address}</div>
                <div className="text-xs text-zinc-500">
                  {appConfiguration?.email} · {appConfiguration?.phone} · {appConfiguration?.website}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-sky-600">
                <span>Voucher No: {details.voucherNo}</span>
                <span>Date: {new Date(details.date).toLocaleDateString()}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="px-4 py-3 text-center">S/L</th>
                      <th className="px-4 py-3 text-center">Debit / Credit</th>
                      <th className="px-4 py-3 text-left">Particulars</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {details.particulars.map((item: any, index: number) => (
                      <tr key={item.id ?? index}>
                        <td className="px-4 py-3 text-center">{index + 1}</td>
                        <td className="px-4 py-3 text-center">{item.type}</td>
                        <td className="px-4 py-3">{item.particular?.accountType || "N/A"}</td>
                        <td className="px-4 py-3 text-right">{item.type === "Debit" ? money(item.amount) : "0.00"}</td>
                        <td className="px-4 py-3 text-right">{item.type === "Credit" ? money(item.amount) : "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">Total Amount</td>
                      <td className="px-4 py-3 text-right">{money(totals.debit)}</td>
                      <td className="px-4 py-3 text-right">{money(totals.credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="rounded-md border bg-sky-50 p-3 text-center text-sm font-medium">
                (IN WORD: {amountInWords})
              </div>

              {details.narration && (
                <div>
                  <div className="mb-1 font-semibold text-zinc-700">Notes</div>
                  <div className="rounded-md border bg-zinc-50 p-3">{details.narration}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t bg-white px-6 py-4">
          <Button type="button" onClick={handlePrint} disabled={!details}>Print</Button>
          <Button type="button" variant="destructive" onClick={handlePdf} disabled={!details}>PDF</Button>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
