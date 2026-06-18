import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, PieChart, BarChart3, Brain, FileText, ArrowRight, Wallet,
  Building2, ShieldCheck, Globe2, Crown, Activity, Sparkles, Clock,
  ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* ============================================================
   DiseñoFreraut — Dashboard Inicio Freraut Invest
   Paleta: gold #C9A227, bg #0B0C10, cardBg #1A1D2B
   Reglas: colores sólidos, sin gradient text, sin glassmorphism,
   WCAG AA, max border-radius 16px, text-wrap balance
   ============================================================ */

const COLORS = {
  gold: '#C9A227',
  goldLight: '#E4C65A',
  bg: '#0B0C10',
  panel: '#F5F1E8',
  textBody: '#1A1D2B',
  textInverse: '#FFFFFF',
  muted: '#9C9C9C',
  cardBg: '#1A1D2B',
  success: '#3E8E41',
  border: 'rgba(201,162,39,0.15)',
  borderLight: 'rgba(201,162,39,0.08)',
};

const Index = ({ onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [marketMetrics, setMarketMetrics] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [navHistory, setNavHistory] = useState([]);
  const [patrimonioCLP, setPatrimonioCLP] = useState(0);
  const [patrimonioUSD, setPatrimonioUSD] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userPatrimonio } = await supabase
          .from('vista_patrimonio_usuario')
          .select('*')
          .eq('usuario_id', user.id)
          .single();

        const { data: reports } = await supabase
          .from('published_reports')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(3);

        const [navResult, currentResult] = await Promise.all([
          supabase.rpc('obtener_nav_historico', { p_dias: 7 }),
          supabase.from('precio_actual_ue').select('precio_actual, capital_total, fecha').maybeSingle()
        ]);

        const { data: rawMetrics } = await supabase.from('metricas_mercado').select('*').single();
        const metrics = rawMetrics ? { ...rawMetrics, nav_actual: currentResult.data?.capital_total || rawMetrics.nav_actual } : null;

        let history = [];
        if (navResult.data) {
          let valid = navResult.data.filter(item => parseFloat(item.ues_circulacion || 0) > 1);
          valid.sort((a, b) => new Date(a.fecha + 'Z') - new Date(b.fecha + 'Z'));
          valid = valid.slice(-30);
          if (currentResult.data?.precio_actual) {
            const lastFecha = valid.length > 0 ? new Date(valid[valid.length - 1].fecha + 'Z').getTime() : 0;
            const currentFecha = new Date(currentResult.data.fecha).getTime();
            if (currentFecha > lastFecha) {
              valid.push({
                fecha: currentResult.data.fecha,
                nav: currentResult.data.precio_actual,
                capital_total: 0,
                ues_circulacion: 10000
              });
            }
          }
          history = valid;
        }

        if (userPatrimonio) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('saldo_usd')
            .eq('id', user.id)
            .maybeSingle();
          const { data: fx } = await supabase
            .from('fx_config')
            .select('manual_rate')
            .eq('is_active', true)
            .maybeSingle();
          const fxRate = fx?.manual_rate ? parseFloat(fx.manual_rate) : 950;

          const saldoUSD = Number(usuario?.saldo_usd || 0);
          const saldoCLP = Number(userPatrimonio.saldo_clp || 0);
          const ueValorUSD = Number(userPatrimonio.valor_total_ues || 0);

          const totalCLP = saldoCLP + (ueValorUSD * fxRate) + (saldoUSD * fxRate);
          const totalUSD = (saldoCLP / fxRate) + ueValorUSD + saldoUSD;

          setPatrimonioCLP(totalCLP);
          setPatrimonioUSD(totalUSD);
          setUserData(userPatrimonio);
        }
        if (metrics) setMarketMetrics(metrics);
        if (reports) setRecentReports(reports);
        if (history.length > 0) setNavHistory(history);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatUSDshort = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUE = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <motion.div
      className="space-y-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Encabezado institucional */}
      <div
        className="rounded-2xl p-6 md:p-8"
        style={{
          backgroundColor: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border"
                style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
              >
                <Crown className="w-3 h-3 mr-1.5" />
                Patrimonio Privado
              </Badge>
              <Badge
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border"
                style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
              >
                <Globe2 className="w-3 h-3 mr-1.5" />
                Chile · Francia
              </Badge>
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: COLORS.textInverse, textWrap: 'balance' }}
            >
              {getTimeOfDay()}
              <span style={{ color: COLORS.muted }}>, </span>
              <span style={{ color: COLORS.gold }}>
                {user?.user_metadata?.name || user?.email?.split('@')[0]}
              </span>
            </h1>

            <p className="text-sm" style={{ color: COLORS.muted }}>
              Resumen integral de su cartera de inversiones y desempeño del fondo institucional
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onNavigate('portfolio')}
              className="text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-lg"
              style={{ backgroundColor: COLORS.gold, color: COLORS.bg }}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Mi Cartera
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('market')}
              className="text-sm font-medium rounded-xl px-5 py-2.5 h-auto border-2"
              style={{ borderColor: COLORS.border, color: COLORS.gold }}
            >
              <Activity className="mr-2 h-4 w-4" />
              Mercados
            </Button>
            {user?.email === 'frerautgroups.a@gmail.com' && (
              <Button
                onClick={() => onNavigate('analyzer')}
                className="text-sm font-bold rounded-xl px-5 py-2.5 h-auto shadow-lg"
                style={{ backgroundColor: COLORS.gold, color: COLORS.bg }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Análisis
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Métricas principales — sólidas, sin gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Patrimonio Total */}
        <div
          className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
          style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.muted }}>
              Patrimonio Total
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
              <Wallet className="h-4 w-4" style={{ color: COLORS.gold }} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-36" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: COLORS.textInverse }}>
                {formatCurrency(patrimonioCLP)}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.1)', color: COLORS.gold }}>
                  {formatUE(userData?.ue_totales || 0)} UE
                </span>
                <span className="text-xs" style={{ color: COLORS.muted }}>en custodia</span>
              </div>
            </div>
          )}
        </div>

        {/* Valor NAV */}
        <div
          className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
          style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.muted }}>
              Valor Neto Actual
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
              <TrendingUp className="h-4 w-4" style={{ color: COLORS.gold }} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-36" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div className="space-y-3">
              <p className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: COLORS.textInverse }}>
                {formatUSDshort(marketMetrics?.nav_actual || 0)}
              </p>
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={navHistory.slice(-10)}>
                    <defs>
                      <linearGradient id="miniNav" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="nav"
                      stroke={COLORS.gold}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#miniNav)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Capital Administrado */}
        <div
          className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
          style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.muted }}>
              Capital Administrado
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
              <Building2 className="h-4 w-4" style={{ color: COLORS.gold }} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-36" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: COLORS.textInverse }}>
                {formatUSDshort(marketMetrics?.capital_total_invertido || 0)}
              </p>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.gold }} />
                <span className="text-xs" style={{ color: COLORS.muted }}>
                  {marketMetrics?.inversores_activos || 0} inversores activos
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">

          {/* Accesos directos */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1" style={{ backgroundColor: COLORS.border }} />
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.muted }}>
                Servicios Principales
              </h2>
              <div className="h-px flex-1" style={{ backgroundColor: COLORS.border }} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: PieChart, label: 'Mi Cartera', route: 'portfolio' },
                { icon: BarChart3, label: 'Mercados', route: 'market' },
                { icon: Brain, label: 'Lake IA', route: 'lake' },
                { icon: FileText, label: 'Reportes', route: 'reports' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate(item.route)}
                  className="rounded-xl p-5 text-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg mx-auto mb-3" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
                    <item.icon className="w-5 h-5" style={{ color: COLORS.gold }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: COLORS.textInverse }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Gráfico NAV */}
          <section>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
            >
              <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <div>
                  <h3 className="text-base font-bold" style={{ color: COLORS.textInverse }}>
                    Precio Histórico de las UEs
                  </h3>
                  <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                    Valor de la Unidad de Efectivo (NAV) — últimos 30 snapshots
                  </p>
                </div>
                <Badge
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border"
                  style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  En vivo
                </Badge>
              </div>
              <div className="p-6 pt-4">
                <div className="h-[280px] w-full">
                  {loading ? (
                    <Skeleton className="h-full w-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={navHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="fecha"
                          tickFormatter={(str) => new Date(str + 'Z').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          stroke={COLORS.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke={COLORS.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                          domain={['dataMin - 0.05', 'dataMax + 0.05']}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '12px',
                            padding: '12px 16px',
                          }}
                          formatter={(value) => [`$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`, 'Precio UE']}
                          labelFormatter={(label) => new Date(label + 'Z').toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          labelStyle={{ color: COLORS.muted, fontSize: '11px', marginBottom: '4px' }}
                          itemStyle={{ color: COLORS.textInverse, fontSize: '13px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nav"
                          stroke={COLORS.gold}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#navGradient)"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Reportes recientes */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
          >
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: COLORS.textInverse }}>
                <FileText className="w-4 h-4" style={{ color: COLORS.gold }} />
                Publicaciones Recientes
              </h3>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-medium transition-colors"
                style={{ color: COLORS.gold }}
              >
                Ver todo →
              </button>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                ))
              ) : recentReports.length > 0 ? (
                recentReports.map((report, idx) => (
                  <div
                    key={report.id}
                    className="group p-4 rounded-xl transition-all duration-200 cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-sm font-semibold line-clamp-1 transition-colors" style={{ color: COLORS.textInverse }}>
                        {report.title}
                      </h4>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLORS.muted }} />
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: COLORS.muted }}>
                      {report.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.muted }}>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(report.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-6" style={{ color: COLORS.muted }}>
                  Sin publicaciones recientes
                </p>
              )}
            </div>
          </div>

          {/* Lake AI */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
          >
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
                <Brain className="w-5 h-5" style={{ color: COLORS.gold }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: COLORS.textInverse }}>
                  Asistente de Inversión
                </h3>
                <p className="text-[11px]" style={{ color: COLORS.muted }}>
                  Análisis en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: COLORS.success }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: COLORS.success }} />
              </span>
              <span className="text-xs font-medium" style={{ color: COLORS.muted }}>
                Sistema operativo
              </span>
            </div>

            <p className="text-xs leading-relaxed mb-5" style={{ color: COLORS.muted }}>
              Nuestro sistema de inteligencia artificial monitorea continuamente los mercados financieros para optimizar las estrategias de inversión.
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => onNavigate('lake')}
                className="w-full text-xs font-semibold rounded-xl py-2.5 h-auto"
                style={{ backgroundColor: COLORS.gold, color: COLORS.bg }}
              >
                <Brain className="mr-2 h-3.5 w-3.5" />
                Consultar Lake
              </Button>
              {user?.email === 'frerautgroups.a@gmail.com' && (
                <Button
                  onClick={() => onNavigate('analyzer')}
                  variant="outline"
                  className="w-full text-xs font-bold rounded-xl py-2.5 h-auto border-2"
                  style={{ borderColor: COLORS.border, color: COLORS.gold }}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Análisis Frerautiano
                </Button>
              )}
            </div>
          </div>

          {/* Seguridad */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.borderLight}` }}
          >
            <div className="flex items-center justify-center gap-2 text-xs mb-2" style={{ color: COLORS.muted }}>
              <ShieldCheck className="w-4 h-4" style={{ color: COLORS.success }} />
              <span>Conexión segura certificada</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: COLORS.muted }}>
              Freraut Invest · Super Holding Chileno-Francés<br />
              Talca, Región del Maule
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Index;
