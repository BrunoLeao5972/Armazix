import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { envInjectPlugin } from "./src/vite-plugins/env-inject";

export default defineConfig({
	plugins: [
		tailwindcss(),
		envInjectPlugin(),
		tanstackStart(),
		react(),
		tsConfigPaths(),
	],
});
