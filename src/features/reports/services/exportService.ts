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
  },

  /**
   * Export a single fee payment receipt to PDF
   */
  generateReceiptPdf(payment: any, student: any, madrassaName: string = "Madrassa") {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text(madrassaName, 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text('Payment Receipt', 105, 30, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    // Details
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Receipt No: ${payment.receiptNo || payment.paymentNo || payment.id}`, 20, 45);
    
    const dateStr = payment.createdAt?.toMillis 
      ? new Date(payment.createdAt.toMillis()).toLocaleDateString()
      : new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, 140, 45);
    
    doc.text(`Student Name: ${student?.name || 'Unknown'}`, 20, 55);
    doc.text(`Admission No: ${student?.admissionNo || 'N/A'}`, 140, 55);
    doc.text(`Class: ${student?.className || student?.classId || 'N/A'}`, 20, 62);
    
    // Table
    const tableData = [
      [payment.feeName || payment.feeCategoryId || 'Fee Payment', `Rs. ${payment.amount}`]
    ];
    
    autoTable(doc, {
      startY: 75,
      head: [['Fee Description', 'Amount Paid']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      styles: { fontSize: 11, cellPadding: 5 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(11);
    doc.text(`Payment Method: ${payment.paymentMethod || 'N/A'}`, 20, finalY + 15);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for the payment.', 105, finalY + 35, { align: 'center' });
    doc.text('This is a computer-generated receipt.', 105, finalY + 42, { align: 'center' });
    
    doc.save(`Receipt-${payment.paymentNo || payment.id}.pdf`);
  }
};
