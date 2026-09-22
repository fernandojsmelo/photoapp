import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em dev, o navegador só precisa falar com a porta do Vite — ela proxya
    // /api para o backend internamente. Evita depender de a porta do backend
    // também estar acessível/encaminhada (ex.: ambientes com port-forwarding
    // automático só para a porta do dev server, como VS Code remoto).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
