import { useEffect, useState } from 'react';
import { MARK_PATH } from './brandMark.js';

// Hero art: a big outline trace of the actual WealthKnox mark, bled past
// the top edge for a bold, premium feel — the brand itself as the graphic,
// instead of generic abstract texture or a second small copy of the logo.
// Exported so AuthGate's auth-check screen can reuse the exact same art —
// one continuous branded screen instead of a plain-text flash followed by
// this one.
export function SplashArt() {
  return (
    <svg className="splash-art" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g transform="translate(-44 70) scale(1.16)">
        <path d={MARK_PATH} fillRule="evenodd" />
      </g>
    </svg>
  );
}

// Title + tagline, also exported for the same reason as SplashArt above.
export function SplashContent() {
  return (
    <div className="splash-content">
      <h1 className="splash-title">
        <b>WEALTH</b>
        <em>KNOX</em>
      </h1>
      <p className="splash-tagline">Track your personal finances, clearly.</p>
    </div>
  );
}

export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1100);
    const t2 = setTimeout(() => onDone?.(), 1550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`}>
      <SplashArt />
      <SplashContent />
      <div className="splash-bar"><i /></div>
    </div>
  );
}
