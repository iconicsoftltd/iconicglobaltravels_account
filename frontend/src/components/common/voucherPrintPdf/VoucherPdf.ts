import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type VoucherReportData = {
  voucherTitle?: string;
  config?: {
    logo?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  voucherNo?: string;
  date?: string | Date;
  rows?: Array<{
    type?: string;
    particulars?: string;
    debit?: number;
    credit?: number;
  }>;
  totalDebit?: number;
  totalCredit?: number;
  amountInWords?: string;
  narration?: string;
};

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const displayDate = (value?: string | Date) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export const downloadVoucherPdf = (voucherData: VoucherReportData) => {
  if (!voucherData) return;

  const title = voucherData.voucherTitle || "Voucher";
  const config = voucherData.config || {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  if (config.logo) {
    try {
      doc.addImage(config.logo, "PNG", (pageWidth - 42) / 2, 10, 42, 14);
    } catch {
      // The report remains downloadable when a remote logo is not yet available.
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(config.address || "", pageWidth / 2, 29, { align: "center" });
  doc.text(
    [config.email, config.phone].filter(Boolean).join("  |  "),
    pageWidth / 2,
    34,
    { align: "center" },
  );
  doc.text(config.website || "", pageWidth / 2, 39, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 191, 255);
  doc.text(title, pageWidth / 2, 49, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Voucher No: ${voucherData.voucherNo || "-"}`, margin, 58);
  doc.text(`Date: ${displayDate(voucherData.date)}`, pageWidth - margin, 58, {
    align: "right",
  });

  const body = (voucherData.rows || []).map((row, index) => [
    String(index + 1),
    row.type || "-",
    row.particulars || "N/A",
    money(row.debit),
    money(row.credit),
  ]);
  body.push([
    "",
    "",
    "Total Amount",
    money(voucherData.totalDebit),
    money(voucherData.totalCredit),
  ]);

  autoTable(doc, {
    startY: 64,
    head: [["S/L", "Debit / Credit", "Particulars", "Debit", "Credit"]],
    body,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, lineColor: [209, 213, 219] },
    headStyles: {
      fillColor: [192, 0, 180],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 13 },
      1: { halign: "center", cellWidth: 30 },
      2: { cellWidth: "auto" },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [249, 250, 251];
      }
    },
    margin: { left: margin, right: margin },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 64;
  let currentY = tableEndY + 9;

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 11, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(55, 65, 81);
  doc.text(`IN WORD: ${voucherData.amountInWords || "-"}`, pageWidth / 2, currentY + 7, {
    align: "center",
  });
  currentY += 19;

  if (voucherData.narration) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, currentY);
    doc.setFont("helvetica", "normal");
    const notes = doc.splitTextToSize(voucherData.narration, pageWidth - margin * 2);
    doc.text(notes, margin, currentY + 6);
  }

  const signatureY = doc.internal.pageSize.getHeight() - 18;
  ["Authorised By", "Account", "Signature"].forEach((label, index) => {
    const x = margin + ((pageWidth - margin * 2) * index) / 2;
    const align = index === 0 ? "left" : index === 2 ? "right" : "center";
    doc.text(label, x, signatureY, { align });
  });

  const safeVoucherNo = (voucherData.voucherNo || "voucher").replace(/[^a-z0-9-_]/gi, "-");
  doc.save(`${safeVoucherNo}.pdf`);
};

export default downloadVoucherPdf;

