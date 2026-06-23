import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  Settings,
  TrendingUp,
  DollarSign,
  Activity,
  Save,
  History,
  AlertCircle,
  Wallet,
  RefreshCw,
  ArrowLeft,
  Upload,
  Download,
  ShieldCheck,
  TrendingDown,
  Info,
  ChevronRight,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const ADMIN_EMAIL = 'frerautgroups.a@gmail.com';

const Pool = ({ onBack }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data States
  const [poolMetrics, setPoolMetrics] = useState({
    capital_disponible: 0,
    ues_en_pool: 0,
    total_comisiones: 0,
    total_operaciones: 0,
    operaciones_compra: 0,
    operaciones_venta: 0,
    rendimiento_porcentaje: 0,
    nav_actual: 0,
    precio_compra_pool: 0,
    precio_venta_pool: 0,
    patrimonio_total: 0
  });
  const [poolConfig, setPoolConfig] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [capitalMoves, setCapitalMoves] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [spreadStats, setSpreadStats] = useState(null);
  const [alertas, setAlertas] = useState([]);

  // Form States
  const [configForm, setConfigForm] = useState({
    comision_compra: 0,
    comision_venta: 0,
    precio_compra_ajuste: 0,
    precio_venta_ajuste: 0,
    auto_emit_ues: true
  });

  // Capital Management
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [capitalType, setCapitalType] = useState('deposito');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalReason, setCapitalReason] = useState('');

  const fetchPoolData = async () => {
    try {
      setLoading(true);

      // 1. Metricas en tiempo real
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_pool_metrics_realtime');

      if (metricsError) throw metricsError;
      if (metricsData && metricsData.length > 0) {
        setPoolMetrics(metricsData[0]);
      }

      // 2. Configuracion activa
      const { data: configData, error: configError } = await supabase
        .from('freraut_pool_config')
        .select('*')
        .eq('activo', true)
        .maybeSingle();

      if (configError) throw configError;
      if (configData) {
        setPoolConfig(configData);
        setConfigForm({
          comision_compra: configData.comision_compra || 0,
          comision_venta: configData.comision_venta || 0,
          precio_compra_ajuste: configData.precio_compra_ajuste || 0,
          precio_venta_ajuste: configData.precio_venta_ajuste || 0,
          auto_emit_ues: configData.auto_emit_ues !== false
        });
      }

      // 3. Transacciones recientes
      const { data: txData, error: txError } = await supabase
        .rpc('get_pool_transacciones_recientes', { p_limit: 100 });

      if (txError) throw txError;
      setTransactions(txData || []);

      // 4. Datos para el grafico
      const { data: chartDataRaw, error: chartError } = await supabase
        .rpc('get_pool_chart_data', { p_dias: 30 });

      if (chartError) throw chartError;

      const formatted = (chartDataRaw || []).map(d => ({
        name: new Date(d.dia).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
        comisiones: parseFloat(d.comisiones || 0),
        volumen: parseFloat(d.volumen || 0),
        ops: parseInt(d.transacciones || 0)
      }));
      setChartData(formatted);

      // 5. Estadisticas de spread
      const { data: statsData, error: statsError } = await supabase
        .from('vista_pool_spread_stats')
        .select('*')
        .maybeSingle();
      
      if (!statsError) setSpreadStats(statsData);

      // 6. Alertas activas
      const { data: alertData } = await supabase
        .from('freraut_pool_alertas')
        .select('*')
        .eq('resuelta', false)
        .order('fecha_creacion', { ascending: false });
      
      setAlertas(alertData || []);

      // 7. Movimientos de capital recientes
      const { data: movesData } = await supabase
        .from('freraut_pool_movimientos_capital')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(20);
      
      setCapitalMoves(movesData || []);

    } catch (error) {
      console.error('Error fetching pool data:', error);
      toast({
        title: "Error cargando datos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      fetchPoolData();
    } else if (session) {
      setLoading(false);
    }
  }, [session]);

  const handleUpdateConfig = async (field, value) => {
    try {
      const p_valor = typeof value === 'boolean' ? value : parseFloat(value);
      const { error } = await supabase
        .rpc('actualizar_config_pool', {
          p_campo: field,
          p_valor_nuevo: p_valor,
          p_modificado_por: session.user.id,
          p_motivo: `Ajuste manual de ${field}`
        });

      if (error) throw error;

      toast({
        title: "✅ Configuracion actualizada",
        description: `El campo ${field} ha sido actualizado correctamente.`,
      });

      fetchPoolData();

    } catch (error) {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleAutoEmit = async (checked) => {
    setConfigForm(prev => ({ ...prev, auto_emit_ues: checked }));
    await handleUpdateConfig('auto_emit_ues', checked);
  };

  const handleCapitalMovement = async () => {
    if (!capitalAmount || parseFloat(capitalAmount) <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto valido mayor a 0",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('pool_movimiento_capital', {
          p_tipo: capitalType,
          p_monto_clp: parseFloat(capitalAmount),
          p_ejecutado_por: session.user.id,
          p_motivo: capitalReason || `${capitalType === 'deposito' ? 'Inyeccion' : 'Retiro'} de liquidez`
        });

      if (error) throw error;

      toast({
        title: "✅ Operacion exitosa",
        description: data.mensaje || "Movimiento registrado correctamente",
      });

      setShowCapitalModal(false);
      setCapitalAmount('');
      setCapitalReason('');
      fetchPoolData();

    } catch (error) {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatCurrencyCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercent = (amount) => {
    return `${parseFloat(amount || 0).toFixed(2)}%`;
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
  };

  if (!session) return null;

  if (session?.user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Acceso Institucional Restringido</h2>
        <p className="text-gray-400 max-w-md text-lg mb-8">
          Esta terminal de gestion de liquidez solo esta disponible para cuentas administrativas autorizadas.
        </p>
        {onBack && (
          <Button onClick={onBack} size="lg" className="px-8">
            <ArrowLeft className="mr-2 h-5 w-5" /> Volver al Inicio
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-b-4 border-yellow-500"></div>
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-yellow-500" />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-1">Iniciando Terminal Pool</p>
          <p className="text-gray-500 text-sm animate-pulse">Sincronizando metricas de liquidez...</p>
        </div>
      </div>
    );
  }

  const opsRatio = poolMetrics.total_operaciones > 0 
    ? (poolMetrics.operaciones_compra / poolMetrics.total_operaciones) * 100 
    : 50;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Super Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Activity className="h-9 w-9 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                Terminal Pool <span className="text-yellow-500">Freraut</span>
              </h1>
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-3 py-1 font-bold">
                ADMIN V2.0
              </Badge>
            </div>
            <p className="text-gray-400 font-medium mt-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Gestion centralizada de liquidez institucional y spread transaccional
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="hidden sm:flex flex-col text-right mr-4">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">NAV Actual</span>
            <span className="text-xl font-mono font-bold text-white">{formatCurrency(poolMetrics.nav_actual)}</span>
          </div>
          <Button variant="outline" size="lg" onClick={fetchPoolData} className="border-white/10 hover:bg-white/5 h-12">
            <RefreshCw className="h-5 w-5" />
          </Button>
          {onBack && (
            <Button variant="outline" size="lg" onClick={onBack} className="border-white/10 hover:bg-white/5 h-12">
              <ArrowLeft className="mr-2 h-5 w-5" /> Salir
            </Button>
          )}
        </div>
      </div>

      {/* Main Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-yellow-500/30 transition-all duration-300">
          <div className="h-1 w-full bg-yellow-500/20 group-hover:bg-yellow-500 transition-colors"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              {chartData.length > 1 && (
                <Badge className={chartData[chartData.length-1].comisiones >= chartData[chartData.length-2].comisiones ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}>
                  {chartData[chartData.length-1].comisiones >= chartData[chartData.length-2].comisiones ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  Hoy
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Comisiones Totales</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(poolMetrics.total_comisiones)}</h3>
              <p className="text-xs text-yellow-500/70 font-semibold">Utilidad bruta acumulada del pool</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="h-1 w-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Wallet className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-500">
                LIQUIDEZ
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Capital Disponible</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(poolMetrics.capital_disponible)}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0">
                  {formatNumber(poolMetrics.ues_en_pool)} UEs
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="h-1 w-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <Badge variant="outline" className="border-blue-500/20 text-blue-500">
                ROI
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Rendimiento Historico</p>
              <h3 className="text-3xl font-black text-blue-400 tracking-tight">{formatPercent(poolMetrics.rendimiento_porcentaje)}</h3>
              <p className="text-xs text-gray-500 font-semibold">Basado en balance inicial vs actual</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="h-1 w-full bg-purple-500/20 group-hover:bg-purple-500 transition-colors"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <History className="h-6 w-6 text-purple-500" />
              </div>
              <Badge variant="outline" className="border-purple-500/20 text-purple-500">
                ACTIVITY
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Operaciones</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{poolMetrics.total_operaciones}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-500 font-bold">{poolMetrics.operaciones_compra} COMPRAS</span>
                <span className="text-[10px] text-gray-500 font-bold">{poolMetrics.operaciones_venta} VENTAS</span>
              </div>
              <Progress value={opsRatio} className="h-1.5 mt-1 bg-zinc-800" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-white/10 p-1 mb-8">
          <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black px-6 font-bold py-2.5 rounded-lg transition-all">
            <Activity className="h-4 w-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black px-6 font-bold py-2.5 rounded-lg transition-all">
            <Settings className="h-4 w-4 mr-2" /> Configuracion Spread
          </TabsTrigger>
          <TabsTrigger value="capital" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black px-6 font-bold py-2.5 rounded-lg transition-all">
            <Wallet className="h-4 w-4 mr-2" /> Gestion Capital
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black px-6 font-bold py-2.5 rounded-lg transition-all">
            <History className="h-4 w-4 mr-2" /> Historial de Operaciones
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Performance Chart */}
              <Card className="lg:col-span-2 bg-zinc-900/40 border-white/5 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">Analisis de Comisiones</CardTitle>
                    <CardDescription>Flujo de ingresos por spread en los ultimos 30 dias</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      Promedio: {formatCurrency(chartData.reduce((acc, curr) => acc + curr.comisiones, 0) / (chartData.length || 1))}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="h-[400px] mt-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#4b5563" 
                          tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#4b5563" 
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v/1000}k`}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#09090b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                          }}
                          itemStyle={{ fontWeight: 'bold' }}
                          formatter={(value) => [formatCurrency(value), "Comision"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="comisiones"
                          stroke="#eab308"
                          strokeWidth={3}
                          fill="url(#colorIncome)"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center flex-col text-gray-600">
                      <BarChart2 className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Sincronizando datos de rendimiento...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Side Panels */}
              <div className="space-y-6">
                {/* Real-time Status */}
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-yellow-500" /> Estado de Ejecucion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Patrimonio del Pool</span>
                        <Badge className="bg-purple-500/10 text-purple-400 text-[10px]">TOTAL ASSETS</Badge>
                      </div>
                      <p className="text-2xl font-black text-white">{formatCurrency(poolMetrics.patrimonio_total)}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Spread Actual Total</span>
                        <span className="text-white font-mono font-bold">
                          {formatPercent(Math.abs(poolConfig?.precio_venta_ajuste - poolConfig?.precio_compra_ajuste))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Spread de Venta (Pool)</span>
                        <span className="text-emerald-400 font-mono font-bold">+{formatPercent(poolConfig?.precio_venta_ajuste)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Spread de Compra (Pool)</span>
                        <span className="text-red-400 font-mono font-bold">{formatPercent(poolConfig?.precio_compra_ajuste)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-6 rounded-xl shadow-lg shadow-yellow-500/10" onClick={() => setActiveTab('config')}>
                        <Settings className="h-5 w-5 mr-2" /> AJUSTAR SPREAD
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Health/Alerts */}
                {alertas.length > 0 && (
                  <Card className="bg-red-500/5 border-red-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black text-red-500 uppercase flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Alertas del Sistema ({alertas.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {alertas.map((alerta) => (
                        <div key={alerta.id} className="p-3 bg-red-500/10 rounded-xl border border-red-500/10">
                          <p className="text-xs font-bold text-white mb-1">{alerta.mensaje}</p>
                          <span className="text-[10px] text-red-400/70 font-mono">
                            {new Date(alerta.fecha_creacion).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Quick Actions & More Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-white">Actividad de Usuarios</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Compras', value: poolMetrics.operaciones_compra, color: '#10b981' },
                          { name: 'Ventas', value: poolMetrics.operaciones_venta, color: '#ef4444' }
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white">{poolMetrics.total_operaciones}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Eventos</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/40 border-white/5 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white">Movimientos de Liquidez Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {capitalMoves.slice(0, 4).map((move) => (
                      <div key={move.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${move.tipo === 'deposito' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {move.tipo === 'deposito' ? <Upload className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{move.motivo}</p>
                            <p className="text-xs text-gray-500 font-medium">{new Date(move.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${move.tipo === 'deposito' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {move.tipo === 'deposito' ? '+' : '-'}{formatCurrencyCLP(move.monto_clp)}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono uppercase">Balance: {formatCurrencyCLP(move.capital_despues)}</p>
                        </div>
                      </div>
                    ))}
                    {capitalMoves.length === 0 && (
                      <div className="text-center py-12 text-gray-600 font-medium">
                        Sin movimientos de capital registrados
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-8 mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-white/5 p-6 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Comisiones Transaccionales</CardTitle>
                      <CardDescription>Reglas de cobro directo al inversor por usar el pool</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Comision Compra (%)</Label>
                      <Badge className="bg-yellow-500/10 text-yellow-500 border-none font-bold px-3">ACTUAL: {formatPercent(poolConfig?.comision_compra)}</Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={configForm.comision_compra}
                          onChange={(e) => setConfigForm({ ...configForm, comision_compra: e.target.value })}
                          className="bg-black/40 border-white/10 text-white h-14 pl-10 font-mono text-lg focus:ring-yellow-500/50"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                      <Button
                        onClick={() => handleUpdateConfig('comision_compra', configForm.comision_compra)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-14 px-8 rounded-xl transition-all active:scale-95"
                      >
                        <Save className="h-5 w-5 mr-2" /> ACTUALIZAR
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Se aplica cuando el usuario compra UEs del pool. Este porcentaje incrementa la utilidad neta del pool inmediatamente.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Comision Venta (%)</Label>
                      <Badge className="bg-yellow-500/10 text-yellow-500 border-none font-bold px-3">ACTUAL: {formatPercent(poolConfig?.comision_venta)}</Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={configForm.comision_venta}
                          onChange={(e) => setConfigForm({ ...configForm, comision_venta: e.target.value })}
                          className="bg-black/40 border-white/10 text-white h-14 pl-10 font-mono text-lg focus:ring-yellow-500/50"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                      <Button
                        onClick={() => handleUpdateConfig('comision_venta', configForm.comision_venta)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-14 px-8 rounded-xl transition-all active:scale-95"
                      >
                        <Save className="h-5 w-5 mr-2" /> ACTUALIZAR
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Se aplica cuando el usuario vende sus UEs al pool. El monto se descuenta del CLP que recibe el usuario.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-white/5 p-6 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Spread Dinamico sobre NAV</CardTitle>
                      <CardDescription>Ajuste de precio para compras y ventas directas del pool</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Spread Compra Pool (%)</Label>
                      <Badge className="bg-blue-500/10 text-blue-400 border-none font-bold px-3">ACTUAL: {formatPercent(poolConfig?.precio_compra_ajuste)}</Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={configForm.precio_compra_ajuste}
                          onChange={(e) => setConfigForm({ ...configForm, precio_compra_ajuste: e.target.value })}
                          className="bg-black/40 border-white/10 text-white h-14 pl-10 font-mono text-lg focus:ring-blue-500/50"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                      <Button
                        onClick={() => handleUpdateConfig('precio_compra_ajuste', configForm.precio_compra_ajuste)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-8 rounded-xl transition-all active:scale-95"
                      >
                        <Save className="h-5 w-5 mr-2" /> ACTUALIZAR
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Diferencial aplicado cuando el pool COMPRA al usuario. Un valor negativo (ej: -2.00%) significa que el pool paga 2% menos que el NAV actual.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Spread Venta Pool (%)</Label>
                      <Badge className="bg-blue-500/10 text-blue-400 border-none font-bold px-3">ACTUAL: {formatPercent(poolConfig?.precio_venta_ajuste)}</Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={configForm.precio_venta_ajuste}
                          onChange={(e) => setConfigForm({ ...configForm, precio_venta_ajuste: e.target.value })}
                          className="bg-black/40 border-white/10 text-white h-14 pl-10 font-mono text-lg focus:ring-blue-500/50"
                          step="0.01"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                      <Button
                        onClick={() => handleUpdateConfig('precio_venta_ajuste', configForm.precio_venta_ajuste)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-8 rounded-xl transition-all active:scale-95"
                      >
                        <Save className="h-5 w-5 mr-2" /> ACTUALIZAR
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Diferencial aplicado cuando el pool VENDE al usuario. Un valor positivo (ej: 2.00%) significa que el pool cobra un premium del 2% sobre el NAV.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-emit UEs Toggle */}
              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-white/5 p-6 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Emision de UEs</CardTitle>
                      <CardDescription>Controla si las compras crean nuevas UEs o requieren matching con el libro de ordenes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Auto-emitir UEs</Label>
                        <p className="text-xs text-gray-500 font-medium">
                          {configForm.auto_emit_ues
                            ? 'Mercado Primario: las compras crean nuevas UEs automaticamente'
                            : 'Mercado Secundario: las compras requieren ordenes de venta disponibles'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={configForm.auto_emit_ues
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold px-3"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold px-3"
                        }>
                          {configForm.auto_emit_ues ? 'PRIMARIO' : 'SECUNDARIO'}
                        </Badge>
                        <Switch
                          checked={configForm.auto_emit_ues}
                          onCheckedChange={handleToggleAutoEmit}
                        />
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${configForm.auto_emit_ues
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'}`}>
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                          <strong className={configForm.auto_emit_ues ? 'text-emerald-400' : 'text-amber-400'}>
                            {configForm.auto_emit_ues ? 'MODO ACTUAL: MERCADO PRIMARIO' : 'MODO ACTUAL: MERCADO SECUNDARIO'}
                          </strong>
                          <br />
                          {configForm.auto_emit_ues
                            ? 'Al comprar UEs, se crean nuevas unidades directamente. El pool expande el capital. Al vender, el pool las destruye y paga al usuario.'
                            : 'Al comprar UEs, se busca matching con ordenes de venta existentes. No se crean nuevas UEs. Freraut Invest retiene el pago y paga al vendedor. Si no hay vendedores, la orden queda pendiente.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="capital" className="space-y-8 mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Liquidity Management Control */}
              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                    <Wallet className="h-7 w-7 text-emerald-500" /> Operaciones de Capital
                  </CardTitle>
                  <CardDescription className="text-base">Inyectar o retirar liquidez institucional del pool activo</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Disponible Cash</p>
                      <p className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(poolMetrics.capital_disponible)}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inventario UE</p>
                      <p className="text-2xl font-black text-white font-mono">{formatNumber(poolMetrics.ues_en_pool)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Dialog open={showCapitalModal && capitalType === 'deposito'} onOpenChange={(open) => {
                      if (!open) setShowCapitalModal(false);
                      else {
                        setCapitalType('deposito');
                        setShowCapitalModal(true);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 h-20 text-lg font-black bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/10 group">
                          <Upload className="h-6 w-6 mr-3 group-hover:-translate-y-1 transition-transform" />
                          INYECTAR CAPITAL
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg rounded-3xl">
                        <DialogHeader className="p-2">
                          <DialogTitle className="text-2xl font-black">Inyeccion de Liquidez</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Agregara fondos de la cuenta institucional al capital operativo del pool.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-6 p-2">
                          <div className="space-y-3">
                            <Label className="text-gray-400 font-bold uppercase tracking-widest text-xs">Monto a inyectar (USD)</Label>
                            <Input
                              type="number"
                              value={capitalAmount}
                              onChange={(e) => setCapitalAmount(e.target.value)}
                              className="bg-white/5 border-white/10 text-white h-16 font-mono text-2xl px-6 focus:ring-emerald-500/50 rounded-2xl"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-gray-400 font-bold uppercase tracking-widest text-xs">Glosa / Justificacion</Label>
                            <Textarea
                              value={capitalReason}
                              onChange={(e) => setCapitalReason(e.target.value)}
                              className="bg-white/5 border-white/10 text-white min-h-[100px] rounded-2xl focus:ring-emerald-500/50"
                              placeholder="Ej: Aumento de liquidez por alta demanda"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex gap-3 sm:gap-0 mt-4">
                          <Button variant="ghost" onClick={() => setShowCapitalModal(false)} className="h-14 font-bold text-gray-400">CANCELAR</Button>
                          <Button onClick={handleCapitalMovement} className="h-14 bg-emerald-600 hover:bg-emerald-700 font-black px-8 rounded-2xl">
                            CONFIRMAR INYECCION
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showCapitalModal && capitalType === 'retiro'} onOpenChange={(open) => {
                      if (!open) setShowCapitalModal(false);
                      else {
                        setCapitalType('retiro');
                        setShowCapitalModal(true);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 h-20 text-lg font-black border-red-500/20 hover:bg-red-500/10 text-red-500 rounded-2xl group">
                          <Download className="h-6 w-6 mr-3 group-hover:translate-y-1 transition-transform" />
                          RETIRAR CAPITAL
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg rounded-3xl">
                        <DialogHeader className="p-2">
                          <DialogTitle className="text-2xl font-black text-red-500">Retiro de Liquidez</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Retirara fondos del pool hacia la cuenta institucional principal.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-6 p-2">
                          <div className="space-y-3">
                            <Label className="text-gray-400 font-bold uppercase tracking-widest text-xs">Monto a retirar (USD)</Label>
                            <Input
                              type="number"
                              value={capitalAmount}
                              onChange={(e) => setCapitalAmount(e.target.value)}
                              className="bg-white/5 border-white/10 text-white h-16 font-mono text-2xl px-6 focus:ring-red-500/50 rounded-2xl"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-gray-400 font-bold uppercase tracking-widest text-xs">Glosa / Justificacion</Label>
                            <Textarea
                              value={capitalReason}
                              onChange={(e) => setCapitalReason(e.target.value)}
                              className="bg-white/5 border-white/10 text-white min-h-[100px] rounded-2xl focus:ring-red-500/50"
                              placeholder="Ej: Retiro de utilidades del trimestre"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex gap-3 sm:gap-0 mt-4">
                          <Button variant="ghost" onClick={() => setShowCapitalModal(false)} className="h-14 font-bold text-gray-400">CANCELAR</Button>
                          <Button onClick={handleCapitalMovement} className="h-14 bg-red-600 hover:bg-red-700 text-white font-black px-8 rounded-2xl">
                            CONFIRMAR RETIRO
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* History of movements */}
              <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
                <CardHeader className="bg-white/5 p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-400" /> Log de Movimientos de Capital
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {capitalMoves.map((move, idx) => (
                      <div key={move.id} className={`flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${idx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${move.tipo === 'deposito' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {move.tipo === 'deposito' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white mb-0.5">{move.motivo}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(move.fecha).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${move.tipo === 'deposito' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {move.tipo === 'deposito' ? '+' : '-'}{formatCurrency(move.monto_clp)}
                          </p>
                          <p className="text-[9px] font-bold text-gray-600 tracking-tighter uppercase">ID: {move.id.split('-')[0]}</p>
                        </div>
                      </div>
                    ))}
                    {capitalMoves.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-20">
                        <Activity className="h-16 w-16 mb-4" />
                        <p className="font-black text-xl uppercase tracking-widest">Sin Registros</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-8 mt-0 focus-visible:outline-none">
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden backdrop-blur-sm">
              <CardHeader className="bg-white/5 border-b border-white/5 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">Transacciones del Pool</CardTitle>
                    <CardDescription>Mostrando las ultimas 100 transacciones ejecutadas por el pool de liquidez</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-10 px-4 border-white/10 text-gray-400 font-bold bg-white/5">
                      TOTAL OPS: {transactions.length}
                    </Badge>
                    <Button variant="outline" className="h-10 border-white/10 hover:bg-white/5 text-gray-400">
                      <Download className="h-4 w-4 mr-2" /> Exportar CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha & Hora</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Inversor / ID</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Op</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Cantidad (UE)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio Ejecutado</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Comision Pool</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">
                                {new Date(tx.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="text-[10px] font-medium text-gray-500">
                                {new Date(tx.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-300 group-hover:text-yellow-500 transition-colors">
                                {tx.usuario_nombre || tx.usuario_email?.split('@')[0] || 'Inversor Anonimo'}
                              </span>
                              <span className="text-[9px] font-mono text-gray-600 truncate w-24">
                                {tx.usuario_id.split('-')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${tx.tipo === 'venta_usuario' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${tx.tipo === 'venta_usuario' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {tx.tipo === 'venta_usuario' ? 'Pool Compra' : 'Pool Vende'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-white font-mono">{formatNumber(tx.cantidad_ue)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-bold text-gray-400 font-mono">{formatCurrency(tx.precio_ejecutado)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-emerald-400 font-mono">+{formatCurrency(tx.comision_cobrada)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-white font-mono">{formatCurrency(tx.monto_total_clp)}</span>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-20">
                              <History className="h-16 w-16 mb-4" />
                              <p className="text-2xl font-black uppercase tracking-[0.2em]">Cero Operaciones</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Footer Info */}
      <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4" /> Encriptacion Institucional Activa
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Motor de Liquidez: ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Ultima Sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pool;