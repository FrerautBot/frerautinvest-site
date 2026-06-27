import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, PieChart, BarChart3, Brain, FileText, ArrowRight, Wallet,
  Building2, ShieldCheck, Globe2, Menu, X,
  ExternalLink, Users, Quote, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet';

/* ============================================================
   DiseñoFreraut — Landing Page Freraut Invest
   Paleta institucional: gold #C9A227, bg #0B0C10, panel #F5F1E8
   Reglas: colores sólidos, sin gradient text, sin glassmorphism,
   WCAG AA, text-wrap balance en headings, reduced-motion support
   ============================================================ */

const COLORS = {
  gold: '#C9A227',
  goldLight: '#E4C65A',
  bg: '#0B0C10',
  panel: '#F5F1E8',
  text: '#1A1D2B',
  textInverse: '#FFFFFF',
  muted: '#9C9C9C',
  cardBg: '#1A1D2B',
  success: '#3E8E41',
};

// Variantes de animación con respeto a reduced-motion
const useSafeAnimation = () => {
  const prefersReduced = useReducedMotion();
  return { reduced: prefersReduced };
};

const fadeIn = (reduced) => reduced
  ? { initial: {}, animate: {}, transition: {} }
  : {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
    };

const fadeInChild = (reduced) => reduced
  ? { hidden: {}, visible: {} }
  : {
      hidden: { opacity: 0, y: 24 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
    };

const stagger = (reduced) => reduced
  ? { visible: {} }
  : {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
    };

/* ---------- Header ---------- */
const LandingHeader = ({ onOpenAuth }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { reduced } = useSafeAnimation();
  const links = [
    { label: 'Inicio', href: '#hero' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Estadísticas', href: '#stats' },
    { label: 'Contacto', href: '#contacto' },
  ];

  return (
    <motion.header
      initial={reduced ? {} : { y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: COLORS.bg, borderBottom: '1px solid rgba(201,162,39,0.15)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: COLORS.gold }}
          >
            <span style={{ color: COLORS.bg, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>
              F
            </span>
          </div>
          <div className="flex flex-col">
            <h1
              className="text-base font-bold tracking-[0.18em] md:text-lg"
              style={{ color: COLORS.gold }}
            >
              FRERAUT INVEST
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: COLORS.muted }}>
              Excelencia Patrimonial
            </span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ color: COLORS.textInverse, opacity: 0.8 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {link.label}
            </a>
          ))}
          <div className="w-px h-6 mx-2" style={{ backgroundColor: 'rgba(201,162,39,0.2)' }} />
          <Button
            onClick={onOpenAuth}
            className="text-sm font-semibold rounded-xl px-5 py-2 h-auto"
            style={{ backgroundColor: COLORS.gold, color: COLORS.bg }}
          >
            Acceder
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg"
          style={{ color: COLORS.gold }}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden px-4 pb-4"
          style={{ backgroundColor: COLORS.bg, borderTop: '1px solid rgba(201,162,39,0.15)' }}
        >
          <nav className="flex flex-col gap-1 pt-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium rounded-lg transition-colors"
                style={{ color: COLORS.textInverse }}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2">
              <Button
                onClick={onOpenAuth}
                className="w-full text-sm font-semibold rounded-xl py-3 h-auto"
                style={{ backgroundColor: COLORS.gold, color: COLORS.bg }}
              >
                Acceder al Dashboard
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </nav>
        </motion.div>
      )}

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </motion.header>
  );
};

