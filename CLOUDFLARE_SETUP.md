# Configuração de Secrets no Cloudflare Workers

## Problema
Os produtos criados no painel administrativo não aparecem na loja pública porque o servidor não consegue sincronizar com o banco de dados.

**Erro**: "DATABASE_URL não encontrado"

## Solução

### 1. Acessar Cloudflare Dashboard
1. Vá para https://dash.cloudflare.com/
2. Selecione a zona "armazix.com.br"
3. Vá para **Workers and Pages** (Workers Clássico)

### 2. Configurar Secrets para Produção

Para o worker **"armazix"**:

1. Clique em **Settings** (Configurações)
2. Vá para **Secrets** (Variáveis de Ambiente Secretas)
3. Clique em **Add Secret** (Adicionar Secret)
4. Configure o seguinte:

```
Variable name: DATABASE_URL
Value: <sua_string_de_conexão_postgres>
```

**Formato esperado da string de conexão:**
```
postgresql://user:password@host:port/database
```

### 3. Configurar Secrets para Staging (Opcional)

Se quiser um ambiente de staging diferente:

1. Vá para **Environments** → **staging**
2. Repita o processo de configuração de secrets com a string de conexão do banco de dados de staging

### 4. Redeplorar

Depois de configurar os secrets:

```bash
# Redeployer para produção
wrangler publish

# Ou para staging
wrangler publish --env staging
```

## Verificação

Após deplorar, você pode verificar se está funcionando:

1. No painel administrativo, crie um novo produto
2. Vá para as Configurações e clique em "Salvar alterações"
3. Acesse a página pública da loja
4. O produto deve aparecer na listagem

## Referência Cloudflare

- Documentação oficial: https://developers.cloudflare.com/workers/configuration/secrets/
- Environment variables (vars): Configurações públicas em `wrangler.jsonc`
- Secrets: Variáveis privadas configuradas no dashboard do Cloudflare
