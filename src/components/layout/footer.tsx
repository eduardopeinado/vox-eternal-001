import React from 'react';
import Link from 'next/link';
// Importar iconos para redes sociales si se usan (ej. lucide-react)
// import { Facebook, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gris-calido text-blanco-hueso py-10 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
        
        {/* Columna 1: Logo y Eslogan */}
        <div className="flex flex-col items-center md:items-start">
          {/* Aquí podrías poner una versión simplificada o solo texto del logo si prefieres */}
          <Link href="/" className="text-xl font-bold font-serif mb-2">
            Vox Eternal
          </Link>
          <p className="text-sm font-sans italic opacity-80">
            Tu historia merece ser escuchada. Siempre.
          </p>
        </div>

        {/* Columna 2: Enlaces */}
        <div className="flex flex-col items-center md:items-start">
          <h4 className="font-semibold font-sans mb-3">Enlaces Útiles</h4>
          <ul className="space-y-2 text-sm font-sans">
            <li><Link href="/privacidad" className="hover:text-dorado-claro transition-colors">Política de Privacidad</Link></li>
            <li><Link href="/terminos" className="hover:text-dorado-claro transition-colors">Términos del Servicio</Link></li>
            <li><Link href="/contacto" className="hover:text-dorado-claro transition-colors">Contacto</Link></li>
            <li><Link href="/como-funciona" className="hover:text-dorado-claro transition-colors">Cómo funciona</Link></li>
            <li><Link href="/planes" className="hover:text-dorado-claro transition-colors">Planes</Link></li>
          </ul>
        </div>

        {/* Columna 3: Redes Sociales */}
        <div className="flex flex-col items-center md:items-start">
          <h4 className="font-semibold font-sans mb-3">Síguenos</h4>
          <div className="flex space-x-4">
            {/* Reemplaza con enlaces reales e iconos */}
            <a href="#" aria-label="Facebook" className="hover:text-dorado-claro transition-colors">{/* <Facebook size={20} /> */} F </a>
            <a href="#" aria-label="Twitter" className="hover:text-dorado-claro transition-colors">{/* <Twitter size={20} /> */} T </a>
            <a href="#" aria-label="Instagram" className="hover:text-dorado-claro transition-colors">{/* <Instagram size={20} /> */} I </a>
          </div>
        </div>

      </div>
      <div className="mt-8 pt-6 border-t border-blanco-hueso/20 text-center text-xs font-sans opacity-70">
        © {new Date().getFullYear()} Vox Eternal. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer; 