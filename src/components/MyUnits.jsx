import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, Calendar, Wallet, PieChart, ArrowUpRight, ArrowDownRight, Loader2, DollarSign, X, Save, Trash2, RefreshCw, ArrowRightLeft } from 'lucide-react';

const formatUSD = (val) => {
  if (val == null || isNaN(val)) return '$0.00 USD';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
};
const formatCLP = (val, fx) => {
  if (val == null || isNaN(val) || !fx) return '';
  const clp = Number(val) * fx;
  return '≈ $' + Math.round(clp).toLocaleString('es-CL') + ' CLP';
};

function PatrimonioChart({ historial, fxRate, lucro, saldoCLP, saldoUSD }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!historial || historial.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-black/95 border border-gray-200 dark:border-[#C9A227]/20 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#C9A227]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1D2B] dark:text-white tracking-tight">Evolución de tu Patrimonio</h3>
        </div>
        <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-sm text-center py-8">No hay suficiente historial para mostrar el gráfico</p>
      </motion.div>
    );
  }

  const width = 900;
  const height = 350;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const valoresPatrimonio = historial.map(h => h?.patrimonio_total_real ? Number(h.patrimonio_total_real) : 0);
  const todosLosValores = valoresPatrimonio.filter(v => v > 0);

  if (todosLosValores.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-black/95 border border-gray-200 dark:border-[#C9A227]/20 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#C9A227]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1D2B] dark:text-white tracking-tight">Evolución de tu Patrimonio</h3>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-600 dark:text-red-400 text-xs">Los datos del historial existen pero todos los valores son 0</p>
        </div>
      </motion.div>
    );
  }

  const minValor = Math.min(...todosLosValores) * 0.95;
  const maxValor = Math.max(...todosLosValores) * 1.05;
  const rangoValor = maxValor - minValor || 1;

  const allPoints = historial.map((item, index) => {
    const valor = Number(item?.patrimonio_total_real || 0);
    return {
      x: padding.left + (index / (historial.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((valor - minValor) / rangoValor) * chartHeight,
      fecha: item.fecha,
      valor,
      index
    };
  });

  // Smooth curve (Catmull-Rom → cubic Bezier)
  function smoothPath(pts) {
    if (pts.length < 2) return pts.map(p => `${p.x},${p.y}`).join(' ');
    return pts.map((p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = a[i - 1];
      const next = a[i + 1] || p;
      const tension = 0.3;
      const cp1x = prev.x + (p.x - prev.x) * tension;
      const cp1y = prev.y + (p.y - prev.y) * tension;
      const cp2x = p.x - (next.x - prev.x) * tension;
      const cp2y = p.y - (next.y - prev.y) * tension;
      return `C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p.x},${p.y}`;
    }).join(' ');
  }

  const pathD = smoothPath(allPoints);
  const areaPathD = pathD + ` L ${allPoints[allPoints.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  const valorPatrimonioFinal = valoresPatrimonio[valoresPatrimonio.length - 1];
  const valorInicial = valoresPatrimonio[0];
  const cambioAbsoluto = valorPatrimonioFinal - valorInicial;
  const cambioPorcentaje = valorInicial > 0 ? ((cambioAbsoluto / valorInicial) * 100).toFixed(2) : '0.00';
  const esPositivo = cambioAbsoluto >= 0;

  // Calcular patrimonio total real: USD + UEs + CLP convertido
  const totalPatrimonioUSD = (saldoUSD || 0) + (lucro?.valor_actual || 0) + ((saldoCLP || 0) / fxRate);
  const totalPatrimonioCLP = (saldoCLP || 0) + ((lucro?.valor_actual || 0) * fxRate) + ((saldoUSD || 0) * fxRate);

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = svg.width.baseVal.value / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (mouseX < padding.left - 10 || mouseX > width - padding.right + 5) {
      setHoveredPoint(null);
      return;
    }
    const idx = Math.round(((mouseX - padding.left) / chartWidth) * (allPoints.length - 1));
    const clamped = Math.max(0, Math.min(idx, allPoints.length - 1));
    setHoveredPoint(allPoints[clamped]);
  };

  const handleMouseLeave = () => setHoveredPoint(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-800/90 dark:to-black/95 border border-gray-200 dark:border-[#C9A227]/20 rounded-2xl p-6 shadow-sm relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A227]/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#C9A227]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1A1D2B] dark:text-white tracking-tight">
                Evolución de tu Patrimonio
              </h3>
              <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF] mt-0.5">
                {formatUSD(totalPatrimonioUSD)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/50">
            <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Últimos 30 días</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
            <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF] font-medium mb-1 tracking-wide">Patrimonio Actual</p>
            <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight">
              {formatUSD(totalPatrimonioUSD)}
            </p>
            <p className="text-xs text-[#6E6E6E]/70 dark:text-[#9CA3AF]/70 mt-0.5">{formatCLP(totalPatrimonioUSD, fxRate)}</p>
          </div>
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
            <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF] font-medium mb-1 tracking-wide">Cambio Total</p>
            <p className={`text-2xl font-bold tracking-tight ${esPositivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {esPositivo ? '+' : ''}{cambioPorcentaje}%
            </p>
          </div>
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
            <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF] font-medium mb-1 tracking-wide">Patrimonio en CLP</p>
            <p className="text-2xl font-bold text-[#1A1D2B] dark:text-white tracking-tight">
              {formatCLP(totalPatrimonioUSD, fxRate)}
            </p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="overflow-hidden rounded-xl p-5 border border-gray-200 dark:border-[#C9A227]/15 relative"
          style={{ background: '#0b0c10', backgroundImage: `radial-gradient(circle, rgba(201,162,39,0.15) 0.5px, transparent 0.5px)`, backgroundSize: '12px 12px' }}
        >
          <svg width={width} height={height} className="mx-auto" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair' }} shapeRendering="geometricPrecision">
            <defs>
              <linearGradient id="gradientGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C9A227" stopOpacity="0.35" />
                <stop offset="30%" stopColor="#C9A227" stopOpacity="0.15" />
                <stop offset="60%" stopColor="#C9A227" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
              </linearGradient>
              <filter id="lineGlowGold">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="lineGradientGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A227" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#C9A227" />
              </linearGradient>
              <filter id="nodeGlowGold">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
              const yPos = padding.top + chartHeight * (1 - f);
              const valorEtiqueta = minValor + rangoValor * f;
              return (
                <g key={i}>
                  <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos}
                    stroke="#ffffff" strokeWidth="1" strokeDasharray="3 5" opacity="0.08" />
                  <text x={padding.left - 12} y={yPos + 4} textAnchor="end" fill="#9CA3AF" fontSize="11" fontWeight="400">
                    ${(valorEtiqueta / 1000).toFixed(1)}k
                  </text>
                </g>
              );
            })}

            <path d={areaPathD} fill="url(#gradientGold)" opacity="0.6" />
            <path d={pathD} fill="none" stroke="#C9A227" strokeWidth="8" strokeLinecap="round" opacity="0.15" />
            <path d={pathD} fill="none" stroke="url(#lineGradientGold)" strokeWidth="2" strokeLinecap="round" filter="url(#lineGlowGold)" />

            <circle cx={allPoints[allPoints.length - 1].x} cy={allPoints[allPoints.length - 1].y} r="4" fill="#C9A227" stroke="#fff" strokeWidth="2" filter="url(#nodeGlowGold)" />

            {hoveredPoint && (
              <>
                <line x1={hoveredPoint.x} y1={padding.top} x2={hoveredPoint.x} y2={height - padding.bottom}
                  stroke="#C9A227" strokeWidth="1" strokeDasharray="3 4" opacity="0.3" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#C9A227" stroke="#fff" strokeWidth="2" filter="url(#nodeGlowGold)" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="10" fill="none" stroke="#C9A227" strokeWidth="1" opacity="0.2">
                  <animate attributeName="r" from="5" to="16" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </svg>

          {hoveredPoint && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute bg-white dark:bg-gray-900 border border-[#C9A227]/30 rounded-xl px-4 py-2.5 shadow-lg backdrop-blur-md pointer-events-none"
              style={{ left: Math.min(mousePos.x + 15, width - 200), top: Math.max(mousePos.y - 80, 10) }}>
              <p className="text-[10px] text-[#C9A227] font-semibold uppercase tracking-wider mb-1">
                {new Date(hoveredPoint.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-base font-bold text-white">{formatUSD(hoveredPoint.valor)}</p>
              <p className="text-xs text-gray-400">{formatCLP(hoveredPoint.valor, fxRate)}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

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
    email: ''
  });
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [saldoDisponible, setSaldoDisponible] = useState(0);
  const [saldoUSD, setSaldoUSD] = useState(0);

  // Estados para historial de retiros
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [withdrawHistoryLimit, setWithdrawHistoryLimit] = useState(3);
  const [hasMoreWithdraws, setHasMoreWithdraws] = useState(false);

  // ============================================
  // NUEVOS ESTADOS: Modal de cambio CLP → USD
  // ============================================
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [exchangeQuote, setExchangeQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isProcessingExchange, setIsProcessingExchange] = useState(false);

  // ============================================
  // CARGAR HISTORIAL DE RETIROS (desde tabla retiros)
  // ============================================
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

        const { data: histData, error: histError } = await supabase
          .rpc('obtener_historial_patrimonio', {
            p_usuario_id: user.id,
            p_dias: 30
          });

        if (histError) console.error('Error historial:', histError);
        else setHistorial(histData || []);

        const { data: lucroData, error: lucroError } = await supabase
          .rpc('obtener_lucro_detallado', {
            p_usuario_id: user.id
          });

        if (lucroError) console.error('Error lucro:', lucroError);
        else setLucro(lucroData);

        const { data: userData } = await supabase
          .from('usuarios')
          .select('nombre, email, rut')
          .eq('id', user.id)
          .single();

        if (userData) {
          setBankData(prev => ({
            ...prev,
            nombreTitular: userData.nombre || '',
            email: userData.email || '',
            rutTitular: userData.rut || ''
          }));
        }

        await loadSavedBankAccounts();
        await loadWithdrawHistory(withdrawHistoryLimit);
        await loadSaldoDisponible();

        // Cargar tipo de cambio USD/CLP
        const { data: fx } = await supabase
          .from('fx_config')
          .select('manual_rate')
          .eq('is_active', true)
          .maybeSingle();
        if (fx?.manual_rate) setFxRate(parseFloat(fx.manual_rate));

      } catch (error) {
        console.error('Error fetching units data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const loadSavedBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_datos_bancarios', {
          p_usuario_id: user.id
        });

      if (error) throw error;

      setSavedBankAccounts(data || []);

      const cuentaPrincipal = data?.find(cuenta => cuenta.es_principal);
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
      email: cuenta.email
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

      setSaldoDisponible(Number(usuarioData?.saldo_clp || 0));
      setSaldoUSD(Number(usuarioData?.saldo_usd || 0));
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
        duration: 3000
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
        p_es_principal: savedBankAccounts.length === 0
      });

      if (error) throw error;

      toast({
        title: '✅ Datos guardados',
        description: 'Tus datos bancarios se guardaron correctamente',
        duration: 3000
      });

      await loadSavedBankAccounts();
      return true;

    } catch (error) {
      console.error('Error guardando datos bancarios:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
        duration: 4000
      });
      return false;
    }
  };

  // ============================================
  // RETIRO: Usa solicitar_retiro RPC + guarda datos bancarios en usuarios
  // ============================================
  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast({
        title: '❌ Monto inválido',
        description: 'Ingresa un monto válido para retirar',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    if (!bankData.banco || !bankData.numeroCuenta || !bankData.rutTitular || !bankData.nombreTitular) {
      toast({
        title: '❌ Datos incompletos',
        description: 'Completa todos los datos bancarios',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    const montoRetiro = Number(withdrawAmount);

    if (montoRetiro < 1000) {
      toast({
        title: '❌ Monto mínimo',
        description: 'El monto mínimo de retiro es $1.000 CLP',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    try {
      setIsProcessingWithdraw(true);

      // Recargar saldo actualizado
      await loadSaldoDisponible();

      if (montoRetiro > saldoDisponible) {
        toast({
          title: '❌ Saldo insuficiente',
          description: `Solo tienes $${saldoDisponible.toLocaleString('es-CL')} disponibles para retirar.`,
          variant: 'destructive',
          duration: 5000
        });
        setIsProcessingWithdraw(false);
        return;
      }

      // Guardar datos bancarios en columnas de usuarios
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          banco_retiro: bankData.banco,
          tipo_cuenta_retiro: bankData.tipoCuenta,
          numero_cuenta_retiro: bankData.numeroCuenta,
          rut_titular_retiro: bankData.rutTitular,
          nombre_titular_retiro: bankData.nombreTitular
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error actualizando datos bancarios en usuarios:', updateError);
      }

      // Guardar en datos_bancarios si es nueva cuenta
      if (saveForFuture && !selectedBankAccountId) {
        await saveBankData();
      }

      // Llamar al RPC solicitar_retiro
      const { data, error } = await supabase.rpc('solicitar_retiro', {
        p_user_id: user.id,
        p_monto_clp: montoRetiro
      });

      if (error) {
        if (error.message.includes('Saldo insuficiente') || error.message.includes('insuficiente')) {
          toast({
            title: '❌ Saldo insuficiente',
            description: error.message,
            variant: 'destructive',
            duration: 5000
          });
        } else if (error.message.includes('mínimo') || error.message.includes('1000')) {
          toast({
            title: '❌ Monto mínimo',
            description: error.message,
            variant: 'destructive',
            duration: 5000
          });
        } else if (error.message.includes('bancarios')) {
          toast({
            title: '❌ Datos bancarios faltantes',
            description: error.message,
            variant: 'destructive',
            duration: 5000
          });
        } else {
          throw error;
        }
        setIsProcessingWithdraw(false);
        return;
      }

      toast({
        title: '✅ Solicitud de retiro creada',
        description: `Se procesará tu retiro de $${montoRetiro.toLocaleString('es-CL')} CLP en las próximas 24-48 horas`,
        duration: 5000
      });

      // Recargar saldo y historial
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
        duration: 5000
      });
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  // ============================================
  // CAMBIO CLP → USD: Cotizar
  // ============================================
  const handleGetQuote = async () => {
    const monto = Number(exchangeAmount);
    if (!monto || monto <= 0) {
      toast({
        title: '❌ Monto inválido',
        description: 'Ingresa un monto en pesos para convertir',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }

    try {
      setIsLoadingQuote(true);
      setExchangeQuote(null);

      const { data, error } = await supabase.rpc('cotizar_cambio_clp_usd', {
        p_monto_clp: monto
      });

      if (error) throw error;

      setExchangeQuote(data);
    } catch (error) {
      console.error('Error cotizando cambio:', error);
      toast({
        title: '❌ Error al cotizar',
        description: error.message,
        variant: 'destructive',
        duration: 4000
      });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // ============================================
  // CAMBIO CLP → USD: Ejecutar conversión
  // ============================================
  const handleExecuteExchange = async () => {
    const monto = Number(exchangeAmount);
    if (!monto || monto <= 0) return;

    try {
      setIsProcessingExchange(true);

      const { data, error } = await supabase.rpc('convertir_clp_a_usd', {
        p_user_id: user.id,
        p_monto_clp: monto
      });

      if (error) {
        if (error.message.includes('insuficiente')) {
          toast({
            title: '❌ Saldo insuficiente',
            description: error.message,
            variant: 'destructive',
            duration: 5000
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: '✅ Cambio realizado',
        description: `Convertiste $${monto.toLocaleString('es-CL')} CLP a $${Number(data.monto_usd).toFixed(2)} USD`,
        duration: 5000
      });

      // Recargar saldos y cerrar modal
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
        duration: 5000
      });
    } finally {
      setIsProcessingExchange(false);
    }
  };

  const deleteBankAccount = async (accountId) => {
    try {
      const { error } = await supabase
        .from('datos_bancarios')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: '✅ Cuenta eliminada',
        description: 'La cuenta bancaria se eliminó correctamente',
        duration: 3000
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
          email: ''
        });
      }

    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
        duration: 4000
      });
    }
  };

  // Corregir historial: patrimonio_total_real (bug) = saldo_clp (CLP) + valor_ue (USD)
  // USD correcto = saldo_usd + valor_ue + (saldo_clp/fxRate)
  // 1) factor = clpRatio/fxRate + ueRatio  → transforma raw buggy a USD (sin saldo_usd)
  // 2) se suma saldoUSD a todos los puntos (saldo_usd no está en patrimonio_total_real)
  const chartHistorial = useMemo(() => {
    if (!lucro || historial.length === 0) return historial;
    const sCLP = saldoDisponible || 0;
    const ueUSD = lucro?.valor_actual || 0;
    const sUSD = saldoUSD || 0;
    const rawTotal = sCLP + ueUSD;
    const f = fxRate > 0 ? fxRate : 930;
    const factor = rawTotal > 0 ? (sCLP / rawTotal / f) + (ueUSD / rawTotal) : 0;
    if (factor <= 0) return historial;
    return historial.map(h => ({
      ...h,
      patrimonio_total_real: Number(h.patrimonio_total_real || 0) * factor + sUSD
    }));
  }, [historial, lucro, fxRate, saldoDisponible, saldoUSD]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1D2B] dark:text-white tracking-tight">Mis Unidades</h2>
        <p className="text-sm text-[#6E6E6E] dark:text-[#9CA3AF] mt-1">Resumen de tu cartera de UEs</p>
      </div>

      {lucro && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Total UEs */}
          <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Total UEs</p>
              <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
                <PieChart className="w-3.5 h-3.5 text-[#C9A227]" />
              </div>
            </div>
            <p className="text-xl font-semibold text-[#1A1D2B] dark:text-white">
              {Number(lucro.ue_totales).toLocaleString('es-CL', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
              })}
            </p>
          </div>

          {/* Valor de mis UEs */}
          <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Valor de UEs</p>
              <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
                <Wallet className="w-3.5 h-3.5 text-[#C9A227]" />
              </div>
            </div>
            <p className="text-xl font-semibold text-[#C9A227]">{formatUSD(lucro.valor_actual)}</p>
            <p className="text-[11px] text-[#6E6E6E]/70 dark:text-[#9CA3AF]/70 mt-0.5">
              {formatCLP(lucro.valor_actual, fxRate)}
            </p>
          </div>

          {/* Inversión Total */}
          <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Inversión Total</p>
              <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" />
              </div>
            </div>
            <p className="text-xl font-semibold text-[#1A1D2B] dark:text-white break-words">
              {formatUSD(lucro.total_invertido)}
            </p>
            <p className="text-[11px] text-[#6E6E6E]/70 dark:text-[#9CA3AF]/70 mt-0.5">
              {formatCLP(lucro.total_invertido, fxRate)}
            </p>
          </div>

          {/* Rentabilidad */}
          <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Rentabilidad</p>
              <div className={`p-1.5 rounded-lg ${Number(lucro.lucro_total) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {Number(lucro.lucro_total) >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            <p className={`text-xl font-semibold ${Number(lucro.lucro_total) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {Number(lucro.porcentaje_lucro).toFixed(2)}%
            </p>
            <p className={`text-[11px] mt-0.5 ${Number(lucro.lucro_total) >= 0 ? 'text-emerald-600/60 dark:text-emerald-400/60' : 'text-red-600/60 dark:text-red-400/60'}`}>
              {Number(lucro.lucro_total) >= 0 ? '+' : ''}{formatUSD(Math.abs(Number(lucro.lucro_total)))} &middot; {formatCLP(Math.abs(Number(lucro.lucro_total)), fxRate)}
            </p>
          </div>

          {/* Saldo en Pesos */}
          <div
            className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4 cursor-pointer hover:border-[#C9A227]/30 transition-all duration-300 group"
            onClick={() => setShowExchangeModal(true)}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Saldo en Pesos</p>
              <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 text-[#C9A227]" />
              </div>
            </div>
            <p className="text-xl font-semibold text-[#1A1D2B] dark:text-white">
              ${saldoDisponible.toLocaleString('es-CL')}
            </p>
            <p className="text-[11px] text-[#C9A227]/70 mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRightLeft className="w-3 h-3" />
              Cambiar a USD
            </p>
          </div>

          {/* Saldo en Dólares */}
          <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[#6E6E6E] dark:text-[#9CA3AF] text-xs font-medium tracking-wide uppercase">Saldo en Dólares</p>
              <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 text-[#C9A227]" />
              </div>
            </div>
            <p className="text-xl font-semibold text-[#1A1D2B] dark:text-white">
              ${saldoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
            <p className="text-[11px] text-[#6E6E6E]/70 dark:text-[#9CA3AF]/70 mt-0.5">
              Para compra de UEs
            </p>
          </div>
        </div>
      )}

      <PatrimonioChart historial={chartHistorial} fxRate={fxRate} lucro={lucro} saldoCLP={saldoDisponible} saldoUSD={saldoUSD} />

      {/* BOTONES DE ACCIÓN: Cambiar Divisas + Retirar Fondos */}
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => setShowExchangeModal(true)}
          className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#B8921F] text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Cambiar CLP a USD
        </button>

        <button
          onClick={() => setShowWithdrawModal(true)}
          className="px-5 py-2.5 bg-white hover:bg-gray-50 dark:bg-[#1A1D2B] dark:hover:bg-[#232738] text-[#8B1E3F] dark:text-red-400 text-sm font-medium rounded-lg border border-[#8B1E3F]/30 dark:border-red-400/30 transition-colors duration-200 flex items-center gap-2"
        >
          <DollarSign className="w-4 h-4" />
          Retirar Fondos
        </button>
      </div>

      {/* TABLA DE HISTORIAL DE RETIROS */}
      <div className="bg-white/90 dark:bg-[#1A1D2B]/80 border border-[#C9A227]/10 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C9A227]/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#C9A227]/10 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-[#C9A227]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1A1D2B] dark:text-white">Historial de Retiros</h3>
              <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF]">Seguimiento de tus solicitudes</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-[#C9A227] animate-spin" />
          </div>
        ) : withdrawHistory.length === 0 ? (
          <div className="text-center py-10 mx-4 mb-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <DollarSign className="w-8 h-8 text-[#6E6E6E]/40 mx-auto mb-2" />
            <p className="text-sm text-[#6E6E6E] dark:text-[#9CA3AF] font-medium">No tienes retiros registrados</p>
            <p className="text-xs text-[#6E6E6E]/60 dark:text-[#9CA3AF]/60 mt-0.5">Tus solicitudes aparecerán aquí</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">Fecha</th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">Monto</th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">Banco</th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">Estado</th>
                  <th className="text-left py-3 px-3 text-[11px] font-medium text-[#6E6E6E] dark:text-[#9CA3AF] tracking-wide">Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {withdrawHistory.map((retiro, index) => {
                  const getStatusColor = (estado) => {
                    switch (estado) {
                      case 'completado':
                        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700';
                      case 'rechazado':
                        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700';
                      case 'pendiente':
                        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
                      case 'procesando':
                        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700';
                      default:
                        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700';
                    }
                  };

                  const getStatusIcon = (estado) => {
                    switch (estado) {
                      case 'completado': return '✓';
                      case 'rechazado': return '✕';
                      case 'pendiente': return '●';
                      case 'procesando': return '◌';
                      default: return '●';
                    }
                  };

                  return (
                    <motion.tr
                      key={retiro.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(retiro.fecha_solicitud).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          {new Date(retiro.fecha_solicitud).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          ${Number(retiro.monto_clp).toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{retiro.banco_destino || 'N/A'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{retiro.tipo_cuenta || '-'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(retiro.estado)}`}>
                          {getStatusIcon(retiro.estado)}
                          <span className="uppercase">{retiro.estado}</span>
                        </span>
                        {retiro.motivo_rechazo && (
                          <p className="text-xs text-red-500 mt-1">{retiro.motivo_rechazo}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          ***{retiro.numero_cuenta?.slice(-4) || '****'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasMoreWithdraws && (
          <div className="flex justify-center px-5 py-4 border-t border-[#C9A227]/10">
            <button
              onClick={async () => {
                const newLimit = withdrawHistoryLimit + 3;
                setWithdrawHistoryLimit(newLimit);
                await loadWithdrawHistory(newLimit);
              }}
              className="px-4 py-2 bg-[#C9A227]/10 hover:bg-[#C9A227]/20 text-[#C9A227] text-xs font-medium rounded-lg transition-colors duration-200 flex items-center gap-1.5"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Ver más retiros
            </button>
          </div>
        )}

        <div className="px-5 py-3 text-center border-t border-[#C9A227]/10">
          <p className="text-xs text-[#6E6E6E] dark:text-[#9CA3AF]">
            Mostrando <span className="font-medium text-[#1A1D2B] dark:text-white">{withdrawHistory.length}</span>
            {withdrawHistory.length === 1 ? ' retiro' : ' retiros'}
            {!hasMoreWithdraws && withdrawHistory.length > 0 && <span className="ml-1 text-[#6E6E6E]/60">(todos)</span>}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL: CAMBIO CLP → USD */}
      {/* ============================================ */}
      <AnimatePresence>
        {showExchangeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessingExchange && setShowExchangeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl border-2 border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <ArrowRightLeft className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Cambiar Divisas</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CLP → USD
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
                {/* Saldos actuales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Saldo CLP</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                      ${saldoDisponible.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Saldo USD</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                      ${saldoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Input monto CLP */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Monto a cambiar (CLP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      value={exchangeAmount}
                      onChange={(e) => {
                        setExchangeAmount(e.target.value);
                        setExchangeQuote(null);
                      }}
                      placeholder="Ej: 100000"
                      disabled={isProcessingExchange}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-gray-900 dark:text-white font-semibold text-lg"
                    />
                  </div>
                  {saldoDisponible > 0 && (
                    <button
                      onClick={() => {
                        setExchangeAmount(String(saldoDisponible));
                        setExchangeQuote(null);
                      }}
                      className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Usar todo mi saldo (${saldoDisponible.toLocaleString('es-CL')})
                    </button>
                  )}
                </div>

                {/* Botón cotizar */}
                {!exchangeQuote && (
                  <button
                    onClick={handleGetQuote}
                    disabled={isLoadingQuote || !exchangeAmount || Number(exchangeAmount) <= 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  </button>
                )}

                {/* Resultado cotización */}
                {exchangeQuote && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Resumen del cambio</span>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-bold">
                          1 USD = ${Number(exchangeQuote.tasa).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} CLP
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Envías</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            ${Number(exchangeQuote.monto_clp).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Recibes</span>
                          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${Number(exchangeQuote.monto_usd).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setExchangeQuote(null)}
                        disabled={isProcessingExchange}
                        className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Volver
                      </button>
                      <button
                        onClick={handleExecuteExchange}
                        disabled={isProcessingExchange}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Nota informativa */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>💱 Tipo de cambio:</strong> El tipo de cambio se calcula en tiempo real. Una vez confirmado, la conversión es instantánea y se refleja en tus saldos.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* MODAL: RETIRO DE FONDOS */}
      {/* ============================================ */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessingWithdraw && setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-red-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <DollarSign className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Retirar Fondos</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Disponible: <span className="font-bold text-green-600">${saldoDisponible.toLocaleString('es-CL')} CLP</span>
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all text-gray-900 dark:text-white font-semibold text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Monto mínimo: $1.000 CLP</p>
                </div>

                {savedBankAccounts.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">💳 Cuentas Guardadas</h4>
                    <div className="space-y-2">
                      {savedBankAccounts.map((cuenta) => (
                        <div
                          key={cuenta.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedBankAccountId === cuenta.id
                            ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                            }`}
                          onClick={() => {
                            setSelectedBankAccountId(cuenta.id);
                            loadBankDataFromSaved(cuenta);
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{cuenta.banco}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {cuenta.tipo_cuenta.toUpperCase()} • ***{cuenta.numero_cuenta.slice(-4)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('¿Eliminar esta cuenta?')) {
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
                          email: bankData.email
                        });
                      }}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Usar nueva cuenta
                    </button>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 space-y-4 border-2 border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Datos Bancarios</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Banco</label>
                      <select
                        value={bankData.banco}
                        onChange={(e) => setBankData({ ...bankData, banco: e.target.value })}
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Banco de Chile">Banco de Chile</option>
                        <option value="Banco Santander">Banco Santander</option>
                        <option value="Banco Estado">Banco Estado</option>
                        <option value="BCI">BCI</option>
                        <option value="Scotiabank">Scotiabank</option>
                        <option value="Banco Itaú">Banco Itaú</option>
                        <option value="Banco Security">Banco Security</option>
                        <option value="Banco Falabella">Banco Falabella</option>
                        <option value="Banco Ripley">Banco Ripley</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tipo de Cuenta</label>
                      <select
                        value={bankData.tipoCuenta}
                        onChange={(e) => setBankData({ ...bankData, tipoCuenta: e.target.value })}
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                      >
                        <option value="corriente">Cuenta Corriente</option>
                        <option value="vista">Cuenta Vista</option>
                        <option value="ahorro">Cuenta de Ahorro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Número de Cuenta</label>
                    <input
                      type="text"
                      value={bankData.numeroCuenta}
                      onChange={(e) => setBankData({ ...bankData, numeroCuenta: e.target.value })}
                      placeholder="1234567890"
                      disabled={isProcessingWithdraw}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">RUT Titular</label>
                      <input
                        type="text"
                        value={bankData.rutTitular}
                        onChange={(e) => setBankData({ ...bankData, rutTitular: e.target.value })}
                        placeholder="12.345.678-9"
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre Titular</label>
                      <input
                        type="text"
                        value={bankData.nombreTitular}
                        onChange={(e) => setBankData({ ...bankData, nombreTitular: e.target.value })}
                        placeholder="Juan Pérez"
                        disabled={isProcessingWithdraw}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email de Confirmación</label>
                    <input
                      type="email"
                      value={bankData.email}
                      onChange={(e) => setBankData({ ...bankData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      disabled={isProcessingWithdraw}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                    />
                  </div>

                  {!selectedBankAccountId && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveForFuture"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label htmlFor="saveForFuture" className="text-sm text-gray-700 dark:text-gray-300">
                        Guardar estos datos para futuros retiros
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>📝 Importante:</strong> El retiro será procesado en un plazo de 24-48 horas hábiles.
                    Recibirás un email de confirmación cuando se complete la transferencia.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={isProcessingWithdraw}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={isProcessingWithdraw}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  </button>
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