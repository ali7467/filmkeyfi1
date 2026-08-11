import { useState } from 'react';
import { Smartphone, Apple, Share, Plus, Chrome, X } from 'lucide-react';

export default function DownloadButtons({ variant = 'light' }) {
  const [showGuide, setShowGuide] = useState(null); // 'android' | 'ios' | null

  const isLight = variant === 'light';
  const subText = isLight ? 'text-white/70' : 'text-muted-foreground';
  const cardBg = isLight ? 'bg-white/5 border-white/10' : 'bg-card border-border';
  const stepBg = isLight ? 'bg-white/5' : 'bg-secondary/60';

  return (
    <>
      <div className={`flex flex-col sm:flex-row gap-3 ${isLight ? '' : ''}`}>
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

      {/* Android Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowGuide(null)}>
          <div className={`w-full max-w-md rounded-2xl border p-5 ${cardBg}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-white' : 'text-foreground'}`}>
                {showGuide === 'android' ? <><Smartphone className="w-5 h-5 text-green-500" /> Android Kurulum</> : <><Apple className="w-5 h-5" /> iPhone Kurulum</>}
              </h3>
              <button onClick={() => setShowGuide(null)} className={`p-1.5 rounded-lg hover:bg-white/10 ${isLight ? 'text-white' : 'text-muted-foreground'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {showGuide === 'android' ? (
              <div className="space-y-3">
                {[
                  { icon: Chrome, title: 'Chrome ile Açın', desc: 'fılmkeyfı uygulamasını Chrome tarayıcısında açın.' },
                  { icon: Share, title: 'Menüye Dokunun', desc: 'Sağ üstteki ⋮ simgesine dokunun.' },
                  { icon: Plus, title: 'Ana Ekrana Ekle', desc: '"Ana ekrana ekle" seçeneğine dokunun.' },
                  { icon: Smartphone, title: 'Kurulum Tamam', desc: 'Ana ekranınızda FILMKEYFİ ikonu belirecek, tıklayarak açın.' },
                ].map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${stepBg}`}>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-white' : 'text-foreground'}`}><s.icon className="w-4 h-4" /> {s.title}</p>
                      <p className={`text-xs mt-0.5 ${subText}`}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: Chrome, title: 'Safari ile Açın', desc: 'fılmkeyfı uygulamasını Safari tarayıcısında açın.' },
                  { icon: Share, title: 'Paylaş Tuşuna Basın', desc: 'Alt çubuktaki Paylaş (□↑) simgesine dokunun.' },
                  { icon: Plus, title: 'Ana Ekrana Ekle', desc: '"Ana Ekrana Ekle" seçeneğini seçin.' },
                  { icon: Smartphone, title: 'Kurulum Tamam', desc: 'Ana ekranınızda FILMKEYFİ ikonu belirecek, tıklayarak açın.' },
                ].map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${stepBg}`}>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-white' : 'text-foreground'}`}><s.icon className="w-4 h-4" /> {s.title}</p>
                      <p className={`text-xs mt-0.5 ${subText}`}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className={`text-xs mt-4 text-center ${subText}`}>
              FILMKEYFİ bir PWA uygulamasıdır — App Store veya Play Store'a gerek yoktur.
            </p>
          </div>
        </div>
      )}
    </>
  );
}