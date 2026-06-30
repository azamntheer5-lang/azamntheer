import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Mic, Video, Music, Film, Play, Pause, Square, Download, Upload,
  Scissors, Volume2, RefreshCw, Trash2, FileAudio, FileVideo,
} from "lucide-react";
import { TabBar, ToolHeader } from "../components/ui/SharedUI";
import { useI18nStore } from "../store/i18nStore";

type TabId = "audio-record" | "audio-convert" | "video-record" | "video-trim" | "extract-audio";

const TABS = [
  { id: "audio-record", label: "تسجيل صوتي",        icon: Mic },
  { id: "audio-convert", label: "تحويل صوت",         icon: Music },
  { id: "video-record",  label: "تسجيل فيديو",       icon: Video },
  { id: "video-trim",    label: "قص فيديو",          icon: Scissors },
  { id: "extract-audio", label: "استخراج صوت",       icon: FileAudio },
];

export const MediaToolsWorkspace: React.FC = () => {
  const { t } = useI18nStore();
  const [active, setActive] = useState<TabId>("audio-record");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title={t("ws.media-tools")}
        description={t("ws.media-tools.desc")}
        icon={Film}
        color="bg-rose-500/10 text-rose-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "audio-record" && <AudioRecorder />}
      {active === "audio-convert" && <AudioConverter />}
      {active === "video-record" && <VideoRecorder />}
      {active === "video-trim" && <VideoTrimmer />}
      {active === "extract-audio" && <ExtractAudio />}
    </div>
  );
};

/* ─────────────────────────────────── Audio Recorder ────────── */

