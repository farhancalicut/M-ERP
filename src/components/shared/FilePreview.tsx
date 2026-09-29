"use client";

import { useState } from "react";
import { File, FileText, Image as ImageIcon, X, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentData } from "./FileUpload";
import { FilePreviewModal, getFileTypeInfo, formatFileSize } from "./FilePreviewModal";

interface FilePreviewProps {
  attachment: AttachmentData;
  onRemove?: () => void;
  showDownload?: boolean;
}

export function FilePreview({ attachment, onRemove, showDownload = true }: FilePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const typeInfo = getFileTypeInfo(attachment);

  return (
    <>
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group">
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1 min-w-0" 
          onClick={() => setIsPreviewOpen(true)}
          title="Click to preview file"
        >
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded bg-muted text-muted-foreground group-hover:scale-105 transition-transform overflow-hidden">
            {typeInfo.isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.fileUrl} alt={attachment.fileName} className="w-full h-full object-cover rounded" />
            ) : typeInfo.isPDF ? (
              <FileText className="w-5 h-5 text-red-500" />
            ) : (
              <File className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors" title={attachment.fileName}>
              {attachment.fileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setIsPreviewOpen(true)} 
            type="button" 
            className="h-8 px-2.5 text-xs gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          {showDownload && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Download file">
              <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" download={attachment.fileName}>
                <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </a>
            </Button>
          )}

          {onRemove && (
            <Button variant="ghost" size="icon" onClick={onRemove} type="button" className="h-8 w-8" title="Remove attachment">
              <X className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <FilePreviewModal
        attachment={attachment}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </>
  );
}
