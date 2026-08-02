import { Badge } from "@/components/ui/badge";
import { AttendanceDocStatus, DailyAttendanceRecord } from "@/types/schema";

interface AttendanceStatusBadgeProps {
  status: AttendanceDocStatus;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  switch (status) {
    case "LOCKED":
      return <Badge variant="destructive">Locked</Badge>;
    case "SUBMITTED":
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Submitted</Badge>;
    case "DRAFT":
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

interface StudentAttendanceBadgeProps {
  status: DailyAttendanceRecord["status"];
}

export function StudentAttendanceBadge({ status }: StudentAttendanceBadgeProps) {
  switch (status) {
    case "PRESENT":
      return <Badge variant="outline" className="text-green-600 border-green-600">Present</Badge>;
    case "ABSENT":
      return <Badge variant="outline" className="text-red-600 border-red-600">Absent</Badge>;
    case "LEAVE":
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Leave</Badge>;
  }
}
