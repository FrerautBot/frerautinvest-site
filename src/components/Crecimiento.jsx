import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Calendar, DollarSign, Save, Loader2 } from 'lucide-react';

function CapitalGrowthChart({ historial, uesCirculacion, capitalActual }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPoint, setSmoothPoint] = useState(null);

  // 🔥 NUEVO: Sistema de actualización en vivo
  const [liveData, setLiveData] = useState([]);
  const prevCapitalRef = useRef(null);

  // 🔥 Inicializar datos
  useEffect(() => {
    if (!historial || historial.length === 0) {
      setLiveData([]);
      return;
    }

    const initialData = historial.map(item => ({
      fecha: item.fecha,
      capital_total: parseFloat(item.capital_total),
      nav: item.nav
    }));

    setLiveData(initialData);
    prevCapitalRef.current = capitalActual;
  }, [historial]);

  // 🔥 Detectar nuevos snapshots y agregarlos
  useEffect(() => {
    if (!capitalActual || !prevCapitalRef.current) return;
    if (capitalActual === prevCapitalRef.current) return;
    if (liveData.length === 0) return;

    const now = new Date();
    const lastPoint = liveData[liveData.length - 1];
    const timeSinceLastPoint = now - new Date(lastPoint.fecha);

    if (timeSinceLastPoint < 180000) return; // 3 minutos

    console.log('✨ Nuevo punto agregado:', capitalActual);

    const newPoint = {
      fecha: now.toISOString(),
      capital_total: parseFloat(capitalActual),
      nav: null
    };

    setLiveData(prev => {
      const updated = [...prev, newPoint];
      const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return updated.filter(p => new Date(p.fecha) >= cutoffDate);
    });

    prevCapitalRef.current = capitalActual;
  }, [capitalActual, liveData]);

  useEffect(() => {
    if (!hoveredPoint) {
      setSmoothPoint(null);
      return;
    }
    let animationFrame;
    const interpolate = () => {
      setSmoothPoint((current) => {
        if (!current) return hoveredPoint;
        const dx = hoveredPoint.x - current.x;
        const dy = hoveredPoint.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) return hoveredPoint;
        return {
          ...hoveredPoint,
          x: current.x + dx * 0.2,
          y: current.y + dy * 0.2,
        };
      });
      animationFrame = requestAnimationFrame(interpolate);
    };
    animationFrame = requestAnimationFrame(interpolate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hoveredPoint]);

  const dataToRender = liveData.length > 0 ? liveData : historial || [];

  if (!dataToRender || dataToRender.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-black/95 border border-gray-300 dark:border-gold/30 rounded-3xl p-8 shadow-2xl backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-gold/30 to-gold/20 dark:from-gold/20 dark:to-gold/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-gold" />
          </div>
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-400 to-gold">
            Crecimiento Capitalización de Mercado
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center py-12 text-lg">
          No hay suficiente historial para mostrar el gráfico.
        </p>
      </motion.div>
    );
  }

  const fechaInicial = new Date(dataToRender[0].fecha);
  const fechaFinal = new Date(dataToRender[dataToRender.length - 1].fecha);
  const diasReales = Math.ceil((fechaFinal - fechaInicial) / (1000 * 60 * 60 * 24)) || 1;

  const getPeriodoTexto = () => {
    if (diasReales <= 1) return 'Hoy';
    if (diasReales <= 7) return `Últimos ${diasReales} días`;
    if (diasReales <= 30) return 'Último mes';
    return `Desde ${fechaInicial.toLocaleDateString('es-CL')}`;
  };

  const width = 900;
  const height = 400;
  const padding = { top: 50, right: 50, bottom: 70, left: 110 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const valores = dataToRender.map((h) => parseFloat(h.capital_total));

  let valorActualNum;
  if (capitalActual !== undefined && capitalActual !== null) {
    valorActualNum = parseFloat(capitalActual);
  } else {
    valorActualNum = valores[valores.length - 1];
  }

  const todosLosValores = [...valores, valorActualNum];

  const minValorBase = Math.min(...todosLosValores);
  const maxValorBase = Math.max(...todosLosValores);

  const minValor = minValorBase * 0.95;
  const maxValor = maxValorBase * 1.05;
  const rangoValor = maxValor - minValor;

  const points = dataToRender.map((item, index) => {
    const x = padding.left + (index / (dataToRender.length - 1 || 1)) * chartWidth;
    const valorPunto = parseFloat(item.capital_total);
    const y = padding.top + chartHeight - ((valorPunto - minValor) / rangoValor) * chartHeight;
    return {
      x,
      y,
      fecha: item.fecha,
      valor: valorPunto,
      nav: item.nav,
      index,
      esActual: false
    };
  });

  const yActual = padding.top + chartHeight - ((valorActualNum - minValor) / rangoValor) * chartHeight;
  const puntoActual = {
    x: padding.left + chartWidth,
    y: yActual,
    fecha: new Date().toISOString(),
    valor: valorActualNum,
    nav: null,
    index: points.length,
    esActual: true
  };

  const allPoints = [...points, puntoActual];

  // Curva suave (Catmull-Rom → cubic Bezier) para linea profesional
  function smoothPath(pts) {
    if (pts.length < 2) return pts.map(p => `${p.x},${p.y}`).join(' ');
    const d = pts.map((p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = a[i - 1];
      const next = a[i + 1] || p;
      const tension = 0.3;
      const cp1x = prev.x + (p.x - prev.x) * tension;
      const cp1y = prev.y + (p.y - prev.y) * tension;
      const cp2x = p.x - (next.x - prev.x) * tension;
      const cp2y = p.y - (next.y - prev.y) * tension;
      return `C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p.x},${p.y}`;
    });
    return d.join(' ');
  }

  const pathD = smoothPath(allPoints);
  const areaPathD = `${pathD} L ${allPoints[allPoints.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  const valorFinal = valorActualNum;
  const valorInicial = valores[0];
  const cambioAbsoluto = valorFinal - valorInicial;
  const cambioPorcentaje = valorInicial > 0 ? ((cambioAbsoluto / valorInicial) * 100).toFixed(2) : '0.00';
  const esPositivo = cambioAbsoluto >= 0;

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    // Escalar coordenadas del mouse al sistema de coordenadas SVG
    const scaleX = svg.width.baseVal.value / rect.width;
    const scaleY = svg.height.baseVal.value / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    // mousePos en CSS para posicionar el tooltip correctamente
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (mouseX < padding.left - 10 || mouseX > width - padding.right + 5 ||
      mouseY < padding.top - 5 || mouseY > height - padding.bottom + 5) {
      setHoveredPoint(null);
      return;
    }

    let closestPoint = null;
    let minDistX = Infinity;

    allPoints.forEach((point) => {
      const distX = Math.abs(mouseX - point.x);
      // Usar <= para que el punto "actual" (el ultimo en allPoints) gane
      // cuando comparte la misma X que el ultimo punto historico
      if (distX <= minDistX) {
        minDistX = distX;
        closestPoint = point;
      }
    });

    setHoveredPoint(closestPoint);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formatFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatHora = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const displayPoint = smoothPoint || hoveredPoint;

  const getTooltipPosition = () => {
    if (!mousePos.x || !mousePos.y) return { left: 0, top: 0 };

    let left = mousePos.x + 20;
    let top = mousePos.y - 100;

    if (left + 250 > width) {
      left = mousePos.x - 270;
    }

    if (top < 0) {
      top = mousePos.y + 20;
    }

    return { left: `${left}px`, top: `${top}px` };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-black/95 border border-gray-300 dark:border-gold/30 rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 bg-gradient-to-br from-gold/30 to-gold/20 dark:from-gold/20 dark:to-gold/10 rounded-xl"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <TrendingUp className="w-6 h-6 text-gold" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-400 to-gold" style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.02em' }}>
                Capitalización de Mercado
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 tracking-wide" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                ${valorActualNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Rango ${(minValor / 1000000).toFixed(2)}M – ${(maxValor / 1000000).toFixed(2)}M
              </p>
            </div>
          </div>
          <motion.div
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700/50"
            whileHover={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
          >
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getPeriodoTexto()}
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl p-5 border border-gray-300 dark:border-gray-700/50 backdrop-blur-sm hover:border-gold/50 dark:hover:border-gold/30 transition-all duration-300"
          >
            <p className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-400 mb-2 font-semibold">
              💰 Capital Actual
            </p>
            <p className="text-3xl font-extrabold tracking-wide text-gray-900 dark:text-white">
              ${valorFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl p-5 border border-gray-300 dark:border-gray-700/50 backdrop-blur-sm hover:border-gold/50 dark:hover:border-gold/30 transition-all duration-300"
          >
            <p className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-400 mb-2 font-semibold">
              📈 Cambio Total
            </p>
            <p
              className={`text-3xl font-extrabold tracking-wide ${esPositivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
            >
              {esPositivo ? '+' : ''}{cambioPorcentaje}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl p-5 border border-gray-300 dark:border-gray-700/50 backdrop-blur-sm hover:border-gold/50 dark:hover:border-gold/30 transition-all duration-300"
          >
            <p className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-400 mb-2 font-semibold">
              🪙 UEs Circulación
            </p>
            <p className="text-3xl font-extrabold tracking-wide text-gray-900 dark:text-white">
              {parseInt(uesCirculacion || 0, 10).toLocaleString('en-US')}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="overflow-hidden rounded-2xl p-6 border border-gray-300/60 dark:border-gold/20 relative shadow-[0_0_40px_-8px_rgba(212,175,55,0.06)]"
          style={{
            background: '#0b0c10',
            backgroundImage: `radial-gradient(circle, rgba(160,160,160,0.25) 0.5px, transparent 0.5px)`,
            backgroundSize: '12px 12px'
          }}
        >
          <svg
            width={width}
            height={height}
            className="mx-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair' }}
            shapeRendering="geometricPrecision"
          >
            <defs>
              <linearGradient id="gradientGoldEnhanced" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" stopOpacity="0.4" />
                <stop offset="30%" stopColor="#d4af37" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#d4af37" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
              </linearGradient>
              <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="lineGradientPremium" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f0d060" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#b8962e" />
              </linearGradient>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
              const valorEtiqueta = minValor + rangoValor * f;
              const yPos = padding.top + chartHeight * (1 - f);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={width - padding.right}
                    y2={yPos}
                    className="stroke-gray-300 dark:stroke-gray-600"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                    opacity="0.3"
                  />
                  <text
                    x={padding.left - 12}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#b0b0b0"
                    fontSize="11"
                    fontFamily="'Inter', system-ui, sans-serif"
                    fontWeight="400"
                    letterSpacing="0.3"
                  >
                    ${(valorEtiqueta / 1000000).toFixed(2)}M
                  </text>
                </g>
              );
            })}

            <path d={areaPathD} fill="url(#gradientGoldEnhanced)" opacity="0.5" />

            {/* Glow detrás de la línea */}
            <path
              d={pathD}
              fill="none"
              stroke="#d4af37"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.12"
            />

            {/* Línea principal */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#lineGradientPremium)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
            />

            {/* Nodo final (solo el punto actual) */}
            <circle
              cx={allPoints[allPoints.length - 1].x}
              cy={allPoints[allPoints.length - 1].y}
              r="5"
              fill="#d4af37"
              stroke="#fff"
              strokeWidth="2"
              filter="url(#nodeGlow)"
            />

            {displayPoint && (
              <>
                <line
                  x1={displayPoint.x}
                  y1={padding.top}
                  x2={displayPoint.x}
                  y2={height - padding.bottom}
                  stroke="#d4af37"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.4"
                />

                <circle
                  cx={displayPoint.x}
                  cy={displayPoint.y}
                  r="6"
                  fill="#d4af37"
                  stroke="#fff"
                  strokeWidth="2.5"
                  filter="url(#lineGlow)"
                />

                <circle cx={displayPoint.x} cy={displayPoint.y} r="12" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.25">
                  <animate attributeName="r" from="6" to="18" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#d4af37"
              strokeWidth="1"
              opacity="0.3"
            />

            <text
              x={padding.left}
              y={height - padding.bottom + 25}
              textAnchor="start"
              fill="#888"
              fontSize="11"
              fontFamily="'Inter', system-ui, sans-serif"
              fontWeight="400"
            >
              {formatFecha(dataToRender[0].fecha)}
            </text>

            <text
              x={width - padding.right}
              y={height - padding.bottom + 25}
              textAnchor="end"
              fill="#d4af37"
              fontSize="11"
              fontFamily="'Inter', system-ui, sans-serif"
              fontWeight="500"
              letterSpacing="1.5"
            >
              Ahora
            </text>
          </svg>

          <AnimatePresence>
            {displayPoint && hoveredPoint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute pointer-events-none z-50"
                style={getTooltipPosition()}
              >
                <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-black border border-gold/40 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  <div className="space-y-3">
                    <p className="text-gold font-black text-2xl tracking-tight drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                      ${(hoveredPoint.esActual ? valorActualNum : hoveredPoint.valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="border-t border-gold/20 pt-2 space-y-1">
                      <p className="text-gray-600 dark:text-gray-300 text-xs font-medium tracking-wide flex items-center gap-1.5">
                        <span className="opacity-60">📅</span> {hoveredPoint.esActual ? 'Ahora' : formatFecha(hoveredPoint.fecha)}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs tracking-wide flex items-center gap-1.5">
                        <span className="opacity-60">🕐</span> {formatHora(hoveredPoint.fecha)}
                      </p>
                      {hoveredPoint.nav && (
                        <p className="text-gold/70 text-[11px] font-medium mt-1 tracking-wide">
                          NAV · ${parseFloat(hoveredPoint.nav).toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

const Crecimiento = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [capitalHistorico, setCapitalHistorico] = useState([]);
  const [marketMetrics, setMarketMetrics] = useState({ ues_circulacion: 0, capital_total: 0 });
  const [capitalBase, setCapitalBase] = useState(40000000); // valor base en CLP desde parametros_fondo
  const [editingCapital, setEditingCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [fxRate, setFxRate] = useState(920); // tipo de cambio USD/CLP

  const fetchCapitalHistorico = useCallback(async () => {
    const { data, error: historyError } = await supabase.rpc('obtener_capital_total_historico', { p_dias: 90 });
    if (historyError) {
      console.error('❌ Error al obtener capital histórico:', historyError.message);
    } else if (data) {
      setCapitalHistorico(data);
    }
  }, []);

  const fetchMarketMetrics = useCallback(async () => {
    const { data, error: metricsError } = await supabase.rpc('obtener_metricas_mercado');
    if (metricsError) {
      console.error("❌ Error fetching market metrics:", metricsError.message);
    } else if (data && data.length > 0) {
      setMarketMetrics(data[0]);
    }
    setLoading(false);
  }, []);

  // Traer el valor base desde parametros_fondo
  const fetchCapitalBase = useCallback(async () => {
    const { data, error } = await supabase
      .from('parametros_fondo')
      .select('valor_base_clp')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data?.valor_base_clp) {
      setCapitalBase(parseFloat(data.valor_base_clp));
    }
    // Traer tipo de cambio
    const { data: fx } = await supabase
      .from('fx_config')
      .select('manual_rate')
      .eq('is_active', true)
      .maybeSingle();
    if (fx?.manual_rate) setFxRate(parseFloat(fx.manual_rate));
  }, []);

  const checkAdminStatus = useCallback(async () => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setIsAdmin(currentSession?.user?.email === 'frerautgroups.a@gmail.com');
  }, [session]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        checkAdminStatus(),
        fetchCapitalHistorico(),
        fetchMarketMetrics(),
        fetchCapitalBase()
      ]);
    };

    fetchData();

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh cada 5 minutos');
      fetchCapitalHistorico();
      fetchMarketMetrics();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session, fetchCapitalHistorico, fetchMarketMetrics, checkAdminStatus]);

  const handleToggleEdit = () => {
    if (!editingCapital) {
      // Al abrir, cargar el valor base manual actual
      setCapitalInput(capitalBase?.toString() || '0');
    }
    setEditingCapital(!editingCapital);
  };

  const handleUpdateCapitalTotal = async () => {
    const nuevoBaseClp = parseFloat(capitalInput);
    if (isNaN(nuevoBaseClp) || nuevoBaseClp < 0) {
      toast({ variant: "destructive", title: "Error", description: "Ingrese un valor válido en CLP" });
      return;
    }
    try {
      const { data, error } = await supabase.rpc('actualizar_valor_base', { p_valor_base_clp: nuevoBaseClp });
      if (error) throw error;
      if (data.success) {
        toast({ title: "✅ Valor base actualizado", description: `Nuevo valor base: $${nuevoBaseClp.toLocaleString()} CLP (≈ $${(nuevoBaseClp/fxRate).toLocaleString('en-US', {minimumFractionDigits:2})} USD)` });
        setEditingCapital(false);
        setCapitalBase(nuevoBaseClp);
        fetchCapitalHistorico();
        fetchMarketMetrics();
      } else {
        throw new Error(data.mensaje);
      }
    } catch (err) {
      console.error('Error:', err);
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleResetBase = async () => {
    try {
      const { data, error } = await supabase.rpc('actualizar_valor_base', { p_valor_base_clp: 40000000 });
      if (error) throw error;
      if (data.success) {
        toast({ title: "🔄 Valor base restablecido", description: "Valor base vuelto a 40,000,000 CLP" });
        fetchCapitalBase();
        fetchCapitalHistorico();
        fetchMarketMetrics();
      }
    } catch (err) {
      console.error('Error:', err);
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (loading && capitalHistorico.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-10 h-10 animate-spin text-gold" /></div>;
  }

  return (
    <div className="space-y-10 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gold tracking-wide drop-shadow-lg">Crecimiento capitalización de mercado</h2>
        {isAdmin && (
          <Button
            onClick={handleToggleEdit} // 🔥 CAMBIADO
            className="font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300"
            style={{ backgroundColor: '#D4AF37', color: '#000000' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B8860B'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(212, 175, 55, 0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; e.currentTarget.style.boxShadow = ''; }}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            {editingCapital ? 'Cancelar' : 'Editar Capital'}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {editingCapital && isAdmin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 p-6 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl backdrop-blur-sm">
            <h3 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
              Editar Valor Base del Fondo
              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded font-normal">🔒 Valor Base CLP</span>
            </h3>
            <p className="text-sm text-blue-200/60 mb-4">
              Valor base actual: <strong className="text-blue-200">${capitalBase.toLocaleString('es-CL')} CLP</strong>
              <span className="text-blue-200/40 ml-2">(≈ ${(capitalBase/fxRate).toLocaleString('en-US', {minimumFractionDigits:2})} USD · TC: ${fxRate})</span>
              {marketMetrics.capital_total > 0 && (
                <span className="text-blue-200/40 ml-2">· Capital total: ${parseFloat(marketMetrics.capital_total).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              )}
            </p>
            <div className="flex items-end gap-4">
              <div className="flex-grow">
                <Label htmlFor="capital-input" className="text-gray-300 font-semibold mb-2 block">Valor Base (CLP)</Label>
                <Input id="capital-input" type="number" step="1" value={capitalInput} onChange={(e) => setCapitalInput(e.target.value)} className="bg-gray-800 border-blue-500/50 focus:border-blue-400 text-white rounded-lg text-lg" placeholder="Ej: 40000000" />
              </div>
              <Button onClick={handleUpdateCapitalTotal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 rounded-lg shadow-lg">
                <Save className="w-4 h-4 mr-2" />
                Guardar Base
              </Button>
              <Button onClick={handleResetBase} variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-6 rounded-lg">🔄 Restablecer 40M</Button>
            </div>
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 flex items-start gap-2">
                <span>⚠️</span>
                <span>El valor base (en CLP) se suma al equity de IULER convertido a USD. Fórmula: <strong>capital_total = (alpaca_equity + valor_base / tc) × multiplicador</strong>. La tabla <strong>parametros_fondo</strong> almacena este valor.</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CapitalGrowthChart
        historial={capitalHistorico}
        uesCirculacion={marketMetrics.ues_circulacion}
        capitalActual={marketMetrics.capital_total}
      />
    </div>
  );
};

export default Crecimiento;