import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // server: {
  //   host: '0.0.0.0', // Listen on all network interfaces (required for LAN access)
  //   port: 5173,      // Optional: specify your port
  //   strictPort: true, // Optional: enforce port
  //   allowedHosts: ['192.168.29.36'], // Optional: allow specific IPs (usually not required for LAN)
  // },
  plugins: [react()],
})
