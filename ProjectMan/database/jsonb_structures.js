/**
 * STRUCTURE RECOMMANDÉE DES DONNÉES JSONB
 * =====================================
 */

// 1. deliverable_templates.content
const templateContent = {
  // Structure du document
  sections: [
    {
      id: "header",
      type: "header",
      title: { en: "Project Charter", fr: "Charte Projet" },
      required: true,
      fields: [
        {
          id: "project_name",
          type: "text",
          label: { en: "Project Name", fr: "Nom du Projet" },
          placeholder: { en: "Enter project name", fr: "Saisir le nom du projet" },
          required: true
        }
      ]
    },
    {
      id: "objectives",
      type: "content",
      title: { en: "Objectives", fr: "Objectifs" },
      fields: [
        {
          id: "main_objectives",
          type: "textarea",
          label: { en: "Main Objectives", fr: "Objectifs Principaux" },
          rows: 4
        }
      ]
    }
  ],
  // Style par défaut
  defaultStyle: {
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    fontFamily: "Inter",
    fontSize: 14
  }
};

// 2. deliverables.content (document rempli)
const deliverableContent = {
  // Données saisies par l'utilisateur
  data: {
    project_name: "Site E-commerce MVP",
    main_objectives: "Créer une plateforme de vente en ligne..."
  },
  // Version du template utilisé
  template_version: "1.0",
  // Métadonnées
  metadata: {
    last_edited_section: "objectives",
    completion_percentage: 75,
    word_count: 1250
  }
};

// 3. document_customizations.custom_styles
const customStyles = {
  // Styles de sections
  sections: {
    header: {
      backgroundColor: "#f8fafc",
      borderBottom: "2px solid #2563eb"
    },
    content: {
      lineHeight: 1.6,
      marginBottom: "20px"
    }
  },
  // Styles de champs
  fields: {
    title: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#1e293b"
    },
    text: {
      fontSize: "14px",
      color: "#334155"
    }
  }
};

// 4. document_exports.export_settings
const exportSettings = {
  format: "pdf",
  options: {
    pageSize: "A4",
    orientation: "portrait",
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    includeHeader: true,
    includeFooter: true,
    watermark: false
  },
  customizations_applied: true
};