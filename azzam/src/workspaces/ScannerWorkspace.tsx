import React, { useState } from "react";
import { Scanner } from "../components/Scanner";
import { usePdfStore } from "../store/pdfStore";
import { useToast } from "../context/ToastContext";
import { PDFDocument } from "pdf-lib";

export const ScannerWorkspace: React.FC = () => {
  const doc = usePdfStore((s) => s.doc);
  const setDoc = usePdfStore((s) => s.setDoc);
  const updateDoc = usePdfStore((s) => s.updateDoc);
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageToPdf = async (
    imageBytes: Uint8Array,
    mimeType: string,
    action: "append" | "new"
  ) => {
    setIsProcessing(true);
    try {
      let pdfDoc: PDFDocument;
      if (action === "append" && doc) {
        pdfDoc = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      } else {
        pdfDoc = await PDFDocument.create();
      }

      let img;
      if (mimeType === "image/png") {
        img = await pdfDoc.embedPng(imageBytes);
      } else {
        img = await pdfDoc.embedJpg(imageBytes);
      }

      const { width: imgW, height: imgH } = img.scale(0.8);
      const page = pdfDoc.addPage([imgW, imgH]);
      page.drawImage(img, { x: 0, y: 0, width: imgW, height: imgH });

      const resultBytes = await pdfDoc.save();
      if (action === "append" && doc) {
        updateDoc({
          bytes: resultBytes,
          size: resultBytes.byteLength,
          totalPages: pdfDoc.getPageCount(),
        });
        toast.success("تم إضافة الصورة كصفحة جديدة!");
      } else {
        const name = `مسح_عزام_${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
        setDoc({
          bytes: resultBytes,
          name,
          size: resultBytes.byteLength,
          totalPages: pdfDoc.getPageCount(),
        });
        toast.success(`تم إنشاء ${name}!`);
      }
    } catch (err: any) {
      toast.error("فشلت المعالجة: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto safe-scrollbar p-6 relative" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <Scanner
          pdfBytes={doc?.bytes || null}
          onImageToPdf={handleImageToPdf}
          isProcessing={isProcessing}
        />
      </div>
    </main>
  );
};
