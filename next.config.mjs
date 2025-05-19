/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fyauxlcfktjegtqurffj.supabase.co', // Your Supabase project hostname
        port: '',
        pathname: '/storage/v1/object/public/**', // Allow any path within the public storage
      },
    ],
  },
  /* other config options can go here */
};

export default nextConfig;
