import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Save,
  AlertCircle,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Lock,
  Target,
  Sparkles,
  Users,
  Scroll,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

// StatsCard Component
export const StatsCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
    blue: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
  };

  const iconColorClasses = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${iconColorClasses[color]}`} />
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-slate-400 text-sm">{title}</p>
    </div>
  );
};

// CreateEventModal Component
export const CreateEventModal = ({ show, nuevoEvento, setNuevoEvento, creating, onClose, onCreate }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Plus className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Crear Nuevo Evento</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Evento</label>
              <select
                value={nuevoEvento.tipo}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="bono_corporativo">Bono Corporativo</option>
                <option value="lockup_ues">Oferta de UEs con Lock-up</option>
                <option value="pacto">Pacto de Desarrollo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
              <input
                type="text"
                value={nuevoEvento.titulo}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Bono Freraut Q1 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
              <textarea
                value={nuevoEvento.descripcion}
                onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Descripción del evento..."
              />
            </div>

            {nuevoEvento.tipo === 'bono_corporativo' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Monto Total (CLP)</label>
                    <input
                      type="number"
                      value={nuevoEvento.monto_total}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, monto_total: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tasa Interés (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={nuevoEvento.tasa_interes}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, tasa_interes: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="0.89"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Plazo (días)</label>
                  <input
                    type="number"
                    value={nuevoEvento.plazo_dias}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, plazo_dias: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="30"
                  />
                </div>
              </>
            )}

            {nuevoEvento.tipo === 'lockup_ues' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Descuento (%)</label>
                  <input
                    type="number"
                    value={nuevoEvento.descuento_porcentaje}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, descuento_porcentaje: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lock-up (días)</label>
                  <input
                    type="number"
                    value={nuevoEvento.plazo_lockup_dias}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, plazo_lockup_dias: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="100"
                  />
                </div>
              </div>
            )}

            {nuevoEvento.tipo === 'pacto' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pago Mensual (CLP)</label>
                  <input
                    type="number"
                    value={nuevoEvento.monthly_amount}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, monthly_amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="30000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Conversión a UEs (%)</label>
                  <input
                    type="number"
                    value={nuevoEvento.ue_conversion_percentage}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, ue_conversion_percentage: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onCreate}
              disabled={creating || !nuevoEvento.titulo}
              className={`px-8 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${creating || !nuevoEvento.titulo
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
                }`}
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Crear Evento
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// EventoDetailModal Component
export const EventoDetailModal = ({ 
  show, 
  evento, 
  isAdmin, 
  navActual, 
  canceling, 
  datosUsuario,
  onClose, 
  onCancel, 
  onDelete,
  onParticipate,
  getTipoLabel, 
  getTipoIcon, 
  getTipoColor, 
  calcularProgreso 
}) => {
  if (!show || !evento) return null;

  const TipoIcon = getTipoIcon(evento.tipo);
  const progreso = calcularProgreso(evento);
  const diasRestantes = evento.fecha_vencimiento
    ? Math.ceil((new Date(evento.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
    : evento.plazo_lockup_dias;

  const tieneParticipaciones = evento.participaciones && evento.participaciones.length > 0;
  const puedeEliminar = isAdmin && evento.estado === 'activo' && !tieneParticipaciones;
  const puedeBorrar = isAdmin && evento.estado === 'cancelado';
  const puedeParticipar = !isAdmin && evento.estado === 'activo';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${getTipoColor(evento.tipo)}`}>
                <TipoIcon className="w-6 h-6" />
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoColor(evento.tipo)}`}>
                  {getTipoLabel(evento.tipo)}
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">{evento.titulo}</h2>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)] space-y-6">
            <div className="flex items-center gap-3">
              {evento.estado === 'activo' && (evento.tipo !== 'bono_corporativo' || progreso < 100) && (
                <span className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  Activo
                </span>
              )}
              {evento.tipo === 'bono_corporativo' && progreso >= 100 && (
                <span className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  Completado
                </span>
              )}
              {evento.estado === 'cancelado' && (
                <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold">
                  Cancelado
                </span>
              )}
            </div>

            {!isAdmin && datosUsuario && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-5">
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} />
                  Tu Participación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Monto Invertido</p>
                    <p className="text-lg font-bold text-white">
                      ${datosUsuario.montoInvertido?.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Días Transcurridos</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {datosUsuario.diasTranscurridos} días
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Progreso</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {datosUsuario.progreso?.toFixed(1)}%
                    </p>
                  </div>
                  {datosUsuario.interesGenerado > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Interés Generado</p>
                      <p className="text-lg font-bold text-emerald-400">
                        ${Number(datosUsuario.interesGenerado || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>
                {datosUsuario.progreso > 0 && datosUsuario.progreso < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${datosUsuario.progreso}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {evento.descripcion && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Descripción</h3>
                <p className="text-slate-300">{evento.descripcion}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {evento.tipo === 'bono_corporativo' && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-slate-500" />
                      <span className="text-sm text-slate-400">Monto Total</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      ${parseFloat(evento.monto_total).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-cyan-400" />
                      <span className="text-sm text-slate-400">Tasa de Interés</span>
                    </div>
                    <p className="text-2xl font-bold text-cyan-400">{evento.tasa_interes}%</p>
                    <p className="text-xs text-slate-500">mensual</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={18} className="text-slate-500" />
                      <span className="text-sm text-slate-400">Plazo</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{diasRestantes} días</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-emerald-400" />
                      <span className="text-sm text-slate-400">Captado</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${(evento.monto_captado || 0).toLocaleString('es-CL')}
                    </p>
                  </div>
                </>
              )}

              {evento.tipo === 'lockup_ues' && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-purple-400" />
                      <span className="text-sm text-slate-400">Descuento</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">{evento.descuento_porcentaje}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={18} className="text-slate-500" />
                      <span className="text-sm text-slate-400">Lock-up</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{evento.plazo_lockup_dias} días</p>
                  </div>
                  {navActual > 0 && (
                    <div className="bg-slate-800/50 rounded-lg p-4 col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={18} className="text-slate-500" />
                        <span className="text-sm text-slate-400">Precio con Descuento</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        ${(navActual * (1 - evento.descuento_porcentaje / 100)).toLocaleString('es-CL')}
                      </p>
                      <p className="text-xs text-slate-500">por UE (NAV actual: ${navActual.toLocaleString('es-CL')})</p>
                    </div>
                  )}
                </>
              )}

              {evento.tipo === 'pacto' && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-emerald-400" />
                      <span className="text-sm text-slate-400">Pago Mensual</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${parseFloat(evento.monthly_amount).toLocaleString('es-CL')}
                    </p>
                  </div>
                  {evento.subscription_discount > 0 && (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-emerald-400" />
                        <span className="text-sm text-slate-400">Descuento</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{evento.subscription_discount}%</p>
                    </div>
                  )}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={18} className="text-slate-500" />
                      <span className="text-sm text-slate-400">Conversión a UEs</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{evento.ue_conversion_percentage}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} className="text-slate-500" />
                      <span className="text-sm text-slate-400">Beneficio</span>
                    </div>
                    <p className="text-lg font-bold text-white">Lake AI</p>
                  </div>
                </>
              )}
            </div>

            {evento.tipo === 'bono_corporativo' && evento.monto_total && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400 font-medium">Progreso de captación</span>
                  <span className="text-cyan-400 font-semibold">{progreso.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-300">Participaciones</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {evento.participaciones ? evento.participaciones.length : 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {tieneParticipaciones ? 'usuarios suscritos' : 'sin suscripciones aún'}
              </p>
            </div>

            <div className="text-xs text-slate-500 border-t border-slate-700 pt-4">
              <p>Creado por: {evento.creado_por}</p>
              <p>Fecha de creación: {new Date(evento.fecha_creacion).toLocaleString('es-CL')}</p>
            </div>
          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              Cerrar
            </button>

            <div className="flex items-center gap-3">
              {puedeParticipar && !datosUsuario && (
                <button
                  onClick={onParticipate}
                  className="px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  <Plus size={18} />
                  Participar
                </button>
              )}

              {puedeEliminar && (
                <button
                  onClick={() => onCancel(evento.id, evento.participaciones)}
                  disabled={canceling}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    canceling
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                  }`}
                >
                  {canceling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} />
                      Cancelar Evento
                    </>
                  )}
                </button>
              )}

              {puedeBorrar && (
                <button
                  onClick={() => onDelete(evento.id, evento.participaciones)}
                  disabled={canceling}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    canceling
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  }`}
                >
                  {canceling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Eliminar Permanentemente
                    </>
                  )}
                </button>
              )}

              {isAdmin && !puedeEliminar && !puedeBorrar && tieneParticipaciones && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertCircle size={16} />
                  <span>No se puede cancelar (tiene suscripciones)</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ParticipateModal Component
export const ParticipateModal = ({ show, evento, monto, setMonto, participating, onClose, onParticipate }) => {
  if (!show || !evento) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Participar en Evento</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-slate-300 mb-4">{evento.titulo}</p>

              {evento.tipo === 'pacto' ? (
                // Para pactos: mostrar monto fijo
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Pago Mensual</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ${parseFloat(evento.monthly_amount).toLocaleString('es-CL')}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Monto fijo de suscripción mensual
                  </p>
                </div>
              ) : (
                // Para bonos y lockup: permitir elegir monto
                <>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monto a Invertir (CLP)
                  </label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="100000"
                    min="0"
                  />
                  {evento.tipo === 'bono_corporativo' && evento.tasa_interes && monto && (
                    <p className="text-xs text-slate-400 mt-2">
                      Interés estimado mensual: ${(parseFloat(monto) * (evento.tasa_interes / 100)).toLocaleString('es-CL')}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm mb-1">Advertencia</p>
                  <p className="text-slate-400 text-xs">
                    Al participar aceptas todos los términos y condiciones. Toda inversión conlleva riesgo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onParticipate}
              disabled={participating || (evento.tipo !== 'pacto' && (!monto || parseFloat(monto) <= 0))}
              className={`px-8 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                participating || (evento.tipo !== 'pacto' && (!monto || parseFloat(monto) <= 0))
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
              }`}
            >
              {participating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirmar Participación
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// PoliciesModal Component
export const PoliciesModal = ({ show, hasAcceptedTerms, acceptedAllPolicies, setAcceptedAllPolicies, onClose, onAccept }) => {
  if (!show) return null;

  const declarations = [
    "He leído y comprendido completamente estas políticas",
    "Reconozco expresamente todos los riesgos descritos",
    "Acepto el carácter de oferta privada de los instrumentos",
    "Renuncio a fiscalización regulatoria de CMF sobre estos instrumentos",
    "Realizo la inversión con recursos propios y capacidad económica adecuada"
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Scroll className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Políticas y Términos de Uso - Treasury</h2>
                <p className="text-sm text-slate-400">Freraut Invest SpA | Última actualización: 3 de enero de 2026</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
            <section>
              <h3 className="text-lg font-bold text-cyan-400 mb-2">1. NATURALEZA DEL SERVICIO</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Treasury es una plataforma de eventos financieros privados operada por Freraut Invest SpA, que permite a titulares de cuentas verificadas participar en instrumentos financieros y compromisos de inversión dentro del ecosistema de Freraut Invest. Los servicios ofrecidos no constituyen oferta pública de valores y no están sujetos a fiscalización de la Comisión para el Mercado Financiero (CMF).
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-300 text-sm font-medium">⚠️ Oferta Privada</p>
                <p className="text-slate-400 text-xs mt-1">
                  Todos los eventos publicados en Treasury constituyen ofertas privadas según la Norma de Carácter General N° 336. Las ofertas se dirigen exclusivamente a titulares de cuentas verificadas de Freraut Invest.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-red-400 mb-2">3. RIESGOS Y ADVERTENCIAS</h3>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-300 font-semibold text-sm">Riesgo de Pérdida de Capital</p>
                    <p className="text-slate-400 text-xs">Toda inversión conlleva riesgo de pérdida parcial o total del capital invertido.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-300 font-semibold text-sm">Sin Fiscalización Regulatoria</p>
                    <p className="text-slate-400 text-xs">Los instrumentos no están registrados ni supervisados por la CMF.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
                          <h3 className="text-lg font-bold text-cyan-400 mb-2">4. TIPO DE CAMBIO Y CONVERSIÓN DE DIVISAS</h3>
                                        <p className="text-slate-300 text-sm leading-relaxed mb-3">
                                                        Todas las operaciones en la plataforma se denominan en dólares estadounidenses (USD). Los depósitos realizados en pesos chilenos (CLP) serán convertidos a USD al tipo de cambio determinado por Freraut Invest SpA al momento de la operación.
                                                                      </p>
                                                                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                                                                                                    <p className="text-blue-300 text-sm font-medium">💱 Política de Tipo de Cambio</p>
                                                                                                                    <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                                                                                                                                      <li>El tipo de cambio aplicado es determinado por Freraut Invest SpA y puede diferir del dólar observado publicado por el Banco Central de Chile.</li>
                                                                                                                                                        <li>El tipo de cambio incluye los costos operacionales asociados a la conversión de divisas.</li>
                                                                                                                                                                          <li>El usuario acepta el tipo de cambio mostrado al momento de confirmar cada operación.</li>
                                                                                                                                                                                            <li>Los retiros en CLP se convertirán al tipo de cambio vigente al momento de la solicitud.</li>
                                                                                                                                                                                                            </ul>
                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                      </section>

            {!hasAcceptedTerms && (
              <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-amber-400 mb-4">DECLARACIÓN DE ACEPTACIÓN</h3>
                <p className="text-slate-300 text-sm mb-4">
                  Al participar en cualquier evento de Treasury, usted declara que:
                </p>
                <div className="space-y-3">
                  {declarations.map((declaration, index) => (
                    <label key={index} className="flex items-start gap-3 cursor-pointer group">
                      <div className="mt-0.5">
                        {acceptedAllPolicies ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 group-hover:text-slate-400" />
                        )}
                      </div>
                      <span className="text-slate-300 text-sm">{declaration}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setAcceptedAllPolicies(!acceptedAllPolicies)}
                  className="mt-4 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 font-medium text-sm transition-colors"
                >
                  {acceptedAllPolicies ? '✓ Todas las declaraciones aceptadas' : 'Aceptar todas las declaraciones'}
                </button>
              </section>
            )}
          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/50">
            {hasAcceptedTerms ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle size={20} />
                  <span className="font-medium">Ya has aceptado los términos</span>
                </div>
                <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={onAccept}
                  disabled={!acceptedAllPolicies}
                  className={`px-8 py-2 rounded-lg font-semibold transition-all ${
                    acceptedAllPolicies
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Aceptar y Continuar
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// MisSuscripcionesModal Component - 🔥 NUEVO
export const MisSuscripcionesModal = ({ show, onClose, userId }) => {
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && userId) {
      loadSuscripciones();
    }
  }, [show, userId]);

  const loadSuscripciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vista_mis_suscripciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha_participacion', { ascending: false });

      if (error) throw error;
      setSuscripciones(data || []);
    } catch (err) {
      console.error('Error cargando suscripciones:', err);
      setSuscripciones([]);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Mis Suscripciones</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              </div>
            ) : suscripciones.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">No tienes suscripciones activas</p>
                <p className="text-slate-500 text-sm mt-2">Explora los eventos disponibles en Treasury</p>
              </div>
            ) : (
              <div className="space-y-4">
                {suscripciones.map((sub) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{sub.titulo}</h3>
                        <p className="text-sm text-slate-400">{sub.descripcion}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        sub.estado === 'activo'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {sub.estado === 'activo' ? 'Activo' : 'Completado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Monto Invertido</p>
                        <p className="text-lg font-bold text-white">
                          ${sub.monto_invertido?.toLocaleString('es-CL')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">UEs Recibidas</p>
                        <p className="text-lg font-bold text-cyan-400">
                          {sub.cantidad_ues?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Fecha Participación</p>
                        <p className="text-lg font-bold text-white">
                          {new Date(sub.fecha_participacion).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                      {sub.fecha_desbloqueo && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Desbloqueo</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {new Date(sub.fecha_desbloqueo).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                      )}
                    </div>

                    {sub.interes_acumulado > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-emerald-300">Interés Acumulado</span>
                          <span className="text-lg font-bold text-emerald-400">
                            ${sub.interes_acumulado?.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    )}

                    {sub.esta_bloqueado && sub.dias_restantes_bloqueo > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-amber-400">
                        <Lock size={16} />
                        <span>Bloqueado por {sub.dias_restantes_bloqueo} días más</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800/50">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};