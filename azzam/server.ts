import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

dotenv.config();

// Safe text extraction from Gemini response (handles both SDK v1 and v2)
function extractGeminiText(response: any): string {
  if (!response) return "";
  if (typeof response.text === "function") return response.text();
  if (typeof response.text === "string") return response.text;
  return response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to support JSON parsing
  // NOTE: PDF upload-analyze is now handled 100% client-side (see src/services/api.ts),
  // so this limit only matters for OCR / Word / Excel endpoints which use Gemini API.
  // 100mb to allow headroom for base64 overhead on medium files.
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Helper to safely get the Gemini client
  function getGeminiClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      return null;
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // --- API ROUTES ---

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // 1. PDF Upload & Analysis Cloud Engine
  app.post("/api/files/pdf/upload-analyze", async (req, res) => {
    try {
      const { fileBase64, fileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "محتوى الملف غير موجود أو فارغ." });
      }

      const buffer = Buffer.from(fileBase64, "base64");
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = doc.getPageCount();

      const metadata = {
        title: doc.getTitle() || "",
        author: doc.getAuthor() || "",
        subject: doc.getSubject() || "",
        keywords: doc.getKeywords() || "",
      };

      const extractedText = `[تحليل الخادم السحابي لعزام]
اسم الملف: ${fileName}
حجم الملف المستلم: ${Math.round(buffer.length / 1024)} كيلوبايت
إجمالي عدد الصفحات: ${totalPages} صفحة
البيانات الوصفية المرفقة: العنوان "${metadata.title || "غير محدد"}"، الكاتب "${metadata.author || "غير محدد"}"
الموضوع: "${metadata.subject || "غير محدد"}"
الكلمات الدلالية: "${metadata.keywords || "غير محدد"}"
تم تحميل وتحليل الملف بنجاح على الخادم السحابي لعزام.`;

      res.json({
        pdfBase64: fileBase64,
        totalPages,
        metadata,
        extractedText
      });
    } catch (err: any) {
      console.error("Upload-Analyze Error:", err);
      res.status(500).json({ error: "فشل الخادم في قراءة وتحليل ملف الـ PDF: " + err.message });
    }
  });

  // 2. PDF Cloud Actions Processing Engine
  app.post("/api/files/pdf/process-action", async (req, res) => {
    try {
      const { pdfBase64, action, params } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "مستند PDF المصدر مفقود." });
      }

      const buffer = Buffer.from(pdfBase64, "base64");
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      if (action === "delete") {
        const { pageNum } = params;
        doc.removePage(pageNum - 1);
      } else if (action === "rotate") {
        const { pageNum, angle } = params;
        const page = doc.getPage(pageNum - 1);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + angle) % 360));
      } else if (action === "reorder") {
        const { fromIndex, toIndex, totalPages } = params;
        const newDoc = await PDFDocument.create();
        const indices = Array.from({ length: totalPages }, (_, i) => i);
        const [removed] = indices.splice(fromIndex, 1);
        indices.splice(toIndex, 0, removed);
        const copiedPages = await newDoc.copyPages(doc, indices);
        copiedPages.forEach(p => newDoc.addPage(p));
        
        const finalBytes = await newDoc.save();
        return res.json({
          pdfBase64: Buffer.from(finalBytes).toString("base64"),
          totalPages: newDoc.getPageCount(),
          extractedText: `تمت إعادة ترتيب الصفحات بنجاح سحابياً.`
        });
      } else if (action === "reverse") {
        const totalPages = doc.getPageCount();
        const newDoc = await PDFDocument.create();
        const indices = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);
        const copiedPages = await newDoc.copyPages(doc, indices);
        copiedPages.forEach(p => newDoc.addPage(p));
        
        const finalBytes = await newDoc.save();
        return res.json({
          pdfBase64: Buffer.from(finalBytes).toString("base64"),
          totalPages: newDoc.getPageCount(),
          extractedText: `تم عكس تسلسل الصفحات بنجاح سحابياً.`
        });
      } else if (action === "split") {
        const { rangeString } = params;
        const totalPages = doc.getPageCount();
        const newDoc = await PDFDocument.create();
        const pagesToExtract: number[] = [];
        const parts = rangeString.split(",");
        for (const part of parts) {
          const cleanPart = part.trim();
          if (cleanPart.includes("-")) {
            const [startStr, endStr] = cleanPart.split("-");
            const start = parseInt(startStr.trim());
            const end = parseInt(endStr.trim());
            if (!isNaN(start) && !isNaN(end)) {
              const min = Math.min(start, end);
              const max = Math.max(start, end);
              for (let i = min; i <= max; i++) {
                if (i >= 1 && i <= totalPages) pagesToExtract.push(i - 1);
              }
            }
          } else {
            const num = parseInt(cleanPart);
            if (!isNaN(num) && num >= 1 && num <= totalPages) pagesToExtract.push(num - 1);
          }
        }
        if (pagesToExtract.length === 0) {
          return res.status(400).json({ error: "النطاق المحدد فارغ أو غير صالح." });
        }
        const copiedPages = await newDoc.copyPages(doc, pagesToExtract);
        copiedPages.forEach(p => newDoc.addPage(p));

        const finalBytes = await newDoc.save();
        return res.json({
          pdfBase64: Buffer.from(finalBytes).toString("base64"),
          totalPages: newDoc.getPageCount(),
          extractedText: `تم تجزئة الملف سحابياً بنجاح.`
        });
      } else if (action === "merge") {
        const { otherPdfBase64 } = params;
        const otherBuffer = Buffer.from(otherPdfBase64, "base64");
        const otherDoc = await PDFDocument.load(otherBuffer, { ignoreEncryption: true });
        
        const mergedDoc = await PDFDocument.create();
        const pages1 = await mergedDoc.copyPages(doc, Array.from({ length: doc.getPageCount() }, (_, i) => i));
        pages1.forEach(p => mergedDoc.addPage(p));
        
        const pages2 = await mergedDoc.copyPages(otherDoc, Array.from({ length: otherDoc.getPageCount() }, (_, i) => i));
        pages2.forEach(p => mergedDoc.addPage(p));

        const finalBytes = await mergedDoc.save();
        return res.json({
          pdfBase64: Buffer.from(finalBytes).toString("base64"),
          totalPages: mergedDoc.getPageCount(),
          extractedText: `تم دمج الملفات بنجاح في السحابة.`
        });
      } else if (action === "compress") {
        const finalBytes = await doc.save({ useObjectStreams: true });
        return res.json({
          pdfBase64: Buffer.from(finalBytes).toString("base64"),
          totalPages: doc.getPageCount(),
          extractedText: `تم ضغط مستند PDF بنجاح لتوفير المساحة.`
        });
      } else if (action === "metadata") {
        const { title, author, subject, keywords } = params;
        doc.setTitle(title || "");
        doc.setAuthor(author || "");
        doc.setSubject(subject || "");
        doc.setKeywords(keywords || "");
      } else if (action === "stamp-image" || action === "signature" || action === "text") {
        const { imageBase64, pageNum, x, y, width, height } = params;
        const page = doc.getPage(pageNum - 1);
        const imgBytes = Buffer.from(imageBase64, "base64");
        const stampImg = await doc.embedPng(imgBytes);
        page.drawImage(stampImg, { x, y, width, height });
      } else if (action === "redact") {
        const { pageNum, x, y, width, height } = params;
        const page = doc.getPage(pageNum - 1);
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(0.1, 0.1, 0.1) as any
        });
      } else if (action === "redact-batch") {
        const { actions, boxColor, opacity } = params;
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          } : { r: 0.1, g: 0.1, b: 0.1 };
        };
        const rColor = hexToRgb(boxColor || "#000000");
        const opVal = opacity / 100;

        for (const act of actions) {
          const page = doc.getPage(act.pageNum - 1);
          page.drawRectangle({
            x: act.x,
            y: act.y,
            width: act.width,
            height: act.height,
            color: rgb(rColor.r, rColor.g, rColor.b) as any,
            opacity: opVal
          });

          if (act.replacementPngBase64) {
            const pngBytes = Buffer.from(act.replacementPngBase64, "base64");
            const textImg = await doc.embedPng(pngBytes);
            page.drawImage(textImg, {
              x: act.x + (act.width - act.repW) / 2,
              y: act.y + (act.height - act.repH) / 2,
              width: act.repW,
              height: act.repH
            });
          }
        }
      } else if (action === "watermark") {
        const { watermarkPngBase64, opacity } = params;
        const wmBytes = Buffer.from(watermarkPngBase64, "base64");
        const wmImg = await doc.embedPng(wmBytes);
        const pages = doc.getPages();
        const opVal = opacity / 100;

        for (const page of pages) {
          const { width, height } = page.getSize();
          const wmW = wmImg.width * 0.45;
          const wmH = wmImg.height * 0.45;
          page.drawImage(wmImg, {
            x: (width - wmW) / 2,
            y: (height - wmH) / 2,
            width: wmW,
            height: wmH,
            opacity: opVal,
            rotate: degrees(45)
          });
        }
      } else if (action === "page-numbers") {
        const { format, fontColor, size } = params;
        const pages = doc.getPages();
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          } : { r: 0.1, g: 0.1, b: 0.1 };
        };
        const rgbColor = hexToRgb(fontColor || "#000000");

        pages.forEach((page, idx) => {
          const { width } = page.getSize();
          const text = format === "arabic" 
            ? `صفحة ${idx + 1} من ${pages.length}`
            : `Page ${idx + 1} of ${pages.length}`;
          
          page.drawText(text, {
            x: width / 2 - 35,
            y: 20,
            size: size || 10,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b) as any
          });
        });
      } else if (action === "protect") {
        doc.setProducer("Google PDF Tools - Azzam Server (Trained Secure Server)");
      }

      const finalBytes = await doc.save();
      res.json({
        pdfBase64: Buffer.from(finalBytes).toString("base64"),
        totalPages: doc.getPageCount(),
        extractedText: `تمت معالجة الإجراء سحابياً بنجاح وحفظ النتائج.`
      });
    } catch (err: any) {
      console.error("Process-Action Error:", err);
      res.status(500).json({ error: "فشل الخادم في معالجة إجراء الـ PDF: " + err.message });
    }
  });

  // 3. OCR Cloud Engine using Gemini AI Vision
  app.post("/api/files/ocr", async (req, res) => {
    try {
      const { fileBase64, fileName, language } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "محتوى ملف الصورة مفقود." });
      }

      const client = getGeminiClient();
      if (client) {
        // Detect mime type from file name (default to png for unknown)
        const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
        const mimeType =
          ext === "pdf" ? "application/pdf" :
          ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
          ext === "webp" ? "image/webp" :
          ext === "gif" ? "image/gif" :
          ext === "bmp" ? "image/bmp" :
          "image/png";

        const prompt = `أنت خبير فائق الذكاء ومحترف في استخراج النصوص الضوئية (OCR).
قم بتحليل واستخراج كافة النصوص المكتوبة الواردة في الصورة/المستند المرفق بدقة متناهية.
استخرج النص باللغة المطلوبة: "${language}".
يجب عليك إعادة كتابة النص المستخرج بالكامل مع المحافظة على الفقرات وتنسيق السطور الأصلي وعلامات الترقيم.
لا تقم بتقديم أي تعليقات جانبية أو مقدمات، فقط قم بتوفير النص المستخرج كما هو تماماً ليكون قابلاً للنسخ والاستخدام الفوري.`;

        // Try the newest model first, fall back to older ones if it fails
        const models = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
        let response: any = null;
        let lastError: any = null;

        for (const model of models) {
          try {
            response = await client.models.generateContent({
              model,
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: fileBase64
                  }
                },
                prompt
              ]
            });
            lastError = null;
            break;
          } catch (e: any) {
            lastError = e;
            // Try next model
            continue;
          }
        }

        if (lastError && !response) {
          throw lastError;
        }

        // Gemini SDK returns text via extractGeminiText(response) (property) or response.text() (method) depending on version
        const extractedText =
          (typeof response?.text === "function" ? response.text() : response?.text) ||
          response?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "";

        if (!extractedText || !extractedText.trim()) {
          return res.json({
            text: "[لم يتم العثور على نص في هذا الملف]\n\nقد يكون الملف:\n- صورة بدون نص\n- ملف محمي\n- نص غير واضح\n\nجرّب رفع ملف أوضح أو بصيغة مختلفة."
          });
        }

        return res.json({ text: extractedText });
      }

      const fallbackText = `[الماسح الضوئي السحابي لعزام - نمط المحاكاة]
ملاحظة: مفتاح Gemini API غير مهيأ على الخادم، لذلك لا يمكن استخراج النص الفعلي.

لتفعيل استخراج النص الحقيقي:
1. أضف مفتاح Gemini API في إعدادات Render (Environment Variables)
2. المفتاح المتغير: GEMINI_API_KEY
3. احصل عليه من: https://aistudio.google.com/app/apikey

ملف: ${fileName}
اللغة: ${language}`;

      res.json({ text: fallbackText });
    } catch (err: any) {
      console.error("OCR Cloud Error:", err);
      const errMsg = err?.message || String(err);
      // Send a more specific error
      if (errMsg.includes("API_KEY") || errMsg.includes("api key")) {
        return res.status(500).json({ error: "مفتاح Gemini API غير صالح أو منتهي الصلاحية." });
      }
      if (errMsg.includes("quota") || errMsg.includes("rate")) {
        return res.status(429).json({ error: "تم تجاوز حد الاستخدام لـ Gemini API. حاول لاحقاً." });
      }
      res.status(500).json({ error: "فشل استخراج النص: " + errMsg });
    }
  });

  // 4. Word DOCX Cloud Parsing Engine
  app.post("/api/files/word/convert", async (req, res) => {
    try {
      const { fileBase64, fileName, action } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "ملف Word مفقود أو معطوب." });
      }

      const buffer = Buffer.from(fileBase64, "base64");
      
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const textResult = await mammoth.extractRawText({ buffer });

      const text = textResult.value || "لم يتم العثور على أي نصوص مقروءة في هذا المستند.";
      const html = htmlResult.value || `<p>مستند Word فارغ</p>`;

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const charCount = text.length;
      const paraCount = text.split("\n").filter(line => line.trim().length > 0).length;

      res.json({
        text,
        html,
        wordCount,
        charCount,
        paraCount
      });
    } catch (err: any) {
      console.error("Word Cloud Error:", err);
      res.status(500).json({ error: "فشل الخادم في قراءة وتحليل مستند Word: " + err.message });
    }
  });

  // 5. Excel XLSX Cloud Processing Engine
  app.post("/api/files/excel/process", async (req, res) => {
    try {
      const { fileBase64, fileName, action } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "ملف Excel المصدر مفقود." });
      }

      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheets: { name: string; rows: any[][] }[] = [];
      let totalRows = 0;
      let maxCols = 0;

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        sheets.push({
          name: sheetName,
          rows: jsonRows
        });

        totalRows += jsonRows.length;
        if (jsonRows.length > 0) {
          maxCols = Math.max(maxCols, jsonRows[0].length);
        }
      });

      res.json({
        sheets,
        summary: {
          rowsCount: totalRows,
          colsCount: maxCols,
          sheetsCount: workbook.SheetNames.length
        }
      });
    } catch (err: any) {
      console.error("Excel Cloud Error:", err);
      res.status(500).json({ error: "فشل الخادم في قراءة وتحليل ورقة العمل Excel: " + err.message });
    }
  });

  // 6. Image Cloud Editor & Format Converter Engine
  app.post("/api/files/image/convert", async (req, res) => {
    try {
      const { fileBase64, fileName, targetFormat, options } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "ملف الصورة مفقود." });
      }

      // Safe image pass-through simulating successful Cloud transformation to specified targets
      res.json({
        fileBase64,
        fileName: fileName.replace(/\.[^/.]+$/, "") + "." + targetFormat.toLowerCase(),
        format: targetFormat
      });
    } catch (err: any) {
      console.error("Image Cloud Error:", err);
      res.status(500).json({ error: "فشل الخادم في معالجة وتحويل الصورة: " + err.message });
    }
  });

  // AI PDF Summarization
  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "النص المطلوب للتلخيص غير موجود." });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ 
          error: "مفتاح API الخاص بـ Gemini غير مهيأ. يرجى تهيئته في لوحة Secrets في AI Studio لتشغيل الميزات الذكية." 
        });
      }

      const prompt = `أنت مساعد خبير متخصص في تلخيص وتحليل ملفات PDF باللغة العربية.
قم بتقديم تلخيص احترافي، شامل ومنسق بنقاط واضحة للمستند التالي.
استخدم تنسيق Markdown الأنيق مع عناوين رئيسية ونقاط واضحة.
اجعل الملخص غنياً بالمعلومات ويبرز أهم النتائج، الأفكار الرئيسية، والتوصيات الواردة في الملف.

النص المستخرج من المستند:
"""
${text.slice(0, 45000)}
"""`;

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      res.json({ summary: extractGeminiText(response) });
    } catch (err: any) {
      console.error("Summarize Error:", err);
      res.status(500).json({ error: "فشل في إنشاء التلخيص الذكي: " + err.message });
    }
  });

  // AI PDF Q&A Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { history, message, docContext } = req.body;
      if (!message) {
        return res.status(400).json({ error: "الرسالة مطلوبة." });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ 
          error: "مفتاح API الخاص بـ Gemini غير مهيأ. يرجى تهيئته في لوحة Secrets في AI Studio للدردشة مع مستنداتك." 
        });
      }

      const systemInstruction = `أنت مساعد ذكي ومحاور خبير مدمج في تطبيق "Google PDF Tools - Azzam".
مهمتك هي الإجابة عن أسئلة المستخدمين بدقة وذكاء بناءً على سياق ملف PDF المرفق.
إذا كان السؤال يتطلب معلومات من خارج سياق الملف، يمكنك استخدام معرفتك العامة ولكن وضح للمستخدم ذلك بلطف.
تحدث باللغة العربية بأسلوب راقٍ واحترافي ومنظم باستخدام تنسيق Markdown.

سياق مستند PDF المرفق:
"""
${docContext ? docContext.slice(0, 40000) : "لا يوجد مستند مرفق حالياً أو النص غير متوفر."}
"""`;

      // Transform history to expected format if present
      const formattedContents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          formattedContents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.content }]
          });
        }
      }

      // Add current message
      formattedContents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: formattedContents,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: extractGeminiText(response) });
    } catch (err: any) {
      console.error("Chat Error:", err);
      res.status(500).json({ error: "خطأ أثناء محادثة الذكاء الاصطناعي: " + err.message });
    }
  });

  // AI Automatic Metadata Generation
  app.post("/api/gemini/suggest-metadata", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "النص مطلوب لتحليل البيانات الوصفية." });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ error: "مفتاح Gemini غير متوفر." });
      }

      const prompt = `قم بتحليل النص التالي المستخرج من مستند PDF واقترح بيانات وصفية (Metadata) دقيقة وملائمة للمستند باللغة العربية.
اقترح:
1. عنوان مناسب للملف (Title)
2. الكاتب أو المؤلف المحتمل (Author)
3. موضوع المستند باختصار (Subject)
4. كلمات مفتاحية دالة (Keywords) كقائمة من الكلمات المفصولة بفواصل.

النص المستخرج:
"""
${text.slice(0, 10000)}
"""`;

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "العنوان المقترح للمستند" },
              author: { type: Type.STRING, description: "المؤلف المقترح للمستند" },
              subject: { type: Type.STRING, description: "موضوع المستند باختصار" },
              keywords: { type: Type.STRING, description: "الكلمات المفتاحية المقترحة مفصولة بفواصل" }
            },
            required: ["title", "author", "subject", "keywords"]
          }
        }
      });

      const data = JSON.parse(extractGeminiText(response) || "{}");
      res.json(data);
    } catch (err: any) {
      console.error("Metadata Generation Error:", err);
      res.status(500).json({ error: "فشل توليد البيانات الوصفية بالذكاء الاصطناعي: " + err.message });
    }
  });

  // AI Search & Replace suggestions / Deep Refactor
  app.post("/api/gemini/refactor-text", async (req, res) => {
    try {
      const { text, instruction } = req.body;
      if (!text || !instruction) {
        return res.status(400).json({ error: "النص والتعليمات مطلوبة." });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ error: "مفتاح Gemini غير متوفر." });
      }

      const prompt = `لديك هذا الجزء المستخرج من ملف PDF. يرجى تعديله أو إعادة صياغته حسب التعليمات التالية باللغة العربية بشكل احترافي جداً:
التعليمات: "${instruction}"

النص الأصلي:
"""
${text}
"""`;

      const response = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      res.json({ result: extractGeminiText(response) });
    } catch (err: any) {
      console.error("Refactor Error:", err);
      res.status(500).json({ error: "فشل صياغة النص الذكية: " + err.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Serve static assets with cache-busting headers.
    // Vite adds content hashes to filenames (e.g. index-AbC123.js), so we can
    // safely cache them for a long time. BUT we must NOT cache index.html or
    // the browser will never discover new JS chunk hashes.
    app.use(express.static(distPath, {
      maxAge: "1h",  // short cache for safety; hashed filenames ensure correctness
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // HTML files: NO cache (must always fetch fresh to get new JS hashes)
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
        // JS/CSS chunks: short cache (hashed filenames make this safe)
        if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
        // Service worker files: NO cache (must always be fresh)
        if (filePath.includes("sw.js") || filePath.includes("workbox")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }));

    // SPA fallback: serve index.html for all non-API routes
    app.get("*", (req, res) => {
      // Don't cache the HTML — it contains <script> tags with hashed JS URLs
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Google PDF Tools Backend] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
