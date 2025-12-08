export async function refundStripe(params: {
  reservationId: string;
  cancelReason: string;
  userId: string;
}): Promise<any> {
  const response = await fetch("http://192.168.1.131:3000/api/stripe/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

// Export par défaut requis pour Expo Router
export default function RefundStripeAPI() {
  return null; // Ce n'est pas un composant React, juste une fonction utilitaire
}