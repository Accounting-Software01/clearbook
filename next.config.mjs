/** @type {import('next').NextConfig} */
const nextConfig = {
  devServer: {
    port: 3000,
    hostname: 'localhost',
    // Increase the timeout to one day (in seconds)
    // 24 hours * 60 minutes * 60 seconds = 86400 seconds
    // This should prevent the development server from timing out
    // and causing the session to expire prematurely
    // (this is a common issue with Next.js development servers)
    timeout: 86400,
  },
};

export default nextConfig;
