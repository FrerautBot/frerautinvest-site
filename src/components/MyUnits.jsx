import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, Calendar, Wallet, PieChart, ArrowUpRight, ArrowDownRight, Loader2, DollarSign, X, Trash2, RefreshCw, ArrowRightLeft } from 'lucide-react';

const formatUSD = (val) => {
  if (val == null || isNaN(val)) return '$0.00 USD';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
};
const formatCLP = (val, fx) => {
  if (val == null || isNaN(val) || !fx) return '';
  const clp = Number(val) * fx;
  return '~ $' + Math.round(clp).toLocaleString('es-CL') + ' CLP';
};

// ── CinematicCard ── 3D tilt + cursor glow + shimmer sweep ──────────
const CinematicCard = ({ children, className = '', accentColor = '#C9A227', delay = 0, onClick, span = 'col-span-1' }) => {
  const cardRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const tiltX = (mouseY / (rect.height / 2)) * -8;
    const tiltY = (mouseX / (rect.width / 2)) * 8;
    setRotateX(tiltX);
    setRotateY(tiltY);
    setGlowX(((e.clientX - rect.left) / rect.width) * 100);
    setGlowY(((e.clientY - rect.top) / rect.height) * 100);
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
    setIsHovered(false);
  }, []);

  const lgSpan = span.includes('2') ? 'lg:col-span-2' : 'lg:col-span-1';
  const mdSpan = span.includes('2') ? 'md:col-span-2' : 'md:col-span-1';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, rotateX: 5, rotateY: -3 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
      className={`${lgSpan} ${mdSpan} relative overflow-hidden bg-[#0D0E14]/80 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.06] rounded-2xl p-5 transition-shadow duration-500 cursor-pointer group ${className}`}
    >
      {/* Ambient glow layer — tracks cursor */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle 180px at ${glowX}% ${glowY}%, ${accentColor}18, transparent 70%)`,
        }}
      />

      {/* Shimmer sweep — diagonal light pass */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${accentColor}08 45%, ${accentColor}12 50%, transparent 55%)`,
          backgroundSize: '200% 100%',
          animation: isHovered ? 'shimmerSweep 1.8s ease-in-out infinite' : 'none',
        }}
      />

      {/* Top edge light bar */}
      <div
        className="absolute top-0 left-4 right-4 h-px z-10 transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
          opacity: isHovered ? 1 : 0.5,
        }}
      />

      {/* Bottom reflection line */}
      <div
        className="absolute bottom-0 left-8 right-8 h-px z-10 transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}15, transparent)`,
          opacity: isHovered ? 0.6 : 0,
        }}
      />

      {/* Content — sits above glow and shimmer */}
      <div className="relative z-20" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>

      {/* Edge highlight on hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-5 transition-all duration-500"
        style={{
          boxShadow: isHovered
            ? `inset 0 0 0 1px ${accentColor}20, 0 16px 48px -12px ${accentColor}15`
            : `inset 0 0 0 1px ${accentColor}06`,
        }}
      />
    </motion.div>
  );
};

// ── ParticleField ── subtle animated dots in background ─────────────
const ParticleField = () => {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 3,
      opacity: Math.random() * 0.3 + 0.1,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#C9A227]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// ── Animated Counter ── spring-counting number ──────────────────────
const AnimatedValue = ({ value, className = '' }) => {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value);
  if (isNaN(numericValue)) return <span className={className}>{value}</span>;

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {value}
    </motion.span>
  );
};

// ── Skeleton Loaders ──────────────────────────────────────────────
const MetricsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`animate-pulse bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#C9A227]/10 rounded-2xl p-5 ${
          i < 2 ? 'lg:col-span-2' : 'lg:col-span-1'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="h-3 w-20 bg-[#C9A227]/10 rounded-full" />
          <div className="p-2 rounded-xl bg-[#C9A227]/5 h-8 w-8" />
        </div>
        <div className="h-7 w-32 bg-[#C9A227]/10 rounded-lg mb-1" />
        <div className="h-3 w-24 bg-[#C9A227]/5 rounded-full" />
      </div>
    ))}
  </div>
);

// ── Empty State Component ─────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-8 bg-gradient-to-b from-[#1A1D2B]/50 to-transparent rounded-2xl border border-[#C9A227]/10"
  >
    <div className="mb-5 opacity-30">
      {Icon ? (
        <Icon className="w-20 h-20 text-[#C9A227]" strokeWidth={1} />
      ) : (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="64" height="64" rx="16" stroke="#C9A227" strokeWidth="1.5" opacity="0.4" />
          <circle cx="40" cy="36" r="14" stroke="#C9A227" strokeWidth="1.5" opacity="0.4" />
          <path d="M36 32l8 4-8 4V32z" fill="#C9A227" opacity="0.3" />
          <path d="M24 60l8-12h16l8 12" stroke="#C9A227" strokeWidth="1.5" opacity="0.3" />
        </svg>
      )}
    </div>
    <p className="text-[#F5F1E8]/60 text-lg font-medium mb-1">{title}</p>
    {subtitle && <p className="text-[#F5F1E8]/30 text-sm">{subtitle}</p>}
  </motion.div>
);

// ── Custom Chart Tooltip ──────────────────────────────────────────
const ChartTooltip = ({ point, mousePos, fxRate }) => {
  if (!point) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute z-20 bg-[#1A1D2B]/85 backdrop-blur-md border border-[#C9A227]/30 rounded-xl px-4 py-3 shadow-lg shadow-[#C9A227]/5 pointer-events-none"
      style={{ left: Math.min(mousePos.x + 15, 700), top: Math.max(mousePos.y - 80, 10) }}
    >
      <p className="text-[10px] text-[#C9A227] font-semibold uppercase tracking-wider mb-1">
        {new Date(point.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
      <p className="text-base font-bold text-white font-mono tabular-nums">
        {formatUSD(point.valor)}
      </p>
      <p className="text-xs text-[#F5F1E8]/40">{formatCLP(point.valor, fxRate)}</p>
    </motion.div>
  );
};

// ── PatrimonioChart ───────────────────────────────────────────────
const PatrimonioChart = React.memo(({ historial, fxRate, lucro, saldoCLP, saldoUSD }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const svgRef = useRef(null);

  const { totalPatrimonioUSD, totalPatrimonioCLP, cambioPorcentaje, esPositivo, allPoints, pathD, areaPathD, minValor, rangoValor, chartHeight, padding, width, height } = useMemo(() => {
    if (!historial || historial.length === 0) return {};

    const w = 900;
    const h = 300;
    const pad = { top: 30, right: 30, bottom: 50, left: 70 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const valores = historial.map((d) => (d?.patrimonio_total_real ? Number(d.patrimonio_total_real) : 0));
    const vfilt = valores.filter((v) => v > 0);
    if (vfilt.length === 0) return { emptyValues: true };

    const minV = Math.min(...vfilt) * 0.95;
    const maxV = Math.max(...vfilt) * 1.05;
    const range = maxV - minV || 1;

    const pts = historial.map((item, idx) => {
      const val = Number(item?.patrimonio_total_real || 0);
      return {
        x: pad.left + (idx / Math.max(historial.length - 1, 1)) * cw,
        y: pad.top + ch - ((val - minV) / range) * ch,
        fecha: item.fecha,
        valor: val,
        index: idx,
      };
    });

    // Catmull-Rom smooth path
    const buildSmooth = (pts) => {
      if (pts.length < 2) return '';
      return pts.map((p, i, a) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = a[i - 1];
        const next = a[i + 1] || p;
        const t = 0.3;
        return `C ${prev.x + (p.x - prev.x) * t},${prev.y + (p.y - prev.y) * t} ${p.x - (next.x - prev.x) * t},${p.y - (next.y - prev.y) * t} ${p.x},${p.y}`;
      }).join(' ');
    };

    const pd = buildSmooth(pts);
    const ad = pd + ` L ${pts[pts.length - 1].x} ${h - pad.bottom} L ${pad.left} ${h - pad.bottom} Z`;

    const last = valores[valores.length - 1];
    const first = valores[0];
    const absChange = last - first;
    const pct = first > 0 ? ((absChange / first) * 100).toFixed(2) : '0.00';

    const tusd = (saldoUSD || 0) + (lucro?.valor_actual || 0) + (saldoCLP || 0) / fxRate;
    const tclp = (saldoCLP || 0) + (lucro?.valor_actual || 0) * fxRate + (saldoUSD || 0) * fxRate;

    return {
      totalPatrimonioUSD: tusd,
      totalPatrimonioCLP: tclp,
      cambioPorcentaje: pct,
      esPositivo: absChange >= 0,
      allPoints: pts,
      pathD: pd,
      areaPathD: ad,
      minValor: minV,
      rangoValor: range,
      chartHeight: ch,
      padding: pad,
      width: w,
      height: h,
    };
  }, [historial, fxRate, saldoCLP, saldoUSD, lucro]);

  // Throttled mouse move via rAF — no setState on every pixel
  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const svg = svgRef.current;
      if (!svg || !allPoints) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = svg.width.baseVal.value / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (mouseX < padding.left - 10 || mouseX > width - padding.right + 5) {
        setHoveredPoint(null);
        return;
      }
      const cw = width - padding.left - padding.right;
      const idx = Math.round(((mouseX - padding.left) / cw) * (allPoints.length - 1));
      const clamped = Math.max(0, Math.min(idx, allPoints.length - 1));
      setHoveredPoint(allPoints[clamped]);
    });
  }, [allPoints, padding, width, chartHeight]);

  const handleMouseLeave = useCallback(() => setHoveredPoint(null), []);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  if (!historial || historial.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#0D0E14]/80 border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#C9A227]/10 rounded-lg"><TrendingUp className="w-5 h-5 text-[#C9A227]" /></div>
          <h3 className="text-lg font-semibold text-white tracking-tight">Evolucion de tu Patrimonio</h3>
        </div>
        <EmptyState icon={TrendingUp} title="No hay suficiente historial" subtitle="El grafico aparecera cuando tengas mas datos registrados" />
      </motion.div>
    );
  }

  if (allPoints && allPoints.length === 0 && !totalPatrimonioUSD) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#0D0E14]/80 border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#C9A227]/10 rounded-lg"><TrendingUp className="w-5 h-5 text-[#C9A227]" /></div>
          <h3 className="text-lg font-semibold text-white tracking-tight">Evolucion de tu Patrimonio</h3>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs">Los datos del historial existen pero todos los valores son 0</p>
        </div>
      </motion.div>
    );
  }

  if (!allPoints || allPoints.length === 0) return null;

  // Only render every Nth dot (sparse for perf)
  const DOT_INTERVAL = Math.max(1, Math.floor(allPoints.length / 12));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-[#0D0E14]/80 border border-white/[0.06] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#C9A227]/10 rounded-lg"><TrendingUp className="w-5 h-5 text-[#C9A227]" /></div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Evolucion de tu Patrimonio</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5 font-mono tabular-nums">{formatUSD(totalPatrimonioUSD)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/[0.06]">
          <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="text-xs font-medium text-gray-300">Historial completo</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Patrimonio Actual', value: formatUSD(totalPatrimonioUSD), sub: formatCLP(totalPatrimonioUSD, fxRate), color: 'text-white' },
          { label: 'Cambio Total', value: `${esPositivo ? '+' : ''}${cambioPorcentaje}%`, sub: 'Desde el inicio', color: esPositivo ? 'text-[#10B981]' : 'text-[#EF4444]' },
          { label: 'Patrimonio CLP', value: formatCLP(totalPatrimonioUSD, fxRate), sub: null, color: 'text-white' },
        ].map((card, i) => (
          <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <p className="text-[10px] text-[#9CA3AF] font-medium mb-1 tracking-wide uppercase">{card.label}</p>
            <p className={`text-lg font-bold tracking-tight font-mono tabular-nums ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-[10px] text-[#9CA3AF]/60 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="overflow-hidden rounded-xl border border-white/[0.05] relative bg-[#0B0C10]">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="mx-auto block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          shapeRendering="auto"
        >
          <defs>
            <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C9A227" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#C9A227" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C9A227" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#C9A227" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const yPos = padding.top + chartHeight * (1 - f);
            const val = minValor + rangoValor * f;
            return (
              <g key={f}>
                <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos}
                  stroke="#ffffff" strokeWidth="1" strokeDasharray="4 6" opacity="0.05" />
                <text x={padding.left - 10} y={yPos + 4} textAnchor="end" fill="#6B7280" fontSize="10" fontFamily="monospace">
                  ${(val / 1000).toFixed(1)}k
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPathD} fill="url(#chartAreaGrad)" />

          {/* Glow line (wide, translucent) */}
          <path d={pathD} fill="none" stroke="#C9A227" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />

          {/* Main line */}
          <path d={pathD} fill="none" stroke="url(#chartLineGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Sparse dots */}
          {allPoints.filter((_, i) => i % DOT_INTERVAL === 0 || i === allPoints.length - 1).map((pt) => (
            <circle key={pt.index} cx={pt.x} cy={pt.y} r="2.5" fill="#0B0C10" stroke="#C9A227" strokeWidth="1.5" />
          ))}

          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              <line x1={hoveredPoint.x} y1={padding.top} x2={hoveredPoint.x} y2={height - padding.bottom}
                stroke="#C9A227" strokeWidth="1" strokeDasharray="3 4" opacity="0.25" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#0B0C10" stroke="#C9A227" strokeWidth="2" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="14" fill="none" stroke="#C9A227" strokeWidth="1" opacity="0.15" />
            </>
          )}
        </svg>

        <ChartTooltip point={hoveredPoint} mousePos={mousePos} fxRate={fxRate} />
      </div>
    </motion.div>
  );
});

