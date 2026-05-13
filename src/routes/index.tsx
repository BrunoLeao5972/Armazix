import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PlatformHeader } from "@/components/PlatformHeader";
import { PublicStoreView } from "@/components/PublicStoreView";
import { getStoreSlugFromWindowHost } from "@/lib/domain";
import {
  Check,
  Package,
  Rocket,
  ShoppingBag,
  Zap,
  TrendingUp,
  Star,
  Sparkles,
  CreditCard,
  Truck,
  BarChart3,
  ArrowRight,
  Play,
  Monitor,
} from "lucide-react";
import heroImg from "@/assets/hero-entrepreneur.jpg";
import dashboardImg from "@/assets/dashboard-preview.jpg";
import productsImg from "@/assets/products-flatlay.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Armazix — Crie sua loja online em minutos" },
      {
        name: "description",
        content:
          "Plataforma multi-loja para empreendedores: cadastre produtos, receba pedidos e compartilhe sua loja com um link único.",
      },
      { property: "og:title", content: "Armazix — Sua loja online" },
      {
        property: "og:description",
        content: "Crie sua loja online grátis e comece a vender hoje.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const hostSlug = mounted ? getStoreSlugFromWindowHost() : null;
  const [pdvOn, setPdvOn] = useState<Record<string, boolean>>({});

  if (hostSlug) {
    return (
      <PublicStoreView
        slug={hostSlug}
        rootHref="/"
        checkoutHref={`/loja/${hostSlug}/checkout`}
      />
    );
  }

  const plans = [
    {
      name: "Free",
      badge: "Gratis",
      price: "R$ 0",
      cadence: "/mes",
      perDay: "Comece sem custo",
      limit: "Até 5 produtos",
      description:
        "Para testar a Armazix, organizar seu estoque inicial e vender com mais clareza desde o primeiro dia.",
      cta: "Começar grátis",
      ctaTo: "/signup",
      featured: false,
      premium: false,
      features: [
        "Catálogo com até 5 produtos",
        "Integração com WhatsApp",
        "Controle de estoque manual",
        "Relatórios básicos",
        "Suporte normal",
      ],
    },
    {
      name: "Start",
      badge: "Para começar vendendo",
      price: "R$ 19,90",
      cadence: "/mes",
      perDay: "A partir de R$ 0,66/dia",
      limit: "Até 30 produtos",
      pdvPrice: "R$ 69,90",
      description:
        "Ideal para pequenos lojistas que precisam ganhar tempo, evitar erros no estoque e profissionalizar a operação.",
      cta: "Assinar agora",
      ctaTo: "/signup",
      featured: false,
      premium: false,
      features: [
        "Catálogo com até 30 produtos",
        "Integração com WhatsApp",
        "Controle de estoque automático",
        "Alertas de estoque baixo",
        "Relatórios básicos",
        "Suporte normal",
      ],
    },
    {
      name: "Pro",
      badge: "O Mais escolhido🔥",
      price: "R$ 39,90",
      cadence: "/mes",
      perDay: "A partir de R$ 1,33/dia",
      limit: "Até 70 produtos",
      pdvPrice: "R$ 89,90",
      description:
        "O plano principal para quem quer ter controle total do negócio, evitar perder vendas e crescer com previsibilidade.",
      cta: "Assinar agora",
      ctaTo: "/signup",
      featured: true,
      premium: false,
      features: [
        "Catálogo com até 70 produtos",
        "Integração com WhatsApp",
        "Controle de estoque automático",
        "Alertas de estoque baixo",
        "Relatórios avançados",
        "Acesso para 2 usuários",
        "Suporte prioritário",
      ],
    },
    {
      name: "Full",
      badge: "Premium",
      price: "R$ 89,90",
      cadence: "/mes",
      perDay: "A partir de R$ 2,99/dia",
      limit: "Produtos ilimitados",
      pdvPrice: "R$ 139,90",
      description:
        "Para operacoes mais robustas que precisam de liberdade total, equipe colaborando e visao completa do estoque.",
      cta: "Assinar agora",
      ctaTo: "/signup",
      featured: false,
      premium: true,
      features: [
        "Produtos ilimitados",
        "Integracao com WhatsApp",
        "Controle de estoque automatico",
        "Alertas de estoque baixo",
        "Relatorios avancados",
        "Multiusuario",
        "Suporte prioritario",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      <PlatformHeader />

      {/* HERO SECTION WITH VIDEO BACKGROUND */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden py-20 lg:py-32">
        {/* Background Video with Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={heroImg}
            className="h-full w-full object-cover opacity-45 grayscale-[0.2] scale-105"
          >
            <source
              src="https://cdn.shopify.com/s/files/1/0070/7032/files/shopify-hero-video-desktop.mp4?v=1658444456"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.03),transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                <Sparkles className="h-3.5 w-3.5" /> A revolução do e-commerce local
              </span>
            </div>

            <h1 className="mt-8 animate-in fade-in slide-in-from-bottom-6 text-5xl font-black leading-[1.1] tracking-tight text-foreground duration-1000 sm:text-6xl lg:text-8xl">
              Crie sua loja online
              <br />
              <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x">
                Em apenas 2 minutos
              </span>
            </h1>

            <p className="mt-8 max-w-2xl animate-in fade-in slide-in-from-bottom-8 text-lg leading-relaxed text-muted-foreground duration-1000 lg:text-xl">
              Transforme seu negócio com uma experiência visual premium. 
              Venda mais com um catálogo fluido, gestão simplificada e 
              pagamentos integrados. Tudo em minutos.
            </p>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 lg:justify-start">
              <Link
                to="/signup"
                className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95"
              >
                Começar agora
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-full border border-border bg-background/50 px-8 py-4 font-bold text-foreground backdrop-blur-md transition-all hover:bg-muted hover:border-primary/30 active:scale-95"
              >
                Acessar Painel
              </Link>
            </div>

            {/* Social Proof */}
            <div className="mt-16 flex flex-col items-center gap-4 animate-in fade-in duration-1000 delay-500 lg:items-start">
              <div className="flex -space-x-3">
                {[47, 32, 12, 68, 24].map((id) => (
                  <img
                    key={id}
                    src={`https://i.pravatar.cc/100?img=${id}`}
                    alt="Lojista"
                    className="h-10 w-10 rounded-full border-4 border-background object-cover ring-1 ring-border shadow-xl"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  Confiança de <span className="font-bold text-primary">+100 lojistas</span> em todo o Brasil
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating elements for visual depth */}
        <div className="pointer-events-none absolute right-[10%] top-[20%] hidden animate-float lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/70">Vendas Hoje</p>
                <p className="text-lg font-bold text-black">R$ 4.290,00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-[5%] bottom-[15%] hidden animate-float-delayed lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/70">Novo Pedido</p>
                <p className="text-sm font-bold text-black">Camiseta Azul (P)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* stats strip */}
        <section className="relative border-t border-border/60 bg-card/40 backdrop-blur">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
            {[
              { v: "20+", l: "Lojas ativas" },
              { v: "500", l: "Pedidos processados" },
              { v: "R$12k", l: "Vendido pelos lojistas" },
              { v: "97%", l: "Satisfação" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {s.v}
                </div>
                <div className="text-xs text-muted-foreground md:text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

      {/* CATEGORIES STRIP */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Pra todo tipo de negócio
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {[
              { e: "☕", n: "Cafeterias" },
              { e: "🍰", n: "Confeitarias" },
              { e: "👕", n: "Moda" },
              { e: "💄", n: "Beleza" },
              { e: "🌷", n: "Floriculturas" },
              { e: "📱", n: "Eletrônicos" },
              { e: "📚", n: "Livrarias" },
              { e: "🥘", n: "Restaurantes" },
            ].map((c) => (
              <div
                key={c.n}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-lg">{c.e}</span>
                <span className="font-medium text-foreground">{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" /> Recursos
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Tudo que você precisa para vender
          </h2>
          <p className="mt-3 text-muted-foreground">
            Um painel limpo, rápido e direto ao ponto.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShoppingBag,
              title: "Vitrine pronta",
              desc: "Sua loja ganha um link público bonito e responsivo, pronto pra compartilhar.",
            },
            {
              icon: Package,
              title: "Gestão de produtos",
              desc: "Cadastre, controle estoque e categorize tudo num só lugar.",
            },
            {
              icon: Rocket,
              title: "Pedidos em tempo real",
              desc: "Acompanhe pedidos, mude status e prepare entregas sem complicação.",
            },
            {
              icon: CreditCard,
              title: "Pagamentos integrados",
              desc: "Pix e cartão direto na sua loja (em breve), sem dor de cabeça.",
            },
            {
              icon: Truck,
              title: "Frete e retirada",
              desc: "Configure entrega local, retirada na loja ou frete fixo facilmente.",
            },
            {
              icon: BarChart3,
              title: "Relatórios claros",
              desc: "Veja o que está vendendo mais e quem são seus melhores clientes.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-sm">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section className="bg-muted/40 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-[image:var(--gradient-primary)] opacity-20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]">
                <img
                  src={dashboardImg}
                  alt="Painel administrativo da plataforma com vendas e produtos"
                  loading="lazy"
                  width={1600}
                  height={1024}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3 w-3 text-primary" /> Painel do lojista
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Controle total da sua loja, num só lugar.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Acompanhe vendas, estoque e pedidos em tempo real. Tudo organizado pra
              você focar no que importa: crescer.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Métricas de vendas e ticket médio",
                "Cadastro de produtos com fotos e variações",
                "Status de pedidos com um clique",
                "Configuração de frete e formas de pagamento",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-md transition hover:opacity-90"
            >
              Quero ver na prática <Rocket className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Package className="h-3 w-3 text-primary" /> Planos
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Planos pensados para pequenos lojistas que querem vender melhor
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Organize seu estoque, evite perder vendas e tenha controle total do seu negocio com um plano que acompanha o ritmo da sua loja.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-4 py-2 shadow-sm">Sem taxa de instalacao</span>
            <span className="rounded-full border border-border bg-card px-4 py-2 shadow-sm">Comece gratis e evolua quando precisar</span>
            <span className="rounded-full border border-border bg-card px-4 py-2 shadow-sm">Cancelamento simples</span>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={[
                "relative flex h-full flex-col rounded-3xl border p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
                plan.featured
                  ? "border-primary bg-[image:var(--gradient-primary)] text-primary-foreground"
                  : plan.premium
                    ? "border-foreground/15 bg-foreground text-background"
                    : "border-border bg-card text-card-foreground",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={[
                      "text-sm font-medium",
                      plan.featured || plan.premium
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    Plano {plan.name}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">{plan.name}</h3>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                    plan.featured
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : plan.premium
                        ? "bg-background/10 text-background"
                        : "bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  {plan.badge}
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span
                    className={[
                      "pb-1 text-sm",
                      plan.featured || plan.premium
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {plan.cadence}
                  </span>
                </div>
                <p
                  className={[
                    "mt-2 text-sm font-medium",
                    plan.featured || plan.premium
                      ? "text-primary-foreground/85"
                      : "text-primary",
                  ].join(" ")}
                >
                  {plan.perDay}
                </p>
              </div>

              <p
                className={[
                  "mt-5 rounded-2xl border px-4 py-3 text-sm font-medium",
                  plan.featured
                    ? "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground"
                    : plan.premium
                      ? "border-background/10 bg-background/5 text-background"
                      : "border-border bg-muted/50 text-foreground",
                ].join(" ")}
              >
                {plan.limit}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium">
                <Check className="h-4 w-4" /> {plan.description}
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        plan.featured
                          ? "bg-primary-foreground/15 text-primary-foreground"
                          : plan.premium
                            ? "bg-background/10 text-background"
                            : "bg-primary/10 text-primary",
                      ].join(" ")}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={[
                        plan.featured || plan.premium
                          ? "text-primary-foreground/90"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {(plan as typeof plan & { pdvPrice?: string }).pdvPrice && (
                <div className="mt-6">
                  {/* divider */}
                  <div
                    className={[
                      "mb-4 flex items-center gap-2",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-px flex-1",
                        plan.featured || plan.premium
                          ? "bg-primary-foreground/20"
                          : "bg-border",
                      ].join(" ")}
                    />
                    <span
                      className={[
                        "text-[10px] font-black uppercase tracking-[0.2em]",
                        plan.featured || plan.premium
                          ? "text-primary-foreground/50"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      Opcional
                    </span>
                    <div
                      className={[
                        "h-px flex-1",
                        plan.featured || plan.premium
                          ? "bg-primary-foreground/20"
                          : "bg-border",
                      ].join(" ")}
                    />
                  </div>

                  {/* PDV toggle card */}
                  <div
                    className={[
                      "rounded-2xl border p-4 transition-all duration-200",
                      pdvOn[plan.name]
                        ? plan.featured
                          ? "border-primary-foreground/40 bg-primary-foreground/15 shadow-sm"
                          : plan.premium
                            ? "border-background/30 bg-background/10 shadow-sm"
                            : "border-primary/30 bg-primary/8 shadow-sm"
                        : plan.featured || plan.premium
                          ? "border-primary-foreground/15 bg-primary-foreground/5"
                          : "border-border bg-muted/30",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* icon + text */}
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                            pdvOn[plan.name]
                              ? plan.featured
                                ? "bg-primary-foreground/25 text-primary-foreground"
                                : plan.premium
                                  ? "bg-background/20 text-background"
                                  : "bg-primary/15 text-primary"
                              : plan.featured || plan.premium
                                ? "bg-primary-foreground/10 text-primary-foreground/60"
                                : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          <Monitor className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={[
                              "text-sm font-semibold leading-tight",
                              plan.featured || plan.premium
                                ? "text-primary-foreground"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            Ponto de Venda
                          </p>
                          <p
                            className={[
                              "mt-0.5 text-xs leading-snug",
                              plan.featured || plan.premium
                                ? "text-primary-foreground/65"
                                : "text-muted-foreground",
                            ].join(" ")}
                          >
                            Terminal para loja física
                          </p>
                          {pdvOn[plan.name] && (
                            <p
                              className={[
                                "mt-1.5 text-[11px] font-bold",
                                plan.featured || plan.premium
                                  ? "text-primary-foreground/90"
                                  : "text-primary",
                              ].join(" ")}
                            >
                              +R$50/mês · Total:{" "}
                              {(plan as typeof plan & { pdvPrice?: string }).pdvPrice}/mês
                            </p>
                          )}
                        </div>
                      </div>

                      {/* toggle switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!pdvOn[plan.name]}
                        onClick={() =>
                          setPdvOn((prev) => ({
                            ...prev,
                            [plan.name]: !prev[plan.name],
                          }))
                        }
                        className={[
                          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          pdvOn[plan.name]
                            ? plan.featured
                              ? "bg-primary-foreground/80"
                              : plan.premium
                                ? "bg-background/70"
                                : "bg-primary"
                            : plan.featured || plan.premium
                              ? "bg-primary-foreground/20"
                              : "bg-muted-foreground/30",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "pointer-events-none inline-block h-5 w-5 rounded-full shadow-md ring-0 transition-transform duration-200",
                            plan.featured
                              ? pdvOn[plan.name]
                                ? "translate-x-5 bg-primary"
                                : "translate-x-0 bg-primary-foreground/60"
                              : plan.premium
                                ? pdvOn[plan.name]
                                  ? "translate-x-5 bg-foreground"
                                  : "translate-x-0 bg-background/50"
                                : pdvOn[plan.name]
                                  ? "translate-x-5 bg-white"
                                  : "translate-x-0 bg-white",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Link
                to={plan.ctaTo}
                className={[
                  "mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition",
                  plan.featured
                    ? "bg-background text-foreground hover:opacity-90"
                    : plan.premium
                      ? "bg-background text-foreground hover:opacity-90"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                ].join(" ")}
              >
                {plan.cta}
              </Link>

              <p
                className={[
                  "mt-3 text-xs",
                  plan.featured || plan.premium
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {plan.name === "Free"
                  ? "Ideal para validar sua operação sem compromisso."
                  : plan.name === "Pro"
                    ? "Melhor equilíbrio entre preço, automação e controle."
                    : plan.name === "Full"
                      ? "Mais liberdade para expandir a operação com segurança."
                      : "Perfeito para sair das planilhas e ganhar agilidade."}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Mais controle</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Atualize estoque com menos trabalho e reduza erros no dia a dia.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Mais vendas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use WhatsApp, alertas e catálogo organizado para não perder oportunidades.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Mais clareza</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja relatórios e tome decisões melhores sem depender de planilhas.
            </p>
          </div>
        </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Quem usa, recomenda 💚
          </h2>
          <p className="mt-3 text-muted-foreground">
            Histórias reais de lojistas que decolaram com a Armazix.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "Carolina M.",
              s: "Café da Carol",
              a: "https://i.pravatar.cc/120?img=47",
              t: "Em 1 semana já tinha pedidos chegando todo dia. Mais fácil que postar no Insta!",
            },
            {
              n: "Rafael S.",
              s: "Brownies do Rafa",
              a: "https://i.pravatar.cc/120?img=12",
              t: "Saí da planilha do WhatsApp pra um link bonito que envio pros clientes. Mudou meu negócio.",
            },
            {
              n: "Júlia P.",
              s: "Ateliê Flora",
              a: "https://i.pravatar.cc/120?img=32",
              t: "O painel é muito intuitivo. Cadastro produtos do celular em 1 minuto.",
            },
          ].map((d) => (
            <div
              key={d.n}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center gap-1 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm text-foreground">"{d.t}"</p>
              <div className="mt-5 flex items-center gap-3">
                <img
                  src={d.a}
                  alt={d.n}
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold">{d.n}</div>
                  <div className="text-xs text-muted-foreground">{d.s}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA with image */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-md)]">
            <img
              src={productsImg}
              alt="Produtos artesanais expostos para venda online"
              loading="lazy"
              width={1280}
              height={896}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Pronto para abrir sua loja?
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Crie sua conta, monte seu catálogo e comece a vender hoje mesmo. Sem
              cartão de crédito, sem complicação.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground shadow-md transition hover:opacity-90"
              >
                Criar minha loja grátis
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-border bg-card px-6 py-3 font-medium text-foreground transition hover:bg-muted"
              >
                Entrar
              </Link>
            </div>
            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Link público da sua loja",
                "Carrinho e checkout incluso",
                "Estoque automático",
                "Suporte em português",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Armazix — Plataforma multiloja.
      </footer>
    </div>
  );
}
