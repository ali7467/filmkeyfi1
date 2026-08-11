import { useState } from 'react';
import { Smartphone, Apple, Chrome, Share, Plus, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

// Telefon mockup ekranı — her adım için görsel temsil
function PhoneScreen({ platform, step }) {
  const isAndroid = platform === 'android';

  if (step === 0) {
    // Tarayıcı açılmış, URL girili
    return (
      <div className="flex flex-col h-full bg-white">
        <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isAndroid ? 'bg-gray-100' : 'bg-gray-50'} border-b border-gray-200`}>
          <div className={`flex-1 flex items-center gap-1 bg-white rounded-full px-2 py-1 ${isAndroid ? '' : 'border border-gray-200'}`}>
            <span className="text-[7px] text-gray-400">🔒</span>
            <span className="text-[7px] text-gray-600 font-mono truncate">filmkeyfi.com</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-2">
          <div className="text-center">
            <p className="text-[10px] font-extrabold text-white tracking-tight">
              <span className="text-red-500">FILM</span>KEYFİ
            </p>
            <div className="mt-1.5 w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-purple-700 flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <p className="text-[6px] text-white/60 mt-1">Sinematik deneyim</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    // Menü açılmış — Android'de ⋮, iPhone'da Paylaş butonu
    return (
      <div className="flex flex-col h-full bg-white">
        <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isAndroid ? 'bg-gray-100' : 'bg-gray-50'} border-b border-gray-200 relative`}>
          <div className="flex-1 flex items-center gap-1 bg-white rounded-full px-2 py-1">
            <span className="text-[7px] text-gray-600 font-mono truncate">filmkeyfi.com</span>
          </div>
          {isAndroid ? (
            <div className="absolute top-1 right-1 flex flex-col gap-0.5 animate-pulse">
              <div className="w-3 h-0.5 bg-gray-700 rounded"></div>
              <div className="w-3 h-0.5 bg-gray-700 rounded"></div>
              <div className="w-3 h-0.5 bg-gray-700 rounded"></div>
            </div>
          ) : (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center animate-pulse">
                <Share className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
          <p className="text-[8px] text-white/40">Sayfa içeriği</p>
        </div>
        {isAndroid && (
          <div className="absolute top-7 right-1 bg-white rounded-lg shadow-xl border border-gray-200 p-1 space-y-1">
            <div className="text-[6px] text-gray-500 px-1">Yeni sekme</div>
            <div className="text-[6px] text-gray-500 px-1">Geçmiş</div>
            <div className="text-[6px] text-gray-500 px-1">İndirilenler</div>
            <div className="text-[6px] text-gray-500 px-1 bg-blue-50 rounded px-1 font-semibold text-blue-600">Ana ekrana ekle</div>
            <div className="text-[6px] text-gray-500 px-1">Paylaş</div>
          </div>
        )}
      </div>
    );
  }

  if (step === 2) {
    // "Ana ekrana ekle" seçeneği seçili
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
          <div className="bg-white rounded-xl p-2 w-20 shadow-2xl">
            <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-100">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-red-600 to-purple-700 flex items-center justify-center">
                <Smartphone className="w-2 h-2 text-white" />
              </div>
              <span className="text-[7px] font-bold text-gray-800">FILMKEYFİ</span>
            </div>
            <p className="text-[6px] text-gray-500 mt-1">Ana ekranınıza eklenecek</p>
            <div className="flex gap-1 mt-1.5">
              <button className="flex-1 text-[6px] text-gray-500 py-0.5 rounded">İptal</button>
              <button className="flex-1 text-[6px] text-white bg-blue-500 py-0.5 rounded font-semibold">Ekle</button>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-b from-gray-900 to-black" />
      </div>
    );
  }

  // step === 3 — Ana ekran, ikon beliriyor
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-800 to-gray-900 p-1.5">
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 opacity-50">
            <div className="w-4 h-4 rounded-lg bg-gray-600"></div>
            <div className="w-4 h-1 bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-0.5 mt-1.5 animate-pulse">
        <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-red-600 to-purple-700 flex items-center justify-center shadow-lg shadow-red-500/50 ring-2 ring-red-400/50">
          <Smartphone className="w-3 h-3 text-white" />
        </div>
        <span className="text-[6px] font-bold text-white">FILMKEYFİ</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        {[1,2,3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 opacity-50">
            <div className="w-4 h-4 rounded-lg bg-gray-600"></div>
            <div className="w-4 h-1 bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DownloadGuide({ platform, onClose, variant = 'dark' }) {
  const isLight = variant === 'light';
  const [step, setStep] = useState(0);
  const isAndroid = platform === 'android';

  const steps = isAndroid ? [
    { icon: Chrome, title: 'Chrome ile Açın', desc: 'fılmkeyfı uygulamasını Chrome tarayıcısında açın.' },
    { icon: Share, title: 'Menüye Dokunun', desc: 'Sağ üstteki ⋮ (üç nokta) simgesine dokunun.' },
    { icon: Plus, title: 'Ana Ekrana Ekle', desc: 'Açılan menüden "Ana ekrana ekle" seçeneğine dokunun.' },
    { icon: Check, title: 'Kurulum Tamam', desc: 'Ana ekranınızda FILMKEYFİ ikonu belirecek, tıklayarak açın.' },
  ] : [
    { icon: Chrome, title: 'Safari ile Açın', desc: 'fılmkeyfı uygulamasını Safari tarayıcısında açın.' },
    { icon: Share, title: 'Paylaş Tuşuna Basın', desc: 'Alt çubuktaki Paylaş (□↑) simgesine dokunun.' },
    { icon: Plus, title: 'Ana Ekrana Ekle', desc: 'Açılan menüden "Ana Ekrana Ekle" seçeneğini seçin.' },
    { icon: Check, title: 'Kurulum Tamam', desc: 'Ana ekranınızda FILMKEYFİ ikonu belirecek, tıklayarak açın.' },
  ];

  const subText = isLight ? 'text-white/70' : 'text-muted-foreground';
  const cardBg = isLight ? 'bg-white/5 border-white/10' : 'bg-card border-border';
  const stepBg = isLight ? 'bg-white/5' : 'bg-secondary/60';
  const activeStepBg = isLight ? 'bg-primary/20 border-primary' : 'bg-primary/15 border-primary';

  const CurrentIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-lg rounded-2xl border ${cardBg} overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-white' : 'text-foreground'}`}>
            {isAndroid ? <><Smartphone className="w-5 h-5 text-green-500" /> Android Kurulum</> : <><Apple className="w-5 h-5" /> iPhone Kurulum</>}
          </h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-white/10 ${isLight ? 'text-white' : 'text-muted-foreground'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Phone mockup + Steps */}
        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* Phone Mockup */}
          <div className="flex justify-center shrink-0">
            <div className="relative">
              {/* Phone frame */}
              <div className={`w-[120px] h-[220px] rounded-[2rem] border-[3px] ${isLight ? 'border-white/30' : 'border-gray-700'} bg-black p-1 shadow-2xl`}>
                {/* Notch */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full bg-gray-800 z-20"></div>
                {/* Screen */}
                <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                  <PhoneScreen platform={platform} step={step} />
                </div>
              </div>
              {/* Step indicator badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {step + 1}/4
              </div>
            </div>
          </div>

          {/* Steps list */}
          <div className="flex-1 space-y-2">
            {steps.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${isActive ? activeStepBg : isDone ? `${stepBg} opacity-60` : stepBg}`}
                >
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-green-500 text-white' : 'bg-secondary-foreground/10'}`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold flex items-center gap-1.5 ${isLight ? 'text-white' : 'text-foreground'}`}>
                      <StepIcon className="w-3.5 h-3.5 shrink-0" /> {s.title}
                    </p>
                    {isActive && <p className={`text-xs mt-0.5 ${subText}`}>{s.desc}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/50">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${step === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary'} ${isLight ? 'text-white' : 'text-foreground'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? 'bg-primary w-4' : i < step ? 'bg-primary/40' : 'bg-muted-foreground/30'}`} />
            ))}
          </div>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              İleri <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
            >
              <Check className="w-4 h-4" /> Tamam
            </button>
          )}
        </div>

        <p className={`text-xs text-center pb-4 px-5 ${subText}`}>
          FILMKEYFİ bir PWA uygulamasıdır — App Store veya Play Store'a gerek yoktur.
        </p>
      </div>
    </div>
  );
}