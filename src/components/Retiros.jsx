import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  CreditCard,
  User,
  Calendar,
  FileText,
  AlertTriangle
} from 'lucide-react';

const Retiros = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const adminEmail = 'frerautgroups.a@gmail.com';
      if (user.email === adminEmail) {
        setIsAdmin(true);
        fetchRequests();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Paso 1: Obtener transacciones
      const { data: transacciones, error: transError } = await supabase
        .from('transacciones_fiat')
        .select('*')
        .eq('tipo', 'retiro')
        .order('fecha_creacion', { ascending: false });

      if (transError) throw transError;

      // Paso 2: Obtener usuarios únicos
      if (transacciones && transacciones.length > 0) {
        const usuarioIds = [...new Set(transacciones.map(t => t.usuario_id))];

        const { data: usuariosData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, email, rut')
          .in('id', usuarioIds);

        if (usersError) throw usersError;

        // Paso 3: Combinar datos
        const dataWithUsers = transacciones.map(transaccion => ({
          ...transaccion,
          usuarios: usuariosData?.find(u => u.id === transaccion.usuario_id) || null
        }));

        setRequests(dataWithUsers);
      } else {
        setRequests([]);
      }

    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudieron cargar las solicitudes de retiro',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedRequest) return;

    try {
      const updatedMetadata = {
        ...selectedRequest.metadata,
        admin_note: actionNote,
        processed_at: new Date().toISOString(),
        processed_by: user.email
      };

      const { error } = await supabase
        .from('transacciones_fiat')
        .update({
          estado: newStatus,
          metadata: updatedMetadata,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: newStatus === 'completado' ? '✅ Retiro Aprobado' : '❌ Retiro Rechazado',
        description: `La solicitud ha sido marcada como ${newStatus}`,
      });

      setShowDetailModal(false);
      setActionNote('');
      fetchRequests();

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudo actualizar el estado de la solicitud. Verifique los permisos o el estado.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completado': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'rechazado': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pendiente': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completado': return CheckCircle;
      case 'rechazado': return XCircle;
      case 'pendiente': return Clock;
      default: return AlertTriangle;
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.estado === filter;
  });

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-slate-950 text-slate-100">
        <div className="bg-red-500/10 border border-red-500/20 rounded-full p-6 mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Acceso Restringido</h1>
        <p className="text-slate-400 max-w-md">
          Esta página está reservada exclusivamente para administradores institucionales.
        </p>
        <button
          onClick={onBack}
          className="mt-8 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-cyan-400 group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              Gestión de Retiros
            </h1>
            <p className="text-slate-400">Administración de solicitudes de retiro de fondos</p>
          </div>
        </div>

        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          {['all', 'pendiente', 'completado', 'rechazado'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center backdrop-blur-sm">
          <div className="bg-slate-800/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Filter className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay solicitudes</h3>
          <p className="text-slate-500">No se encontraron retiros con el filtro seleccionado.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((req) => {
            const StatusIcon = getStatusIcon(req.estado);
            const metadata = req.metadata || {};

            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setSelectedRequest(req);
                  setShowDetailModal(true);
                }}
                className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl p-6 backdrop-blur-sm transition-all cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* Info Principal */}
                  <div className="flex gap-4">
                    <div className="mt-1">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg">
                        {req.usuarios?.nombre?.charAt(0) || '?'}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {req.usuarios?.nombre || 'Usuario Desconocido'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                        <span className="font-mono">{req.usuarios?.email || 'N/A'}</span>
                        {req.usuarios?.rut && (
                          <>
                            <span>•</span>
                            <span>{req.usuarios.rut}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(req.fecha_creacion).toLocaleString('es-CL')}
                      </div>
                    </div>
                  </div>

                  {/* Monto y Estado */}
                  <div className="flex flex-col md:items-end justify-center gap-2">
                    <div className="text-2xl font-bold text-white font-mono">
                      ${Number(req.monto_clp).toLocaleString('es-CL')}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.estado)}`}>
                      <StatusIcon className="w-3 h-3" />
                      {req.estado.toUpperCase()}
                    </div>
                  </div>

                  {/* Detalles Banco Mini */}
                  <div className="hidden md:flex flex-col justify-center border-l border-slate-800 pl-6 min-w-[200px]">
                    <div className="text-sm text-slate-300 font-medium mb-1 flex items-center gap-2">
                      <CreditCard className="w-3 h-3 text-slate-500" />
                      {metadata.banco || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {metadata.tipo_cuenta} ••• {metadata.numero_cuenta?.slice(-4)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end md:justify-center">
                    <ChevronRight className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Detalle de Solicitud</h2>
                  <p className="text-slate-400 text-sm font-mono">ID: {selectedRequest.id}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-8">

                {/* Amount Section */}
                <div className="flex items-center justify-between bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Monto Solicitado</p>
                    <p className="text-3xl font-bold text-white font-mono">
                      ${Number(selectedRequest.monto_clp).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border ${getStatusColor(selectedRequest.estado)}`}>
                    {(() => {
                      const Icon = getStatusIcon(selectedRequest.estado);
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {selectedRequest.estado.toUpperCase()}
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Información del Usuario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 mb-1">Nombre Registrado</p>
                      <p className="font-medium text-slate-200">{selectedRequest.usuarios?.nombre || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="font-medium text-slate-200">{selectedRequest.usuarios?.email || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 mb-1">RUT Registrado</p>
                      <p className="font-medium text-slate-200">{selectedRequest.usuarios?.rut || 'No registrado'}</p>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Datos Bancarios para Transferencia
                  </h3>
                  <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                      <div className="p-4">
                        <p className="text-xs text-slate-500 mb-1">Banco</p>
                        <p className="font-medium text-white">{selectedRequest.metadata?.banco}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-500 mb-1">Tipo de Cuenta</p>
                        <p className="font-medium text-white capitalize">{selectedRequest.metadata?.tipo_cuenta}</p>
                      </div>
                      <div className="p-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Número de Cuenta</p>
                        <p className="font-medium text-white font-mono">{selectedRequest.metadata?.numero_cuenta}</p>
                      </div>
                      <div className="p-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">RUT Titular</p>
                        <p className="font-medium text-white">{selectedRequest.metadata?.rut_titular}</p>
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-800 bg-slate-800/50">
                      <p className="text-xs text-slate-500 mb-1">Nombre Titular</p>
                      <p className="font-medium text-white">{selectedRequest.metadata?.nombre_titular}</p>
                    </div>
                    <div className="p-4 border-t border-slate-800 bg-slate-800/50">
                      <p className="text-xs text-slate-500 mb-1">Email Confirmación</p>
                      <p className="font-medium text-white">{selectedRequest.metadata?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Actions Section - Only for pending requests */}
                {selectedRequest.estado === 'pendiente' && (
                  <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Acciones
                    </h3>

                    <textarea
                      placeholder="Añadir nota o código de transferencia (opcional)..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all mb-4 outline-none"
                      rows={3}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleStatusUpdate('rechazado')}
                        className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Rechazar Solicitud
                      </button>
                      <button
                        onClick={() => handleStatusUpdate('completado')}
                        className="py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Marcar Completado
                      </button>
                    </div>
                  </div>
                )}

                {/* History/Notes for non-pending */}
                {selectedRequest.estado !== 'pendiente' && selectedRequest.metadata?.admin_note && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Nota del Administrador:</p>
                    <p className="text-sm text-slate-300 italic">"{selectedRequest.metadata.admin_note}"</p>
                    <div className="mt-2 text-xs text-slate-500 text-right">
                      Procesado por: {selectedRequest.metadata.processed_by}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Retiros;