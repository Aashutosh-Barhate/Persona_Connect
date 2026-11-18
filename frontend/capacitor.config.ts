import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.personaconnect',
  appName: 'Persona Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
