import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ระหว่างพัฒนา /api ถูกส่งต่อไปที่ `fitbot serve` จึงไม่ต้องเปิด CORS ฝั่ง API
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
