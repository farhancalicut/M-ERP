"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search } from "lucide-react";

interface StudentFiltersProps {
  onSearch: (filters: Record<string, string>) => void;
}

export function StudentFilters({ onSearch }: StudentFiltersProps) {
  const [admissionNo, setAdmissionNo] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [classId, setClassId] = useState("");

  const handleSearch = () => {
    onSearch({
      ...(admissionNo && { admissionNo }),
      ...(nameSearch && { nameSearch }),
      ...(classId && { classId }),
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
        <Input 
          placeholder="Class ID..." 
          value={classId} 
          onChange={(e) => setClassId(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
