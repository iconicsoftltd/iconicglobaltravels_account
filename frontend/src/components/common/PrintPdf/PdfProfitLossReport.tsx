import { appConfiguration } from "@/utils/constant/appConfiguration";
import { formatWithDrCr } from "@/utils/helper/accountingFormat";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PdfProfitLossReport = (
  reportData: any,
  currentCurrency: any,
  queryParams: any,
  reportType: string
) => {
  const logo = appConfiguration.logo;
  const report = reportData?.data;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ================= Header =================
  const addHeader = () => {
    const logoWidth = 50;
    const logoHeight = 15;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = margin;

    if (logo) doc.addImage(logo, "PNG", logoX, logoY, logoWidth, logoHeight);

    const titleY = logoY + logoHeight + 8;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Profit & Loss Statement", pageWidth / 2, titleY, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
      margin,
      titleY + 12
    );
    doc.text(`From: ${queryParams.fromDate}`, pageWidth / 2 - 20, titleY + 12);
    doc.text(`To: ${queryParams.toDate}`, pageWidth - margin, titleY + 12, {
      align: "right",
    });

    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      titleY + 18,
      { align: "center" }
    );

    doc.setLineWidth(0.5);
    doc.line(margin, titleY + 22, pageWidth - margin, titleY + 22);
  };

  addHeader();

  // ================= Table Body =================
  const tableBody: any[] = report
    ? [
        ["Total Sales Revenue", formatWithDrCr(report.totalSales, "Cr")],
        ["Cost of Goods Sold (COGS)", formatWithDrCr(report.purchaseAmount, "Dr")],
        ["Gross Profit", formatWithDrCr(report.grossProfit)],
        ["Administrative Expenses", formatWithDrCr(report.adminExpenses, "Dr")],
        ["Selling & Distribution Expenses", formatWithDrCr(report.sellingExpenses, "Dr")],
        ["Other Non-Operating Income", formatWithDrCr(report.nonOperatingIncome, "Cr")],
        ["Earnings Before Tax (EBT)", formatWithDrCr(report.earningBeforeTax)],
        ["Income Tax Expense", formatWithDrCr(report.taxAmount, "Dr")],
        ["NET EARNINGS AFTER TAX", formatWithDrCr(report.earningAfterTax)],
      ].map(([label, value], index) => [
        {
          content: label,
          styles: {
            fontStyle: index === 2 || index === 6 || index === 8 ? "bold" as const : "normal" as const,
          },
        },
        {
          content: value,
          styles: {
            halign: "right" as const,
            fontStyle: "bold" as const,
            textColor: index === 8 && Number(report.earningAfterTax) < 0 ? [248, 113, 113] : [0, 0, 0],
          },
        },
      ])
    : [
        [
          {
            content: "No data available",
            colSpan: 2,
            styles: { halign: "center" },
          },
        ],
      ];

  // ================= Generate Table =================
  autoTable(doc, {
    startY: margin + 45,
    head: [["Description", `Amount (${currentCurrency?.name ?? ""})`]],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [209, 213, 219],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [192, 0, 180],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: "auto" }, // key column auto width
      1: { cellWidth: "auto", halign: "right", overflow: "linebreak" }, // value column auto width
    },
    margin: { left: margin, right: margin },
  });

  // ================= Signature Section =================
  const signaturesY = pageHeight - 25;
  const signatureWidth = (pageWidth - 2 * margin) / 4;
  const signatures = [
    "Prepared By",
    "Accounts Officer",
    "Finance Manager",
    "General Manager",
  ];

  signatures.forEach((signature, index) => {
    const x = margin + index * signatureWidth + signatureWidth / 2;
    doc.text(signature, x, signaturesY, { align: "center" });
    doc.line(x - 20, signaturesY + 2, x + 20, signaturesY + 2);
  });

  // ================= Save PDF =================
  const fileName = `profit-loss-report-${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  doc.save(fileName);
};

export default PdfProfitLossReport;
