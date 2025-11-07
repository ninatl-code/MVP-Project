import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Circle, Ellipse, Line, Arrow } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { 
  FiMove, FiSquare, FiCircle, FiType, FiMousePointer, 
  FiGrid, FiSave, FiDownload, FiUpload, FiCopy, 
  FiTrash2, FiZoomIn, FiZoomOut, FiRotateCcw,
  FiLayers, FiSettings, FiHelpCircle, FiMenu, FiX
} from 'react-icons/fi';

/* ========== CONFIGURATION ========== */

const MIRO_COLORS = {
  yellow: '#FEF445',
  pink: '#F24E98', 
  blue: '#05F',
  green: '#0C6',
  orange: '#FF9500',
  purple: '#9B51E0',
  red: '#F24E1E',
  teal: '#00D4AA',
  gray: '#F4F4F4',
  white: '#FFFFFF'
};

const TOOLS = {
  SELECT: 'select',
  STICKY: 'sticky', 
  TEXT: 'text',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  SWIMLANE: 'swimlane',
  CONNECTOR: 'connector',
  PEN: 'pen'
};

const WORKFLOW_SHAPES = [
  { type: 'rectangle', name: 'Process', description: 'Étape de processus' },
  { type: 'diamond', name: 'Decision', description: 'Point de décision' },
  { type: 'circle', name: 'Start/End', description: 'Début ou fin' },
  { type: 'swimlane', name: 'Swimlane', description: 'Couloir de responsabilité' }
];

const TEMPLATES = [
  {
    id: 'basic-workflow',
    name: 'Workflow Simple',
    description: 'Un workflow basique avec début, processus et fin',
    elements: [
      { type: 'shape', x: 100, y: 100, shapeType: 'circle', text: 'Début', color: MIRO_COLORS.green },
      { type: 'shape', x: 300, y: 100, shapeType: 'rectangle', text: 'Processus 1', color: MIRO_COLORS.blue },
      { type: 'shape', x: 500, y: 100, shapeType: 'diamond', text: 'Décision?', color: MIRO_COLORS.orange },
      { type: 'shape', x: 700, y: 100, shapeType: 'circle', text: 'Fin', color: MIRO_COLORS.red }
    ]
  },
  {
    id: 'swimlane-workflow',
    name: 'Workflow avec Couloirs',
    description: 'Workflow organisé par responsabilités',
    elements: [
      { type: 'swimlane', x: 50, y: 50, width: 800, height: 120, text: 'Équipe A', color: MIRO_COLORS.blue },
      { type: 'swimlane', x: 50, y: 180, width: 800, height: 120, text: 'Équipe B', color: MIRO_COLORS.green },
      { type: 'swimlane', x: 50, y: 310, width: 800, height: 120, text: 'Management', color: MIRO_COLORS.purple },
      { type: 'shape', x: 100, y: 85, shapeType: 'rectangle', text: 'Tâche 1', color: MIRO_COLORS.yellow },
      { type: 'shape', x: 100, y: 215, shapeType: 'rectangle', text: 'Tâche 2', color: MIRO_COLORS.yellow },
      { type: 'shape', x: 100, y: 345, shapeType: 'diamond', text: 'Validation', color: MIRO_COLORS.orange }
    ]
  }
];

/* ========== COMPOSANT PRINCIPAL ========== */

