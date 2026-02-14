import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@lit-labs/virtualizer'],
  },
});
