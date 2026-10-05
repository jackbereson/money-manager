'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

const durations = { 'money-bag': 2500, 'save-money': 2500, target: 2170, award: 2500, notebook: 2500, 'line-chart': 1670 };
export type AnimatedIconName = keyof typeof durations;

export default function AnimatedIcon({ name, size = 28, fallback: Fallback }: { name: AnimatedIconName; size?: number; fallback: LucideIcon }) {
  const element = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [replay, setReplay] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const icon = element.current;
    if (!icon) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const surface = icon.closest('button, article, .quest-greeting, .daily-quest, .quest-level') || icon;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { clearTimeout(timer); setPlaying(false); };
    const play = () => {
      if (motion.matches || document.hidden) return;
      clearTimeout(timer);
      setReplay(value => value + 1);
      setPlaying(true);
      timer = setTimeout(stop, durations[name]);
    };
    const visibility = () => { if (document.hidden) stop(); };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { play(); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(icon);
    surface.addEventListener('pointerenter', play);
    surface.addEventListener('pointerdown', play);
    surface.addEventListener('focusin', play);
    motion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      surface.removeEventListener('pointerenter', play);
      surface.removeEventListener('pointerdown', play);
      surface.removeEventListener('focusin', play);
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [name]);

  return <span ref={element} className="animated-icon" aria-hidden="true" style={{ width: size, height: size }}>
    {failed ? <Fallback size={size} /> : <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`/icons/animated/${name}.png`} />
      {/* Local animated assets use a static frame between interactions. */}
      <img key={playing ? replay : 'still'} src={`/icons/animated/${name}.${playing ? 'webp' : 'png'}`} width={size} height={size} alt="" decoding="async" onError={() => setFailed(true)} />
    </picture>}
  </span>;
}
