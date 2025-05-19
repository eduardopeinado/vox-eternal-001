"use client";
import React, { useState } from "react";
import { SubscriptionsTable, SubscriptionUser } from "@/components/dashboard/SubscriptionsTable";
import { UserFilesModal, UserFile } from "@/components/dashboard/UserFilesModal";

// TODO: Reemplazar por fetch real desde la API o props SSR
const MOCK_USERS: SubscriptionUser[] = [
  {
    id: "1",
    email: "usuario1@ejemplo.com",
    plan: "Premium",
    status: "active",
    startDate: "2024-01-01",
    endDate: "",
  },
  {
    id: "2",
    email: "usuario2@ejemplo.com",
    plan: "Gratis",
    status: "free",
    startDate: "2024-02-01",
    endDate: "",
  },
];

const MOCK_FILES: UserFile[] = [
  {
    id: "f1",
    nombre: "audio1.mp3",
    tipo: "audio",
    tamaño: 10485760,
    fecha: "2024-04-01T10:00:00Z",
  },
  {
    id: "f2",
    nombre: "foto1.jpg",
    tipo: "foto",
    tamaño: 2097152,
    fecha: "2024-04-02T12:00:00Z",
  },
];

export default function SubscriptionsSection() {
  const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Simulación: al abrir modal, cargar archivos del usuario
  const handleViewFiles = (user: SubscriptionUser) => {
    setSelectedUser(user);
    // TODO: Reemplazar por fetch real a la API usando user.id
    setFiles(MOCK_FILES);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setFiles([]);
  };

  return (
    <section className="my-8">
      <h2 className="text-xl font-semibold mb-4">Suscripciones y usuarios</h2>
      <SubscriptionsTable users={MOCK_USERS} onViewFiles={handleViewFiles} />
      <UserFilesModal
        open={modalOpen}
        userEmail={selectedUser?.email || ""}
        files={files}
        onClose={handleCloseModal}
      />
    </section>
  );
}
