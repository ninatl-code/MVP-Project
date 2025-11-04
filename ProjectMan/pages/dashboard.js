import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LANGUAGES = {
  en: {
    welcome: "Welcome,",
    createProject: "Create Project",
    projects: "Your Projects",
    noProjects: "No projects yet.",
    phase: "Phase",
    status: "Status",
    menu: "Menu",
    logout: "Logout",
    settings: "Settings",
    editProfile: "Edit Profile",
    history: "Project History",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    archived: "Archived",
    active: "Active",
    completed: "Completed",
    draft: "Draft",
    language: "Language",
  },
  fr: {
    welcome: "Bienvenue,",
    createProject: "Créer un projet",
    projects: "Vos projets",
    noProjects: "Aucun projet pour l'instant.",
    phase: "Phase",
    status: "Statut",
    menu: "Menu",
    logout: "Déconnexion",
    settings: "Paramètres",
    editProfile: "Modifier le profil",
    history: "Historique des projets",
    view: "Voir",
    edit: "Modifier",
    delete: "Supprimer",
    archived: "Archivé",
    active: "Actif",
    completed: "Terminé",
    draft: "Brouillon",
    language: "Langue",
  }
};

export default function Dashboard({ user }) {
  const [projects, setProjects] = useState([]);
  const [language, setLanguage] = useState(user?.language || 'en');
  const t = LANGUAGES[language];

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setProjects(data || []);
    }
    fetchProjects();
  }, [user]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <span style={styles.welcome}>{t.welcome} {user.full_name}</span>
          <button style={styles.settingsBtn}>{t.settings}</button>
        </div>
        <button style={styles.logoutBtn}>{t.logout}</button>
      </div>
      <div style={styles.menuBar}>
        <button style={styles.createBtn}>{t.createProject}</button>
        <span style={styles.languageSwitch}>
          {t.language}: 
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </span>
      </div>
      <div style={styles.projectsSection}>
        <h2 style={styles.sectionTitle}>{t.projects}</h2>
        {projects.length === 0 ? (
          <div style={styles.noProjects}>{t.noProjects}</div>
        ) : (
          <div style={styles.projectsList}>
            {projects.map(project => (
              <div key={project.id} style={styles.projectCard}>
                <div style={styles.projectHeader}>
                  <span style={styles.projectName}>{project.name}</span>
                  <span style={styles.projectStatus}>{t[project.status] || project.status}</span>
                </div>
                <div style={styles.projectDesc}>{project.description}</div>
                <div style={styles.projectMeta}>
                  <span>{t.phase}: {project.phase || '-'}</span>
                  <span>{t.status}: {t[project.status] || project.status}</span>
                </div>
                <div style={styles.projectActions}>
                  <button style={styles.actionBtn}>{t.view}</button>
                  <button style={styles.actionBtn}>{t.edit}</button>
                  <button style={styles.actionBtn}>{t.delete}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: 32,
    fontFamily: 'Inter, Arial, sans-serif',
    background: '#F8F9FB',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 700,
    color: '#635BFF',
    marginRight: 16,
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 16,
    cursor: 'pointer',
    marginLeft: 8,
  },
  logoutBtn: {
    background: '#FF385C',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 18px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 16,
  },
  menuBar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 32,
    gap: 24,
  },
  createBtn: {
    background: '#635BFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontWeight: 600,
    fontSize: 18,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99,91,255,0.08)',
  },
  languageSwitch: {
    fontSize: 16,
    color: '#888',
    marginLeft: 16,
  },
  projectsSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 18,
    color: '#222',
  },
  noProjects: {
    color: '#888',
    fontSize: 16,
    padding: 24,
    textAlign: 'center',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  projectCard: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(99,91,255,0.08)',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 4,
  },
  projectName: {
    color: '#635BFF',
    fontWeight: 700,
    fontSize: 18,
  },
  projectStatus: {
    color: '#888',
    fontWeight: 600,
    fontSize: 15,
    background: '#F8F9FB',
    borderRadius: 6,
    padding: '2px 10px',
  },
  projectDesc: {
    color: '#444',
    fontSize: 15,
    marginBottom: 4,
  },
  projectMeta: {
    color: '#888',
    fontSize: 14,
    display: 'flex',
    gap: 16,
    marginBottom: 6,
  },
  projectActions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    background: '#F8F9FB',
    color: '#635BFF',
    border: 'none',
    borderRadius: 6,
    padding: '6px 16px',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
};
