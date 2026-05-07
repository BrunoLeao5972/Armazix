type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function requireEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY nao configurada no servidor.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM nao configurado no servidor.");
  }

  return { apiKey, from };
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const { apiKey, from } = requireEmailEnv();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao enviar e-mail (${res.status}): ${errText}`);
  }
}
