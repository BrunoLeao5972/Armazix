import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  normalizeStore,
  type AddressInfo,
  type BusinessHour,
  type DeliveryFee,
  type PixKeyType,
  type StoreBanner,
  useTenant,
} from "@/lib/store";
import { useCurrentStore } from "./admin";

export const Route = createFileRoute("/admin/configuracoes")({
  component: SettingsPage,
});

type SettingsCategory = "dados" | "horarios" | "pagamentos" | "entrega" | "adicionais";

type ImageCropState =
  | {
      kind: "logo";
      imageSrc: string;
      aspect: number;
      title: string;
      description: string;
      outputWidth: number;
      outputHeight: number;
    }
  | {
      kind: "banner";
      bannerIndex: number;
      imageSrc: string;
      aspect: number;
      title: string;
      description: string;
      outputWidth: number;
      outputHeight: number;
    };

function SettingsPage() {
  const rawStore = useCurrentStore();
  const store = useMemo(() => normalizeStore(rawStore), [rawStore]);
  const updateStore = useTenant((s) => s.updateStore);
  const stores = useTenant((s) => s.stores);
  const [form, setForm] = useState(() => normalizeStore(rawStore));
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("dados");
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepLookupMessage, setCepLookupMessage] = useState<string | null>(null);
  const [imageCropState, setImageCropState] = useState<ImageCropState | null>(null);
  const [showDeliveryFeesMenu, setShowDeliveryFeesMenu] = useState(false);
  const pixKeyPlaceholder = getPixKeyPlaceholder(form.payments.pixKeyType);
  const prevStoreIdRef = useRef(store.id);

  // Sincronizar form apenas quando mudar de loja (não a cada mudança de dados)
  useEffect(() => {
    if (store.id !== prevStoreIdRef.current) {
      setForm(normalizeStore(rawStore));
      prevStoreIdRef.current = store.id;
      setCepLookupMessage(null);
    }
  }, [rawStore, store.id]);

  useEffect(() => {
    const cepDigits = onlyDigits(form.addressInfo.cep);

    if (cepDigits.length !== 8) {
      setCepLookupMessage(null);
      return;
    }

    let cancelled = false;
    setCepLookupLoading(true);
    setCepLookupMessage(null);

    void fetchAddressByCep(cepDigits)
      .then((data) => {
        if (cancelled) return;

        if (!data) {
          setCepLookupMessage("CEP nao encontrado. Confira os numeros digitados.");
          return;
        }

        setForm((prev) => ({
          ...prev,
          addressInfo: {
            ...prev.addressInfo,
            street: data.street || prev.addressInfo.street,
            city: data.city || prev.addressInfo.city,
            state: data.state || prev.addressInfo.state,
          },
        }));

        setErrors((prev) => {
          const next = { ...prev };
          delete next.cep;
          delete next.street;
          delete next.city;
          delete next.state;
          return next;
        });

        setCepLookupMessage("Endereco preenchido automaticamente pelo CEP.");
      })
      .catch(() => {
        if (cancelled) return;
        setCepLookupMessage("Nao foi possivel consultar o CEP agora. Tente novamente.");
      })
      .finally(() => {
        if (cancelled) return;
        setCepLookupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.addressInfo.cep]);

  const setHour = (index: number, patch: Partial<BusinessHour>) => {
    setForm((prev) => ({
      ...prev,
      businessHours: prev.businessHours.map((h, i) =>
        i === index ? { ...h, ...patch } : h,
      ),
    }));
  };

  const setAddress = (patch: Partial<AddressInfo>) => {
    setForm((prev) => ({
      ...prev,
      addressInfo: { ...prev.addressInfo, ...patch },
    }));
  };

  const setPhone = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((p, i) => (i === index ? formatPhone(value) : p)),
    }));
  };

  const addPhone = () => {
    setForm((prev) => ({
      ...prev,
      phones: [...prev.phones, ""],
    }));
  };

  const removePhone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  };

  const setDeliveryFee = (index: number, patch: Partial<DeliveryFee>) => {
    setForm((prev) => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        fees: prev.delivery.fees.map((f, i) =>
          i === index ? { ...f, ...patch } : f,
        ),
      },
    }));
  };

  const addDeliveryFee = () => {
    setForm((prev) => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        fees: [...prev.delivery.fees, { label: "Nova area", fee: 0 }],
      },
    }));
  };

  const removeDeliveryFee = (index: number) => {
    setForm((prev) => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        fees: prev.delivery.fees.filter((_, i) => i !== index),
      },
    }));
  };

  const onPixQrChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, pixQrCode: "Envie uma imagem valida." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({
          ...prev,
          payments: { ...prev.payments, pixQrCode: result },
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.pixQrCode;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const onLogoChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, logoUrl: "Envie uma imagem valida para a logomarca." }));
      return;
    }
    try {
      const imageSrc = await readFileAsDataUrl(file);
      setImageCropState({
        kind: "logo",
        imageSrc,
        aspect: 1,
        title: "Ajustar logomarca",
        description: "Recorte a imagem no formato quadrado para ela aparecer corretamente no perfil da loja.",
        outputWidth: 512,
        outputHeight: 512,
      });
    } catch {
      setErrors((prev) => ({ ...prev, logoUrl: "Nao foi possivel carregar a imagem da logomarca." }));
    }
  };

  const setBanner = (index: number, patch: Partial<StoreBanner>) => {
    setForm((prev) => ({
      ...prev,
      banners: prev.banners.map((banner, i) => (i === index ? { ...banner, ...patch } : banner)),
    }));
  };

  const addBanner = () => {
    setForm((prev) => {
      if (prev.banners.length >= 3) return prev;
      return {
        ...prev,
        banners: [
          ...prev.banners,
          {
            imageUrl: "",
            title: "Novo banner",
            subtitle: "Configure titulo e subtitulo",
            autoAdvanceSeconds: 5,
          },
        ],
      };
    });
  };

  const removeBanner = (index: number) => {
    setForm((prev) => ({
      ...prev,
      banners: prev.banners.filter((_, i) => i !== index),
    }));
  };

  const onBannerImageChange = async (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, bannerImage: "Envie uma imagem valida para o banner." }));
      return;
    }
    try {
      const imageSrc = await readFileAsDataUrl(file);
      setImageCropState({
        kind: "banner",
        bannerIndex: index,
        imageSrc,
        aspect: 3.2 / 1,
        title: `Ajustar banner ${index + 1}`,
        description: "Recorte a imagem no formato horizontal do banner para ela aparecer corretamente no site.",
        outputWidth: 1600,
        outputHeight: 500,
      });
    } catch {
      setErrors((prev) => ({ ...prev, bannerImage: "Nao foi possivel carregar a imagem do banner." }));
    }
  };

  const applyCroppedImage = (croppedImage: string) => {
    if (!imageCropState) return;

    if (imageCropState.kind === "logo") {
      setForm((prev) => ({
        ...prev,
        logoUrl: croppedImage,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.logoUrl;
        return next;
      });
    }

    if (imageCropState.kind === "banner") {
      setBanner(imageCropState.bannerIndex, { imageUrl: croppedImage });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.bannerImage;
        delete next.banners;
        return next;
      });
    }

    setImageCropState(null);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const taxDigits = onlyDigits(form.taxId);
    const cepDigits = onlyDigits(form.addressInfo.cep);
    const validPhones = form.phones.filter((p) => p.trim().length > 0);

    if (form.name.trim().length < 3) {
      nextErrors.name = "Informe o nome do estabelecimento com pelo menos 3 caracteres.";
    }
    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) {
      nextErrors.slug = "Informe um link valido para a loja.";
    } else if (
      stores.some((candidate) =>
        candidate.id !== store.id && candidate.slug === cleanSlug,
      )
    ) {
      nextErrors.slug = "Este link da loja ja esta em uso.";
    }
    if (taxDigits.length !== 11 && taxDigits.length !== 14) {
      nextErrors.taxId = "Informe um CPF (11 digitos) ou CNPJ (14 digitos).";
    }
    if (cepDigits.length !== 8) {
      nextErrors.cep = "Informe um CEP valido com 8 digitos.";
    }
    if (form.addressInfo.street.trim().length < 3) {
      nextErrors.street = "Informe o endereco.";
    }
    if (form.addressInfo.number.trim().length < 1) {
      nextErrors.number = "Informe o numero.";
    }
    if (form.addressInfo.city.trim().length < 2) {
      nextErrors.city = "Informe a cidade.";
    }
    if (form.addressInfo.state.trim().length !== 2) {
      nextErrors.state = "Informe o estado com 2 letras (UF).";
    }
    if (form.description.length > 250) {
      nextErrors.description = "A descricao pode ter no maximo 250 caracteres.";
    }
    if (validPhones.length === 0) {
      nextErrors.phones = "Cadastre ao menos um telefone.";
    } else {
      const invalidPhone = validPhones.some((p) => {
        const digits = onlyDigits(p);
        return digits.length !== 10 && digits.length !== 11;
      });
      if (invalidPhone) {
        nextErrors.phones = "Revise os telefones: use DDD + numero (10 ou 11 digitos).";
      }
    }
    if (!form.delivery.pickup && !form.delivery.localDelivery) {
      nextErrors.deliveryType = "Selecione ao menos um tipo de entrega.";
    }
    if (form.delivery.localDelivery) {
      if (form.delivery.fees.length === 0) {
        nextErrors.deliveryFees = "Cadastre pelo menos uma taxa de entrega.";
      }
      const invalidFee = form.delivery.fees.some(
        (f) => f.label.trim().length < 2 || Number.isNaN(Number(f.fee)) || Number(f.fee) < 0,
      );
      if (invalidFee) {
        nextErrors.deliveryFees = "Revise as areas e valores das taxas de entrega.";
      }
    }

    const hasOpenDay = form.businessHours.some((h) => !h.closed);
    if (!hasOpenDay) {
      nextErrors.businessHours = "Defina ao menos um dia de funcionamento.";
    }
    const invalidHour = form.businessHours.some((h) => {
      if (h.closed) return false;

      if (!h.open || !h.close || h.open >= h.close) {
        return true;
      }

      if (!h.hasBreak) {
        return false;
      }

      if (!h.breakStart || !h.breakEnd) {
        return true;
      }

      return !(h.open < h.breakStart && h.breakStart < h.breakEnd && h.breakEnd < h.close);
    });
    if (invalidHour) {
      nextErrors.businessHours =
        "Revise os horarios: abertura menor que fechamento e intervalo dentro do expediente.";
    }

    const hasPayment =
      form.payments.pix ||
      form.payments.cash ||
      form.payments.credit ||
      form.payments.debit;
    if (!hasPayment) {
      nextErrors.payments = "Selecione ao menos uma forma de pagamento.";
    }
    if (form.payments.pix) {
      if (!form.payments.pixKey.trim() && !form.payments.pixQrCode) {
        nextErrors.pixKey = "Informe a chave Pix ou envie o QR Code.";
      }

      if (form.payments.pixKey.trim()) {
        const pixDigits = onlyDigits(form.payments.pixKey);

        if (form.payments.pixKeyType === "cpf" && pixDigits.length !== 11) {
          nextErrors.pixKey = "CPF Pix invalido. Informe 11 digitos.";
        }

        if (form.payments.pixKeyType === "cnpj" && pixDigits.length !== 14) {
          nextErrors.pixKey = "CNPJ Pix invalido. Informe 14 digitos.";
        }

        if (
          form.payments.pixKeyType === "phone" &&
          pixDigits.length !== 10 &&
          pixDigits.length !== 11
        ) {
          nextErrors.pixKey = "Telefone Pix invalido. Use DDD + numero (10 ou 11 digitos).";
        }

        if (
          form.payments.pixKeyType === "email" &&
          !/^\S+@\S+\.\S+$/.test(form.payments.pixKey)
        ) {
          nextErrors.pixKey = "E-mail Pix invalido.";
        }
      }

      if (!form.payments.pixBank.trim()) {
        nextErrors.pixBank = "Informe o banco do recebedor.";
      }
      if (!form.payments.pixReceiverName.trim()) {
        nextErrors.pixReceiverName = "Informe o nome do recebedor.";
      }

    }

    if (form.banners.length > 3) {
      nextErrors.banners = "Configure no maximo 3 banners.";
    }
    const invalidBanner = form.banners.some(
      (banner) =>
        banner.title.trim().length < 3 ||
        banner.subtitle.trim().length < 3 ||
        !banner.imageUrl.trim() ||
        Number.isNaN(Number(banner.autoAdvanceSeconds)) ||
        Number(banner.autoAdvanceSeconds) < 2 ||
        Number(banner.autoAdvanceSeconds) > 30,
    );
    if (invalidBanner) {
      nextErrors.banners = "Revise banners: titulo, subtitulo, imagem e tempo (2 a 30 segundos).";
    }

    return nextErrors;
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    updateStore(store.id, {
      name: form.name,
      logoUrl: form.logoUrl,
      banners: form.banners,
      slug: slugify(form.slug),
      taxId: form.taxId,
      cnpj: form.taxId,
      address: buildAddressLabel(form.addressInfo),
      addressInfo: {
        ...form.addressInfo,
        cep: formatCep(form.addressInfo.cep),
        state: form.addressInfo.state.toUpperCase(),
      },
      description: form.description,
      businessHours: form.businessHours,
      phones: form.phones.filter((p) => p.trim().length > 0),
      whatsapp: form.phones.find((p) => p.trim().length > 0) ?? "",
      delivery: {
        ...form.delivery,
        fee: form.delivery.fees[0]?.fee ?? form.delivery.fee,
      },
      payments: {
        ...form.payments,
        card: form.payments.credit || form.payments.debit,
      },
      pdvEnabled: form.pdvAccess ? form.pdvEnabled : false,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
      <div>
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-sm text-muted-foreground">
            Organize sua loja por categoria e aproveite melhor a area de edicao.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categorias</p>
            {saved && <p className="text-xs font-medium text-primary">Salvo com sucesso.</p>}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveCategory("dados")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeCategory === "dados" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Dados do estabelecimento
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("horarios")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeCategory === "horarios" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Horarios
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("pagamentos")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeCategory === "pagamentos" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Formas de pagamento
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("entrega")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeCategory === "entrega" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Taxas de entrega
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("adicionais")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeCategory === "adicionais" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              Configuracoes adicionais
            </button>
          </div>
        </div>

        <section className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          {activeCategory === "dados" && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <h2 className="text-base font-semibold">Dados do estabelecimento</h2>
                <p className="mt-1 text-sm text-muted-foreground">Defina identidade visual e informacoes principais da loja.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium">Logomarca</p>
                  <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logomarca da loja" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma logomarca enviada</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tamanho ideal: 512 x 512 px, formato quadrado, para aparecer corretamente no perfil da loja.
                  </p>
                  {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl}</p>}
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-xs"
                    >
                      Remover logomarca
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <Field
                    label="Nome do estabelecimento"
                    value={form.name}
                    onChange={(v) =>
                      setForm((prev) => {
                        const previousAutoSlug = slugify(prev.name);
                        const shouldSyncSlug = !prev.slug || prev.slug === previousAutoSlug;

                        return {
                          ...prev,
                          name: v,
                          slug: shouldSyncSlug ? slugify(v) : prev.slug,
                        };
                      })
                    }
                    error={errors.name}
                  />

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Subdominio da loja</span>
                    <div className="flex items-center rounded-md border border-input bg-background pl-3">
                      <span className="text-sm text-muted-foreground">https://</span>
                      <input
                        value={form.slug}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            slug: slugify(e.target.value),
                          }))
                        }
                        className="flex-1 bg-transparent px-2 py-2 outline-none"
                      />
                      <span className="pr-3 text-sm text-muted-foreground">.armazix.com.br</span>
                    </div>
                    {errors.slug && <span className="text-xs text-destructive">{errors.slug}</span>}
                  </label>

                  <Field
                    label="CPF ou CNPJ"
                    value={form.taxId}
                    onChange={(v) => setForm({ ...form, taxId: formatTaxId(v) })}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    error={errors.taxId}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                <h3 className="font-medium">Endereco</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">CEP</span>
                    <input
                      value={form.addressInfo.cep}
                      onChange={(e) => setAddress({ cep: formatCep(e.target.value) })}
                      placeholder="00000-000"
                      className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
                    />
                    {errors.cep && <span className="text-xs text-destructive">{errors.cep}</span>}
                    {!errors.cep && cepLookupLoading && (
                      <span className="text-xs text-muted-foreground">Consultando CEP...</span>
                    )}
                    {!errors.cep && !cepLookupLoading && cepLookupMessage && (
                      <span className="text-xs text-muted-foreground">{cepLookupMessage}</span>
                    )}
                  </label>
                  <Field
                    label="Endereco"
                    value={form.addressInfo.street}
                    onChange={(v) => setAddress({ street: v })}
                    error={errors.street}
                  />
                  <Field
                    label="Numero"
                    value={form.addressInfo.number}
                    onChange={(v) => setAddress({ number: v })}
                    error={errors.number}
                  />
                  <Field
                    label="Cidade"
                    value={form.addressInfo.city}
                    onChange={(v) => setAddress({ city: v })}
                    error={errors.city}
                  />
                  <Field
                    label="Estado"
                    value={form.addressInfo.state}
                    onChange={(v) => setAddress({ state: v.toUpperCase().slice(0, 2) })}
                    placeholder="SP"
                    error={errors.state}
                  />
                  <Field
                    label="Complemento"
                    value={form.addressInfo.complement}
                    onChange={(v) => setAddress({ complement: v })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <label className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-4 text-sm">
                <span className="font-medium">Descricao</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={250}
                  className="rounded-md border border-input bg-card px-3 py-2 outline-none ring-ring focus:ring-2"
                />
                <span className="text-xs text-muted-foreground">{form.description.length}/250 caracteres</span>
                {errors.description && <span className="text-xs text-destructive">{errors.description}</span>}
              </label>

              <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Telefones</h3>
                  <button
                    type="button"
                    onClick={addPhone}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Adicionar telefone
                  </button>
                </div>
                <div className="space-y-2">
                  {form.phones.map((phone, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={phone}
                        onChange={(e) => setPhone(index, e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                      />
                      <button
                        type="button"
                        onClick={() => removePhone(index)}
                        disabled={form.phones.length <= 1}
                        className="rounded-md border border-border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                {errors.phones && <p className="text-xs text-destructive">{errors.phones}</p>}
              </div>
            </>
          )}

          {activeCategory === "horarios" && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <h2 className="text-base font-semibold">Horarios</h2>
                <p className="mt-1 text-sm text-muted-foreground">Defina os dias e horarios de funcionamento da loja.</p>
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                {form.businessHours.map((h, index) => (
                  <div
                    key={h.day}
                    className="space-y-3 rounded-md border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="min-w-[130px] text-sm font-medium">{h.day}</div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={h.closed}
                          onChange={(e) =>
                            setHour(index, {
                              closed: e.target.checked,
                              hasBreak: e.target.checked ? false : h.hasBreak,
                            })
                          }
                          className="h-4 w-4 accent-[var(--primary)]"
                        />
                        Fechado
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={h.closed}
                          checked={h.hasBreak}
                          onChange={(e) => setHour(index, { hasBreak: e.target.checked })}
                          className="h-4 w-4 accent-[var(--primary)]"
                        />
                        Intervalo
                      </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span>Abre</span>
                        <input
                          type="time"
                          disabled={h.closed}
                          value={h.open}
                          onChange={(e) => setHour(index, { open: e.target.value })}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 disabled:opacity-60"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span>Fecha</span>
                        <input
                          type="time"
                          disabled={h.closed}
                          value={h.close}
                          onChange={(e) => setHour(index, { close: e.target.value })}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 disabled:opacity-60"
                        />
                      </label>
                    </div>

                    {h.hasBreak && !h.closed && (
                      <div className="space-y-2 rounded-md border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Horario de intervalo</p>
                        <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>Inicio do intervalo</span>
                            <input
                              type="time"
                              value={h.breakStart}
                              onChange={(e) => setHour(index, { breakStart: e.target.value })}
                              className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>Fim do intervalo</span>
                            <input
                              type="time"
                              value={h.breakEnd}
                              onChange={(e) => setHour(index, { breakEnd: e.target.value })}
                              className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.open} as {h.breakStart} / {h.breakEnd} as {h.close}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {errors.businessHours && <p className="text-xs text-destructive">{errors.businessHours}</p>}
            </>
          )}

          {activeCategory === "pagamentos" && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <h2 className="text-base font-semibold">Formas de pagamento</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ative os meios de pagamento aceitos na sua loja.</p>
              </div>
              <div className="space-y-2 text-sm">
                <Toggle
                  label="Pix"
                  checked={form.payments.pix}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      payments: { ...form.payments, pix: v },
                    })
                  }
                />
                <Toggle
                  label="Dinheiro"
                  checked={form.payments.cash}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      payments: { ...form.payments, cash: v },
                    })
                  }
                />
                <Toggle
                  label="Cartao de credito"
                  checked={form.payments.credit}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      payments: { ...form.payments, credit: v },
                    })
                  }
                />
                <Toggle
                  label="Cartao de debito"
                  checked={form.payments.debit}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      payments: { ...form.payments, debit: v },
                    })
                  }
                />

                {form.payments.pix && (
                  <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">Tipo da chave Pix</span>
                      <select
                        value={form.payments.pixKeyType}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            payments: {
                              ...form.payments,
                              pixKeyType: e.target.value as PixKeyType,
                              pixKey: formatPixKeyByType(
                                form.payments.pixKey,
                                e.target.value as PixKeyType,
                              ),
                            },
                          })
                        }
                        className="rounded-md border border-input bg-card px-3 py-2 outline-none ring-ring focus:ring-2"
                      >
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Chave aleatoria</option>
                      </select>
                    </label>
                    <Field
                      label="Banco"
                      value={form.payments.pixBank}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          payments: { ...form.payments, pixBank: v },
                        })
                      }
                      placeholder="Ex.: Nubank, Inter, Caixa"
                      error={errors.pixBank}
                    />
                    <Field
                      label="Chave Pix"
                      value={form.payments.pixKey}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          payments: {
                            ...form.payments,
                            pixKey: formatPixKeyByType(v, form.payments.pixKeyType),
                          },
                        })
                      }
                      placeholder={pixKeyPlaceholder}
                      error={errors.pixKey}
                    />
                    <Field
                      label="Nome do recebedor"
                      value={form.payments.pixReceiverName}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          payments: { ...form.payments, pixReceiverName: v },
                        })
                      }
                      placeholder="Nome do titular da chave"
                      error={errors.pixReceiverName}
                    />
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">QR Code da chave Pix</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPixQrChange(e.target.files?.[0] ?? null)}
                        className="rounded-md border border-input bg-card px-3 py-2"
                      />
                      {errors.pixQrCode && <span className="text-xs text-destructive">{errors.pixQrCode}</span>}
                    </label>

                    {form.payments.pixQrCode && (
                      <div className="space-y-2">
                        <img
                          src={form.payments.pixQrCode}
                          alt="QR Code Pix"
                          className="h-32 w-32 rounded-md border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              payments: { ...form.payments, pixQrCode: "" },
                            })
                          }
                          className="rounded-md border border-border px-3 py-1.5 text-xs"
                        >
                          Remover QR Code
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {errors.payments && <p className="text-xs text-destructive">{errors.payments}</p>}
              </div>
            </>
          )}

          {activeCategory === "entrega" && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <h2 className="text-base font-semibold">Taxas de entrega</h2>
                <p className="mt-1 text-sm text-muted-foreground">Configure retirada, entrega local e taxas por bairro.</p>
              </div>

              <div className="space-y-2 text-sm">
                <Toggle
                  label="Retirada no local"
                  checked={form.delivery.pickup}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      delivery: { ...form.delivery, pickup: v },
                    })
                  }
                />
                <Toggle
                  label="Entrega"
                  checked={form.delivery.localDelivery}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      delivery: { ...form.delivery, localDelivery: v },
                    })
                  }
                />
                {errors.deliveryType && <p className="text-xs text-destructive">{errors.deliveryType}</p>}

                {form.delivery.localDelivery && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <button
                      type="button"
                      onClick={() => setShowDeliveryFeesMenu((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-md bg-card px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span>Menu de taxas por bairro</span>
                      <span>{showDeliveryFeesMenu ? "Ocultar" : "Mostrar"}</span>
                    </button>

                    {showDeliveryFeesMenu && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Taxas de entrega por bairro</p>
                          <button
                            type="button"
                            onClick={addDeliveryFee}
                            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            Adicionar taxa
                          </button>
                        </div>

                        {form.delivery.fees.map((fee, index) => (
                          <div key={`${fee.label}-${index}`} className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
                            <input
                              value={fee.label}
                              onChange={(e) => setDeliveryFee(index, { label: e.target.value })}
                              placeholder="Ex.: Centro"
                              className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={String(fee.fee)}
                              onChange={(e) => setDeliveryFee(index, { fee: Number(e.target.value) })}
                              className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                            />
                            <button
                              type="button"
                              onClick={() => removeDeliveryFee(index)}
                              disabled={form.delivery.fees.length <= 1}
                              className="rounded-md border border-border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </div>
                        ))}

                        {errors.deliveryFees && <p className="text-xs text-destructive">{errors.deliveryFees}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeCategory === "adicionais" && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <h2 className="text-base font-semibold">Configuracoes adicionais</h2>
                <p className="mt-1 text-sm text-muted-foreground">Recursos extras da operacao da loja.</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="mb-2 font-medium">Ponto de venda (PDV)</h3>
                <div className="space-y-2 text-sm">
                  <Toggle
                    label="Habilitar modulo PDV na loja"
                    checked={form.pdvAccess && form.pdvEnabled}
                    disabled={!form.pdvAccess}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        pdvEnabled: v,
                      })
                    }
                  />

                  {form.pdvAccess ? (
                    <p className="text-xs text-primary">PDV liberado e pronto para uso nesta loja.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      PDV bloqueado. Ative o adicional em{" "}
                      <Link
                        to="/admin/plano"
                        search={{
                          collection_status: undefined,
                          external_reference: undefined,
                          payment_id: undefined,
                        }}
                        className="font-medium text-primary hover:underline"
                      >
                        Assinatura
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-medium">Banners da loja publica</h3>
                  <button
                    type="button"
                    onClick={addBanner}
                    disabled={form.banners.length >= 3}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Adicionar banner
                  </button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Configure ate 3 banners e o tempo de exibicao automatica de cada um. Se preferir, deixe sem banner.
                </p>

                <div className="space-y-4">
                  {form.banners.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
                      <p className="text-sm font-medium text-foreground">Nenhum banner configurado</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        O banner e opcional. Se quiser exibir no site, clique em Adicionar banner.
                      </p>
                    </div>
                  )}

                  {form.banners.map((banner, index) => (
                    <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Banner {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeBanner(index)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-border bg-background">
                        <div className="relative aspect-[3.2/1] min-h-[150px] w-full">
                          <img
                            src={banner.imageUrl}
                            alt={`Preview do banner ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                          <div className="absolute bottom-4 left-4 max-w-[70%] text-white">
                            <h4 className="text-2xl font-black leading-tight sm:text-4xl">{banner.title}</h4>
                            <p className="mt-1 text-sm text-white/90 sm:text-lg">{banner.subtitle}</p>
                          </div>
                        </div>
                      </div>

                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">Foto do banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onBannerImageChange(index, e.target.files?.[0] ?? null)}
                          className="rounded-md border border-input bg-background px-3 py-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          Tamanho ideal: 1600 x 500 px, formato horizontal 3.2:1, para aparecer corretamente no banner do site.
                        </span>
                      </label>

                      <Field
                        label="Titulo do banner"
                        value={banner.title}
                        onChange={(v) => setBanner(index, { title: v })}
                        placeholder="Ex.: Combos Inteligentes"
                      />

                      <Field
                        label="Subtitulo do banner"
                        value={banner.subtitle}
                        onChange={(v) => setBanner(index, { subtitle: v })}
                        placeholder="Ex.: Sugestoes prontas para seu carrinho render mais"
                      />

                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">Tempo de exibicao (segundos)</span>
                        <input
                          type="number"
                          min="2"
                          max="30"
                          value={String(banner.autoAdvanceSeconds)}
                          onChange={(e) =>
                            setBanner(index, {
                              autoAdvanceSeconds: Math.max(2, Math.min(30, Number(e.target.value) || 2)),
                            })
                          }
                          className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
                        />
                      </label>
                    </div>
                  ))}

                  {(errors.bannerImage || errors.banners) && (
                    <p className="text-xs text-destructive">{errors.bannerImage ?? errors.banners}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-2">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Salvar alteracoes
            </button>
            {saved && <span className="text-sm text-primary">Salvo com sucesso!</span>}
          </div>
        </section>
      </form>

      <ImageCropDialog
        open={imageCropState !== null}
        imageSrc={imageCropState?.imageSrc ?? null}
        aspect={imageCropState?.aspect ?? 1}
        title={imageCropState?.title ?? "Ajustar imagem"}
        description={imageCropState?.description}
        outputWidth={imageCropState?.outputWidth ?? 512}
        outputHeight={imageCropState?.outputHeight ?? 512}
        onOpenChange={(open) => {
          if (!open) setImageCropState(null);
        }}
        onConfirm={applyCroppedImage}
      />
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
      />
      {props.error && <span className="text-xs text-destructive">{props.error}</span>}
    </label>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatTaxId(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

type CepLookupResult = {
  street: string;
  city: string;
  state: string;
};

async function fetchAddressByCep(cepDigits: string): Promise<CepLookupResult | null> {
  const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
  if (!res.ok) {
    throw new Error("Falha na consulta de CEP");
  }

  const data = (await res.json()) as {
    erro?: boolean;
    logradouro?: string;
    localidade?: string;
    uf?: string;
  };

  if (data.erro) {
    return null;
  }

  return {
    street: String(data.logradouro ?? "").trim(),
    city: String(data.localidade ?? "").trim(),
    state: String(data.uf ?? "").trim().toUpperCase(),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Falha ao carregar imagem."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function buildAddressLabel(addressInfo: AddressInfo) {
  const base = [addressInfo.street, addressInfo.number, addressInfo.city, addressInfo.state]
    .filter((v) => v.trim().length > 0)
    .join(", ");
  if (addressInfo.complement.trim().length > 0) {
    return `${base} - ${addressInfo.complement}`;
  }
  return base;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPixKeyPlaceholder(pixKeyType: PixKeyType) {
  if (pixKeyType === "cpf") return "000.000.000-00";
  if (pixKeyType === "cnpj") return "00.000.000/0000-00";
  if (pixKeyType === "phone") return "(11) 99999-9999";
  if (pixKeyType === "email") return "contato@empresa.com";
  return "Cole ou digite a chave aleatória";
}

function formatPixKeyByType(value: string, pixKeyType: PixKeyType) {
  if (pixKeyType === "cpf") {
    return formatCpf(value);
  }

  if (pixKeyType === "cnpj") {
    return formatCnpj(value);
  }

  if (pixKeyType === "phone") {
    return formatPhone(value);
  }

  if (pixKeyType === "email") {
    return value.trim().toLowerCase();
  }

  return value.trim();
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}
