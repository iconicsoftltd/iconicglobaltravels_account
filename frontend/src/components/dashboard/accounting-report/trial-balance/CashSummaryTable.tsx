import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LedgerItem = {
  particularId?: number;
  accountDescription: string;
  ledgerNo: string;
  group?: string;
  debit: number;
  credit: number;
};

export type CashFlowData = {
  openingBalance?: number;
  inflows: LedgerItem[];
  outflows: LedgerItem[];
  closingBalance?: number;
  totals: {
    debit: number;
    credit: number;
  };
};

type Props = {
  data: CashFlowData;
  onAccountClick?: (item: LedgerItem) => void;
};

const format = (num: number) =>
  num === 0
    ? "-"
    : num < 0
      ? `(${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CashSummaryTable({ data, onAccountClick }: Props) {
  if (!data) return null;
  const debitRows = data.inflows ?? [];
  const creditRows = data.outflows ?? [];

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-zinc-200 overflow-visible">
      <Table className="trial-balance-report-table">
        <TableHeader className="bg-primary text-white">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="text-white w-[60px] text-center font-bold uppercase text-[11px]">SL</TableHead>
            <TableHead className="text-white text-center font-bold uppercase text-[11px]">Account Description</TableHead>
            <TableHead className="text-white text-center font-bold uppercase text-[11px]">Ledger no.</TableHead>
            <TableHead className="text-white text-center font-bold uppercase text-[11px]">Debit (Dr.)</TableHead>
            <TableHead className="text-white text-center font-bold uppercase text-[11px]">Credit (Cr.)</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="text-[13px]">
          <TableRow className="bg-zinc-50 hover:bg-zinc-50 border-t-2 border-zinc-100">
            <TableCell colSpan={5} className="py-2 font-black text-zinc-400 uppercase text-[10px] tracking-[0.2em]">
              Debit Balances
            </TableCell>
          </TableRow>
          {debitRows.map((item, index) => (
            <TableRow key={`debit-${item.particularId ?? item.accountDescription}-${index}`} className="hover:bg-zinc-50/30 transition-colors">
              <TableCell className="text-zinc-500 font-mono">{index + 1}</TableCell>
              <TableCell className="font-medium text-zinc-700">
                {item.particularId ? (
                  <button type="button" onClick={() => onAccountClick?.(item)} className="text-left text-sky-700 underline-offset-4 hover:underline focus:outline-none focus:underline">
                    {item.accountDescription}
                  </button>
                ) : item.accountDescription}
              </TableCell>
              <TableCell className="text-zinc-400 font-mono text-xs">{item.ledgerNo}</TableCell>
              <TableCell className="text-right font-semibold text-zinc-900">{format(item.debit)}</TableCell>
              <TableCell className="text-right text-zinc-400">{format(item.credit)}</TableCell>
            </TableRow>
          ))}

          <TableRow className="bg-zinc-50 hover:bg-zinc-50 border-t-2 border-zinc-100">
            <TableCell colSpan={5} className="py-2 font-black text-zinc-400 uppercase text-[10px] tracking-[0.2em]">
              Credit Balances
            </TableCell>
          </TableRow>
          {creditRows.map((item, index) => (
            <TableRow key={`credit-${item.particularId ?? item.accountDescription}-${index}`} className="hover:bg-zinc-50/30 transition-colors">
              <TableCell className="text-zinc-500 font-mono">{debitRows.length + index + 1}</TableCell>
              <TableCell className="font-medium text-zinc-700">
                {item.particularId ? (
                  <button type="button" onClick={() => onAccountClick?.(item)} className="text-left text-sky-700 underline-offset-4 hover:underline focus:outline-none focus:underline">
                    {item.accountDescription}
                  </button>
                ) : item.accountDescription}
              </TableCell>
              <TableCell className="text-zinc-400 font-mono text-xs">{item.ledgerNo}</TableCell>
              <TableCell className="text-right text-zinc-400">{format(item.debit)}</TableCell>
              <TableCell className="text-right font-semibold">{format(item.credit)}</TableCell>
            </TableRow>
          ))}

          <TableRow className="bg-black text-white hover:bg-black border-t-4 border-black">
            <TableCell></TableCell>
            <TableCell className="font-black uppercase tracking-tighter text-sm">Trial Balance Totals</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right font-black text-emerald-400 text-base">{format(data.totals.debit)}</TableCell>
            <TableCell className="text-right font-black text-emerald-400 text-base">{format(data.totals.credit)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
