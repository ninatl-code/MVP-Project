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
    "column_name": "rate",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "5",
    "ordinal_position": 14
  },
  {
    "table_name": "annonces",
    "column_name": "comment",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "table_name": "annonces",
    "column_name": "date_desactivation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "table_name": "annonces",
    "column_name": "date_reactivation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 17
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
    "column_name": "particulier_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "avis",
    "column_name": "prestataire_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "avis",
    "column_name": "note",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
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
    "column_name": "reponse_presta",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
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
    "column_name": "titre",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
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
    "column_name": "reponse_date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
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
    "table_name": "avis",
    "column_name": "note_globale",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
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
    "column_name": "date",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
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
    "column_name": "motif",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
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
    "column_name": "artist_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "conversations",
    "column_name": "client_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "conversations",
    "column_name": "last_message",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
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
    "column_name": "updated",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
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
    "column_name": "date_confirmation",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 12
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
    "table_name": "dynamic_pricing_rules",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "ordinal_position": 1
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "provider_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "annonce_id",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "rule_name",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "rule_type",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "rule_config",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 6
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "base_price",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "adjusted_price",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 8
  },
  {
    "table_name": "dynamic_pricing_rules",
    "column_name": "is_active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 9
  }
]