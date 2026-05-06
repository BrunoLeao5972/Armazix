# Projeto Armazix

Plataforma web para criacao e operacao de lojas online, com painel administrativo, vitrine publica e fluxo de pedidos.

## Objetivo

Permitir que pequenos lojistas criem uma loja rapidamente, publiquem produtos e acompanhem pedidos em um painel simples.

## Stack atual

- Frontend: React 19 + TypeScript
- Roteamento: TanStack Router / TanStack Start
- UI: Tailwind CSS + componentes Radix/shadcn
- Estado local: Zustand com persistencia
- Build: Vite
- Runtime/Deploy alvo: Cloudflare (configurado via wrangler)

## Estrutura principal

- `src/routes`: paginas e rotas da aplicacao
- `src/components`: componentes reutilizaveis
- `src/lib/store.ts`: camada de dados local mock (auth, lojas, produtos, pedidos, carrinho)
- `src/assets`: imagens, logo e favicon

## Modelo de dados atual (local/mock)

Hoje os dados estao no navegador via Zustand persistido.

Entidades principais:

- `User`: usuario da plataforma
- `Store`: loja do usuario
- `Product`: produto da loja
- `Order` e `OrderItem`: pedidos e itens

Essa estrutura ja esta pronta para migracao para banco relacional, pois os relacionamentos sao claros.

## Banco de dados recomendado

### Recomendacao

Usar **PostgreSQL gerenciado** como banco principal (ex.: Neon ou Supabase).

### Motivos

- Dominio relacional natural: usuarios, lojas, produtos, pedidos e itens
- Consistencia forte para pedidos e pagamentos (transacoes ACID)
- Escalabilidade de consultas para dashboard e relatorios
- Seguranca multi-tenant com Row Level Security (RLS)

### Quando NAO usar apenas SQLite/D1

SQLite/D1 pode servir para MVP inicial de baixo volume, mas tende a limitar evolucao em cenarios com maior concorrencia de escrita e regras mais complexas por tenant.

## Desenho de banco sugerido (v1)

Tabelas:

- `users`
  - `id` (pk)
  - `name`, `email`, `password_hash`
  - `created_at`

- `stores`
  - `id` (pk)
  - `owner_id` (fk users.id)
  - `name`, `slug`, `description`, `whatsapp`
  - `pickup_enabled`, `local_delivery_enabled`, `delivery_fee`
  - `pix_enabled`, `card_enabled`
  - `created_at`

- `products`
  - `id` (pk)
  - `store_id` (fk stores.id)
  - `name`, `description`, `category`
  - `price`, `stock`
  - `image_emoji`, `image_url`
  - `created_at`, `updated_at`

- `orders`
  - `id` (pk)
  - `store_id` (fk stores.id)
  - `customer_name`, `customer_email`, `customer_phone`, `customer_address`
  - `payment_method`, `delivery_method`, `status`
  - `total`
  - `created_at`, `updated_at`

- `order_items`
  - `id` (pk)
  - `order_id` (fk orders.id)
  - `product_id` (fk products.id)
  - `name_snapshot`, `price_snapshot`, `quantity`

Indices minimos:

- `stores.slug` (unique)
- `products.store_id`
- `orders.store_id`
- `orders.created_at`

## Estrategia multi-tenant

Aplicar isolamento por `store_id` em tabelas de negocio e configurar politicas RLS para garantir que cada usuario acesse apenas os dados de sua loja.

## Plano de migracao (incremental)

1. Definir schema SQL e migracoes iniciais.
2. Criar camada de acesso a dados no servidor (ORM: Drizzle ou Prisma).
3. Migrar autenticacao para backend (senha com hash, sem senha em texto plano).
4. Substituir gradualmente chamadas do Zustand local por chamadas de API.
5. Manter fallback local apenas para desenvolvimento se necessario.
6. Adicionar observabilidade basica (logs de erro e metricas de consultas).

## Comandos uteis

- Desenvolvimento: `bun run dev`
- Build de validacao: `bun run build`
- Lint: `bun run lint`
- Formatacao: `bun run format`

## Proximos passos recomendados

1. Escolher provedor Postgres (Neon ou Supabase).
2. Definir ORM (Drizzle ou Prisma).
3. Criar primeira migracao com as tabelas acima.
4. Implementar endpoint de criacao/listagem de produtos como piloto.
