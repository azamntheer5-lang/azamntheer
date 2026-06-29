import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, RefreshCw, FileText, Languages, BrainCircuit, Check, Copy, AlertCircle, Bot, User, ArrowLeftRight } from "lucide-react";
import { ChatMessage } from "../types";

interface AiAssistantProps {
  pdfText: string;
  onApplyMetadata?: (meta: { title: string; author: string; subject: string; keywords: string }) => void;
  isProcessing: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  pdfText,
  onApplyMetadata,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "summary" | "meta">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Suggested metadata state
  const [suggestedMeta, setSuggestedMeta] = useState<{
    title: string;
    author: string;
    subject: string;
    keywords: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load welcome message on mount
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: "welcome",
          role: "system",
          content: "مرحباً بك! أنا مساعد Google Gemini الذكي الخاص بك. لقد قمت بتحليل محتوى هذا المستند. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تسألني عن أي جزء في الملف أو تطلب تلخيصاً له.",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Send Chat message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setErrorMsg(null);

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMsg,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setIsAiLoading(true);

    try {
      // Send chat request to backend
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: chatMessages.filter(m => m.id !== "welcome" && m.role !== "system"),
          message: userMsg,
          docContext: pdfText
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "حدث خطأ غير متوقع");

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.reply || "عذراً، لم أتمكن من صياغة إجابة.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل الاتصال بمساعد الذكاء الاصطناعي");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generate Document Summary
  const handleGenerateSummary = async () => {
    setIsAiLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فشل توليد التلخيص");

      setSummary(data.summary || "");
    } catch (err: any) {
      setErrorMsg(err.message || "فشل إنشاء الملخص الذكي");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generate Smart Metadata
  const handleSuggestMetadata = async () => {
    setIsAiLoading(true);
    setErrorMsg(null);
    setSuggestedMeta(null);
    try {
      const response = await fetch("/api/gemini/suggest-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فشل تحليل البيانات الوصفية");

      setSuggestedMeta({
        title: data.title || "",
        author: data.author || "",
        subject: data.subject || "",
        keywords: data.keywords || ""
      });
    } catch (err: any) {
      setErrorMsg(err.message || "فشل الحصول على اقتراحات البيانات الوصفية");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("تم نسخ النص إلى الحافظة! 📋");
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden select-text">
      {/* Assistant Title Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-blue-50 to-indigo-50 px-4 py-3.5 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-google-blue text-white shadow-sm">
            <Sparkles className="h-4.5 w-4.5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">مساعد Google Gemini</h3>
            <span className="text-[9px] text-google-blue font-medium tracking-wide">
              ذكي ومحيط بكافة تفاصيل المستند
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-google-green animate-pulse" />
          <span className="text-[10px] text-gray-400 font-bold uppercase">نشط</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-150 text-xs bg-gray-50 font-bold">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
            activeTab === "chat"
              ? "border-google-blue text-google-blue bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          الدردشة الذكية
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
            activeTab === "summary"
              ? "border-google-blue text-google-blue bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          التلخيص الفوري
        </button>
        <button
          onClick={() => setActiveTab("meta")}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
            activeTab === "meta"
              ? "border-google-blue text-google-blue bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          بيانات ذكية (Meta)
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 safe-scrollbar min-h-0 bg-gray-50/30">
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-150 rounded-xl animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-google-red" />
            <div className="flex flex-col">
              <span className="font-bold">فشل الاتصال بالذكاء الاصطناعي</span>
              <span className="mt-0.5">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* --- TAB 1: Q&A CHAT --- */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full justify-between gap-3 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 pb-2 safe-scrollbar">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 w-full ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      msg.role === "user"
                        ? "bg-google-blue text-white"
                        : msg.role === "system"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex flex-col max-w-[82%]">
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed border shadow-3xs ${
                        msg.role === "user"
                          ? "bg-google-blue text-white border-blue-600 rounded-tr-none"
                          : msg.role === "system"
                          ? "bg-indigo-50/70 text-indigo-900 border-indigo-100/80 rounded-tl-none font-medium"
                          : "bg-white text-gray-800 border-gray-150 rounded-tl-none"
                      }`}
                    >
                      {/* Very simple markdown parser for bolding & double newlines */}
                      <p className="whitespace-pre-line">
                        {msg.content}
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5 px-1 self-start">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat form */}
            <form onSubmit={handleSendMessage} className="flex gap-1.5 border border-gray-200 bg-white p-1.5 rounded-xl shadow-2xs">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="اسألني عن محتوى المستند أو اطلب تلخيصه..."
                disabled={isAiLoading}
                className="flex-1 bg-transparent px-2.5 text-xs outline-none text-gray-800"
              />
              <button
                type="submit"
                disabled={isAiLoading || !chatInput.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-google-blue hover:bg-blue-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* --- TAB 2: SMART SUMMARY --- */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {!summary && !isAiLoading && (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-google-blue border border-blue-150 mb-3">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1">توليد الملخص التنفيذي بالذكاء الاصطناعي</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mb-4">
                  سيقوم Google Gemini بقراءة الملف بالكامل وتلخيص أهم الأفكار والنقاط والمحاور في ثوانٍ معدودة.
                </p>
                <button
                  onClick={handleGenerateSummary}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 active:scale-98 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  ابدأ التلخيص الذكي
                </button>
              </div>
            )}

            {isAiLoading && !summary && (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <RefreshCw className="h-8 w-8 text-google-blue animate-spin" />
                <span className="text-xs font-bold text-gray-600">جاري قراءة وتحليل المستند بالذكاء الاصطناعي...</span>
                <span className="text-[10px] text-gray-400">تستغرق هذه العملية بضع ثوانٍ</span>
              </div>
            )}

            {summary && (
              <div className="bg-white border border-gray-150 rounded-xl p-4 space-y-3 relative shadow-2xs">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-google-blue flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    الملخص الذكي للملف
                  </span>
                  <button
                    onClick={() => copyToClipboard(summary)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                    title="نسخ الملخص الكامل"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line select-text font-medium text-justify">
                  {summary}
                </div>
                
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-google-blue"
                  >
                    <RefreshCw className={`h-3 w-3 ${isAiLoading ? "animate-spin" : ""}`} />
                    تحديث التلخيص
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: SMART METADATA --- */}
        {activeTab === "meta" && (
          <div className="space-y-4">
            {!suggestedMeta && !isAiLoading && (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-google-blue border border-blue-150 mb-3">
                  <FileText className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1">اقتراح البيانات الوصفية تلقائياً</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mb-4">
                  يقوم الذكاء الاصطناعي بتحليل مستند الـ PDF واستخراج واقتراح العنوان والمؤلف والموضوع والكلمات الدلالية الدقيقة لتضمينها في خصائص الملف.
                </p>
                <button
                  onClick={handleSuggestMetadata}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-google-blue hover:bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 active:scale-98 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  توليد البيانات ذكياً
                </button>
              </div>
            )}

            {isAiLoading && !suggestedMeta && (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <RefreshCw className="h-8 w-8 text-google-blue animate-spin" />
                <span className="text-xs font-bold text-gray-600">جاري قراءة الفهرس وتحليل خصائص المستند...</span>
              </div>
            )}

            {suggestedMeta && (
              <div className="space-y-3">
                <div className="bg-white border border-gray-150 rounded-xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-google-green flex items-center gap-1">
                      <Check className="h-4 w-4 text-google-green" />
                      البيانات المقترحة بالذكاء الاصطناعي
                    </span>
                    <button
                      onClick={handleSuggestMetadata}
                      className="text-gray-400 hover:text-google-blue transition-colors"
                      title="إعادة المحاولة"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">العنوان المقترح:</span>
                      <span className="bg-gray-50 border border-gray-100 rounded-lg p-2 block font-bold text-gray-800">{suggestedMeta.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">الكاتب/المؤلف المقترح:</span>
                      <span className="bg-gray-50 border border-gray-100 rounded-lg p-2 block font-bold text-gray-800">{suggestedMeta.author || "غير محدد في النص"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">الموضوع المقترح:</span>
                      <span className="bg-gray-50 border border-gray-100 rounded-lg p-2 block font-bold text-gray-800">{suggestedMeta.subject}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold mb-0.5">الكلمات المفتاحية:</span>
                      <span className="bg-gray-50 border border-gray-100 rounded-lg p-2 block font-medium text-gray-700">{suggestedMeta.keywords}</span>
                    </div>
                  </div>

                  {onApplyMetadata && (
                    <button
                      onClick={() => {
                        onApplyMetadata(suggestedMeta);
                        alert("✅ تم تطبيق البيانات المقترحة على إعدادات التصدير بنجاح! احفظ الملف لتضمينها بشكل دائم.");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-google-blue hover:bg-blue-600 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      تطبيق هذه البيانات على الملف
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
