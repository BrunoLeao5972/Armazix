/**
 * EXEMPLO DE INTEGRAÇÃO: Como usar Email Templates no Armazix
 * 
 * Este arquivo mostra exemplos práticos de como integrar os email templates
 * com o fluxo de autenticação do Armazix.
 * 
 * Não precisa ser copiado integralmente - use como referência!
 */

// ============================================================================
// 1. INTEGRAÇÃO EM authFns.ts
// ============================================================================

/**
 * Adicione isso ao seu arquivo authFns.ts para usar os templates de email
 */

import { sendVerificationEmailFn, sendPasswordResetEmailFn, generateVerificationCode } from "@/lib/emailFns";

// Exemplo para integrar ao fluxo de signup (verificação de email):
/*
export const signupAndSendVerificationFn = createServerFn({ method: "POST" })
  .inputValidator((data: SignupData) => data)
  .handler(async ({ data }) => {
    // ... validar e criar usuário ...
    
    // 1. Gerar código de verificação
    const verificationCode = generateVerificationCode(); // '483921'
    
    // 2. Salvar código com hash no banco de dados
    const hashedCode = await hashCode(verificationCode);
    await db.insert(emailAuthCodes).values({
      userId: newUser.id,
      email: newUser.email,
      purpose: 'email_verification',
      codeHash: hashedCode,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
    });
    
    // 3. Enviar email com template PREMIUM
    const emailResult = await sendVerificationEmailFn({
      email: newUser.email,
      code: verificationCode,
    });
    
    if (!emailResult.ok) {
      throw new Error('Falha ao enviar email de verificação');
    }
    
    return {
      ok: true,
      message: 'Conta criada! Verifique seu email.',
      userId: newUser.id,
    };
  });
*/

// Exemplo para integrar ao fluxo de reset de senha:
/*
export const requestPasswordResetWithTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    // 1. Verificar se usuário existe
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    
    if (user.length === 0) {
      // Por segurança, retornar mensagem genérica
      return {
        ok: true,
        message: 'Se o email existir, enviaremos um código.',
      };
    }
    
    // 2. Gerar código de reset
    const resetCode = generateVerificationCode(); // '728154'
    
    // 3. Salvar código com hash no banco de dados
    const hashedCode = await hashCode(resetCode);
    await db.insert(emailAuthCodes).values({
      userId: user[0].id,
      email: user[0].email,
      purpose: 'password_reset',
      codeHash: hashedCode,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
    });
    
    // 4. Enviar email com template PREMIUM
    const emailResult = await sendPasswordResetEmailFn({
      email: user[0].email,
      code: resetCode,
    });
    
    if (!emailResult.ok) {
      throw new Error('Falha ao enviar email de recuperação');
    }
    
    return {
      ok: true,
      message: 'Se o email existir, enviaremos um código.',
    };
  });
*/

// ============================================================================
// 2. VARIÁVEIS DE AMBIENTE NECESSÁRIAS
// ============================================================================

/**
 * Adicione ao seu arquivo .env.local:
 * 
 * # SMTP Configuration
 * MAIL_HOST=smtp.gmail.com
 * MAIL_PORT=587
 * MAIL_SECURE=false
 * MAIL_USERNAME=seu-email@gmail.com
 * MAIL_PASSWORD=sua-senha-de-app
 * MAIL_FROM=noreply@armazix.com.br
 * 
 * # OU SendGrid (alternativa)
 * SENDGRID_API_KEY=sua-chave-aqui
 */

// ============================================================================
// 3. ESTRUTURA DO BANCO DE DADOS
// ============================================================================

/**
 * Adicione esta tabela ao seu schema.ts (se ainda não existe):
 * 
 * export const emailAuthCodes = pgTable(
 *   "email_auth_codes",
 *   {
 *     id: uuid("id").defaultRandom().primaryKey(),
 *     userId: uuid("user_id")
 *       .notNull()
 *       .references(() => users.id, { onDelete: "cascade" }),
 *     email: text("email").notNull(),
 *     purpose: text("purpose").notNull(), // 'email_verification' ou 'password_reset'
 *     codeHash: text("code_hash").notNull(), // NUNCA armazene o código em texto plano!
 *     expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
 *     consumedAt: timestamp("consumed_at", { withTimezone: true }),
 *     attempts: integer("attempts").default(0).notNull(),
 *     createdAt: timestamp("created_at", { withTimezone: true })
 *       .defaultNow()
 *       .notNull(),
 *   },
 *   (table) => ({
 *     userPurposeIdx: index("email_auth_codes_user_purpose_idx").on(
 *       table.userId,
 *       table.purpose,
 *     ),
 *   }),
 * );
 */

// ============================================================================
// 4. CASOS DE USO
// ============================================================================

