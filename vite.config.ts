import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

export default defineConfig({
  // Vinext's client-reference analysis runs outside the Workers environment.
  // Preserve the runtime binding module until the final Worker executes it.
  build: { rollupOptions: { external: ['cloudflare:workers'] } },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  plugins: [
    tailwindcss(),
    vinext({ images: { optimizer: imagesOptimizer() } }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
