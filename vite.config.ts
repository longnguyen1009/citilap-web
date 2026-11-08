import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

export default defineConfig({
  // Unique per build: cached HTML references hashed chunks, so it must never outlive its deploy.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  // Vinext's client-reference analysis runs outside the Workers environment.
  // Preserve the runtime binding module until the final Worker executes it.
  build: { rollupOptions: { external: ['cloudflare:workers'] } },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  plugins: [
    tailwindcss(),
    vinext({
      // Persistent data cache (fetch / unstable_cache / ISR data) backed by Workers KV (binding VINEXT_KV_CACHE).
      cache: { data: kvDataAdapter() },
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
