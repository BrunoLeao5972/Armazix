import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { envInjectPlugin } from "./src/vite-plugins/env-inject";

export default defineConfig({
	plugins: [
		tailwindcss(),
		envInjectPlugin(),
		tanstackStart(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		react(),
		tsConfigPaths(),
	],
	ssr: {
		external: ["node:stream", "node:stream/web", "node:async_hooks"],
	},
	optimizeDeps: {
		exclude: ["@tanstack/router-core"],
	},
	build: {
		rollupOptions: {
			external: ["node:stream", "node:stream/web", "node:async_hooks"],
		},
	},
});
