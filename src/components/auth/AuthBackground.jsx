import React from "react";

export default function AuthBackground({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0a0a] px-4 py-10 overflow-hidden">
      {/* Arka plan: film posterleri grid */}
      <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-20 pointer-events-none select-none">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-zinc-800 to-zinc-900"
            style={{
              backgroundImage: `linear-gradient(135deg, hsl(${(i * 23) % 360} 30% 15%), hsl(${(i * 17) % 360} 40% 8%))`,
            }}
          />
        ))}
      </div>
      {/* Karartma katmanı */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/90 to-[#0a0a0a]/95 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0a_85%)] pointer-events-none" />

      {/* İçerik */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}