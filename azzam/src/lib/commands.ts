import type { WorkspaceId } from "../store/uiStore";

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  group: "navigate" | "pdf" | "tools" | "ai" | "settings";
  keywords?: string[];
  icon?: string;
  shortcut?: string[];
  action: () => void;
}

export interface CommandGroup {
  id: string;
  label: string;
  commands: Command[];
}

export function buildNavigationCommands(
  go: (id: WorkspaceId) => void,
  paletteClose: () => void
): Command[] {
  const nav: Array<{ id: WorkspaceId; title: string; subtitle: string; icon: string; keywords: string[] }> = [
    // Core
    { id: "home", title: "الرئيسية", subtitle: "لوحة الترحيب والإحصائيات", icon: "home", keywords: ["home", "dashboard"] },
    { id: "pdf", title: "PDF Expert", subtitle: "تعديل، تنظيم، دمج، ضغط، محرر متقدم", icon: "pdf", keywords: ["pdf", "edit"] },
    { id: "word", title: "أدوات Word", subtitle: "قراءة وتصدير ملفات Word", icon: "word", keywords: ["word", "docx"] },
    { id: "excel", title: "Excel Studio", subtitle: "تصفح وتصدير الجداول", icon: "excel", keywords: ["excel", "xlsx", "csv"] },
    { id: "image", title: "استوديو الصور", subtitle: "تحويل وضغط ودمج الصور", icon: "image", keywords: ["image", "convert"] },
    // Media
    { id: "ocr", title: "OCR — استخراج النص", subtitle: "من صورة أو PDF ممسوح", icon: "scan", keywords: ["ocr", "scan", "extract"] },
    { id: "scanner", title: "ماسح ضوئي", subtitle: "كاميرا + فلاتر ذكية", icon: "camera", keywords: ["scan", "camera"] },
    { id: "compare", title: "مقارنة المستندات", subtitle: "مقارنة PDF أو صور", icon: "compare", keywords: ["compare", "diff"] },
    { id: "qr-tools", title: "أدوات QR و Barcode", subtitle: "توليد وقراءة الرموز", icon: "qr", keywords: ["qr", "barcode"] },
    // Pro Tools (NEW)
    { id: "dev-tools", title: "أدوات المطور", subtitle: "JSON · Base64 · Hash · UUID · JWT · Regex · Color", icon: "code", keywords: ["json", "base64", "hash", "uuid", "jwt", "regex", "color", "developer"] },
    { id: "text-tools", title: "أدوات النصوص", subtitle: "عدّاد · حالة · لوريم · عكس · فرز · تكرار · بحث", icon: "text", keywords: ["text", "counter", "case", "lorem", "sort", "diff"] },
    { id: "converters", title: "محوّلات شاملة", subtitle: "وحدات · ألوان · أرقام · رومانية", icon: "convert", keywords: ["convert", "unit", "color", "number", "roman"] },
    { id: "crypto", title: "تشفير وكلمات سر", subtitle: "توليد · AES · فحص قوة · توكنز", icon: "lock", keywords: ["crypto", "password", "aes", "hash", "token"] },
    { id: "time-tools", title: "وقت وتاريخ", subtitle: "فارق · عمر · عدّاد · ساعة عالمية", icon: "time", keywords: ["time", "date", "age", "countdown", "stopwatch", "clock"] },
    { id: "calc-tools", title: "حاسبات متخصصة", subtitle: "علمية · BMI · نسب · قروض · إكرامية", icon: "calc", keywords: ["calc", "bmi", "percent", "loan", "tip", "scientific"] },
    // System
    { id: "history", title: "سجل العمليات", subtitle: "كل ما قمت به", icon: "history", keywords: ["history", "log"] },
    { id: "settings", title: "الإعدادات", subtitle: "ثيم، اختصارات، أداء", icon: "settings", keywords: ["settings", "config"] },
    { id: "help", title: "مركز المساعدة", subtitle: "أسئلة شائعة ودليل", icon: "help", keywords: ["help", "faq"] },
  ];

  return nav.map((n) => ({
    id: `nav-${n.id}`,
    title: n.title,
    subtitle: n.subtitle,
    group: "navigate" as const,
    keywords: n.keywords,
    icon: n.icon,
    action: () => {
      go(n.id);
      paletteClose();
    },
  }));
}