/* ---------- Hero ---------- */
const HeroSection = ({ onOpenAuth }) => {
  const { reduced } = useSafeAnimation();

  return (
    <section id="hero" style={{ backgroundColor: COLORS.bg, minHeight: '100vh', scrollMarginTop: '80px' }} className="relative flex items-center">
      {/* Línea decorativa gold sutil */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)` }}
      />

      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-32 md:py-40 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Texto */}
          <motion.div {...fadeIn(reduced)}>
            <Badge
              className="mb-6 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full border"
              style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
            >
              <Crown className="w-3 h-3 mr-1.5" />
              Patrimonio Privado
            </Badge>

            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6"
              style={{ color: COLORS.textInverse, textWrap: 'balance' }}
            >
              Inversión Inteligente con{' '}
              <span style={{ color: COLORS.gold }}>Visión de Excelencia</span>
            </h2>

            <p
              className="text-base md:text-lg leading-relaxed mb-8 max-w-lg"
              style={{ color: COLORS.muted }}
            >
              Gestión profesional de patrimonios con presencia internacional.
              Unidades de Efectivo (UEs) respaldadas por activos reales y gobernanza
              corporativa transparente.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={onOpenAuth}
                className="text-sm font-semibold rounded-xl px-6 py-3 h-auto shadow-lg"
                style={{
                  backgroundColor: COLORS.gold,
                  color: COLORS.bg,
                  boxShadow: `0 4px 14px ${COLORS.gold}40`,
                }}
              >
                Acceder al Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="text-sm font-medium rounded-xl px-6 py-3 h-auto border-2"
                style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold }}
                onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver Reportes
              </Button>
            </div>

            {/* Indicadores de confianza */}
            <div className="flex flex-wrap gap-6 mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon: ShieldCheck, label: 'Regulado' },
                { icon: Globe2, label: 'Presencia Internacional' },
                { icon: Users, label: 'Inversores Verificados' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" style={{ color: COLORS.gold }} />
                  <span className="text-xs font-medium" style={{ color: COLORS.muted }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Panel informativo */}
          <motion.div
            {...fadeIn(reduced)}
            transition={reduced ? {} : { delay: 0.2, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl p-8"
            style={{ backgroundColor: COLORS.cardBg, border: '1px solid rgba(201,162,39,0.15)' }}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(201,162,39,0.15)' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: COLORS.gold }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.textInverse }}>
                    Valor Neto Actual
                  </p>
                  <p className="text-xs" style={{ color: COLORS.muted }}>
                    Por unidad de efectivo (UE)
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-5xl font-bold tracking-tight" style={{ color: COLORS.gold }}>
                  $5.24
                  <span className="text-base font-normal ml-2" style={{ color: COLORS.muted }}>USD</span>
                </p>
                <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
                  Precio de referencia · Valor contable
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Activo Subyacente', value: 'Cartera Real', icon: Building2 },
                  { label: 'Valor Base', value: 'Multimoneda', icon: Wallet },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <stat.icon className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.gold }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: COLORS.muted }}>
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold" style={{ color: COLORS.textInverse }}>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Gradiente decorativo inferior sutil — solo fondo, no texto */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${COLORS.bg}, transparent)`,
        }}
      />
    </section>
  );
};

