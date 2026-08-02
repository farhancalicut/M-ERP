export const exportUtils = {
  /**
   * Export an array of objects to a CSV file.
   */
  exportToCSV: async (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export an array of objects to an Excel (.xlsx) file.
   */
  exportToExcel: async (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },

  /**
   * Export data to a PDF using jsPDF and autoTable.
   * `columns` should be an array of objects like { header: 'Name', dataKey: 'name' }
   */
  exportToPDF: async (title: string, columns: any[], data: any[], filename: string) => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    (doc as any).autoTable({
      head: [columns.map(c => c.header)],
      body: data.map(item => columns.map(c => item[c.dataKey])),
      startY: 30,
    });
    
    doc.save(`${filename}.pdf`);
  }
};
