import React from "react";

export default function AuthBackground({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0a0a] px-4 py-10 overflow-hidden">
      {/* Arka plan: erkek karakter + film posterleri */}
      <img
        src="https://media.base44.com/images/public/6a77d66e4da6de214628ee62/a38a234ce_generated_image.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      {/* Karartma katmanı — görseli belirgin bırak, sadece alt kısımı karart */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/50 to-[#0a0a0a]/85 pointer-events-none" />

      {/* İçerik */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}