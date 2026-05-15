import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Shield, Users, Search, Plus, Trash2,
  ChevronDown, RefreshCw, CheckCircle, XCircle,
  BarChart2, Calculator, Crown, AlertTriangle,
  Mail, Lock
} from 'lucide-react';

const ADMIN_EMAIL = 'frerautgroups.a@gmail.com';

const ROLES = [
  {
    id: 'gestor_activos',
    label: 'Gestor de Activos',
    desc: 'Acceso al Analista Freraut, portafolio y operaciones.',
    icon: BarChart2,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
    accesos: ['Análisis ★', 'Portafolio', 'Mercado', 'Lake AI'],
  },
  {
    id: 'contador',
    label: 'Contador',
    desc: 'Acceso a reportes financieros y tesorería.',
    icon: Calculator,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
    accesos: ['Reportes', 'Tesorería', 'Historial'],
  },
  {
    id: 'co_administrador',
    label: 'Co-Administrador',
    desc: 'Acceso completo excepto gestión de roles.',
    icon: Crown,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
    accesos: ['Análisis ★', 'Pool', 'Retiros', 'Tesorería', 'Todo excepto Roles'],
  },
];

function RolBadge({ rolId, small = false }) {
  const r = ROLES.find(x => x.id === rolId);
  if (!r) return <span style={{fontSize:small?9:11,color:'#64748b',fontStyle:'italic'}}>{rolId}</span>;
  const Icon = r.icon;
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:small?3:5,
      padding:small?'2px 7px':'4px 10px',borderRadius:20,
      fontSize:small?9:11,fontWeight:700,
      color:r.color,background:r.bg,border:`1px solid ${r.border}`,
    }}>
      <Icon style={{width:small?9:11,height:small?9:11}}/>
      {r.label}
    </span>
  );
}

