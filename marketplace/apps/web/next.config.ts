import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const configRoot = path.join(repoRoot, 'packages/config/src');

loadDotenv({ path: path.join(repoRoot, '.env') });

const nextConfig: NextConfig = {
  transpilePackages: ['@t/config'],
  turbopack: {
    resolveAlias: {
      '@t/config': path.join(configRoot, 'index.ts'),
      '@t/config/env': path.join(configRoot, 'env.ts'),
      '@t/config/env-core': path.join(configRoot, 'env-core.ts'),
    },
  },
  webpack: (config: Configuration): Configuration => {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
