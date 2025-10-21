export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!to || !subject || !html) {
    throw new Error("Missing required fields");
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer YOUR_SENDGRID_API_KEY`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "your@email.com", name: "Plateforme Mariage" },
        subject,
        content: [{ type: "text/html", value: html }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur lors de l'envoi de l'email: ${error}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur envoi email:", error);
    throw error;
  }
}