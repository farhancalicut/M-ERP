"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Controller, Control, UseFormSetValue } from "react-hook-form";
import { PromotionStudent } from "@/types/schema";

interface PromotionTableProps {
  fields: (PromotionStudent & { id?: string })[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  isHighestClass: boolean;
}

export function PromotionTable({ fields, control, setValue, isHighestClass }: PromotionTableProps) {
  
  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Result Status</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Override</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.studentId}>
              <TableCell className="font-medium">{field.studentName}</TableCell>
              <TableCell>
                <Badge variant={field.resultStatus === "PASS" ? "default" : "destructive"}>
                  {field.resultStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <Controller
                  control={control}
                  name={`students.${index}.action`}
                  render={({ field: selectField }) => (
                    <Select
                      onValueChange={(val) => {
                        selectField.onChange(val);
                        // If they manually changed it, we could mark override = true, but let's let them explicitly click override if they want to explain.
                        // Actually, auto-override is better.
                        const defaultAction = field.resultStatus === "PASS" ? (isHighestClass ? "ALUMNI" : "PROMOTED") : "DETAINED";
                        if (val !== defaultAction) {
                           setValue(`students.${index}.override`, true);
                        } else {
                           setValue(`students.${index}.override`, false);
                           setValue(`students.${index}.remarks`, "");
                        }
                      }}
                      value={selectField.value}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        {!isHighestClass && <SelectItem value="PROMOTED">Promote</SelectItem>}
                        <SelectItem value="DETAINED">Detain</SelectItem>
                        <SelectItem value="ALUMNI">Alumni</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  control={control}
                  name={`students.${index}.override`}
                  render={({ field: overrideField }) => {
                     if (!overrideField.value) return <span className="text-muted-foreground text-sm">N/A</span>;
                     return (
                        <Controller 
                          control={control}
                          name={`students.${index}.remarks`}
                          render={({ field: remarkField }) => (
                            <Input 
                              placeholder="Reason for override..."
                              {...remarkField}
                              value={remarkField.value || ""}
                            />
                          )}
                        />
                     );
                  }}
                />
              </TableCell>
              <TableCell>
                <Controller
                  control={control}
                  name={`students.${index}.override`}
                  render={({ field: overrideField }) => (
                    <Badge variant={overrideField.value ? "destructive" : "secondary"}>
                      {overrideField.value ? "Yes" : "No"}
                    </Badge>
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No students found for promotion.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