export function buildToolCommands(actions: {
  newPdf: () => void;
  openPdf: () => void;
  openScanner: () => void;
  openOcr: () => void;
  openCompare: () => void;
  openQr: () => void;
  openDevTools: () => void;
  openTextTools: () => void;
  openConverters: () => void;
  openCrypto: () => void;
  openTimeTools: () => void;
  openCalcTools: () => void;
  paletteClose: () => void;
}): Command[] {
  const wrap = (fn: () => void) => () => {
    fn();
    actions.paletteClose();
  };
  return [
    {
      id: "tool-new-pdf",
      title: "ملف PDF جديد",
      subtitle: "ابدأ مشروع PDF فارغ",
      group: "tools",
      icon: "file-plus",
      keywords: ["new", "blank", "create"],
      action: wrap(actions.newPdf),
    },
    {
      id: "tool-open-pdf",
      title: "فتح ملف PDF",
      subtitle: "اختر من جهازك",
      group: "tools",
      icon: "upload",
      keywords: ["open", "upload"],
      shortcut: ["Ctrl", "O"],
      action: wrap(actions.openPdf),
    },
    {
      id: "tool-scan",
      title: "تشغيل الماسح الضوئي",
      subtitle: "كاميرا أو رفع صورة",
      group: "tools",
      icon: "camera",
      keywords: ["scan", "camera"],
      action: wrap(actions.openScanner),
    },
    {
      id: "tool-ocr",
      title: "OCR — استخراج النص من صورة",
      subtitle: "يدعم العربية والإنجليزية",
      group: "tools",
      icon: "scan",
      keywords: ["ocr", "extract", "text"],
      action: wrap(actions.openOcr),
    },
    {
      id: "tool-compare",
      title: "مقارنة مستندين",
      subtitle: "PDF أو صور",
      group: "tools",
      icon: "compare",
      keywords: ["compare", "diff"],
      action: wrap(actions.openCompare),
    },
    {
      id: "tool-qr",
      title: "توليد QR أو Barcode",
      subtitle: "أنشئ رموزاً مخصصة",
      group: "tools",
      icon: "qr",
      keywords: ["qr", "barcode", "generate"],
      action: wrap(actions.openQr),
    },
    {
      id: "tool-dev",
      title: "أدوات المطور",
      subtitle: "JSON · Base64 · Hash · JWT · Regex",
      group: "tools",
      icon: "code",
      keywords: ["json", "base64", "hash", "jwt", "regex", "dev"],
      action: wrap(actions.openDevTools),
    },
    {
      id: "tool-text",
      title: "أدوات النصوص",
      subtitle: "عدّاد · حالة · لوريم · فرز",
      group: "tools",
      icon: "text",
      keywords: ["text", "counter", "case", "lorem"],
      action: wrap(actions.openTextTools),
    },
    {
      id: "tool-converters",
      title: "محوّلات شاملة",
      subtitle: "وحدات · ألوان · أرقام · رومانية",
      group: "tools",
      icon: "convert",
      keywords: ["convert", "unit", "color"],
      action: wrap(actions.openConverters),
    },
    {
      id: "tool-crypto",
      title: "تشفير وكلمات سر",
      subtitle: "توليد · AES · فحص قوة · توكنز",
      group: "tools",
      icon: "lock",
      keywords: ["crypto", "password", "aes"],
      action: wrap(actions.openCrypto),
    },
    {
      id: "tool-time",
      title: "وقت وتاريخ",
      subtitle: "فارق · عمر · عدّاد · ساعة",
      group: "tools",
      icon: "time",
      keywords: ["time", "date", "age", "clock"],
      action: wrap(actions.openTimeTools),
    },
    {
      id: "tool-calc",
      title: "حاسبات",
      subtitle: "علمية · BMI · نسب · قروض",
      group: "tools",
      icon: "calc",
      keywords: ["calc", "bmi", "percent", "loan"],
      action: wrap(actions.openCalcTools),
    },
  ];
}

export function buildSettingsCommands(actions: {
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  clearHistory: () => void;
  paletteClose: () => void;
}): Command[] {
  const wrap = (fn: () => void) => () => {
    fn();
    actions.paletteClose();
  };
  return [
    {
      id: "set-toggle-theme",
      title: "تبديل الثيم (داكن/فاتح/ألوان)",
      group: "settings",
      icon: "moon",
      keywords: ["theme", "dark", "light", "cyber", "ocean"],
      shortcut: ["Ctrl", "J"],
      action: wrap(actions.toggleTheme),
    },
    {
      id: "set-toggle-sidebar",
      title: "طي/توسيع الشريط الجانبي",
      group: "settings",
      icon: "sidebar",
      keywords: ["sidebar", "collapse"],
      shortcut: ["Ctrl", "B"],
      action: wrap(actions.toggleSidebar),
    },
    {
      id: "set-open-settings",
      title: "فتح الإعدادات",
      group: "settings",
      icon: "settings",
      keywords: ["settings"],
      action: wrap(actions.openSettings),
    },
    {
      id: "set-clear-history",
      title: "مسح سجل العمليات",
      group: "settings",
      icon: "trash",
      keywords: ["history", "clear", "delete"],
      action: wrap(actions.clearHistory),
    },
  ];
}
