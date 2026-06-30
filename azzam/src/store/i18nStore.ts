import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Locale = "ar" | "en";

/**
 * Flat translation dictionary. Keys are dot-notation strings.
 * Lookup falls back to English if Arabic is missing, then to the key itself.
 */
export const translations: Record<Locale, Record<string, string>> = {
  ar: {
    // Brand
    "brand.name": "عـزَّام برو",
    "brand.tagline": "Azzam Pro v3.0",
    "brand.subtitle": "All-in-One Toolbox",
    "brand.hero.title": "عـزَّام برو",
    "brand.hero.subtitle": "Azzam Pro — All-in-One Toolbox",
    "brand.hero.desc": "منصة احترافية متكاملة: PDF · Word · Excel · صور · تطوير · تشفير · حساب · وقت — بأمان تام داخل متصفحك بدون رفع أي ملف.",

    // Badges
    "badge.version": "الإصدار 3.0 — وحش الأدوات",
    "badge.new": "جديد",
    "badge.pro": "PRO",
    "badge.local": "معالجة محلية 100%",
    "badge.local.desc": "ملفاتك لا تغادر متصفحك",
    "badge.advanced": "متقدم",
    "badge.core": "CORE",
    "badge.most_used": "الأكثر استخداماً",

    // Search
    "search.placeholder": "ابحث في 21 أداة... (مثال: PDF, Hash, Base64, BMI)",
    "search.command_palette": "بحث سريع...",
    "search.filter": "تصفية الأدوات...",
    "search.no_results": "لا توجد نتائج مطابقة",
    "search.global": "بحث وأوامر (Ctrl+K)",

    // Stats
    "stat.tools": "أداة متخصصة",
    "stat.workspaces": "مساحة عمل",
    "stat.local": "معالجة محلية",
    "stat.formats": "صيغة مدعومة",

    // Sections
    "section.main_tools": "الأدوات الرئيسية",
    "section.pro_tools": "الأدوات الاحترافية",
    "section.specialized": "أدوات متخصصة",
    "section.recent": "النشاط الأخير",
    "section.view_all": "عرض الكل →",
    "section.documents": "أدوات المستندات",
    "section.media": "الوسائط والذكاء",
    "section.system": "النظام",
    "section.advanced": "أدوات احترافية",
    "section.home": "الرئيسية",

    // Upload
    "upload.drag": "اسحب أي ملف للتحليل الفوري",
    "upload.drop": "أفلت الملف هنا ✨",
    "upload.button": "اختر ملفاً من جهازك",
    "upload.hint": "PDF · Word · Excel · PNG · JPG · WebP · TIFF وأكثر",
    "upload.privacy": "معالجة محلية — ملفاتك لا تغادر متصفحك أبداً",

    // Workspaces (labels)
    "ws.home": "لوحة التحكم",
    "ws.pdf": "PDF Expert",
    "ws.word": "أدوات Word",
    "ws.excel": "Excel Studio",
    "ws.image": "استوديو الصور",
    "ws.ocr": "استخراج النص",
    "ws.scanner": "الماسح الضوئي",
    "ws.compare": "مقارنة المستندات",
    "ws.qr-tools": "QR / Barcode",
    "ws.dev-tools": "أدوات المطور",
    "ws.text-tools": "أدوات النصوص",
    "ws.converters": "محوّلات",
    "ws.crypto": "تشفير وكلمات سر",
    "ws.time-tools": "وقت وتاريخ",
    "ws.calc-tools": "حاسبات",
    "ws.code-tools": "محرر الأكواد",
    "ws.media-tools": "أدوات صوت/فيديو",
    "ws.charts": "مخططات بيانية",
    "ws.history": "السجل",
    "ws.settings": "الإعدادات",
    "ws.help": "المساعدة",

    // Workspace descriptions (for sidebar groups & command palette)
    "ws.home.desc": "لوحة الترحيب والإحصائيات",
    "ws.pdf.desc": "تعديل، تنظيم، دمج، ضغط، محرر متقدم",
    "ws.word.desc": "قراءة وتصدير ملفات Word",
    "ws.excel.desc": "تصفح وتصدير الجداول",
    "ws.image.desc": "تحويل وضغط ودمج الصور",
    "ws.ocr.desc": "من صورة أو PDF ممسوح",
    "ws.scanner.desc": "كاميرا + فلاتر ذكية",
    "ws.compare.desc": "مقارنة PDF أو صور",
    "ws.qr-tools.desc": "توليد وقراءة الرموز",
    "ws.dev-tools.desc": "JSON · Base64 · Hash · JWT · Regex · Color",
    "ws.text-tools.desc": "عدّاد · حالة · لوريم · فرز · تكرار · بحث",
    "ws.converters.desc": "وحدات · ألوان · أرقام · رومانية",
    "ws.crypto.desc": "توليد · AES · فحص قوة · توكنز",
    "ws.time-tools.desc": "فارق · عمر · عدّاد · ساعة عالمية",
    "ws.calc-tools.desc": "علمي · BMI · نسب · قرض · إكرامية",
    "ws.code-tools.desc": "محرر متعدد اللغات · تنفيذ · تنسيق",
    "ws.media-tools.desc": "تسجيل · تحويل · قص · استخراج صوت",
    "ws.charts.desc": "Flowchart · Mindmap · Sequence · Gantt",
    "ws.history.desc": "كل ما قمت به",
    "ws.settings.desc": "ثيم، اختصارات، أداء، لغة",
    "ws.help.desc": "أسئلة شائعة ودليل",

    // Footer banner on home
    "banner.ready": "جاهز للمنافسة عالمياً",
    "banner.ready.desc": "منصة شاملة تنافس iLovePDF و SmallPDF و Adobe — بأمان كامل",

    // Common UI
    "common.copy": "نسخ",
    "common.copied": "✓ تم النسخ",
    "common.clear": "مسح",
    "common.generate": "توليد",
    "common.download": "تنزيل",
    "common.upload": "رفع",
    "common.run": "تشغيل",
    "common.format": "تنسيق",
    "common.input": "الإدخال",
    "common.output": "الإخراج",
    "common.result": "النتيجة",
    "common.loading": "تحميل...",
    "common.close": "إغلاق",
    "common.add": "إضافة",
    "common.delete": "حذف",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",

    // Settings
    "settings.title": "الإعدادات العامة",
    "settings.subtitle": "خصص تجربتك في عـزَّام",
    "settings.theme": "الثيم والمظهر (6 خيارات)",
    "settings.performance": "الأداء والمعالجة",
    "settings.privacy": "الخصوصية والأمان",
    "settings.shortcuts": "اختصارات لوحة المفاتيح",
    "settings.language": "اللغة (Language)",
    "settings.reset": "إعادة ضبط الإعدادات",
    "settings.gpu": "تسريع GPU",
    "settings.gpu.desc": "رندرة الصور ومعاينة الملفات على المعالج الرسومي.",
    "settings.autosave": "الحفظ التلقائي",
    "settings.autosave.desc": "حفظ آخر الملفات محلياً لتفادي ضياع الجهد.",
    "settings.grid": "إظهار الشبكة في المحرر",
    "settings.grid.desc": "شبكة خفيفة في خلفية محرر PDF.",
    "settings.guides": "أدلة المحاذاة",
    "settings.guides.desc": "خطوط محاذاة ذكية عند تحريك العناصر.",
    "settings.snap_grid": "الالتقاط للشبكة",
    "settings.snap_grid.desc": "التقاط العناصر تلقائياً لخطوط الشبكة.",
    "settings.snap_objects": "الالتقاط للعناصر",
    "settings.snap_objects.desc": "محاذاة العناصر تلقائياً مع بعضها.",

    // Topbar
    "topbar.home": "الرئيسية",
    "topbar.theme": "الثيم الحالي",
    "topbar.theme.toggle": "اضغط للتبديل",

    // Sidebar collapse
    "sidebar.expand": "توسيع",
    "sidebar.collapse": "طي",
  },

  en: {
    // Brand
    "brand.name": "Azzam Pro",
    "brand.tagline": "Azzam Pro v3.0",
    "brand.subtitle": "All-in-One Toolbox",
    "brand.hero.title": "Azzam Pro",
    "brand.hero.subtitle": "Azzam Pro — All-in-One Toolbox",
    "brand.hero.desc": "A complete professional platform: PDF · Word · Excel · Images · Dev · Crypto · Calc · Time — fully secure inside your browser, no file uploads.",

    // Badges
    "badge.version": "Version 3.0 — Monster App",
    "badge.new": "NEW",
    "badge.pro": "PRO",
    "badge.local": "100% Local Processing",
    "badge.local.desc": "Your files never leave your browser",
    "badge.advanced": "Advanced",
    "badge.core": "CORE",
    "badge.most_used": "Most Used",

    // Search
    "search.placeholder": "Search 21 tools... (e.g. PDF, Hash, Base64, BMI)",
    "search.command_palette": "Quick search...",
    "search.filter": "Filter tools...",
    "search.no_results": "No matching results",
    "search.global": "Search & commands (Ctrl+K)",

    // Stats
    "stat.tools": "Specialized Tools",
    "stat.workspaces": "Workspaces",
    "stat.local": "Local Processing",
    "stat.formats": "Supported Formats",

    // Sections
    "section.main_tools": "Main Tools",
    "section.pro_tools": "Professional Tools",
    "section.specialized": "Specialized Tools",
    "section.recent": "Recent Activity",
    "section.view_all": "View all →",
    "section.documents": "Document Tools",
    "section.media": "Media & Intelligence",
    "section.system": "System",
    "section.advanced": "Professional Tools",
    "section.home": "Home",

    // Upload
    "upload.drag": "Drag any file to analyze instantly",
    "upload.drop": "Drop file here ✨",
    "upload.button": "Choose a file from your device",
    "upload.hint": "PDF · Word · Excel · PNG · JPG · WebP · TIFF and more",
    "upload.privacy": "Local processing — your files never leave your browser",

    // Workspaces
    "ws.home": "Dashboard",
    "ws.pdf": "PDF Expert",
    "ws.word": "Word Tools",
    "ws.excel": "Excel Studio",
    "ws.image": "Image Studio",
    "ws.ocr": "Text Extract (OCR)",
    "ws.scanner": "Document Scanner",
    "ws.compare": "Compare Documents",
    "ws.qr-tools": "QR / Barcode",
    "ws.dev-tools": "Developer Tools",
    "ws.text-tools": "Text Tools",
    "ws.converters": "Converters",
    "ws.crypto": "Crypto & Passwords",
    "ws.time-tools": "Time & Date",
    "ws.calc-tools": "Calculators",
    "ws.code-tools": "Code Editor",
    "ws.media-tools": "Audio / Video Tools",
    "ws.charts": "Charts & Diagrams",
    "ws.history": "History",
    "ws.settings": "Settings",
    "ws.help": "Help",

    "ws.home.desc": "Welcome dashboard with stats",
    "ws.pdf.desc": "Edit, organize, merge, compress, advanced editor",
    "ws.word.desc": "Read and export Word files",
    "ws.excel.desc": "Browse and export spreadsheets",
    "ws.image.desc": "Convert, compress, merge images",
    "ws.ocr.desc": "From image or scanned PDF",
    "ws.scanner.desc": "Camera + smart filters",
    "ws.compare.desc": "Compare PDF or images",
    "ws.qr-tools.desc": "Generate and read codes",
    "ws.dev-tools.desc": "JSON · Base64 · Hash · JWT · Regex · Color",
    "ws.text-tools.desc": "Counter · case · lorem · sort · dedupe · find",
    "ws.converters.desc": "Units · colors · numbers · roman",
    "ws.crypto.desc": "Generate · AES · strength · tokens",
    "ws.time-tools.desc": "Diff · age · countdown · world clock",
    "ws.calc-tools.desc": "Scientific · BMI · percent · loan · tip",
    "ws.code-tools.desc": "Multi-language editor · run · format",
    "ws.media-tools.desc": "Record · convert · trim · extract audio",
    "ws.charts.desc": "Flowchart · Mindmap · Sequence · Gantt",
    "ws.history.desc": "Everything you've done",
    "ws.settings.desc": "Theme, shortcuts, performance, language",
    "ws.help.desc": "FAQs and guide",

    // Footer banner on home
    "banner.ready": "Ready to compete globally",
    "banner.ready.desc": "A complete platform competing with iLovePDF, SmallPDF, Adobe — fully secure",

    // Common UI
    "common.copy": "Copy",
    "common.copied": "✓ Copied",
    "common.clear": "Clear",
    "common.generate": "Generate",
    "common.download": "Download",
    "common.upload": "Upload",
    "common.run": "Run",
    "common.format": "Format",
    "common.input": "Input",
    "common.output": "Output",
    "common.result": "Result",
    "common.loading": "Loading...",
    "common.close": "Close",
    "common.add": "Add",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",

    // Settings
    "settings.title": "General Settings",
    "settings.subtitle": "Customize your Azzam experience",
    "settings.theme": "Theme & Appearance (6 options)",
    "settings.performance": "Performance & Processing",
    "settings.privacy": "Privacy & Security",
    "settings.shortcuts": "Keyboard Shortcuts",
    "settings.language": "Language (اللغة)",
    "settings.reset": "Reset Settings",
    "settings.gpu": "GPU Acceleration",
    "settings.gpu.desc": "Render images and preview files on the GPU.",
    "settings.autosave": "Auto Save",
    "settings.autosave.desc": "Save recent files locally to avoid losing work.",
    "settings.grid": "Show grid in editor",
    "settings.grid.desc": "Light grid in the PDF editor background.",
    "settings.guides": "Alignment Guides",
    "settings.guides.desc": "Smart alignment lines when moving elements.",
    "settings.snap_grid": "Snap to Grid",
    "settings.snap_grid.desc": "Automatically snap elements to grid lines.",
    "settings.snap_objects": "Snap to Objects",
    "settings.snap_objects.desc": "Automatically align elements with each other.",

    // Topbar
    "topbar.home": "Home",
    "topbar.theme": "Current theme",
    "topbar.theme.toggle": "Click to switch",

    // Sidebar collapse
    "sidebar.expand": "Expand",
    "sidebar.collapse": "Collapse",
  },
};

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  /** Returns translated string. Falls back to en, then key. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: "ar",
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === "ar" ? "en" : "ar" }),
      t: (key, params) => {
        const { locale } = get();
        let str = translations[locale]?.[key] ?? translations.en?.[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return str;
      },
    }),
    {
      name: "azzam-locale",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