const WorkflowInteractive = () => {
  /* ========== ÉTATS ========== */
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentTool, setCurrentTool] = useState(TOOLS.SELECT);
  const [selectedColor, setSelectedColor] = useState(MIRO_COLORS.yellow);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState(null);
  const [tempText, setTempText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [screenSize, setScreenSize] = useState({ width: 1200, height: 800 });

  const stageRef = useRef();

  /* ========== FONCTIONS UTILITAIRES ========== */

  const showNotification = useCallback((message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const createElement = useCallback((type, position, options = {}) => {
    const id = uuidv4();
    const baseElement = {
      id,
      x: position.x,
      y: position.y,
      draggable: true,
      ...options
    };

    switch (type) {
      case 'sticky':
        return {
          ...baseElement,
          type: 'sticky',
          width: 200,
          height: 200,
          text: options.text || 'Nouvelle note',
          color: options.color || selectedColor,
          fontSize: 14
        };

      case 'text':
        return {
          ...baseElement,
          type: 'text',
          text: options.text || 'Nouveau texte',
          fontSize: options.fontSize || 16,
          color: '#000000'
        };

      case 'shape':
        const shapeType = options.shapeType || 'rectangle';
        return {
          ...baseElement,
          type: 'shape',
          shapeType,
          width: shapeType === 'circle' ? 100 : 150,
          height: shapeType === 'circle' ? 100 : 100,
          text: options.text || shapeType,
          color: options.color || selectedColor,
          strokeColor: '#000000',
          strokeWidth: 2
        };

      case 'swimlane':
        return {
          ...baseElement,
          type: 'swimlane',
          width: options.width || 600,
          height: options.height || 120,
          text: options.text || 'Nouveau couloir',
          color: options.color || selectedColor,
          strokeColor: '#666666',
          strokeWidth: 2
        };

      case 'arrow':
        return {
          ...baseElement,
          type: 'arrow',
          points: options.points || [0, 0, 100, 0],
          color: '#000000',
          strokeWidth: 2
        };

      default:
        return baseElement;
    }
  }, [selectedColor]);

  const addElement = useCallback((type, position, options = {}) => {
    const newElement = createElement(type, position, options);
    setElements(prev => [...prev, newElement]);
    setSelectedIds([newElement.id]);
    showNotification(`${type} ajouté(e)`);
  }, [createElement, showNotification]);

  const handleCanvasClick = useCallback((e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    
    if (clickedOnEmpty) {
      setSelectedIds([]);
      
      if (currentTool !== TOOLS.SELECT) {
        const position = e.target.getStage().getPointerPosition();
        const relativePos = {
          x: (position.x - stagePosition.x) / stageScale,
          y: (position.y - stagePosition.y) / stageScale
        };
        
        switch (currentTool) {
          case TOOLS.STICKY:
            addElement('sticky', relativePos);
            break;
          case TOOLS.TEXT:
            addElement('text', relativePos);
            break;
          case TOOLS.RECTANGLE:
            addElement('shape', relativePos, { shapeType: 'rectangle' });
            break;
          case TOOLS.CIRCLE:
            addElement('shape', relativePos, { shapeType: 'circle' });
            break;
          case TOOLS.DIAMOND:
            addElement('shape', relativePos, { shapeType: 'diamond' });
            break;
          case TOOLS.SWIMLANE:
            addElement('swimlane', relativePos);
            break;
        }
        
        setCurrentTool(TOOLS.SELECT);
      }
    }
  }, [currentTool, stagePosition, stageScale, addElement]);

  const handleElementClick = useCallback((e, elementId) => {
    e.cancelBubble = true;
    const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
    
    if (isMultiSelect) {
      setSelectedIds(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedIds([elementId]);
    }
  }, []);

  const handleElementDoubleClick = useCallback((elementId) => {
    const element = elements.find(el => el.id === elementId);
    if (element && (element.text !== undefined)) {
      setEditingText(elementId);
      setTempText(element.text);
    }
  }, [elements]);

  const updateElement = useCallback((elementId, updates) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length > 0) {
      setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
      setSelectedIds([]);
      showNotification(`${selectedIds.length} élément(s) supprimé(s)`);
    }
  }, [selectedIds, showNotification]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length > 0) {
      const selectedElements = elements.filter(el => selectedIds.includes(el.id));
      const duplicates = selectedElements.map(el => ({
        ...el,
        id: uuidv4(),
        x: el.x + 20,
        y: el.y + 20
      }));
      setElements(prev => [...prev, ...duplicates]);
      setSelectedIds(duplicates.map(el => el.id));
      showNotification(`${duplicates.length} élément(s) dupliqué(s)`);
    }
  }, [selectedIds, elements, showNotification]);

  const applyTemplate = useCallback((template) => {
    const templateElements = template.elements.map(el => 
      createElement(el.type, { x: el.x, y: el.y }, el)
    );
    setElements(templateElements);
    showNotification(`Template "${template.name}" appliqué`);
    setShowSidebar(false);
  }, [createElement, showNotification]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    };
    
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const factor = 1.1;
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
    
    setStageScale(newScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    });
  }, []);

  const resetZoom = useCallback(() => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  }, []);

  /* ========== GESTIONNAIRES D'ÉVÉNEMENTS CLAVIER ========== */

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'Escape') {
        setCurrentTool(TOOLS.SELECT);
        setSelectedIds([]);
        setEditingText(null);
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, duplicateSelected]);

  // Gestion de la taille de l'écran
  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window !== 'undefined') {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    // Initialisation
    updateScreenSize();

    // Écoute des changements de taille
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateScreenSize);
      return () => window.removeEventListener('resize', updateScreenSize);
    }
  }, []);

  /* ========== COMPOSANTS DE RENDU ========== */

  const renderElement = useCallback((element) => {
    const isSelected = selectedIds.includes(element.id);
    
    switch (element.type) {
      case 'sticky':
        return (
          <React.Fragment key={element.id}>
            <Rect
              id={element.id}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              fill={element.color}
              stroke={isSelected ? '#0066FF' : 'transparent'}
              strokeWidth={isSelected ? 2 : 0}
              draggable={element.draggable}
              onClick={(e) => handleElementClick(e, element.id)}
              onDblClick={() => handleElementDoubleClick(element.id)}
              onDragEnd={(e) => updateElement(element.id, { x: e.target.x(), y: e.target.y() })}
            />
            <Text
              x={element.x + 10}
              y={element.y + 10}
              width={element.width - 20}
              height={element.height - 20}
              text={element.text}
              fontSize={element.fontSize}
              fill="#000"
              verticalAlign="top"
              listening={false}
            />
          </React.Fragment>
        );

      case 'text':
        return (
          <Text
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            text={element.text}
            fontSize={element.fontSize}
            fill={element.color}
            draggable={element.draggable}
            onClick={(e) => handleElementClick(e, element.id)}
            onDblClick={() => handleElementDoubleClick(element.id)}
            onDragEnd={(e) => updateElement(element.id, { x: e.target.x(), y: e.target.y() })}
            stroke={isSelected ? '#0066FF' : 'transparent'}
            strokeWidth={isSelected ? 1 : 0}
          />
        );

      case 'shape':
        if (element.shapeType === 'circle') {
          return (
            <React.Fragment key={element.id}>
              <Circle
                id={element.id}
                x={element.x + element.width / 2}
                y={element.y + element.height / 2}
                radius={element.width / 2}
                fill={element.color}
                stroke={isSelected ? '#0066FF' : element.strokeColor}
                strokeWidth={isSelected ? 3 : element.strokeWidth}
                draggable={element.draggable}
                onClick={(e) => handleElementClick(e, element.id)}
                onDblClick={() => handleElementDoubleClick(element.id)}
                onDragEnd={(e) => updateElement(element.id, { 
                  x: e.target.x() - element.width / 2, 
                  y: e.target.y() - element.height / 2 
                })}
              />
              <Text
                x={element.x}
                y={element.y + element.height / 2 - 8}
                width={element.width}
                text={element.text}
                fontSize={12}
                fill="#000"
                align="center"
                listening={false}
              />
            </React.Fragment>
          );
        } else if (element.shapeType === 'diamond') {
          const centerX = element.x + element.width / 2;
          const centerY = element.y + element.height / 2;
          const points = [
            centerX, element.y,
            element.x + element.width, centerY,
            centerX, element.y + element.height,
            element.x, centerY
          ];
          
          return (
            <React.Fragment key={element.id}>
              <Line
                id={element.id}
                points={points}
                fill={element.color}
                stroke={isSelected ? '#0066FF' : element.strokeColor}
                strokeWidth={isSelected ? 3 : element.strokeWidth}
                closed={true}
                draggable={element.draggable}
                onClick={(e) => handleElementClick(e, element.id)}
                onDblClick={() => handleElementDoubleClick(element.id)}
                onDragEnd={(e) => updateElement(element.id, { x: e.target.x(), y: e.target.y() })}
              />
              <Text
                x={element.x}
                y={element.y + element.height / 2 - 8}
                width={element.width}
                text={element.text}
                fontSize={12}
                fill="#000"
                align="center"
                listening={false}
              />
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={element.id}>
              <Rect
                id={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill={element.color}
                stroke={isSelected ? '#0066FF' : element.strokeColor}
                strokeWidth={isSelected ? 3 : element.strokeWidth}
                draggable={element.draggable}
                onClick={(e) => handleElementClick(e, element.id)}
                onDblClick={() => handleElementDoubleClick(element.id)}
                onDragEnd={(e) => updateElement(element.id, { x: e.target.x(), y: e.target.y() })}
              />
              <Text
                x={element.x + 10}
                y={element.y + element.height / 2 - 8}
                width={element.width - 20}
                text={element.text}
                fontSize={12}
                fill="#000"
                align="center"
                listening={false}
              />
            </React.Fragment>
          );
        }

      case 'swimlane':
        return (
          <React.Fragment key={element.id}>
            <Rect
              id={element.id}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              fill={element.color}
              stroke={isSelected ? '#0066FF' : element.strokeColor}
              strokeWidth={isSelected ? 3 : element.strokeWidth}
              draggable={element.draggable}
              onClick={(e) => handleElementClick(e, element.id)}
              onDblClick={() => handleElementDoubleClick(element.id)}
              onDragEnd={(e) => updateElement(element.id, { x: e.target.x(), y: e.target.y() })}
              opacity={0.3}
            />
            <Text
              x={element.x + 10}
              y={element.y + 10}
              text={element.text}
              fontSize={14}
              fill="#000"
              fontStyle="bold"
              listening={false}
            />
          </React.Fragment>
        );

      default:
        return null;
    }
  }, [selectedIds, handleElementClick, handleElementDoubleClick, updateElement]);

  const renderGrid = () => {
    if (!isGridVisible) return null;
    
    const gridSize = 20;
    const width = screenSize.width;
    const height = screenSize.height;
    const lines = [];
    
    for (let i = 0; i < width / gridSize; i++) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i * gridSize, 0, i * gridSize, height]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }
    
    for (let i = 0; i < height / gridSize; i++) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, i * gridSize, width, i * gridSize]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }
    
    return lines;
  };

  /* ========== RENDU PRINCIPAL ========== */

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      {/* Barre d'outils principale */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-2 flex items-center gap-2 z-10">
        <button
          onClick={() => setCurrentTool(TOOLS.SELECT)}
          className={`p-2 rounded ${currentTool === TOOLS.SELECT ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Sélection"
        >
          <FiMousePointer size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300" />
        
        <button
          onClick={() => setCurrentTool(TOOLS.STICKY)}
          className={`p-2 rounded ${currentTool === TOOLS.STICKY ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Note adhésive"
        >
          <FiSquare size={18} />
        </button>
        
        <button
          onClick={() => setCurrentTool(TOOLS.TEXT)}
          className={`p-2 rounded ${currentTool === TOOLS.TEXT ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Texte"
        >
          <FiType size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300" />
        
        <button
          onClick={() => setCurrentTool(TOOLS.RECTANGLE)}
          className={`p-2 rounded ${currentTool === TOOLS.RECTANGLE ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Rectangle"
        >
          <FiSquare size={18} />
        </button>
        
        <button
          onClick={() => setCurrentTool(TOOLS.CIRCLE)}
          className={`p-2 rounded ${currentTool === TOOLS.CIRCLE ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Cercle"
        >
          <FiCircle size={18} />
        </button>
        
        <button
          onClick={() => setCurrentTool(TOOLS.SWIMLANE)}
          className={`p-2 rounded ${currentTool === TOOLS.SWIMLANE ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Couloir"
        >
          <FiLayers size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300" />
        
        <button
          onClick={() => setIsGridVisible(!isGridVisible)}
          className={`p-2 rounded ${isGridVisible ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          title="Grille"
        >
          <FiGrid size={18} />
        </button>
      </div>

      {/* Palette de couleurs */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-2 flex items-center gap-2 z-10">
        {Object.entries(MIRO_COLORS).map(([name, color]) => (
          <button
            key={name}
            onClick={() => setSelectedColor(color)}
            className={`w-8 h-8 rounded-full border-2 ${selectedColor === color ? 'border-gray-800' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
            title={name}
          />
        ))}
      </div>

      {/* Contrôles de zoom */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2 z-10">
        <button
          onClick={() => setStageScale(prev => Math.min(prev * 1.2, 3))}
          className="p-2 rounded hover:bg-gray-100"
          title="Zoom avant"
        >
          <FiZoomIn size={18} />
        </button>
        
        <button
          onClick={() => setStageScale(prev => Math.max(prev / 1.2, 0.3))}
          className="p-2 rounded hover:bg-gray-100"
          title="Zoom arrière"
        >
          <FiZoomOut size={18} />
        </button>
        
        <button
          onClick={resetZoom}
          className="p-2 rounded hover:bg-gray-100"
          title="Réinitialiser le zoom"
        >
          <FiRotateCcw size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300" />
        
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 rounded hover:bg-gray-100"
          title="Templates"
        >
          <FiMenu size={18} />
        </button>
      </div>

      {/* Actions rapides */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border p-2 flex items-center gap-2 z-10">
        <button
          onClick={duplicateSelected}
          disabled={selectedIds.length === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dupliquer"
        >
          <FiCopy size={18} />
        </button>
        
        <button
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Supprimer"
        >
          <FiTrash2 size={18} />
        </button>
      </div>

      {/* Panneau latéral des templates */}
      {showSidebar && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl border-l z-20 overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Templates</h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <FiX size={20} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {TEMPLATES.map(template => (
              <div key={template.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <h4 className="font-medium mb-1">{template.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <button
                  onClick={() => applyTemplate(template)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Appliquer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-30">
          {notification}
        </div>
      )}

      {/* Champ d'édition de texte */}
      {editingText && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-xl border z-30">
          <textarea
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            className="w-64 h-32 p-2 border rounded resize-none"
            placeholder="Entrez votre texte..."
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                updateElement(editingText, { text: tempText });
                setEditingText(null);
                setTempText('');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Valider
            </button>
            <button
              onClick={() => {
                setEditingText(null);
                setTempText('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Canvas principal */}
      <Stage
        ref={stageRef}
        width={screenSize.width}
        height={screenSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={currentTool === TOOLS.SELECT}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onDragEnd={(e) => setStagePosition({ x: e.target.x(), y: e.target.y() })}
      >
        <Layer>
          {renderGrid()}
          {elements.map(renderElement)}
        </Layer>
      </Stage>

      {/* Informations de statut */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border p-2 text-xs text-gray-600 z-10">
        Éléments: {elements.length} | Sélectionnés: {selectedIds.length} | Zoom: {Math.round(stageScale * 100)}%
      </div>
    </div>
  );
};

export default WorkflowInteractive;