/* ---------- Servicios ---------- */
const ServiciosSection = () => {
  const { reduced } = useSafeAnimation();
  const servicios = [
    {
      icon: Wallet,
      title: 'Gestión de Patrimonio',
      desc: 'Administración profesional de carteras de inversión con diversificación geográfica y sectorial, enfocada en la preservación y crecimiento del capital.',
    },
    {
      icon: BarChart3,
      title: 'Mercado de UEs',
      desc: 'Plataforma de compra y venta de Unidades de Efectivo con precios transparentes, liquidez diaria y ejecución en tiempo real.',
    },
    {
      icon: Brain,
      title: 'Lake Intelligence',
      desc: 'Sistema de análisis impulsado por inteligencia artificial para monitoreo de mercados, optimización de estrategias y generación de reportes.',
    },
    {
      icon: PieChart,
      title: 'Portafolio Personalizado',
      desc: 'Estructuración de carteras según perfil de riesgo, objetivos financieros y horizonte temporal de cada inversor.',
    },
    {
      icon: ShieldCheck,
      title: 'Gobierno Corporativo',
      desc: 'Estructura de gobernanza transparente con asamblea de accionistas, derechos de voto proporcionales y administración fiduciaria.',
    },
    {
      icon: FileText,
      title: 'Reportes y Análisis',
      desc: 'Informes periódicos de rendimiento, estados financieros auditables y métricas detalladas de evolución del fondo.',
    },
  ];

  return (
    <section id="servicios" style={{ backgroundColor: COLORS.bg, scrollMarginTop: '80px' }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-24 md:py-32">
        <motion.div {...fadeIn(reduced)} className="text-center mb-16">
          <Badge
            className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full border"
            style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
          >
            Servicios
          </Badge>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: COLORS.textInverse, textWrap: 'balance' }}
          >
            Soluciones Completas de Inversión
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: COLORS.muted }}>
            Desde la administración de patrimonios hasta el análisis avanzado con IA,
            ofrecemos todo lo necesario para una gestión financiera profesional.
          </p>
        </motion.div>

        <motion.div
          variants={stagger(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {servicios.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeInChild(reduced)}
              className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: COLORS.cardBg,
                border: '1px solid rgba(201,162,39,0.1)',
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}
              >
                <s.icon className="w-5 h-5" style={{ color: COLORS.gold }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.textInverse }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
                {s.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- Cómo Funciona ---------- */
const HowItWorksSection = () => {
  const { reduced } = useSafeAnimation();
  const steps = [
    { number: '01', title: 'Crea tu Cuenta', desc: 'Regístrate en minutos. Verifica tu identidad y accede al dashboard de inversiones.', icon: '👤' },
    { number: '02', title: 'Deposita Capital', desc: 'Transfiere fondos en CLP o USD. Conversión automática al tipo de cambio del día.', icon: '💰' },
    { number: '03', title: 'Adquiere UEs', desc: 'Compra Unidades de Efectivo al precio NAV vigente. Sin mínimos ni comisiones ocultas.', icon: '📈' },
    { number: '04', title: 'Sigue tu Inversión', desc: 'Monitorea rendimientos, genera reportes y toma decisiones con Lake Intelligence.', icon: '📊' },
  ];

  return (
    <section style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-24 md:py-32">
        <motion.div {...fadeIn(reduced)} className="text-center mb-16">
          <Badge className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full border" style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}>
            Proceso
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: COLORS.textInverse, textWrap: 'balance' }}>
            Cómo Funciona
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: COLORS.muted }}>
            Comience a invertir en cuatro pasos simples.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Línea conectora entre pasos (solo desktop) */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px" style={{ background: `linear-gradient(90deg, ${COLORS.gold}44, ${COLORS.gold}22, ${COLORS.gold}44)` }} />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={reduced ? {} : { opacity: 0, y: 30 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative flex flex-col items-center text-center p-6 rounded-2xl"
              style={{ backgroundColor: COLORS.cardBg, border: '1px solid rgba(201,162,39,0.1)' }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl mb-5 relative z-10" style={{ backgroundColor: 'rgba(201,162,39,0.12)' }}>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: COLORS.gold }}>
                Paso {step.number}
              </span>
              <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.textInverse }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- Estadísticas ---------- */
const StatsSection = () => {
  const { reduced } = useSafeAnimation();
  const stats = [
    { value: 'UEs', label: 'Unidades de Efectivo', sublabel: 'Respaldo en activos reales' },
    { value: '24/7', label: 'Plataforma de Inversión', sublabel: 'Compra y venta de UEs' },
    { value: 'CLP+USD', label: 'Base Multimoneda', sublabel: 'Cobertura cambiaria integrada' },
    { value: '2022', label: 'Desde', sublabel: 'Operación continua' },
  ];

  return (
    <section id="stats" style={{ backgroundColor: COLORS.cardBg, scrollMarginTop: '80px' }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-24 md:py-28">
        <motion.div {...fadeIn(reduced)} className="text-center mb-16">
          <Badge
            className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full border"
            style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}
          >
            Métricas
          </Badge>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: COLORS.textInverse, textWrap: 'balance' }}
          >
            Resultados que Hablan
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: COLORS.muted }}>
            Transparencia total en la gestión de patrimonios.
          </p>
        </motion.div>

        <motion.div
          variants={stagger(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeInChild(reduced)}
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: COLORS.bg, border: '1px solid rgba(201,162,39,0.12)' }}
            >
              <p className="text-3xl md:text-4xl font-bold mb-2" style={{ color: COLORS.gold }}>
                {stat.value}
              </p>
              <p className="text-sm font-semibold mb-1" style={{ color: COLORS.textInverse }}>
                {stat.label}
              </p>
              <p className="text-xs" style={{ color: COLORS.muted }}>
                {stat.sublabel}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- Testimonios ---------- */
