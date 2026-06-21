export const SPECIALITES_MAP = {
  'services-domicile': [
    'Plomberie',
    'Électricité',
    'Ménage',
    'Bricolage'
  ],


  'evenementiel': [
    'Photographe',
    'Vidéaste',
    'Décorateur',
    'Traiteur',
    'Animateur',
    'DJ / Musicien',
    "Organisateur d'événements",
    'Fleuriste'
  ],

  'transport': [
    'Chauffeur',
    'Livraison',
    'Déménagement'
    
  ],

  'digital': [
    'Développement',
    'Design',
    'Marketing'
  ]
};

export const TEMPLATES_PAR_SPECIALITE = {
  // Services à domicile
  'Plomberie': {
    titre: 'Intervention plombier à domicile',
    description: 'Je recherche un plombier pour intervenir à mon domicile. Le problème concerne : [décrivez ici, ex : fuite sous évier, robinet défectueux, installation d\'un nouvel équipement]. Merci d\'indiquer votre disponibilité et votre tarif.',
    exigences: 'Merci de préciser votre certification et votre assurance. Intervention souhaitée en semaine / week-end : []. Accès facile / code immeuble : [].',
  },

  'Électricité': {
    titre: 'Intervention électricien à domicile',
    description: 'Je recherche un électricien qualifié pour : [décrivez ici, ex : installation prise / interrupteur, mise aux normes, dépannage panne électrique]. Précisez si vous êtes habilité et assuré.',
    exigences: 'Habilitation électrique requise. Merci d\'apporter votre propre matériel de base. Disponibilité urgente souhaitée : [oui / non].',
  },

  'Ménage': {
    titre: 'Prestation de ménage à domicile',
    description: 'Je recherche une personne sérieuse pour effectuer le ménage de mon logement. Surface approximative : [ex : 80m²]. Prestations souhaitées : [ex : aspiration, lavage des sols, salle de bain, cuisine]. Fréquence : [ponctuel / hebdomadaire / mensuel].',
    exigences: 'Produits ménagers : [fournis par le client / par le prestataire]. Présence du client pendant la prestation : [oui / non]. Animal de compagnie dans le logement : [oui / non].',
  },

  'Bricolage': {
    titre: 'Aide bricolage / petits travaux',
    description: 'J\'ai besoin d\'un bricoleur expérimenté pour : [décrivez ici, ex : montage de meubles, fixation d\'étagères, petites réparations]. Merci de préciser les outils que vous apportez.',
    exigences: 'Merci d\'apporter vos propres outils. Matériaux : [fournis par le client / à prévoir par le prestataire]. Expérience avec [type de travaux] souhaitée.',
  },

  // Événementiel
  'Photographe': {
    titre: 'Photographe pour [type d\'événement]',
    description: 'Je recherche un photographe professionnel pour couvrir mon événement. Type : [ex : mariage, anniversaire, séance corporate]. Nombre de personnes attendues : []. Style souhaité : [ex : reportage naturel, portraits posés, photos dynamiques]. Remise des photos souhaitée sous : [ex : 2 semaines].',
    exigences: 'Matériel professionnel requis (reflex / hybride). Retouches incluses souhaitées : [oui / non]. Galerie en ligne pour partage des photos : [oui / non]. Tenue vestimentaire souhaitée : [ex : tenue de soirée, casual].',
  },

  'Vidéaste': {
    titre: 'Vidéaste pour [type d\'événement]',
    description: 'Je recherche un vidéaste pour filmer et monter une vidéo de mon événement. Type : [ex : mariage, séminaire]. Durée du film final souhaitée : [ex : 3-5 min]. Format de rendu : [ex : MP4 HD]. Drone souhaité : [oui / non].',
    exigences: 'Stabilisateur (gimbal) requis : [oui / non]. Drone requis : [oui / non]. Musique libre de droits sur la vidéo finale : [oui / non]. Sous-titres souhaités : [oui / non].',
  },

  'Décorateur': {
    titre: 'Décoration événementielle pour [type d\'événement]',
    description: 'Je recherche un décorateur pour mettre en scène mon événement. Thème / ambiance souhaitée : [ex : bohème, élégant, marocain traditionnel]. Espace à décorer : [ex : salle 200m², terrasse]. Budget déco inclus dans l\'offre ou fourni par le client : [à préciser].',
    exigences: 'Montage et démontage inclus : [oui / non]. Location du matériel de décoration incluse dans l\'offre : [oui / non]. Visite préalable du lieu souhaitée : [oui / non].',
  },

  'Traiteur': {
    titre: 'Prestation traiteur pour [type d\'événement]',
    description: 'Je recherche un traiteur pour mon événement. Nombre de convives : []. Type de repas : [ex : buffet, dîner assis, cocktail]. Contraintes alimentaires à respecter : [ex : halal, végétarien]. Service en salle inclus : [oui / non].',
    exigences: 'Cuisine halal obligatoire : [oui / non]. Allergènes à éviter : [ex : gluten, fruits à coque]. Vaisselle et matériel de service : [fournis par le traiteur / sur place]. Dégustation préalable possible : [oui / non].',
  },

  'Animateur': {
    titre: 'Animateur pour [type d\'événement]',
    description: 'Je recherche un animateur pour assurer l\'animation de mon événement. Public : [ex : adultes, enfants, mixte]. Type d\'animation souhaitée : [ex : jeux, quiz, magie, mascotte]. Durée de l\'animation : [ex : 2h].',
    exigences: 'Matériel d\'animation apporté par le prestataire : [oui / non]. Langue d\'animation : [arabe / français / darija]. Expérience avec le public concerné requise : [ex : enfants moins de 10 ans].',
  },

  'DJ / Musicien': {
    titre: 'DJ / Musicien pour [type d\'événement]',
    description: 'Je recherche un DJ ou musicien pour animer mon événement. Style musical souhaité : [ex : oriental, pop, chaabi, lounge]. Matériel son et lumière : [fourni par le prestataire / sur place]. Durée de la prestation : [ex : 18h - 23h].',
    exigences: 'Matériel son et lumières apporté par le prestataire : [oui / non]. Playlist à valider à l\'avance : [oui / non]. Pauses souhaitées : [ex : 1 pause de 15 min par heure]. Tenue vestimentaire : [ex : costume, tenue traditionnelle].',
  },

  "Organisateur d'événements": {
    titre: 'Organisation complète de [type d\'événement]',
    description: 'Je recherche un organisateur d\'événements pour prendre en charge mon projet de A à Z. Type d\'événement : [ex : mariage, anniversaire, séminaire]. Nombre d\'invités : []. Services attendus : [ex : coordination prestataires, logistique, décoration, traiteur]. Budget global estimé : [ex : 30 000 DH].',
    exigences: 'Coordination de tous les prestataires incluse : [oui / non]. Présence le jour J obligatoire : [oui / non]. Rapports d\'avancement réguliers souhaités : [oui / non]. Expérience avec ce type d\'événement requise.',
  },

  'Fleuriste': {
    titre: 'Compositions florales pour [type d\'événement]',
    description: 'Je recherche un fleuriste pour créer les compositions florales de mon événement. Fleurs préférées : [ex : roses, pivoines, eucalyptus]. Coloris : [ex : blanc et doré, tons pastel]. Pièces souhaitées : [ex : centre de table x10, bouquet mariée, arche florale].',
    exigences: 'Livraison et installation sur place incluses : [oui / non]. Récupération des compositions après l\'événement : [oui / non]. Fleurs fraîches obligatoires (pas artificielles) : [oui / non].',
  },

  // Transport
  'Chauffeur': {
    titre: 'Chauffeur privé pour [type de trajet]',
    description: 'Je recherche un chauffeur privé pour effectuer un trajet. Trajet : [départ] → [arrivée]. Date et heure : []. Nombre de passagers : []. Véhicule souhaité : [ex : berline, monospace, SUV]. Aller simple ou aller-retour : [].',
    exigences: 'Permis de conduire valide et véhicule assuré obligatoire. Bouteille d’eau à bord souhaitée : [oui / non]. Aide avec les bagages : [oui / non]. Ponctualité critique : merci de confirmer 30 min avant.',
  },

  'Livraison': {
    titre: 'Livraison de [type de colis]',
    description: 'J\'ai besoin d\'un service de livraison. Contenu du colis : [ex : documents, colis léger, marchandise]. Poids approximatif : []. Adresse de prise en charge : []. Adresse de livraison : []. Délai souhaité : [ex : même jour, lendemain].',
    exigences: 'Confirmation de livraison par photo souhaitée : [oui / non]. Signature du destinataire requise : [oui / non]. Manutention avec soin (colis fragile) : [oui / non].',
  },

  'Déménagement': {
    titre: 'Déménagement [ville départ] → [ville arrivée]',
    description: 'Je recherche une équipe pour mon déménagement. Volume estimé : [ex : studio, F2, F3, maison]. Étage départ : []. Étage arrivée : []. Ascenseur disponible : [oui / non]. Montage / démontage meubles souhaité : [oui / non]. Emballage inclus : [oui / non].',
    exigences: 'Couverture / protection des meubles requise. Objets fragiles à signaler : [oui / non]. Démontage / remontage des meubles inclus : [oui / non]. Camion de quelle taille : [ex : 20m³]. Nombre de déménageurs souhaité : [ex : 2 personnes].',
  },

  // Digital
  'Développement': {
    titre: 'Développement [type de projet]',
    description: 'Je recherche un développeur pour réaliser : [ex : site vitrine, application mobile, e-commerce, API]. Technologies souhaitées si connues : [ex : React, Laravel, Flutter]. Fonctionnalités principales : [listez les 3-5 features clés]. Délai souhaité : [ex : 4 semaines]. Maquettes disponibles : [oui / non].',
    exigences: 'Code source livré et commenté : [oui / non]. Hébergement et déploiement inclus : [oui / non]. Maintenance post-livraison souhaitée : [oui / non]. Tests et documentation fournis : [oui / non]. NDA / confidentialité requise : [oui / non].',
  },

  'Design': {
    titre: 'Création graphique / design pour [projet]',
    description: 'Je recherche un designer pour : [ex : logo, charte graphique, flyers, mockup application]. Style souhaité : [ex : moderne et épuré, coloré et dynamique, traditionnel]. Formats de fichiers attendus : [ex : AI, PDF, PNG]. Nombre de propositions souhaitées : [ex : 2-3 concepts].',
    exigences: 'Fichiers sources livrés (AI, PSD) : [oui / non]. Nombre de révisions incluses : [ex : 2 révisions]. Droits de propriété intellectuelle cédés : [oui / non]. Respect d\'une charte graphique existante : [oui / non].',
  },

  'Marketing': {
    titre: 'Prestation marketing pour [objectif]',
    description: 'Je recherche un expert marketing pour : [ex : gestion réseaux sociaux, campagne publicitaire, stratégie de contenu, SEO]. Plateformes concernées : [ex : Instagram, Facebook, Google Ads]. Objectif principal : [ex : notoriété, génération de leads, ventes]. Budget publicitaire mensuel alloué : [ex : 2000 DH].',
    exigences: 'Rapport de performance mensuel souhaité : [oui / non]. Accès aux comptes existants à fournir. Création de contenus visuels incluse : [oui / non]. Réunion de suivi hebdomadaire : [oui / non].',
  },
};



