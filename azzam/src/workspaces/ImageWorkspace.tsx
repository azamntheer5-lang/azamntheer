import React from "react";
import { ImageTools } from "../components/ImageTools";

export const ImageWorkspace: React.FC = () => (
  <main className="flex-1 overflow-y-auto safe-scrollbar p-6 bg-transparent">
    <div className="max-w-7xl mx-auto">
      <ImageTools />
    </div>
  </main>
);
