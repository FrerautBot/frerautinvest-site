import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, ShoppingCart, TrendingDown, ArrowDownLeft, History, Wallet, TrendingUp, ChevronDown } from 'lucide-react';

// Utility for downsampling chart data to prevent UI freezes
const useDownsampledData = (data, maxPoints = 150) => {
  return useMemo(() => {
    if (!data || data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0 || index === data.length - 1);
  }, [data, maxPoints]);
};

const VolumeChart = ({ isDarkMode }) => {
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1M');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const displayedData = useDownsampledData(volumeData, 100);

  useEffect(() => {
    const fetchVolumeData = async () => {
      setLoading(true);
      const dias = { '1D': 1, '5D': 5, '1M': 30, '6M': 180, '1Y': 365 }[timeRange] || 30;

      const { data, error } = await supabase
        .from('volumen_historico')
        .select('fecha, volumen_compras, volumen_ventas, cantidad_comprada, cantidad_vendida')
        .gte('fecha', new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString())
        .order('fecha', { ascending: true });

      if (error) {
        console.error('❌ Error fetching volume:', error);
      } else {
        setVolumeData(data || []);
      }
      setLoading(false);
    };

    fetchVolumeData();

    const channel = supabase.channel('volume_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volumen_historico' }, fetchVolumeData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [timeRange]);

  const { totalCompras, totalVentas, volumenNeto, maxValue } = useMemo(() => {
    const tCompras = volumeData.reduce((sum, d) => sum + parseFloat(d.cantidad_comprada || 0), 0);
    const tVentas = volumeData.reduce((sum, d) => sum + parseFloat(d.cantidad_vendida || 0), 0);
    return {
      totalCompras: tCompras,
      totalVentas: tVentas,
      volumenNeto: tCompras - tVentas,
      maxValue: Math.max(tCompras, tVentas)
    };
  }, [volumeData]);

  const chartPoints = useMemo(() => {
    if (!displayedData.length) return [];

    const volumeIndex = displayedData.map((item) => ({
      fecha: item.fecha,
      netVolume: parseFloat(item.cantidad_comprada || 0) - parseFloat(item.cantidad_vendida || 0),
      compras: parseFloat(item.cantidad_comprada || 0),
      ventas: parseFloat(item.cantidad_vendida || 0)
    }));

    const maxNetVolume = Math.max(...volumeIndex.map(v => Math.abs(v.netVolume)), 1);
    const width = 1000, height = 260, padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return volumeIndex.map((item, index) => {
      const x = padding.left + (index / Math.max(volumeIndex.length - 1, 1)) * chartWidth;
      const volumeBaseY = padding.top + (chartHeight / 2);
      const normalizedValue = maxNetVolume > 0 ? (item.netVolume / maxNetVolume) : 0;
      const y = volumeBaseY - (normalizedValue * (chartHeight / 2));
      return { x, y, netVolume: item.netVolume, compras: item.compras, ventas: item.ventas, fecha: item.fecha, baseY: volumeBaseY };
    });
  }, [displayedData]);

  if (loading && !volumeData.length) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div></div>;
  if (!volumeData.length) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-yellow-500">Análisis de Volumen</h3>
        <TrendingUp className="text-green-400" size={24} />
      </div>
      <div className="text-center py-16">
        <div className="text-6xl mb-4 opacity-30">📊</div>
        <p className={`text-lg mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Volumen de mercado aún no disponible</p>
        <p className={`text-sm ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>El volumen aparecerá automáticamente cuando se registren operaciones de compra/venta</p>
      </div>
    </div>
  );

  const width = 1000, height = 260, padding = { top: 40, right: 40, bottom: 50, left: 60 };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestPoint = null;
    let minDistance = 40;

    for (const point of chartPoints) {
      const distance = Math.abs(mouseX - point.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    if (closestPoint) {
      setHoveredPoint(closestPoint);
      setMousePos({ x: mouseX, y: mouseY });
    } else {
      setHoveredPoint(null);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-yellow-500">Análisis de Volumen</h3>
        <TrendingUp className="text-green-400" size={24} />
      </div>

      <div className={`flex items-center gap-2 mb-4 rounded-lg p-1 w-fit border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'
        }`}>
        {['1D', '5D', '1M', '6M', '1Y'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${timeRange === range
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg'
              : isDarkMode
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
          >
            {range}
          </button>
        ))}
      </div>

      <div className={`relative rounded-xl border overflow-hidden ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'
        }`}>
        <svg
          width={width}
          height={height}
          className="mx-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="volumeGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="volumeRedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <filter id="glowGreen">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowRed">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadowGoldVolume">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#d4af37" floodOpacity="0.6" />
            </filter>
          </defs>
          <text x={padding.left} y={padding.top - 15} className={`text-xs font-semibold ${isDarkMode ? 'fill-gray-400' : 'fill-gray-600'}`}>Índice de Volumen (Compras - Ventas)</text>
          <line x1={padding.left} y1={padding.top + (height - padding.top - padding.bottom) / 2} x2={width - padding.right} y2={padding.top + (height - padding.top - padding.bottom) / 2} stroke={isDarkMode ? "#374151" : "#d1d5db"} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

          {chartPoints.filter((_, i) => i % Math.max(Math.floor(chartPoints.length / 6), 1) === 0).map((point, i) => (
            <text
              key={i}
              x={point.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className={`text-xs font-medium ${isDarkMode ? 'fill-gray-500' : 'fill-gray-600'}`}
            >
              {formatDate(point.fecha)}
            </text>
          ))}

          {chartPoints.map((point, i) => {
            if (i === 0) return null;
            const prev = chartPoints[i - 1];
            const isPositive = point.netVolume >= prev.netVolume;

            const pathD = `M ${prev.x} ${prev.y} L ${point.x} ${point.y}`;
            const areaPathD = `M ${prev.x} ${prev.y} L ${point.x} ${point.y} L ${point.x} ${point.baseY} L ${prev.x} ${prev.baseY} Z`;
            const color = isPositive ? '#10b981' : '#ef4444';
            const gradient = isPositive ? 'url(#volumeGreenGradient)' : 'url(#volumeRedGradient)';

            return (
              <g key={i}>
                <path d={areaPathD} fill={gradient} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}

          {hoveredPoint && (
            <>
              <line x1={hoveredPoint.x} y1={padding.top} x2={hoveredPoint.x} y2={height - padding.bottom} stroke="#d4af37" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" fill="#d4af37" stroke="#fff" strokeWidth="2" filter="url(#shadowGoldVolume)" />
            </>
          )}
        </svg>

        {hoveredPoint && (
          <div className="absolute pointer-events-none z-50" style={{ left: `${Math.min(mousePos.x + 15, width - 240)}px`, top: `${Math.max(mousePos.y - 130, 10)}px` }}>
            <div className={`border-2 border-yellow-500 rounded-lg px-4 py-3 shadow-2xl shadow-yellow-500/30 ${isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
              <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(hoveredPoint.fecha)}</p>
              <p className={`text-lg font-bold ${hoveredPoint.netVolume >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredPoint.netVolume >= 0 ? '+' : ''}{hoveredPoint.netVolume.toFixed(2)} UE
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatTime(hoveredPoint.fecha)}</p>
              <div className={`mt-2 pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>Compras: {hoveredPoint.compras.toFixed(2)} UE
                </p>
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>Ventas: {hoveredPoint.ventas.toFixed(2)} UE
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-3 gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/60 border-white/10' : 'bg-gray-50 border-gray-300'
        }`}>
        <div>
          <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Compras</p>
          <p className="text-lg font-bold text-green-400">{totalCompras.toFixed(2)}</p>
        </div>
        <div>
          <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Ventas</p>
          <p className="text-lg font-bold text-red-400">{totalVentas.toFixed(2)}</p>
        </div>
        <div>
          <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Volumen Neto</p>
          <p className={`text-lg font-bold ${volumenNeto >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            {volumenNeto >= 0 ? '+' : ''}{volumenNeto.toFixed(2)} UE
          </p>
        </div>
      </div>
    </div>
  );
};

const NavHistoricoChart = ({ isDarkMode, navPrice }) => {
  const [historial, setHistorial] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeRange, setTimeRange] = useState('6M');
  const [loading, setLoading] = useState(false);
  const [actualRange, setActualRange] = useState(null); // rango real tras auto-extension

  const displayedData = useDownsampledData(historial, 200);

  useEffect(() => {
    const fetchData = async (attemptRange) => {
      setLoading(true);
      const range = attemptRange || timeRange;
      const dias = { '1D': 1, '5D': 5, '1M': 30, '6M': 180, 'YTD': 365, '1Y': 365, '5Y': 1825, 'All': 3650 }[range] || 180;

      const [navResult, currentResult] = await Promise.all([
        supabase.rpc('obtener_nav_historico', { p_dias: dias }),
        supabase.from('precio_actual_ue').select('precio_actual, fecha').single()
      ]);

      const navData = navResult.data;
      const currentPriceData = currentResult.data;

      if (navResult.error) {
        console.error("Error fetching NAV history:", navResult.error);
      } else if (navData) {
        // Filtrar solo filas con UEs reales en circulacion (ues_circulacion > 1)
        const validData = (navData || []).filter(item => parseFloat(item.ues_circulacion || 0) > 1);

        if (validData.length === 0 && range !== '6M') {
          const fallbacks = { '1D': '5D', '5D': '1M', '1M': '6M', 'YTD': '6M', '1Y': '6M' };
          const nextRange = fallbacks[range];
          if (nextRange) {
            return fetchData(nextRange);
          }
        }

        // Adjuntar precio actual como ultimo punto si es mas reciente
        let enhanced = validData;
        if (currentPriceData && currentPriceData.precio_actual) {
          const lastHistoricalDate = validData.length > 0 ? new Date(validData[validData.length - 1].fecha) : null;
          const currentDate = new Date(currentPriceData.fecha);
          if (!lastHistoricalDate || currentDate > lastHistoricalDate) {
            enhanced = [...validData, {
              fecha: currentPriceData.fecha,
              nav: currentPriceData.precio_actual,
              capital_total: 0,
              ues_circulacion: validData.length > 0 ? validData[0].ues_circulacion : 10000
            }];
          }
        }

        setHistorial(enhanced);
        setActualRange(range !== timeRange ? range : null);
      }
      setLoading(false);
    };

    fetchData();
    const channel = supabase.channel('nav_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'nav_historico' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [timeRange]);

  const chartData = useMemo(() => {
    if (!displayedData?.length) return null;

    const width = 900;
    const height = 320;
    const padding = { top: 45, right: 45, bottom: 65, left: 75 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const valores = displayedData.map(h => parseFloat(h.nav));
    const minValor = Math.min(...valores) * 0.98;
    const maxValor = Math.max(...valores) * 1.02;
    const rangoValor = maxValor - minValor || 1;

    const points = displayedData.map((item, index) => ({
      x: padding.left + (index / (displayedData.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - ((parseFloat(item.nav) - minValor) / rangoValor) * chartHeight,
      fecha: item.fecha,
      valor: parseFloat(item.nav),
      capitalTotal: parseFloat(item.capital_total),
      uesCirculacion: parseFloat(item.ues_circulacion),
      index
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPathD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    return {
      points,
      pathD,
      areaPathD,
      minValor,
      maxValor,
      rangoValor,
      width,
      height,
      padding,
      chartHeight,
      valores
    };

  }, [displayedData]);

  if (!historial?.length && !loading) return (
    <div className={`rounded-2xl p-8 shadow-sm border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'
      }`}>
      <h3 className="text-2xl font-bold text-yellow-500 mb-2">Precio UE - Histórico</h3>
      <div className="text-center py-12">
        <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No hay datos de precio para este período</p>
        <p className={`text-sm ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Selecciona un rango de tiempo más amplio (1M, 6M, etc.) para ver el histórico</p>
      </div>
    </div>
  );

  if (loading && !historial?.length) return (
    <div className={`rounded-2xl p-8 shadow-sm border flex justify-center items-center h-80 ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'
      }`}>
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
    </div>
  );

  if (!chartData) return null;

  const { points, pathD, areaPathD, minValor, maxValor, rangoValor, width, height, padding, chartHeight, valores } = chartData;
  const valorInicial = parseFloat(historial[0].nav);
  const valorFinal = parseFloat(historial[historial.length - 1].nav);
  const cambioAbsoluto = valorFinal - valorInicial;
  const cambioPorcentual = ((cambioAbsoluto / valorInicial) * 100);
  const isPositive = cambioAbsoluto >= 0;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestPoint = null;
    let minDistance = 50;

    for (const point of points) {
      const distX = Math.abs(mouseX - point.x);
      if (distX < minDistance) {
        minDistance = distX;
        closestPoint = point;
      }
    }

    if (closestPoint) {
      setHoveredPoint(closestPoint);
      setMousePos({ x: mouseX, y: e.clientY - rect.top });
    } else {
      setHoveredPoint(null);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-CL', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true });
  const getYAxisLabels = () => Array.from({ length: 5 }, (_, i) => minValor + (rangoValor * i / 4));

  return (
    <div className={`rounded-2xl p-8 shadow-2xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'
      }`}>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-yellow-500 mb-2">Precio UE - Actual</h3>
        <div className="flex items-baseline gap-4">
          <span className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${navPrice ? parseFloat(navPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : 'Cargando...'}</span>
          <span className={`text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{cambioAbsoluto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm">({isPositive ? '+' : ''}{cambioPorcentual.toFixed(2)}%)</span>
          </span>
        </div>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Última actualización: {new Date().toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      <div className="flex items-center gap-2 mb-6 rounded-lg p-1 w-fit border relative ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'
        }`}>
        {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'All'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${timeRange === range
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-lg shadow-yellow-500/30'
              : isDarkMode
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
          >
            {range}
          </button>
        ))}
        {actualRange && (
          <span className="ml-2 px-2 py-1 text-[10px] rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 whitespace-nowrap">
            Mostrando datos de {actualRange}
          </span>
        )}
      </div>

      <div className={`relative rounded-xl border ${isDarkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'
        }`} style={{ overflow: 'visible' }}>
        <svg width={width} height={height} className="mx-auto" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredPoint(null)}>
          <defs>
            <linearGradient id="areaGradientGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
            </linearGradient>
            <filter id="shadowGold">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#d4af37" floodOpacity="0.6" />
            </filter>
            <filter id="glowGold">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {getYAxisLabels().map((value, i) => {
            const y = padding.top + chartHeight * (1 - (i / 4));
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className={`text-xs font-medium ${isDarkMode ? 'fill-gray-500' : 'fill-gray-600'}`}>${value.toFixed(0)}</text>
              </g>
            );
          })}

          {points.filter((_, i) => i % Math.max(Math.floor(points.length / 6), 1) === 0).map((point, i) => (
            <text
              key={i}
              x={point.x}
              y={height - padding.bottom + 25}
              textAnchor="middle"
              className={`text-xs font-medium ${isDarkMode ? 'fill-gray-500' : 'fill-gray-600'}`}
            >
              {formatDate(point.fecha)}
            </text>
          ))}

          <path d={areaPathD} fill="url(#areaGradientGold)" />
          <path d={pathD} fill="none" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glowGold)" />

          {hoveredPoint && (
            <>
              <line x1={hoveredPoint.x} y1={padding.top} x2={hoveredPoint.x} y2={padding.top + chartHeight} stroke="#d4af37" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" fill="#d4af37" stroke="#fff" strokeWidth="2" filter="url(#shadowGold)" />
            </>
          )}
        </svg>

        {hoveredPoint && (
          <div className="absolute pointer-events-none z-50" style={{ left: `${Math.min(mousePos.x + 15, width - 250)}px`, top: `${Math.max(mousePos.y - 100, 10)}px` }}>
            <div className={`border-2 border-yellow-500 rounded-lg px-4 py-3 shadow-2xl shadow-yellow-500/30 ${isDarkMode ? 'bg-gray-900' : 'bg-white'
              }`}>
              <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(hoveredPoint.fecha)}</p>
              <p className="text-lg font-bold text-yellow-500">${hoveredPoint.valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatTime(hoveredPoint.fecha)}</p>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Capital: ${hoveredPoint.capitalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-4 gap-4 mt-6 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'
        }`}>
        <div>
          <p className={`text-xs uppercase tracking-wide mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Previous Close</p>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${valorInicial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wide mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Day Range</p>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${minValor.toFixed(2)} - ${maxValor.toFixed(2)}</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wide mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>52 Week Range</p>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Math.min(...valores).toFixed(2)} - ${Math.max(...valores).toFixed(2)}</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wide mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Snapshots</p>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{historial.length} registros</p>
        </div>
      </div>
    </div>
  );
};

const WalletCard = ({ icon, title, value, subtext, valueClassName = "text-white", gradient, isDarkMode }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl ${gradient} border shadow-2xl transition-all duration-500 hover:scale-[1.02] group ${isDarkMode ? 'border-white/10 hover:shadow-yellow-500/20' : 'border-gray-300 hover:shadow-yellow-500/30'
    }`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl backdrop-blur-sm text-2xl ${isDarkMode ? 'bg-white/10' : 'bg-white/30'
          }`}>{icon}</div>
        <h3 className={`text-sm font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>{title}</h3>
      </div>
      <p className={`text-4xl font-bold ${valueClassName} mb-1`}>{value}</p>
      {subtext && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
          <TrendingUp size={12} className="text-green-400" />
          {subtext}
        </p>
      )}
    </div>
  </div>
);

const TradingActionButton = ({ onClick, disabled, loading, text, icon, colorConfig }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className={`w-full ${colorConfig.bg} ${colorConfig.hoverBg} text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl ${colorConfig.shadow} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10`}
  >
    {loading ? (
      <>
        <Loader2 className="animate-spin" size={20} /> Procesando...
      </>
    ) : (
      <>
        {icon} {text}
      </>
    )}
  </button>
);

const Market = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [navData, setNavData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userWallet, setUserWallet] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [userBankAccount, setUserBankAccount] = useState('');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [marketMetrics, setMarketMetrics] = useState({ ues_circulacion: 0, capital_total: 0, inversores: 0, nav_actual: 0 });
  const [latestCapitalTotal, setLatestCapitalTotal] = useState(0);
  const [navPrice, setNavPrice] = useState(0);
  const [visibleTransactions, setVisibleTransactions] = useState(3);
  const [visibleOrders, setVisibleOrders] = useState(3);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fetchCapitalTotal = useCallback(async () => {
    const { data, error } = await supabase
      .from('nav_historico')
      .select('capital_total')
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLatestCapitalTotal(data.capital_total);
    }
  }, []);

  const fetchNavPrice = useCallback(async () => {
    const { data } = await supabase.from('precio_actual_ue').select('*').single();
    if (data) setNavPrice(data.precio_actual);
  }, []);

  const fetchNavData = useCallback(async () => {
    const { data, error } = await supabase.from('nav_historico').select('nav').order('fecha', { ascending: false }).limit(1).single();
    setNavData(error && error.code !== 'PGRST116' ? null : data);
  }, []);

  const fetchUserWallet = useCallback(async () => {
    if (!session?.user?.id) {
      setUserWallet(null);
      return;
    }
    const { data, error } = await supabase.from('usuarios').select('saldo_clp, saldo_usd').eq('id', session.user.id).single();
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching user wallet:", error);
      setUserWallet(null);
    } else {
      setUserWallet(data);
    }
  }, [session]);

  const fetchUserTransactions = useCallback(async () => {
    if (!session?.user?.id) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    setTransactionsLoading(true);
    const { data, error } = await supabase.from('transacciones_billetera').select('fecha, tipo, cantidad_ue, nav_ue, monto_clp').eq('usuario_id', session.user.id).order('fecha', { ascending: false });
    if (error) {
      console.error('Error fetchUserTransactions:', error);
      setTransactions([]);
    } else {
      setTransactions(data || []);
    }
    setTransactionsLoading(false);
  }, [session]);

  const fetchAllOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase.from('ordenes_ue').select('id, usuario_id, tipo, cantidad_total, cantidad_restante, precio_nav, estado, fecha_creacion, fecha_actualizacion').order('fecha_creacion', { ascending: false }).limit(50);
    if (error) {
      console.error('Error fetchAllOrders:', error);
      setAllOrders([]);
    } else {
      setAllOrders(data || []);
    }
    setOrdersLoading(false);
  }, []);

  const fetchMarketMetrics = useCallback(async () => {
    const { data, error } = await supabase.rpc('obtener_metricas_mercado');
    if (error) {
      console.error("Error fetching metrics:", error);
    } else if (data?.length > 0) {
      const m = data[0];
      setMarketMetrics({
        ues_circulacion: m.ues_circulacion || 0,
        capital_total: m.capital_total || 0,
        inversores: m.inversores || 0,
        nav_actual: m.nav_actual || 0
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMarketMetrics(),
      fetchNavData(),
      fetchNavPrice(),
      fetchUserWallet(),
      fetchUserTransactions(),
      fetchAllOrders(),
      fetchCapitalTotal()
    ]).finally(() => setLoading(false));

    const marketChannel = supabase.channel('market_main_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metricas_mercado' }, fetchMarketMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nav_historico' }, () => {
        fetchNavData();
        fetchCapitalTotal();
        fetchNavPrice();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_ue' }, fetchAllOrders)
      .subscribe();

    let walletChannel = null;
    if (session?.user?.id) {
      walletChannel = supabase.channel(`wallet_user_${session.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios', filter: `id=eq.${session.user.id}` }, fetchUserWallet)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transacciones_billetera', filter: `usuario_id=eq.${session.user.id}` }, fetchUserTransactions)
        .subscribe();
    }

    return () => {
      supabase.removeChannel(marketChannel);
      if (walletChannel) supabase.removeChannel(walletChannel);
    };
  }, [session, fetchMarketMetrics, fetchNavData, fetchNavPrice, fetchUserWallet, fetchUserTransactions, fetchAllOrders, fetchCapitalTotal]);

  useEffect(() => {
    const loadUserBankId = async () => {
      if (showDepositModal && session?.user?.id) {
        const { data } = await supabase
          .from('usuarios')
          .select('id_bancario')
          .eq('id', session.user.id)
          .single();

        if (data?.id_bancario) {
          setUserBankAccount(data.id_bancario);
        }
      }
    };
    loadUserBankId();
  }, [showDepositModal, session]);

  const handleBuyUnits = async () => {
    const normalizedAmount = Number(buyAmount.replace(',', '.'));
    if (!session?.user?.id || !navPrice || isNaN(normalizedAmount) || normalizedAmount <= 0) {
      toast({ variant: "destructive", title: "Datos de compra inválidos", description: "Ingresa una cantidad válida y asegúrate de estar logueado." });
      return;
    }
    setIsBuying(true);
    try {
      const { data, error } = await supabase.rpc("procesar_compra_ue_con_ajuste", {
        p_usuario_id: session.user.id,
        p_cantidad: normalizedAmount
      });
      if (error) {
        toast({ variant: "destructive", title: "Error al procesar compra", description: error.message });
        return;
      }
      if (data?.length > 0 && data[0]?.ok) {
        toast({ title: "✅ Compra realizada", description: data[0]?.mensaje || "La compra fue procesada con éxito." });
        setBuyAmount('');
        Promise.all([fetchUserWallet(), fetchUserTransactions(), fetchAllOrders(), fetchNavPrice()]);
      } else {
        toast({ variant: "destructive", title: "Compra rechazada", description: data[0]?.mensaje || "No se pudo completar la compra." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error inesperado", description: e.message });
    } finally {
      setIsBuying(false);
    }
  };

  const handleSellUnits = async () => {
    const normalizedAmount = Number(sellAmount.replace(',', '.'));
    if (!session?.user?.id || !navData?.nav || isNaN(normalizedAmount) || normalizedAmount <= 0) {
      toast({ variant: "destructive", title: "Datos de venta inválidos", description: "Asegúrate de ingresar una cantidad válida y estar logueado." });
      return;
    }
    setIsSelling(true);
    try {
      const { data, error } = await supabase.rpc("procesar_venta_ue_con_ajuste", {
        p_usuario_id: session.user.id,
        p_cantidad: normalizedAmount
      });
      if (error) throw error;
      if (data?.length > 0 && data[0]?.ok) {
        toast({ title: "✅ Venta realizada", description: data[0]?.mensaje || "La venta fue procesada con éxito." });
        setSellAmount('');
        Promise.all([fetchAllOrders(), fetchUserWallet(), fetchUserTransactions(), fetchNavPrice()]);
      } else {
        toast({ variant: "destructive", title: "Venta rechazada", description: data[0]?.mensaje || "No se pudo completar." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error inesperado", description: e.message });
    } finally {
      setIsSelling(false);
    }
  };

  const handleDeposit = async () => {
    if (!session?.user?.id) {
      toast({ variant: "destructive", title: "No autenticado", description: "Debes iniciar sesión para registrar tu nombre bancario." });
      return;
    }
    if (!userBankAccount || userBankAccount.trim().length < 3) {
      toast({ variant: "destructive", title: "ID inválido", description: "Debes ingresar un nombre bancario válido (mínimo 3 caracteres)." });
      return;
    }

    setIsProcessingDeposit(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ id_bancario: userBankAccount.trim() })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "✅ nombre bancario guardado",
        description: `Tu nombre bancario "${userBankAccount}" ha sido registrado. Úsalo como glosa en tus transferencias.`
      });

      setShowDepositModal(false);
      setUserBankAccount('');
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar nombre bancario", description: e.message });
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />
          <div className="absolute inset-0 blur-xl bg-yellow-500/30 animate-pulse" />
        </div>
      </div>
    );
  }

  const userSaldoCLP = userWallet?.saldo_clp ? parseFloat(userWallet.saldo_clp).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : 'CLP 0';
  const userSaldoUSD = userWallet?.saldo_usd ? `$${parseFloat(userWallet.saldo_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '$0.00 USD';

  return (
    <div className={`w-full min-h-screen p-8 transition-colors duration-300 ${isDarkMode
      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
      : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}>
      <Helmet>
        <title>Mercado - Freraut Invest</title>
        <meta name="description" content="Visualiza el valor actual de la Unidad de Inversión (NAV) y realiza operaciones de compra/venta." />
      </Helmet>

      <div className="space-y-8 pb-8">
        <div className="flex items-center justify-between">
          <div className="relative">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">Mercado y Operaciones</h2>
            <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-yellow-600 to-transparent rounded-full" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <WalletCard
            icon="📊"
            title="Precio Actual UE"
            value={navPrice ? `$${parseFloat(navPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USD` : 'Cargando...'}
            valueClassName="text-blue-400"
            gradient={isDarkMode ? "from-yellow-900/20 to-gray-900/40" : "from-yellow-100 to-gray-50"}
            isDarkMode={isDarkMode}
          />
          <WalletCard
            icon="💰"
            title="Capital Total"
            value={`$${parseFloat(latestCapitalTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
            subtext="Capital de inversión disponible"
            valueClassName="text-green-400"
            gradient={isDarkMode ? "from-green-900/20 to-gray-900/40" : "from-green-100 to-gray-50"}
            isDarkMode={isDarkMode}
          />
          <WalletCard
            icon="📈"
            title="UEs en Circulación"
            value={marketMetrics.ues_circulacion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            subtext={`${marketMetrics.inversores} inversores activos`}
            valueClassName="text-blue-400"
            gradient={isDarkMode ? "from-blue-900/20 to-gray-900/40" : "from-blue-100 to-gray-50"}
            isDarkMode={isDarkMode}
          />
        </div>

        <NavHistoricoChart isDarkMode={isDarkMode} navPrice={navPrice} />

        <div className={`backdrop-blur-xl rounded-2xl p-6 border shadow-2xl ${isDarkMode ? 'bg-gray-900/40 border-white/10' : 'bg-white/80 border-gray-300'
          }`}>
          <VolumeChart isDarkMode={isDarkMode} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sección de Compra */}
          <div className={`backdrop-blur-xl rounded-2xl p-6 border shadow-2xl transition-all duration-300 ${isDarkMode
            ? 'bg-gradient-to-br from-green-900/10 to-gray-900/40 border-green-500/20 hover:shadow-green-500/10'
            : 'bg-gradient-to-br from-green-50 to-white border-green-300 hover:shadow-green-300/30'
            }`}>
            <h3 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
              <div className="p-2 rounded-xl bg-green-500/20">
                <ShoppingCart className="w-6 h-6 text-green-400" />
              </div>
              Comprar UEs
            </h3>

            <div className={`mb-4 p-4 rounded-xl backdrop-blur-sm border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Saldo disponible</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userSaldoUSD}</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{userSaldoCLP}</p>  
            </div>

            <button
              onClick={() => setShowDepositModal(true)}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl mb-4 flex items-center justify-center gap-2 border border-yellow-400/20"
            >
              <Wallet size={20} /> Depositar Fondos
            </button>

            <div className="space-y-4">
              <div>
                <label htmlFor="buy-amount" className={`block text-sm font-semibold mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Cantidad de UEs</label>
                <input
                  type="text"
                  id="buy-amount"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0.00000000"
                  className={`w-full p-4 backdrop-blur-sm border rounded-xl text-lg transition-all ${isDarkMode
                    ? 'bg-gray-900/60 border-green-500/30 text-white focus:ring-2 focus:ring-green-500'
                    : 'bg-white border-green-300 text-gray-900 focus:ring-2 focus:ring-green-400'
                    } focus:border-transparent`}
                  pattern="[0-9.,]*[0-9]"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>

              <div className={`p-4 rounded-xl backdrop-blur-sm border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Costo Estimado</p>
                <p className="text-xl font-bold text-green-400">
                  {buyAmount && navPrice ? '$' + (Number(buyAmount.replace(',', '.')) * navPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD' : '$0.00 USD'}              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{userSaldoCLP}</p>  
                </p>
              </div>

              <TradingActionButton
                onClick={handleBuyUnits}
                disabled={!session || !navPrice || !buyAmount || Number(buyAmount.replace(',', '.')) <= 0 || (userWallet && (Number(buyAmount.replace(',', '.')) * navPrice) > (userWallet.saldo_usd || 0))}
                loading={isBuying}
                text="Comprar UEs"
                icon={<Plus size={22} />}
                colorConfig={{
                  bg: "bg-gradient-to-r from-green-600 to-green-500",
                  hoverBg: "hover:from-green-500 hover:to-green-400",
                  shadow: "shadow-green-500/30"
                }}
              />
            </div>
          </div>

          {/* Sección de Venta */}
          <div className={`backdrop-blur-xl rounded-2xl p-6 border shadow-2xl transition-all duration-300 ${isDarkMode
            ? 'bg-gradient-to-br from-red-900/10 to-gray-900/40 border-red-500/20 hover:shadow-red-500/10'
            : 'bg-gradient-to-br from-red-50 to-white border-red-300 hover:shadow-red-300/30'
            }`}>
            <h3 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
              <div className="p-2 rounded-xl bg-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              Vender UEs
            </h3>

            <div className={`mb-6 p-4 rounded-xl backdrop-blur-sm border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Saldo disponible</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userSaldoUSD}</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{userSaldoCLP}</p>  
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="sell-amount" className={`block text-sm font-semibold mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Cantidad de UEs</label>
                <input
                  type="text"
                  id="sell-amount"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0.00000000"
                  className={`w-full p-4 backdrop-blur-sm border rounded-xl text-lg transition-all ${isDarkMode
                    ? 'bg-gray-900/60 border-red-500/30 text-white focus:ring-2 focus:ring-red-500'
                    : 'bg-white border-red-300 text-gray-900 focus:ring-2 focus:ring-red-400'
                    } focus:border-transparent`}
                  pattern="[0-9.,]*[0-9]"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>

              <div className={`p-4 rounded-xl backdrop-blur-sm border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Valor Estimado</p>
                <p className="text-xl font-bold text-red-400">
                  {sellAmount && navData ? '$' + (Number(sellAmount.replace(',', '.')) * navData.nav).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD' : '$0.00 USD'}
                </p>
              </div>

              <TradingActionButton
                onClick={handleSellUnits}
                disabled={!session || !navData || !sellAmount || Number(sellAmount.replace(',', '.')) <= 0}
                loading={isSelling}
                text="Vender UEs"
                icon={<ArrowDownLeft size={22} />}
                colorConfig={{
                  bg: "bg-gradient-to-r from-red-600 to-red-500",
                  hoverBg: "hover:from-red-500 hover:to-red-400",
                  shadow: "shadow-red-500/30"
                }}
              />
            </div>
          </div>
        </div>

        {/* Libro de Órdenes FIFO */}
        <div className={`backdrop-blur-xl rounded-2xl p-6 border shadow-2xl ${isDarkMode ? 'bg-gray-900/40 border-white/10' : 'bg-white/80 border-gray-300'
          }`}>
          <h3 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-600/30 to-yellow-500/20 border border-yellow-500/30">
              <span className="text-2xl">📖</span>
            </div>
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent tracking-wide" style={{ fontFamily: "'Playfair Display', 'Georgia', serif", letterSpacing: '0.02em', textShadow: '0 0 30px rgba(234, 179, 8, 0.3)' }}>
              Libro de Órdenes FIFO
            </span>
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-green-900/10 border-green-500/20' : 'bg-green-50 border-green-300'
              }`}>
              <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Órdenes de Compra</p>
              <p className="text-2xl font-bold text-green-400">{allOrders.filter(o => o.tipo === 'compra').length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-red-900/10 border-red-500/20' : 'bg-red-50 border-red-300'
              }`}>
              <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Órdenes de Venta</p>
              <p className="text-2xl font-bold text-red-400">{allOrders.filter(o => o.tipo === 'venta').length}</p>
            </div>
          </div>

          <div className="space-y-2">
            {ordersLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : !allOrders.length ? (
              <div className={`text-center py-8 italic ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>No hay órdenes registradas</div>
            ) : (
              <>
                <div className={`grid grid-cols-6 gap-4 p-4 rounded-xl border font-semibold text-xs uppercase ${isDarkMode ? 'bg-white/5 border-white/20 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}>
                  <span>Fecha</span>
                  <span>Tipo</span>
                  <span className="text-center">UEs</span>
                  <span className="text-center">Precio UE</span>
                  <span className="text-right">Total USD</span>
                  <span className="text-center">Estado</span>
                </div>

                {allOrders.slice(0, visibleOrders).map(order => {
                  const totalCLP = order.cantidad_restante * order.precio_nav;
                  const estadoBadge = order.estado === 'completada' ? '✅' : order.estado === 'parcial' ? '⏳' : '🔄';
                  return (
                    <div key={order.id} className={`grid grid-cols-6 gap-4 items-center p-4 backdrop-blur-sm rounded-xl border transition-all ${isDarkMode
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(order.fecha_creacion).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`font-bold text-lg ${order.tipo === 'compra' ? 'text-green-400' : 'text-red-400'}`}>
                        {order.tipo.toUpperCase()}
                      </span>
                      <span className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {order.cantidad_restante.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </span>
                      <span className={`font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${order.precio_nav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </span>
                      <span className="text-blue-400 font-semibold text-right">
                        ${totalCLP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-center text-sm">
                        {estadoBadge} <span className={`text-xs uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{order.estado}</span>
                      </span>
                    </div>
                  );
                })}

                {visibleOrders < allOrders.length && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleOrders(prev => prev + 10)}
                      className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center gap-2 border border-yellow-400/20"
                    >
                      <ChevronDown size={20} />
                      Ver más ({Math.min(10, allOrders.length - visibleOrders)} órdenes)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mis Transacciones */}
        <div className={`backdrop-blur-xl rounded-2xl p-6 border shadow-2xl ${isDarkMode ? 'bg-gray-900/40 border-white/10' : 'bg-white/80 border-gray-300'
          }`}>
          <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
            <div className="p-2 rounded-xl bg-blue-500/20">
              <History className="w-6 h-6 text-blue-400" />
            </div>
            Mis Transacciones
          </h3>

          <div className="overflow-x-auto">
            {transactionsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : !transactions.length ? (
              <div className={`text-center py-12 italic ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>No tienes transacciones registradas</div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead className={`border-b ${isDarkMode ? 'border-white/10' : 'border-gray-300'}`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>Fecha</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>Tipo</th>
                      <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>Cantidad UE</th>
                      <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>Precio UE</th>
                      <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-700'
                        }`}>Total USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, visibleTransactions).map((tx, index) => (
                      <tr key={index} className={`border-b transition-all ${isDarkMode
                        ? 'border-white/5 hover:bg-white/5'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <td className={`px-4 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(tx.fecha).toLocaleString('es-CL')}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${tx.tipo === 'compra'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {tx.tipo}
                          </span>
                        </td>
                        <td className={`px-4 py-4 text-right text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {parseFloat(tx.cantidad_ue || 0).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </td>
                        <td className={`px-4 py-4 text-right text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          ${parseFloat(tx.nav_ue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className={`px-4 py-4 text-right font-bold ${tx.tipo === 'compra' ? 'text-red-400' : 'text-green-400'}`}>
                          {tx.tipo === 'compra' ? '-' : '+'}${Math.abs(parseFloat(tx.monto_clp)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {visibleTransactions < transactions.length && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleTransactions(prev => prev + 10)}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center gap-2 border border-blue-400/20"
                    >
                      <ChevronDown size={20} />
                      Ver más ({Math.min(10, transactions.length - visibleTransactions)} transacciones)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showDepositModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 p-4">
            <div className={`rounded-2xl p-8 shadow-2xl max-w-md w-full border relative overflow-hidden ${isDarkMode
                ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30'
                : 'bg-gradient-to-br from-white to-gray-50 border-yellow-500/50'
              }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent mb-6">
                  Registrar NOMBRE Bancario
                </h3>

                <div className="mb-6">
                  <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    NOMBRE EXACTO de cuenta bancaria
                  </label>
                  <input
                    type="text"
                    value={userBankAccount}
                    onChange={(e) => setUserBankAccount(e.target.value)}
                    className={`w-full border p-4 rounded-xl backdrop-blur-sm text-lg transition-all ${isDarkMode
                        ? 'bg-gray-900/60 border-yellow-500/30 text-white focus:ring-2 focus:ring-yellow-500 placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-yellow-500 placeholder-gray-400'
                      } focus:border-transparent`}
                    placeholder="Ej: JUAN PEREZ PEREZ"
                  />
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    Este NOMBRE se usará para identificar tus transferencias automáticamente
                  </p>
                </div>

                <div className={`p-4 rounded-xl border mb-6 ${isDarkMode
                    ? 'bg-blue-900/10 border-blue-500/20'
                    : 'bg-blue-50 border-blue-300'
                  }`}>
                  <p className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    📋 Datos para transferencia
                  </p>
                  <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="flex justify-between">
                      <span className="font-semibold">Titular:</span>
                      <span>Freraut Invest SpA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">RUT:</span>
                      <span>78.269.999-7</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Banco:</span>
                      <span>Banco Global66</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Tipo de cuenta:</span>
                      <span>Cuenta vista</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">N° Cuenta:</span>
                      <span className="font-mono">12349815</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Email:</span>
                      <span>FRERAUTGROUPS.A@GMAIL.COM</span>
                    </div>
                  </div>
                  <div className={`mt-3 p-2 rounded-lg ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'
                    }`}>
                    <p className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      ⚠️ <strong>Importante:</strong> Usa tu NOMBRE bancario <strong className="font-mono">{userBankAccount || '[tu nombre]'}</strong> como glosa/mensaje de la transferencia para que sea detectada automáticamente por Global66
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setUserBankAccount('');
                    }}
                    className={`flex-1 border font-semibold py-3 px-4 rounded-xl transition-all ${isDarkMode
                        ? 'border-gray-700 text-gray-400 hover:bg-gray-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={isProcessingDeposit || !userBankAccount || userBankAccount.trim().length < 3}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
                  >
                    {isProcessingDeposit ? (
                      <>
                        <Loader2 className="animate-spin" size={20} /> Guardando...
                      </>
                    ) : (
                      <>
                        <Wallet size={20} /> Guardar Datos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Market;