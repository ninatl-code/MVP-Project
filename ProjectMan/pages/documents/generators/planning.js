import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../../lib/supabaseClient';

// Constants
const TASK_STATUS = {
  NOT_STARTED: 'À faire',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  ON_HOLD: 'En attente',
  BLOCKED: 'Bloqué'
};

// Main Component
export default function SmartsheetPlanning() {
  const router = useRouter();
  const { projectId, deliverableId } = router.query;

  // State
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [deliverable, setDeliverable] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Timeline state - showing weeks like in Smartsheet
  const [timelineStart, setTimelineStart] = useState(() => {
    const today = new Date();
    return startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21));
  });
  const [timelineEnd, setTimelineEnd] = useState(() => {
    const today = new Date();
    return endOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 77));
  });
  const [columnWidth] = useState(120); // Fixed width for week columns

  // Computed values
  const timelineWeeks = useMemo(() => {
    const weeks = [];
    let currentWeek = startOfWeek(timelineStart);
    while (currentWeek <= timelineEnd) {
      weeks.push({
        start: currentWeek,
        end: endOfWeek(currentWeek),
        weekNumber: format(currentWeek, 'w', { locale: fr }),
        monthYear: format(currentWeek, 'MMMM yyyy', { locale: fr })
      });
      currentWeek = addDays(currentWeek, 7);
    }
    return weeks;
  }, [timelineStart, timelineEnd]);

  // Event handlers
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const calculateDuration = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = differenceInDays(end, start) + 1;
    return `${diffDays}j`;
  }, []);

  // Data management
  const loadTasks = useCallback(async () => {
    if (!deliverableId) return;

    try {
      console.log('Chargement du planning pour deliverableId:', deliverableId);
      
      const { data, error } = await supabase
        .from('deliverables')
        .select('content')
        .eq('id', deliverableId)
        .single();

      if (error) {
        console.error('Erreur Supabase lors du chargement:', error);
        // Données par défaut si pas de contenu
        setTasks([
          {
            id: '1',
            title: 'Analyse des besoins',
            assignee: 'Alice',
            start_date: '2024-11-01',
            end_date: '2024-11-15',
            notes: 'Recueillir les besoins clients',
            status: 'Terminé',
            progress: 100
          },
          {
            id: '2',
            title: 'Conception architecture',
            assignee: 'Bob',
            start_date: '2024-11-10',
            end_date: '2024-11-25',
            notes: 'Définir l\'architecture technique',
            status: 'En cours',
            progress: 60
          },
          {
            id: '3',
            title: 'Développement frontend',
            assignee: 'Charlie',
            start_date: '2024-11-20',
            end_date: '2024-12-15',
            notes: 'Interface utilisateur',
            status: 'À faire',
            progress: 0
          }
        ]);
        return;
      }

      // Si content existe et contient des tasks
      if (data?.content?.tasks) {
        console.log('Planning chargé depuis deliverable:', data.content.tasks);
        setTasks(data.content.tasks);
      } else {
        // Données par défaut
        setTasks([
          {
            id: '1',
            title: 'Nouvelle tâche',
            assignee: '',
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
            notes: '',
            status: 'À faire',
            progress: 0
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du planning:', error);
      showNotification('Erreur lors du chargement du planning', 'error');
    }
  }, [deliverableId, showNotification]);

  const savePlanning = useCallback(async (updatedTasks = tasks) => {
    if (!deliverableId) {
      showNotification('ID du livrable manquant', 'error');
      return;
    }

    setSaving(true);
    try {
      console.log('Sauvegarde du planning:', { deliverableId, tasks: updatedTasks });

      // Préparer le contenu JSON
      const planningContent = {
        tasks: updatedTasks,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      const { error } = await supabase
        .from('deliverables')
        .update({
          content: planningContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliverableId);

      if (error) {
        console.error('Erreur Supabase sauvegarde:', error);
        throw error;
      }

      console.log('Planning sauvegardé avec succès');
      showNotification('Planning sauvegardé avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du planning:', error);
      showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [deliverableId, tasks, showNotification]);

  const saveTask = useCallback(async (taskData, isNew = false) => {
    try {
      let updatedTasks;
      
      if (isNew) {
        const newTask = {
          id: Date.now().toString(),
          title: taskData.title || 'Nouvelle tâche',
          assignee: taskData.assignee || '',
          start_date: taskData.start_date || format(new Date(), 'yyyy-MM-dd'),
          end_date: taskData.end_date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
          notes: taskData.notes || '',
          status: taskData.status || TASK_STATUS.NOT_STARTED,
          progress: taskData.progress || 0
        };
        
        updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
      } else {
        updatedTasks = tasks.map(task => 
          task.id === taskData.id ? { ...task, ...taskData } : task
        );
        setTasks(updatedTasks);
      }

      // Sauvegarder dans deliverables
      await savePlanning(updatedTasks);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tâche:', error);
      showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    }
  }, [tasks, savePlanning]);

  const deleteTask = useCallback(async (taskId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    
    try {
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      await savePlanning(updatedTasks);
      showNotification('Tâche supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showNotification('Erreur lors de la suppression', 'error');
    }
  }, [tasks, savePlanning]);

  const handleCellEdit = useCallback(async (taskId, field, value) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, [field]: value };
      // Recalculate duration if dates change
      if (field === 'start_date' || field === 'end_date') {
        updatedTask.duration = calculateDuration(
          field === 'start_date' ? value : task.start_date,
          field === 'end_date' ? value : task.end_date
        );
      }
      
      // Mise à jour locale immédiate
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? updatedTask : t
      );
      setTasks(updatedTasks);
      
      // Sauvegarde automatique
      await savePlanning(updatedTasks);
    }
  }, [tasks, savePlanning, calculateDuration]);

  const addNewTask = useCallback(async () => {
    const newTask = {
      title: 'Nouvelle tâche',
      assignee: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      notes: '',
      status: TASK_STATUS.NOT_STARTED,
      progress: 0
    };
    await saveTask(newTask, true);
  }, [saveTask]);

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setUser({ id: session.user.id, email: session.user.email });

        if (deliverableId) {
          // Charger le livrable et le projet associé
          const { data: deliverableData } = await supabase
            .from('deliverables')
            .select(`
              *,
              projects (*)
            `)
            .eq('id', deliverableId)
            .single();
            
          if (deliverableData) {
            setDeliverable(deliverableData);
            setProject(deliverableData.projects);
          }
          await loadTasks();
        }
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, [deliverableId, router, loadTasks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Planning - {deliverable?.name || 'Livrable'}</title>
        <meta name="description" content="Planning de projet style Smartsheet" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <SmartsheetHeader
          project={project}
          deliverable={deliverable}
          projectId={projectId}
          deliverableId={deliverableId}
          router={router}
          onAddTask={addNewTask}
        />

        {/* Info bar */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">
              {saving ? 'Sauvegarde en cours...' : 'Toutes les modifications sont sauvegardées automatiquement dans le livrable'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-120px)] border-t border-gray-300">
          {/* Tasks Table */}
          <div className="flex-none w-1/2 border-r border-gray-300 overflow-hidden">
            <SmartsheetTable
              tasks={tasks}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
              onCellEdit={handleCellEdit}
              onAddTask={addNewTask}
              onDeleteTask={deleteTask}
              calculateDuration={calculateDuration}
            />
          </div>

          {/* Gantt Chart */}
          <div className="flex-1 overflow-auto">
            <SmartsheetGantt
              tasks={tasks}
              timelineWeeks={timelineWeeks}
              columnWidth={columnWidth}
              timelineStart={timelineStart}
              onCellEdit={handleCellEdit}
            />
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`p-4 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {notification.message}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Header Component
function SmartsheetHeader({ project, deliverable, projectId, deliverableId, router, onAddTask }) {
  return (
    <div className="bg-white border-b border-gray-300 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`/project/${projectId}/documents`)}
            className="p-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {deliverable?.name || 'Planning'}
              </h1>
              <p className="text-sm text-gray-600">
                {project?.name || 'Projet'} • Style Smartsheet
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <svg className="w-4 h-4 text-gray-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm text-gray-700">Diagramme de Gantt</span>
          </div>
          
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          <button 
            onClick={onAddTask}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            + Ajouter une ligne
          </button>

          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
            Partager
          </button>
        </div>
      </div>
    </div>
  );
}
// Smartsheet Table Component
function SmartsheetTable({ 
  tasks, editingCell, setEditingCell, onCellEdit, onAddTask, 
  onDeleteTask, calculateDuration 
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleCellClick = (taskId, field) => {
    setEditingCell({ taskId, field });
  };

  const handleCellBlur = async (taskId, field, value) => {
    if (editingCell?.taskId === taskId && editingCell?.field === field) {
      await onCellEdit(taskId, field, value);
      setEditingCell(null);
    }
  };

  const handleKeyPress = async (e, taskId, field, value) => {
    if (e.key === 'Enter') {
      await handleCellBlur(taskId, field, value);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="w-6 border border-gray-300 p-1 text-center text-xs text-gray-600">#</th>
            <th className="w-8 border border-gray-300 p-1"></th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 min-w-[200px]">
              Actions
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 min-w-[150px]">
              Notes
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 w-24">
              Responsable
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 w-24">
              Date début
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 w-24">
              Date fin
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 w-16">
              Durée
            </th>
            <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-600 w-20">
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <SmartsheetRow
              key={task.id}
              task={task}
              index={index + 1}
              editingCell={editingCell}
              isHovered={hoveredRow === task.id}
              onCellClick={handleCellClick}
              onCellBlur={handleCellBlur}
              onKeyPress={handleKeyPress}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onMouseEnter={() => setHoveredRow(task.id)}
              onMouseLeave={() => setHoveredRow(null)}
              calculateDuration={calculateDuration}
            />
          ))}
          <tr>
            <td colSpan="9" className="border border-gray-300 p-2">
              <button
                onClick={() => onAddTask()}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une ligne
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Smartsheet Row Component
function SmartsheetRow({ 
  task, index, editingCell, isHovered, onCellClick, onCellBlur, 
  onKeyPress, onAddTask, onDeleteTask, onMouseEnter, onMouseLeave, calculateDuration 
}) {
  const [tempValues, setTempValues] = useState({});
  
  const isEditing = (field) => {
    return editingCell?.taskId === task.id && editingCell?.field === field;
  };

  const getValue = (field) => {
    return tempValues[field] !== undefined ? tempValues[field] : task[field] || '';
  };

  const setValue = (field, value) => {
    setTempValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <tr 
      className={`hover:bg-gray-50 ${task.is_parent ? 'bg-blue-50' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Row Number */}
      <td className="border border-gray-300 p-1 text-center text-xs text-gray-500 bg-gray-50">
        {index}
      </td>

      {/* Hierarchy Controls */}
      <td className="border border-gray-300 p-1 text-center">
        <div className="flex items-center justify-center space-x-1">
          {task.is_parent && (
            <button className="text-gray-600 hover:text-gray-800">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {isHovered && (
            <div className="flex space-x-1">
              <button
                onClick={() => onAddTask(task.id, task.indent_level + 1)}
                className="text-green-600 hover:text-green-800"
                title="Ajouter une sous-tâche"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-red-600 hover:text-red-800"
                title="Supprimer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="border border-gray-300 p-2" style={{ paddingLeft: `${8 + task.indent_level * 20}px` }}>
        {isEditing('title') ? (
          <input
            type="text"
            value={getValue('title')}
            onChange={(e) => setValue('title', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'title', getValue('title'))}
            onKeyPress={(e) => onKeyPress(e, task.id, 'title', getValue('title'))}
            className="w-full border-none outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'title')}
            className={`cursor-text hover:bg-blue-50 p-1 rounded ${task.is_parent ? 'font-semibold' : ''}`}
          >
            {task.title || 'Cliquez pour modifier'}
          </div>
        )}
      </td>

      {/* Notes */}
      <td className="border border-gray-300 p-2">
        {isEditing('notes') ? (
          <input
            type="text"
            value={getValue('notes')}
            onChange={(e) => setValue('notes', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'notes', getValue('notes'))}
            onKeyPress={(e) => onKeyPress(e, task.id, 'notes', getValue('notes'))}
            className="w-full border-none outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'notes')}
            className="cursor-text hover:bg-blue-50 p-1 rounded text-sm text-gray-600"
          >
            {task.notes || ''}
          </div>
        )}
      </td>

      {/* Responsable */}
      <td className="border border-gray-300 p-2">
        {isEditing('assignee') ? (
          <input
            type="text"
            value={getValue('assignee')}
            onChange={(e) => setValue('assignee', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'assignee', getValue('assignee'))}
            onKeyPress={(e) => onKeyPress(e, task.id, 'assignee', getValue('assignee'))}
            className="w-full border-none outline-none bg-transparent text-sm"
            autoFocus
          />
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'assignee')}
            className="cursor-text hover:bg-blue-50 p-1 rounded text-sm"
          >
            {task.assignee || ''}
          </div>
        )}
      </td>

      {/* Date début */}
      <td className="border border-gray-300 p-2">
        {isEditing('start_date') ? (
          <input
            type="date"
            value={getValue('start_date')}
            onChange={(e) => setValue('start_date', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'start_date', getValue('start_date'))}
            onKeyPress={(e) => onKeyPress(e, task.id, 'start_date', getValue('start_date'))}
            className="w-full border-none outline-none bg-transparent text-sm"
            autoFocus
          />
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'start_date')}
            className="cursor-text hover:bg-blue-50 p-1 rounded text-sm"
          >
            {task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy') : ''}
          </div>
        )}
      </td>

      {/* Date fin */}
      <td className="border border-gray-300 p-2">
        {isEditing('end_date') ? (
          <input
            type="date"
            value={getValue('end_date')}
            onChange={(e) => setValue('end_date', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'end_date', getValue('end_date'))}
            onKeyPress={(e) => onKeyPress(e, task.id, 'end_date', getValue('end_date'))}
            className="w-full border-none outline-none bg-transparent text-sm"
            autoFocus
          />
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'end_date')}
            className="cursor-text hover:bg-blue-50 p-1 rounded text-sm"
          >
            {task.end_date ? format(new Date(task.end_date), 'dd/MM/yyyy') : ''}
          </div>
        )}
      </td>

      {/* Durée */}
      <td className="border border-gray-300 p-2 text-center text-sm text-gray-600">
        {calculateDuration(task.start_date, task.end_date)}
      </td>

      {/* Statut */}
      <td className="border border-gray-300 p-2">
        {isEditing('status') ? (
          <select
            value={getValue('status')}
            onChange={(e) => setValue('status', e.target.value)}
            onBlur={() => onCellBlur(task.id, 'status', getValue('status'))}
            className="w-full border-none outline-none bg-transparent text-sm"
            autoFocus
          >
            <option value="">-</option>
            {Object.values(TASK_STATUS).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        ) : (
          <div
            onClick={() => onCellClick(task.id, 'status')}
            className="cursor-text hover:bg-blue-50 p-1 rounded text-sm"
          >
            {task.status || ''}
          </div>
        )}
      </td>
    </tr>
  );
}

// Smartsheet Gantt Component
function SmartsheetGantt({ tasks, timelineWeeks, columnWidth, timelineStart, onCellEdit }) {
  const calculateBarPosition = (startDate) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const timelineStartDate = new Date(timelineStart);
    const diffDays = Math.floor((start - timelineStartDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, (diffDays / 7) * columnWidth);
  };

  const calculateBarWidth = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(columnWidth * 0.1, (diffDays / 7) * columnWidth);
  };

  return (
    <div className="h-full overflow-auto">
      {/* Gantt Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-300">
        {/* Month Headers */}
        <div className="flex">
          {timelineWeeks.reduce((monthHeaders, week, index) => {
            const currentMonth = week.monthYear;
            const lastHeader = monthHeaders[monthHeaders.length - 1];
            
            if (!lastHeader || lastHeader.month !== currentMonth) {
              monthHeaders.push({
                month: currentMonth,
                startIndex: index,
                endIndex: index,
                width: columnWidth
              });
            } else {
              lastHeader.endIndex = index;
              lastHeader.width = (lastHeader.endIndex - lastHeader.startIndex + 1) * columnWidth;
            }
            
            return monthHeaders;
          }, []).map((header, index) => (
            <div
              key={index}
              className="border-r border-gray-300 bg-gray-50 p-2 text-center text-sm font-medium text-gray-700"
              style={{ width: header.width }}
            >
              {header.month}
            </div>
          ))}
        </div>

        {/* Week Headers */}
        <div className="flex">
          {timelineWeeks.map((week, index) => (
            <div
              key={index}
              className="border-r border-gray-300 bg-white p-2 text-center text-xs text-gray-600"
              style={{ width: columnWidth }}
            >
              Semaine {week.weekNumber}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Body */}
      <div className="relative">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`relative border-b border-gray-200 ${task.is_parent ? 'bg-blue-50' : 'bg-white'}`}
            style={{ height: '32px' }}
          >
            {/* Week Grid */}
            <div className="absolute inset-0 flex">
              {timelineWeeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="border-r border-gray-200"
                  style={{ width: columnWidth }}
                />
              ))}
            </div>

            {/* Task Bar */}
            {task.start_date && task.end_date && (
              <div
                className={`absolute top-1 bottom-1 rounded-sm ${
                  task.is_parent 
                    ? 'bg-blue-600' 
                    : task.status === TASK_STATUS.COMPLETED 
                      ? 'bg-green-600' 
                      : 'bg-blue-500'
                } cursor-pointer hover:opacity-80 flex items-center px-2`}
                style={{
                  left: calculateBarPosition(task.start_date),
                  width: calculateBarWidth(task.start_date, task.end_date)
                }}
                title={`${task.title} (${format(new Date(task.start_date), 'dd/MM')} - ${format(new Date(task.end_date), 'dd/MM')})`}
              >
                <span className="text-white text-xs truncate">{task.title}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const calculateTaskWidth = (startDate, endDate, dayWidth) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  return diffDays * dayWidth;
};

const calculateTaskPosition = (startDate, timelineStart, dayWidth) => {
  const start = new Date(startDate);
  const timeline = new Date(timelineStart);
  const diffTime = start - timeline;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays * dayWidth);
};
