import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "space.manus.webtoonstorystudio";

const config: ExpoConfig = {
  name: "Webtoon Story Studio",
  slug: "animekun",
  owner: "zie11s-team",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "webtoonstorystudio",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#122126",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    eas: {
      projectId: "e7c4aef3-5598-44a9-8470-061b87d0e1da",
    },
  },
  plugins: [
    "expo-asset",
    "expo-web-browser",
    "expo-font",
    "expo-router",
    [
      "expo-media-library",
      {
        photosPermission: "Izinkan Webtoon Story Studio menyimpan panel dan video ke galeri.",
        savePhotosPermission: "Izinkan Webtoon Story Studio menyimpan hasil ekspor ke galeri.",
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      "expo-audio",
      { microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone." },
    ],
    [
      "expo-video",
      { supportsBackgroundPlayback: true, supportsPictureInPicture: true },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#122126",
        dark: { backgroundColor: "#122126" },
      },
    ],
    [
      "expo-build-properties",
      { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
