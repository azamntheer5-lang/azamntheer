import React, { useState, useEffect } from "react";
import { Lock, Unlock, FileText, Check, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";

interface SecurityMetaProps {
  initialMeta: { title: string; author: string; subject: string; keywords: string };
  onApplyMetadata: (meta: { title: string; author: string; subject: string; keywords: string }) => Promise<void>;
  onApplyPassword: (pass: string) => Promise<void>;
  onRemovePassword: () => Promise<void>;
  isLocked: boolean;
  isProcessing: boolean;
}

export const SecurityMeta: React.FC<SecurityMetaProps> = ({
  initialMeta,
  onApplyMetadata,
  onApplyPassword,
  onRemovePassword,
  isLocked,
  isProcessing
}) => {
  // Metadata state
  const [title, setTitle] = useState(initialMeta.title);
  const [author, setAuthor] = useState(initialMeta.author);
  const [subject, setSubject] = useState(initialMeta.subject);
  const [keywords, setKeywords] = useState(initialMeta.keywords);

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync state if parent values update (e.g. from AI)
  useEffect(() => {
    setTitle(initialMeta.title);
    setAuthor(initialMeta.author);
    setSubject(initialMeta.subject);
    setKeywords(initialMeta.keywords);
  }, [initialMeta]);

  const triggerSaveMeta = async () => {
    await onApplyMetadata({ title, author, subject, keywords });
  };

  const triggerLock = async () => {
    if (!password) {
      alert("⚠️ يرجى إدخال كلمة المرور المطلوبة للتشفير!");
      return;
    }
    if (password !== confirmPassword) {
      alert("❌ كلمتا المرور غير متطابقتين!");
      return;
    }
    await onApplyPassword(password);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
      
      {/* 1. METADATA EDITOR PANEL */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-google-blue">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">بيانات وخصائص الملف</h3>
              <p className="text-[10px] text-gray-400 font-semibold">تضمين تفاصيل المستند الوصفية لظهورها في برامج التصفح.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-450 font-bold block mb-1">عنوان الملف (Title):</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="عنوان المستند الرئيسي"
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-450 font-bold block mb-1">الكاتب أو المؤلف (Author):</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="اسم الكاتب أو الجهة المنشئة"
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-450 font-bold block mb-1">الموضوع (Subject):</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="موضوع الملف باختصار"
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-450 font-bold block mb-1">الكلمات المفتاحية (Keywords - افصل بينها بفاصلة):</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="مثال: تقرير، ميزانية، 2026"
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
              />
            </div>
          </div>
        </div>

        <button
          onClick={triggerSaveMeta}
          disabled={isProcessing}
          className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer"
        >
          {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span>حفظ خصائص البيانات وتعديلها</span>
        </button>
      </div>

      {/* 2. SECURITY & PASSWORD LOCK PANEL */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-google-red">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">حماية وتشفير المستند</h3>
              <p className="text-[10px] text-gray-400 font-semibold">إغلاق وتشفير الملف بكلمة مرور تمنع الوصول غير المصرح به.</p>
            </div>
          </div>

          {/* Locked / Unlocked visual meter */}
          <div className="flex items-center justify-center py-4 bg-gray-50 rounded-xl border border-gray-150 gap-3">
            <div className={`h-11 w-11 rounded-full flex items-center justify-center text-lg shadow-sm ${
              isLocked ? "bg-red-100 text-google-red animate-pulse" : "bg-green-100 text-google-green"
            }`}>
              {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800">
                {isLocked ? "مؤمن ومقفل بكلمة مرور" : "مفتوح وغير مشفر حالياً"}
              </span>
              <span className="text-[9px] text-gray-400 font-semibold">
                {isLocked ? "احفظ الملف لتأكيد التشفير" : "يدعم تشفير مالك المستند الآمن"}
              </span>
            </div>
          </div>

          {!isLocked ? (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-[10px] text-gray-450 font-bold block mb-1">أدخل كلمة المرور للتشفير:</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة سر قوية..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-450 font-bold block mb-1">تأكيد كلمة المرور:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة السر للتأكيد"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-semibold flex items-start gap-1.5 leading-relaxed animate-fade-in">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5 text-google-red" />
              <span>
                ملاحظة: لقد قمت بإقفال وتأمين المستند. لإلغاء القفل وإرجاعه حراً، اضغط على زر "إزالة كلمة المرور وفك الحماية" بالأدنى.
              </span>
            </div>
          )}
        </div>

        {!isLocked ? (
          <button
            onClick={triggerLock}
            disabled={isProcessing || !password}
            className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-google-red hover:bg-red-600 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/10 transition-all disabled:opacity-40 cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            <span>تأمين المستند بكلمة المرور</span>
          </button>
        ) : (
          <button
            onClick={onRemovePassword}
            disabled={isProcessing}
            className="w-full mt-6 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 py-2.5 text-xs font-bold text-gray-700 shadow-3xs transition-all cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            <span>إزالة كلمة المرور وفك الحماية</span>
          </button>
        )}
      </div>

    </div>
  );
};
