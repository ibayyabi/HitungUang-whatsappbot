const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        externalDir: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../'),
    webpack: (config) => {
        config.optimization.minimize = false;
        return config;
    },
};

module.exports = nextConfig;
