import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Brain, 
  FileText, 
  ArrowRight,
  Wallet,
  Building2,
  ShieldCheck,
  Clock,
  Activity,
  ExternalLink,
  Sparkles,
  Globe2,
  Crown, Star, BarChart2, Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Index = ({ onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [marketMetrics, setMarketMetrics] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [navHistory, setNavHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userPatrimonio } = await supabase
          .from('vista_patrimonio_usuario')
          .select('*')
          .eq('usuario_id', user.id)
          .single();

        const { data: rawMetrics } = metricsResult;
        // Sobrescribir nav_actual con el capital_total real de precio_actual_ue
        const metrics = rawMetrics ? { ...rawMetrics, nav_actual: currentResult.data?.capital_total || rawMetrics.nav_actual } : null;

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

        // metricas_mercado aparte para no enmascarar errores
        const { data: rawMetrics } = await supabase.from('metricas_mercado').select('*').single();
        // Sobrescribir nav_actual con el capital_total real
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

        if (userPatrimonio) setUserData(userPatrimonio);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

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

  const formatUE = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };

  return (
    <motion.div 
      className="space-y-10 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Encabezado Premium con estética francesa */}
      <motion.div variants={itemVariants} className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-amber-50/40 dark:from-slate-900/50 dark:via-indigo-950/30 dark:to-slate-900/50 rounded-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-3xl border border-gray-200/50 dark:border-slate-800/50 backdrop-blur-sm">
          <div className="space-y-3">
            {/* Insignias institucionales */}
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-medium px-3 py-1 tracking-wide">
                <Crown className="w-3 h-3 mr-1.5" />
                Patrimonio Privado
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400 font-medium px-3 py-1 tracking-wide">
                <Globe2 className="w-3 h-3 mr-1.5" />
                Chile • 
              </Badge>
            </div>

            {/* Saludo elegante */}
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 dark:from-white dark:via-blue-100 dark:to-gray-300">
                {getTimeOfDay()}
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-extralight">, </span>
              <span className="font-normal text-slate-900 dark:text-white">
                {user?.user_metadata?.name || user?.email?.split('@')[0]}
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-400 text-base font-light max-w-2xl leading-relaxed">
              Resumen integral de su cartera de inversiones y desempeño del fondo institucional
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => onNavigate('portfolio')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 px-6 font-light tracking-wide"
              size="lg"
            >
              <PieChart className="mr-2 h-4 w-4" /> 
              Mi Cartera
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('market')}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 px-6 font-light tracking-wide"
              size="lg"
            >
              <Activity className="mr-2 h-4 w-4" /> 
              Mercados
            </Button>
            {user?.email === 'frerautgroups.a@gmail.com' && (
              <Button
                onClick={() => onNavigate('analyzer')}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black shadow-lg shadow-amber-500/30 transition-all duration-300 px-6 font-bold tracking-wide"
                size="lg"
              >
                <Star className="mr-2 h-4 w-4" />
                Análisis Frerautiano
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Métricas principales - diseño refinado */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patrimonio Total */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
            <CardTitle className="text-sm font-light text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Patrimonio Total
            </CardTitle>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(userData?.patrimonio_total || 0)}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="px-2 py-0.5 bg-emerald-500/10 rounded-md">
                    <span className="text-emerald-700 dark:text-emerald-400 font-normal">
                      {formatUE(userData?.ue_totales || 0)} UE
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 font-light">en custodia</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valor NAV */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-blue-200/50 dark:border-blue-900/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
            <CardTitle className="text-sm font-light text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Valor Neto Actual
            </CardTitle>
            <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div className="space-y-3">
                <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(marketMetrics?.nav_actual || 0)}
                </div>
                <div className="h-12 w-full -mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={navHistory.slice(-10)}>
                      <defs>
                        <linearGradient id="miniNav" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="nav" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#miniNav)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capital del Fondo */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 border-purple-200/50 dark:border-purple-900/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
            <CardTitle className="text-sm font-light text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Capital Administrado
            </CardTitle>
            <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(marketMetrics?.capital_total_invertido || 0)}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-slate-500 dark:text-slate-400 font-light">
                    {marketMetrics?.inversores_activos || 0} inversores activos
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Accesos directos - estilo atelier */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light text-slate-900 dark:text-white flex items-center gap-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-blue-500" />
                Servicios Principales
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: PieChart, label: "Mi Cartera", color: "emerald", route: "portfolio" },
                { icon: BarChart3, label: "Mercados", color: "blue", route: "market" },
                { icon: Brain, label: "Lake IA", color: "purple", route: "lake" },
                { icon: FileText, label: "Reportes", color: "amber", route: "reports" }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card 
                    className={`cursor-pointer group relative overflow-hidden border-slate-200/50 dark:border-slate-800/50 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-slate-50/20 dark:from-slate-900 dark:to-slate-800/10`}
                    onClick={() => onNavigate(item.route)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                      <div className={`p-4 bg-${item.color}-500/10 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                        <item.icon className={`w-6 h-6 text-${item.color}-600 dark:text-${item.color}-400`} />
                      </div>
                      <span className="font-light text-sm text-slate-700 dark:text-slate-300 tracking-wide">
                        {item.label}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Gráfico de rendimiento - presentación sofisticada */}
          <section>
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-xl">
              <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-light text-slate-900 dark:text-white tracking-tight">
                      Precio Histórico de las UEs
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-slate-500 dark:text-slate-400 font-light">
                      Valor de la Unidad de Efectivo (NAV) — últimos 30 snapshots
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400 font-light">
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    En vivo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="h-[320px] w-full">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={navHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="#e2e8f0" 
                          className="dark:stroke-slate-800"
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="fecha" 
                          tickFormatter={(str) => new Date(str).toLocaleDateString('es-CL', {day: '2-digit', month: 'short'})}
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                          domain={['dataMin - 0.05', 'dataMax + 0.05']}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                            padding: '12px 16px'
                          }}
                          formatter={(value) => [`$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`, 'Precio UE']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px', fontWeight: '300' }}
                          itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: '400' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nav"
                          stroke="url(#navGradient)"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#navGradient)"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </motion.div>

        {/* Barra lateral refinada */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          {/* Reportes recientes */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-lg">
            <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-light text-slate-900 dark:text-white flex items-center gap-2 tracking-wide">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Publicaciones Recientes
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate('reports')} 
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-light"
                >
                  Ver todo →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : recentReports.length > 0 ? (
                recentReports.map((report, idx) => (
                  <motion.div 
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative flex flex-col gap-2 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-normal text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-wide">
                        {report.title}
                      </h4>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-light">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-light">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(report.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm font-light">
                  Sin publicaciones recientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sistema de inteligencia artificial */}
          <Card className="relative overflow-hidden border-indigo-200/50 dark:border-indigo-900/30 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 dark:from-slate-900 dark:via-indigo-950/20 dark:to-purple-950/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
            <CardHeader className="relative z-10 border-b border-indigo-200/30 dark:border-indigo-900/30 pb-4">
              <CardTitle className="text-base font-light flex items-center gap-2 tracking-wide">
                <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  Asistente de Inversión
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </div>
                <div>
                  <span className="text-sm font-normal text-slate-900 dark:text-white block tracking-wide">
                    Sistema Operativo
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-light">
                    Análisis en tiempo real
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed font-light">
                Nuestro sistema de inteligencia artificial monitorea continuamente los mercados financieros para optimizar las estrategias de inversión.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => onNavigate('lake')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 font-light tracking-wide"
                  size="sm"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Consultar Lake
                </Button>
                {user?.email === 'frerautgroups.a@gmail.com' && (
                  <Button
                    onClick={() => onNavigate('analyzer')}
                    variant="outline"
                    className="w-full border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all duration-300 font-medium tracking-wide"
                    size="sm"
                  >
                    <Star className="mr-2 h-3.5 w-3.5" />
                    Análisis Frerautiano
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificación y seguridad */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-light">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Conexión segura certificada</span>
            </div>
            <div className="text-[10px] text-slate-400 text-center leading-relaxed font-light tracking-wide">
              Freraut Invest · Super Holding Chileno-Francés<br/>
              Regulado y supervisado · Talca, Región del Maule
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Index;