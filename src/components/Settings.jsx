import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Bell, Moon, Sun, LogOut, Save, Loader2, Check, FileText, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';



const Settings = ({ onBack }) => {
  const { session, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPoliticas, setShowPoliticas] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    rut: '',
    country: ''
  });

  // Estado para las notificaciones
  const [notifications, setNotifications] = useState({
    alertasMercado: false,
    reportesSemanales: false,
    actualizacionesSistema: false,
    actualizacionBonos: false
  });



  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
  }, [session]);


  useEffect(() => {
    // Aplicar el tema al documento
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Escape key handler for Privacy Policy modal
  useEffect(() => {
    if (!showPoliticas) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowPoliticas(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPoliticas]);



  const loadUserData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();



      if (error) throw error;

      if (data) {
        setUserData({
          nombre: data.nombre || '',
          email: data.email || session.user.email || '',
          rut: data.rut || '',
          country: data.country || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (session?.user?.email) {
        setUserData(prev => ({ ...prev, email: session.user.email }));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('notificaciones')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.notificaciones) {
        const notif = typeof data.notificaciones === 'string'
          ? JSON.parse(data.notificaciones)
          : data.notificaciones;

        setNotifications(notif);
        console.log('✅ Notificaciones cargadas:', notif);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };



  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: userData.nombre
        })
        .eq('id', session.user.id);



      if (error) throw error;



      toast({
        title: '✅ Cambios guardados',
        description: 'Tu información se actualizó correctamente'
      });
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = async (key) => {
    if (!session?.user?.id) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión',
        variant: 'destructive'
      });
      return;
    }

    const newValue = !notifications[key];

    // Actualizar estado local inmediatamente
    const nuevasNotificaciones = {
      ...notifications,
      [key]: newValue
    };

    setNotifications(nuevasNotificaciones);

    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('usuarios')
        .update({
          notificaciones: nuevasNotificaciones
        })
        .eq('id', session.user.id);

      if (error) throw error;

      console.log('✅ Notificación guardada:', nuevasNotificaciones);

      toast({
        title: newValue ? '🔔 Notificación activada' : '🔕 Notificación desactivada',
        description: `Las notificaciones de "${notificationItems.find(item => item.key === key)?.label}" han sido ${newValue ? 'activadas' : 'desactivadas'}`
      });
    } catch (error) {
      console.error('❌ Error actualizando notificación:', error);

      // Revertir cambio si hay error
      setNotifications(notifications);

      toast({
        title: 'Error al actualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast({
      title: `Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`,
      description: 'El tema se ha cambiado correctamente'
    });
  };



  const handleLogout = async () => {
    await signOut();
    onBack();
  };

  const notificationItems = [
    { key: 'alertasMercado', label: 'Alertas de mercado' },
    { key: 'reportesSemanales', label: 'Reportes semanales' },
    { key: 'actualizacionesSistema', label: 'Actualizaciones del sistema' },
    { key: 'actualizacionBonos', label: 'Actualización de bonos' }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 transition-colors duration-300">
      {/* Header con botón de regreso */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md transition-colors duration-300"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/60 hover:bg-primary/5 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Volver</span>
          </button>



          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground md:text-2xl">
              Configuración
            </h1>
          </div>



          <div className="w-24" />
        </div>
      </motion.div>



      {/* Contenido principal */}
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información Personal */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg transition-colors duration-300"
            >
              <div className="border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/20 p-2.5">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Información Personal
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Administra tus datos personales
                    </p>
                  </div>
                </div>
              </div>



              <div className="space-y-4 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-sm font-medium text-foreground">
                      Nombre completo
                    </Label>
                    <Input
                      id="nombre"
                      value={userData.nombre}
                      onChange={(e) => setUserData({ ...userData, nombre: e.target.value })}
                      className="border-border/60 bg-background/60 transition-colors"
                    />
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      value={userData.email}
                      disabled
                      className="border-border/60 bg-muted/50 cursor-not-allowed opacity-70"
                    />
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="rut" className="text-sm font-medium text-foreground">
                      RUT
                    </Label>
                    <Input
                      id="rut"
                      value={userData.rut}
                      disabled
                      className="border-border/60 bg-muted/50 cursor-not-allowed opacity-70"
                    />
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium text-foreground">
                      País
                    </Label>
                    <Input
                      id="country"
                      value={userData.country}
                      disabled
                      className="border-border/60 bg-muted/50 cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>



                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar cambios
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>



            {/* Notificaciones CON BOTONES DORADOS */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg transition-colors duration-300"
            >
              <div className="border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/20 p-2.5">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      Notificaciones
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Gestiona tus preferencias de notificaciones
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Cada notificación se gestionará mediante el correo electrónico vinculado
                    </p>
                  </div>
                </div>
              </div>



              <div className="divide-y divide-border/30 p-6">
                {notificationItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {notifications[item.key] ? 'Activado' : 'Desactivado'}
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={notifications[item.key]}
                      onClick={() => toggleNotification(item.key)}
                      className={`relative h-7 w-12 rounded-full transition-all duration-300 focus:ring-2 focus:ring-offset-2 shadow-inner ${notifications[item.key]
                          ? 'bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 shadow-yellow-500/30 focus:ring-yellow-500'
                          : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                        }`}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <span
                        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ${notifications[item.key]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                          }`}
                      >
                        {notifications[item.key] && (
                          <Check className="h-3 w-3 text-yellow-600" strokeWidth={3} />
                        )}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>



            {/* Preferencias - TEMA FUNCIONAL */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg transition-colors duration-300"
            >
              <div className="border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/20 p-2.5">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Preferencias
                    </h2>
                  </div>
                </div>
              </div>



              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Tema</p>
                    <p className="text-sm text-muted-foreground capitalize">{theme === 'dark' ? 'Oscuro' : 'Claro'}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4" />
                        Claro
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        Oscuro
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>



            {/* Políticas y Términos - NUEVO */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg transition-colors duration-300"
            >
              <div className="border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/20 p-2.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Políticas y Términos
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-4 border-primary/40 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                  onClick={() => setShowPoliticas(true)}
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Ver Políticas de Privacidad</div>
                    <div className="text-xs text-muted-foreground">
                      Consulta nuestras políticas de privacidad
                    </div>
                  </div>
                </Button>
              </div>
            </motion.div>



            {/* Cerrar sesión */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="overflow-hidden rounded-2xl border border-destructive/40 bg-destructive/5 shadow-lg transition-colors duration-300"
            >
              <div className="p-6">
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full gap-2 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Modal de Políticas */}
      <AnimatePresence>
        {showPoliticas && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPoliticas(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-primary/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-transparent sticky top-0 z-10 bg-background">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-bold">POLÍTICAS DE PRIVACIDAD - FRERAUT INVEST</h2>
                    <p className="text-sm text-muted-foreground">
                      Última actualización: 3 de enero de 2026 | Versión: 1.0
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPoliticas(false)}
                  className="hover:bg-primary/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6 text-sm">
                {/* 1. INFORMACIÓN GENERAL */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">1. INFORMACIÓN GENERAL</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Freraut Invest ("nosotros", "nuestro" o "la Plataforma") es una plataforma de inversión en Unidades de Emprendimiento (UE) operada por Freraut Invest. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta política.
                  </p>
                </div>

                {/* 2. INFORMACIÓN QUE RECOPILAMOS */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">2. INFORMACIÓN QUE RECOPILAMOS</h3>
                  
                  <div className="ml-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">2.1 Información Personal</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                        <li><strong>Datos de identificación:</strong> Nombre completo, RUT, correo electrónico, país de residencia</li>
                        <li><strong>Datos financieros:</strong> Historial de inversiones, transacciones, saldo en cuenta</li>
                        <li><strong>Datos de autenticación:</strong> Contraseña encriptada, sesiones de acceso</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">2.2 Información Técnica</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                        <li>Dirección IP desde donde accede</li>
                        <li>Navegador y dispositivo utilizado</li>
                        <li>Cookies y tecnologías similares para mejorar la experiencia</li>
                        <li>Registros de actividad en la plataforma</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">2.3 Información Financiera</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                        <li><strong>Datos bancarios:</strong> Banco, tipo de cuenta, número de cuenta, RUT titular (solo para retiros)</li>
                        <li><strong>Historial de transacciones:</strong> Depósitos, retiros, compras y ventas de UEs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 3. USO DE LA INFORMACIÓN */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">3. USO DE LA INFORMACIÓN</h3>
                  <p className="text-muted-foreground">Utilizamos su información para:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Gestionar su cuenta y verificar su identidad</li>
                    <li>Procesar transacciones de compra, venta y retiro de fondos</li>
                    <li>Enviar notificaciones sobre el estado de sus inversiones</li>
                    <li>Cumplir con obligaciones legales y regulatorias</li>
                    <li>Prevenir fraudes y actividades ilícitas</li>
                    <li>Mejorar nuestros servicios mediante análisis de uso</li>
                    <li>Proporcionar soporte técnico cuando sea necesario</li>
                  </ul>
                </div>

                {/* 4. COMPARTIR INFORMACIÓN */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">4. COMPARTIR INFORMACIÓN</h3>
                  <p className="text-muted-foreground">
                    NO vendemos, alquilamos ni compartimos su información personal con terceros, excepto en los siguientes casos:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li><strong>Proveedores de servicios:</strong> Supabase (base de datos), servicios de pago, verificación de identidad</li>
                    <li><strong>Obligaciones legales:</strong> Cuando sea requerido por ley, orden judicial o autoridad competente</li>
                    <li><strong>Protección de derechos:</strong> Para prevenir fraudes o proteger la seguridad de la plataforma</li>
                    <li><strong>Transferencias empresariales:</strong> En caso de fusión, adquisición o venta de activos</li>
                  </ul>
                </div>

                {/* 5. SEGURIDAD DE DATOS */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">5. SEGURIDAD DE DATOS</h3>
                  <p className="text-muted-foreground">
                    Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Encriptación SSL/TLS en todas las comunicaciones</li>
                    <li>Contraseñas hasheadas con algoritmos seguros</li>
                    <li>Autenticación de dos factores (cuando esté disponible)</li>
                    <li>Acceso restringido solo a personal autorizado</li>
                    <li>Auditorías de seguridad periódicas</li>
                    <li>Respaldos regulares de la información</li>
                  </ul>
                </div>

                {/* 6. RETENCIÓN DE DATOS */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">6. RETENCIÓN DE DATOS</h3>
                  <p className="text-muted-foreground">
                    Conservamos su información mientras su cuenta esté activa y durante el tiempo necesario para:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Cumplir con obligaciones legales (mínimo 5 años según normativa financiera)</li>
                    <li>Resolver disputas y hacer cumplir nuestros acuerdos</li>
                    <li>Prevenir fraudes y abusos</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Puede solicitar la eliminación de su cuenta en cualquier momento, sujeto a requisitos legales de retención.
                  </p>
                </div>

                {/* 7. SUS DERECHOS */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">7. SUS DERECHOS</h3>
                  <p className="text-muted-foreground">Usted tiene derecho a:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Acceder a su información personal almacenada</li>
                    <li>Rectificar datos incorrectos o desactualizados</li>
                    <li>Eliminar su cuenta y datos personales</li>
                    <li>Oponerse al procesamiento de ciertos datos</li>
                    <li>Portar sus datos a otra plataforma</li>
                    <li>Retirar consentimiento en cualquier momento</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Para ejercer estos derechos, contacte a: <a href="mailto:frerautgroups.a@gmail.com" className="text-primary hover:underline">frerautgroups.a@gmail.com</a>
                  </p>
                </div>

                {/* 8. COOKIES */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">8. COOKIES</h3>
                  <p className="text-muted-foreground">Utilizamos cookies para:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Mantener su sesión activa</li>
                    <li>Recordar sus preferencias</li>
                    <li>Analizar el uso de la plataforma</li>
                    <li>Mejorar la seguridad</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad del sitio.
                  </p>
                </div>

                {/* 9. MENORES DE EDAD */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">9. MENORES DE EDAD</h3>
                  <p className="text-muted-foreground">
                    Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos intencionalmente información de menores.
                  </p>
                </div>

                {/* 10. CAMBIOS EN LA POLÍTICA */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">10. CAMBIOS EN LA POLÍTICA</h3>
                  <p className="text-muted-foreground">
                    Nos reservamos el derecho de actualizar esta política. Los cambios significativos serán notificados por correo electrónico o mediante aviso en la plataforma.
                  </p>
                </div>

                {/* 11. CONTACTO */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-primary">11. CONTACTO</h3>
                  <p className="text-muted-foreground">
                    Para preguntas sobre esta política o el manejo de sus datos:
                  </p>
                  <ul className="list-none text-muted-foreground space-y-1 ml-4">
                    <li><strong>Email:</strong> <a href="mailto:frerautgroups.a@gmail.com" className="text-primary hover:underline">frerautgroups.a@gmail.com</a></li>
                    <li><strong>Sitio web:</strong> <a href="https://frerautinvest.com" className="text-primary hover:underline">https://frerautinvest.com</a></li>
                    <li><strong>País:</strong> Chile</li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground">
                    <strong>Freraut Invest</strong> - Invierte con Confianza<br />
                    🌐 <a href="https://frerautinvest.com" className="text-primary hover:underline">frerautinvest.com</a>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



export default Settings;