"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  File, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  RefreshCw,
  Video,
  Music,
  FileCode
} from "lucide-react";
import { AttachmentData } from "./FileUpload";

interface FilePreviewModalProps {
  attachment: AttachmentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function getFileTypeInfo(attachment: AttachmentData | null) {
  if (!attachment) {
    return { isImage: false, isPDF: false, isVideo: false, isAudio: false, isText: false, isOther: true };
  }

  const fileName = (attachment.fileName || "").toLowerCase();
  const fileType = (attachment.fileType || "").toLowerCase();

  const isImage = fileType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(fileName);
  const isPDF = fileType === "application/pdf" || fileName.endsWith(".pdf");
  const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|ogg|mov|mkv)$/i.test(fileName);
  const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName);
  const isText = fileType.startsWith("text/") || /\.(txt|csv|json|md|log|js|ts|html|css)$/i.test(fileName);
  const isOther = !isImage && !isPDF && !isVideo && !isAudio && !isText;

  return { isImage, isPDF, isVideo, isAudio, isText, isOther };
}

export function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FilePreviewModal({ attachment, open, onOpenChange }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState(false);

  const typeInfo = getFileTypeInfo(attachment);

  // Reset image controls or fetch text when attachment changes
  useEffect(() => {
    if (open && attachment) {
      setZoom(100);
      setRotation(0);

      if (typeInfo.isText) {
        setLoadingText(true);
        setTextError(false);
        fetch(attachment.fileUrl)
          .then((res) => {
            if (!res.ok) throw new Error("Failed to load text content");
            return res.text();
          })
          .then((text) => {
            setTextContent(text);
            setLoadingText(false);
          })
          .catch(() => {
            setTextError(true);
            setLoadingText(false);
          });
      }
    }
  }, [open, attachment]);

  if (!attachment) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-[90vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 pr-6">
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-lg font-semibold truncate flex items-center gap-2">
              {typeInfo.isImage && <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              {typeInfo.isPDF && <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />}
              {typeInfo.isVideo && <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />}
              {typeInfo.isAudio && <Music className="w-5 h-5 text-amber-500 flex-shrink-0" />}
              {typeInfo.isText && <FileCode className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              {typeInfo.isOther && <File className="w-5 h-5 text-gray-500 flex-shrink-0" />}
              <span className="truncate" title={attachment.fileName}>
                {attachment.fileName}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(attachment.fileSize)}</span>
              <span>•</span>
              <Badge variant="outline" className="text-[10px] uppercase py-0 px-1.5 font-mono">
                {attachment.fileName.split('.').pop() || 'file'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0">
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
              <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in New Tab</span>
              </a>
            </Button>
            <Button size="sm" asChild className="gap-1.5 text-xs">
              <a href={attachment.fileUrl} download={attachment.fileName} target="_blank" rel="noopener noreferrer">
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Content Viewer Body */}
        <div className="flex-1 overflow-y-auto min-h-[350px] py-4 flex flex-col justify-center items-center">
          {/* IMAGE PREVIEW */}
          {typeInfo.isImage && (
            <div className="w-full h-full flex flex-col items-center justify-between gap-3">
              {/* Image Toolbar */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-muted rounded-lg border text-xs">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 50} title="Zoom Out" className="h-8 w-8">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-mono font-medium">{zoom}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 300} title="Zoom In" className="h-8 w-8">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate 90°" className="h-8 w-8">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleReset} title="Reset View" className="h-8 w-8">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Image Display */}
              <div className="w-full flex-1 min-h-[300px] max-h-[70vh] overflow-auto border rounded-lg bg-black/5 dark:bg-black/30 flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.fileUrl}
                  alt={attachment.fileName}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-in-out",
                  }}
                  className="max-h-[65vh] max-w-full object-contain rounded shadow-sm"
                />
              </div>
            </div>
          )}

          {/* PDF PREVIEW */}
          {typeInfo.isPDF && (
            <div className="w-full h-full flex flex-col gap-2">
              <iframe
                src={`${attachment.fileUrl}#toolbar=1`}
                title={attachment.fileName}
                className="w-full h-[68vh] sm:h-[72vh] rounded-lg border bg-white shadow-inner"
              />
            </div>
          )}

          {/* VIDEO PREVIEW */}
          {typeInfo.isVideo && (
            <div className="w-full flex justify-center items-center">
              <video
                src={attachment.fileUrl}
                controls
                autoPlay={false}
                className="w-full max-h-[70vh] rounded-lg border bg-black shadow-md"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {/* AUDIO PREVIEW */}
          {typeInfo.isAudio && (
            <div className="w-full max-w-lg p-8 border rounded-lg bg-card shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-semibold text-base">{attachment.fileName}</h4>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
              </div>
              <audio src={attachment.fileUrl} controls className="w-full pt-2">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* TEXT PREVIEW */}
          {typeInfo.isText && (
            <div className="w-full h-full flex flex-col">
              {loadingText ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading text preview...</div>
              ) : textError ? (
                <div className="p-8 text-center text-sm text-red-500">Failed to load text preview. Use the download option to view this file.</div>
              ) : (
                <pre className="w-full max-h-[70vh] overflow-auto p-4 bg-muted/60 dark:bg-muted/20 border rounded-lg text-xs font-mono whitespace-pre-wrap break-words">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {/* UNSUPPORTED / OTHER PREVIEW */}
          {typeInfo.isOther && (
            <div className="w-full max-w-md p-8 border rounded-lg bg-card shadow-sm text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <File className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-base truncate" title={attachment.fileName}>{attachment.fileName}</h4>
                <p className="text-xs text-muted-foreground">
                  Direct in-app preview is not available for this file type ({attachment.fileName.split('.').pop()}).
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button size="sm" asChild className="gap-2">
                  <a href={attachment.fileUrl} download={attachment.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
