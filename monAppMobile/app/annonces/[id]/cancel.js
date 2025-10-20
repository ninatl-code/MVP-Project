import { useRouter } from "next/router";

export default function CancelPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Paiement annulé</h1>
      <p className="text-lg text-gray-700 mb-4">
        Votre paiement a été annulé ou n’a pas abouti.<br />
        Vous pouvez réessayer ou revenir à l’annonce.
      </p>
      <a
        href={`/annonces/${id}`}
        className="mt-6 px-6 py-2 bg-pink-500 text-white rounded-xl shadow hover:bg-pink-600"
      >
        Retour à l'annonce
      </a>
    </div>
  );
}