import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_', 'GEMINI_'], // Allows access to GEMINI_API_KEY via import.meta.env
});
