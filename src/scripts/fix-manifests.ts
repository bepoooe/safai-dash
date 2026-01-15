/**
 * Script to fix Next.js manifest issues
 * Creates the missing manifest files that Next.js needs
 */

import fs from 'fs';
import path from 'path';

const NEXT_DIR = '.next';
const SERVER_DIR = path.join(NEXT_DIR, 'server');

// Create basic manifest files
const routesManifest = {
  version: 3,
  pages404: true,
  caseSensitive: false,
  redirects: [],
  rewrites: [],
  headers: [],
  staticRoutes: [
    { page: '/', regex: '^/$' },
    { page: '/dashboard', regex: '^/dashboard$' },
    { page: '/dashboard/staff', regex: '^/dashboard/staff$' },
    { page: '/dashboard/users', regex: '^/dashboard/users$' },
    { page: '/dashboard/analytics', regex: '^/dashboard/analytics$' },
    { page: '/dashboard/heatmap', regex: '^/dashboard/heatmap$' },
    { page: '/login', regex: '^/login$' },
    { page: '/signup', regex: '^/signup$' }
  ],
  dynamicRoutes: [],
  dataRoutes: [],
  i18n: null,
  trailingSlash: false,
  experimental: {}
};

const appPathsManifest = {
  '/': ['app/page'],
  '/dashboard': ['app/dashboard/page'],
  '/dashboard/staff': ['app/dashboard/staff/page'],
  '/dashboard/users': ['app/dashboard/users/page'],
  '/dashboard/analytics': ['app/dashboard/analytics/page'],
  '/dashboard/heatmap': ['app/dashboard/heatmap/page'],
  '/login': ['app/login/page'],
  '/signup': ['app/signup/page']
};

function createManifestFiles() {
  try {
    // Create .next directory if it doesn't exist
    if (!fs.existsSync(NEXT_DIR)) {
      fs.mkdirSync(NEXT_DIR, { recursive: true });
    }

    // Create server directory if it doesn't exist
    if (!fs.existsSync(SERVER_DIR)) {
      fs.mkdirSync(SERVER_DIR, { recursive: true });
    }

    // Write routes-manifest.json
    fs.writeFileSync(
      path.join(NEXT_DIR, 'routes-manifest.json'),
      JSON.stringify(routesManifest, null, 2)
    );

    // Write app-paths-manifest.json
    fs.writeFileSync(
      path.join(SERVER_DIR, 'app-paths-manifest.json'),
      JSON.stringify(appPathsManifest, null, 2)
    );

    console.log('✅ Created missing manifest files:');
    console.log('  - .next/routes-manifest.json');
    console.log('  - .next/server/app-paths-manifest.json');
    console.log('\n🚀 You can now try running: npm run dev');

  } catch (error) {
    console.error('❌ Error creating manifest files:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createManifestFiles();
}

export { createManifestFiles };
