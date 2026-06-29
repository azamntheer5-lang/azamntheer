import React, { useState, useEffect } from "react";
import { Lock, Unlock, FileText, Check, ShieldAlert, Sparkles, Eye, EyeOff } from "lucide-react";
import { useToast } from "../context/ToastContext";

interface SecurityMetaProps {
  initialMeta: { title: string; author: string; subject: string; keywords: string };
  onApplyMetadata: (meta: { title: string; author: string; subject: string; keywords: string }) => Promise<void>;
  onApplyPassword: (pass: string) => Promise<void>;
  onRemovePassword: () => Promise<void>;
  isLocked: boolean;
  isProcessing: boolean;
}

const inputClass =
  "w-full text-xs font-semibold bg-white/[0.04]/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors";

export const SecurityMeta: React.FC<SecurityMetaProps> = ({
  initialMeta,
  onApplyMetadata,
  onApplyPassword,
  onRemovePassword,
  isLocked,
  isProcessing,
}) => {
  const [title,    setTitle]    = useState(initialMeta.title);
  const [author,   setAuthor]   = useState(initialMeta.author);
  const [subject,  setSubject]  = useState(initialMeta.subject);
  const [keywords, setKeywords] = useState(initialMeta.keywords);
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const toast = useToast();

  useEffect(() => {
    setTitle(initialMeta.title);
    setAuthor(initialMeta.author);
    setSubject(initialMeta.subject);
    setKeywords(initialMeta.keywords);
  }, [initialMeta]);

  const handleSaveMeta = async () => {
    await onApplyMetadata({ title, author, subject, keywords });
  };

  const handleLock = async () => {
    if (!password) { toast.error("أدخل كلمة المرور أولاً"); return; }
    if (password !== confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    await onApplyPassword(password);
    setPassword("");
    setConfirm("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
      {/* Metadata panel */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2.5 pb-1">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">بيانات الملف الوصفية</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">تضمين بيانات تعريفية في المستند</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "عنوان الملف", value: title, setter: setTitle, placeholder: "عنوان المستند الرئيسي" },
            { label: "المؤلف", value: author, setter: setAuthor, placeholder: "اسم المؤلف" },
            { label: "الموضوع", value: subject, setter: setSubject, placeholder: "وصف قصير للمستند" },
            { label: "الكلمات المفتاحية", value: keywords, setter: setKeywords, placeholder: "كلمة1، كلمة2" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">{field.label}</label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveMeta}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-white text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          حفظ البيانات الوصفية
        </button>
      </div>

      {/* Password panel */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2.5 pb-1">
          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${
            isLocked
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-xs font-black text-white">
              {isLocked ? "الملف محمي بكلمة مرور" : "تأمين الملف بكلمة مرور"}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {isLocked ? "يمكنك إزالة الحماية" : "تشفير الملف بكلمة سر"}
            </p>
          </div>
        </div>

        {isLocked ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300 font-semibold">
                هذا الملف محمي بكلمة مرور. إزالة الحماية ستتطلب معرفتها مسبقاً.
              </p>
            </div>
            <button
              onClick={onRemovePassword}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold cursor-pointer hover:bg-rose-500/20 transition-all disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              إزالة حماية كلمة المرور
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية"
                  className={inputClass + " pl-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className={inputClass}
              />
            </div>
            {password && confirm && password !== confirm && (
              <p className="text-[10px] text-rose-400 font-semibold">كلمتا المرور غير متطابقتين</p>
            )}
            <button
              onClick={handleLock}
              disabled={isProcessing || !password || password !== confirm}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="h-4 w-4" />
              تأمين الملف
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
