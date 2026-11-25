import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jalsalabose.app",
  appName: "잘살아보세",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
