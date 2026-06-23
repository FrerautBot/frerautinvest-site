import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Upload, Trash2, Loader, BarChart3,
  Eye, Calendar, MoreVertical,
  Search, X, Share2,
  PieChart, LineChart, ShieldCheck, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================
// COMPONENTE: MetricCard
// ============================================
const MetricCard = ({ icon: Icon, label, value, trend, color, delay, isDarkMode }) => {
  const colorMap = {
    yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    green: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`rounded-xl p-5 border-2 transition-all duration-300 ${
        isDarkMode 
          ? `bg-slate-900/40 border-slate-800 hover:border-${color}-500/50` 
          : `bg-white border-gray-100 hover:border-${color}-500/30 shadow-sm hover:shadow-md`
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${selectedColor.split(' ')[1]} border ${selectedColor.split(' ')[2]}`}>
          <Icon size={20} className={selectedColor.split(' ')[0]} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
          }`}>
            {trend}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold tracking-tight mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {label}
      </div>
    </motion.div>
  );
};

// ============================================
// COMPONENTE: AnalyticsSection
// ============================================
const AnalyticsSection = ({ reports, isDarkMode }) => {
  const stats = {
    totalReports: reports.length,
    thisMonth: reports.filter(r => {
      const reportDate = new Date(r.created_at);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && 
             reportDate.getFullYear() === now.getFullYear();
    }).length,
    avgNavChange: reports.reduce((acc, r) => 
      acc + (r.metadata?.nav_change_pct || 0), 0
    ) / (reports.length || 1),
    lastPublished: reports[0]?.created_at,
    totalAuthors: new Set(reports.map(r => r.created_by)).size
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard
        icon={FileText}
        label="Informes"
        value={stats.totalReports}
        trend={stats.thisMonth > 0 ? `+${stats.thisMonth} mes` : null}
        color="yellow"
        delay={0}
        isDarkMode={isDarkMode}
      />
      <MetricCard
        icon={LineChart}
        label="NAV Avg"
        value={`${stats.avgNavChange >= 0 ? '+' : ''}${stats.avgNavChange.toFixed(2)}%`}
        trend={stats.avgNavChange >= 0 ? 'Bullish' : 'Bearish'}
        color={stats.avgNavChange >= 0 ? 'green' : 'blue'}
        delay={0.1}
        isDarkMode={isDarkMode}
      />
      <MetricCard
        icon={ShieldCheck}
        label="Autores"
        value={stats.totalAuthors}
        trend="Verificados"
        color="cyan"
        delay={0.2}
        isDarkMode={isDarkMode}
      />
      <MetricCard
        icon={History}
        label="Ultimo"
        value={formatRelativeTime(stats.lastPublished)}
        trend="Publicado"
        color="purple"
        delay={0.3}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

// ============================================
// COMPONENTE: FilterBar
// ============================================
const FilterBar = ({ reports, onFilter, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    let filtered = [...reports];

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.created_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (reportType !== 'all') {
      filtered = filtered.filter(r => r.title.toLowerCase().includes(reportType));
    }

    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'date_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'nav_desc': return (b.metadata?.nav_snapshot || 0) - (a.metadata?.nav_snapshot || 0);
        default: return 0;
      }
    });

    onFilter(filtered);
  }, [searchTerm, reportType, sortBy, reports, onFilter]);

  return (
    <div className={`p-4 rounded-xl border-2 mb-8 flex flex-col md:flex-row gap-4 items-center transition-all ${
      isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className="relative flex-1 w-full">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        <Input
          placeholder="Buscar informes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`pl-10 h-10 ${isDarkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className={`h-10 w-full md:w-40 ${isDarkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-gray-50'}`}>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : ''}>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="mensual">Mensuales</SelectItem>
            <SelectItem value="especial">Especiales</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className={`h-10 w-full md:w-40 ${isDarkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-gray-50'}`}>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : ''}>
            <SelectItem value="date_desc">Mas recientes</SelectItem>
            <SelectItem value="date_asc">Mas antiguos</SelectItem>
            <SelectItem value="nav_desc">Mayor NAV</SelectItem>
            <SelectItem value="title_asc">Titulo A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: ReportCard
