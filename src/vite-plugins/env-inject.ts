import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import type { Plugin } from "vite";

/**
 * Plugin Vite que injeta variáveis de ambiente do .env
 * como constantes no código do servidor
 */
export function envInjectPlugin(): Plugin {
  let mode = "development";

  return {
    name: "env-inject",
    configResolved(config) {
      mode = config.mode;
    },
    resolveId(id) {
      if (id === "virtual:server-env") {
        return id;
      }
    },
    load(id) {
      if (id === "virtual:server-env") {
        // Repete a mesma precedencia de arquivos .env do Vite
        const root = process.cwd();
        const envFiles = [
          ".env",
          ".env.local",
          `.env.${mode}`,
          `.env.${mode}.local`,
        ];

        const envVars: Record<string, string> = {};
        for (const file of envFiles) {
          const envPath = path.resolve(root, file);
          if (!fs.existsSync(envPath)) continue;
          const envContent = fs.readFileSync(envPath, "utf-8");
          Object.assign(envVars, dotenv.parse(envContent));
        }

        // Gerar código que exporta as variáveis (apenas se existirem no .env)
        const entries = [
          ["DATABASE_URL", envVars.DATABASE_URL],
          ["RESEND_API_KEY", envVars.RESEND_API_KEY],
          ["EMAIL_FROM", envVars.EMAIL_FROM],
          ["APP_BASE_URL", envVars.APP_BASE_URL],
        ].filter(([, v]) => !!v);

        const props = entries.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join(",\n");
        const code = `
export const SERVER_ENV = {
${props}
};
`;

        return code;
      }
    },
  };
}
