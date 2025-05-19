'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, X, Mail, MessageSquare, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react'; // Corrected import: Use named export QRCodeCanvas
import { toast } from 'sonner';

interface ShareModalProps {
  capsuleId: string;
  capsuleTitle: string;
  onClose: () => void;
}

export default function ShareModal({ capsuleId, capsuleTitle, onClose }: ShareModalProps) {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate share link when token is available
    if (shareToken) {
      // Construct the link based on your app's domain structure
      const link = `${window.location.origin}/join/${shareToken}`;
      setShareLink(link);
    } else {
      setShareLink(null);
    }
  }, [shareToken]);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setError(null);
    setShareToken(null); // Reset previous token/link
    setCopied(false);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No estás autenticado.');
      }

      const { data, error: functionError } = await supabase.functions.invoke('create-invitation', {
        body: {
          capsule_id: capsuleId,
          invitee_email: inviteeEmail || undefined, // Send undefined if empty
          message: message || undefined, // Send undefined if empty
        },
      });

      if (functionError) {
        console.error('Function invoke error:', functionError);
        // Try to parse Supabase function error details if available
        let errMsg = functionError.message;
        if (functionError.context && typeof functionError.context.error === 'string') {
            errMsg = functionError.context.error;
        } else if (typeof data?.error === 'string') { // Check if the function returned an error object
            errMsg = data.error;
        }
        throw new Error(errMsg || 'Error al generar el enlace para compartir.');
      }

      if (!data?.share_token) {
        throw new Error('No se recibió el token para compartir desde la función.');
      }

      setShareToken(data.share_token);
      toast.success('¡Enlace para compartir generado!');

    } catch (err: any) {
      console.error('Error generating share link:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      toast.error(err.message || 'Error al generar enlace.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy link:', err);
      toast.error('No se pudo copiar el enlace');
    });
  };

  // Prevent clicks inside the modal from closing it
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close when clicking the backdrop
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
        onClick={handleModalContentClick} // Stop propagation here
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold font-serif text-azul-profundo mb-4">
          Compartir Cápsula: <span className="font-normal">{capsuleTitle}</span>
        </h2>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {!shareLink ? (
          <>
            <p className="text-sm text-gris-calido mb-4">
              Genera un enlace único para invitar a otros a ver y contribuir a esta cápsula. Opcionalmente, puedes enviar una invitación por correo.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="inviteeEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo del invitado (Opcional)
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    id="inviteeEmail"
                    value={inviteeEmail}
                    onChange={(e) => setInviteeEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dorado-claro focus:border-dorado-claro text-sm"
                    disabled={isLoading}
                  />
                </div>
                 <p className="text-xs text-gray-500 mt-1">Si proporcionas un correo, se enviará una invitación (función pendiente).</p>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje (Opcional)
                </label>
                <div className="relative">
                   <MessageSquare size={16} className="absolute left-3 top-3 text-gray-400" />
                   <textarea
                     id="message"
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                     placeholder="Un mensaje corto para tu invitado..."
                     rows={3}
                     className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dorado-claro focus:border-dorado-claro text-sm resize-none"
                     disabled={isLoading}
                   />
                </div>
                <p className="text-xs text-gray-500 mt-1">Este mensaje será visible para cualquiera que reciba el enlace de invitación.</p>
              </div>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={isLoading}
              className={`w-full flex justify-center items-center px-4 py-2 bg-dorado-claro text-azul-profundo font-semibold rounded-md shadow hover:bg-yellow-500 transition duration-150 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Generando...
                </>
              ) : (
                'Generar Enlace para Compartir'
              )}
            </button>
          </>
        ) : (
          // Display Link and QR Code
          <div className="space-y-4">
             <p className="text-sm text-gris-calido">¡Enlace generado! Compártelo con quien quieras invitar.</p>
            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded border border-gray-200">
              <LinkIcon size={16} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-grow bg-transparent text-sm text-gray-700 focus:outline-none"
              />
              <button
                onClick={handleCopyToClipboard}
                className="p-1 text-gray-500 hover:text-azul-profundo"
                title="Copiar enlace"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
             <div className="flex justify-center items-center flex-col">
               <p className="text-sm text-gris-calido mb-2">o escanea el código QR:</p>
               <div className="p-2 bg-white border border-gray-300 rounded-md inline-block">
                  <QRCodeCanvas value={shareLink} size={160} level="M" /> {/* Corrected component usage */}
               </div>
             </div>
              <button
               onClick={() => { setShareToken(null); setInviteeEmail(''); setMessage(''); }} // Reset to generate a new link
               className="w-full text-sm text-center text-azul-profundo hover:underline mt-4"
             >
               Generar un nuevo enlace
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
