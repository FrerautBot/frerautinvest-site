import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Wallet, BarChart3, Loader2, TrendingUp, TrendingDown, MonitorPlay, Terminal, Menu, Waves, Wrench, Globe, Sparkles, RefreshCw, X, Maximize2, Minimize2, Brain, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// HELPERS Y UTILIDADES
// ============================================

const generateUUID = () => crypto.randomUUID();

const isInstitutionalUser = (user) => user?.email === 'frerautgroups.a@gmail.com';
const isAdminUser = (user) => user?.user_metadata?.role === 'admin';

const parseToolArguments = (argsString) => {
  try {
    return typeof argsString === 'object' ? argsString : JSON.parse(argsString);
  } catch (error) {
    console.error('❌ Error parsing args:', error);
    return {};
  }
};

const normalizeMessage = (msg) => {
  const m = { ...msg };
  if (!m.metadata) m.metadata = {};
  if (m.tool_calls) {
    m.metadata.tool_calls = m.tool_calls;
    delete m.tool_calls;
  }
  if (m.tool_call_id) {
    m.metadata.tool_call_id = m.tool_call_id;
    delete m.tool_call_id;
  }
  if (m.role) m.tipo_rol = m.role;
  return m;
};

// 🧹 LIMPIADOR DE PAYLOAD
const cleanPayload = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') return undefined;
    if (value === undefined) return null;
    return value;
  }));
};

// 💰 FINANCIAL MODE DETECTOR
const detectFinancialContext = (text) => {
  const financialKeywords = [
    'mercado', 'inversión', 'precio', 'acción', 'bono', 'divisa',
    'dólar', 'euro', 'peso', 'trading', 'portafolio', 'cartera',
    'análisis', 'rendimiento', 'rentabilidad', 'ganancia', 'pérdida',
    'riesgo', 'volatilidad', 'liquidez', 'patrimonio', 'activo',
    'pasivo', 'balance', 'flujo', 'cash', 'capital', 'dividend',
    'interés', 'tasa', 'inflación', 'deuda', 'crédito', 'bolsa',
    'índice', 'dow', 'nasdaq', 'sp500', 's&p', 'bitcoin', 'cripto',
    'forex', 'commodity', 'oro', 'plata', 'petróleo', 'warren buffett',
    'wall street', 'financiero', 'bancario', 'economía', 'fiscal'
  ];

  const lowerText = text.toLowerCase();
  return financialKeywords.some(keyword => lowerText.includes(keyword));
};




// ============================================
// 📈 STOCK CHART HELPER
// ============================================

