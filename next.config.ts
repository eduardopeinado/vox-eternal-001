// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSR standalone
  output: "standalone",

  // Tu configuración de imágenes remotas
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fyauxlcfktjegtqurffj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Excluir react-joyride del bundle SSR
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('react-joyride');
    }
    return config;
  },

  // Puedes añadir aquí otros flags si los necesitas, pero NO ese regexp global
};

export default nextConfig;
