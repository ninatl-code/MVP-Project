import {
  Calendar,
  MapPin,
  Clock,
  User,
  ChevronRight,
  MessageSquare,
  Check,
  X,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700', icon: Check },
  in_progress: { label: 'En cours', color: 'bg-purple-100 text-purple-700', icon: Clock },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-700', icon: Check },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: X },
  litige: { label: 'Litige', color: 'bg-orange-100 text-orange-700', icon: Clock },
};

export default function ReservationCard({
  reservation,
  onClick,
  onConfirm,
  onRefuse,
  onRequestInfo,
}) {
  const client = reservation.client || {};
  const config = STATUS_CONFIG[reservation.statut] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const rawDate = reservation.date_prestation || reservation.date;
  const date = rawDate ? new Date(rawDate) : null;
  const validDate = date && !isNaN(date);

  const isPending = ['pending', 'en_attente'].includes(reservation.statut);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer"
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden">
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-indigo-300" />
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${config.color}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>

            {validDate && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {date.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}

            {reservation.heure_debut && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {reservation.heure_debut.slice(0, 5)}
              </span>
            )}
          </div>

          <p className="font-semibold text-gray-900 truncate">
            {reservation.titre ||
              reservation.package?.titre ||
              'Prestation photo'}
          </p>

          <p className="text-sm text-gray-500 mt-0.5">
            {client.nom || 'Client'}
            {client.ville && (
              <span className="ml-2 text-gray-300">• {client.ville}</span>
            )}
          </p>

          {(reservation.lieu || reservation.ville) && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {reservation.lieu || reservation.ville}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0">
          {reservation.montant_total != null && (
            <p className="font-bold text-indigo-700 text-lg">
              {reservation.montant_total} MAD
            </p>
          )}

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isPending && (
              <>
                <button
                  onClick={onConfirm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accepter
                </button>

                <button
                  onClick={onRefuse}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100"
                >
                  <X className="w-3.5 h-3.5" />
                  Refuser
                </button>
              </>
            )}

            <button
              onClick={onRequestInfo}
              className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}