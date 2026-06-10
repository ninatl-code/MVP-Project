import { 
    CheckCircle, XCircle, Clock3,Eye
} from 'lucide-react';

export const STATUTS_DEVIS = {
  envoye:    { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-700', icon: Clock3, description: 'Le client doit accepter le devis' },
  accepte: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: CheckCircle, description: 'Votre devis a été accepté' },
  expire: { label: 'Expiré', color: 'bg-blue-100 text-blue-700', icon: CheckCircle, description: 'Le devis a été expiré' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircle, description: 'Le devis a été refusé' },
  lu: { label: 'Lu', color: 'bg-gray-100 text-gray-700', icon: Eye, description: 'Le devis a été lu par le client' },
};

export const STATUTS_RESERVATION = {
  pending:    { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-700', icon: Clock3, description: 'Le prestataire doit confirmer la réservation' },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: CheckCircle, description: 'Votre réservation est confirmée' },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle, description: 'La prestation a été effectuée' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle, description: 'Cette réservation a été annulée' },
};

export const STATUTS_DEMANDE ={
  ouverte:    { label: 'Ouvert', color: 'bg-yellow-100 text-yellow-700', icon: Clock3, description: 'Un prestataire répondra à votre demande bientôt' },
  pourvue: { label: 'Pourvue', color: 'bg-green-100 text-green-700', icon: CheckCircle, description: 'Votre demande a été pourvue' },
  expiree: { label: 'Expirée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle, description: 'Votre demande a expiré' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle, description: 'Votre demande a été annulée' },
  en_cours: { label: 'En cours', color: 'bg-gray-100 text-gray-700', icon: Eye, description: 'La demande est en cours' },
};