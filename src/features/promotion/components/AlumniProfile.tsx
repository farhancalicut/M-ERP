"use client";

import React from "react";
import { Alumni } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AlumniProfileProps {
  alumni: Alumni;
}

export function AlumniProfile({ alumni }: AlumniProfileProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Alumni ID</span>
            <span className="font-mono">{alumni.alumniId}</span>

            <span className="font-medium text-muted-foreground">Name</span>
            <span>{alumni.name}</span>

            <span className="font-medium text-muted-foreground">Mobile</span>
            <span>{alumni.mobile || "N/A"}</span>

            <span className="font-medium text-muted-foreground">Email</span>
            <span>{alumni.email || "N/A"}</span>

            <span className="font-medium text-muted-foreground">Status</span>
            <span>
               <Badge variant={alumni.status === "ACTIVE" ? "default" : "secondary"}>
                 {alumni.status}
               </Badge>
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Academic History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Admission No</span>
            <span>{alumni.admissionNo || "N/A"}</span>

            <span className="font-medium text-muted-foreground">Completion Year</span>
            <span>{alumni.completionYear}</span>

            <span className="font-medium text-muted-foreground">Generated Date</span>
            <span>{alumni.createdAt ? format((alumni.createdAt as { toDate: () => Date }).toDate(), "PP") : "N/A"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
