import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar, Clock, Heart, Timer, Globe, Play, Pause, RotateCcw, Copy,
} from "lucide-react";
import { TabBar, ToolHeader } from "../components/ui/SharedUI";

type TabId = "diff" | "age" | "countdown" | "stopwatch" | "worldclock";

const TABS = [
  { id: "diff",        label: "فارق التواريخ", icon: Calendar },
  { id: "age",         label: "حاسبة العمر",   icon: Heart },
  { id: "countdown",   label: "عدّاد تنازلي",  icon: Timer },
  { id: "stopwatch",   label: "ساعة إيقاف",    icon: Clock },
  { id: "worldclock",  label: "ساعة عالمية",   icon: Globe },
];

export const TimeToolsWorkspace: React.FC = () => {
  const [active, setActive] = useState<TabId>("diff");

  return (
    <div className="flex-1 overflow-y-auto safe-scrollbar p-6">
      <ToolHeader
        title="وقت وتاريخ"
        description="فارق تواريخ · عمر · عدّاد · ساعة إيقاف · ساعة عالمية"
        icon={Calendar}
        color="bg-teal-500/10 text-teal-400"
      />
      <TabBar tabs={TABS} active={active} onChange={(id) => setActive(id as TabId)} />

      {active === "diff"       && <DateDiff />}
      {active === "age"        && <AgeCalculator />}
      {active === "countdown"  && <Countdown />}
      {active === "stopwatch"  && <Stopwatch />}
      {active === "worldclock" && <WorldClock />}
    </div>
  );
};

/* ─────────────────────────────────── Date Difference ────────── */

