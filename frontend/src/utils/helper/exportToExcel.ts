import * as XLSX from "xlsx";

type ExportTablesToExcelOptions = {
  filename?: string;
  sheetName?: string;
  selector?: string;
  title?: string;
};

const cleanFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const cleanSheetName = (value: string) =>
  value.replace(/[\\/?*[\]:]+/g, " ").trim().slice(0, 31) || "Report";

const getCellText = (cell: HTMLTableCellElement) =>
  cell.innerText.replace(/\s+/g, " ").trim();

export const exportTablesToExcel = ({
  filename = "report",
  sheetName = "Report",
  selector = "main",
  title,
}: ExportTablesToExcelOptions = {}) => {
  const container = document.querySelector(selector) || document.body;
  const tables = Array.from(container.querySelectorAll("table"));
  const rows: (string | number)[][] = [];

  if (title) {
    rows.push([title]);
    rows.push([]);
  }

  tables.forEach((table, tableIndex) => {
    const caption = table.caption?.innerText?.trim();
    if (caption) {
      rows.push([caption]);
    } else if (tableIndex > 0) {
      rows.push([`Table ${tableIndex + 1}`]);
    }

    Array.from(table.rows).forEach((row) => {
      rows.push(Array.from(row.cells).map(getCellText));
    });

    rows.push([]);
  });

  if (!tables.length) {
    const visibleText = (container as HTMLElement).innerText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    visibleText.forEach((line) => rows.push([line]));
  }

  if (!rows.length) return false;

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName(sheetName));
  XLSX.writeFile(workbook, `${cleanFileName(filename) || "report"}.xlsx`);

  return true;
};