const TestimonialsSection = () => {
  const { reduced } = useSafeAnimation();
  const testimonials = [
    {
      quote: 'La transparencia del modelo de UEs y la gobernanza corporativa me dieron la confianza para diversificar mi patrimonio.',
      author: 'Inversor Verificado',
      role: 'Cuenta institucional',
    },
    {
      quote: 'Lake Intelligence cambió mi forma de analizar inversiones. Acceso a datos y métricas que ningún bróker tradicional ofrece.',
      author: 'Inversor Verificado',
      role: 'Cuenta institucional',
    },
    {
      quote: 'La liquidez del mercado de UEs y la claridad del modelo de valorización hacen que pueda entrar y salir sin fricción.',
      author: 'Inversor Verificado',
      role: 'Cuenta institucional',
    },
  ];

  return (
    <section style={{ backgroundColor: COLORS.cardBg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-24 md:py-32">
        <motion.div {...fadeIn(reduced)} className="text-center mb-16">
          <Badge className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full border" style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold, backgroundColor: 'rgba(201,162,39,0.08)' }}>
            Testimonios
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: COLORS.textInverse, textWrap: 'balance' }}>
            Lo Que Dicen Nuestros Inversores
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: COLORS.muted }}>
            La confianza de nuestros inversores es nuestro mayor activo.
          </p>
        </motion.div>

        <motion.div
          variants={stagger(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={fadeInChild(reduced)}
              className="rounded-2xl p-6 flex flex-col"
              style={{ backgroundColor: COLORS.bg, border: '1px solid rgba(201,162,39,0.12)' }}
            >
              {/* Quote icon */}
              <div className="mb-4">
                <svg className="w-8 h-8" style={{ color: COLORS.gold, opacity: 0.3 }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: COLORS.textInverse }}>
                "{t.quote}"
              </p>
              <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-semibold" style={{ color: COLORS.textInverse }}>{t.author}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: COLORS.muted }}>{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- CTA / Contacto ---------- */
const CTASection = ({ onOpenAuth }) => {
  const { reduced } = useSafeAnimation();

  return (
    <section id="contacto" style={{ backgroundColor: COLORS.bg, scrollMarginTop: '80px' }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          {...fadeIn(reduced)}
          className="rounded-2xl p-8 md:p-16 text-center relative overflow-hidden"
          style={{
            backgroundColor: COLORS.cardBg,
            border: '1px solid rgba(201,162,39,0.15)',
          }}
        >
          {/* Línea decorativa gold */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)` }}
          />

          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: COLORS.textInverse, textWrap: 'balance' }}
          >
            Comience a Invertir Hoy
          </h2>
          <p className="text-base max-w-xl mx-auto mb-8" style={{ color: COLORS.muted }}>
            Acceda a su dashboard personalizado para gestionar sus inversiones,
            consultar reportes en tiempo real y operar con Unidades de Efectivo.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={onOpenAuth}
              className="text-sm font-semibold rounded-xl px-8 py-3 h-auto shadow-lg"
              style={{
                backgroundColor: COLORS.gold,
                color: COLORS.bg,
                boxShadow: `0 4px 14px ${COLORS.gold}40`,
              }}
            >
              Crear Cuenta Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="text-sm font-medium rounded-xl px-8 py-3 h-auto"
              style={{ borderColor: 'rgba(201,162,39,0.3)', color: COLORS.gold }}
              onClick={() => window.location.href = 'mailto:contacto@frerautinvest.com'}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Contactar
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>
                Soporte
              </p>
              <p className="text-sm" style={{ color: COLORS.textInverse }}>
                contacto@frerautinvest.com
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>
                Ubicación
              </p>
              <p className="text-sm" style={{ color: COLORS.textInverse }}>
                Talca, Región del Maule, Chile
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ---------- Footer ---------- */
const FooterSection = () => (
  <footer style={{ backgroundColor: COLORS.cardBg, borderTop: '1px solid rgba(201,162,39,0.1)' }}>
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-16 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Col 1: Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: COLORS.gold }}>
              <span style={{ color: COLORS.bg, fontWeight: 800, fontSize: '0.85rem' }}>F</span>
            </div>
            <p className="text-sm font-bold tracking-wider" style={{ color: COLORS.gold }}>FRERAUT INVEST</p>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.muted }}>
            Holding especializado en gestión profesional de patrimonios,
            con presencia en Talca, Región del Maule y operaciones internacionales.
          </p>
          <div className="flex gap-3">
            <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: 'rgba(201,162,39,0.1)', color: COLORS.gold }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: 'rgba(201,162,39,0.1)', color: COLORS.gold }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
          </div>
        </div>

        {/* Col 2: Servicios */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.textInverse }}>Servicios</h4>
          <ul className="space-y-3">
            {['Gestión de Patrimonio', 'Mercado de UEs', 'Lake Intelligence', 'Portafolio Personalizado', 'Gobierno Corporativo', 'Reportes y Análisis'].map((item) => (
              <li key={item}>
                <a href="#servicios" className="text-sm transition-colors hover:underline" style={{ color: COLORS.muted }}>
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contacto */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: COLORS.textInverse }}>Contacto</h4>
          <ul className="space-y-3">
            <li>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Email</p>
              <a href="mailto:contacto@frerautinvest.com" className="text-sm transition-colors" style={{ color: COLORS.gold }}>
                contacto@frerautinvest.com
              </a>
            </li>
            <li>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Ubicación</p>
              <p className="text-sm" style={{ color: COLORS.textInverse }}>
                Talca, Región del Maule, Chile
              </p>
            </li>
            <li>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Horario</p>
              <p className="text-sm" style={{ color: COLORS.textInverse }}>
                Lun–Vie: 9:00 – 18:00 CLT
              </p>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs mb-4" style={{ color: COLORS.muted }}>
          <a href="#" className="hover:underline">Términos y Condiciones</a>
          <a href="#" className="hover:underline">Política de Privacidad</a>
          <a href="#" className="hover:underline">Regulaciones</a>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: COLORS.muted }}>
          Freraut Invest es una sociedad de inversión privada constituida bajo las leyes de la República de Chile.
          La información proporcionada no constituye asesoría financiera ni recomendación de inversión.
          El valor de las inversiones puede fluctuar. Rendimientos pasados no garantizan resultados futuros.
        </p>
        <p className="text-[11px] mt-3" style={{ color: COLORS.muted }}>
          © {new Date().getFullYear()} Freraut Invest · Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);

/* ============================================================
   HomePage — Landing Principal
   ============================================================ */
const HomePage = ({ onOpenAuth }) => {
  const { reduced } = useSafeAnimation();

  useEffect(() => {
    if (reduced) return;
    const el = document.documentElement;
    const original = el.style.scrollBehavior;
    el.style.scrollBehavior = 'smooth';
    return () => { el.style.scrollBehavior = original; };
  }, [reduced]);

  return (
    <div style={{ backgroundColor: COLORS.bg, overflowX: 'hidden' }}>
      <Helmet>
        <title>Freraut Invest — Inversión Inteligente con Visión de Excelencia</title>
        <meta name="description" content="Gestión profesional de patrimonios con presencia internacional. Unidades de Efectivo (UEs) respaldadas por activos reales y gobernanza corporativa transparente." />
        <meta property="og:title" content="Freraut Invest — Inversión Inteligente" />
        <meta property="og:description" content="Gestión profesional de patrimonios con presencia internacional. UEs respaldadas por activos reales." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <LandingHeader onOpenAuth={onOpenAuth} />
      <HeroSection onOpenAuth={onOpenAuth} />
      <ServiciosSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection onOpenAuth={onOpenAuth} />
      <FooterSection />
    </div>
  );
};

export default HomePage;
