import React from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

export interface UserFile {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fecha: string;
  [key: string]: any;
}

interface UserFilesModalProps {
  open: boolean;
  userEmail: string;
  files: UserFile[];
  onClose: () => void;
}

export const UserFilesModal: React.FC<UserFilesModalProps> = ({
  open,
  userEmail,
  files,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div>
            <span className="font-semibold">Archivos de:</span>{" "}
            <span className="text-blue-700">{userEmail}</span>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="min-w-[700px]">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left">Nombre</th>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1 text-right">Tamaño (MB)</th>
                  <th className="px-2 py-1 text-left">Fecha</th>
                  {/* Agrega más columnas si es necesario */}
                </tr>
              </thead>
              <tbody>
                {files.length > 0 ? (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1">{file.nombre}</td>
                      <td className="px-2 py-1">{file.tipo}</td>
                      <td className="px-2 py-1 text-right">
                        {(file.tamaño / (1024 * 1024)).toFixed(2)}
                      </td>
                      <td className="px-2 py-1">
                        {file.fecha
                          ? new Date(file.fecha).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4">
                      No hay archivos para este usuario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
