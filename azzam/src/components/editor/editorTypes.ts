/**
 * Type definitions for the advanced PDF Editor.
 * Objects live on a single page; pages are rendered as canvases by pdfjs,
 * and objects are rendered as an SVG overlay positioned above the canvas.
 */

export type EditorTool =
  | "select"
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "image"
  | "signature";

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export interface BaseEditorObject {
  id: string;
  kind: "text" | ShapeKind | "image";
  /** 1-indexed page number */
  page: number;
  /** Top-left X in PDF coordinates (PDF units, origin = bottom-left) */
  x: number;
  /** Top-left Y in PDF coordinates (PDF units, origin = bottom-left) */
  y: number;
  /** Width in PDF units */
  width: number;
  /** Height in PDF units */
  height: number;
  /** Rotation in degrees (0/90/180/270) */
  rotation: number;
  /** Opacity 0..1 */
  opacity: number;
  /** Layer name (for the layers panel) */
  name: string;
  /** Layer visibility */
  visible: boolean;
  /** Layer lock */
  locked: boolean;
  /** Z-index within page */
  zIndex: number;
}

export interface TextEditorObject extends BaseEditorObject {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number; // 300 | 400 | 500 | 600 | 700 | 800 | 900
  color: string;
  bgColor: string;
  useBg: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  strokeColor: string;
  useStroke: boolean;
  /** Optional subtle shadow for legibility over busy backgrounds */
  useShadow: boolean;
}

export interface ShapeEditorObject extends BaseEditorObject {
  kind: ShapeKind;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  useFill: boolean;
}

export interface ImageEditorObject extends BaseEditorObject {
  kind: "image";
  /** PNG bytes (already in PNG format — what pdf-lib embeds) */
  pngBase64: string;
}

export type EditorObject = TextEditorObject | ShapeEditorObject | ImageEditorObject;

export interface EditorState {
  objects: EditorObject[];
  selectedId: string | null;
  tool: EditorTool;
  zoom: number;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  gridSize: number;
  clipboard: EditorObject | null;
}

export const DEFAULT_TEXT_PROPS: Omit<TextEditorObject, "id" | "page" | "x" | "y" | "width" | "height" | "rotation" | "opacity" | "name" | "visible" | "locked" | "zIndex" | "kind"> = {
  text: "نص جديد",
  fontFamily: "Cairo",
  fontSize: 20,
  fontWeight: 700, // bold by default for strong Arabic readability over PDF text
  color: "#1a73e8",
  bgColor: "#ffffff",
  useBg: false,
  bold: true,
  italic: false,
  underline: false,
  align: "right",
  strokeColor: "#000000",
  useStroke: false,
  useShadow: true, // subtle shadow improves legibility on busy backgrounds
};

export const FONT_WEIGHTS: Array<{ value: number; label: string }> = [
  { value: 300, label: "خفيف (300)" },
  { value: 400, label: "عادي (400)" },
  { value: 500, label: "متوسط (500)" },
  { value: 600, label: "شبه عريض (600)" },
  { value: 700, label: "عريض (700)" },
  { value: 800, label: "عريض جداً (800)" },
  { value: 900, label: "أسود (900)" },
];

export const DEFAULT_SHAPE_PROPS: Omit<ShapeEditorObject, "id" | "page" | "x" | "y" | "width" | "height" | "rotation" | "opacity" | "name" | "visible" | "locked" | "zIndex" | "kind"> = {
  strokeColor: "#1a73e8",
  strokeWidth: 2,
  fillColor: "#3b82f6",
  useFill: false,
};
