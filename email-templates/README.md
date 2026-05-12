# Email Templates - Armazix

Banners premium para emails de verificação e reset de senha.

## 📋 Arquivos

### 1. `verification-banner.html`
Banner para email de verificação de conta.
- **Dimensões**: 1200x600px
- **Placeholder**: `{{CODE}}`
- **Título**: "Verifique seu email"

### 2. `password-reset-banner.html`
Banner para email de recuperação de senha.
- **Dimensões**: 1200x600px
- **Placeholder**: `{{CODE}}`
- **Título**: "Recuperação de senha"

## 🎨 Design

- **Cores Primárias**: 
  - Fundo: `#0a0e27` a `#1a1f3a` (gradiente)
  - Accent: `#22c55e` (verde neon)
  - Texto: `#ffffff`

- **Elementos**:
  - Logo Armazix em destaque
  - Box de código centralizado e reutilizável
  - Grid pattern de fundo sutil
  - Elementos flutuantes decorativos
  - Features/benefícios em ícones
  - Design responsivo para mobile

## 🔧 Como Usar

### Substituir o Código Dinamicamente

Nos seus templates de email (Node.js, Python, etc.):

```javascript
// Node.js / JavaScript
const emailHtml = fs.readFileSync('verification-banner.html', 'utf-8');
const customHtml = emailHtml.replace('{{CODE}}', '483921');
```

```python
# Python
with open('verification-banner.html', 'r') as f:
    email_html = f.read()
custom_html = email_html.replace('{{CODE}}', '483921')
```

```php
// PHP
$emailHtml = file_get_contents('verification-banner.html');
$customHtml = str_replace('{{CODE}}', '483921', $emailHtml);
```

### Personalizar Validade do Código

Edite a linha do `code-hint`:

```html
<div class="code-hint">Válido por 30 minutos</div>
```

Para:

```html
<div class="code-hint">Válido por 15 minutos</div>
```

### Ajustar Cores

Todas as cores verde neon (`#22c55e`) podem ser alteradas globalmente:

**Antes:**
```css
border: 2px solid #22c55e;
color: #22c55e;
```

**Depois:**
```css
border: 2px solid #your-color;
color: #your-color;
```

## 📱 Responsividade

Os templates já incluem media queries para:
- Desktop (1200px+)
- Tablet (769px - 1200px)
- Mobile (até 768px)

Em mobile:
- Layout em coluna (vertical)
- Box do código ocupa 100% da largura
- Fonte redimensionada automaticamente
- Mantém legibilidade total

## 🔒 Compatibilidade

- ✅ Gmail
- ✅ Outlook
- ✅ Apple Mail
- ✅ Thunderbird
- ✅ Clientes mobile
- ✅ CSS inline para melhor suporte

## 📝 Notas Importantes

1. **Placeholder**: Deixe `{{CODE}}` exato nos templates. Seus backend systems substituirão por valores reais.

2. **Box do Código**: 
   - Mantido limpo e centralizado intencionalmente
   - Sem efeitos artísticos que dificultem substituição
   - Fácil de customizar depois
   - Alto contraste para leitura em qualquer dispositivo

3. **Performance**:
   - CSS inline minimizado
   - Imagens otimizadas (apenas background gradients)
   - Carrega rápido mesmo em conexões lentas
   - Sem fontes externas (system fonts apenas)

4. **Acessibilidade**:
   - Alto contraste de cores (WCAG AA+)
   - Sem dependências de JavaScript
   - Estrutura semântica HTML5
   - Emojis como decoração (não impactam leitura)

## 🚀 Integração Rápida

### Exemplo com Nodemailer (Node.js)

```javascript
const nodemailer = require('nodemailer');
const fs = require('fs');

const transporter = nodemailer.createTransport({...});

// Para email de verificação
const verificationTemplate = fs.readFileSync('verification-banner.html', 'utf-8');
const verificationHtml = verificationTemplate.replace('{{CODE}}', generatedCode);

await transporter.sendMail({
    from: 'noreply@armazix.com.br',
    to: user.email,
    subject: 'Verifique seu email - Armazix',
    html: verificationHtml,
});

// Para email de reset
const resetTemplate = fs.readFileSync('password-reset-banner.html', 'utf-8');
const resetHtml = resetTemplate.replace('{{CODE}}', resetCode);

await transporter.sendMail({
    from: 'noreply@armazix.com.br',
    to: user.email,
    subject: 'Recuperação de senha - Armazix',
    html: resetHtml,
});
```

## 📧 Testes

Sempre teste os emails em:
1. Gmail (web e app)
2. Outlook (web e desktop)
3. Apple Mail
4. Smartphone (iOS/Android)
5. Tablet

Você pode usar ferramentas como:
- [Email on Acid](https://www.emailonacid.com)
- [Litmus](https://www.litmus.com)
- [Dyspatch](https://www.dyspatch.io)

---

**Versão**: 1.0  
**Data**: 2026-05-12  
**Compatibilidade**: Todos os clientes de email modernos
