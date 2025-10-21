export async function createStripeCheckout(params: {
  annonce_id: string;
  montant_acompte: number;
  user_id: string;
  email: string;
  reservation_id?: string;
}): Promise<{ sessionId: string; url: string }> {
  const response = await fetch("http://192.168.1.131:3000/api/stripe/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}