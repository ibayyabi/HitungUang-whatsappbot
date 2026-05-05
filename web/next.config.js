const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        externalDir: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../'),
    webpack: (config, { dev }) => {
        // Enable minification in production
        if (!dev) {
            config.optimization.minimize = true;
        }
        return config;
    },
    images: {
        formats: ['image/avif', 'image/webp'],
    },
};

module.exports = nextConfig;
