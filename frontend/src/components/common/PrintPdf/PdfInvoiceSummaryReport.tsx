import { appConfiguration } from "@/utils/constant/appConfiguration";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const amount = (value: unknown) => Number(value || 0).toFixed(2);
const date = (value: unknown) => (value ? new Date(String(value)).toLocaleDateString() : "-");

const PdfInvoiceSummaryReport = (reportData: any, currentCurrency: any, queryParams: any) => {
  const report = reportData?.data;
  const rows = report?.rows || [];
  const currency = currentCurrency?.name || currentCurrency?.symbol || "BDT";
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  try {
    doc.addImage(appConfiguration.logo, "PNG", (pageWidth - 40) / 2, margin, 40, 12);
  } catch {
    doc.setFontSize(12);
    doc.text("Accounts Admin Portal", pageWidth / 2, margin + 8, { align: "center" });
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(188, 6, 176);
  doc.text("Invoice Summary Report", pageWidth / 2, margin + 23, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`From: ${date(queryParams.fromDate)}   To: ${date(queryParams.toDate)}   Status: ${queryParams.status || "All"}`, pageWidth / 2, margin + 31, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, margin + 37, { align: "center" });

  autoTable(doc, {
    startY: margin + 44,
    head: [["Metric", "Value", "Metric", "Value", "Metric", "Value", "Metric", "Value", "Metric", "Value"]],
    body: [[
      "Total Invoice", String(report?.totals?.invoiceCount || 0),
      "Grand Total", `${currency} ${amount(report?.totals?.grandTotal)}`,
      "Paid Total", `${currency} ${amount(report?.totals?.paidAmount)}`,
      "Refund Total", `${currency} ${amount(report?.totals?.refundAmount)}`,
      "Due Total", `${currency} ${amount(report?.totals?.dueAmount)}`,
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [188, 6, 176], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  });

  const body = rows.map((row: any, index: number) => [
    index + 1,
    row.invoiceNo,
    date(row.invoiceDate),
    row.customerName,
    row.itemCount,
    `${currency} ${amount(row.grandTotal)}`,
    `${currency} ${amount(row.paidAmount)}`,
    `${currency} ${amount(row.refundAmount)}`,
    `${currency} ${amount(row.dueAmount)}`,
    String(row.status || "").replace(/_/g, " "),
  ]);

  body.push(["", "", "", "Total", "", `${currency} ${amount(report?.totals?.grandTotal)}`, `${currency} ${amount(report?.totals?.paidAmount)}`, `${currency} ${amount(report?.totals?.refundAmount)}`, `${currency} ${amount(report?.totals?.dueAmount)}`, ""]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["SL", "Invoice No", "Date", "Customer", "Items", "Total", "Paid", "Refund", "Due", "Status"]],
    body,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [188, 6, 176], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 10 }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  doc.save(`invoice-summary-report-${dayjs().format("YYYY-MM-DD")}.pdf`);
};

export default PdfInvoiceSummaryReport;



