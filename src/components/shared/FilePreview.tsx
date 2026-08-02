"use client";

import { File, FileText, Image as ImageIcon, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentData } from "./FileUpload";

interface FilePreviewProps {
  attachment: AttachmentData;
  onRemove?: () => void;
  showDownload?: boolean;
}

export function FilePreview({ attachment, onRemove, showDownload = true }: FilePreviewProps) {
  const isImage = attachment.fileType.startsWith("image/");
  const isPDF = attachment.fileType === "application/pdf";
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded bg-muted text-muted-foreground">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.fileUrl} alt={attachment.fileName} className="w-full h-full object-cover rounded" />
          ) : isPDF ? (
            <FileText className="w-5 h-5 text-red-500" />
          ) : (
            <File className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" title={attachment.fileName}>
            {attachment.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSize(attachment.fileSize)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
        {showDownload && (
          <Button variant="ghost" size="icon" asChild>
            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="w-4 h-4 text-muted-foreground" />
            </a>
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} type="button">
            <X className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