const DateDiff: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const diff = useMemo(() => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

    const ms = d2.getTime() - d1.getTime();
    const absMs = Math.abs(ms);
    const sign = ms < 0 ? "سابقاً" : "لاحقاً";

    const seconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);
    const weeks   = Math.floor(days / 7);
    const months  = Math.floor(days / 30.4375);
    const years   = (days / 365.25).toFixed(2);

    // Business days
    let businessDays = 0;
    const start = new Date(Math.min(d1.getTime(), d2.getTime()));
    const end   = new Date(Math.max(d1.getTime(), d2.getTime()));
    const cur   = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 5 && day !== 6) businessDays++; // Friday & Saturday weekend in Arab world
      cur.setDate(cur.getDate() + 1);
    }
    businessDays -= 1; // exclusive of end

    return {
      ms: absMs,
      seconds, minutes, hours, days, weeks, months, years,
      businessDays,
      sign,
    };
  }, [from, to]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">من تاريخ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field w-full !text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-400 mb-1 block">إلى تاريخ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field w-full !text-sm" />
        </div>
      </div>

      {diff && (
        <>
          <div className="glass-card rounded-xl p-4 border border-teal-500/20 text-center">
            <p className="text-xs text-slate-500 mb-1">الفرق</p>
            <p className="text-3xl font-black gradient-text-cool">{diff.days.toLocaleString()} يوم</p>
            <p className="text-xs text-slate-500 mt-1">({diff.sign})</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "سنوات",     value: diff.years,        color: "text-blue-400" },
              { label: "أشهر",       value: diff.months,       color: "text-violet-400" },
              { label: "أسابيع",     value: diff.weeks,        color: "text-emerald-400" },
              { label: "أيام عمل",   value: diff.businessDays, color: "text-amber-400" },
              { label: "ساعات",      value: diff.hours,        color: "text-pink-400" },
              { label: "دقائق",      value: diff.minutes,      color: "text-rose-400" },
              { label: "ثواني",      value: diff.seconds,      color: "text-cyan-400" },
              { label: "ملي ثانية",   value: diff.ms,           color: "text-teal-400" },
            ].map(s => (
              <div key={s.label} className="stat-card text-center">
                <p className={`text-lg font-black ${s.color}`}>{typeof s.value === "string" ? s.value : s.value.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Age Calculator ────────── */

const AgeCalculator: React.FC = () => {
  const [birthdate, setBirthdate] = useState("2000-01-01");

  const age = useMemo(() => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const totalMonths = years * 12 + months;
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;

    // Next birthday
    const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
    const daysToBirthday = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return { years, months, days, totalDays, totalMonths, totalWeeks, totalHours, daysToBirthday };
  }, [birthdate]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">تاريخ الميلاد</label>
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="input-field w-full md:w-1/2 !text-sm" />
      </div>

      {age && (
        <>
          <div className="glass-card rounded-xl p-5 border border-pink-500/20 text-center">
            <p className="text-xs text-slate-500 mb-1">عمرك الحالي</p>
            <div className="flex items-center justify-center gap-3">
              <div>
                <span className="text-4xl font-black gradient-text-warm">{age.years}</span>
                <span className="text-xs text-slate-400 mr-1">سنة</span>
              </div>
              <div>
                <span className="text-3xl font-black text-pink-400">{age.months}</span>
                <span className="text-xs text-slate-400 mr-1">شهر</span>
              </div>
              <div>
                <span className="text-3xl font-black text-rose-400">{age.days}</span>
                <span className="text-xs text-slate-400 mr-1">يوم</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="stat-card text-center">
              <p className="text-lg font-black text-blue-400">{age.totalMonths.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">إجمالي الأشهر</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-lg font-black text-emerald-400">{age.totalWeeks.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">إجمالي الأسابيع</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-lg font-black text-amber-400">{age.totalDays.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">إجمالي الأيام</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-lg font-black text-violet-400">{age.totalHours.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">إجمالي الساعات</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-amber-500/20 text-center">
            <p className="text-xs text-slate-500">🎉 عيد ميلادك القادم بعد</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{age.daysToBirthday} يوم</p>
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Countdown ────────── */

const Countdown: React.FC = () => {
  const [target, setTarget] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    const t = new Date(target).getTime();
    if (isNaN(t)) return null;
    const diff = t - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }, [target, now]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-slate-400 mb-1 block">التاريخ والوقت المستهدف</label>
        <input
          type="datetime-local"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input-field w-full md:w-1/2 !text-sm"
        />
      </div>

      {remaining && (
        <>
          {remaining.expired ? (
            <div className="glass-card rounded-xl p-8 border border-rose-500/20 text-center">
              <p className="text-4xl mb-2">⏰</p>
              <p className="text-xl font-black text-rose-400">انتهى الوقت!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "أيام",    value: remaining.days,    color: "text-blue-400",    border: "border-blue-500/20" },
                { label: "ساعات",    value: remaining.hours,   color: "text-violet-400",  border: "border-violet-500/20" },
                { label: "دقائق",    value: remaining.minutes, color: "text-emerald-400", border: "border-emerald-500/20" },
                { label: "ثواني",    value: remaining.seconds, color: "text-amber-400",  border: "border-amber-500/20" },
              ].map(s => (
                <div key={s.label} className={`glass-card rounded-2xl p-6 border ${s.border} text-center`}>
                  <p className={`text-5xl font-black ${s.color} font-mono`}>
                    {String(s.value).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────── Stopwatch ────────── */

const Stopwatch: React.FC = () => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed;
      const tick = () => {
        setElapsed(Date.now() - startRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [running]);

  const format = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centis  = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-8 border border-white/[0.06] text-center">
        <p className="text-7xl font-black font-mono gradient-text-cool">{format(elapsed)}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setRunning(!running)}
          className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all ${
            running
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
              : "btn-primary text-white"
          }`}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "إيقاف مؤقت" : "ابدأ"}
        </button>
        <button
          onClick={() => { setLaps(l => [...l, elapsed]); }}
          disabled={!running}
          className="btn-secondary px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          <Copy className="h-4 w-4" /> لاب
        </button>
        <button
          onClick={() => { setElapsed(0); setLaps([]); setRunning(false); }}
          className="btn-secondary px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" /> تصفير
        </button>
      </div>

      {laps.length > 0 && (
        <div className="glass-card rounded-xl p-3 border border-white/[0.06]">
          <p className="text-xs font-bold text-slate-400 mb-2">اللفات ({laps.length})</p>
          <div className="space-y-1">
            {laps.map((lap, i) => {
              const prev = i > 0 ? laps[i - 1] : 0;
              const diff = lap - prev;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-slate-500 font-mono">#{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-xs text-slate-400 font-mono">+{format(diff)}</span>
                  <span className="text-sm text-emerald-400 font-mono">{format(lap)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────── World Clock ────────── */

const CITIES = [
  { city: "مكة المكرمة",     tz: "Asia/Riyadh",   flag: "🇸🇦" },
  { city: "القاهرة",         tz: "Africa/Cairo",  flag: "🇪🇬" },
  { city: "دبي",              tz: "Asia/Dubai",    flag: "🇦🇪" },
  { city: "بغداد",            tz: "Asia/Baghdad",  flag: "🇮🇶" },
  { city: "لندن",             tz: "Europe/London", flag: "🇬🇧" },
  { city: "باريس",            tz: "Europe/Paris",  flag: "🇫🇷" },
  { city: "نيويورك",          tz: "America/New_York", flag: "🇺🇸" },
  { city: "طوكيو",            tz: "Asia/Tokyo",    flag: "🇯🇵" },
  { city: "سيدني",            tz: "Australia/Sydney", flag: "🇦🇺" },
];

const WorldClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {CITIES.map(c => {
        const time = now.toLocaleTimeString("ar-EG", { timeZone: c.tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        const date = now.toLocaleDateString("ar-EG", { timeZone: c.tz, weekday: "short", day: "numeric", month: "short" });
        const hour = Number(now.toLocaleTimeString("en-US", { timeZone: c.tz, hour: "2-digit", hour12: false }));
        const isDay = hour >= 6 && hour < 18;
        return (
          <div key={c.city} className="glass-card rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="text-sm font-bold text-slate-100">{c.city}</p>
                  <p className="text-[10px] text-slate-500">{c.tz}</p>
                </div>
              </div>
              <span className="text-lg">{isDay ? "☀️" : "🌙"}</span>
            </div>
            <p className="text-3xl font-black font-mono gradient-text-cool" dir="ltr">{time}</p>
            <p className="text-xs text-slate-500 mt-1">{date}</p>
          </div>
        );
      })}
    </div>
  );
};
