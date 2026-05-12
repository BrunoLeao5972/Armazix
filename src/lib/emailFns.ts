/**
 * Email Service Functions for Armazix
 * Integração com templates de email premium
 * 
 * Uso:
 * - Para verificação: await sendVerificationEmailFn({ email, code })
 * - Para reset: await sendPasswordResetEmailFn({ email, code })
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// ============================================================================
// Tipos e Validação
// ============================================================================

const emailCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().regex(/^[0-9A-Z]{6}$/, "Código deve ter 6 caracteres"),
});

type EmailCodeInput = z.infer<typeof emailCodeSchema>;

// ============================================================================
// Configuração SMTP
// ============================================================================

const SMTP_CONFIG = {
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USERNAME || "",
    pass: process.env.MAIL_PASSWORD || "",
  },
  from: process.env.MAIL_FROM || "noreply@armazix.com.br",
};

// ============================================================================
// Utilitário para Leitura de Templates
// ============================================================================

async function loadEmailTemplate(templateName: "verification" | "password-reset"): Promise<string> {
  try {
    const templatePath = path.join(
      process.cwd(),
      "email-templates",
      templateName === "verification" ? "verification-banner.html" : "password-reset-banner.html"
    );

    const content = await fs.readFile(templatePath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Erro ao carregar template ${templateName}:`, error);
    throw new Error(`Template de email não encontrado: ${templateName}`);
  }
}

// ============================================================================
// Serviço SMTP (Exemplo com Nodemailer)
// ============================================================================

async function sendEmailViaSMTP(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Importar dinamicamente para evitar dependência em build
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.auth.user,
        pass: SMTP_CONFIG.auth.pass,
      },
    });

    const info = await transporter.sendMail({
      from: SMTP_CONFIG.from,
      to,
      subject,
      html,
    });

    console.log(`✉️ Email enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro ao enviar email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Alternativa: SendGrid (mais confiável para produção)
// ============================================================================

async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const sgMail = await import("@sendgrid/mail");

    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY || "");

    const msg = {
      to,
      from: SMTP_CONFIG.from,
      subject,
      html,
    };

    const response = await sgMail.default.send(msg);

    console.log(`✉️ Email enviado via SendGrid: ${response[0].headers['x-message-id']}`);
    return {
      success: true,
      messageId: response[0].headers["x-message-id"],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro ao enviar email via SendGrid:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Server Function: Verificação de Email
// ============================================================================

export const sendVerificationEmailFn = createServerFn({ method: "POST" })
  .inputValidator((data: EmailCodeInput) => data)
  .handler(async ({ data }) => {
    // Validar entrada
    const parsed = emailCodeSchema.parse(data);

    try {
      // 1. Carregar template
      const template = await loadEmailTemplate("verification");

      // 2. Substituir placeholder
      const customizedHtml = template.replace("{{CODE}}", parsed.code);

      // 3. Enviar email (escolha seu provider)
      const result = await sendEmailViaSMTP(
        parsed.email,
        "Verifique seu email - Armazix",
        customizedHtml
      );

      // Alternativa: usar SendGrid
      // const result = await sendEmailViaSendGrid(
      //   parsed.email,
      //   "Verifique seu email - Armazix",
      //   customizedHtml
      // );

      if (!result.success) {
        throw new Error(result.error || "Falha ao enviar email");
      }

      return {
        ok: true,
        message: "Email de verificação enviado com sucesso",
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro em sendVerificationEmailFn:", errorMessage);

      return {
        ok: false,
        message: "Falha ao enviar email de verificação",
        error: errorMessage,
      };
    }
  });

// ============================================================================
// Server Function: Reset de Senha
// ============================================================================

export const sendPasswordResetEmailFn = createServerFn({ method: "POST" })
  .inputValidator((data: EmailCodeInput) => data)
  .handler(async ({ data }) => {
    // Validar entrada
    const parsed = emailCodeSchema.parse(data);

    try {
      // 1. Carregar template
      const template = await loadEmailTemplate("password-reset");

      // 2. Substituir placeholder
      const customizedHtml = template.replace("{{CODE}}", parsed.code);

      // 3. Enviar email
      const result = await sendEmailViaSMTP(
        parsed.email,
        "Recuperação de senha - Armazix",
        customizedHtml
      );

      // Alternativa: usar SendGrid
      // const result = await sendEmailViaSendGrid(
      //   parsed.email,
      //   "Recuperação de senha - Armazix",
      //   customizedHtml
      // );

      if (!result.success) {
        throw new Error(result.error || "Falha ao enviar email");
      }

      return {
        ok: true,
        message: "Email de recuperação de senha enviado com sucesso",
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro em sendPasswordResetEmailFn:", errorMessage);

      return {
        ok: false,
        message: "Falha ao enviar email de recuperação",
        error: errorMessage,
      };
    }
  });

// ============================================================================
// Exemplo de Uso em Rota de Verificação
// ============================================================================

/**
 * Exemplo em uma rota de login/signup:
 * 
 * import { sendVerificationEmailFn, sendPasswordResetEmailFn } from '@/lib/emailFns'
 * 
 * // Ao criar usuário
 * const code = generateVerificationCode() // '483921'
 * const result = await sendVerificationEmailFn({
 *   email: 'user@example.com',
 *   code: code
 * })
 * 
 * if (result.ok) {
 *   // Salvar código hash no banco de dados
 *   // Redirecionar para página de verificação
 * }
 * 
 * // Ao solicitar reset de senha
 * const resetCode = generateVerificationCode() // '728154'
 * const result = await sendPasswordResetEmailFn({
 *   email: 'user@example.com',
 *   code: resetCode
 * })
 * 
 * if (result.ok) {
 *   // Salvar código hash no banco de dados
 *   // Redirecionar para página de reset
 * }
 */

// ============================================================================
// Utilitários de Segurança
// ============================================================================

/**
 * Gera um código de 6 dígitos aleatório
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gera um código alfanumérico de 6 caracteres
 */
export function generateAlphanumericCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Hash seguro de código (use bcrypt em produção)
 * Exemplo: const hash = await hashCode('483921')
 */
export async function hashCode(code: string): Promise<string> {
  // Implementar com bcrypt:
  // import bcrypt from 'bcrypt'
  // return await bcrypt.hash(code, 10)

  // Para desenvolvimento, usar simples:
  return Buffer.from(code).toString("base64");
}

/**
 * Verifica se código está correto
 */
export async function verifyCode(providedCode: string, hashCode: string): Promise<boolean> {
  // Implementar com bcrypt:
  // import bcrypt from 'bcrypt'
  // return await bcrypt.compare(providedCode, hashCode)

  // Para desenvolvimento:
  return Buffer.from(providedCode).toString("base64") === hashCode;
}