export const DEVIS_TEMPLATES = {
  'plomberie': {
    prestations: (duree) => [
      `- Diagnostic et évaluation sur place`,
      `- Intervention plomberie (${duree}h)`,
      `- Fourniture du matériel courant`,
      `- Test et vérification après intervention`,
      `- Nettoyage du chantier`,
    ],
  },
  'électricité': {
    prestations: (duree) => [
      `- Diagnostic électrique sur place`,
      `- Intervention et travaux électriques (${duree}h)`,
      `- Fourniture du matériel courant`,
      `- Test de conformité après intervention`,
      `- Nettoyage du chantier`,
    ],
  },
  'ménage': {
    prestations: (duree) => [
      `- Nettoyage complet du logement (${duree}h)`,
      `- Aspiration et lavage des sols`,
      `- Nettoyage salle de bain et cuisine`,
      `- Dépoussiérage des surfaces`,
      `- Produits ménagers fournis`,
    ],
  },
  'bricolage': {
    prestations: (duree) => [
      `- Évaluation et préparation (${duree}h)`,
      `- Réalisation des travaux demandés`,
      `- Outillage fourni`,
      `- Vérification et finitions`,
    ],
  },
  'photographe': {
    prestations: (duree) => [
      `- Séance photo de ${duree}h`,
      `- Prise de vue professionnelle (tous les moments clés)`,
      `- Sélection et retouche des meilleures photos`,
      `- Livraison en galerie en ligne sécurisée`,
      `- Droits d'utilisation personnelle inclus`,
    ],
  },
  'vidéaste': {
    prestations: (duree) => [
      `- Tournage de ${duree}h`,
      `- Captation professionnelle multi-angles`,
      `- Montage vidéo et étalonnage couleur`,
      `- Habillage sonore et musique libre de droits`,
      `- Livraison en format HD (MP4)`,
    ],
  },
  'décorateur': {
    prestations: (duree) => [
      `- Consultation et planification`,
      `- Décoration complète selon le thème choisi`,
      `- Montage sur place (${duree}h)`,
      `- Démontage après événement`,
      `- Matériel de décoration inclus`,
    ],
  },
  'traiteur': {
    prestations: (duree, data) => [
      `- Préparation des plats (menu validé ensemble)`,
      `- Service sur place pour ${data?.nb_personnes || '...'} personnes`,
      `- Vaisselle et matériel de service inclus`,
      `- Respect des contraintes alimentaires`,
      `- Nettoyage après prestation`,
    ],
  },
  'animateur': {
    prestations: (duree) => [
      `- Animation de ${duree}h`,
      `- Programme adapté au public`,
      `- Matériel d'animation fourni`,
      `- Interaction et jeux inclus`,
    ],
  },
  'dj / musicien': {
    prestations: (duree) => [
      `- Animation musicale de ${duree}h`,
      `- Matériel son et lumières fourni`,
      `- Playlist personnalisée selon vos goûts`,
      `- Installation et désinstallation incluses`,
    ],
  },
  "organisateur d'événements": {
    prestations: (duree) => [
      `- Coordination complète de l'événement`,
      `- Gestion des prestataires`,
      `- Présence le jour J (${duree}h)`,
      `- Suivi et reporting`,
      `- Gestion des imprévus`,
    ],
  },
  'fleuriste': {
    prestations: (duree) => [
      `- Création des compositions florales`,
      `- Fleurs fraîches de saison`,
      `- Livraison et installation sur place`,
      `- Récupération après événement`,
    ],
  },
  'chauffeur': {
    prestations: (duree) => [
      `- Prise en charge à l'adresse convenue`,
      `- Transport sécurisé et ponctuel`,
      `- Aide avec les bagages`,
      `- Véhicule propre et confortable`,
    ],
  },
  'livraison': {
    prestations: (duree) => [
      `- Enlèvement du colis à l'adresse de départ`,
      `- Transport soigné`,
      `- Livraison à l'adresse de destination`,
      `- Confirmation de livraison par photo`,
    ],
  },
  'déménagement': {
    prestations: (duree) => [
      `- Emballage et protection des meubles`,
      `- Chargement et transport`,
      `- Déchargement et installation`,
      `- Démontage / remontage des meubles`,
      `- Camion et équipe inclus`,
    ],
  },
  'développement': {
    prestations: (duree) => [
      `- Analyse des besoins et spécifications`,
      `- Développement selon les technologies choisies`,
      `- Tests et corrections`,
      `- Livraison du code source commenté`,
      `- Documentation technique`,
    ],
  },
  'design': {
    prestations: (duree) => [
      `- Brief créatif et moodboard`,
      `- 2 propositions de design`,
      `- Révisions incluses`,
      `- Livraison des fichiers sources (AI, PDF, PNG)`,
      `- Droits de propriété cédés`,
    ],
  },
  'marketing': {
    prestations: (duree) => [
      `- Audit et analyse de la situation`,
      `- Stratégie et plan d'action`,
      `- Création des contenus`,
      `- Mise en place et suivi des campagnes`,
      `- Rapport de performance mensuel`,
    ],
  },
};

