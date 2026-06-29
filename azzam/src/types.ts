export interface PdfDocState {
  bytes: Uint8Array;
  name: string;
  size: number;
  totalPages: number;
  extractedText?: string;
}

export type ActiveTabType = 
  | "organize"   // Pages, Rotate, Delete, Reorder, Reverse
  | "edit"       // Text Redaction, Search & Replace, Annotation, Signature, Watermark, Page Numbers
  | "merge"      // Merge documents, Append Images
  | "compress"   // File Compression
  | "protect"    // Password lock/unlock, Metadata editor
  | "ai_assistant" // Gemini AI PDF Companion (Summarize, Q&A, Translate)
  | "convert"    // Convert PDF to PNG images
  | "text_extract" // Extract text to .txt and clipboard
  | "scan";       // Scan document using Camera or Upload with premium filters

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: Date;
}

export interface PageThumbnail {
  pageNum: number;
  dataUrl?: string;
  rotation: number; // 0, 90, 180, 270
}

export interface RedactionPreset {
  label: string;
  color: string;
}
