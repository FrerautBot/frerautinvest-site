import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Cloud = ({ style, duration, delay }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={style}
    animate={{ x: ['0%', '8%', '-4%', '0%'], opacity: [0.85, 1, 0.9, 0.85] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg viewBox="0 0 200 80" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 16px rgba(255,255,255,0.5))' }}>
      <defs>
        <radialGradient id="cg1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="55" rx="90" ry="22" fill="url(#cg1)" />
      <ellipse cx="70" cy="42" rx="50" ry="28" fill="url(#cg1)" />
      <ellipse cx="120" cy="38" rx="45" ry="26" fill="url(#cg1)" />
      <ellipse cx="155" cy="50" rx="35" ry="20" fill="url(#cg1)" />
      <ellipse cx="45" cy="52" rx="30" ry="18" fill="url(#cg1)" />
    </svg>
  </motion.div>
);

const Sun = () => (
  <div className="absolute pointer-events-none" style={{ top: '6%', right: '8%', width: 120, height: 120 }}>
    {Array.from({ length: 12 }, (_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          width: 2, height: 28,
          background: 'linear-gradient(to top, rgba(255,220,60,0.9), transparent)',
          borderRadius: 2, top: '50%', left: '50%',
          transformOrigin: '50% 100%',
          transform: `translateX(-50%) rotate(${i * 30}deg) translateY(-56px)`,
        }}
        animate={{ opacity: [0.6, 1, 0.6], scaleY: [0.8, 1.1, 0.8] }}
        transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(255,235,100,0.25) 0%, transparent 70%)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute"
      style={{
        top: '50%', left: '50%',
        width: 62, height: 62,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 38%, #fff9c4 0%, #ffd740 35%, #ffb300 70%, #ff8f00 100%)',
        boxShadow: '0 0 30px 12px rgba(255,200,0,0.45), 0 0 60px 24px rgba(255,160,0,0.25)',
      }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <div className="absolute" style={{ top: '50%', left: '50%', width: 28, height: 22, transform: 'translate(-68%, -62%)', borderRadius: '50%', background: 'rgba(255,255,255,0.55)', filter: 'blur(6px)', pointerEvents: 'none' }} />
  </div>
);

const CLOUDS = [
  { id: 1, top: '10%', left: '-5%',  width: 280, opacity: 0.92, duration: 28, delay: 0  },
  { id: 2, top: '18%', right: '5%',  width: 220, opacity: 0.85, duration: 22, delay: 4  },
  { id: 3, top: '28%', left: '20%',  width: 340, opacity: 0.78, duration: 35, delay: 8  },
  { id: 4, top: '8%',  left: '40%',  width: 180, opacity: 0.70, duration: 26, delay: 12 },
  { id: 5, top: '35%', right: '15%', width: 250, opacity: 0.65, duration: 30, delay: 6  },
  { id: 6, top: '22%', left: '60%',  width: 200, opacity: 0.60, duration: 24, delay: 16 },
];

export const SkyBackground = ({ enabled }) => {
  if (!enabled) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="sky"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2196F3 0%, #42A5F5 18%, #64B5F6 35%, #90CAF9 55%, #BBDEFB 75%, #E3F2FD 90%, #F8FBFF 100%)',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 60% at 50% 0%, rgba(100,181,246,0.4) 0%, transparent 70%)' }} />
        <Sun />
        {CLOUDS.map(c => (
          <Cloud
            key={c.id}
            style={{ top: c.top, left: c.left, right: c.right, width: c.width, height: c.width * 0.4, opacity: c.opacity }}
            duration={c.duration}
            delay={c.delay}
          />
        ))}
        {Array.from({ length: 18 }, (_, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute rounded-full"
            style={{
              width: 3 + (i % 4),
              height: 3 + (i % 4),
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 13 + 3) % 60}%`,
              background: 'rgba(255,255,255,0.8)',
              boxShadow: '0 0 6px rgba(255,255,255,0.9)',
            }}
            animate={{ y: [0, -30, 0], opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 4 + (i % 4), delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export const useSkyMode = (theme) => {
  const [skyEnabled, setSkyEnabled] = useState(() => {
    try { 
      const s = localStorage.getItem('freraut_sky_mode'); 
      return s !== null ? JSON.parse(s) : true; 
    } catch { 
      return true; 
    }
  });

  const toggleSky = () => {
    setSkyEnabled(prev => {
      const next = !prev;
      localStorage.setItem('freraut_sky_mode', JSON.stringify(next));
      return next;
    });
  };

  const isActive = skyEnabled && theme === 'light';
  return { skyEnabled, toggleSky, isActive };
};

export default SkyBackground;