const AudioRecorder: React.FC = () => {
  const { t } = useI18nStore();
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setPaused(false);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e: any) {
      setError(e.message || "Failed to access microphone");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setPaused(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `azzam-recording-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {error && (
        <div className="glass-card rounded-xl p-3 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          ⚠ {error}
        </div>
      )}

      <div className="glass-card rounded-2xl p-8 border border-white/[0.06] text-center">
        <div className={`mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-4 transition-all ${
          recording
            ? paused ? "bg-amber-500/20 border-amber-500/40" : "bg-rose-500/20 border-rose-500/40 pulse-soft"
            : "bg-rose-500/10 border-rose-500/20"
        } border-2`}>
          <Mic className={`h-10 w-10 ${recording ? (paused ? "text-amber-400" : "text-rose-400") : "text-slate-400"}`} />
        </div>

        <p className="text-4xl font-black font-mono gradient-text-warm mb-2">{formatTime(elapsed)}</p>
        <p className="text-xs text-slate-500 mb-4">
          {recording ? (paused ? "⏸ متوقف مؤقتاً" : "● جاري التسجيل") : "جاهز للتسجيل"}
        </p>

        <div className="flex items-center justify-center gap-2">
          {!recording ? (
            <button onClick={startRecording} className="btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
              <Mic className="h-4 w-4" /> ابدأ التسجيل
            </button>
          ) : (
            <>
              {!paused ? (
                <button onClick={pauseRecording} className="btn-secondary px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
                  <Pause className="h-4 w-4" /> إيقاف مؤقت
                </button>
              ) : (
                <button onClick={resumeRecording} className="btn-primary px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
                  <Play className="h-4 w-4" /> استئناف
                </button>
              )}
              <button onClick={stopRecording} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-rose-500/30">
                <Square className="h-4 w-4" /> إيقاف
              </button>
            </>
          )}
        </div>
      </div>

      {audioUrl && (
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-3">
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <FileAudio className="h-4 w-4" /> التسجيل جاهز
          </p>
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex items-center gap-2">
            <button onClick={download} className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" /> تنزيل (WebM)
            </button>
            <button onClick={() => { setAudioUrl(null); setElapsed(0); }} className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Audio Converter ────────── */

const AudioConverter: React.FC = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState("audio");
  const [targetFormat, setTargetFormat] = useState<"mp3" | "wav" | "ogg">("wav");
  const [converting, setConverting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setResultUrl(null);
  };

  const convert = async () => {
    if (!audioBlob) return;
    setConverting(true);
    try {
      // Use Web Audio API to decode and re-encode
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // For WAV: use raw PCM
      if (targetFormat === "wav") {
        const wavBlob = audioBufferToWav(audioBuffer);
        setResultUrl(URL.createObjectURL(wavBlob));
      } else {
        // For ogg/mp3: MediaRecorder only supports webm/ogg in most browsers.
        // Create a stream from the buffer and record it.
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.start();

        const mimeType = targetFormat === "ogg" ? "audio/ogg" : "audio/webm";
        const mr = new MediaRecorder(dest.stream, { mimeType });
        const chunks: Blob[] = [];
        mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mr.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          setResultUrl(URL.createObjectURL(blob));
          setConverting(false);
        };
        mr.start();
        source.onended = () => mr.stop();
      }
    } catch (e: any) {
      setConverting(false);
      alert("فشل التحويل: " + e.message);
    }
  };

  // WAV encoder
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // RIFF header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // PCM data
    let offset = 44;
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="glass-card rounded-xl p-5 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">رفع ملف صوتي</label>
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
          <Upload className="h-8 w-8 text-slate-500 mb-2" />
          <span className="text-xs text-slate-400">{audioBlob ? `✓ ${audioBlob.name}` : "اختر ملفاً (MP3, WAV, OGG, M4A, WebM)"}</span>
          <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {audioUrl && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.06] space-y-3">
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold text-slate-400">الصيغة الهدف:</label>
            {(["wav", "mp3", "ogg"] as const).map(f => (
              <button
                key={f}
                onClick={() => setTargetFormat(f)}
                className={`tab-button ${targetFormat === f ? "active" : ""}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
            <button
              onClick={convert}
              disabled={converting}
              className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
            >
              {converting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {converting ? "جاري التحويل..." : "تحويل"}
            </button>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-3">
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <FileAudio className="h-4 w-4" /> النتيجة
          </p>
          <audio src={resultUrl} controls className="w-full" />
          <a
            href={resultUrl}
            download={`${fileName}.${targetFormat}`}
            className="btn-primary px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> تنزيل {targetFormat.toUpperCase()}
          </a>
        </div>
      )}

      <div className="glass-card rounded-xl p-3 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          💡 <strong>ملاحظة:</strong> تحويل WAV يعمل بدقة كاملة. تحويل MP3/OGG يعتمد على دعم المتصفح وقد يُنتج WebM في بعض المتصفحات.
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Video Recorder ────────── */

const VideoRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e: any) {
      setError(e.message || "Failed to access camera");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
    setRecording(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const download = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `azzam-video-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {error && (
        <div className="glass-card rounded-xl p-3 border border-rose-500/20 text-rose-400 text-xs">⚠ {error}</div>
      )}

      <div className="glass-card rounded-2xl p-4 border border-white/[0.06]">
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-3">
          {videoUrl && !recording ? (
            <video src={videoUrl} controls className="w-full h-full" />
          ) : (
            <video ref={videoRef} muted playsInline className="w-full h-full" />
          )}
          {recording && (
            <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1.5 pulse-soft">
              <span className="h-2 w-2 rounded-full bg-white" /> REC · {formatTime(elapsed)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          {!recording ? (
            <button onClick={startRecording} className="btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
              <Video className="h-4 w-4" /> ابدأ التسجيل
            </button>
          ) : (
            <button onClick={stopRecording} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-rose-500/30">
              <Square className="h-4 w-4" /> إيقاف
            </button>
          )}
          {videoUrl && !recording && (
            <>
              <button onClick={download} className="btn-secondary px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
                <Download className="h-4 w-4" /> تنزيل
              </button>
              <button onClick={() => { setVideoUrl(null); setElapsed(0); }} className="btn-secondary px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
                <Trash2 className="h-4 w-4" /> حذف
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          💡 <strong>ملاحظة:</strong> التسجيل بدقة 720p بصيغة WebM. يتطلب إذن الوصول للكاميرا والميكروفون.
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Video Trimmer ────────── */

const VideoTrimmer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setEnd(d);
      setStart(0);
    }
  };

  const trim = async () => {
    if (!videoBlob) return;
    setTrimming(true);
    try {
      // Use MediaRecorder to extract the trimmed segment
      const arrayBuffer = await videoBlob.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: videoBlob.type });
      const url = URL.createObjectURL(blob);
      const v = document.createElement("video");
      v.src = url;
      v.currentTime = start;
      await new Promise(r => v.onseeked = r);

      const stream = (v as any).captureStream ? (v as any).captureStream() : (v as any).mozCaptureStream?.();
      const mr = new MediaRecorder(stream, { mimeType: videoBlob.type });
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = () => {
        const resultBlob = new Blob(chunks, { type: videoBlob.type });
        setResultUrl(URL.createObjectURL(resultBlob));
        setTrimming(false);
      };

      v.play();
      mr.start();
      setTimeout(() => {
        v.pause();
        mr.stop();
      }, (end - start) * 1000);
    } catch (e: any) {
      setTrimming(false);
      alert("فشل القص: " + e.message);
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="glass-card rounded-xl p-5 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">رفع فيديو</label>
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
          <Upload className="h-6 w-6 text-slate-500 mb-1" />
          <span className="text-xs text-slate-400">{videoBlob ? `✓ ${videoBlob.name}` : "اختر ملف فيديو (WebM, MP4)"}</span>
          <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {videoUrl && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.06] space-y-3">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={onLoadedMetadata}
            controls
            className="w-full rounded-lg"
          />

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>البداية: <span className="text-emerald-400">{formatTime(start)}</span></span>
                <span>النهاية: <span className="text-rose-400">{formatTime(end)}</span></span>
              </div>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={start}
                onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.5))}
                className="w-full accent-emerald-500 mb-1"
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={end}
                onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.5))}
                className="w-full accent-rose-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                مدة المقطع: <span className="text-violet-400 font-bold">{formatTime(end - start)}</span>
              </p>
              <button
                onClick={trim}
                disabled={trimming}
                className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {trimming ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                {trimming ? "جاري القص..." : "قص المقطع"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-3">
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <FileVideo className="h-4 w-4" /> المقطع المقصوص
          </p>
          <video src={resultUrl} controls className="w-full rounded-lg" />
          <a
            href={resultUrl}
            download="azzam-trimmed.webm"
            className="btn-primary px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> تنزيل المقطع
          </a>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Extract Audio ────────── */

const ExtractAudio: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoBlob(file);
    setVideoUrl(URL.createObjectURL(file));
    setAudioUrl(null);
  };

  const extract = async () => {
    if (!videoBlob) return;
    setExtracting(true);
    try {
      const url = URL.createObjectURL(videoBlob);
      const v = document.createElement("video");
      v.src = url;
      v.crossOrigin = "anonymous";
      await new Promise(r => { v.onloadedmetadata = r; });

      const stream = (v as any).captureStream ? (v as any).captureStream() : (v as any).mozCaptureStream?.();
      // Get only audio tracks
      const audioStream = new MediaStream(stream.getAudioTracks());
      const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setExtracting(false);
      };

      v.play();
      mr.start();
      v.onended = () => mr.stop();
    } catch (e: any) {
      setExtracting(false);
      alert("فشل الاستخراج: " + e.message);
    }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `azzam-audio-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="glass-card rounded-xl p-5 border border-white/[0.06]">
        <label className="text-xs font-bold text-slate-400 mb-2 block">رفع فيديو لاستخراج الصوت</label>
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-rose-500/30 hover:bg-rose-500/5 transition-all">
          <FileAudio className="h-8 w-8 text-slate-500 mb-2" />
          <span className="text-xs text-slate-400">{videoBlob ? `✓ ${videoBlob.name}` : "اختر ملف فيديو"}</span>
          <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {videoUrl && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.06] space-y-3">
          <video src={videoUrl} controls className="w-full rounded-lg" />
          <button
            onClick={extract}
            disabled={extracting}
            className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {extracting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
            {extracting ? "جاري الاستخراج..." : "استخراج الصوت"}
          </button>
        </div>
      )}

      {audioUrl && (
        <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-3">
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Music className="h-4 w-4" /> الصوت المستخرج
          </p>
          <audio src={audioUrl} controls className="w-full" />
          <button onClick={download} className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> تنزيل الصوت
          </button>
        </div>
      )}
    </div>
  );
};
