export async function createStripeAccount(prestataire_id: string, email: string): Promise<{ url: string }> {
  const response = await fetch("http://192.168.1.131:3000/api/stripe/create-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prestataire_id, email })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}