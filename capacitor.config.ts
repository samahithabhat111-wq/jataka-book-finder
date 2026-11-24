import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shriganesha.jataka",
  appName: "Jataka Index",
  webDir: "dist-android",
  android: { allowMixedContent: false },
};

export default config;
