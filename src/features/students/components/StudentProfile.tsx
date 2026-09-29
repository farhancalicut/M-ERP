import { Student, Parent } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function StudentProfile({ student, className, parent }: { student: Student, className?: string, parent?: Parent | null }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={student.photoUrl} alt={student.name} />
            <AvatarFallback className="text-2xl">{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left space-y-1 flex-1">
            <h2 className="text-2xl font-bold">{student.name}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <span>{student.admissionNo}</span>
              <span>•</span>
              <span>Class {className || student.classId}</span>
            </div>
            <div className="pt-2">
              <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>{student.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-medium">{student.gender}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-medium">{student.dob.toDate().toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Blood Group</span>
              <span className="font-medium">{student.bloodGroup || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium">{student.address}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Admission Date</span>
              <span className="font-medium">{student.admissionDate.toDate().toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Alumni Eligible</span>
              <span className="font-medium">{student.isAlumniEligible ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        {parent && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Guardian Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Father's Name</span>
                  <span className="font-medium">{parent.fatherName || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Mother's Name</span>
                  <span className="font-medium">{parent.motherName || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Mobile</span>
                  <span className="font-medium">{parent.mobile || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-medium">{parent.email || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Relation</span>
                  <span className="font-medium">{student.guardianRelation || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
