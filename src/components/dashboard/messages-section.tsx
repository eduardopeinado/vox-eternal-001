'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Loader2,
  Eye,
  Bell,
  Inbox,
  Image as ImageIcon,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { Tab } from '@headlessui/react';
import type { CapsulaData } from '@/app/dashboard/page';
import { getStoragePublicUrl } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface MessagesSectionProps {
  hiddenCapsules: CapsulaData[];
  isLoading: boolean;
  onCapsuleUnhidden?: () => void;
  onCapsuleClick: (id: string) => void;
}

interface Notification {
  id: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
  metadata?: { capsula_id?: string };
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const MessagesSection: React.FC<MessagesSectionProps> = ({
  hiddenCapsules,
  isLoading: isLoadingHiddenCapsules,
  onCapsuleUnhidden,
  onCapsuleClick,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [errorNotifications, setErrorNotifications] = useState<string | null>(null);

  /* ---------- Carga de notificaciones ---------- */
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    setErrorNotifications(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      const { data, error } = await supabase
        .from('notificaciones')
        .select('id, mensaje, leida, fecha_creacion, metadata')
        .eq('usuario_id', user.id)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      setErrorNotifications(`Error al cargar notificaciones: ${error.message}`);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, onCapsuleUnhidden]);

  /* ---------- Marcar leídas ---------- */
  const handleMarkAsRead = async (id: string) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
      if (error) throw error;
    } catch {
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, leida: false } : n)));
      toast.error('Error al marcar notificación como leída.');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.leida).map((n) => n.id);
    if (unread.length === 0) return;
    setNotifications((p) => p.map((n) => ({ ...n, leida: true })));
    try {
      const { error } = await supabase.from('notificaciones').update({ leida: true }).in('id', unread);
      if (error) throw error;
      toast.success('Todas las notificaciones marcadas como leídas.');
    } catch {
      setNotifications((p) => p.map((n) => (unread.includes(n.id) ? { ...n, leida: false } : n)));
      toast.error('Error al marcar todas como leídas.');
    }
  };

  /* ---------- Mostrar / eliminar cápsula ---------- */
  const handleUnhideCapsule = async (capsuleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Error de autenticación.');
    try {
      await supabase
        .from('capsule_contributors')
        .update({ is_visible: true })
        .eq('user_id', user.id)
        .eq('capsule_id', capsuleId);
      toast.success('Cápsula restaurada.');
      onCapsuleUnhidden?.();
    } catch (e: any) {
      toast.error(`Error al mostrar: ${e.message}`);
    }
  };

  const handleDeleteContribution = async (capsuleId: string, title: string) => {
    if (
      !window.confirm(
        `Si eliminas tu acceso a la cápsula "${title}", ya no podrás verla ni recibir actualizaciones.\n\n¿Seguro?`,
      )
    )
      return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Error de autenticación.');
    try {
      await supabase.from('capsule_contributors').delete().match({ user_id: user.id, capsule_id: capsuleId });
      toast.success(`Acceso a "${title}" eliminado.`);
      onCapsuleUnhidden?.();
    } catch (e: any) {
      toast.error(`Error al eliminar acceso: ${e.message}`);
    }
  };

  /* ================== UI ================== */
  return (
    <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full min-h-0 max-h-[433px] overflow-hidden">
      {/* ---------- TÍTULO ---------- */}
      <h2 className="text-xl font-semibold font-serif text-azul-profundo mb-3 sticky top-0 z-40 bg-white border-b border-gray-200">
        Mensajes
      </h2>

      <Tab.Group defaultIndex={0} className="flex-1 min-h-0 flex flex-col">
        {/* ---------- BARRA SUPERIOR (pestañas + botón) ---------- */}
        <div className="sticky top-[3rem] z-30 bg-white border-b border-gray-200">
          <Tab.List className="flex space-x-1 rounded-xl p-1">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2 px-1 text-sm font-medium leading-5 focus:outline-none',
                  selected
                    ? 'bg-white text-azul-profundo shadow'
                    : 'text-blue-100 hover:bg-white/50 hover:text-white',
                )
              }
            >
              <div className="flex items-center justify-center">
                <Bell size={16} className="mr-1" /> Notificaciones
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2 px-1 text-sm font-medium leading-5 focus:outline-none',
                  selected
                    ? 'bg-white text-azul-profundo shadow'
                    : 'text-blue-100 hover:bg-white/50 hover:text-white',
                )
              }
            >
              <div className="flex items-center justify-center">
                <Eye size={16} className="mr-1" /> Cápsulas Ocultas
              </div>
            </Tab>
          </Tab.List>

          <div className="flex justify-end p-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={notifications.every((n) => n.leida)}
              className="flex items-center text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCheck size={14} className="mr-1" /> Marcar todas como leídas
            </button>
          </div>
        </div>

        <Tab.Panels className="flex-1 min-h-0 overflow-y-auto">
          {/* ---------- NOTIFICACIONES ---------- */}
          <Tab.Panel className="flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 px-3 pb-3 pt-[2rem]">
              {loadingNotifications && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-azul-profundo" />
                </div>
              )}

              {errorNotifications && !loadingNotifications && (
                <div className="flex flex-col items-center justify-center text-red-600 h-full">
                  <Inbox size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Error al cargar</p>
                  <p className="text-xs mt-1">{errorNotifications}</p>
                  <button onClick={fetchNotifications} className="mt-2 text-xs underline">
                    Reintentar
                  </button>
                </div>
              )}

              {!loadingNotifications && !errorNotifications && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center text-gray-500 h-full">
                  <Inbox size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No hay notificaciones nuevas.</p>
                </div>
              )}

              {!loadingNotifications && !errorNotifications && notifications.length > 0 && (
                <ul className="space-y-2 mt-0">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`p-3 rounded-md border ${
                        n.leida ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-blue-50 border-blue-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p
                          className={`text-sm ${
                            n.leida ? 'text-gray-600' : 'text-gray-800'
                          } break-words max-w-[220px] md:max-w-[320px] lg:max-w-[360px]`}
                        >
                          {n.mensaje}
                        </p>
                        {!n.leida && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="ml-2 flex-shrink-0 text-xs text-blue-500 hover:text-blue-700"
                            title="Marcar como leída"
                          >
                            Marcar leída
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.fecha_creacion), { addSuffix: true, locale: es })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Tab.Panel>

          {/* ---------- CÁPSULAS OCULTAS ---------- */}
          <Tab.Panel className="flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 px-3 pb-3">
              {isLoadingHiddenCapsules && hiddenCapsules.length === 0 && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-azul-profundo" />
                </div>
              )}

              {!isLoadingHiddenCapsules && hiddenCapsules.length === 0 && (
                <div className="flex flex-col items-center justify-center text-gray-500 h-full">
                  <Eye size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No tienes cápsulas ocultas.</p>
                </div>
              )}

              {!isLoadingHiddenCapsules && hiddenCapsules.length > 0 && (
                <ul className="space-y-2">
                  {hiddenCapsules.map((c) => {
                    const thumb = c.portada_url ? getStoragePublicUrl('capsules', c.portada_url) : null;
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between p-2 border border-gray-100 rounded-md bg-gray-50/50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-grow min-w-0 mr-2">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm text-gray-800 truncate" title={c.titulo}>
                            {c.titulo || 'Cápsula sin título'}
                          </span>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnhideCapsule(c.id);
                            }}
                            className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium"
                          >
                            <Eye size={14} className="mr-1" /> Mostrar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContribution(c.id, c.titulo || 'Cápsula sin título');
                            }}
                            className="flex items-center px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
                          >
                            <Trash2 size={14} className="mr-1" /> Eliminar Acceso
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </section>
  );
};

export default MessagesSection;