// ── Status Badge ──────────────────────────────────────────────────
const StatusBadge = ({ estado, motivoRechazo }) => {
  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'completado':
        return {
          bg: 'bg-[#10B981]/10',
          text: 'text-[#10B981]',
          border: 'border-[#10B981]/30',
          dot: 'bg-[#10B981]',
          label: 'Completado',
        };
      case 'rechazado':
        return {
          bg: 'bg-[#EF4444]/10',
          text: 'text-[#EF4444]',
          border: 'border-[#EF4444]/30',
          dot: 'bg-[#EF4444]',
          label: 'Rechazado',
        };
      case 'pendiente':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-500',
          border: 'border-amber-500/30',
          dot: 'bg-amber-500 animate-pulse',
          label: 'Pendiente',
        };
      case 'procesando':
        return {
          bg: 'bg-[#8B5CF6]/10',
          text: 'text-[#8B5CF6]',
          border: 'border-[#8B5CF6]/30',
          dot: 'bg-[#8B5CF6] animate-bounce',
          label: 'Procesando',
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
          dot: 'bg-gray-400',
          label: estado || 'Desconocido',
        };
    }
  };

  const s = getStatusStyle(estado);

  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span className="uppercase tracking-wider">{s.label}</span>
      </span>
      {motivoRechazo && (
        <p className="text-xs text-[#EF4444] mt-1">{motivoRechazo}</p>
      )}
    </div>
  );
};

