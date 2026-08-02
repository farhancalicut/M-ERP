import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportService = {
  /**
   * Export data to an Excel file.
   * @param data Array of objects to export.
   * @param filename Output file name (without extension).
   */
  exportToExcel(data: any[], filename: string) {
    if (!data || data.length === 0) {
      throw new Error("No data available to export.");
    }
    if (data.length > 1000) {
      throw new Error("Export limit exceeded. Please apply more filters (max 1000 records).");
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },

  /**
   * Export data to a PDF file with a table format.
   * @param data Array of objects to export.
   * @param columns Array of column names (headers) matching the keys in data objects.
   * @param title Title of the PDF document.
   * @param filename Output file name (without extension).
   */
  exportToPdf(data: any[], columns: { header: string; dataKey: string }[], title: string, filename: string) {
    if (!data || data.length === 0) {
      throw new Error("No data available to export.");
    }
    if (data.length > 500) {
      throw new Error("Export limit exceeded for PDF. Please apply more filters (max 500 records).");
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 22);

    // Prepare table data
    const rows = data.map((row) => columns.map((col) => row[col.dataKey]));
    const headers = [columns.map((col) => col.header)];

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${filename}.pdf`);
  }
};
