"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Class } from "@/types/schema";

interface StudentFiltersProps {
  onSearch: (filters: Record<string, string>) => void;
  classes?: Class[];
}

export function StudentFilters({ onSearch, classes = [] }: StudentFiltersProps) {
  const [admissionNo, setAdmissionNo] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [classId, setClassId] = useState("");

  const handleSearch = () => {
    onSearch({
      ...(admissionNo && { admissionNo }),
      ...(nameSearch && { nameSearch }),
      ...(classId && classId !== "ALL" && { classId }),
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
      <div className="space-y-1 flex-1">
        <label className="text-sm font-medium">Name</label>
        <Input 
          placeholder="Search name..." 
          value={nameSearch} 
          onChange={(e) => setNameSearch(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="space-y-1 flex-1">
        <label className="text-sm font-medium">Adm No</label>
        <Input 
          placeholder="Admission No..." 
          value={admissionNo} 
          onChange={(e) => setAdmissionNo(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <div className="space-y-1 flex-1">
        <label className="text-sm font-medium">Class</label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger>
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id as string}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSearch}>
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
