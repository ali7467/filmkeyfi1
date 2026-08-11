import { useState } from 'react';
import { Smartphone, Apple } from 'lucide-react';
import DownloadGuide from '@/components/DownloadGuide';

export default function DownloadButtons({ variant = 'light' }) {
  const [showGuide, setShowGuide] = useState(null); // 'android' | 'ios' | null

  const isLight = variant === 'light';
  const subText = isLight ? 'text-white/70' : 'text-muted-foreground';
  const cardBg = isLight ? 'bg-white/5 border-white/10' : 'bg-card border-border';

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowGuide('android')}
          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.02] ${cardBg}`}
        >
          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold ${isLight ? 'text-white' : 'text-foreground'}`}>Android İndir</p>
            <p className={`text-xs ${subText}`}>Telefona kurulum rehberi</p>
          </div>
        </button>

        <button
          onClick={() => setShowGuide('ios')}
          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.02] ${cardBg}`}
        >
          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
            <Apple className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold ${isLight ? 'text-white' : 'text-foreground'}`}>iPhone İndir</p>
            <p className={`text-xs ${subText}`}>Telefona kurulum rehberi</p>
          </div>
        </button>
      </div>

      {showGuide && (
        <DownloadGuide platform={showGuide} variant={variant} onClose={() => setShowGuide(null)} />
      )}
    </>
  );
}