export default function GestionRoles({ onBack }) {
  const { session } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [asignando, setAsignando] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null); // usuario_id con dropdown abierto

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar usuarios (excluyendo admin)
      const { data: usrsRaw, error: e1 } = await supabase
        .from('usuarios')
        .select('id, email, nombre, fecha_registro')
        .order('fecha_registro', { ascending: false });
      // Filtrar admin en el cliente para evitar problemas de encoding en URL
      const usrs = (usrsRaw || []).filter(u => u.email !== ADMIN_EMAIL);

      if (e1) throw new Error('Error cargando usuarios: ' + e1.message);

      // Cargar roles existentes
      const { data: rls, error: e2 } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (e2) throw new Error('Error cargando roles: ' + e2.message);

      setUsuarios(usrs || []);
      setRoles(rls || []);
    } catch (e) {
      showToast('Error cargando datos: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = () => setDropdownOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const asignarRol = async (usuario, rolId) => {
    const yaExiste = roles.find(r => r.usuario_id === usuario.id && r.role === rolId);
    if (yaExiste) {
      showToast(`${usuario.email} ya tiene el rol "${rolId}"`, 'info');
      return;
    }
    setAsignando(usuario.id + '_' + rolId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ usuario_id: usuario.id, role: rolId });
      if (error) throw error;
      showToast(`✓ Rol asignado: ${ROLES.find(r=>r.id===rolId)?.label || rolId} → ${usuario.email}`);
      await load();
    } catch (e) {
      showToast('Error al asignar rol: ' + e.message, 'error');
    } finally {
      setAsignando(null);
    }
  };

  const revocarRol = async (rolRecord) => {
    setAsignando(rolRecord.usuario_id + '_delete');
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', rolRecord.id);
      if (error) throw error;
      showToast('Rol revocado correctamente');
      setConfirmDelete(null);
      await load();
    } catch (e) {
      showToast('Error al revocar rol: ' + e.message, 'error');
    } finally {
      setAsignando(null);
    }
  };

  const rolesDeUsuario = (userId) => roles.filter(r => r.usuario_id === userId);

  const usuariosFiltrados = usuarios.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    (u.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Pantalla de acceso restringido ──
  if (!isAdmin) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16,textAlign:'center',padding:'0 20px'}}>
        <div style={{padding:20,borderRadius:20,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
          <Lock style={{width:40,height:40,color:'#f87171'}}/>
        </div>
        <div style={{fontSize:22,fontWeight:800,color:'#f87171'}}>Acceso Restringido</div>
        <div style={{fontSize:13,color:'#64748b',maxWidth:360,lineHeight:1.6}}>
          Esta sección es exclusiva para la cuenta institucional de Freraut Invest.
        </div>
        {onBack && (
          <button onClick={onBack} style={{marginTop:8,padding:'10px 24px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',cursor:'pointer',fontSize:13,fontWeight:600}}>
            ← Volver al dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{padding:'24px 20px 48px',maxWidth:960,margin:'0 auto'}}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            style={{
              position:'fixed',top:20,right:20,zIndex:9999,
              padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:600,
              background:toast.type==='error'?'rgba(239,68,68,0.95)':toast.type==='info'?'rgba(56,189,248,0.95)':'rgba(16,185,129,0.95)',
              color:'white',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
              display:'flex',alignItems:'center',gap:8,
            }}>
            {toast.type==='error'?<XCircle style={{width:15,height:15}}/>:<CheckCircle style={{width:15,height:15}}/>}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal confirmación revocación */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:8888,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <motion.div initial={{scale:0.92}} animate={{scale:1}}
              style={{background:'#0a1628',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:'28px 32px',maxWidth:400,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <AlertTriangle style={{width:22,height:22,color:'#f87171'}}/>
                <span style={{fontSize:16,fontWeight:800,color:'white'}}>Revocar rol</span>
              </div>
              <div style={{fontSize:13,color:'#94a3b8',lineHeight:1.6,marginBottom:20}}>
                ¿Revocar <RolBadge rolId={confirmDelete.role} small/> a este usuario? El acceso se elimina inmediatamente.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',cursor:'pointer',fontSize:13,fontWeight:600}}>Cancelar</button>
                <button onClick={()=>revocarRol(confirmDelete)} disabled={!!asignando} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',cursor:'pointer',fontSize:13,fontWeight:700}}>
                  {asignando?'Revocando...':' Revocar acceso'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{padding:12,borderRadius:16,background:'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(99,102,241,0.1))',border:'1px solid rgba(56,189,248,0.2)'}}>
            <Shield style={{width:24,height:24,color:'#38bdf8'}}/>
          </div>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:'white',letterSpacing:'-0.02em'}}>Gestión de Roles</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Accesos institucionales · Freraut Invest</div>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#64748b',cursor:'pointer',fontSize:12,fontWeight:600}}>
          <RefreshCw style={{width:13,height:13,animation:loading?'spin 1s linear infinite':'none'}}/>
          Actualizar
        </button>
      </div>

      {/* Tarjetas resumen de roles */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:28}}>
        {ROLES.map(r => {
          const Icon = r.icon;
          const count = roles.filter(x => x.role === r.id).length;
          return (
            <div key={r.id} style={{padding:'14px 16px',borderRadius:14,background:r.bg,border:`1px solid ${r.border}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <Icon style={{width:15,height:15,color:r.color}}/>
                  <span style={{fontSize:12,fontWeight:800,color:r.color}}>{r.label}</span>
                </div>
                <span style={{fontSize:22,fontWeight:900,color:r.color,fontFamily:'monospace'}}>{count}</span>
              </div>
              <div style={{fontSize:11,color:'#64748b',lineHeight:1.4,marginBottom:8}}>{r.desc}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {r.accesos.map(a=>(
                  <span key={a} style={{padding:'2px 6px',borderRadius:5,fontSize:9,fontWeight:700,background:'rgba(255,255,255,0.04)',color:'#475569',border:'1px solid rgba(255,255,255,0.06)'}}>{a}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Buscador */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
        <Search style={{width:14,height:14,color:'#475569',flexShrink:0}}/>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar accionista por email o nombre..."
          style={{flex:1,background:'transparent',border:'none',outline:'none',color:'white',fontSize:13,fontFamily:'monospace'}}
        />
        <span style={{fontSize:11,color:'#334155',fontFamily:'monospace'}}>{usuariosFiltrados.length} usuarios</span>
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:10}}>
          <RefreshCw style={{width:18,height:18,color:'#38bdf8',animation:'spin 1s linear infinite'}}/>
          <span style={{color:'#64748b',fontSize:13}}>Cargando accionistas...</span>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div style={{textAlign:'center',padding:'50px 0',color:'#334155',fontSize:13}}>
          {search ? `Sin resultados para "${search}"` : 'No hay accionistas registrados'}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {usuariosFiltrados.map(usuario => {
            const misRoles = rolesDeUsuario(usuario.id);
            const procesando = asignando?.startsWith(usuario.id);
            const rolesDisponibles = ROLES.filter(r => !misRoles.find(mr => mr.role === r.id));
            const isDropOpen = dropdownOpen === usuario.id;

            return (
              <motion.div key={usuario.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                style={{
                  padding:'14px 18px',borderRadius:14,
                  background:'rgba(255,255,255,0.03)',
                  border:`1px solid ${misRoles.length>0?'rgba(56,189,248,0.12)':'rgba(255,255,255,0.06)'}`,
                  transition:'border 0.2s',
                }}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>

                  {/* Info usuario */}
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#38bdf8',flexShrink:0}}>
                      {(usuario.nombre||usuario.email||'?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'white',marginBottom:1}}>
                        {usuario.nombre && usuario.nombre !== usuario.email ? usuario.nombre : 'Sin nombre'}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <Mail style={{width:10,height:10,color:'#475569'}}/>
                        <span style={{fontSize:11,color:'#475569',fontFamily:'monospace'}}>{usuario.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Roles + acciones */}
                  <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>

                    {/* Roles actuales con botón de revocar */}
                    {misRoles.length > 0 && (
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        {misRoles.map(r => (
                          <div key={r.id} style={{display:'flex',alignItems:'center',gap:4}}>
                            <RolBadge rolId={r.role} small/>
                            <button
                              onClick={() => setConfirmDelete(r)}
                              disabled={procesando}
                              style={{padding:'2px 5px',borderRadius:5,border:'none',background:'rgba(239,68,68,0.1)',cursor:'pointer',display:'flex',alignItems:'center'}}>
                              <Trash2 style={{width:9,height:9,color:'#f87171'}}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dropdown para asignar rol */}
                    {rolesDisponibles.length > 0 && (
                      <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
                        <button
                          onClick={() => setDropdownOpen(isDropOpen ? null : usuario.id)}
                          disabled={procesando}
                          style={{
                            display:'flex',alignItems:'center',gap:5,
                            padding:'5px 12px',borderRadius:9,
                            background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',
                            color:'#38bdf8',cursor:'pointer',fontSize:11,fontWeight:700,
                          }}>
                          {procesando
                            ? <RefreshCw style={{width:11,height:11,animation:'spin 1s linear infinite'}}/>
                            : <Plus style={{width:11,height:11}}/>
                          }
                          Asignar rol
                          <ChevronDown style={{width:10,height:10}}/>
                        </button>

                        <AnimatePresence>
                          {isDropOpen && (
                            <motion.div
                              initial={{opacity:0,y:-6,scale:0.96}}
                              animate={{opacity:1,y:0,scale:1}}
                              exit={{opacity:0,y:-6,scale:0.96}}
                              transition={{duration:0.15}}
                              style={{
                                position:'absolute',top:'calc(100% + 6px)',right:0,
                                background:'#0d1a2e',border:'1px solid rgba(56,189,248,0.15)',
                                borderRadius:12,overflow:'hidden',zIndex:100,
                                boxShadow:'0 16px 40px rgba(0,0,0,0.5)',minWidth:220,
                              }}>
                              {rolesDisponibles.map(r => {
                                const Icon = r.icon;
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => { asignarRol(usuario, r.id); setDropdownOpen(null); }}
                                    style={{
                                      width:'100%',display:'flex',alignItems:'center',gap:10,
                                      padding:'10px 14px',border:'none',background:'transparent',
                                      cursor:'pointer',textAlign:'left',transition:'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = r.bg}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{padding:6,borderRadius:8,background:r.bg,border:`1px solid ${r.border}`}}>
                                      <Icon style={{width:12,height:12,color:r.color}}/>
                                    </div>
                                    <div>
                                      <div style={{fontSize:12,fontWeight:700,color:r.color}}>{r.label}</div>
                                      <div style={{fontSize:10,color:'#475569',lineHeight:1.3}}>{r.desc.slice(0,55)}...</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {rolesDisponibles.length === 0 && (
                      <span style={{fontSize:10,color:'#334155',fontStyle:'italic'}}>Todos los roles asignados</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}