/**
 * CASO 1: Verificação de Email no Signup
 * ==========================================
 * 
 * User clica em "Criar Conta"
 *   ↓
 * Validar email/senha
 *   ↓
 * Criar usuário no banco
 *   ↓
 * Gerar código de verificação (483921)
 *   ↓
 * Salvar hash do código no banco (validade 30 min)
 *   ↓
 * ENVIAR EMAIL COM TEMPLATE PREMIUM ✉️
 *   → Box verde neon com código "483921"
 *   → Mensagem "Verifique seu email"
 *   → Estilo fintech premium
 *   ↓
 * User recebe email em poucos segundos
 *   ↓
 * User insere código na página
 *   ↓
 * Verificar: código + hash = correspondência?
 *   ↓
 * Se OK: marcar email como verificado ✓
 * Se ERRO: mostrar "Código inválido ou expirado"
 */

/**
 * CASO 2: Reset de Senha
 * ======================
 * 
 * User clica em "Esqueci minha senha"
 *   ↓
 * Inserir email
 *   ↓
 * Backend verifica se email existe (sem revelar)
 *   ↓
 * Gerar código de reset (728154)
 *   ↓
 * Salvar hash do código no banco (validade 30 min)
 *   ↓
 * ENVIAR EMAIL COM TEMPLATE PREMIUM ✉️
 *   → Box verde neon com código "728154"
 *   → Mensagem "Recuperação de senha"
 *   → Estilo fintech premium
 *   ↓
 * User recebe email em poucos segundos
 *   ↓
 * User insere código + nova senha
 *   ↓
 * Verificar: código + hash = correspondência?
 *   ↓
 * Se OK: atualizar senha no banco ✓
 * Se ERRO: mostrar "Código inválido ou expirado"
 */

// ============================================================================
// 5. BOAS PRÁTICAS DE SEGURANÇA
// ============================================================================

/**
 * ✓ SEMPRE:
 * - Armazenar HASH do código, não o código em texto plano
 * - Usar bcrypt, argon2 ou similar (crypto.subtle em Node.js moderno)
 * - Definir expiração (15-30 minutos é ideal)
 * - Limitar tentativas (máx 5 por código)
 * - Usar HTTPS sempre (TLS para SMTP)
 * - Validar email/código no servidor (nunca confiar no cliente)
 * - Implementar rate limiting para requisições de código
 * 
 * ✗ NUNCA:
 * - Armazenar código em texto plano
 * - Enviar código em URL (compromete segurança)
 * - Deixar código válido por dias/semanas
 * - Aceitar código múltiplas vezes
 * - Revelar se email existe ou não (mensagem genérica)
 * - Armazenar credenciais SMTP no código
 */

// ============================================================================
// 6. TESTE LOCAL COM MAILTRAP
// ============================================================================

/**
 * Para testar emails localmente:
 * 
 * 1. Criar conta em https://mailtrap.io
 * 2. Copiar credenciais SMTP do sandbox
 * 3. Adicionar ao .env.local:
 * 
 *    MAIL_HOST=sandbox.smtp.mailtrap.io
 *    MAIL_PORT=2525
 *    MAIL_USERNAME=sua-api-key
 *    MAIL_PASSWORD=sua-api-secret
 *    MAIL_FROM=noreply@armazix.com.br
 * 
 * 4. Todos os emails enviados vão para Mailtrap
 * 5. Visualizar no dashboard do Mailtrap
 * 6. Testar rendering em diferentes clientes
 */

// ============================================================================
// 7. PRÓXIMOS PASSOS
// ============================================================================

/**
 * TODO:
 * [ ] Implementar emailFns.ts no projeto
 * [ ] Adicionar templates HTML ao /email-templates/
 * [ ] Configurar variáveis de ambiente SMTP
 * [ ] Integrar com fluxo de signup
 * [ ] Integrar com fluxo de reset de senha
 * [ ] Adicionar testes (Mailtrap/fake SMTP)
 * [ ] Implementar rate limiting
 * [ ] Adicionar logs de email
 * [ ] Testar em clientes de email reais
 * [ ] Implementar DKIM/SPF/DMARC
 * [ ] Documentar para equipe
 */

// ============================================================================
// 8. RECURSOS ÚTEIS
// ============================================================================

/**
 * Documentação:
 * - Nodemailer: https://nodemailer.com/
 * - SendGrid: https://sendgrid.com/docs/
 * - Email Rendering: https://www.emailonacid.com/
 * - DKIM/SPF: https://dmarcian.com/
 * - Segurança: https://owasp.org/
 * 
 * Ferramentas:
 * - Mailtrap (teste local)
 * - Email on Acid (renderização)
 * - Litmus (análise profissional)
 * - Brevo/Sendinblue (SMTP provider)
 * - Postmark (transacional)
 */

export const emailIntegrationComplete = true;
