import React from "react";

interface TabBarProps {
  tabs: Array<{ id: string; label: string; icon?: React.ComponentType<{ className?: string }>; badge?: string }>;
  active: string;
  onChange: (id: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl glass-card overflow-x-auto safe-scrollbar mb-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tab-button flex items-center gap-1.5 ${isActive ? "active" : ""}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface ToolHeaderProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description, icon: Icon, color }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`h-11 w-11 rounded-xl ${color} border border-white/10 flex items-center justify-center`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h2 className="text-lg font-black text-slate-100">{title}</h2>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  </div>
);

interface CopyButtonProps {
  text: string;
  label?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label = "نسخ" }) => {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      className={`btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
        copied ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-slate-300"
      }`}
    >
      {copied ? "✓ تم النسخ" : label}
    </button>
  );
};
