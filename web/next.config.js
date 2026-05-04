const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ['../src'],
  
  // Tambahkan baris webpack ini:
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Paksa pencarian library ke node_modules milik folder 'web'
      '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
      'dotenv': path.resolve(__dirname, 'node_modules/dotenv'),
      'winston': path.resolve(__dirname, 'node_modules/winston'),
    };
    return config;
  },
};

module.exports = nextConfig;
