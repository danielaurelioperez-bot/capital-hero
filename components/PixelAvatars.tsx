import React from 'react';

// AVATAR STYLE: Clean Line Contemporary Superhero Comic (Editorial Portrait)
// Tech: Inline SVG with bold ink strokes and block shading
// Vibe: Adult, Serious, Narrative-driven

const styles = `
  @keyframes blink-micro {
    0%, 98% { transform: scaleY(1); }
    99% { transform: scaleY(0.1); }
    100% { transform: scaleY(1); }
  }
  @keyframes breathe-micro {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(0.5px); }
  }
  @keyframes shift-micro {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(0.5deg); }
  }

  .comic-avatar {
    cursor: pointer;
    overflow: visible;
  }
  
  .comic-avatar-group {
    transform-origin: center 80%;
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }

  .comic-avatar:hover .comic-avatar-group {
    transform: translateY(-2px) scale(1.02);
  }
`;

const INK = "#0f172a"; 

export type CharacterId = 'ari' | 'vince';

interface CharacterPortraitProps {
  character: CharacterId;
  size?: number;
  popOut?: number; // Visual lift (informational mainly, or controls padding)
  className?: string;
  frameColor?: string; // Optional override
}

// Internal Ari Component (The Coach)
// Green Frame
const AriAvatar: React.FC<{ size: number, className: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`comic-avatar ${className}`} style={{ overflow: 'visible' }}>
    <defs>
      <style>{styles}</style>
      <clipPath id="clipAri"><circle cx="50" cy="55" r="40" /></clipPath>
      <linearGradient id="gradAri" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#f0fdf4" /> {/* Green-50 */}
        <stop offset="100%" stopColor="#dcfce7" /> {/* Green-100 */}
      </linearGradient>
    </defs>

    {/* Frame - Green */}
    <circle cx="50" cy="55" r="40" fill="url(#gradAri)" stroke="#22c55e" strokeWidth="3" />

    <g className="comic-avatar-group" style={{ animation: 'breathe-micro 6s ease-in-out infinite' }}>
      
      {/* Shoulders */}
      <g clipPath="url(#clipAri)">
        <path d="M10 100 V82 C10 72 20 68 50 68 C80 68 90 72 90 82 V100" fill="#1e3a8a" /> 
        <path d="M50 68 L50 100" stroke="#0f172a" strokeWidth="2" opacity="0.3" /> 
        <path d="M10 82 C10 72 20 68 50 68 C80 68 90 72 90 82" fill="none" stroke={INK} strokeWidth="3" />
      </g>

      {/* Head */}
      <g className="head-group" transform-origin="50 70">
        <path d="M36 58 V75 H64 V58" fill="#eab3a3" stroke={INK} strokeWidth="3" />
        <path d="M36 58 V75 H48 V58" fill="#d49a89" />

        <path d="M28 45 C26 45 25 48 25 52 C25 56 26 58 28 56" fill="#eab3a3" stroke={INK} strokeWidth="3" />
        <path d="M72 45 C74 45 75 48 75 52 C75 56 74 58 72 56" fill="#eab3a3" stroke={INK} strokeWidth="3" />

        <path d="M30 25 V55 C30 70 38 75 50 75 C62 75 70 70 70 55 V25" fill="#eab3a3" stroke={INK} strokeWidth="3" />
        <path d="M60 25 V55 C60 65 64 70 68 55 V25" fill="#d49a89" opacity="0.6" />

        <path d="M30 45 V56 C30 72 38 76 50 76 C62 76 70 72 70 56 V45 C70 45 62 60 50 60 C38 60 30 45 30 45" fill="#334155" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />

        <path d="M46 66 H54" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

        <path d="M50 42 L46 52 H52" fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M52 52 L54 48" fill="none" stroke={INK} strokeWidth="1" opacity="0.5" />

        <g stroke={INK} strokeWidth="2.5" fill="rgba(255,255,255,0.2)">
             <rect x="32" y="40" width="16" height="10" rx="2" />
             <rect x="52" y="40" width="16" height="10" rx="2" />
             <path d="M48 45 H52" />
        </g>

        <g style={{ animation: 'blink-micro 4s infinite' }}>
           <circle cx="40" cy="45" r="2" fill={INK} />
           <circle cx="60" cy="45" r="2" fill={INK} />
           <path d="M34 38 H46" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
           <path d="M54 38 H66" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
        
        <path d="M28 28 C26 15 35 5 55 5 C75 5 74 15 72 35 V42 H70 V28 H32 V42 H30 V28 Z" fill="#334155" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M55 5 L50 20 L72 35" fill="none" stroke="#475569" strokeWidth="1.5" /> 
      </g>
    </g>
  </svg>
);