// ── Spring animation preset ───────────────────────────────────────
const springHover = {
  whileHover: { scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  whileTap: { scale: 0.97, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

const cardSpring = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
};

// ── MyUnits ───────────────────────────────────────────────────────
const MyUnits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [historial, setHistorial] = useState([]);
  const [lucro, setLucro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fxRate, setFxRate] = useState(930);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankData, setBankData] = useState({
    banco: '',
    tipoCuenta: 'corriente',
    numeroCuenta: '',
    rutTitular: '',
    nombreTitular: '',
    email: '',
  });
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [saldoDisponible, setSaldoDisponible] = useState(0);
  const [saldoUSD, setSaldoUSD] = useState(0);

  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [withdrawHistoryLimit, setWithdrawHistoryLimit] = useState(3);
  const [hasMoreWithdraws, setHasMoreWithdraws] = useState(false);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeQuote, setExchangeQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isProcessingExchange, setIsProcessingExchange] = useState(false);

  const loadWithdrawHistory = async (limit = 3) => {
    try {
      const { data, error, count } = await supabase
        .from('retiros')
        .select('*', { count: 'exact' })
        .eq('usuario_id', user.id)
        .order('fecha_solicitud', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setWithdrawHistory(data || []);
      setHasMoreWithdraws(count > limit);
    } catch (error) {
      console.error('Error cargando historial de retiros:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data: histData, error: histError } = await supabase.rpc(
          'obtener_historial_patrimonio',
          { p_usuario_id: user.id, p_dias: 30 }
        );

        if (histError) console.error('Error historial:', histError);
        else setHistorial(histData || []);

        const { data: lucroData, error: lucroError } = await supabase.rpc(
          'obtener_lucro_detallado',
          { p_usuario_id: user.id }
        );

        if (lucroError) console.error('Error lucro:', lucroError);
        else setLucro(lucroData);

        const { data: userData } = await supabase
          .from('usuarios')
          .select('nombre, email, rut')
          .eq('id', user.id)
          .single();

        if (userData) {
          setBankData((prev) => ({
            ...prev,
            nombreTitular: userData.nombre || '',
            email: userData.email || '',
            rutTitular: userData.rut || '',
          }));
        }

        await loadSavedBankAccounts();
        await loadWithdrawHistory(withdrawHistoryLimit);
        await loadSaldoDisponible();

        const { data: fx } = await supabase
          .from('fx_config')
          .select('manual_rate')
          .eq('is_active', true)
          .maybeSingle();
        if (fx?.manual_rate) setFxRate(parseFloat(fx.manual_rate));
      } catch (error) {
        console.error('Error fetching units data:', error);
        toast({
          title: '❌ Error al cargar datos',
          description: 'No se pudieron cargar los datos de tu cartera. Intenta nuevamente.',
          variant: 'destructive',
          duration: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const loadSavedBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_datos_bancarios', {
        p_usuario_id: user.id,
      });

      if (error) throw error;

      setSavedBankAccounts(data || []);

      const cuentaPrincipal = data?.find((cuenta) => cuenta.es_principal);
      if (cuentaPrincipal) {
        setSelectedBankAccountId(cuentaPrincipal.id);
        loadBankDataFromSaved(cuentaPrincipal);
      }
    } catch (error) {
      console.error('Error cargando cuentas bancarias:', error);
    }
  };

  const loadBankDataFromSaved = (cuenta) => {
    setBankData({
      banco: cuenta.banco,
      tipoCuenta: cuenta.tipo_cuenta,
      numeroCuenta: cuenta.numero_cuenta,
      rutTitular: cuenta.rut_titular,
      nombreTitular: cuenta.nombre_titular,
      email: cuenta.email,
    });
  };

  const loadSaldoDisponible = async () => {
    try {
      const { data: usuarioData, error } = await supabase
        .from('usuarios')
        .select('saldo_clp, saldo_usd')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const saldoCLP = Number(usuarioData?.saldo_clp || 0);
      const saldoUSD = Number(usuarioData?.saldo_usd || 0);
      setSaldoDisponible(saldoCLP);
      setSaldoUSD(saldoUSD);
      return { saldoCLP, saldoUSD };
    } catch (error) {
      console.error('Error cargando saldo disponible:', error);
    }
  };

  const saveBankData = async () => {
    if (!bankData.banco || !bankData.numeroCuenta || !bankData.rutTitular || !bankData.nombreTitular) {
      toast({
        title: '❌ Datos incompletos',
        description: 'Completa todos los datos bancarios',
        variant: 'destructive',
        duration: 3000,
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('guardar_datos_bancarios', {
        p_usuario_id: user.id,
        p_banco: bankData.banco,
        p_tipo_cuenta: bankData.tipoCuenta,
        p_numero_cuenta: bankData.numeroCuenta,
        p_rut_titular: bankData.rutTitular,
        p_nombre_titular: bankData.nombreTitular,
        p_email: bankData.email,
        p_es_principal: savedBankAccounts.length === 0,
      });

      if (error) throw error;

      toast({
        title: '✅ Datos guardados',
        description: 'Tus datos bancarios se guardaron correctamente',
        duration: 3000,
      });

      await loadSavedBankAccounts();
      return true;
    } catch (error) {
      console.error('Error guardando datos bancarios:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
        duration: 4000,
      });
      return false;
    }
  };

  const handleWithdraw = async () => {
    const montoNum = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(montoNum) || montoNum <= 0) {
      toast({
        title: '❌ Monto invalido',
        description: 'Ingresa un monto valido para retirar',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    if (!bankData.banco || !bankData.numeroCuenta || !bankData.rutTitular || !bankData.nombreTitular) {
      toast({
        title: '❌ Datos incompletos',
        description: 'Completa todos los datos bancarios',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    const montoRetiro = Number(withdrawAmount);

    if (montoRetiro < 1000) {
      toast({
        title: '❌ Monto minimo',
        description: 'El monto minimo de retiro es $1.000 CLP',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessingWithdraw(true);

      const { saldoCLP: saldoActual } = (await loadSaldoDisponible()) || {};

      if (montoRetiro > saldoActual) {
        toast({
          title: '❌ Saldo insuficiente',
          description: `Solo tienes $${(saldoActual || 0).toLocaleString('es-CL')} disponibles para retirar.`,
          variant: 'destructive',
          duration: 5000,
        });
        setIsProcessingWithdraw(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          banco_retiro: bankData.banco,
          tipo_cuenta_retiro: bankData.tipoCuenta,
          numero_cuenta_retiro: bankData.numeroCuenta,
          rut_titular_retiro: bankData.rutTitular,
          nombre_titular_retiro: bankData.nombreTitular,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error actualizando datos bancarios en usuarios:', updateError);
      }

      if (saveForFuture && !selectedBankAccountId) {
        await saveBankData();
      }

      const { data, error } = await supabase.rpc('solicitar_retiro', {
        p_user_id: user.id,
        p_monto_clp: montoRetiro,
      });

      if (error) {
        if (error.message.includes('Saldo insuficiente') || error.message.includes('insuficiente')) {
          toast({
            title: '❌ Saldo insuficiente',
            description: error.message,
            variant: 'destructive',
            duration: 5000,
          });
        } else if (error.message.includes('minimo') || error.message.includes('1000')) {
          toast({
            title: '❌ Monto minimo',
            description: error.message,
            variant: 'destructive',
            duration: 5000,
          });
        } else if (error.message.includes('bancarios')) {
          toast({
            title: '❌ Datos bancarios faltantes',
            description: error.message,
            variant: 'destructive',
            duration: 5000,
          });
        } else {
          throw error;
        }
        setIsProcessingWithdraw(false);
        return;
      }

      toast({
        title: '✅ Solicitud de retiro creada',
        description: `Se procesara tu retiro de $${montoRetiro.toLocaleString('es-CL')} CLP en las proximas 24-48 horas`,
        duration: 5000,
      });

      await loadSaldoDisponible();
      setWithdrawAmount('');
      setShowWithdrawModal(false);
      await loadWithdrawHistory(withdrawHistoryLimit);
    } catch (error) {
      console.error('Error retiro:', error);
      toast({
        title: '❌ Error al procesar retiro',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  const handleGetQuote = async () => {
    const monto = Number(exchangeAmount);
    if (!monto || monto <= 0) {
      toast({
        title: '❌ Monto invalido',
        description: 'Ingresa un monto en pesos para convertir',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }
    if (monto < 1000) {
      toast({
        title: '❌ Monto minimo',
        description: 'El monto minimo para cambiar es de $1.000 CLP',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoadingQuote(true);
      setExchangeQuote(null);

      const { data, error } = await supabase.rpc('cotizar_cambio_clp_usd', {
        p_monto_clp: monto,
      });

      if (error) throw error;

      setExchangeQuote(data);
    } catch (error) {
      console.error('Error cotizando cambio:', error);
      toast({
        title: '❌ Error al cotizar',
        description: error.message,
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleExecuteExchange = async () => {
    const monto = Number(exchangeAmount);
    if (!monto || monto <= 0) return;
    if (monto < 1000) {
      toast({
        title: '❌ Monto minimo',
        description: 'El monto minimo para cambiar es de $1.000 CLP',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessingExchange(true);

      const { data, error } = await supabase.rpc('convertir_clp_a_usd', {
        p_user_id: user.id,
        p_monto_clp: monto,
      });

      if (error) {
        if (error.message.includes('insuficiente')) {
          toast({
            title: '❌ Saldo insuficiente',
            description: error.message,
            variant: 'destructive',
            duration: 5000,
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: '✅ Cambio realizado',
        description: `Convertiste $${monto.toLocaleString('es-CL')} CLP a $${Number(data.monto_usd).toFixed(2)} USD`,
        duration: 5000,
      });

      await loadSaldoDisponible();
      setExchangeAmount('');
      setExchangeQuote(null);
      setShowExchangeModal(false);
    } catch (error) {
      console.error('Error ejecutando cambio:', error);
      toast({
        title: '❌ Error al realizar cambio',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsProcessingExchange(false);
    }
  };

  const deleteBankAccount = async (accountId) => {
    try {
      const { error } = await supabase.from('datos_bancarios').delete().eq('id', accountId);

      if (error) throw error;

      toast({
        title: '✅ Cuenta eliminada',
        description: 'La cuenta bancaria se elimino correctamente',
        duration: 3000,
      });

      await loadSavedBankAccounts();

      if (selectedBankAccountId === accountId) {
        setSelectedBankAccountId(null);
        setBankData({
          banco: '',
          tipoCuenta: 'corriente',
          numeroCuenta: '',
          rutTitular: '',
          nombreTitular: '',
          email: '',
        });
      }
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const chartHistorial = useMemo(() => {
    if (!lucro || historial.length === 0) return historial;
    const sCLP = saldoDisponible || 0;
    const ueUSD = lucro?.valor_actual || 0;
    const sUSD = saldoUSD || 0;
    const rawTotal = sCLP + ueUSD;
    const f = fxRate > 0 ? fxRate : 930;
    const factor = rawTotal > 0 ? sCLP / rawTotal / f + ueUSD / rawTotal : 0;
    if (factor <= 0) return historial;
    return historial.map((h) => ({
      ...h,
      patrimonio_total_real: Number(h.patrimonio_total_real || 0) * factor + sUSD,
    }));
  }, [historial, lucro, fxRate, saldoDisponible, saldoUSD]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1D2B] dark:text-white tracking-tight">
            Mis Unidades
          </h2>
          <p className="text-sm text-[#6E6E6E] dark:text-[#9CA3AF] mt-1">
            Resumen de tu cartera de UEs
          </p>
        </div>
        <MetricsSkeleton />
        <div className="animate-pulse bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#C9A227]/10 rounded-2xl p-6 h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1D2B] dark:text-white tracking-tight">
          Mis Unidades
        </h2>
        <p className="text-sm text-[#6E6E6E] dark:text-[#9CA3AF] mt-1">
          Resumen de tu cartera de UEs
        </p>
      </div>

      {lucro ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total UEs — col-span-2 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.05 }}
            {...springHover}
            className="lg:col-span-2 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#C9A227]/15 hover:border-[#C9A227]/40 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_32px_-4px_rgba(201,162,39,0.12)] transition-shadow duration-300 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A227]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Total UEs
                </p>
                <div className="p-2 bg-[#C9A227]/10 rounded-xl group-hover:bg-[#C9A227]/20 transition-colors duration-300">
                  <PieChart className="w-4 h-4 text-[#C9A227]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight font-mono tabular-nums">
                {Number(lucro.ue_totales).toLocaleString('es-CL', {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
              </p>
            </div>
          </motion.div>

          {/* Valor de UEs — col-span-2 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.1 }}
            {...springHover}
            className="lg:col-span-2 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#C9A227]/20 hover:border-[#C9A227]/50 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_32px_-4px_rgba(201,162,39,0.18)] transition-shadow duration-300 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A227]/8 via-[#C9A227]/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C9A227]/50 to-transparent" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Valor de UEs
                </p>
                <div className="p-2 bg-[#C9A227]/15 rounded-xl group-hover:bg-[#C9A227]/25 transition-colors duration-300">
                  <Wallet className="w-4 h-4 text-[#C9A227]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#C9A227] tracking-tight font-mono tabular-nums">
                {formatUSD(lucro.valor_actual)}
              </p>
              <p className="text-[11px] text-[#6E6E6E]/60 dark:text-[#9CA3AF]/60 mt-1 font-light">
                {formatCLP(lucro.valor_actual, fxRate)}
              </p>
            </div>
          </motion.div>

          {/* Inversion Total — col-span-1 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.15 }}
            {...springHover}
            className="lg:col-span-1 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#C9A227]/15 hover:border-[#C9A227]/40 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_32px_-4px_rgba(201,162,39,0.12)] transition-shadow duration-300 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A227]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Inversion Total
                </p>
                <div className="p-2 bg-[#C9A227]/10 rounded-xl group-hover:bg-[#C9A227]/20 transition-colors duration-300">
                  <TrendingUp className="w-4 h-4 text-[#C9A227]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight font-mono tabular-nums">
                {formatUSD(lucro.total_invertido)}
              </p>
              <p className="text-[11px] text-[#6E6E6E]/60 dark:text-[#9CA3AF]/60 mt-1 font-light">
                {formatCLP(lucro.total_invertido, fxRate)}
              </p>
            </div>
          </motion.div>

          {/* Rentabilidad — col-span-1 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.2 }}
            {...springHover}
            className={`lg:col-span-1 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border rounded-2xl p-5 shadow-sm transition-shadow duration-300 group ${
              Number(lucro.lucro_total) >= 0
                ? 'border-[#10B981]/20 hover:border-[#10B981]/50 hover:shadow-[0_8px_32px_-4px_rgba(16,185,129,0.15)]'
                : 'border-[#EF4444]/20 hover:border-[#EF4444]/50 hover:shadow-[0_8px_32px_-4px_rgba(239,68,68,0.15)]'
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                Number(lucro.lucro_total) >= 0
                  ? 'from-[#10B981]/5 via-transparent to-transparent'
                  : 'from-[#EF4444]/5 via-transparent to-transparent'
              }`}
            />
            <div
              className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-current to-transparent ${
                Number(lucro.lucro_total) >= 0 ? 'text-[#10B981]/30' : 'text-[#EF4444]/30'
              }`}
            />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Rentabilidad
                </p>
                <div
                  className={`p-2 rounded-xl transition-colors duration-300 ${
                    Number(lucro.lucro_total) >= 0
                      ? 'bg-[#10B981]/10 group-hover:bg-[#10B981]/20'
                      : 'bg-[#EF4444]/10 group-hover:bg-[#EF4444]/20'
                  }`}
                >
                  {Number(lucro.lucro_total) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
                  Number(lucro.lucro_total) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}
              >
                {Number(lucro.porcentaje_lucro).toFixed(2)}%
              </p>
              <p
                className={`text-[11px] mt-1 font-light ${
                  Number(lucro.lucro_total) >= 0 ? 'text-[#10B981]/60' : 'text-[#EF4444]/60'
                }`}
              >
                {Number(lucro.lucro_total) >= 0 ? '+' : ''}
                {formatUSD(Math.abs(Number(lucro.lucro_total)))} &middot;{' '}
                {formatCLP(Math.abs(Number(lucro.lucro_total)), fxRate)}
              </p>
            </div>
          </motion.div>

          {/* Saldo en Pesos — col-span-1 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.25 }}
            {...springHover}
            onClick={() => setShowExchangeModal(true)}
            className="lg:col-span-1 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#8B5CF6]/15 hover:border-[#8B5CF6]/50 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_32px_-4px_rgba(139,92,246,0.12)] transition-shadow duration-300 group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/20 to-transparent" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Saldo en Pesos
                </p>
                <div className="p-2 bg-[#8B5CF6]/10 rounded-xl group-hover:bg-[#8B5CF6]/20 transition-colors duration-300">
                  <DollarSign className="w-4 h-4 text-[#8B5CF6]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight font-mono tabular-nums">
                ${saldoDisponible.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-[#8B5CF6]/70 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 font-medium">
                <ArrowRightLeft className="w-3 h-3" />
                Cambiar a USD
              </p>
            </div>
          </motion.div>

          {/* Saldo en Dolares — col-span-1 */}
          <motion.div
            {...cardSpring}
            transition={{ ...cardSpring.transition, delay: 0.3 }}
            {...springHover}
            className="lg:col-span-1 relative overflow-hidden bg-white/70 dark:bg-[#1A1D2B]/70 backdrop-blur-xl border border-[#10B981]/15 hover:border-[#10B981]/50 rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_32px_-4px_rgba(16,185,129,0.12)] transition-shadow duration-300 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#10B981]/30 to-transparent" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-[11px] font-semibold tracking-widest uppercase">
                  Saldo en Dolares
                </p>
                <div className="p-2 bg-[#10B981]/10 rounded-xl group-hover:bg-[#10B981]/20 transition-colors duration-300">
                  <DollarSign className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight font-mono tabular-nums">
                ${saldoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
              <p className="text-[11px] text-[#10B981]/60 mt-1 font-light">
                Para compra de UEs
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <EmptyState
          icon={PieChart}
          title="No tienes unidades registradas"
          subtitle="Tus metricas de UEs apareceran aqui cuando esten disponibles"
        />
      )}

      <PatrimonioChart
        historial={chartHistorial}
        fxRate={fxRate}
        lucro={lucro}
        saldoCLP={saldoDisponible}
        saldoUSD={saldoUSD}
      />

      {/* BOTONES DE ACCION */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.35 }}
        className="flex justify-center gap-4 flex-wrap"
      >
        <motion.button
          whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          onClick={() => setShowExchangeModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-[#C9A227] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E4C65A] text-[#1A1D2B] text-sm font-bold rounded-2xl shadow-lg hover:shadow-[0_8px_25px_-4px_rgba(201,162,39,0.4)] transition-all duration-300 flex items-center gap-2.5 w-full sm:w-auto"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Cambiar CLP a USD
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          onClick={() => setShowWithdrawModal(true)}
          className="px-6 py-3 bg-white dark:bg-[#1A1D2B] hover:bg-red-50 dark:hover:bg-red-950/20 text-[#EF4444] text-sm font-bold rounded-2xl border-2 border-[#EF4444]/20 hover:border-[#EF4444]/50 shadow-sm hover:shadow-[0_8px_25px_-4px_rgba(239,68,68,0.2)] transition-all duration-300 flex items-center gap-2.5 w-full sm:w-auto"
        >
          <DollarSign className="w-4 h-4" />
          Retirar Fondos
        </motion.button>
      </motion.div>

      {/* HISTORIAL DE RETIROS */}
      <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C9A227]/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-[#C9A227]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1A1D2B] dark:text-white">
                Historial de Retiros
              </h3>
              <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF]">
                Seguimiento de tus solicitudes
              </p>
            </div>
          </div>
        </div>

        {withdrawHistory.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={DollarSign}
              title="No tienes retiros registrados"
              subtitle="Tus solicitudes apareceran aqui"
            />
          </div>
        ) : (
          <div className="overflow-x-auto px-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">
                    Monto
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">
                    Banco
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">
                    Estado
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">
                    Cuenta
                  </th>
                </tr>
              </thead>
              <tbody>
                {withdrawHistory.map((retiro, index) => (
                  <motion.tr
                    key={retiro.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.05 }}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(retiro.fecha_solicitud).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                        {new Date(retiro.fecha_solicitud).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-base font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                        ${Number(retiro.monto_clp).toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {retiro.banco_destino || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {retiro.tipo_cuenta || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        estado={retiro.estado}
                        motivoRechazo={retiro.motivo_rechazo}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                        ***{retiro.numero_cuenta?.slice(-4) || '****'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMoreWithdraws && (
          <div className="flex justify-center px-5 py-4 border-t border-[#C9A227]/10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                const newLimit = withdrawHistoryLimit + 3;
                setWithdrawHistoryLimit(newLimit);
                await loadWithdrawHistory(newLimit);
              }}
              className="px-4 py-2 bg-[#C9A227]/10 hover:bg-[#C9A227]/20 text-[#C9A227] text-xs font-medium rounded-lg transition-colors duration-200 flex items-center gap-1.5"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Ver mas retiros
            </motion.button>
          </div>
        )}

        <div className="px-5 py-3 text-center border-t border-[#C9A227]/10">
          <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF]">
            Mostrando{' '}
            <span className="font-medium text-[#1A1D2B] dark:text-white">
              {withdrawHistory.length}
            </span>
            {withdrawHistory.length === 1 ? ' retiro' : ' retiros'}
            {!hasMoreWithdraws && withdrawHistory.length > 0 && (
              <span className="ml-1 text-[#6E6E6E]/60">(todos)</span>
            )}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL: CAMBIO CLP → USD                       */}
      {/* ============================================ */}
      <AnimatePresence>
        {showExchangeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-[#0B0C10]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessingExchange && setShowExchangeModal(false)}
            onKeyDown={(e) =>
              e.key === 'Escape' && !isProcessingExchange && setShowExchangeModal(false)
            }
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1D2B] rounded-2xl p-8 max-w-lg w-[calc(100%-2rem)] mx-4 shadow-2xl border border-[#8B5CF6]/20 shadow-[#8B5CF6]/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#8B5CF6]/10 rounded-xl">
                    <ArrowRightLeft className="w-8 h-8 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Cambiar Divisas
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CLP &rarr; USD
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExchangeModal(false)}
                  disabled={isProcessingExchange}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">
                      Saldo CLP
                    </p>
                    <p className="text-xl font-bold text-[#8B5CF6] mt-1 font-mono tabular-nums">
                      ${saldoDisponible.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider">
                      Saldo USD
                    </p>
                    <p className="text-xl font-bold text-[#10B981] mt-1 font-mono tabular-nums">
                      ${saldoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Monto a cambiar (CLP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      value={exchangeAmount}
                      onChange={(e) => {
                        setExchangeAmount(e.target.value);
                        setExchangeQuote(null);
                      }}
                      placeholder="Ej: 100000"
                      disabled={isProcessingExchange}
                      autoFocus
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all text-gray-900 dark:text-white font-semibold text-lg"
                    />
                  </div>
                  {saldoDisponible > 0 && (
                    <button
                      onClick={() => {
                        setExchangeAmount(String(saldoDisponible));
                        setExchangeQuote(null);
                      }}
                      className="mt-2 text-xs text-[#8B5CF6] hover:underline"
                    >
                      Usar todo mi saldo (${saldoDisponible.toLocaleString('es-CL')})
                    </button>
                  )}
                </div>

                {!exchangeQuote && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGetQuote}
                    disabled={isLoadingQuote || !exchangeAmount || Number(exchangeAmount) <= 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-indigo-600 hover:from-[#9B6CF7] hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoadingQuote ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Cotizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Cotizar Cambio
                      </>
                    )}
                  </motion.button>
                )}

                {exchangeQuote && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl p-6 border-2 border-[#8B5CF6]/20">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Resumen del cambio
                        </span>
                        <span className="text-xs bg-[#8B5CF6]/10 text-[#8B5CF6] px-3 py-1 rounded-full font-bold">
                          1 USD = $
                          {Number(exchangeQuote.tasa).toLocaleString('es-CL', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          CLP
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Envias</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                            ${Number(exchangeQuote.monto_clp).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Recibes</span>
                          <span className="text-2xl font-extrabold text-[#10B981] font-mono tabular-nums">
                            ${Number(exchangeQuote.monto_usd).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setExchangeQuote(null)}
                        disabled={isProcessingExchange}
                        className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Volver
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleExecuteExchange}
                        disabled={isProcessingExchange}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#10B981] to-green-600 hover:from-[#10B981] hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessingExchange ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-5 h-5" />
                            Confirmar Cambio
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>💱 Tipo de cambio:</strong> El tipo de cambio se calcula en tiempo
                    real. Una vez confirmado, la conversion es instantanea y se refleja en tus
                    saldos.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* MODAL: RETIRO DE FONDOS                       */}
      {/* ============================================ */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-[#0B0C10]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessingWithdraw && setShowWithdrawModal(false)}
            onKeyDown={(e) =>
              e.key === 'Escape' && !isProcessingWithdraw && setShowWithdrawModal(false)
            }
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1D2B] rounded-2xl p-8 max-w-2xl w-[calc(100%-2rem)] mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-[#EF4444]/20 shadow-[#EF4444]/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#EF4444]/10 rounded-xl">
                    <DollarSign className="w-8 h-8 text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Retirar Fondos
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible:{' '}
                      <span className="font-bold text-[#10B981]">
                        ${saldoDisponible.toLocaleString('es-CL')} CLP
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isProcessingWithdraw}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Monto a Retirar (CLP)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Ej: 50000"
                    disabled={isProcessingWithdraw}
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none transition-all text-gray-900 dark:text-white font-semibold text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Monto minimo: $1.000 CLP</p>
                </div>

                {savedBankAccounts.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
                      Cuentas Guardadas
                    </h4>
                    <div className="space-y-2">
                      {savedBankAccounts.map((cuenta) => (
                        <div
                          key={cuenta.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedBankAccountId === cuenta.id
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                          }`}
                          onClick={() => {
                            setSelectedBankAccountId(cuenta.id);
                            loadBankDataFromSaved(cuenta);
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {cuenta.banco}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {cuenta.tipo_cuenta.toUpperCase()} &middot; ***
                              {cuenta.numero_cuenta.slice(-4)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Eliminar esta cuenta?')) {
                                deleteBankAccount(cuenta.id);
                              }
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBankAccountId(null);
                        setBankData({
                          banco: '',
                          tipoCuenta: 'corriente',
                          numeroCuenta: '',
                          rutTitular: bankData.rutTitular,
                          nombreTitular: bankData.nombreTitular,
                          email: bankData.email,
                        });
                      }}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Usar nueva cuenta
                    </button>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 space-y-4 border-2 border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Datos Bancarios
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Banco
                      </label>
                      <select
                        value={bankData.banco}
                        onChange={(e) => setBankData({ ...bankData, banco: e.target.value })}
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Banco de Chile">Banco de Chile</option>
                        <option value="Banco Santander">Banco Santander</option>
                        <option value="Banco Estado">Banco Estado</option>
                        <option value="BCI">BCI</option>
                        <option value="Scotiabank">Scotiabank</option>
                        <option value="Banco Itau">Banco Itau</option>
                        <option value="Banco Security">Banco Security</option>
                        <option value="Banco Falabella">Banco Falabella</option>
                        <option value="Banco Ripley">Banco Ripley</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Tipo de Cuenta
                      </label>
                      <select
                        value={bankData.tipoCuenta}
                        onChange={(e) =>
                          setBankData({ ...bankData, tipoCuenta: e.target.value })
                        }
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                      >
                        <option value="corriente">Cuenta Corriente</option>
                        <option value="vista">Cuenta Vista</option>
                        <option value="ahorro">Cuenta de Ahorro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Numero de Cuenta
                    </label>
                    <input
                      type="text"
                      value={bankData.numeroCuenta}
                      onChange={(e) =>
                        setBankData({ ...bankData, numeroCuenta: e.target.value })
                      }
                      placeholder="1234567890"
                      disabled={isProcessingWithdraw}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        RUT Titular
                      </label>
                      <input
                        type="text"
                        value={bankData.rutTitular}
                        onChange={(e) =>
                          setBankData({ ...bankData, rutTitular: e.target.value })
                        }
                        placeholder="12.345.678-9"
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Nombre Titular
                      </label>
                      <input
                        type="text"
                        value={bankData.nombreTitular}
                        onChange={(e) =>
                          setBankData({ ...bankData, nombreTitular: e.target.value })
                        }
                        placeholder="Juan Perez"
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Email de Confirmacion
                    </label>
                    <input
                      type="email"
                      value={bankData.email}
                      onChange={(e) => setBankData({ ...bankData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      disabled={isProcessingWithdraw}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20 outline-none text-sm"
                    />
                  </div>

                  {!selectedBankAccountId && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveForFuture"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="w-4 h-4 text-[#EF4444] border-gray-300 rounded focus:ring-[#EF4444]"
                      />
                      <label
                        htmlFor="saveForFuture"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        Guardar estos datos para futuros retiros
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>📝 Importante:</strong> El retiro sera procesado en un plazo de 24-48
                    horas habiles. Recibiras un email de confirmacion cuando se complete la
                    transferencia.
                  </p>
                </div>

                <div className="flex gap-4 pt-4 flex-col sm:flex-row">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={isProcessingWithdraw}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 w-full"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleWithdraw}
                    disabled={isProcessingWithdraw}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#EF4444] to-red-700 hover:from-[#EF4444] hover:to-red-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full"
                  >
                    {isProcessingWithdraw ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5" />
                        Confirmar Retiro
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyUnits;
