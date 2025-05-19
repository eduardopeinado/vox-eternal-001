"use client";

import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Loader2, AlertCircle, Mail, Lock, LogIn, UserPlus, Chrome, CheckSquare, Square, X, Check } from 'lucide-react';
import Link from 'next/link'; // Importar Link
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation'; // <-- Importar useRouter y useSearchParams

// Helper function to validate redirect path
const isValidRedirect = (path: string | null): boolean => {
  return !!path && path.startsWith('/') && !path.includes('//') && !path.includes(':');
};

// Componente Modal simple
const Modal = ({
  isOpen, 
  onClose, 
  title, 
  src, 
  step, // 'privacidad' | 'terminos' | null
  onAccept // Callback a llamar al aceptar el paso actual
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  src: string; 
  step: 'privacidad' | 'terminos' | null;
  onAccept: () => void;
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
       if (event.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    else window.removeEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const acceptButtonText = step === 'privacidad' 
    ? "He leído y acepto la Política de Privacidad" 
    : "He leído y acepto los Términos del Servicio";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" // Aumentar altura
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 id="modal-title" className="text-xl font-semibold font-serif text-azul-profundo">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar modal" className="p-1 rounded-full hover:bg-gray-200 text-gris-calido hover:text-azul-profundo transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Contenedor del Iframe con más altura */}
        <div className="flex-grow overflow-y-auto mb-4">
          <iframe src={src} title={title} className="w-full h-[65vh] border-0" />
        </div>
        {/* Botón de Aceptar (solo si estamos en el flujo) */}
        {step && (
          <div className="pt-4 border-t text-right">
            <button 
              onClick={onAccept} 
              className="bg-dorado-claro text-azul-profundo font-semibold py-2 px-5 rounded-md hover:bg-opacity-90 transition-opacity duration-200"
            >
              {acceptButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AuthForm = () => {
  const router = useRouter(); // <-- Inicializar router
  const searchParams = useSearchParams(); // <-- Get search params

  // Asegurar que searchParams nunca sea null y evitar error de build en Vercel
  const initialAction = searchParams ? searchParams.get('action') : null; // Read 'action' param
  const redirectParam = searchParams ? searchParams.get('redirect') : null; // <-- Get redirect param

  // Set initial state based on 'action' param, default to login (true)
  const [isLogin, setIsLogin] = useState(initialAction !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [termsOfServiceAccepted, setTermsOfServiceAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // 3. Estado para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'privacidad' | 'terminos' | null>(null);
  const [modalContent, setModalContent] = useState<{ title: string, src: string } | null>(null);

  const canProceed = isLogin || agreedToTerms;

  // 4. useEffect para actualizar agreedToTerms cuando ambos individuales son true
  useEffect(() => {
    if (privacyPolicyAccepted && termsOfServiceAccepted) {
      setAgreedToTerms(true);
    }
    // Opcional: si quieres desmarcarlo si uno se des-acepta (no aplica aquí)
    // else {
    //   setAgreedToTerms(false);
    // }
  }, [privacyPolicyAccepted, termsOfServiceAccepted]);

  // 5. Modificar openModal para vista simple o inicio de flujo
  const openModalForViewing = (type: 'privacidad' | 'terminos') => {
    setModalStep(null); // Indicar que es solo para ver, no parte del flujo
    if (type === 'privacidad') {
      setModalContent({ title: 'Política de Privacidad', src: '/privacidad' });
    } else {
      setModalContent({ title: 'Términos del Servicio', src: '/terminos' });
    }
    setIsModalOpen(true);
  };

  const startAcceptanceFlow = () => {
    // Reiniciar estados individuales si se re-inicia el flujo
    setPrivacyPolicyAccepted(false);
    setTermsOfServiceAccepted(false);
    setAgreedToTerms(false);
    setModalStep('privacidad'); // Empezar con privacidad
    setModalContent({ title: 'Política de Privacidad', src: '/privacidad' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStep(null);
    setModalContent(null);
  };

  // 6. Callback cuando se acepta un paso en el modal
  const handleAcceptStep = () => {
    if (modalStep === 'privacidad') {
      setPrivacyPolicyAccepted(true);
      // Pasar al siguiente paso
      setModalStep('terminos');
      setModalContent({ title: 'Términos del Servicio', src: '/terminos' });
    } else if (modalStep === 'terminos') {
      setTermsOfServiceAccepted(true);
      closeModal(); // Cerrar al aceptar el último paso
    }
  };

  // --- Manejador de Google OAuth --- 
  const handleGoogleLogin = async () => {
    // Remove the check for canProceed when !isLogin for Google button
    // if (!canProceed && !isLogin) {
    //   setError("Debes aceptar los términos y la política de privacidad para continuar.");
    //   return;
    // }
    setError(null);
    setLoading(true);
    setMessage(null);
    // Redirigir a /auth/callback para propagar sesión al SSR tras Google OAuth
    const callbackUrl = `${window.location.origin}/auth/callback`;
    console.log(`[Google Login] Redirecting to: ${callbackUrl}`); // Log redirect target

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
      // Supabase maneja la redirección
    } catch (error: any) {
      setError(error.error_description || error.message || "Error iniciando sesión con Google.");
      setLoading(false);
    }
  };

  // --- Manejador de Login/Registro con Email/Password --- 
  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canProceed && !isLogin) { // Agregado chequeo para registro también
      setError("Debes aceptar los términos y la política de privacidad para continuar.");
      return;
    }
    setError(null);
    setLoading(true);
    setMessage(null);

    try {
      let response;
      if (isLogin) {
        // Iniciar Sesión
        response = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
      } else {
        // Registrarse
        response = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        // Mensaje de verificación
        if (response.data.user && !response.data.session) {
             setMessage("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
        }
      }

      const { error: authError } = response;

      if (authError) {
          // Manejo de errores (sin cambios)
          if (authError.message.includes("Invalid login credentials")) {
              setError("Correo o contraseña incorrectos.");
          } else if (authError.message.includes("User already registered")) {
              setError("Este correo ya está registrado. Intenta iniciar sesión.");
          } else if (authError.message.includes("Password should be at least 6 characters")) {
              setError("La contraseña debe tener al menos 6 caracteres.");
          } else if (authError.message.includes("Email rate limit exceeded")) {
              setError("Se ha excedido el límite de correos. Inténtalo más tarde.");
          } else {
              setError(authError.message);
          }
      } else {
         // Éxito
         if (isLogin) {
             // Éxito en INICIO DE SESIÓN
             setMessage("Iniciando sesión...");
             // Upsert usuario en la tabla usuarios (dispara trigger de suscripción gratuita)
             try {
               const { data: { user } } = await supabase.auth.getUser();
               if (user) {
                 const { upsertUserProfile } = await import('@/lib/supabase/upsertUser');
                 await upsertUserProfile({
                   id: user.id,
                   email: user.email ?? "",
                   nombre: user.user_metadata?.name || null,
                 });
               }
             } catch (e) {
               console.error("Error upserting usuario tras login:", e);
             }
             // --- NUEVO: Propagar sesión al SSR ---
             try {
               const { data: sessionData } = response;
               if (sessionData?.session) {
                 const { access_token, refresh_token } = sessionData.session;
                 await fetch('/api/auth/set-session', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ access_token, refresh_token }),
                   credentials: 'include',
                 });
               }
             } catch (e) {
               console.error("Error propagando sesión SSR:", e);
             }
             // Determine redirect path
             const safeRedirect: string | null = redirectParam ?? null;
             let redirectPath: string = '/dashboard'; // Default value
             if (isValidRedirect(safeRedirect)) {
               redirectPath = safeRedirect || '/dashboard';
             }
             console.log(`[Email Login] Redirecting to: ${redirectPath}`); // Log redirect target
             // Redirigir manualmente
             router.push(redirectPath); // redirectPath es string garantizado
         } else if (!message) {
             // Éxito en REGISTRO (sin verificación de email o ya verificado)
             setMessage("¡Cuenta creada exitosamente!");
             // Podríamos redirigir a login o directamente a dashboard si la sesión se inicia
             // Por ahora, dejamos al usuario en la página para que inicie sesión si es necesario.
         }
      }

    } catch (error: any) {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
      console.error("Error inesperado:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-azul-profundo text-center mb-2">
          {isLogin ? 'Inicia sesión' : 'Crea tu cuenta'}
        </h1>
        <p className="text-center text-azul-profundo/80 font-sans text-sm mb-6">
          Empieza gratis. No necesitas tarjeta de crédito.
        </p>

        {/* --- Botón Google --- */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading} // Simplified disabled condition
          className="w-full flex items-center justify-center gap-2 bg-dorado-claro text-azul-profundo font-semibold py-3 px-4 rounded-md hover:bg-opacity-90 transition-opacity duration-200 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <Chrome className="w-5 h-5"/>}
          Continuar con Google
        </button>

        <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gris-calido text-xs font-sans">O</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* --- Formulario Email/Password --- */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {/* Mensaje de éxito (ej. verificación email) */}
          {message && (
              <div className="p-3 bg-green-100 text-green-800 border border-green-200 rounded-md text-sm font-medium">
                  {message}
              </div>
          )}
          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0"/> 
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-azul-profundo mb-1 font-sans">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gris-calido"/>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-celeste-cielo focus:border-celeste-cielo text-sm text-azul-profundo placeholder-gris-calido disabled:opacity-60"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-azul-profundo mb-1 font-sans">
              Contraseña
            </label>
            <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gris-calido"/>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-celeste-cielo focus:border-celeste-cielo text-sm text-azul-profundo placeholder-gris-calido disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Enlace "Olvidaste Contraseña" (solo en modo Login) */}
          {isLogin && (
            <div className="text-right">
              <a href="#" // TODO: Enlazar a página de recuperación
                 className="text-xs font-medium text-azul-profundo hover:text-dorado-claro transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {/* Checkbox de Consentimiento */}
          <div className="flex items-start space-x-2 pt-2">
            {/* 7. Botón del checkbox inicia el FLUJO de aceptación */}
            <button 
              type="button" 
              role="checkbox" 
              aria-checked={agreedToTerms} 
              onClick={startAcceptanceFlow} // <- Inicia flujo
              disabled={loading}
              className="flex-shrink-0 mt-1 disabled:opacity-50"
            >
              {agreedToTerms ? 
                <CheckSquare className="w-4 h-4 text-azul-profundo" /> : 
                <Square className="w-4 h-4 text-gris-calido" />
              }
            </button>
            <label className="text-xs font-sans text-azul-profundo/90">
              He leído y acepto la {' '}
              {/* 8. Botones de texto abren modal para LECTURA */}
              <button 
                type="button" 
                onClick={() => openModalForViewing('privacidad')} 
                className="font-medium text-dorado-claro hover:underline focus:outline-none"
              >
                Política de privacidad
              </button> 
              {/* 9. Mostrar tick si aceptado */}
              {privacyPolicyAccepted && <Check size={12} className="inline ml-1 text-green-500 align-middle"/>}
              {' '}
              y los {' '}
              <button 
                type="button" 
                onClick={() => openModalForViewing('terminos')}
                className="font-medium text-dorado-claro hover:underline focus:outline-none"
              >
                Términos de servicio
              </button>
              {termsOfServiceAccepted && <Check size={12} className="inline ml-1 text-green-500 align-middle"/>}
              .
            </label>
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={loading || !canProceed}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-blanco-hueso bg-azul-profundo hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-profundo transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5"/>
            ) : (
              isLogin ? <><LogIn className="w-4 h-4 mr-2"/> Iniciar sesión</> : <><UserPlus className="w-4 h-4 mr-2"/> Crear cuenta</>
            )}
          </button>
        </form>

        {/* --- Alternar entre Login/Registro --- */}
        <p className="mt-6 text-center text-xs font-sans text-azul-profundo/80">
          {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
            className="font-semibold text-dorado-claro hover:underline focus:outline-none"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

         {/* Mensaje final */}
         <p className="mt-8 text-center text-xs text-gris-calido font-sans">
             Al iniciar sesión, serás dirigido a tu espacio personal para guardar y compartir recuerdos.
         </p>
      </div>

      {/* 10. Renderizar Modal pasando nuevos props */}
      {(() => {
        const { title = '', src = '' } = modalContent || {};
        return (
          <Modal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            title={title}
            src={src}
            step={modalStep} // Pasar el paso actual
            onAccept={handleAcceptStep} // Pasar el callback de aceptación
          />
        );
      })()}
    </>
  );
};

export default AuthForm;
