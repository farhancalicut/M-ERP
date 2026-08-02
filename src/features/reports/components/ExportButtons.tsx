"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportService } from "../services/exportService";

interface ExportButtonsProps {
  data: any[];
  columns: { header: string; dataKey: string }[];
  filename: string;
  title: string;
}

export function ExportButtons({ data, columns, filename, title }: ExportButtonsProps) {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleExportExcel = async () => {
    try {
      setLoadingExcel(true);
      // Ensure we export only requested columns in the correct order
      const exportData = data.map(item => {
        const row: any = {};
        columns.forEach(col => {
          row[col.header] = item[col.dataKey];
        });
        return row;
      });
      exportService.exportToExcel(exportData, filename);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setLoadingPdf(true);
      exportService.exportToPdf(data, columns, title, filename);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loadingExcel || data.length === 0}>
        {loadingExcel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />}
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={loadingPdf || data.length === 0}>
        {loadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4 text-red-600" />}
        PDF
      </Button>
    </div>
  );
}
