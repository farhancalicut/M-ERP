import { Notice } from "@/types/schema";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin, Calendar, User } from "lucide-react";

export function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <Card className="relative overflow-hidden">
      {notice.pinned && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-white px-2 py-1 rounded-bl-lg">
          <Pin className="h-4 w-4" />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{notice.title}</CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <Calendar className="h-3 w-3" />
              <span>{notice.publishedAt ? format(notice.publishedAt.toDate(), "MMM dd, yyyy") : "Not published"}</span>
            </CardDescription>
          </div>
          <Badge variant={notice.status === "PUBLISHED" ? "default" : "secondary"}>
            {notice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{notice.description}</p>
        
        {notice.attachments && notice.attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {notice.attachments.map((file, i) => (
              <a 
                key={i} 
                href={file.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 truncate max-w-[200px]"
              >
                ?? {file.fileName}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
