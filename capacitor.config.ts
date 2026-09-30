import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.mondjassa.app',
  appName: 'MonDjassa',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // masqué par l'app (SplashAnimation) une fois l'interface prête
      backgroundColor: '#12131F',
      showSpinner: false
    }
  }
};

export default config;
