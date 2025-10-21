export async function manualRefund(remboursementId: string, forceRefund: boolean, token: string) {
  const response = await fetch("http://192.168.1.131:3000/api/admin/manual-refund", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` // si tu utilises un token d'authentification
    },
    body: JSON.stringify({ remboursementId, forceRefund })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}