import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function detectFeatureImages(): Record<string, string> {
  const dir = path.resolve(__dirname, 'public/assets/images');
  const found: Record<string, string> = {};
  for (const key of ['feature-1', 'feature-2', 'feature-3', 'feature-4']) {
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
      if (fs.existsSync(path.join(dir, `${key}.${ext}`))) {
        found[key] = `/assets/images/${key}.${ext}`;
        break;
      }
    }
  }
  return found;
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __FEATURE_IMAGES__: JSON.stringify(detectFeatureImages()),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
