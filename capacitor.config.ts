import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bean.noticing",
  appName: "Bean",
  webDir: "dist",
  server: { androidScheme: "https" },
  ios: { contentInset: "automatic", preferredContentMode: "mobile" },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    LocalNotifications: { smallIcon: "ic_stat_bean" },
  },
};

export default config;
