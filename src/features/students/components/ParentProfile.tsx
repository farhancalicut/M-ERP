import { Parent } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ParentProfile({ parent }: { parent: Parent }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
            {parent.fatherName.substring(0, 1)}
          </div>
          <div className="text-center sm:text-left space-y-1 flex-1">
            <h2 className="text-2xl font-bold">Parent Profile</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
              <span>{parent.parentId}</span>
              <span>•</span>
              <span>{parent.studentCount} Student(s)</span>
            </div>
            <div className="pt-2">
              <Badge variant={parent.status === 'ACTIVE' ? 'default' : 'secondary'}>{parent.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Father&apos;s Name</span>
              <span className="font-medium">{parent.fatherName}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Mother&apos;s Name</span>
              <span className="font-medium">{parent.motherName}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Mobile</span>
              <span className="font-medium">{parent.mobile}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium">{parent.address}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
