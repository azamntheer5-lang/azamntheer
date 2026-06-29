import React from "react";
import { ExcelTools } from "../components/ExcelTools";

export const ExcelWorkspace: React.FC = () => (
  <main className="flex-1 overflow-y-auto safe-scrollbar p-6 bg-transparent">
    <div className="max-w-7xl mx-auto">
      <ExcelTools />
    </div>
  </main>
);