// ============================================
const ReportCard = ({ report, isDarkMode, isInstitutional, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const metadata = report.metadata || {};

  return (
    <motion.div
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-2xl border-2 p-6 transition-all duration-500 overflow-hidden h-full flex flex-col ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 to-slate-800/50 border-slate-800 hover:border-yellow-500/50' 
          : 'bg-white border-gray-100 hover:border-yellow-500/30 shadow-sm hover:shadow-xl'
      }`}
    >
      <div className="absolute top-0 right-0 p-4 z-10">
        {isInstitutional && (
          <DropdownMenu>
            <DropdownMenuTrigger className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'bg-slate-950/50 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
            }`}>
              <MoreVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className={isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : ''}>
              <DropdownMenuItem 
                onClick={() => window.open(report.file_url, '_blank')}
                className="cursor-pointer"
              >
                <Eye size={14} className="mr-2" /> Abrir PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(report.id, report.file_name)}
                className="text-red-400 focus:text-red-300 cursor-pointer"
              >
                <Trash2 size={14} className="mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mb-5 flex items-start justify-between relative">
        <div className={`p-3 rounded-2xl transition-all duration-500 ${
          isDarkMode ? 'bg-yellow-500/10 group-hover:bg-yellow-500/20' : 'bg-yellow-50 group-hover:bg-yellow-100'
        }`}>
          <FileText size={28} className="text-yellow-500" />
        </div>
        <div className="flex flex-col items-end gap-1 mt-1 mr-8">
           <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Auditado
          </span>
          <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            ID: {report.id.substring(0, 8)}
          </span>
        </div>
      </div>

      <h3 className={`text-lg font-bold mb-2 line-clamp-2 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {report.title}
      </h3>
      
      <p className={`text-xs mb-6 line-clamp-2 leading-relaxed flex-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {report.description}
      </p>

      {metadata.nav_snapshot && (
        <div className={`grid grid-cols-2 gap-2 mb-6 p-4 rounded-xl transition-all border ${
          isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <div className="space-y-0.5">
            <span className={`text-[9px] uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>NAV Unit</span>
            <div className="flex items-baseline gap-1">
               <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${metadata.nav_snapshot.toFixed(2)}</span>
               <span className={`text-[10px] ${metadata.nav_change_pct >= 0 ? 'text-emerald-500' : 'text-blue-500'}`}>
                 {metadata.nav_change_pct >= 0 ? '↑' : '↓'}{Math.abs(metadata.nav_change_pct).toFixed(1)}%
               </span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className={`text-[9px] uppercase tracking-wider font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>AUM</span>
            <div className="flex items-baseline gap-1">
               <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                 ${(metadata.aum_snapshot / 1000000).toFixed(1)}M
               </span>
               <span className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>CLP</span>
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between text-[10px] mb-5 pt-4 border-t ${
        isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-100'
      }`}>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-yellow-500" />
          <span>{new Date(report.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold">{report.created_by || 'FRERAUT'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => window.open(report.file_url, '_blank')}
          variant="outline"
          className={`flex-1 text-xs font-bold h-9 rounded-xl transition-all ${
            isDarkMode 
              ? 'border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800' 
              : 'border-slate-100 hover:border-slate-200 text-slate-600'
          }`}
        >
          <Eye size={14} className="mr-2" /> Vista Previa
        </Button>
        <a href={report.file_url} download className="flex-1">
          <Button className="w-full text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-900 h-9 rounded-xl shadow-lg shadow-yellow-500/10">
            <Download size={14} className="mr-2" /> PDF
          </Button>
        </a>
      </div>

      <AnimatePresence>
        {isHovered && metadata.top_holdings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-6 bottom-32 bg-slate-950/95 border border-slate-800 p-4 rounded-xl backdrop-blur-md z-20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
               <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Holdings Principales</span>
               <PieChart size={12} className="text-slate-500" />
            </div>
            <div className="space-y-2">
              {metadata.top_holdings.slice(0, 3).map((h, i) => (
                <div key={i} className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white w-8">{h.ticker}</span>
                    <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-yellow-500" style={{ width: `${h.weight}%` }}></div>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono">{h.weight.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// COMPONENTE: PublishDialog
// ============================================
const PublishDialog = ({ 
  isOpen, onClose, isDarkMode, onPublish, isProcessing,
  title, setTitle, desc, setDesc, author, setAuthor
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg rounded-3xl p-8 border-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <DialogHeader className="mb-6">
          <DialogTitle className={`text-2xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="p-2.5 rounded-2xl bg-yellow-500/10">
              <Upload size={24} className="text-yellow-500" />
            </div>
            Publicar Reporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Analista Responsable</label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Nombre del autor..."
              className={`h-11 rounded-xl ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Titulo del Informe</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Analisis Mensual - Q1 2026"
              className={`h-11 rounded-xl ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Descripcion Ejecutiva</label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Breve resumen del contenido..."
              className={`h-28 rounded-xl resize-none ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>

          <div className={`p-4 rounded-2xl border flex gap-3 ${
            isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'
          }`}>
            <ShieldCheck size={18} className="text-blue-500 shrink-0" />
            <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Al publicar, se generara automaticamente un PDF auditado con los datos en tiempo real de NAV, AUM y Holdings. Este documento sera visible para todos los inversores registrados.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onPublish}
              disabled={isProcessing || !title || !author}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold h-12 rounded-2xl shadow-xl shadow-yellow-500/20"
            >
              {isProcessing ? <Loader className="animate-spin" /> : 'Generar y Publicar'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className={`px-6 h-12 rounded-2xl ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200'}`}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: Reports
// ============================================
const Reports = () => {
  const { toast } = useToast();
  const [isInstitutional, setIsInstitutional] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reports, setReports] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [title, setTitle] = useState(`Informe Mensual ${new Date().toLocaleDateString('es-CL')}`);
  const [desc, setDesc] = useState('Recopilacion automatizada de metricas de mercado, rendimiento del NAV y composicion del portfolio.');
  const [author, setAuthor] = useState('');

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    const init = async () => {
      await checkRole();
      await loadReports();
      setIsLoading(false);
    };
    init();
  }, []);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('verificar_usuario_institucional');
      setIsInstitutional(data?.[0]?.es_institucional || user.email === 'frerautgroups.a@gmail.com');
    } catch (e) { console.error(e); }
  };

  const loadReports = async () => {
    try {
      const { data } = await supabase
        .from('published_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        setReports(data);
        setFiltered(data);
      }
    } catch (e) { console.error(e); }
  };

  const generatePDF = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Cargamos jspdf dinamicamente si no existe
      if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('CDN load timeout')), 10000);
          script.onload = () => { clearTimeout(timeout); resolve(); };
          script.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load jspdf from CDN')); };
        });
      }

      // 1. Fetch data
      const [portfolio, navData, metrics] = await Promise.all([
        supabase.from('cartera').select('*').order('valor_actual', { ascending: false }),
        supabase.from('nav_historico').select('*').order('fecha', { ascending: false }).limit(2),
        supabase.from('metricas_mercado').select('*').single()
      ]);

      const currentNav = navData.data?.[0]?.nav || 0;
      const prevNav = navData.data?.[1]?.nav || currentNav;
      const navChange = prevNav > 0 ? ((currentNav - prevNav) / prevNav) * 100 : 0;
      const totalValue = portfolio.data?.reduce((s, i) => s + (i.valor_actual || 0), 0) || 0;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Diseno Minimalista Premium (Freraut Style)
      doc.setFillColor(11, 12, 16); // Deep Black
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(201, 162, 39); // Freraut Gold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('FRERAUT INVEST', 20, 25);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('REPORTES DE AUDITORIA FINANCIERA', 20, 32);
      doc.text(new Date().toLocaleDateString('es-CL'), 190, 25, { align: 'right' });

      // Body
      doc.setTextColor(11, 12, 16);
      doc.setFontSize(18);
      doc.text(title.toUpperCase(), 20, 60);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(110, 110, 110);
      const splitDesc = doc.splitTextToSize(desc, 170);
      doc.text(splitDesc, 20, 70);

      // Metricas Principales
      doc.setFillColor(245, 241, 232); // Beige Panel
      doc.roundedRect(20, 90, 170, 40, 3, 3, 'F');
      
      doc.setTextColor(11, 12, 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('NAV POR UNIDAD', 35, 105);
      doc.text('TOTAL AUM', 95, 105);
      doc.text('INVERSORES', 155, 105);

      doc.setFontSize(16);
      doc.text(`$${currentNav.toFixed(2)}`, 35, 118);
      doc.text(`$${(totalValue / 1000000).toFixed(1)}M`, 95, 118);
      doc.text(`${metrics.data?.inversores_activos || 0}`, 155, 118);

      // Tabla Holdings
      doc.setFontSize(12);
      doc.text('COMPOSICION ESTRATEGICA DEL PORTFOLIO', 20, 150);
      
      let y = 165;
      doc.setFillColor(230, 230, 230);
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setFontSize(8);
      doc.text('ACTIVO', 25, y);
      doc.text('CANTIDAD', 80, y);
      doc.text('PESO %', 130, y);
      doc.text('VALOR USD', 185, y, { align: 'right' });

      y += 10;
      portfolio.data?.slice(0, 10).forEach(item => {
        doc.text(item.ticker || '-', 25, y);
        doc.text((item.cantidad || 0).toFixed(2), 80, y);
        doc.text(`${(((item.valor_actual || 0) / totalValue) * 100).toFixed(2)}%`, 130, y);
        doc.text(`$${(item.valor_actual || 0).toLocaleString()}`, 185, y, { align: 'right' });
        y += 8;
      });

      // Disclaimer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Este documento es propiedad de FRERAUT INVEST SpA. La informacion contenida es auditada y validada por el motor Lake Intelligence.', 105, 285, { align: 'center' });

      // 2. Upload
      const blob = doc.output('blob');
      const fname = `${Date.now()}_report.pdf`;
      
      const { error: upErr } = await supabase.storage.from('reports').upload(fname, blob);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(fname);

      await supabase.from('published_reports').insert([{
        title,
        description: desc,
        file_url: publicUrl,
        file_name: fname,
        created_by: author,
        is_public: true,
        metadata: {
          nav_snapshot: currentNav,
          nav_change_pct: navChange,
          aum_snapshot: totalValue,
          inversores_activos: metrics.data?.inversores_activos,
          top_holdings: portfolio.data?.slice(0, 3).map(i => ({
            ticker: i.ticker,
            weight: (i.valor_actual / totalValue) * 100,
            value: i.valor_actual
          }))
        }
      }]);

      toast({ title: '✅ Informe publicado correctamente' });
      setShowModal(false);
      await loadReports();

    } catch (e) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteReport = async (id, fname) => {
    try {
      await supabase.storage.from('reports').remove([fname]);
      await supabase.from('published_reports').delete().eq('id', id);
      toast({ title: '✅ Eliminado' });
      await loadReports();
    } catch (e) { console.error(e); }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
           <Loader className="animate-spin text-yellow-500" size={40} />
           <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cargando Lake Auditor</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${
      isDarkMode ? 'bg-[#0B0C10]' : 'bg-slate-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <BarChart3 className="text-yellow-500" size={24} />
              </div>
              <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.3em]">Institutional Hub</span>
            </div>
            <h1 className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Informes <span className="text-yellow-500">Auditados</span>
            </h1>
            <p className={`text-sm max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Acceso exclusivo a reportes de portfolio, variaciones de NAV y estados financieros validados por Lake Intelligence para inversores registrados.
            </p>
          </motion.div>

          {isInstitutional && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black px-8 py-6 h-auto rounded-2xl shadow-2xl shadow-yellow-500/20 group"
              >
                <Upload size={20} className="mr-2 group-hover:-translate-y-1 transition-transform" />
                Publicar Informe
              </Button>
            </motion.div>
          )}
        </header>

        <AnalyticsSection reports={reports} isDarkMode={isDarkMode} />

        <FilterBar reports={reports} onFilter={setFiltered} isDarkMode={isDarkMode} />

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ReportCard
                  report={r}
                  isDarkMode={isDarkMode}
                  isInstitutional={isInstitutional}
                  onDelete={deleteReport}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className={`inline-flex p-6 rounded-full mb-4 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <Search size={40} className="text-slate-700" />
              </div>
              <h3 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Sin resultados
              </h3>
              <p className="text-slate-500 text-sm">Prueba con otros filtros o terminos de busqueda.</p>
            </div>
          )}
        </motion.div>

        <PublishDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isDarkMode={isDarkMode}
          onPublish={generatePDF}
          isProcessing={isProcessing}
          title={title}
          setTitle={setTitle}
          desc={desc}
          setDesc={setDesc}
          author={author}
          setAuthor={setAuthor}
        />

        <footer className={`mt-20 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-yellow-500" />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Validado por Lake Intelligence SpA
            </span>
          </div>
          <div className="flex gap-6">
            <button className={`text-[10px] font-bold uppercase tracking-widest hover:text-yellow-500 transition-colors ${
              isDarkMode ? 'text-slate-600' : 'text-slate-400'
            }`}>Privacidad</button>
            <button className={`text-[10px] font-bold uppercase tracking-widest hover:text-yellow-500 transition-colors ${
              isDarkMode ? 'text-slate-600' : 'text-slate-400'
            }`}>Terminos</button>
            <button className={`text-[10px] font-bold uppercase tracking-widest hover:text-yellow-500 transition-colors ${
              isDarkMode ? 'text-slate-600' : 'text-slate-400'
            }`}>Contacto</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Reports;