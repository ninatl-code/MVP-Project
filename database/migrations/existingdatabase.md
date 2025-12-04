[
  {
    "table_name": "PAYMENT_METHOD",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "PAYMENT_METHOD",
    "column_name": "method",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
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
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
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
    "column_name": "debut",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "abonnements",
    "column_name": "fin",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "abonnements",
    "column_name": "plan",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "annonces",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "annonces",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "now()",
    "ordinal_position": 2
  },
  {
    "table_name": "annonces",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "annonces",
    "column_name": "prestation",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "annonces",
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "annonces",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "annonces",
    "column_name": "equipement",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "annonces",
    "column_name": "actif",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "annonces",
    "column_name": "prestataire",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "annonces",
    "column_name": "prix_fixe",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "true",
    "ordinal_position": 19
  },
  {
    "table_name": "annonces",
    "column_name": "unit_tarif",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'heure'::unite_tarif",
    "ordinal_position": 20
  },
  {
    "table_name": "annonces",
    "column_name": "tarif_unit",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'0'::numeric",
    "ordinal_position": 21
  },
  {
    "table_name": "annonces",
    "column_name": "acompte_percent",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'0'::numeric",
    "ordinal_position": 22
  },
  {
    "table_name": "annonces",
    "column_name": "vues",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "table_name": "annonces",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 24
  },
  {
    "table_name": "annonces",
    "column_name": "conditions_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "annonces",
    "column_name": "nb_avis",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'0'::numeric",
    "ordinal_position": 26
  },
  {
    "table_name": "annonces",
    "column_name": "fichiers",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "annonces",
    "column_name": "nb_heure",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "annonces",
    "column_name": "photo_couverture",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 29
  },
  {
    "table_name": "annonces",
    "column_name": "nb_photos_livrees",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 30
  },
  {
    "table_name": "annonces",
    "column_name": "delai_livraison",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "annonces",
    "column_name": "retouche_incluse",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 32
  },
  {
    "table_name": "annonces",
    "column_name": "styles_photo",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 33
  },
  {
    "table_name": "annonces",
    "column_name": "lieu_shootings",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 34
  },
  {
    "table_name": "annonces",
    "column_name": "deplacement_inclus",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 35
  },
  {
    "table_name": "annonces",
    "column_name": "rayon_deplacement_km",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "annonces",
    "column_name": "video_disponible",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 37
  },
  {
    "table_name": "app_logs",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "app_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "app_logs",
    "column_name": "user_type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "app_logs",
    "column_name": "level",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'info'::text",
    "ordinal_position": 4
  },
  {
    "table_name": "app_logs",
    "column_name": "action",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "app_logs",
    "column_name": "screen",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "app_logs",
    "column_name": "metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "app_logs",
    "column_name": "error_message",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "app_logs",
    "column_name": "error_stack",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "app_logs",
    "column_name": "device_info",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "app_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 11
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
    "column_name": "commentaire",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "avis",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 7
  },
  {
    "table_name": "avis",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "avis",
    "column_name": "note_qualite",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "avis",
    "column_name": "note_ponctualite",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "avis",
    "column_name": "note_communication",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "avis",
    "column_name": "note_rapport_qualite_prix",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "avis",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
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
    "column_name": "verifie",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 19
  },
  {
    "table_name": "avis",
    "column_name": "recommande",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
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
    "table_name": "avis",
    "column_name": "note_globale",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "table_name": "avis",
    "column_name": "reviewer_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "avis",
    "column_name": "reviewee_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "avis",
    "column_name": "reviewer_role",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "avis",
    "column_name": "title",
    "data_type": "character varying",
    "character_maximum_length": 200,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 30
  },
  {
    "table_name": "avis",
    "column_name": "provider_response",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "avis",
    "column_name": "responded_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 32
  },
  {
    "table_name": "blocked_slots",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "blocked_slots",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "blocked_slots",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 4
  },
  {
    "table_name": "blocked_slots",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "blocked_slots",
    "column_name": "start_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "blocked_slots",
    "column_name": "end_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "blocked_slots",
    "column_name": "reason",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
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
    "column_name": "provider_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "policy_name",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "cancellation_policies",
    "column_name": "policy_type",
    "data_type": "character varying",
    "character_maximum_length": 50,
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
    "table_name": "cancellation_requests",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "booking_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "cancelled_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "cancelled_by_role",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "cancellation_reason",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "cancellation_category",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "policy_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "original_amount",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "refund_amount",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "refund_percentage",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "cancellation_fee",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 11
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "hours_before_booking",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "status",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": "'pending'::character varying",
    "ordinal_position": 13
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "review_notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "requested_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 16
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "refunded_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 19
  },
  {
    "table_name": "cancellation_requests",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 20
  },
  {
    "table_name": "conversations",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "conversations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "now()",
    "ordinal_position": 2
  },
  {
    "table_name": "conversations",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "conversations",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "conversations",
    "column_name": "booking_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_text",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "conversations",
    "column_name": "last_message_sender_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "conversations",
    "column_name": "unread_count_client",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 16
  },
  {
    "table_name": "conversations",
    "column_name": "unread_count_provider",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "table_name": "conversations",
    "column_name": "is_archived_by_client",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 18
  },
  {
    "table_name": "conversations",
    "column_name": "is_archived_by_provider",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 19
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
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "devis",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "devis",
    "column_name": "date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "devis",
    "column_name": "montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "devis",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 6
  },
  {
    "table_name": "devis",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 8
  },
  {
    "table_name": "devis",
    "column_name": "client_nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "devis",
    "column_name": "client_email",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "devis",
    "column_name": "comment_client",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "devis",
    "column_name": "date_refus",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "devis",
    "column_name": "motif_refus",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "devis",
    "column_name": "montant_acompte",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "devis",
    "column_name": "endroit",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "devis",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "devis",
    "column_name": "duree",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "table_name": "devis",
    "column_name": "participants",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "devis",
    "column_name": "date_reponse",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 22
  },
  {
    "table_name": "devis",
    "column_name": "comment_presta",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "table_name": "devis",
    "column_name": "unit_tarif",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'heure'::unite_tarif",
    "ordinal_position": 24
  },
  {
    "table_name": "devis",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "devis",
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "devis",
    "column_name": "devis_pdf",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "devis",
    "column_name": "num_devis",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "factures",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "factures",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "now()",
    "ordinal_position": 2
  },
  {
    "table_name": "factures",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "factures",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
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
    "column_name": "num_facture",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
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
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "favoris",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "favoris",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 4
  },
  {
    "table_name": "favoris",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
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
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "particulier_id",
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
    "column_name": "statut",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'en_attente'::character varying",
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
    "column_name": "expire_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "galeries_livraison",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 10
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
    "column_name": "prestataire_id",
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
    "table_name": "leaderboards",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "table_name": "leaderboards",
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "leaderboards",
    "column_name": "user_type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "leaderboards",
    "column_name": "period",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "leaderboards",
    "column_name": "metric_type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "leaderboards",
    "column_name": "score",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 6
  },
  {
    "table_name": "leaderboards",
    "column_name": "rank",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "leaderboards",
    "column_name": "period_start",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "leaderboards",
    "column_name": "period_end",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "leaderboards",
    "column_name": "calculated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 10
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
    "column_name": "sender_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "messages",
    "column_name": "receiver_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "messages",
    "column_name": "contenu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "messages",
    "column_name": "lu",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 5
  },
  {
    "table_name": "messages",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 6
  },
  {
    "table_name": "messages",
    "column_name": "objet",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "messages",
    "column_name": "attachments",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "messages",
    "column_name": "deletion_datePresta",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "messages",
    "column_name": "conversation_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "messages",
    "column_name": "deletion_dateParti",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
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
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "notifications",
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "notifications",
    "column_name": "contenu",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "notifications",
    "column_name": "lu",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 5
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 6
  },
  {
    "table_name": "notifications",
    "column_name": "annonce_id",
    "data_type": "bigint",
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
    "ordinal_position": 9
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
    "column_name": "montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "paiements",
    "column_name": "statut",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 4
  },
  {
    "table_name": "paiements",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 5
  },
  {
    "table_name": "paiements",
    "column_name": "method",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "paiements",
    "column_name": "transaction_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "paiements",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "paiements",
    "column_name": "devise",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'MAD'::text",
    "ordinal_position": 10
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_session_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_payment_intent_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "paiements",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "paiements",
    "column_name": "email",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "paiements",
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "paiements",
    "column_name": "stripe_response",
    "data_type": "text",
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
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "plans",
    "column_name": "plan",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "plans",
    "column_name": "pricing euro/month",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "prestations",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
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
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
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
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "''::text",
    "ordinal_position": 3
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "now()",
    "ordinal_position": 4
  },
  {
    "table_name": "profiles",
    "column_name": "bio",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "profiles",
    "column_name": "nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "profiles",
    "column_name": "telephone",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "profiles",
    "column_name": "photos",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "profiles",
    "column_name": "rate",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "5",
    "ordinal_position": 19
  },
  {
    "table_name": "profiles",
    "column_name": "stripe_account_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 22
  },
  {
    "table_name": "profiles",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 23
  },
  {
    "table_name": "profiles",
    "column_name": "facebook",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "profiles",
    "column_name": "instagram",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "profiles",
    "column_name": "linkedin",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "profiles",
    "column_name": "website",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "profiles",
    "column_name": "documents_siret",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "profiles",
    "column_name": "documents_assurance",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 29
  },
  {
    "table_name": "profiles",
    "column_name": "documents_kbis",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 30
  },
  {
    "table_name": "profiles",
    "column_name": "statut_validation",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'pending'::character varying",
    "ordinal_position": 31
  },
  {
    "table_name": "profiles",
    "column_name": "rappel_avant_shooting",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "24",
    "ordinal_position": 32
  },
  {
    "table_name": "profiles",
    "column_name": "push_token",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 33
  },
  {
    "table_name": "profiles",
    "column_name": "notifications_enabled",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 34
  },
  {
    "table_name": "profiles",
    "column_name": "notification_settings",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{\"new_avis\": true, \"all_enabled\": true, \"new_message\": true, \"reminder_2h\": true, \"cancellation\": true, \"reminder_24h\": true, \"new_reservation\": true, \"payment_received\": true, \"reservation_confirmed\": true}'::jsonb",
    "ordinal_position": 35
  },
  {
    "table_name": "profiles",
    "column_name": "latitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "profiles",
    "column_name": "longitude",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 37
  },
  {
    "table_name": "profiles",
    "column_name": "adresse",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 38
  },
  {
    "table_name": "profiles",
    "column_name": "ville",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 39
  },
  {
    "table_name": "profiles",
    "column_name": "code_postal",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 40
  },
  {
    "table_name": "profiles",
    "column_name": "zones_intervention",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::text[]",
    "ordinal_position": 41
  },
  {
    "table_name": "profiles",
    "column_name": "rayon_intervention",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "20",
    "ordinal_position": 42
  },
  {
    "table_name": "profiles",
    "column_name": "deposit_percentage",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "30",
    "ordinal_position": 43
  },
  {
    "table_name": "profiles",
    "column_name": "stripe_account_status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 44
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
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "remboursements",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "remboursements",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "remboursements",
    "column_name": "montant_original",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "remboursements",
    "column_name": "pourcentage_remboursement",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "0",
    "ordinal_position": 7
  },
  {
    "table_name": "remboursements",
    "column_name": "montant_rembourse",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "0",
    "ordinal_position": 8
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_charge_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_refund_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "remboursements",
    "column_name": "stripe_status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 11
  },
  {
    "table_name": "remboursements",
    "column_name": "motif_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "remboursements",
    "column_name": "condition_appliquee",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "remboursements",
    "column_name": "force_majeure",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 14
  },
  {
    "table_name": "remboursements",
    "column_name": "date_annulation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 15
  },
  {
    "table_name": "remboursements",
    "column_name": "date_reservation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "remboursements",
    "column_name": "date_remboursement",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "remboursements",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'processing'::text",
    "ordinal_position": 18
  },
  {
    "table_name": "remboursements",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 19
  },
  {
    "table_name": "remboursements",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 20
  },
  {
    "table_name": "remboursements",
    "column_name": "notes_admin",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "table_name": "remboursements",
    "column_name": "email_notification_sent",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 22
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
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "reservations",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "reservations",
    "column_name": "montant",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "reservations",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 7
  },
  {
    "table_name": "reservations",
    "column_name": "acompte_paye",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 8
  },
  {
    "table_name": "reservations",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "reservations",
    "column_name": "client_nom",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "table_name": "reservations",
    "column_name": "client_email",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 11
  },
  {
    "table_name": "reservations",
    "column_name": "commentaire",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
  },
  {
    "table_name": "reservations",
    "column_name": "date_confirmation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "table_name": "reservations",
    "column_name": "date_annulation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "table_name": "reservations",
    "column_name": "date_refus",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "reservations",
    "column_name": "motif_refus",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "reservations",
    "column_name": "motif_annulation",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
  },
  {
    "table_name": "reservations",
    "column_name": "montant_acompte",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 18
  },
  {
    "table_name": "reservations",
    "column_name": "endroit",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 19
  },
  {
    "table_name": "reservations",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "table_name": "reservations",
    "column_name": "participants",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "table_name": "reservations",
    "column_name": "id_devis",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 25
  },
  {
    "table_name": "reservations",
    "column_name": "photos",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "table_name": "reservations",
    "column_name": "unit_tarif",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 27
  },
  {
    "table_name": "reservations",
    "column_name": "tarif_unit",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  },
  {
    "table_name": "reservations",
    "column_name": "paiement_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 29
  },
  {
    "table_name": "reservations",
    "column_name": "num_reservation",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 31
  },
  {
    "table_name": "reservations",
    "column_name": "duree_heure",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 32
  },
  {
    "table_name": "reservations",
    "column_name": "booking_type",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'request'::character varying",
    "ordinal_position": 33
  },
  {
    "table_name": "reservations",
    "column_name": "auto_confirmed",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 34
  },
  {
    "table_name": "reservations",
    "column_name": "confirmed_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 35
  },
  {
    "table_name": "reservations",
    "column_name": "service_start_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 36
  },
  {
    "table_name": "reservations",
    "column_name": "service_end_datetime",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 37
  },
  {
    "table_name": "reservations",
    "column_name": "buffer_applied",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 38
  },
  {
    "table_name": "reservations",
    "column_name": "payment_status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 39
  },
  {
    "table_name": "reservations",
    "column_name": "deposit_paid_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 40
  },
  {
    "table_name": "reservations",
    "column_name": "balance_paid_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 41
  },
  {
    "table_name": "reservations",
    "column_name": "stripe_transfer_deposit_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 42
  },
  {
    "table_name": "reservations",
    "column_name": "stripe_transfer_balance_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 43
  },
  {
    "table_name": "reservations",
    "column_name": "balance_amount",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 44
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "title",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "body",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "data",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "scheduled_for",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "sent_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 10
  },
  {
    "table_name": "scheduled_notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 11
  },
  {
    "table_name": "statistiques_avis",
    "column_name": "prestataire_id",
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
    "table_name": "transactions",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "transactions",
    "column_name": "reservation_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "transactions",
    "column_name": "type",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "transactions",
    "column_name": "amount",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "transactions",
    "column_name": "stripe_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "transactions",
    "column_name": "status",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'pending'::text",
    "ordinal_position": 6
  },
  {
    "table_name": "transactions",
    "column_name": "recipient_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "transactions",
    "column_name": "metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "transactions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 9
  },
  {
    "table_name": "villes",
    "column_name": "id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "table_name": "villes",
    "column_name": "ville",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "zones_intervention",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "zones_intervention",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "zones_intervention",
    "column_name": "ville_centre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "zones_intervention",
    "column_name": "rayon_km",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "zones_intervention",
    "column_name": "active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 5
  },
  {
    "table_name": "zones_intervention",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 6
  },
  {
    "table_name": "zones_intervention",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 7
  },
  {
    "table_name": "zones_intervention",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  }
]