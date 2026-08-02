"use client";

import { Table } from "@tanstack/react-table";
import { X, Download, Printer } from "lucide-react";
import { exportUtils } from "@/lib/exportUtils";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string | undefined;
  searchPlaceholder?: string | undefined;
  exportFilename?: string | undefined;
  exportData?: any[] | undefined;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search...",
  exportFilename,
  exportData,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {exportFilename && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 print:hidden"
              onClick={() => {
                const dataToExport = exportData && exportData.length > 0
                  ? exportData
                  : table.getFilteredRowModel().rows.map(row => row.original);
                
                exportUtils.exportToCSV(dataToExport, exportFilename);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
