import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  resolve: {
    // qrcode.react is a hook-based component. Keep it on the exact same React
    // instance as React Router during Vite dependency optimisation; otherwise
    // the setup screen hydrates with a second dispatcher and crashes.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["qrcode.react"],
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
