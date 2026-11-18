import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor config — wraps the built Vite SPA (`dist/`) into a native app.
 *
 * Build flow:
 *   1. `npm run build` (optionally with VITE_API_BASE pointing at the backend)
 *   2. `npm run cap:sync`      — copies dist/ into the native projects
 *   3. `npm run cap:android`   — opens Android Studio (build APK there)
 *      `npm run cap:ios`       — opens Xcode (build for device/simulator)
 */
const config: CapacitorConfig = {
  appId: 'app.personaconnect',
  appName: 'Persona Connect',
  webDir: 'dist',
  // Keep the local WebView server scheme stable; the backend CORS list
  // (backend/app/main.py) explicitly allows these origins.
  server: {
    androidScheme: 'https',
  },
}

export default config
