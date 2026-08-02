"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";

interface ParentStudentSwitcherProps {
  students: any[];
  selectedStudentId: string | null;
  onStudentChange: (studentId: string) => void;
  disabled?: boolean;
}

export function ParentStudentSwitcher({ students, selectedStudentId, onStudentChange, disabled }: ParentStudentSwitcherProps) {
  if (students.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap">
        <User className="w-4 h-4 mr-2" /> Viewing for:
      </div>
      <Select 
        value={selectedStudentId || ""} 
        onValueChange={onStudentChange}
        disabled={disabled || false}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select student" />
        </SelectTrigger>
        <SelectContent>
          {students.map(s => {
            const id = s.id || s.studentId;
            return (
              <SelectItem key={id} value={id}>
                {s.name} ({s.className || s.classId})
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
