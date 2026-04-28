const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: path.join(__dirname, '../'),
    webpack: (config) => {
        config.optimization.minimize = false;
        return config;
    },
};

module.exports = nextConfig;
