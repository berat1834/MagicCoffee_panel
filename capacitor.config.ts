import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.magicpay.magiccoffee.panel',
  appName: 'MagicCoffee Panel',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f7f5ff',
  },
};

export default config;
