import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportTableProps {
  columns: { header: string; dataKey: string; cell?: (row: any) => React.ReactNode }[];
  data: any[];
}

export function ReportTable({ columns, data }: ReportTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground text-sm">
        No records found. Please adjust your filters.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col, j) => (
                <TableCell key={j}>
                  {col.cell ? col.cell(row) : row[col.dataKey]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="text-xs text-muted-foreground p-3 border-t bg-muted/30">
        Showing {data.length} records.
      </div>
    </div>
  );
}