const getStockChart = async (ticker, period = '1d', interval = '5m') => {
  try {
    const { data, error } = await supabase.functions.invoke('stock-chart', {
      body: { ticker, period, interval }
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Error obteniendo gráfico:', err);
    return { success: false, error: err.message };
  }
};


// ============================================
// 📊 STOCK CHART COMPONENT CON GRÁFICO VISUAL
// ============================================

const StockChartDisplay = ({ data }) => {
  if (!data || !data.success) return null;

  const { meta, chartData } = data;
  const changeColor = meta.changePercent >= 0 ? '#10b981' : '#ef4444';
  const textChangeColor = meta.changePercent >= 0 ? 'text-green-400' : 'text-red-400';
  const bgColor = meta.changePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10';
  const borderColor = meta.changePercent >= 0 ? 'border-green-500/30' : 'border-red-500/30';

  const prices = chartData.map(d => d.close).filter(p => p !== null && !isNaN(p));
  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 800;
  const height = 300;
  const padding = 50;

  const points = chartData.map((point, i) => {
    const x = padding + (i / Math.max(chartData.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.close - minPrice) / priceRange) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} border ${borderColor} rounded-2xl p-4 space-y-4 mt-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-amber-300">{meta.symbol}</h3>
          <p className="text-xs text-slate-400">{meta.exchangeName}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">${meta.currentPrice.toFixed(2)}</div>
          <div className={`text-sm font-semibold ${textChangeColor} flex items-center justify-end gap-1`}>
            {meta.changePercent >= 0 ? '↗' : '↘'}
            {meta.changePercent >= 0 ? '+' : ''}{meta.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-950/50 rounded-2xl overflow-hidden p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: '250px' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
            const y = height - padding - percent * (height - padding * 2);
            const price = minPrice + percent * priceRange;
            return (
              <g key={`grid-${i}`}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
                <text x={padding - 10} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">${price.toFixed(2)}</text>
              </g>
            );
          })}
          <defs>
            <linearGradient id={`gradient-${meta.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={changeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={changeColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#gradient-${meta.symbol})`} />
          <path d={linePath} fill="none" stroke={changeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, i) => {
            if (i % Math.max(Math.floor(points.length / 10), 1) === 0) {
              return <circle key={`point-${i}`} cx={point.x} cy={point.y} r="3" fill={changeColor} opacity="0.8" />;
            }
            return null;
          })}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
            const index = Math.floor(percent * Math.max(chartData.length - 1, 0));
            const x = padding + percent * (width - padding * 2);
            const timeStr = chartData[index]?.timestamp
              ? new Date(chartData[index].timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
              : '';
            return <text key={`time-${i}`} x={x} y={height - 10} fill="#94a3b8" fontSize="10" textAnchor="middle">{timeStr}</text>;
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1">Apertura</div>
          <div className="font-semibold text-amber-200">${meta.previousClose.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1">Mínimo</div>
          <div className="font-semibold text-amber-200">${meta.range.low.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/50 rounded-2xl p-3 text-center">
          <div className="text-slate-500 mb-1">Máximo</div>
          <div className="font-semibold text-amber-200">${meta.range.high.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
        <span>{chartData.length} puntos de datos</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          En vivo • {meta.currency}
        </span>
      </div>
    </motion.div>
  );
};


// ============================================
// ✨ CYBER SPARKLES COMPONENT CON MODO DORADO
// ============================================

const CyberSparkles = ({ isFinancialMode = false }) => {
  const sparkles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3
  }));

  const color1 = isFinancialMode ? 'via-amber-400' : 'via-amber-400';
  const color2 = isFinancialMode ? 'via-yellow-400' : 'via-blue-400';
  const glowColor = isFinancialMode ? 'bg-amber-300' : 'bg-amber-300';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1.2, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut"
          }}
        >
          {/* Destello cruz */}
          <div className="relative" style={{ width: sparkle.size * 4, height: sparkle.size * 4 }}>
            <div
              className={`absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent ${color1} to-transparent`}
              style={{ transform: 'translateY(-50%)' }}
            />
            <div
              className={`absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent ${color2} to-transparent`}
              style={{ transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Glow central */}
          <motion.div
            className={`absolute top-1/2 left-1/2 rounded-full ${glowColor}`}
            style={{
              width: sparkle.size,
              height: sparkle.size,
              transform: 'translate(-50%, -50%)',
              boxShadow: isFinancialMode
                ? '0 0 10px rgba(245, 158, 11, 0.8), 0 0 20px rgba(234, 179, 8, 0.6)'
                : '0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(59, 130, 246, 0.6)',
            }}
            animate={{
              boxShadow: isFinancialMode
                ? [
                  '0 0 10px rgba(245, 158, 11, 0.8), 0 0 20px rgba(234, 179, 8, 0.6)',
                  '0 0 20px rgba(245, 158, 11, 1), 0 0 40px rgba(234, 179, 8, 0.8)',
                  '0 0 10px rgba(245, 158, 11, 0.8), 0 0 20px rgba(234, 179, 8, 0.6)',
                ]
                : [
                  '0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(59, 130, 246, 0.6)',
                  '0 0 20px rgba(34, 211, 238, 1), 0 0 40px rgba(59, 130, 246, 0.8)',
                  '0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(59, 130, 246, 0.6)',
                ]
            }}
            transition={{
              duration: sparkle.duration * 0.5,
              repeat: Infinity,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};


// ============================================
// ⚡ SEARCH FLARES COMPONENT (DESTELLOS AL BUSCAR)
// ============================================

const SearchFlares = ({ isFinancialMode = false }) => {
  const flares = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    duration: 0.8 + Math.random() * 0.4,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    size: 30 + Math.random() * 50,
    rotation: Math.random() * 360
  }));

  const gradientColors = isFinancialMode
    ? 'rgba(245,158,11,0.8) 0%, rgba(234,179,8,0.6) 30%'
    : 'rgba(6,182,212,0.8) 0%, rgba(59,130,246,0.6) 30%';

  const crossColor1 = isFinancialMode ? 'via-amber-400' : 'via-amber-400';
  const crossColor2 = isFinancialMode ? 'via-yellow-400' : 'via-blue-400';
  const ringColor = isFinancialMode ? 'rgba(245,158,11,0.6)' : 'rgba(6,182,212,0.6)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flares.map((flare) => (
        <motion.div
          key={flare.id}
          className="absolute"
          style={{
            left: `${flare.x}%`,
            top: `${flare.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.8, 0],
            scale: [0, 1.5, 1, 0],
          }}
          transition={{
            duration: flare.duration,
            repeat: Infinity,
            delay: flare.delay,
            ease: "easeOut"
          }}
        >
          {/* Resplandor principal */}
          <motion.div
            className="absolute"
            style={{
              width: flare.size,
              height: flare.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${gradientColors}, transparent 70%)`,
              filter: 'blur(10px)',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: flare.duration * 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Destello en cruz */}
          <motion.div
            className="absolute"
            style={{
              width: flare.size * 1.5,
              height: flare.size * 1.5,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              rotate: [flare.rotation, flare.rotation + 90, flare.rotation + 180],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: flare.duration,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className={`absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${crossColor1} to-transparent`}
              style={{ transform: 'translateY(-50%)', filter: 'blur(2px)' }} />
            <div className={`absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent ${crossColor2} to-transparent`}
              style={{ transform: 'translateX(-50%)', filter: 'blur(2px)' }} />
          </motion.div>

          {/* Anillo expansivo */}
          <motion.div
            className="absolute"
            style={{
              width: flare.size * 0.7,
              height: flare.size * 0.7,
              borderRadius: '50%',
              border: `2px solid ${ringColor}`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [0.5, 2, 2.5],
              opacity: [1, 0.5, 0],
            }}
            transition={{
              duration: flare.duration * 1.2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};


// ============================================
// 🔍 TOOL SEARCH INDICATOR (INDICADOR DE BÚSQUEDA CON DESTELLOS)
// ============================================

const ToolSearchIndicator = ({ toolName, isSearching, isFinancialMode = false }) => {
  if (!isSearching) return null;

  const getToolIcon = (name) => {
    if (name?.includes('sql')) return Terminal;
    if (name?.includes('browser')) return Globe;
    if (name?.includes('fetch') || name?.includes('market')) return TrendingUp;
    return Sparkles;
  };

  const Icon = getToolIcon(toolName);

  const bgGradient = isFinancialMode
    ? 'from-amber-500/20 to-yellow-500/20'
    : 'from-amber-500/20 to-blue-500/20';

  const borderColor = isFinancialMode ? 'border-amber-400/50' : 'border-amber-400/50';
  const textColor = isFinancialMode ? 'text-amber-300' : 'text-amber-300';
  const barGradient = isFinancialMode ? 'from-amber-500 to-yellow-400' : 'from-amber-500 to-blue-400';
  const progressGradient = isFinancialMode
    ? 'from-amber-500 via-yellow-500 to-amber-500'
    : 'from-amber-500 via-blue-500 to-amber-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative"
    >
      {/* Fondo con destellos */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <SearchFlares isFinancialMode={isFinancialMode} />
      </div>

      {/* Contenido */}
      <div className={`relative bg-gradient-to-r ${bgGradient} border-2 ${borderColor} rounded-2xl p-4 backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <motion.div
            className="relative"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Icon className={`w-6 h-6 ${textColor}`} />

            {/* Anillos pulsantes alrededor del icono */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-full border-2 ${isFinancialMode ? 'border-amber-400' : 'border-amber-400'}`}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: [1, 2, 2.5],
                  opacity: [0.8, 0.3, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut"
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '24px',
                  height: '24px',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </motion.div>

          <div className="flex-1">
            <motion.div
              className={`text-sm font-bold ${textColor}`}
              animate={{
                textShadow: isFinancialMode
                  ? [
                    '0 0 10px rgba(245, 158, 11, 0.5)',
                    '0 0 20px rgba(245, 158, 11, 1)',
                    '0 0 10px rgba(245, 158, 11, 0.5)',
                  ]
                  : [
                    '0 0 10px rgba(6, 182, 212, 0.5)',
                    '0 0 20px rgba(6, 182, 212, 1)',
                    '0 0 10px rgba(6, 182, 212, 0.5)',
                  ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              Buscando información
            </motion.div>
            <div className={`text-xs ${isFinancialMode ? 'text-amber-400/70' : 'text-amber-400/70'} font-mono`}>
              {toolName || 'Ejecutando herramienta'}
            </div>
          </div>

          {/* Barras de loading animadas */}
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`w-1 bg-gradient-to-t ${barGradient} rounded-full`}
                animate={{
                  height: ['10px', '25px', '10px'],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>

        {/* Línea de progreso infinita */}
        <div className="mt-2 h-1 bg-slate-900/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${progressGradient}`}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ width: '50%' }}
          />
        </div>
      </div>
    </motion.div>
  );
};


// ============================================
// 🌊✨ WAVE LOADER CON DESTELLOS Y MODO DORADO
// ============================================

const WaveLoader = ({ isFinancialMode = false }) => {
  const gradientId = isFinancialMode ? 'wave-gradient-gold' : 'wave-gradient';
  const textColor = isFinancialMode ? 'text-amber-400' : 'text-amber-400';
  const particleColor = isFinancialMode ? 'bg-amber-400' : 'bg-amber-400';
  const particleShadow = isFinancialMode ? '0 0 6px rgba(245, 158, 11, 0.8)' : '0 0 6px rgba(6, 182, 212, 0.8)';
  const dropShadowColor = isFinancialMode
    ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.3))'
    : 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))';

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 py-6 px-8">
      {/* ✨ Destellos de fondo */}
      <CyberSparkles isFinancialMode={isFinancialMode} />

      {/* 🌊 Olas SVG */}
      <div className="relative z-10">
        <svg viewBox="0 0 120 28" xmlns="http://www.w3.org/2000/svg" className="w-32 h-8"
          style={{ filter: dropShadowColor }}>
          <defs>
            {isFinancialMode ? (
              <linearGradient id="wave-gradient-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            ) : (
              <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            )}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M0,14 Q15,4 30,14 T60,14 T90,14 T120,14"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              animation: 'wave-flow 2.5s ease-in-out infinite',
              opacity: 0.7
            }}
          />
          <path
            d="M0,18 Q15,8 30,18 T60,18 T90,18 T120,18"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              animation: 'wave-flow 2.5s ease-in-out infinite',
              animationDelay: '0.4s',
              opacity: 0.5
            }}
          />
          <path
            d="M0,22 Q15,12 30,22 T60,22 T90,22 T120,22"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{
              animation: 'wave-flow 2.5s ease-in-out infinite',
              animationDelay: '0.8s',
              opacity: 0.3
            }}
          />
        </svg>
      </div>

      {/* 💬 Texto con efecto holográfico */}
      <div className="relative z-10 flex items-center gap-1">
        <motion.span
          className={`text-sm font-medium ${textColor}`}
          animate={{
            textShadow: isFinancialMode
              ? [
                '0 0 10px rgba(245, 158, 11, 0.5)',
                '0 0 20px rgba(245, 158, 11, 0.8)',
                '0 0 10px rgba(245, 158, 11, 0.5)',
              ]
              : [
                '0 0 10px rgba(6, 182, 212, 0.5)',
                '0 0 20px rgba(6, 182, 212, 0.8)',
                '0 0 10px rgba(6, 182, 212, 0.5)',
              ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          {isFinancialMode ? 'Lake analizando mercados' : 'Lake está analizando'}
        </motion.span>
        <div className="flex gap-1">
          <motion.span
            className={`${textColor} text-lg font-bold`}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          >
            .
          </motion.span>
          <motion.span
            className={`${textColor} text-lg font-bold`}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          >
            .
          </motion.span>
          <motion.span
            className={`${textColor} text-lg font-bold`}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          >
            .
          </motion.span>
        </div>
      </div>

      {/* ⚡ Partículas orbitando */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 ${particleColor} rounded-full`}
            style={{
              boxShadow: particleShadow,
            }}
            animate={{
              x: [
                0,
                Math.cos((i * 120 + 0) * Math.PI / 180) * 50,
                Math.cos((i * 120 + 120) * Math.PI / 180) * 50,
                Math.cos((i * 120 + 240) * Math.PI / 180) * 50,
                0
              ],
              y: [
                0,
                Math.sin((i * 120 + 0) * Math.PI / 180) * 50,
                Math.sin((i * 120 + 120) * Math.PI / 180) * 50,
                Math.sin((i * 120 + 240) * Math.PI / 180) * 50,
                0
              ],
              scale: [1, 1.2, 1, 1.2, 1],
              opacity: [0.6, 1, 0.6, 1, 0.6],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.33,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes wave-flow {
          0%, 100% {
            transform: translateX(0) translateY(0);
            opacity: 0.7;
          }
          25% {
            transform: translateX(-5px) translateY(-2px);
            opacity: 0.9;
          }
          50% {
            transform: translateX(-10px) translateY(0);
            opacity: 1;
          }
          75% {
            transform: translateX(-5px) translateY(2px);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};


// ============================================
// TYPING ANIMATION COMPONENT
// ============================================

const TypingText = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}</span>;
};


// ============================================
// THINKING INDICATOR COMPONENT
// ============================================

const ThinkingIndicator = ({ stage }) => {
  const stages = {
    analyzing: { icon: Brain, text: 'Analizando contexto...', color: 'text-purple-400' },
    executing: { icon: Zap, text: 'Ejecutando herramientas...', color: 'text-yellow-400' },
    processing: { icon: Clock, text: 'Procesando datos...', color: 'text-blue-400' },
    generating: { icon: Sparkles, text: 'Generando respuesta...', color: 'text-amber-400' },
    complete: { icon: CheckCircle2, text: 'Completado', color: 'text-green-400' }
  };

  const current = stages[stage] || stages.processing;
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 text-xs"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Icon className={`w-4 h-4 ${current.color}`} />
      </motion.div>
      <span className={current.color}>{current.text}</span>
      <motion.div
        className="flex gap-1"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span>•</span>
        <span>•</span>
        <span>•</span>
      </motion.div>
    </motion.div>
  );
};


// ============================================
// LAKE LOGO COMPONENT CON ANIMACIÓN Y MODO DORADO
// ============================================

const LakeLogo = ({ size = 'md', className = '', isThinking = false, isFinancialMode = false }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const colors = 'from-amber-500 to-yellow-600';

  const shadowColor = 'shadow-amber-900/30';

  return (
    <motion.div
      className={`${sizes[size]} rounded-2xl bg-gradient-to-br ${colors} flex items-center justify-center shadow-lg ${shadowColor} ${className}`}
      animate={isThinking ? {
        scale: [1, 1.1, 1],
        boxShadow: isFinancialMode
          ? [
            '0 10px 30px rgba(245, 158, 11, 0.2)',
            '0 10px 50px rgba(245, 158, 11, 0.5)',
            '0 10px 30px rgba(245, 158, 11, 0.2)'
          ]
          : [
            '0 10px 30px rgba(6, 182, 212, 0.2)',
            '0 10px 50px rgba(6, 182, 212, 0.5)',
            '0 10px 30px rgba(6, 182, 212, 0.2)'
          ]
      } : {}}
      transition={{ duration: 2, repeat: isThinking ? Infinity : 0 }}
    >
      <Waves className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'} text-white`} />
    </motion.div>
  );
};


// ============================================
// TOOL EXECUTION BLOCK COMPONENT CON DESTELLOS
// ============================================

const ToolExecutionBlock = ({ toolCalls, isFinancialMode = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedTools, setAnimatedTools] = useState([]);
  const [searchingTool, setSearchingTool] = useState(null);
  const timerRef = useRef([]);

  useEffect(() => {
    // Clear any lingering timers from previous effect run
    timerRef.current.forEach(id => clearTimeout(id));
    timerRef.current = [];

    if (toolCalls && toolCalls.length > 0) {
      toolCalls.forEach((tool, index) => {
        const outerId = setTimeout(() => {
          setSearchingTool(tool.function.name);
          setAnimatedTools(prev => [...prev, tool]);

          const innerId = setTimeout(() => {
            if (index === toolCalls.length - 1) {
              setSearchingTool(null);
            }
          }, 1000);
          timerRef.current.push(innerId);
        }, index * 1500);
        timerRef.current.push(outerId);
      });
    }

    return () => {
      timerRef.current.forEach(id => clearTimeout(id));
      timerRef.current = [];
    };
  }, [toolCalls]);

  if (!toolCalls || toolCalls.length === 0) return null;

  const creationTools = toolCalls.filter(t => t.function.name === 'lake_create_tool');
  const refreshTools = toolCalls.filter(t => t.function.name === 'lake_refresh_tools');
  const executionTools = toolCalls.filter(t => !['lake_create_tool', 'lake_refresh_tools'].includes(t.function.name));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      className="mt-3 space-y-2"
    >
      {/* 🔍 INDICADOR DE BÚSQUEDA ACTIVA */}
      <AnimatePresence>
        {searchingTool && (
          <ToolSearchIndicator toolName={searchingTool} isSearching={true} isFinancialMode={isFinancialMode} />
        )}
      </AnimatePresence>

      {creationTools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
            </motion.div>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Creando Nueva Herramienta
            </span>
          </div>
          {creationTools.map((tool, idx) => {
            const args = parseToolArguments(tool.function.arguments);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="pl-6 text-xs space-y-1"
              >
                <div className="text-amber-200 font-mono">{args.function_name || 'Sin nombre'}</div>
                <div className="text-amber-300/60 text-[10px]">{args.description || 'Sin descripción'}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {refreshTools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 border border-amber-500/30 rounded-2xl p-2"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              Recargando herramientas
            </span>
          </div>
        </motion.div>
      )}

      {executionTools.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-950/50 border border-amber-500/20 rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                {executionTools.length} herramienta{executionTools.length > 1 ? 's' : ''} ejecutada{executionTools.length > 1 ? 's' : ''}
              </span>
            </div>
            <motion.svg
              className="w-3 h-3 text-amber-400"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-amber-500/10 bg-black/20 overflow-hidden"
              >
                <div className="p-3 space-y-2">
                  {executionTools.map((tool, idx) => {
                    const args = parseToolArguments(tool.function.arguments);
                    const isBrowser = tool.function.name.startsWith('browser_');
                    const isSQL = tool.function.name.includes('sql');
                    const isFinancial = tool.function.name.includes('fetch');

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-2 text-xs font-mono"
                      >
                        {isBrowser && <Globe className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />}
                        {isSQL && <Terminal className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />}
                        {isFinancial && <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />}
                        {!isBrowser && !isSQL && !isFinancial && <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />}

                        <div className="flex-1 min-w-0">
                          <div className="text-amber-200 truncate">{tool.function.name}</div>
                          {Object.keys(args).length > 0 && (
                            <div className="text-amber-400/40 text-[10px] truncate mt-0.5">
                              {Object.entries(args).slice(0, 2).map(([k, v]) =>
                                `${k}: ${String(v).substring(0, 30)}`
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};


// ============================================
// METRIC CARD COMPONENT
// ============================================

function MetricCard({ title, value, icon: Icon, color, isCurrency = true }) {
  const colors = {
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    purple: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    green: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    red: "text-red-400 border-red-500/20 bg-red-500/5"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-[1.25rem] p-4 flex flex-col gap-1 backdrop-blur-sm ${colors[color] || colors.blue}`}
    >
      <div className="flex justify-between items-start opacity-70">
        <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xl font-bold tracking-tight">
        {isCurrency ? '$' : ''}{(value || 0).toLocaleString('es-CL')}
      </span>
    </motion.div>
  );
}


// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function Lake() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [thinkingStage, setThinkingStage] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [remoteBrowserUrl, setRemoteBrowserUrl] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [browserMode, setBrowserMode] = useState('remote');
  const [reconstructedHtml, setReconstructedHtml] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinancialMode, setIsFinancialMode] = useState(false);
  const [lakeStats, setLakeStats] = useState({
    toolsCreated: 0,
    queriesExecuted: 0,
    avgResponseTime: 0
  });


  const browserRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, sendingMessage]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  useEffect(() => {
    const handleBrowserMessage = (event) => {
      if (event.data === "browserbase-disconnected") {
        console.log("⚠️ Sesión de Browserbase terminada");
        setRemoteBrowserUrl(null);
        setCurrentSessionId(null);
        setBrowserVisible(false);

        toast({
          title: "Sesión terminada",
          description: "La sesión del navegador remoto ha finalizado",
          variant: "default"
        });
      }
    };

    window.addEventListener("message", handleBrowserMessage);
    return () => window.removeEventListener("message", handleBrowserMessage);
  }, [toast]);

  useEffect(() => {
    if (user?.id) {
      loadMetrics();
      loadHistory();
      loadLakeStats();

      const sub = supabase.channel('lake_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lake_conversaciones', filter: `usuario_id=eq.${user.id}` },
          (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, normalizeMessage(payload.new)];
            });
          })
        .subscribe();

      return () => supabase.removeChannel(sub);
    }
  }, [user?.id]);

  // 🔍 DIAGNÓSTICO DE CONEXIÓN
  useEffect(() => {
    if (user?.id) {
      console.log('🔍 Verificando conexión a Supabase...');
      const testConnection = async () => {
        try {
          const { data, error } = await supabase.from('lake_conversaciones').select('count').limit(1);
          if (error) {
            console.error('❌ Test conexión falló:', error);
          } else {
            console.log('✅ Conexión a Supabase OK');
          }
        } catch (err) {
          console.error('❌ Test conexión error:', err);
        }
      };
      testConnection();
    }
  }, [user?.id]);

  const loadMetrics = async () => {
    try {
      const { data } = await supabase.rpc('lake_analizar_cartera', { p_usuario_id: user.id });
      if (data) setMetrics(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await supabase.from('lake_conversaciones').select('*').eq('usuario_id', user.id).order('created_at');
      if (data) setMessages(data.map(normalizeMessage));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadLakeStats = async () => {
    try {
      const { data } = await supabase
        .from('lake_conversaciones')
        .select('metadata')
        .eq('usuario_id', user.id)
        .eq('tipo_rol', 'assistant');

      if (data) {
        const toolsCreated = data.filter(m =>
          m.metadata?.tool_calls?.some(t => t.function.name === 'lake_create_tool')
        ).length;

        const totalTools = data.reduce((acc, m) =>
          acc + (m.metadata?.tool_calls?.length || 0), 0
        );

        setLakeStats({
          toolsCreated,
          queriesExecuted: totalTools,
          avgResponseTime: 2.3
        });
      }
    } catch (error) {
      console.error('Error loading Lake stats:', error);
    }
  };

  const saveMessage = async (role, content, toolcalls = null, toolcallid = null) => {
    const id = generateUUID();

    const metadata = {};

    if (toolcalls) {
      metadata.tool_calls = toolcalls;
    }

    if (toolcallid) {
      metadata.tool_call_id = toolcallid;
    }

    const msg = {
      id,
      tipo_rol: role,
      contenido: content || '',
      metadata,
      created_at: new Date().toISOString(),
      usuario_id: user.id
    };

    setMessages(prev => [...prev, msg]);

    try {
      await supabase.from('lake_conversaciones').insert({
        id,
        usuario_id: user.id,
        tipo_rol: role,
        contenido: content || '',
        metadata
      });
    } catch (error) {
      console.error('Error guardando mensaje:', error);
    }

    return msg;
  };


  const reconstructInterface = async (url) => {
    try {
      toast({
        title: "🎨 Reconstruyendo interfaz...",
        description: "OpenAI está analizando la página",
        duration: 3000
      });

      const { data, error } = await supabase.functions.invoke('lake-interface-builder', {
        body: { url, usuario_id: user.id }
      });

      if (error) throw error;

      if (data?.success) {
        setReconstructedHtml(data.reconstructedHtml);
        setBrowserMode('constructor');
        setBrowserVisible(true);
        setCurrentUrl(url);

        toast({
          title: "✅ Interfaz reconstruida",
          description: "La página ha sido regenerada con IA",
          duration: 3000
        });

        return `✅ Interfaz reconstruida exitosamente\n\n🎨 He analizado y recreado la página usando IA\n🌐 URL: ${url}`;
      }

      throw new Error(data?.error || 'Error al reconstruir interfaz');

    } catch (err) {
      console.error('❌ Error reconstructInterface:', err);
      return `❌ Error al reconstruir interfaz: ${err.message}`;
    }
  };

  const switchToBrowserbase = async () => {
    if (!currentUrl) {
      toast({
        title: "⚠️ No hay URL",
        description: "Primero solicita abrir una página",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('lake-browser-api', {
        body: { action: 'browser_create_session' }
      });

      if (error) throw error;

      if (data?.success) {
        const { sessionId, liveUrl, debuggerUrl } = data;
        const url = debuggerUrl || liveUrl;

        setCurrentSessionId(sessionId);
        setRemoteBrowserUrl(url);
        setBrowserMode('remote');
        setBrowserVisible(true);

        toast({
          title: "✅ Browserbase activado",
          description: "Navegador remoto conectado",
          duration: 3000
        });
      } else {
        throw new Error('Sin minutos disponibles en Browserbase');
      }
    } catch (err) {
      console.error('❌ Error switchToBrowserbase:', err);
      toast({
        title: "❌ Browserbase no disponible",
        description: "Cambiando a Constructor de Interfaz",
        variant: "destructive"
      });

      await reconstructInterface(currentUrl);
    }
  };

  const switchToConstructor = async () => {
    if (!currentUrl) {
      toast({
        title: "⚠️ No hay URL",
        description: "Primero solicita abrir una página",
        variant: "destructive"
      });
      return;
    }

    await reconstructInterface(currentUrl);
  };

  // 🔄 HANDLE SEND CON PAYLOAD CORREGIDO Y DETECCIÓN FINANCIERA
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendingMessage) return;

    const text = inputMessage;
    setInputMessage('');
    setSendingMessage(true);

    try {
      // ✅ FIX 1: GUARDAR MENSAJE PRIMERO (SIEMPRE)
      await saveMessage('user', text);

      // 📊 DETECCIÓN ULTRA AGRESIVA DE GRÁFICOS
      const textoLower = text.toLowerCase();

      // Buscar CUALQUIER ticker de 2-5 letras mayúsculas
      const tickerMatch = text.match(/\b([A-Z]{2,5})\b/g);

      // Lista extendida de palabras clave
      const palabrasGrafico = [
        'gráfico', 'grafico', 'gráfica', 'grafica',
        'chart', 'charts',
        'precio', 'precios',
        'cotización', 'cotizacion', 'cotizaciones',
        'muestra', 'mostrar', 'ver', 'dame',
        'cuál es', 'cual es', 'cómo está', 'como esta',
        'valor', 'acciones', 'stock', 'acción'
      ];

      const tieneKeyword = palabrasGrafico.some(p => textoLower.includes(p));

      // SI HAY TICKER + KEYWORD = ES GRÁFICO
      // O si SOLO hay ticker y es corto (menos de 15 palabras)
      const palabras = text.split(' ').length;
      const esProbableGrafico = (tickerMatch && tieneKeyword) ||
        (tickerMatch && palabras < 15);

      if (esProbableGrafico && tickerMatch && tickerMatch.length > 0) {
        const ticker = tickerMatch[0];

        console.log('🎯 GRÁFICO DETECTADO:', ticker);

        setThinkingStage('analyzing');
        toast({
          title: "📊 Generando gráfico...",
          description: "Obteniendo datos de " + ticker,
          duration: 2000
        });

        const chartData = await getStockChart(ticker, '1d', '5m');

        if (chartData.success) {
          // ✅ FIX 2: CREAR MENSAJE ESPECIAL CON GRÁFICO
          const chartMessage = {
            id: generateUUID(),
            tipo_rol: 'assistant',
            contenido: `Gráfico de ${ticker}`,
            metadata: {
              is_chart: true,
              chart_data: chartData
            },
            created_at: new Date().toISOString(),
            usuario_id: user.id
          };

          // Guardar en BD
          await supabase.from('lake_conversaciones').insert({
            id: chartMessage.id,
            usuario_id: user.id,
            tipo_rol: 'assistant',
            contenido: chartMessage.contenido,
            metadata: chartMessage.metadata
          });

          // Agregar a mensajes
          setMessages(prev => [...prev, chartMessage]);

          const cambio = chartData.meta.changePercent;
          const emoji = cambio >= 0 ? '📈' : '📉';

          toast({
            title: emoji + " Gráfico de " + ticker,
            description: "$" + chartData.meta.currentPrice.toFixed(2) + " (" + (cambio > 0 ? "+" : "") + cambio.toFixed(2) + "%)",
            duration: 3000
          });

          setSendingMessage(false);
          setThinkingStage('');
          return;
        } else {
          toast({
            title: "❌ Error al obtener gráfico",
            description: chartData.error || "Verifica que el ticker sea válido",
            variant: "destructive",
            duration: 4000
          });
          setSendingMessage(false);
          setThinkingStage('');
          return;
        }
      }

      // SI NO ES GRÁFICO, CONTINUAR NORMAL CON LAKE
      console.log('💬 No es gráfico, llamando a Lake...');

      setThinkingStage('analyzing');
      const isFinancial = detectFinancialContext(text);
      setIsFinancialMode(isFinancial);

      let currentHistory = [...messages, { tipo_rol: 'user', contenido: text, metadata: {} }];
      let continueLoop = true;
      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (continueLoop && loopCount < MAX_LOOPS) {
        loopCount++;

        const messagesPayload = currentHistory
          .map(m => {
            const content = String(m.contenido || '');

            if (m.tipo_rol === 'tool') {
              const toolCallId = m.metadata?.tool_call_id;
              if (!toolCallId) {
                return null;
              }
              return {
                role: 'tool',
                tool_call_id: toolCallId,
                content: content
              };
            }

            if (m.tipo_rol === 'assistant') {
              const payload = { role: 'assistant', content: content || null };
              if (m.metadata?.tool_calls && Array.isArray(m.metadata.tool_calls) && m.metadata.tool_calls.length > 0) {
                payload.tool_calls = m.metadata.tool_calls.map(tc => ({
                  id: tc.id,
                  type: tc.type || 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: typeof tc.function?.arguments === 'string'
                      ? tc.function.arguments
                      : JSON.stringify(tc.function?.arguments || {})
                  }
                }));
              }
              return payload;
            }

            if (m.tipo_rol === 'system') {
              return { role: 'system', content: content };
            }

            return { role: 'user', content: content };
          })
          .filter(m => m !== null)
          .filter(m => {
            if (m.role === 'assistant' && !m.content && (!m.tool_calls || m.tool_calls.length === 0)) return false;
            if (m.role === 'tool' && !m.tool_call_id) return false;
            if (!m.content && !m.tool_calls) return false;
            return true;
          });

        setThinkingStage('executing');

        const { data, error } = await supabase.functions.invoke('lake', {
          body: cleanPayload({
            messages: messagesPayload,
            usuario_id: user.id,
            es_admin: isAdminUser(user),
            es_institucion: isInstitutionalUser(user)
          })
        });

        if (error) {
          throw new Error(error.message || JSON.stringify(error));
        }

        if (!data || data.success === false) {
          throw new Error(data?.error || 'Error del servidor');
        }

        setThinkingStage('processing');
        const finalMessage = normalizeMessage(data.message || data);
        const assistantMsg = await saveMessage(
          'assistant',
          finalMessage.contenido || finalMessage.content || '',
          finalMessage.metadata?.tool_calls
        );
        currentHistory.push(assistantMsg);

        if (finalMessage.metadata?.tool_calls && Array.isArray(finalMessage.metadata.tool_calls) && finalMessage.metadata.tool_calls.length > 0) {
          setThinkingStage('executing');

          for (const tool of finalMessage.metadata.tool_calls) {
            let toolOutput = null;

            if (tool.function.name === 'browser_create_session') {
              try {
                const { data: browserData, error: browserError } = await supabase.functions.invoke('lake-browser-api', {
                  body: { action: 'browser_create_session' }
                });

                if (browserError) {
                  toolOutput = JSON.stringify({ success: false, error: browserError.message });
                } else if (browserData?.success) {
                  toolOutput = JSON.stringify(browserData);
                  if (browserData.sessionId && (browserData.debuggerUrl || browserData.liveUrl)) {
                    setCurrentSessionId(browserData.sessionId);
                    setRemoteBrowserUrl(browserData.debuggerUrl || browserData.liveUrl);
                    setBrowserVisible(true);
                    setBrowserMode('remote');
                    toast({ title: "✅ Navegador abierto", duration: 3000 });
                  }
                } else {
                  toolOutput = JSON.stringify({ success: false, error: 'Error desconocido' });
                }
              } catch (execError) {
                toolOutput = JSON.stringify({ success: false, error: execError.message });
              }
            } else {
              toolOutput = JSON.stringify({ success: true, message: 'Tool executed' });
            }

            const toolMsg = await saveMessage('tool', toolOutput, null, tool.id);
            currentHistory.push(toolMsg);
          }

          continueLoop = true;
        } else {
          continueLoop = false;
          loadMetrics();
          setThinkingStage('complete');
          setTimeout(() => setThinkingStage(''), 1000);
          toast({ title: "✅ Completado", duration: 2000 });
        }
      }

    } catch (error) {
      console.error('❌ Error handleSend:', error);
      toast({ title: "❌ Error", description: error.message, variant: "destructive", duration: 6000 });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white bg-gradient-to-br from-slate-950 via-[#0f1318] to-slate-950 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-500/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className={`flex-shrink-0 px-8 py-5 border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-sm ${isFullscreen ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <LakeLogo size="md" isThinking={sendingMessage} isFinancialMode={isFinancialMode} />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Lake Intelligence
              </h1>
              <p className="text-xs text-slate-400">Análisis avanzado auto-evolutivo • Validado por Themis 🏛️</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.div
              className="flex items-center gap-3 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 text-amber-400">
                <Wrench className="w-3 h-3" />
                <span>{lakeStats.toolsCreated}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-400">
                <Zap className="w-3 h-3" />
                <span>{lakeStats.queriesExecuted}</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <Clock className="w-3 h-3" />
                <span>{lakeStats.avgResponseTime}s</span>
              </div>
            </motion.div>

            <a
              href="https://frerautinvest.com/lake-reglamento.html"
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
              onMouseEnter={() => setMenuHovered(true)}
              onMouseLeave={() => setMenuHovered(false)}
            >
              <motion.div
                className="p-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all duration-300 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className={`w-5 h-5 text-amber-400 transition-transform duration-300 ${menuHovered ? 'rotate-90 scale-110' : ''}`} />
              </motion.div>
              <div className="absolute -bottom-8 right-0 text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Reglamento
              </div>
            </a>
          </div>
        </div>
      </div>

      {metrics && (
        <div className={`flex-shrink-0 px-8 py-4 bg-slate-950/50 ${isFullscreen ? 'hidden' : ''}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-[1800px] mx-auto">
            <MetricCard title="Patrimonio Total" value={metrics.patrimonio_total} icon={Wallet} color="yellow" />
            <MetricCard title="Emisiones (UEs)" value={metrics.cantidad_emisiones} icon={BarChart3} color="blue" isCurrency={false} />
            <MetricCard title="Precio Promedio" value={metrics.precio_promedio} icon={TrendingUp} color="purple" />
            <MetricCard title="Flujo Neto 24h" value={metrics.flujo_neto_24h} icon={metrics.flujo_neto_24h >= 0 ? TrendingUp : TrendingDown} color={metrics.flujo_neto_24h >= 0 ? "green" : "red"} />
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-hidden ${isFullscreen ? 'p-0 fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'px-8 py-4'}`}>
        <div className={`h-full mx-auto grid transition-all duration-500 ${isFullscreen
          ? (browserVisible || remoteBrowserUrl)
            ? 'max-w-full gap-0 grid-cols-[40%_60%]'
            : 'max-w-full gap-0 grid-cols-1'
          : (browserVisible || remoteBrowserUrl)
            ? 'max-w-[1800px] gap-4 grid-cols-[30%_70%]'
            : 'max-w-[1800px] gap-4 grid-cols-1'
          }`}>

          <div className={`flex flex-col bg-slate-900/40 border border-amber-500/15 overflow-hidden backdrop-blur-xl shadow-2xl shadow-amber-900/10 ${isFullscreen
            ? 'h-screen rounded-none border-r-2 border-r-amber-500/30'
            : 'rounded-[1.75rem]'
            }`}>

            <div className="absolute top-4 right-4 z-[100]">
              <motion.button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-3 rounded-2xl border-2 border-amber-400 bg-slate-900/90 hover:bg-amber-500/30 hover:border-amber-300 transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-400/50 backdrop-blur-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={isFullscreen ? "Salir de pantalla completa (ESC)" : "Ver en pantalla completa"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
              </motion.button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center text-slate-500 gap-3"
                >
                  <LakeLogo size="lg" className="opacity-30" isFinancialMode={isFinancialMode} />
                  <p className="text-sm">¡Hola! ¿En qué puedo ayudarte hoy?</p>
                  <p className="text-xs text-slate-600">Puedo crear nuevas herramientas según tus necesidades</p>
                  <p className="text-xs text-slate-700">Validado por Themis 🏛️</p>
                </motion.div>
              )}

              <AnimatePresence mode="popLayout">
                {messages.filter(m => m.tipo_rol !== 'system' && m.tipo_rol !== 'tool').map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${msg.tipo_rol === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.tipo_rol === 'assistant' && (
                      <LakeLogo size="sm" className="flex-shrink-0 mt-1" isFinancialMode={isFinancialMode} />
                    )}

                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className={`max-w-[80%] rounded-[1.25rem] p-4 text-sm backdrop-blur-sm ${msg.tipo_rol === 'user'
                        ? 'bg-gradient-to-br from-amber-500/25 to-yellow-600/15 text-amber-50 border border-amber-400/30 shadow-lg shadow-amber-900/10'
                        : 'bg-slate-800/60 text-slate-200 border border-white/10 shadow-lg shadow-black/10'
                        }`}
                    >
                      {msg.tipo_rol === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/50">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Lake</span>
                        </div>
                      )}

                      {/* ✅ FIX 3: RENDERIZAR GRÁFICO SI ES MENSAJE DE TIPO CHART */}
                      {msg.metadata?.is_chart ? (
                        <StockChartDisplay data={msg.metadata.chart_data} />
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {index === messages.filter(m => m.tipo_rol !== 'system' && m.tipo_rol !== 'tool').length - 1 && msg.tipo_rol === 'assistant' ? (
                            <TypingText text={msg.contenido} speed={20} />
                          ) : (
                            msg.contenido
                          )}
                        </div>
                      )}

                      <ToolExecutionBlock toolCalls={msg.metadata?.tool_calls} isFinancialMode={isFinancialMode} />
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 🌊✨ OLAS CON DESTELLOS CYBER */}

              {sendingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <LakeLogo size="sm" className="flex-shrink-0 mt-2" isThinking={true} isFinancialMode={isFinancialMode} />
                  <div className="flex flex-col gap-2 flex-1">
                    <WaveLoader isFinancialMode={isFinancialMode} />
                    <ThinkingIndicator stage={thinkingStage} />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex-shrink-0 p-4 bg-slate-950/60 border-t border-amber-500/15 backdrop-blur-xl">
              <form onSubmit={handleSend} className="relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Pregunta a Lake sobre mercados, SQL o pide crear nuevas funciones..."
                  className="pr-12 bg-slate-900/60 border-amber-500/20 focus:border-amber-400/50 focus:outline-none h-14 text-base rounded-[1rem] backdrop-blur-sm"
                  disabled={sendingMessage}
                />
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-1 top-1 bottom-1"
                >
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSend}
                    disabled={sendingMessage || !inputMessage.trim()}
                    className="absolute right-1 top-1 h-10 w-10 bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white rounded-xl shadow-lg shadow-amber-500/30"
                  >
                    {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </motion.div>
              </form>
            </div>
          </div>

          {(browserVisible || remoteBrowserUrl || currentSessionId) && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex flex-col bg-slate-900/50 border border-amber-500/30 overflow-hidden backdrop-blur-sm shadow-2xl ${isFullscreen
                ? 'h-screen rounded-none'
                : 'rounded-2xl'
                }`}
            >

              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400">
                  <MonitorPlay className="w-5 h-5" />
                  <span className="text-sm font-bold tracking-wider">NAVEGADOR REMOTO</span>
                </div>

                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      onClick={switchToBrowserbase}
                      className={`h-8 text-xs flex items-center gap-1.5 ${browserMode === 'remote'
                        ? 'bg-green-600 hover:bg-green-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Browserbase
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      onClick={switchToConstructor}
                      className={`h-8 text-xs flex items-center gap-1.5 ${browserMode === 'constructor'
                        ? 'bg-purple-600 hover:bg-purple-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Constructor
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBrowserVisible(false);
                        setRemoteBrowserUrl(null);
                        setCurrentSessionId(null);
                      }}
                      className="h-8 text-xs bg-red-600 hover:bg-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden bg-black">
                {browserMode === 'remote' && remoteBrowserUrl ? (
                  <iframe
                    src={remoteBrowserUrl}
                    className="w-full h-full"
                    title="Browserbase Remote Browser"
                    style={{ border: 'none' }}
                    // SECURITY: allow-same-origin + allow-scripts is an anti-pattern that nullifies
                    // sandbox isolation. Browserbase remote browsing requires allow-same-origin
                    // for session/cookie functionality. Evaluate alternative isolation if possible.
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
                    allow="clipboard-read; clipboard-write; fullscreen; camera; microphone"
                  />
                ) : browserMode === 'constructor' && reconstructedHtml ? (
                  <iframe
                    srcDoc={reconstructedHtml}
                    className="w-full h-full bg-white"
                    title="Reconstructed Interface"
                    style={{ border: 'none' }}
                    sandbox="allow-scripts"
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center text-slate-400"
                  >
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <Globe className="w-20 h-20 mx-auto opacity-20" />
                      </motion.div>
                      <p className="text-base font-semibold">Esperando navegador...</p>
                      <p className="text-sm text-slate-600">
                        Pídele a Lake: "Abre un navegador"
                      </p>
                      {currentSessionId && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-amber-400 font-mono"
                        >
                          Session: {currentSessionId.substring(0, 20)}...
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>

    </div>
  );
}

export default Lake;