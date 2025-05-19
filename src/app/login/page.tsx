import React, { Suspense } from 'react';
import AuthForm from '@/components/auth/auth-form';
import Link from 'next/link';
import Image from 'next/image'; // Asumiendo que usarás el logo

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-blanco-hueso px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/">
          <Image 
            src="/logo-vox.svg" // Revisa si esta es la ruta correcta
            alt="Vox Eternal Logo"
            width={180} // Ajusta tamaño según necesidad
            height={48} 
          />
        </Link>
      </div>
      
      {/* Contenedor del Formulario */}
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
