// Expo environment variables types
declare module 'expo-constants' {
  interface Constants {
    expoConfig: {
      extra: {
        GOOGLE_VISION_API_KEY: string;
      }
    }
  }
}

// Global environment types for Expo
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_GOOGLE_VISION_API_KEY: string;
    }
  }
}

export {};
