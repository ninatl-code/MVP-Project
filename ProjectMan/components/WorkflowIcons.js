// Composant utilitaire pour les icônes du workflow interactif

export const WorkflowIcons = {
  // Outils
  SELECT: '🎯',
  TEXT: '📝',
  RECTANGLE: '⬜',
  CIRCLE: '🔴',
  ARROW: '➡️',
  
  // Types de workflow
  START: '🚀',
  PROCESS: '⚙️',
  DECISION: '❓',
  END: '🏁',
  APPROVAL: '✅',
  
  // Actions
  UNDO: '↶',
  REDO: '↷',
  DELETE: '🗑️',
  SAVE: '💾',
  EXPORT: '📤',
  GRID: '⊞',
  ZOOM_IN: '+',
  ZOOM_OUT: '−',
  
  // Navigation
  SIDEBAR_OPEN: '→',
  SIDEBAR_CLOSE: '←'
};

export const getWorkflowShapeIcon = (type) => {
  switch (type) {
    case 'start': return WorkflowIcons.START;
    case 'process': return WorkflowIcons.PROCESS;
    case 'decision': return WorkflowIcons.DECISION;
    case 'approval': return WorkflowIcons.APPROVAL;
    case 'end': return WorkflowIcons.END;
    default: return WorkflowIcons.PROCESS;
  }
};

export const getWorkflowShapeColor = (type) => {
  switch (type) {
    case 'start': return '#10b981'; // Vert
    case 'process': return '#3b82f6'; // Bleu
    case 'decision': return '#f59e0b'; // Orange
    case 'approval': return '#8b5cf6'; // Violet
    case 'end': return '#ef4444'; // Rouge
    default: return '#6b7280'; // Gris
  }
};