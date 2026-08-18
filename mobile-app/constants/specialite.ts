export const SPECIALITES_MAP = {
  'services-domicile': [
    'Plumbing',
    'Electrical',
    'Cleaning',
    'Handyman'
  ],

  'evenementiel': [
    'Photographer',
    'Videographer',
    'Decorator',
    'Caterer',
    'Host / MC',
    'DJ / Musician',
    'Event Organizer',
    'Florist'
  ],

  'transport': [
    'Chauffeur',
    'Delivery',
    'Moving'
  ],

  'digital': [
    'Development',
    'Design',
    'Marketing'
  ]
};

export const TEMPLATES_PAR_SPECIALITE = {
  // Home Services
  'Plumbing': {
    titre: 'Plumber home intervention',
    description: 'I am looking for a plumber to intervene at my home. The issue concerns: [describe here, e.g.: leak under sink, faulty faucet, new equipment installation]. Please indicate your availability and rate.',
    exigences: 'Please specify your certification and insurance. Intervention desired on weekdays / weekends: []. Easy access / building code: [].',
  },

  'Electrical': {
    titre: 'Electrician home intervention',
    description: 'I am looking for a qualified electrician for: [describe here, e.g.: outlet/switch installation, compliance upgrade, electrical failure repair]. Please specify if you are certified and insured.',
    exigences: 'Electrical certification required. Please bring your own basic tools. Urgent availability desired: [yes / no].',
  },

  'Cleaning': {
    titre: 'Home cleaning service',
    description: 'I am looking for a reliable person to clean my home. Approximate surface area: [e.g.: 80m²]. Services desired: [e.g.: vacuuming, floor washing, bathroom, kitchen]. Frequency: [one-time / weekly / monthly].',
    exigences: 'Cleaning products: [provided by client / by provider]. Client presence during service: [yes / no]. Pets in the home: [yes / no].',
  },

  'Handyman': {
    titre: 'Handyman help / small repairs',
    description: 'I need an experienced handyman for: [describe here, e.g.: furniture assembly, shelf mounting, small repairs]. Please specify the tools you bring.',
    exigences: 'Please bring your own tools. Materials: [provided by client / to be provided by provider]. Experience with [type of work] desired.',
  },

  // Events
  'Photographer': {
    titre: 'Photographer for [event type]',
    description: 'I am looking for a professional photographer to cover my event. Type: [e.g.: wedding, birthday, corporate session]. Expected number of people: []. Desired style: [e.g.: natural reportage, posed portraits, dynamic photos]. Photo delivery desired within: [e.g.: 2 weeks].',
    exigences: 'Professional equipment required (DSLR / mirrorless). Retouching included desired: [yes / no]. Online gallery for photo sharing: [yes / no]. Desired dress code: [e.g.: evening wear, casual].',
  },

  'Videographer': {
    titre: 'Videographer for [event type]',
    description: 'I am looking for a videographer to film and edit a video of my event. Type: [e.g.: wedding, seminar]. Desired final video length: [e.g.: 3-5 min]. Output format: [e.g.: MP4 HD]. Drone desired: [yes / no].',
    exigences: 'Gimbal stabilizer required: [yes / no]. Drone required: [yes / no]. Royalty-free music on final video: [yes / no]. Subtitles desired: [yes / no].',
  },

  'Decorator': {
    titre: 'Event decoration for [event type]',
    description: 'I am looking for a decorator to stage my event. Desired theme / ambiance: [e.g.: bohemian, elegant, traditional Moroccan]. Space to decorate: [e.g.: 200m² hall, terrace]. Decor budget included in the offer or provided by client: [to specify].',
    exigences: 'Setup and teardown included: [yes / no]. Decoration equipment rental included in the offer: [yes / no]. Prior site visit desired: [yes / no].',
  },

  'Caterer': {
    titre: 'Catering service for [event type]',
    description: 'I am looking for a caterer for my event. Number of guests: []. Meal type: [e.g.: buffet, seated dinner, cocktail]. Dietary restrictions to respect: [e.g.: halal, vegetarian]. Table service included: [yes / no].',
    exigences: 'Halal cuisine mandatory: [yes / no]. Allergens to avoid: [e.g.: gluten, nuts]. Dishes and service equipment: [provided by caterer / on site]. Prior tasting possible: [yes / no].',
  },

  'Host / MC': {
    titre: 'Host / MC for [event type]',
    description: 'I am looking for a host to run the entertainment for my event. Audience: [e.g.: adults, children, mixed]. Type of entertainment desired: [e.g.: games, quiz, magic, mascot]. Entertainment duration: [e.g.: 2h].',
    exigences: 'Entertainment equipment brought by provider: [yes / no]. Entertainment language: [Arabic / French / Darija]. Experience with the target audience required: [e.g.: children under 10].',
  },

  'DJ / Musician': {
    titre: 'DJ / Musician for [event type]',
    description: 'I am looking for a DJ or musician to entertain my event. Desired music style: [e.g.: oriental, pop, chaabi, lounge]. Sound and lighting equipment: [provided by provider / on site]. Performance duration: [e.g.: 6pm - 11pm].',
    exigences: 'Sound and lighting equipment brought by provider: [yes / no]. Playlist to be approved in advance: [yes / no]. Desired breaks: [e.g.: 1 x 15 min break per hour]. Dress code: [e.g.: suit, traditional attire].',
  },

  'Event Organizer': {
    titre: 'Full organization of [event type]',
    description: 'I am looking for an event organizer to handle my project from A to Z. Event type: [e.g.: wedding, birthday, seminar]. Number of guests: []. Expected services: [e.g.: provider coordination, logistics, decoration, catering]. Estimated overall budget: [e.g.: 30,000 MAD].',
    exigences: 'Coordination of all providers included: [yes / no]. Presence on D-Day mandatory: [yes / no]. Regular progress reports desired: [yes / no]. Experience with this type of event required.',
  },

  'Florist': {
    titre: 'Floral arrangements for [event type]',
    description: 'I am looking for a florist to create the floral arrangements for my event. Preferred flowers: [e.g.: roses, peonies, eucalyptus]. Colors: [e.g.: white and gold, pastel tones]. Desired pieces: [e.g.: centerpiece x10, bridal bouquet, floral arch].',
    exigences: 'Delivery and on-site installation included: [yes / no]. Arrangement pickup after the event: [yes / no]. Fresh flowers mandatory (no artificial): [yes / no].',
  },

  // Transport
  'Chauffeur': {
    titre: 'Private driver for [trip type]',
    description: 'I am looking for a private driver for a trip. Route: [departure] → [arrival]. Date and time: []. Number of passengers: []. Desired vehicle: [e.g.: sedan, minivan, SUV]. One-way or round trip: [].',
    exigences: 'Valid driver\'s license and insured vehicle mandatory. Water bottle on board desired: [yes / no]. Luggage assistance: [yes / no]. Punctuality critical: please confirm 30 min before.',
  },

  'Delivery': {
    titre: 'Delivery of [package type]',
    description: 'I need a delivery service. Package contents: [e.g.: documents, light parcel, goods]. Approximate weight: []. Pickup address: []. Delivery address: []. Desired timeframe: [e.g.: same day, next day].',
    exigences: 'Delivery confirmation by photo desired: [yes / no]. Recipient signature required: [yes / no]. Careful handling (fragile package): [yes / no].',
  },

  'Moving': {
    titre: 'Moving [departure city] → [arrival city]',
    description: 'I am looking for a team for my move. Estimated volume: [e.g.: studio, 2-room, 3-room, house]. Departure floor: []. Arrival floor: []. Elevator available: [yes / no]. Furniture assembly / disassembly desired: [yes / no]. Packing included: [yes / no].',
    exigences: 'Furniture covers / protection required. Fragile items to report: [yes / no]. Furniture disassembly / reassembly included: [yes / no]. Truck size: [e.g.: 20m³]. Number of movers desired: [e.g.: 2 people].',
  },

  // Digital
  'Development': {
    titre: 'Development [project type]',
    description: 'I am looking for a developer to build: [e.g.: showcase website, mobile app, e-commerce, API]. Desired technologies if known: [e.g.: React, Laravel, Flutter]. Main features: [list 3-5 key features]. Desired deadline: [e.g.: 4 weeks]. Mockups available: [yes / no].',
    exigences: 'Source code delivered and commented: [yes / no]. Hosting and deployment included: [yes / no]. Post-delivery maintenance desired: [yes / no]. Tests and documentation provided: [yes / no]. NDA / confidentiality required: [yes / no].',
  },

  'Design': {
    titre: 'Graphic creation / design for [project]',
    description: 'I am looking for a designer for: [e.g.: logo, brand guidelines, flyers, app mockup]. Desired style: [e.g.: modern and clean, colorful and dynamic, traditional]. Expected file formats: [e.g.: AI, PDF, PNG]. Number of proposals desired: [e.g.: 2-3 concepts].',
    exigences: 'Source files delivered (AI, PSD): [yes / no]. Number of revisions included: [e.g.: 2 revisions]. Intellectual property rights transferred: [yes / no]. Compliance with existing brand guidelines: [yes / no].',
  },

  'Marketing': {
    titre: 'Marketing service for [objective]',
    description: 'I am looking for a marketing expert for: [e.g.: social media management, advertising campaign, content strategy, SEO]. Platforms concerned: [e.g.: Instagram, Facebook, Google Ads]. Main objective: [e.g.: awareness, lead generation, sales]. Monthly advertising budget allocated: [e.g.: 2,000 MAD].',
    exigences: 'Monthly performance report desired: [yes / no]. Access to existing accounts to be provided. Visual content creation included: [yes / no]. Weekly follow-up meeting: [yes / no].',
  },
};

