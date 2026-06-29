/**
 * DOM/Canvas-related helpers.
 * Browser-only — do not import in workers.
 */
import { hexToRgb } from "./utils";

/**
 * Render arbitrary text (incl. Arabic) to a transparent PNG data URL using an
 * off-screen canvas. This bypasses pdf-lib's WinAnsiEncoding crash when writing
 * non-ASCII glyphs.
 */
export interface DrawTextOptions {
  text: string;
  fontSize: number;
  colorHex: string;
  fontFamily?: string;
  useBg?: boolean;
  bgColorHex?: string;
  useStroke?: boolean;
  strokeColorHex?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "right" | "left" | "center";
  renderScale?: number;
  padding?: number;
}

export function drawTextAsPng(opts: DrawTextOptions): string | null {
  const {
    text,
    fontSize,
    colorHex,
    fontFamily = "Cairo",
    useBg = false,
    bgColorHex = "#ffffff",
    useStroke = false,
    strokeColorHex = "#000000",
    bold = false,
    italic = false,
    align = "center",
    renderScale = 2.8,
    padding = 24,
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scaledSize = fontSize * renderScale;
  const fontParts: string[] = [];
  if (italic) fontParts.push("italic");
  if (bold) fontParts.push("bold");
  fontParts.push(`${scaledSize}px`);
  fontParts.push(`"${fontFamily}", "Cairo", "Tajawal", sans-serif`);
  const fontStr = fontParts.join(" ");

  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = scaledSize * 1.5;

  canvas.width = Math.ceil(textWidth + padding * renderScale);
  canvas.height = Math.ceil(textHeight + 10 * renderScale);

  if (useBg) {
    ctx.fillStyle = bgColorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (useStroke && strokeColorHex) {
    ctx.strokeStyle = strokeColorHex;
    ctx.lineWidth = 1.8 * renderScale;
    ctx.strokeRect(
      0.9 * renderScale,
      0.9 * renderScale,
      canvas.width - 1.8 * renderScale,
      canvas.height - 1.8 * renderScale
    );
  }

  ctx.font = fontStr;
  ctx.fillStyle = colorHex;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  const x =
    align === "right" ? canvas.width - (padding * renderScale) / 2 : align === "left" ? (padding * renderScale) / 2 : canvas.width / 2;
  ctx.fillText(text, x, canvas.height / 2);

  return canvas.toDataURL("image/png");
}

export interface PdfRgb {
  r: number;
  g: number;
  b: number;
}

export function hexToPdfRgb(hex: string): PdfRgb {
  return hexToRgb(hex);
}

/** Resize a canvas to match given image at given scale. Returns ctx. */
export function prepCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

/** Decode an image element from a data URL or blob URL. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Apply brightness/contrast to ImageData in-place. */
export function applyBrightnessContrast(data: Uint8ClampedArray, brightness: number, contrast: number): void {
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(cFactor * (data[i] - 128) + 128 + brightness);
    data[i + 1] = clamp255(cFactor * (data[i + 1] - 128) + 128 + brightness);
    data[i + 2] = clamp255(cFactor * (data[i + 2] - 128) + 128 + brightness);
  }
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v));
}

/** Determine whether a file is a PDF based on name or type. */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Determine whether a file is an image. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/** Determine whether a file is a Word document. */
export function isWordFile(file: File): boolean {
  return file.type.includes("wordprocessing") || /\.docx?$/i.test(file.name);
}

/** Determine whether a file is an Excel/CSV file. */
export function isExcelFile(file: File): boolean {
  return file.type.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(file.name);
}
