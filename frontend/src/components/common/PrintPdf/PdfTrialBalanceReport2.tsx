import { appConfiguration } from "@/utils/constant/appConfiguration";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";

const PdfTrialBalanceReport2 = (reportData: any, currentCurrency: any, queryParams: any, reportType: string) => {
  const doc = new jsPDF("portrait", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const currency = currentCurrency?.name || "";
  if (appConfiguration.logo) doc.addImage(appConfiguration.logo, "PNG", (pageWidth - 40) / 2, margin, 40, 12);
  doc.setFontSize(16); doc.text("TRIAL BALANCE REPORT", pageWidth / 2, margin + 22, { align: "center" });
  doc.setFontSize(10); doc.text(`Period: ${reportType}`, margin, margin + 32);
  doc.text(`From: ${queryParams?.fromDate ? dayjs(queryParams.fromDate).format("DD MMM YYYY") : "-"}`, pageWidth / 2 - 20, margin + 32);
  doc.text(`To: ${queryParams?.toDate ? dayjs(queryParams.toDate).format("DD MMM YYYY") : "-"}`, pageWidth - margin, margin + 32, { align: "right" });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, margin + 38, { align: "center" });
  const rows = [...(reportData?.inflows || []), ...(reportData?.outflows || [])];
  const body = rows.map((item: any, index: number) => [index + 1, item.accountDescription, item.ledgerNo || "", item.debit ? `${currency} ${Number(item.debit).toFixed(2)}` : "", item.credit ? `${currency} ${Number(item.credit).toFixed(2)}` : ""]);
  body.push(["", "Total", "", `${currency} ${Number(reportData.totals.debit).toFixed(2)}`, `${currency} ${Number(reportData.totals.credit).toFixed(2)}`]);
  autoTable(doc, { startY: margin + 45, head: [["SL", "Account Description", "Ledger No", "Debit", "Credit"]], body, theme: "grid", styles: { fontSize: 8 } });
  doc.save(`trial-balance-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default PdfTrialBalanceReport2;