import { useEffect, useState } from 'react';
import { CakeSlice } from 'lucide-react';

const SPLASH_IMAGE_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SweetMarket_%20Shirinliklar%20Dunyosi-S8ysZGFOstyaDRytpMIrIsSRxI3Z1p.webp';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimeout = window.setTimeout(() => setIsExiting(true), 1300);
    const hideTimeout = window.setTimeout(() => setIsVisible(false), 1600);
    return () => {
      window.clearTimeout(exitTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="progressbar"
      aria-label="SweetMarket ilovasi yuklanmoqda"
      aria-valuetext="Yuklanmoqda"
      className={`sweetmarket-splash fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#1d030e] transition-opacity duration-300 ${isExiting ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <img
        src={SPLASH_IMAGE_URL}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#1d030e]/65 via-transparent to-[#1d030e]/75" />
      <header className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pt-6 text-center text-white sm:pt-9">
        <h1 className="font-[var(--sm-font-display)] text-4xl font-bold tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)] sm:text-5xl">
          Sweet<span className="text-[#ff4e91]">Market</span>
        </h1>
        <p className="mt-1 text-sm text-white/90 drop-shadow-lg sm:text-base">Shirinliklar dunyosi — bir ilovada!</p>
      </header>
      <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-8 text-center text-white sm:pb-10">
        <div className="relative grid size-14 place-items-center rounded-full bg-[#1d030e]/70 text-[#ff5b9b]">
          <span aria-hidden="true" className="absolute inset-0 animate-spin rounded-full border-2 border-[#ff5b9b] border-t-transparent motion-reduce:animate-none" />
          <CakeSlice aria-hidden="true" className="size-6" />
        </div>
        <p className="text-base font-medium drop-shadow-lg">Yuklanmoqda...</p>
        <p className="text-sm text-white/85 drop-shadow-lg">SweetMarket bilan har kun yanada shirin!</p>
      </footer>
    </div>
  );
}