// Fallback par catégorie si spécialité non trouvée
export const DEVIS_TEMPLATES_CATEGORIE = {
  'services-domicile': (duree) => [
    `- Intervention à domicile (${duree}h)`,
    `- Déplacement inclus`,
    `- Matériel fourni`,
    `- Vérification après intervention`,
  ],
  'evenementiel': (duree) => [
    `- Couverture complète de l'événement (${duree}h)`,
    `- Gestion professionnelle sur place`,
    `- Livraison des contenus`,
  ],
  'transport': (duree) => [
    `- Prise en charge ponctuelle`,
    `- Transport sécurisé`,
    `- Respect des horaires`,
  ],
  'digital': (duree) => [
    `- Analyse des besoins`,
    `- Réalisation complète`,
    `- Livraison et accompagnement`,
  ],
};

// Fonction utilitaire pour résoudre le bon template
export const getDevisTemplate = (specialite, categorie, duree, data) => {
  const specKey = Object.keys(DEVIS_TEMPLATES).find(k =>
    specialite?.toLowerCase().includes(k) || k.includes(specialite?.toLowerCase())
  );

  if (specKey) {
    return DEVIS_TEMPLATES[specKey].prestations(duree, data).join('\n');
  }

  const catKey = Object.keys(DEVIS_TEMPLATES_CATEGORIE).find(k =>
    categorie?.toLowerCase().includes(k)
  );

  if (catKey) {
    return DEVIS_TEMPLATES_CATEGORIE[catKey](duree).join('\n');
  }

  return [`- Prestation de ${duree}h`, `- Déplacement sur place`].join('\n');
};