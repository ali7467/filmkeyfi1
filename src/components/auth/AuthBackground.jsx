import React from "react";

export default function AuthBackground({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0a0a] px-4 py-10 overflow-hidden">
      {/* Arka plan: erkek karakter + film posterleri */}
      <img
        src="https://media.base44.com/images/public/6a77d66e4da6de214628ee62/a38a234ce_generated_image.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none select-none"
      />
      {/* Karartma katmanı */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/80 to-[#0a0a0a]/95 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0a_90%)] pointer-events-none" />

      {/* İçerik */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}