export const DEVIS_TEMPLATES = {
  'plomberie': {
    prestations: (duree) => [
      `- On-site diagnosis and assessment`,
      `- Plumbing intervention (${duree}h)`,
      `- Supply of standard materials`,
      `- Testing and verification after intervention`,
      `- Site cleanup`,
    ],
  },
  'électricité': {
    prestations: (duree) => [
      `- On-site electrical diagnosis`,
      `- Electrical intervention and work (${duree}h)`,
      `- Supply of standard materials`,
      `- Compliance testing after intervention`,
      `- Site cleanup`,
    ],
  },
  'ménage': {
    prestations: (duree) => [
      `- Complete home cleaning (${duree}h)`,
      `- Vacuuming and floor washing`,
      `- Bathroom and kitchen cleaning`,
      `- Surface dusting`,
      `- Cleaning products provided`,
    ],
  },
  'bricolage': {
    prestations: (duree) => [
      `- Assessment and preparation (${duree}h)`,
      `- Execution of requested work`,
      `- Tools provided`,
      `- Verification and finishing`,
    ],
  },
  'photographe': {
    prestations: (duree) => [
      `- Photo session of ${duree}h`,
      `- Professional shooting (all key moments)`,
      `- Selection and retouching of best photos`,
      `- Delivery via secure online gallery`,
      `- Personal use rights included`,
    ],
  },
  'vidéaste': {
    prestations: (duree) => [
      `- Filming of ${duree}h`,
      `- Professional multi-angle capture`,
      `- Video editing and color grading`,
      `- Royalty-free music`,
      `- Delivery in HD format`,
    ],
  },
  'décorateur': {
    prestations: (duree) => [
      `- Decoration setup (${duree}h)`,
      `- Supply of decorative elements`,
      `- Themed staging`,
      `- On-site coordination`,
      `- Teardown included`,
    ],
  },
  'traiteur': {
    prestations: (duree) => [
      `- Catering service (${duree}h)`,
      `- Menu preparation`,
      `- Table service`,
      `- Dishes and equipment provided`,
      `- Post-event cleanup`,
    ],
  },
  'animateur': {
    prestations: (duree) => [
      `- Entertainment of ${duree}h`,
      `- Games and activities`,
      `- Sound equipment`,
      `- Interaction with audience`,
      `- Adapted to all ages`,
    ],
  },
  'dj': {
    prestations: (duree) => [
      `- DJ set of ${duree}h`,
      `- Professional sound system`,
      `- Lighting`,
      `- Custom playlist`,
      `- Setup and teardown included`,
    ],
  },
  'organisateur': {
    prestations: (duree) => [
      `- Complete organization (${duree}h})`,
      `- Provider coordination`,
      `- Logistics management`,
      `- On-site presence`,
      `- Progress reports`,
    ],
  },
  'fleuriste': {
    prestations: (duree) => [
      `- Floral creation (${duree}h)`,
      `- Fresh flowers`,
      `- Delivery and installation`,
      `- Custom arrangements`,
      `- Teardown included`,
    ],
  },
  'chauffeur': {
    prestations: (duree) => [
      `- Private transport (${duree}h)`,
      `- High-end vehicle`,
      `- Bottled water on board`,
      `- Luggage assistance`,
      `- Punctuality guaranteed`,
    ],
  },
  'livraison': {
    prestations: (duree) => [
      `- Delivery service (${duree}h)`,
      `- Package pickup`,
      `- Secure transport`,
      `- Delivery confirmation`,
      `- Careful handling`,
    ],
  },
  'déménagement': {
    prestations: (duree) => [
      `- Moving service (${duree}h)`,
      `- Furniture protection`,
      `- Disassembly / reassembly`,
      `- Truck provided`,
      `- Professional team`,
    ],
  },
  'développement': {
    prestations: (duree) => [
      `- Development (${duree}h)`,
      `- Source code delivered`,
      `- Testing and QA`,
      `- Documentation`,
      `- Deployment included`,
    ],
  },
  'design': {
    prestations: (duree) => [
      `- Design creation (${duree}h)`,
      `- Multiple concepts`,
      `- Revisions included`,
      `- Source files delivered`,
      `- Rights transferred`,
    ],
  },
  'marketing': {
    prestations: (duree) => [
      `- Marketing service (${duree}h)`,
      `- Strategy definition`,
      `- Content creation`,
      `- Performance tracking`,
      `- Monthly report`,
    ],
  },
};