import Link from 'next/link';
import Image from 'next/image'; // Importar Image

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center space-x-4 p-4 px-8 text-blanco-hueso bg-azul-profundo shadow-md h-16 sm:justify-between">
      {/* Logo usando next/image */}
      <Link href="/">
        <Image src="/logo-vox.svg" alt="Vox Eternal Logo" width={150} height={40} priority /> {/* Cambiado a .svg */}
      </Link>

      {/* Navegación */}
      <nav>
        <ul className="flex items-center space-x-6 font-sans text-sm">
          <li><Link href="/" className="hover:text-dorado-claro transition-colors">Inicio</Link></li>
          <li><Link href="/planes" className="hover:text-dorado-claro transition-colors">Planes</Link></li>
          <li><Link href="/como-funciona" className="hover:text-dorado-claro transition-colors">Cómo funciona</Link></li>
          <li><Link href="/productos" className="hover:text-dorado-claro transition-colors">Productos</Link></li>
          <li>
            <Link href="/login" 
                  className="bg-dorado-claro text-azul-profundo px-4 py-2 rounded-md text-xs font-semibold hover:bg-opacity-90 transition-opacity shadow"
            >
              Login
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 