// Internal Vince Component (The Impulse)
// Orange Frame
const VinceAvatar: React.FC<{ size: number, className: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`comic-avatar ${className}`} style={{ overflow: 'visible' }}>
    <defs>
      <style>{styles}</style>
      <clipPath id="clipVince"><circle cx="50" cy="55" r="40" /></clipPath>
      <linearGradient id="gradVince" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#fff7ed" /> {/* Orange-50 */}
        <stop offset="100%" stopColor="#ffedd5" /> {/* Orange-100 */}
      </linearGradient>
    </defs>

    {/* Frame - Orange */}
    <circle cx="50" cy="55" r="40" fill="url(#gradVince)" stroke="#f97316" strokeWidth="3" />

    <g className="comic-avatar-group" style={{ animation: 'shift-micro 4s ease-in-out infinite' }}>
      <g clipPath="url(#clipVince)">
        <path d="M15 95 C15 85 25 78 50 78 C75 78 85 85 85 95" fill="#7e22ce" />
        <path d="M15 95 C15 85 25 78 50 78 C75 78 85 85 85 95" fill="none" stroke={INK} strokeWidth="3" />
        <path d="M50 78 L42 100 H58 L50 78" fill="#f43f5e" />
        <path d="M38 78 L42 92" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <path d="M62 78 L58 92" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>

      <g className="head-group" transform="rotate(-3, 50, 70)">
        <path d="M40 65 L40 78 H60 L60 65" fill="#fcd34d" stroke={INK} strokeWidth="3" />
        <path d="M40 65 V78 H46 V70" fill="#d97706" opacity="0.3" />

        <path d="M25 52 L22 56 L26 62" fill="#fcd34d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M75 52 L78 56 L74 62" fill="#fcd34d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />

        <path d="M28 35 L26 50 L34 70 L50 80 L66 70 L74 50 L72 35" fill="#fcd34d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        
        <path d="M28 50 L36 68 L42 70 L30 55 Z" fill="#f59e0b" opacity="0.4" />
        <path d="M35 70 L50 78 L65 70 L60 65 L50 74 L40 65 Z" fill="#f59e0b" opacity="0.3" />
        <path d="M72 35 L74 50 L70 50 Z" fill="#f59e0b" opacity="0.3" />

        <path d="M52 42 L48 58 H56" fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M52 42 L52 58 L58 58 Z" fill="#f59e0b" opacity="0.5" />

        <path d="M44 66 L50 65 L56 66" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <path d="M46 69 Q50 72 54 69" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <path d="M46 69 Q50 72 54 69" fill="#f59e0b" opacity="0.4" />
        <path d="M56 66 L58 64" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

        <g style={{ animation: 'blink-micro 4s infinite' }}>
           <path d="M35 48 L45 47" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
           <circle cx="40" cy="50" r="2" fill={INK} />
           <path d="M55 46 L65 44" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
           <circle cx="60" cy="50" r="2" fill={INK} />
        </g>
        
        <path d="M26 35 L24 20 L30 10 L50 2 L70 10 L76 20 L74 35 V45 L72 40 V35 H26 Z" fill="#451a03" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 35 L34 18 L50 8 L66 18 L70 35 L50 25 Z" fill="#78350f" />
        <path d="M42 10 L50 6 L58 10 L55 20 L45 20 Z" fill="#b45309" />
        
        <path d="M50 8 L50 22" stroke={INK} strokeWidth="1.5" />
        <path d="M38 18 L42 28" stroke={INK} strokeWidth="1.5" />
        <path d="M62 18 L58 28" stroke={INK} strokeWidth="1.5" />
      </g>
    </g>
  </svg>
);

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({ character, size = 64, className = "" }) => {
  if (character === 'vince') {
    return <VinceAvatar size={size} className={className} />;
  }
  return <AriAvatar size={size} className={className} />;
};