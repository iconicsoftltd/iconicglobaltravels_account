import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],

    optimizeDeps: {
      // Exclude specific heavy/problematic libraries if needed, or keep standard pre-bundling
      exclude: [],
    },

    server: {
      port: 3000,
      host: true,
      allowedHosts: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        global: path.resolve(__dirname, "./src/globals.js"),
      },
    },

    define: {
      global: "window",
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL),
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 1000,
    },
  };
});
