import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure Vite pre-bundles MediaPipe packages so imports like
  // '@mediapipe/hands' and '@mediapipe/camera_utils' resolve correctly
  optimizeDeps: {
    include: [
      "@mediapipe/hands",
      "@mediapipe/camera_utils",
      "@mediapipe/drawing_utils",
    ],
  },
});
