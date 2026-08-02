"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";

export interface AttachmentData {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface FileUploadProps {
  onUpload: (attachment: AttachmentData) => void;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
}

export function FileUpload({ onUpload, maxSizeMB = 5, accept = "*/*", label = "Upload File" }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type and size limits
    const isImage = file.type.startsWith("image/");
    const limitMB = isImage ? 1 : maxSizeMB;
    
    if (file.size > limitMB * 1024 * 1024) {
      setError(`File must be less than ${limitMB}MB.`);
      return;
    }

    setError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
    
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary not configured");

      // Use /auto/upload to handle both images and raw files (PDFs, docs)
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        onUpload({
          fileName: file.name,
          fileUrl: data.secure_url,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
      } else {
        setError(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during upload.");
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isUploading ? "Uploading..." : label}
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
