[
  {
    "table_name": "abonnements",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "abonnements",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "abonnements",
    "column_name": "plan_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "abonnements",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'actif'::text",
    "ordinal_position": 4
  },
  {
    "table_name": "abonnements",
    "column_name": "date_debut",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "abonnements",
    "column_name": "date_fin",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "abonnements",
    "column_name": "renouvellement_auto",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 7
  },
  {
    "table_name": "abonnements",
    "column_name": "stripe_subscription_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "abonnements",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "abonnements",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 10
  },
  {
    "table_name": "albums_commandes",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "albums_commandes",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "albums_commandes",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "albums_commandes",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "albums_commandes",
    "column_name": "type_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "albums_commandes",
    "column_name": "format_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "albums_commandes",
    "column_name": "nb_pages",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "albums_commandes",
    "column_name": "photos_selectionnees",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "albums_commandes",
    "column_name": "mise_en_page",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "albums_commandes",
    "column_name": "couverture_photo_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "albums_commandes",
    "column_name": "texte_couverture",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "albums_commandes",
    "column_name": "type_couverture",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "albums_commandes",
    "column_name": "type_papier",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "albums_commandes",
    "column_name": "coffret_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 14
  },
  {
    "table_name": "albums_commandes",
    "column_name": "montant_album",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "albums_commandes",
    "column_name": "montant_options",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 16
  },
  {
    "table_name": "albums_commandes",
    "column_name": "frais_expedition",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "table_name": "albums_commandes",
    "column_name": "montant_total",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "albums_commandes",
    "column_name": "adresse_livraison",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "albums_commandes",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'en_conception'::text",
    "ordinal_position": 20
  },
  {
    "table_name": "albums_commandes",
    "column_name": "maquette_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "albums_commandes",
    "column_name": "validee_par_client",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 22
  },
  {
    "table_name": "albums_commandes",
    "column_name": "date_validation_client",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "table_name": "albums_commandes",
    "column_name": "modifications_demandees",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "albums_commandes",
    "column_name": "date_commande",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 25
  },
  {
    "table_name": "albums_commandes",
    "column_name": "date_production",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "albums_commandes",
    "column_name": "date_expedition",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "albums_commandes",
    "column_name": "date_livraison",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "albums_commandes",
    "column_name": "transporteur",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 29
  },
  {
    "table_name": "albums_commandes",
    "column_name": "numero_suivi",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 30
  },
  {
    "table_name": "albums_commandes",
    "column_name": "paiement_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "albums_commandes",
    "column_name": "paye",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 32
  },
  {
    "table_name": "albums_commandes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 33
  },
  {
    "table_name": "albums_commandes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 34
  },
  {
    "table_name": "avis",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "avis",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "avis",
    "column_name": "reviewer_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "avis",
    "column_name": "reviewee_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "avis",
    "column_name": "reviewer_role",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "avis",
    "column_name": "note_globale",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "avis",
    "column_name": "note_qualite",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "avis",
    "column_name": "note_ponctualite",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "avis",
    "column_name": "note_communication",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "avis",
    "column_name": "note_rapport_qualite_prix",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "avis",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "avis",
    "column_name": "commentaire",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "avis",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 13
  },
  {
    "table_name": "avis",
    "column_name": "recommande",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "avis",
    "column_name": "reponse_presta",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "avis",
    "column_name": "reponse_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "avis",
    "column_name": "visible",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 17
  },
  {
    "table_name": "avis",
    "column_name": "signale",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 18
  },
  {
    "table_name": "avis",
    "column_name": "motif_signalement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "avis",
    "column_name": "verifie",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 20
  },
  {
    "table_name": "avis",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 21
  },
  {
    "table_name": "avis",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 22
  },
  {
    "table_name": "blocked_slots",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('blocked_slots_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "blocked_slots",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "blocked_slots",
    "column_name": "start_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "blocked_slots",
    "column_name": "end_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "blocked_slots",
    "column_name": "reason",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "blocked_slots",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "blocked_slots",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 7
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "policy_name",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "policy_type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "refund_rules",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'[]'::jsonb",
    "ordinal_position": 5
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "cancellation_fee_percentage",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 6
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "cancellation_fee_fixed",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 7
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "is_default",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 9
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "is_active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 10
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 11
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 12
  },
  {
    "table_name": "conversations",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('conversations_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "conversations",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "conversations",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "conversations",
    "column_name": "demande_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "conversations",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_text",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_sender_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "conversations",
    "column_name": "unread_count_client",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 9
  },
  {
    "table_name": "conversations",
    "column_name": "unread_count_photographe",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 10
  },
  {
    "table_name": "conversations",
    "column_name": "is_archived_by_client",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 11
  },
  {
    "table_name": "conversations",
    "column_name": "is_archived_by_photographe",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 12
  },
  {
    "table_name": "conversations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 13
  },
  {
    "table_name": "conversations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 14
  },
  {
    "table_name": "demandes_client",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "demandes_client",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "demandes_client",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "demandes_client",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "demandes_client",
    "column_name": "categorie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "demandes_client",
    "column_name": "type_evenement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_personnes",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "demandes_client",
    "column_name": "est_public",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 8
  },
  {
    "table_name": "demandes_client",
    "column_name": "lieu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "demandes_client",
    "column_name": "adresse_complete",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "demandes_client",
    "column_name": "ville",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "demandes_client",
    "column_name": "code_postal",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "demandes_client",
    "column_name": "latitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "demandes_client",
    "column_name": "longitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "demandes_client",
    "column_name": "lieu_exact_requis",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 15
  },
  {
    "table_name": "demandes_client",
    "column_name": "date_souhaitee",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "demandes_client",
    "column_name": "heure_debut",
    "data_type": "time without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "demandes_client",
    "column_name": "heure_fin",
    "data_type": "time without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "demandes_client",
    "column_name": "duree_estimee_heures",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "demandes_client",
    "column_name": "flexibilite_date",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 20
  },
  {
    "table_name": "demandes_client",
    "column_name": "dates_alternatives",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "demandes_client",
    "column_name": "type_prestation",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]",
    "ordinal_position": 22
  },
  {
    "table_name": "demandes_client",
    "column_name": "style_souhaite",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 23
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_photos_souhaitees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_videos_souhaitees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "demandes_client",
    "column_name": "retouche_souhaitee",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 26
  },
  {
    "table_name": "demandes_client",
    "column_name": "niveau_retouche",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "demandes_client",
    "column_name": "livraison_urgente",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 28
  },
  {
    "table_name": "demandes_client",
    "column_name": "delai_livraison_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "14",
    "ordinal_position": 29
  },
  {
    "table_name": "demandes_client",
    "column_name": "modes_livraison_souhaites",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 30
  },
  {
    "table_name": "demandes_client",
    "column_name": "plateforme_livraison_preferee",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "demandes_client",
    "column_name": "livraison_physique_adresse",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 32
  },
  {
    "table_name": "demandes_client",
    "column_name": "tirages_souhaites",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 33
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_tirages",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 34
  },
  {
    "table_name": "demandes_client",
    "column_name": "format_tirages",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 35
  },
  {
    "table_name": "demandes_client",
    "column_name": "type_papier_souhaite",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "demandes_client",
    "column_name": "encadrement_souhaite",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 37
  },
  {
    "table_name": "demandes_client",
    "column_name": "livraison_tirages_adresse",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 38
  },
  {
    "table_name": "demandes_client",
    "column_name": "album_souhaite",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 39
  },
  {
    "table_name": "demandes_client",
    "column_name": "type_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 40
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_pages_album",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 41
  },
  {
    "table_name": "demandes_client",
    "column_name": "format_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 42
  },
  {
    "table_name": "demandes_client",
    "column_name": "format_fichiers_souhaites",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 43
  },
  {
    "table_name": "demandes_client",
    "column_name": "budget_min",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 44
  },
  {
    "table_name": "demandes_client",
    "column_name": "budget_max",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 45
  },
  {
    "table_name": "demandes_client",
    "column_name": "budget_indicatif",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 46
  },
  {
    "table_name": "demandes_client",
    "column_name": "budget_flexible",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 47
  },
  {
    "table_name": "demandes_client",
    "column_name": "monnaie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'EUR'::text",
    "ordinal_position": 48
  },
  {
    "table_name": "demandes_client",
    "column_name": "services_souhaites",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"drone\": false, \"coiffure\": false, \"stylisme\": false, \"maquillage\": false, \"tirage_photos\": false, \"location_studio\": false, \"impression_album\": false}'::jsonb",
    "ordinal_position": 49
  },
  {
    "table_name": "demandes_client",
    "column_name": "contraintes_horaires",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 50
  },
  {
    "table_name": "demandes_client",
    "column_name": "preferences_photographe",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 51
  },
  {
    "table_name": "demandes_client",
    "column_name": "langues_souhaitees",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 52
  },
  {
    "table_name": "demandes_client",
    "column_name": "photos_inspiration",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 53
  },
  {
    "table_name": "demandes_client",
    "column_name": "references_portfolio",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 54
  },
  {
    "table_name": "demandes_client",
    "column_name": "instructions_speciales",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 55
  },
  {
    "table_name": "demandes_client",
    "column_name": "statut",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'ouverte'::statut_demande",
    "ordinal_position": 56
  },
  {
    "table_name": "demandes_client",
    "column_name": "date_limite_reponse",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 57
  },
  {
    "table_name": "demandes_client",
    "column_name": "date_expiration",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 58
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_devis_recus",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 59
  },
  {
    "table_name": "demandes_client",
    "column_name": "nb_devis_lus",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 60
  },
  {
    "table_name": "demandes_client",
    "column_name": "devis_accepte_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 61
  },
  {
    "table_name": "demandes_client",
    "column_name": "photographes_notifies",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::uuid[]",
    "ordinal_position": 62
  },
  {
    "table_name": "demandes_client",
    "column_name": "photographes_interesses",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::uuid[]",
    "ordinal_position": 63
  },
  {
    "table_name": "demandes_client",
    "column_name": "photographes_invites",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::uuid[]",
    "ordinal_position": 64
  },
  {
    "table_name": "demandes_client",
    "column_name": "criteres_matching",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 65
  },
  {
    "table_name": "demandes_client",
    "column_name": "visible_publiquement",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 66
  },
  {
    "table_name": "demandes_client",
    "column_name": "visible_uniquement_invites",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 67
  },
  {
    "table_name": "demandes_client",
    "column_name": "source",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'web'::text",
    "ordinal_position": 68
  },
  {
    "table_name": "demandes_client",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 69
  },
  {
    "table_name": "demandes_client",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 70
  },
  {
    "table_name": "demandes_client",
    "column_name": "fermee_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 71
  },
  {
    "table_name": "demandes_client",
    "column_name": "pourvue_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 72
  },
  {
    "table_name": "demandes_client",
    "column_name": "styles_recherches",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 73
  },
  {
    "table_name": "demandes_client",
    "column_name": "atmosphere",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'natural'::text",
    "ordinal_position": 74
  },
  {
    "table_name": "demandes_client",
    "column_name": "comfort_level",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'neutral'::text",
    "ordinal_position": 75
  },
  {
    "table_name": "demandes_client",
    "column_name": "moodboard_notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 76
  },
  {
    "table_name": "devis",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "devis",
    "column_name": "demande_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "devis",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "devis",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "devis",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "devis",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "devis",
    "column_name": "message_personnalise",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "devis",
    "column_name": "tarif_base",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "devis",
    "column_name": "frais_deplacement",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 9
  },
  {
    "table_name": "devis",
    "column_name": "frais_additionnels",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 10
  },
  {
    "table_name": "devis",
    "column_name": "remise_montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 11
  },
  {
    "table_name": "devis",
    "column_name": "remise_percent",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 12
  },
  {
    "table_name": "devis",
    "column_name": "montant_total",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "devis",
    "column_name": "monnaie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'EUR'::text",
    "ordinal_position": 14
  },
  {
    "table_name": "devis",
    "column_name": "duree_prestation_heures",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "devis",
    "column_name": "nb_photos_livrees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "devis",
    "column_name": "nb_videos_livrees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "table_name": "devis",
    "column_name": "delai_livraison_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "devis",
    "column_name": "retouches_incluses",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "devis",
    "column_name": "niveau_retouche",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "table_name": "devis",
    "column_name": "modes_livraison_inclus",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 21
  },
  {
    "table_name": "devis",
    "column_name": "plateforme_livraison",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'galerie_privee'::text",
    "ordinal_position": 22
  },
  {
    "table_name": "devis",
    "column_name": "duree_acces_galerie_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "90",
    "ordinal_position": 23
  },
  {
    "table_name": "devis",
    "column_name": "livraison_usb_incluse",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 24
  },
  {
    "table_name": "devis",
    "column_name": "type_usb",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "devis",
    "column_name": "frais_livraison_physique",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 26
  },
  {
    "table_name": "devis",
    "column_name": "formats_fichiers_livres",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 27
  },
  {
    "table_name": "devis",
    "column_name": "resolution_fichiers",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'haute'::text",
    "ordinal_position": 28
  },
  {
    "table_name": "devis",
    "column_name": "tirages_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 29
  },
  {
    "table_name": "devis",
    "column_name": "nb_tirages_inclus",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 30
  },
  {
    "table_name": "devis",
    "column_name": "format_tirages_inclus",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 31
  },
  {
    "table_name": "devis",
    "column_name": "type_papier",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 32
  },
  {
    "table_name": "devis",
    "column_name": "encadrement_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 33
  },
  {
    "table_name": "devis",
    "column_name": "frais_tirages",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 34
  },
  {
    "table_name": "devis",
    "column_name": "album_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 35
  },
  {
    "table_name": "devis",
    "column_name": "type_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "devis",
    "column_name": "nb_pages_album",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 37
  },
  {
    "table_name": "devis",
    "column_name": "format_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 38
  },
  {
    "table_name": "devis",
    "column_name": "frais_album",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 39
  },
  {
    "table_name": "devis",
    "column_name": "tarif_tirage_supplementaire",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 40
  },
  {
    "table_name": "devis",
    "column_name": "services_inclus",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"album\": false, \"drone\": false, \"video\": false, \"retouche\": true, \"deplacement\": true, \"second_photographe\": false}'::jsonb",
    "ordinal_position": 41
  },
  {
    "table_name": "devis",
    "column_name": "options_supplementaires",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "ordinal_position": 42
  },
  {
    "table_name": "devis",
    "column_name": "acompte_percent",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "30",
    "ordinal_position": 43
  },
  {
    "table_name": "devis",
    "column_name": "acompte_montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 44
  },
  {
    "table_name": "devis",
    "column_name": "modalites_paiement",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 45
  },
  {
    "table_name": "devis",
    "column_name": "echeancier_paiement",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 46
  },
  {
    "table_name": "devis",
    "column_name": "conditions_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 47
  },
  {
    "table_name": "devis",
    "column_name": "penalites_annulation",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 48
  },
  {
    "table_name": "devis",
    "column_name": "dates_disponibles",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 49
  },
  {
    "table_name": "devis",
    "column_name": "horaires_proposes",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 50
  },
  {
    "table_name": "devis",
    "column_name": "devis_pdf_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 51
  },
  {
    "table_name": "devis",
    "column_name": "portfolio_joint",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 52
  },
  {
    "table_name": "devis",
    "column_name": "contrat_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 53
  },
  {
    "table_name": "devis",
    "column_name": "date_expiration",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 54
  },
  {
    "table_name": "devis",
    "column_name": "duree_validite_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "15",
    "ordinal_position": 55
  },
  {
    "table_name": "devis",
    "column_name": "statut",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'envoye'::statut_devis",
    "ordinal_position": 56
  },
  {
    "table_name": "devis",
    "column_name": "lu_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 57
  },
  {
    "table_name": "devis",
    "column_name": "accepte_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 58
  },
  {
    "table_name": "devis",
    "column_name": "refuse_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 59
  },
  {
    "table_name": "devis",
    "column_name": "expire_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 60
  },
  {
    "table_name": "devis",
    "column_name": "reponse_client",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 61
  },
  {
    "table_name": "devis",
    "column_name": "raison_refus",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 62
  },
  {
    "table_name": "devis",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 63
  },
  {
    "table_name": "devis",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 64
  },
  {
    "table_name": "factures",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('factures_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "factures",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "factures",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "factures",
    "column_name": "num_facture",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "factures",
    "column_name": "facture",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "factures",
    "column_name": "montant_ht",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "factures",
    "column_name": "montant_tva",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "factures",
    "column_name": "montant_ttc",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "factures",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "favoris",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "favoris",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "favoris",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "favoris",
    "column_name": "notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "favoris",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 5
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 5
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "videos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 6
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "message_accompagnement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "photos_metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 8
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "taille_totale_mo",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'en_attente'::text",
    "ordinal_position": 10
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "expire_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "lien_partage",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "mot_de_passe",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "autoriser_telechargement",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 14
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "autoriser_telechargement_individuel",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 15
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "autoriser_telechargement_zip",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 16
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "telechargements_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "telechargements_details",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "ordinal_position": 18
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "formats_disponibles",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"raw\": false, \"web\": true, \"haute_qualite\": true}'::jsonb",
    "ordinal_position": 19
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "watermark_actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 20
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "watermark_texte",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 22
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 23
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "enabled",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 3
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "buffer_minutes",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "60",
    "ordinal_position": 4
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "advance_notice_hours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "24",
    "ordinal_position": 5
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "max_advance_days",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "90",
    "ordinal_position": 6
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "auto_accept_conditions",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 7
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 8
  },
  {
    "table_name": "instant_booking_settings",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "integrations",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "integrations",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "integrations",
    "column_name": "provider",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "integrations",
    "column_name": "access_token",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "integrations",
    "column_name": "refresh_token",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "integrations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "integrations",
    "column_name": "is_active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 7
  },
  {
    "table_name": "integrations",
    "column_name": "metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 8
  },
  {
    "table_name": "integrations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "integrations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 10
  },
  {
    "table_name": "matchings",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "matchings",
    "column_name": "demande_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "matchings",
    "column_name": "photographer_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "matchings",
    "column_name": "match_score",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "matchings",
    "column_name": "match_reasons",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 5
  },
  {
    "table_name": "matchings",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 6
  },
  {
    "table_name": "matchings",
    "column_name": "photographer_message",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "matchings",
    "column_name": "photographe_quote",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "matchings",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 9
  },
  {
    "table_name": "matchings",
    "column_name": "responded_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "matchings",
    "column_name": "accepted_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "messages",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "messages",
    "column_name": "conversation_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "messages",
    "column_name": "sender_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "messages",
    "column_name": "receiver_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "messages",
    "column_name": "contenu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "messages",
    "column_name": "attachments",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 6
  },
  {
    "table_name": "messages",
    "column_name": "lu",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 7
  },
  {
    "table_name": "messages",
    "column_name": "lu_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "messages",
    "column_name": "deleted_by_sender",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 9
  },
  {
    "table_name": "messages",
    "column_name": "deleted_by_receiver",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 10
  },
  {
    "table_name": "messages",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 11
  },
  {
    "table_name": "messages_matching",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "messages_matching",
    "column_name": "matching_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "messages_matching",
    "column_name": "sender_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "messages_matching",
    "column_name": "message",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "messages_matching",
    "column_name": "attachments",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 5
  },
  {
    "table_name": "messages_matching",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 6
  },
  {
    "table_name": "messages_matching",
    "column_name": "read_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "notifications",
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "notifications",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "notifications",
    "column_name": "contenu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "notifications",
    "column_name": "demande_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "notifications",
    "column_name": "devis_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "notifications",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "notifications",
    "column_name": "lu",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 9
  },
  {
    "table_name": "notifications",
    "column_name": "lu_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 11
  },
  {
    "table_name": "packages_types",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "packages_types",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "packages_types",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "packages_types",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "packages_types",
    "column_name": "categorie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "packages_types",
    "column_name": "prix_fixe",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "packages_types",
    "column_name": "monnaie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'EUR'::text",
    "ordinal_position": 7
  },
  {
    "table_name": "packages_types",
    "column_name": "duree_minutes",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "packages_types",
    "column_name": "nb_photos_incluses",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "packages_types",
    "column_name": "nb_photos_retouchees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "packages_types",
    "column_name": "delai_livraison_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "7",
    "ordinal_position": 11
  },
  {
    "table_name": "packages_types",
    "column_name": "retouches_incluses",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 12
  },
  {
    "table_name": "packages_types",
    "column_name": "modes_livraison",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{telechargement}'::text[]",
    "ordinal_position": 13
  },
  {
    "table_name": "packages_types",
    "column_name": "formats_fichiers",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{jpeg_haute_qualite}'::text[]",
    "ordinal_position": 14
  },
  {
    "table_name": "packages_types",
    "column_name": "livraison_usb_incluse",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 15
  },
  {
    "table_name": "packages_types",
    "column_name": "tirages_inclus",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 16
  },
  {
    "table_name": "packages_types",
    "column_name": "format_tirages",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 17
  },
  {
    "table_name": "packages_types",
    "column_name": "services_inclus",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 18
  },
  {
    "table_name": "packages_types",
    "column_name": "options_disponibles",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "ordinal_position": 19
  },
  {
    "table_name": "packages_types",
    "column_name": "photos_exemple",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 20
  },
  {
    "table_name": "packages_types",
    "column_name": "conditions",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "packages_types",
    "column_name": "lieu_prestation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 22
  },
  {
    "table_name": "packages_types",
    "column_name": "deplacement_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 23
  },
  {
    "table_name": "packages_types",
    "column_name": "reservation_instantanee",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 24
  },
  {
    "table_name": "packages_types",
    "column_name": "duree_validite_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "packages_types",
    "column_name": "stock_limite",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "packages_types",
    "column_name": "nb_vendus",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 27
  },
  {
    "table_name": "packages_types",
    "column_name": "actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 28
  },
  {
    "table_name": "packages_types",
    "column_name": "visible",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 29
  },
  {
    "table_name": "packages_types",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 30
  },
  {
    "table_name": "packages_types",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 31
  },
  {
    "table_name": "paiements",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "paiements",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "paiements",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "paiements",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "paiements",
    "column_name": "montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "paiements",
    "column_name": "monnaie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'EUR'::text",
    "ordinal_position": 6
  },
  {
    "table_name": "paiements",
    "column_name": "type_paiement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "paiements",
    "column_name": "methode",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_session_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_payment_intent_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_charge_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_response",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "paiements",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 13
  },
  {
    "table_name": "paiements",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 14
  },
  {
    "table_name": "paiements",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "paiements",
    "column_name": "refunded_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "plans",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('plans_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "plans",
    "column_name": "nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "plans",
    "column_name": "slug",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "plans",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "plans",
    "column_name": "prix_mensuel",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "plans",
    "column_name": "prix_annuel",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "plans",
    "column_name": "nb_demandes_max_mois",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "plans",
    "column_name": "nb_devis_max_mois",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "plans",
    "column_name": "commission_percent",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "plans",
    "column_name": "features",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 10
  },
  {
    "table_name": "plans",
    "column_name": "actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 11
  },
  {
    "table_name": "plans",
    "column_name": "ordre",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 12
  },
  {
    "table_name": "plans",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 13
  },
  {
    "table_name": "prestations",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('prestations_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "prestations",
    "column_name": "nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "prestations",
    "column_name": "slug",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "prestations",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "prestations",
    "column_name": "icone",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "prestations",
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'service'::text",
    "ordinal_position": 6
  },
  {
    "table_name": "prestations",
    "column_name": "ordre",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 7
  },
  {
    "table_name": "prestations",
    "column_name": "actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 8
  },
  {
    "table_name": "prestations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "profiles",
    "column_name": "role",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'particulier'::type_utilisateurs",
    "ordinal_position": 2
  },
  {
    "table_name": "profiles",
    "column_name": "nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "profiles",
    "column_name": "prenom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "profiles",
    "column_name": "telephone",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "profiles",
    "column_name": "avatar_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "profiles",
    "column_name": "adresse",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "profiles",
    "column_name": "ville",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "profiles",
    "column_name": "code_postal",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "profiles",
    "column_name": "latitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "profiles",
    "column_name": "longitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "profiles",
    "column_name": "push_token",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "profiles",
    "column_name": "notifications_enabled",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 14
  },
  {
    "table_name": "profiles",
    "column_name": "notification_settings",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"new_avis\": true, \"new_message\": true, \"reminder_2h\": true, \"cancellation\": true, \"reminder_24h\": true, \"new_reservation\": true, \"payment_received\": true, \"reservation_confirmed\": true}'::jsonb",
    "ordinal_position": 15
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 16
  },
  {
    "table_name": "profiles",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 17
  },
  {
    "table_name": "profiles",
    "column_name": "last_login_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "profiles",
    "column_name": "auth_user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "table_name": "profils_photographe",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "profils_photographe",
    "column_name": "bio",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "profils_photographe",
    "column_name": "nom_entreprise",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "profils_photographe",
    "column_name": "site_web",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "profils_photographe",
    "column_name": "instagram",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "profils_photographe",
    "column_name": "facebook",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "profils_photographe",
    "column_name": "linkedin",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "profils_photographe",
    "column_name": "specialisations",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]",
    "ordinal_position": 8
  },
  {
    "table_name": "profils_photographe",
    "column_name": "categories",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]",
    "ordinal_position": 9
  },
  {
    "table_name": "profils_photographe",
    "column_name": "statut_pro",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 10
  },
  {
    "table_name": "profils_photographe",
    "column_name": "siret",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "profils_photographe",
    "column_name": "numero_tva",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "profils_photographe",
    "column_name": "documents_siret",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "profils_photographe",
    "column_name": "documents_kbis",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "profils_photographe",
    "column_name": "documents_assurance",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "profils_photographe",
    "column_name": "identite_verifiee",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 16
  },
  {
    "table_name": "profils_photographe",
    "column_name": "document_identite_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "profils_photographe",
    "column_name": "date_verification",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "profils_photographe",
    "column_name": "statut_validation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 19
  },
  {
    "table_name": "profils_photographe",
    "column_name": "materiel",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"drones\": false, \"lenses\": [], \"cameras\": [], \"lighting\": [], \"stabilisateurs\": false}'::jsonb",
    "ordinal_position": 20
  },
  {
    "table_name": "profils_photographe",
    "column_name": "equipe",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"solo\": true, \"styliste\": false, \"maquilleur\": false, \"videographe\": false, \"nb_assistants\": 0}'::jsonb",
    "ordinal_position": 21
  },
  {
    "table_name": "profils_photographe",
    "column_name": "mobile",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 22
  },
  {
    "table_name": "profils_photographe",
    "column_name": "studio",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 23
  },
  {
    "table_name": "profils_photographe",
    "column_name": "studio_adresse",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "profils_photographe",
    "column_name": "studio_photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "profils_photographe",
    "column_name": "rayon_deplacement_km",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "50",
    "ordinal_position": 26
  },
  {
    "table_name": "profils_photographe",
    "column_name": "frais_deplacement_base",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "profils_photographe",
    "column_name": "frais_deplacement_par_km",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "profils_photographe",
    "column_name": "services_additionnels",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"drone\": false, \"video\": false, \"stylisme\": false, \"maquillage\": false, \"retouche_pro\": true, \"retouche_beaute\": false, \"impression_album\": false, \"livraison_express\": false}'::jsonb",
    "ordinal_position": 29
  },
  {
    "table_name": "profils_photographe",
    "column_name": "portfolio_photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 30
  },
  {
    "table_name": "profils_photographe",
    "column_name": "portfolio_principal",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "profils_photographe",
    "column_name": "photos_par_categorie",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 32
  },
  {
    "table_name": "profils_photographe",
    "column_name": "video_presentation_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 33
  },
  {
    "table_name": "profils_photographe",
    "column_name": "tarifs_indicatifs",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 34
  },
  {
    "table_name": "profils_photographe",
    "column_name": "tarif_horaire_min",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 35
  },
  {
    "table_name": "profils_photographe",
    "column_name": "tarif_horaire_max",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "profils_photographe",
    "column_name": "acompte_percent",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "30",
    "ordinal_position": 37
  },
  {
    "table_name": "profils_photographe",
    "column_name": "conditions_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 38
  },
  {
    "table_name": "profils_photographe",
    "column_name": "delai_annulation_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "7",
    "ordinal_position": 39
  },
  {
    "table_name": "profils_photographe",
    "column_name": "modalites_paiement",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 40
  },
  {
    "table_name": "profils_photographe",
    "column_name": "calendrier_disponibilite",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 41
  },
  {
    "table_name": "profils_photographe",
    "column_name": "jours_travailles",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 42
  },
  {
    "table_name": "profils_photographe",
    "column_name": "horaires_preference",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 43
  },
  {
    "table_name": "profils_photographe",
    "column_name": "preferences",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"budget_min\": 200, \"accepte_soiree\": true, \"accepte_weekend\": true, \"distance_max_km\": 50, \"duree_min_heure\": 2, \"categories_preferees\": []}'::jsonb",
    "ordinal_position": 44
  },
  {
    "table_name": "profils_photographe",
    "column_name": "note_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 45
  },
  {
    "table_name": "profils_photographe",
    "column_name": "nb_avis",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 46
  },
  {
    "table_name": "profils_photographe",
    "column_name": "nb_prestations_completees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 47
  },
  {
    "table_name": "profils_photographe",
    "column_name": "nb_demandes_recues",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 48
  },
  {
    "table_name": "profils_photographe",
    "column_name": "nb_devis_envoyes",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 49
  },
  {
    "table_name": "profils_photographe",
    "column_name": "taux_reponse",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "100",
    "ordinal_position": 50
  },
  {
    "table_name": "profils_photographe",
    "column_name": "taux_conversion",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 51
  },
  {
    "table_name": "profils_photographe",
    "column_name": "temps_reponse_moyen",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 52
  },
  {
    "table_name": "profils_photographe",
    "column_name": "badges",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 53
  },
  {
    "table_name": "profils_photographe",
    "column_name": "certifications",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 54
  },
  {
    "table_name": "profils_photographe",
    "column_name": "plan_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 55
  },
  {
    "table_name": "profils_photographe",
    "column_name": "plan_actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 56
  },
  {
    "table_name": "profils_photographe",
    "column_name": "propose_tirages",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 57
  },
  {
    "table_name": "profils_photographe",
    "column_name": "propose_albums",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 58
  },
  {
    "table_name": "profils_photographe",
    "column_name": "partenaire_impression",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 59
  },
  {
    "table_name": "profils_photographe",
    "column_name": "tarifs_tirages",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 60
  },
  {
    "table_name": "profils_photographe",
    "column_name": "tarifs_albums",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 61
  },
  {
    "table_name": "profils_photographe",
    "column_name": "delai_production_tirages_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "7",
    "ordinal_position": 62
  },
  {
    "table_name": "profils_photographe",
    "column_name": "delai_production_album_jours",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "14",
    "ordinal_position": 63
  },
  {
    "table_name": "profils_photographe",
    "column_name": "stripe_account_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 64
  },
  {
    "table_name": "profils_photographe",
    "column_name": "stripe_onboarding_complete",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 65
  },
  {
    "table_name": "profils_photographe",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 66
  },
  {
    "table_name": "profils_photographe",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 67
  },
  {
    "table_name": "profils_photographe",
    "column_name": "styles_photo",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 68
  },
  {
    "table_name": "profils_photographe",
    "column_name": "disponibilite",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"evenings\": false, \"weekdays\": true, \"weekends\": true}'::jsonb",
    "ordinal_position": 69
  },
  {
    "table_name": "profils_photographe",
    "column_name": "document_identite_recto_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 70
  },
  {
    "table_name": "profils_photographe",
    "column_name": "document_identite_verso_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 71
  },
  {
    "table_name": "remboursements",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "remboursements",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "remboursements",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "remboursements",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "remboursements",
    "column_name": "montant_original",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "remboursements",
    "column_name": "pourcentage_remboursement",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "remboursements",
    "column_name": "montant_rembourse",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_charge_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_refund_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 10
  },
  {
    "table_name": "remboursements",
    "column_name": "motif_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "remboursements",
    "column_name": "condition_appliquee",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "remboursements",
    "column_name": "force_majeure",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 13
  },
  {
    "table_name": "remboursements",
    "column_name": "date_annulation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 14
  },
  {
    "table_name": "remboursements",
    "column_name": "date_reservation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "remboursements",
    "column_name": "date_remboursement",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "remboursements",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'processing'::text",
    "ordinal_position": 17
  },
  {
    "table_name": "remboursements",
    "column_name": "notes_admin",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "remboursements",
    "column_name": "email_notification_sent",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 19
  },
  {
    "table_name": "remboursements",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 20
  },
  {
    "table_name": "remboursements",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 21
  },
  {
    "table_name": "reservations",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "reservations",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "reservations",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "reservations",
    "column_name": "source",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'demande'::text",
    "ordinal_position": 4
  },
  {
    "table_name": "reservations",
    "column_name": "demande_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "reservations",
    "column_name": "devis_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "reservations",
    "column_name": "package_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "reservations",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "reservations",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "reservations",
    "column_name": "categorie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "reservations",
    "column_name": "date",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "reservations",
    "column_name": "heure_debut",
    "data_type": "time without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "reservations",
    "column_name": "heure_fin",
    "data_type": "time without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "reservations",
    "column_name": "duree_heures",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "reservations",
    "column_name": "lieu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "reservations",
    "column_name": "adresse_complete",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "reservations",
    "column_name": "ville",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "reservations",
    "column_name": "nb_photos_prevues",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "reservations",
    "column_name": "nb_videos_prevues",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "reservations",
    "column_name": "services_inclus",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 20
  },
  {
    "table_name": "reservations",
    "column_name": "montant_total",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "reservations",
    "column_name": "acompte_montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 22
  },
  {
    "table_name": "reservations",
    "column_name": "acompte_paye",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 23
  },
  {
    "table_name": "reservations",
    "column_name": "solde_montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "reservations",
    "column_name": "solde_paye",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 25
  },
  {
    "table_name": "reservations",
    "column_name": "monnaie",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'EUR'::text",
    "ordinal_position": 26
  },
  {
    "table_name": "reservations",
    "column_name": "paiement_acompte_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "reservations",
    "column_name": "paiement_solde_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "reservations",
    "column_name": "statut",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::statut_reservation",
    "ordinal_position": 29
  },
  {
    "table_name": "reservations",
    "column_name": "date_confirmation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 30
  },
  {
    "table_name": "reservations",
    "column_name": "date_annulation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "reservations",
    "column_name": "motif_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 32
  },
  {
    "table_name": "reservations",
    "column_name": "annule_par",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 33
  },
  {
    "table_name": "reservations",
    "column_name": "photos_livrees",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 34
  },
  {
    "table_name": "reservations",
    "column_name": "date_livraison_numerique",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 35
  },
  {
    "table_name": "reservations",
    "column_name": "galerie_livraison_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "reservations",
    "column_name": "mode_livraison",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 37
  },
  {
    "table_name": "reservations",
    "column_name": "lien_telechargement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 38
  },
  {
    "table_name": "reservations",
    "column_name": "usb_envoyee",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 39
  },
  {
    "table_name": "reservations",
    "column_name": "date_envoi_usb",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 40
  },
  {
    "table_name": "reservations",
    "column_name": "numero_suivi_usb",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 41
  },
  {
    "table_name": "reservations",
    "column_name": "tirages_commandes",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 42
  },
  {
    "table_name": "reservations",
    "column_name": "tirages_imprimes",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 43
  },
  {
    "table_name": "reservations",
    "column_name": "date_impression_tirages",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 44
  },
  {
    "table_name": "reservations",
    "column_name": "tirages_expedies",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 45
  },
  {
    "table_name": "reservations",
    "column_name": "date_expedition_tirages",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 46
  },
  {
    "table_name": "reservations",
    "column_name": "numero_suivi_tirages",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 47
  },
  {
    "table_name": "reservations",
    "column_name": "tirages_livres",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 48
  },
  {
    "table_name": "reservations",
    "column_name": "date_livraison_tirages",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 49
  },
  {
    "table_name": "reservations",
    "column_name": "album_commande",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 50
  },
  {
    "table_name": "reservations",
    "column_name": "album_produit",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 51
  },
  {
    "table_name": "reservations",
    "column_name": "date_production_album",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 52
  },
  {
    "table_name": "reservations",
    "column_name": "album_expedie",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 53
  },
  {
    "table_name": "reservations",
    "column_name": "date_expedition_album",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 54
  },
  {
    "table_name": "reservations",
    "column_name": "numero_suivi_album",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 55
  },
  {
    "table_name": "reservations",
    "column_name": "album_livre",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 56
  },
  {
    "table_name": "reservations",
    "column_name": "date_livraison_album",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 57
  },
  {
    "table_name": "reservations",
    "column_name": "notes_client",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 58
  },
  {
    "table_name": "reservations",
    "column_name": "notes_photographe",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 59
  },
  {
    "table_name": "reservations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 60
  },
  {
    "table_name": "reservations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 61
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "photographer_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "matching_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "rating",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "comment",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 7
  },
  {
    "table_name": "reviews_photographe",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 8
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "srid",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "auth_name",
    "data_type": "character varying",
    "character_maximum_length": 256,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "auth_srid",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "srtext",
    "data_type": "character varying",
    "character_maximum_length": 2048,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "spatial_ref_sys",
    "column_name": "proj4text",
    "data_type": "character varying",
    "character_maximum_length": 2048,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "note_globale_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "note_qualite_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "note_ponctualite_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "note_communication_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "note_rapport_qualite_prix_moyenne",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "total_avis",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 7
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "total_avec_photos",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 8
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "total_recommandations",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 9
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "avis_5_etoiles",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 10
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "avis_4_etoiles",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 11
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "avis_3_etoiles",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 12
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "avis_2_etoiles",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 13
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "avis_1_etoile",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 14
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 15
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "photographe_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "photos_selectionnees",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "specifications",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "nb_tirages_total",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "montant_tirages",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "montant_encadrement",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 9
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "frais_expedition",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 10
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "montant_total",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "adresse_livraison",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'en_attente'::text",
    "ordinal_position": 13
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "date_commande",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 14
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "date_production",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "date_expedition",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "date_livraison",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "transporteur",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "numero_suivi",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "paiement_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "paye",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 21
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "instructions_speciales",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 22
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "notes_photographe",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 24
  },
  {
    "table_name": "tirages_commandes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 25
  },
  {
    "table_name": "villes",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "nextval('villes_id_seq'::regclass)",
    "ordinal_position": 1
  },
  {
    "table_name": "villes",
    "column_name": "nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "villes",
    "column_name": "code_postal",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "villes",
    "column_name": "departement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "villes",
    "column_name": "region",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "villes",
    "column_name": "latitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "villes",
    "column_name": "longitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  }
]