import React from "react";
import { ExcelTools } from "../components/ExcelTools";

export const ExcelWorkspace: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto p-6 bg-transparent safe-scrollbar relative">
      <div className="glass-card p-6 rounded-2xl border border-white/10 max-w-7xl mx-auto">
        <ExcelTools />
      </div>
    </main>
  );
};
