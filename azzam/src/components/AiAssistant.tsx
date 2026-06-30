import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Send, RefreshCw, FileText, BrainCircuit,
  Check, Copy, AlertCircle, Bot, User,
} from "lucide-react";
import { ChatMessage } from "../types";
import { useToast } from "../context/ToastContext";

interface AiAssistantProps {
  pdfText: string;
  onApplyMetadata?: (meta: { title: string; author: string; subject: string; keywords: string }) => void;
  isProcessing: boolean;
}

type Tab = "chat" | "summary" | "meta";

const TAB_LABELS: Record<Tab, string> = {
  chat:    "المحادثة الذكية",
  summary: "تلخيص فوري",
  meta:    "بيانات ذكية",
};

const inputClass =
  "w-full text-xs font-semibold bg-white/[0.04]/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors";

export const AiAssistant: React.FC<AiAssistantProps> = ({
  pdfText, onApplyMetadata, isProcessing,
}) => {
  const [activeTab, setActiveTab]       = useState<Tab>("chat");
  const [chatInput, setChatInput]       = useState("");
  const [messages,  setMessages]        = useState<ChatMessage[]>([]);
  const [summary,   setSummary]         = useState("");
  const [suggestedMeta, setSuggestedMeta] = useState<{
    title: string; author: string; subject: string; keywords: string;
  } | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [error,     setError]           = useState<string | null>(null);
  const [copied,    setCopied]          = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "system",
        content: "مرحباً! أنا مساعد عـزَّام الذكي المدعوم بـ Google Gemini. اسألني عن محتوى المستند أو اطلب تلخيصه.",
        timestamp: new Date(),
      }]);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], pdfText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاتصال");
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "_ai",
        role: "assistant",
        content: data.reply || "",
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary || "");
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleSuggestMeta = async () => {
    setIsLoading(true); setError(null); setSuggestedMeta(null);
    try {
      const res = await fetch("/api/gemini/suggest-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestedMeta({
        title: data.title || "", author: data.author || "",
        subject: data.subject || "", keywords: data.keywords || "",
      });
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("تم النسخ");
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-2xl border border-white/[0.08] overflow-hidden select-text">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-l from-blue-500/5 to-indigo-500/5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" style={{ animation: "spinSlow 4s linear infinite" }} />
          </div>
          <div>
            <p className="text-xs font-black text-white">مساعد Google Gemini</p>
            <p className="text-[9px] text-blue-400 font-semibold">محيط بكافة تفاصيل المستند</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-slate-500 font-bold">نشط</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] bg-white/[0.04]/[0.02]">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === tab
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 safe-scrollbar min-h-0">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-rose-400">فشل الاتصال بالذكاء الاصطناعي</p>
              <p className="text-[10px] text-rose-300/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full min-h-0 gap-3">
            <div className="flex-1 overflow-y-auto space-y-3 safe-scrollbar min-h-0">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-blue-500"
                      : "bg-indigo-500/20 border border-indigo-500/30"
                  }`}>
                    {msg.role === "user"
                      ? <User className="h-3.5 w-3.5 text-white" />
                      : <Bot className="h-3.5 w-3.5 text-indigo-400" />
                    }
                  </div>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed font-medium ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : msg.role === "system"
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 rounded-tl-none"
                      : "glass-card border border-white/[0.08] text-slate-200 rounded-tl-none"
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span className="text-[9px] opacity-50 block mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="glass-card border border-white/[0.08] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 mt-auto border-t border-white/[0.06] pt-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اسألني عن المستند..."
                disabled={isLoading}
                className={inputClass + " flex-1"}
              />
              <button
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* Summary tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {!summary && !isLoading && (
              <div className="text-center py-10 space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <BrainCircuit className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white mb-1">ملخص تنفيذي ذكي</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                    سيقوم Gemini بقراءة الملف وتلخيص أهم النقاط في ثوانٍ.
                  </p>
                </div>
                <button onClick={handleSummarize} className="btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  ابدأ التلخيص
                </button>
              </div>
            )}
            {isLoading && !summary && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
                <p className="text-xs font-bold text-slate-400">جاري تحليل المستند...</p>
              </div>
            )}
            {summary && (
              <div className="glass-card rounded-xl border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[11px] font-black text-blue-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    الملخص الذكي
                  </span>
                  <button
                    onClick={() => handleCopy(summary)}
                    className="h-7 w-7 rounded-lg bg-white/[0.04]/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium">{summary}</p>
                <button onClick={handleSummarize} disabled={isLoading} className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer">
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                  تحديث الملخص
                </button>
              </div>
            )}
          </div>
        )}

        {/* Meta tab */}
        {activeTab === "meta" && (
          <div className="space-y-4">
            {!suggestedMeta && !isLoading && (
              <div className="text-center py-10 space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                  <Sparkles className="h-7 w-7 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white mb-1">اقتراح بيانات وصفية</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                    يحلل الذكاء الاصطناعي المستند ويقترح العنوان والمؤلف والكلمات المفتاحية.
                  </p>
                </div>
                <button onClick={handleSuggestMeta} className="btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  استخراج البيانات
                </button>
              </div>
            )}
            {isLoading && !suggestedMeta && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                <p className="text-xs font-bold text-slate-400">جاري تحليل البيانات الوصفية...</p>
              </div>
            )}
            {suggestedMeta && (
              <div className="glass-card rounded-xl border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    البيانات المقترحة
                  </span>
                  <button onClick={handleSuggestMeta} disabled={isLoading} className="text-slate-500 hover:text-blue-400 transition-colors cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  {[
                    { label: "العنوان", value: suggestedMeta.title },
                    { label: "المؤلف", value: suggestedMeta.author || "غير محدد" },
                    { label: "الموضوع", value: suggestedMeta.subject },
                    { label: "الكلمات المفتاحية", value: suggestedMeta.keywords },
                  ].map((f) => (
                    <div key={f.label}>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">{f.label}:</span>
                      <span className="block bg-white/[0.04]/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-slate-200 font-medium">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
                {onApplyMetadata && (
                  <button
                    onClick={() => { onApplyMetadata(suggestedMeta); toast.success("تم تطبيق البيانات الوصفية"); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-white text-xs font-bold cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    تطبيق على الملف
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
