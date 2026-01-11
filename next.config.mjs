/** @type {import('next').NextConfig} */

import runtimeCaching from 'next-pwa/cache.js';
import nextPWA from 'next-pwa';
const withPWA = nextPWA({
 dest: 'public', 
 register: true,
 skipWaiting: true,
 runtimeCaching
})

const nextConfig = withPWA({
  reactStrictMode: false
});

export default nextConfig;
