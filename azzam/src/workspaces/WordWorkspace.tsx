import React from "react";
import { WordTools } from "../components/WordTools";

export const WordWorkspace: React.FC = () => (
  <main className="flex-1 overflow-y-auto safe-scrollbar p-6 bg-transparent">
    <div className="max-w-7xl mx-auto">
      <WordTools />
    </div>
  </main>
);
