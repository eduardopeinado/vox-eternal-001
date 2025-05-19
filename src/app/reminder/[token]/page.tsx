"use client";
// NOTA: Esta página es completamente dinámica y no puede ser exportada como HTML estático.
// La ruta /reminder/[token] solo funcionará en modo servidor o como SPA.

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

interface ReminderData {
  id: string;
  title: string | null;
  message: string | null;
  scheduled_delivery_at: string;
  recipient_email: string | null;
  recipient_name: string | null;
  status: string;
  future_reminder_files: { recuerdo_id: string }[];
  capsula_id: string | null;
}

export default function ReminderTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token ? (typeof params.token === "string" ? params.token : params.token[0]) : "";
  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState<ReminderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // 1. Autenticación y fetch de datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // 1.1 Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push(`/login?redirect=/reminder/${token}`);
        return;
      }
      const userEmail = session.user.email;

      // 1.2 Consultar recordatorio por token (usar función edge o API si aplica)
      const { data, error: fetchError } = await supabase
        .from("future_reminders")
        .select(`
          id, title, message, scheduled_delivery_at, recipient_email, recipient_name, status,
          future_reminder_files (recuerdo_id),
          capsula_id
        `)
        .eq("access_token", token)
        .single();

      if (fetchError || !data) {
        setError("No se encontró el recordatorio o el enlace es inválido.");
        setLoading(false);
        return;
      }

      // 1.3 Validar destinatario
      if (data.recipient_email && data.recipient_email !== userEmail) {
        setError("No tienes permiso para acceder a este recordatorio.");
        setLoading(false);
        return;
      }

      setReminder(data);
      setLoading(false);

      // 2. Si la fecha aún no llega, iniciar contador regresivo
      if (data.scheduled_delivery_at && dayjs(data.scheduled_delivery_at).isAfter(dayjs())) {
        const interval = setInterval(() => {
          const now = dayjs();
          const target = dayjs(data.scheduled_delivery_at);
          const diff = target.diff(now);
          if (diff <= 0) {
            setCountdown("");
            clearInterval(interval);
            window.location.reload();
          } else {
            const dur = dayjs.duration(diff);
            setCountdown(
              `${dur.days()}d ${dur.hours()}h ${dur.minutes()}m ${dur.seconds()}s`
            );
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    };
    if (token) fetchData();
    // eslint-disable-next-line
  }, [token]);

  // 3. Render
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
        <p className="text-teal-700">Cargando recordatorio...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center px-4 py-2 bg-teal-400 text-white rounded-md hover:bg-teal-500 transition-colors"
        >
          <ArrowLeft className="mr-2" /> Volver al dashboard
        </button>
      </div>
    );
  }

  // 4. Si la fecha aún no llega, mostrar contador regresivo (permitir status "scheduled" o "available")
  if (
    reminder &&
    dayjs(reminder.scheduled_delivery_at).isAfter(dayjs())
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-azul-profundo mb-4">¡Aún no es tiempo!</h1>
        <p className="mb-2 text-gray-700">Este recuerdo estará disponible en:</p>
        <div className="text-3xl font-mono text-teal-600 mb-6">{countdown}</div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center px-4 py-2 bg-teal-400 text-white rounded-md hover:bg-teal-500 transition-colors"
        >
          <ArrowLeft className="mr-2" /> Volver al dashboard
        </button>
      </div>
    );
  }

  // 5. Si la fecha llegó, transferir propiedad si es necesario y mostrar cápsula
  const [transferStatus, setTransferStatus] = useState<"pending" | "success" | "error" | "already" | null>(null);
  const [transferMsg, setTransferMsg] = useState<string>("");

  useEffect(() => {
    const transferCapsule = async () => {
      if (!reminder) return;
      setTransferStatus("pending");
      setTransferMsg("");
      // Llamar a la función edge para transferir la cápsula
      const { data, error } = await supabase.functions.invoke("accept-future-capsule", {
        body: { reminder_id: reminder.id },
      });
      if (error) {
        setTransferStatus("error");
        setTransferMsg("Error al transferir la cápsula: " + (error.message || "Error desconocido"));
        return;
      }
      if (data?.error) {
        setTransferStatus("error");
        setTransferMsg("Error: " + data.error);
        return;
      }
      if (data?.message?.includes("Ya tienes la cápsula")) {
        setTransferStatus("already");
        setTransferMsg("Esta cápsula ya está en tu dashboard.");
        return;
      }
      setTransferStatus("success");
      setTransferMsg("¡Cápsula transferida correctamente! Ahora puedes verla y gestionarla en tu dashboard.");
    };
    if (reminder) transferCapsule();
    // eslint-disable-next-line
  }, [reminder]);

  if (transferStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
        <p className="text-teal-700">Transfiriendo cápsula a tu dashboard...</p>
      </div>
    );
  }
  if (transferStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-600 font-semibold mb-4">{transferMsg}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center px-4 py-2 bg-teal-400 text-white rounded-md hover:bg-teal-500 transition-colors"
        >
          <ArrowLeft className="mr-2" /> Volver al dashboard
        </button>
      </div>
    );
  }
  // Mostrar éxito o ya transferida
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-azul-profundo mb-4">¡Tu cápsula de tiempo ha sido abierta!</h1>
      <p className="mb-2 text-gray-700">Título: <span className="font-semibold">{reminder?.title || "Sin título"}</span></p>
      <p className="mb-2 text-gray-700">Mensaje: <span className="font-medium">{reminder?.message || "Sin mensaje"}</span></p>
      <div className="my-6">
        <p className="text-sm text-gray-500">Archivos multimedia asociados:</p>
        <ul className="mt-2">
          {reminder?.future_reminder_files?.map((file) => (
            <li key={file.recuerdo_id} className="text-xs text-gray-700">
              Recuerdo ID: {file.recuerdo_id}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <p className="text-green-700 font-semibold">{transferMsg}</p>
      </div>
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center px-4 py-2 bg-teal-400 text-white rounded-md hover:bg-teal-500 transition-colors"
      >
        <ArrowLeft className="mr-2" /> Volver al dashboard
      </button>
    </div>
  );
}
