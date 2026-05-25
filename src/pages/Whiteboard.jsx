import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { auth } from '../services/firebase';
import { generateGeminiVisionContent, generateGeminiContent } from '../services/aiService';
import { saveWhiteboard, getWhiteboards } from '../services/whiteboardService';
import './Whiteboard.css';

const LANGUAGES = ['python', 'javascript', 'cpp', 'java'];

const Whiteboard = () => {
  const { problemId } = useParams();
  const currentUser = auth.currentUser;
  const queryClient = useQueryClient();

  // Settings states
  const [tool, setTool] = useState('BOX'); // PEN, BOX, DIAMOND, ARROW, TEXT, ERASER
  const [language, setLanguage] = useState('python');
  const [brushColor, setBrushColor] = useState('#00DDFF'); // Cyan
  const [smartRecognition, setSmartRecognition] = useState(true);
  const [diagramTitle, setDiagramTitle] = useState('Algorithm Layout');

  // Vector Diagram shapes state
  const [shapes, setShapes] = useState([
    { id: '1', type: 'box', x: 80, y: 150, w: 180, h: 70, label: 'initializeList' },
    { id: '2', type: 'diamond', x: 320, y: 135, w: 120, h: 100, label: 'if itemsEmpty' },
    { id: '3', type: 'loop', x: 500, y: 145, w: 150, h: 80, label: 'for each item' }
  ]);
  const [connections, setConnections] = useState([
    { from: '1', to: '2', label: 'next' },
    { from: '2', to: '3', label: 'true' }
  ]);

  // Editor states
  const [code, setCode] = useState(`# Hand-drawn algorithm flowchart mapping
def initializeList():
    print("Setting up bounds...")
`);
  const [editorRef, setEditorRef] = useState(null);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [highlightedCodeLine, setHighlightedCodeLine] = useState(null);

  // Drawing canvas states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [tempShape, setTempShape] = useState(null);
  const [arrowFromId, setArrowFromId] = useState(null);

  // AI response states
  const [isConverting, setIsConverting] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Render Loop whenever shapes, path, active tools update
  useEffect(() => {
    drawCanvas();
  }, [shapes, connections, drawPath, tempShape, tool, brushColor, selectedShapeId]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear & draw blueprint dark grids
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cyber blue grids overlay
    ctx.strokeStyle = 'rgba(0, 221, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // ── 1. Draw Connections/Arrows ──
    connections.forEach(conn => {
      const fromNode = shapes.find(s => s.id === conn.from);
      const toNode = shapes.find(s => s.id === conn.to);
      if (fromNode && toNode) {
        ctx.strokeStyle = '#FF2D78'; // Pink lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        // center coordinate points
        const startX = fromNode.x + fromNode.w / 2;
        const startY = fromNode.y + fromNode.h / 2;
        const endX = toNode.x + toNode.w / 2;
        const endY = toNode.y + toNode.h / 2;

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrow tip
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 12;
        ctx.fillStyle = '#FF2D78';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle - Math.PI / 6), endY - arrowLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - arrowLength * Math.cos(angle + Math.PI / 6), endY - arrowLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        // Label if present
        if (conn.label) {
          ctx.fillStyle = '#666688';
          ctx.font = '10px Share Tech Mono';
          ctx.fillText(conn.label, (startX + endX) / 2 - 10, (startY + endY) / 2 - 5);
        }
      }
    });

    // ── 2. Draw Shapes ──
    shapes.forEach(sh => {
      const isSelected = sh.id === selectedShapeId;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#00FF88' : '#00DDFF'; // Green if selected, cyan default
      
      // Neon glow shadow
      ctx.shadowColor = isSelected ? '#00FF88' : '#00DDFF';
      ctx.shadowBlur = isSelected ? 12 : 3;

      ctx.fillStyle = 'rgba(0, 221, 255, 0.05)';

      if (sh.type === 'box') {
        ctx.beginPath();
        ctx.rect(sh.x, sh.y, sh.w, sh.h);
        ctx.fill();
        ctx.stroke();
      } else if (sh.type === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(sh.x + sh.w / 2, sh.y);
        ctx.lineTo(sh.x + sh.w, sh.y + sh.h / 2);
        ctx.lineTo(sh.x + sh.w / 2, sh.y + sh.h);
        ctx.lineTo(sh.x, sh.y + sh.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sh.type === 'loop') {
        ctx.beginPath();
        ctx.arc(sh.x + sh.w / 2, sh.y + sh.h / 2, Math.min(sh.w, sh.h) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Restore shadow defaults
      ctx.shadowBlur = 0;

      // Draw Label centered inside shape
      ctx.fillStyle = '#E8E8FF';
      ctx.font = '12px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sh.label || `Shape ${sh.id}`, sh.x + sh.w / 2, sh.y + sh.h / 2);
    });

    // ── 3. Draw Active Freehand Paths ──
    if (drawPath.length > 1) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drawPath[0].x, drawPath[0].y);
      for (let i = 1; i < drawPath.length; i++) {
        ctx.lineTo(drawPath[i].x, drawPath[i].y);
      }
      ctx.stroke();
    }

    // ── 4. Draw Temporary Vector dragging bounds ──
    if (tempShape) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.rect(tempShape.x, tempShape.y, tempShape.w, tempShape.h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Canvas interaction event pointer handlers
  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDragStart({ x, y });

    // Handle clicks based on current tool selection
    if (tool === 'PEN') {
      setDrawPath([{ x, y }]);
    } else if (tool === 'BOX' || tool === 'DIAMOND') {
      setTempShape({ x, y, w: 0, h: 0 });
    } else if (tool === 'ARROW') {
      // Find starting shape
      const hit = findShapeAt(x, y);
      if (hit) {
        setArrowFromId(hit.id);
      }
    } else if (tool === 'TEXT') {
      const hit = findShapeAt(x, y);
      if (hit) {
        const text = prompt("Edit shape label:", hit.label || "");
        if (text !== null) {
          setShapes(curr => curr.map(s => s.id === hit.id ? { ...s, label: text } : s));
        }
      }
      setIsDrawing(false);
    } else if (tool === 'ERASER') {
      const hit = findShapeAt(x, y);
      if (hit) {
        setShapes(curr => curr.filter(s => s.id !== hit.id));
        setConnections(curr => curr.filter(c => c.from !== hit.id && c.to !== hit.id));
      }
      setIsDrawing(false);
    } else if (tool === 'SELECT') {
      const hit = findShapeAt(x, y);
      setSelectedShapeId(hit ? hit.id : null);
      if (hit) {
        highlightAssociatedCode(hit.label);
      }
      setIsDrawing(false);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'PEN') {
      setDrawPath(prev => [...prev, { x, y }]);
    } else if (tool === 'BOX' || tool === 'DIAMOND') {
      setTempShape({
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        w: Math.abs(dragStart.x - x),
        h: Math.abs(dragStart.y - y)
      });
    }
  };

  const handlePointerUp = (e) => {
    setIsDrawing(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'PEN') {
      // Smart Gesture Shape Recognition heuristics
      if (smartRecognition && drawPath.length > 10) {
        recognizeSketch(drawPath);
      }
      setDrawPath([]);
    } else if (tool === 'BOX' || tool === 'DIAMOND') {
      if (tempShape && tempShape.w > 20 && tempShape.h > 20) {
        const newShape = {
          id: String(Date.now()),
          type: tool.toLowerCase(),
          x: tempShape.x,
          y: tempShape.y,
          w: tempShape.w,
          h: tempShape.h,
          label: tool === 'DIAMOND' ? 'checkCondition' : 'stepBlock'
        };
        setShapes(prev => [...prev, newShape]);
      }
      setTempShape(null);
    } else if (tool === 'ARROW' && arrowFromId) {
      const hit = findShapeAt(x, y);
      if (hit && hit.id !== arrowFromId) {
        // Create connection
        setConnections(prev => [...prev, { from: arrowFromId, to: hit.id, label: '' }]);
      }
      setArrowFromId(null);
    }
  };

  // Find shape inside bounds
  const findShapeAt = (px, py) => {
    return shapes.find(s => px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h);
  };

  // Simple heuristic classifier for freehand circles/loops or diamonds
  const recognizeSketch = (path) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    path.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const center = { x: minX + w / 2, y: minY + h / 2 };

    // Check if start/end vertices meet
    const dStartEnd = Math.hypot(path[0].x - path[path.length - 1].x, path[0].y - path[path.length - 1].y);
    const aspect = w / h;

    if (dStartEnd < 50 && aspect >= 0.8 && aspect <= 1.2) {
      // Circle recognised as Loop
      setShapes(prev => [...prev, {
        id: String(Date.now()),
        type: 'loop',
        x: minX,
        y: minY,
        w: w > 50 ? w : 120,
        h: h > 50 ? h : 80,
        label: 'loopNode'
      }]);
    } else {
      // General path snaps to block
      setShapes(prev => [...prev, {
        id: String(Date.now()),
        type: 'box',
        x: minX,
        y: minY,
        w: w > 50 ? w : 140,
        h: h > 50 ? h : 70,
        label: 'parsedStep'
      }]);
    }
  };

  // ── AI FLOWCHART-TO-CODE PIPELINE ──
  const handleConvertToCode = async () => {
    setIsConverting(true);
    setExplanation('');
    
    // Construct offline representation text to mock Vision payloads if webcam lacks keys
    const shapesSummary = shapes.map(s => `[${s.type.toUpperCase()}] label: "${s.label}"`).join(', ');
    const connSummary = connections.map(c => {
      const fromLabel = shapes.find(s => s.id === c.from)?.label || 'start';
      const toLabel = shapes.find(s => s.id === c.to)?.label || 'end';
      return `${fromLabel} -> ${toLabel}`;
    }).join(', ');

    const prompt = `This is a hand-drawn algorithm flowchart. Convert it to working ${language} code. 
Flowchart shapes: ${shapesSummary}.
Connections: ${connSummary}.
Make sure to implement all blocks (Functions, checks/if conditions, loops) as clean runnable statements. Include comment explanations. Return ONLY the code buffer block.`;

    try {
      // Export base64 mockup or call direct Gemini model content
      const generatedText = await generateGeminiContent(prompt);
      if (generatedText) {
        // extract code if model replies with markdown
        let parsedCode = generatedText;
        if (generatedText.includes('```')) {
          parsedCode = generatedText.split('```')[1];
          if (parsedCode.startsWith('python') || parsedCode.startsWith('javascript') || parsedCode.startsWith('cpp') || parsedCode.startsWith('java')) {
            parsedCode = parsedCode.replace(/^[a-z]+/i, '');
          }
        }
        setCode(parsedCode.trim());
      }
    } catch (e) {
      console.error(e);
    }
    setIsConverting(false);
  };

  // ── SYNC CODE EDITS BACK TO DIAGRAM ──
  const handleSyncBack = () => {
    // Parse loop nodes, function calls, and branch checks dynamically
    const parsedShapes = [];
    const parsedConns = [];
    const lines = code.split('\n');
    let idx = 1;
    let lastId = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let type = 'box';
      let label = '';

      if (trimmed.startsWith('def ') || trimmed.startsWith('function ')) {
        type = 'box';
        label = trimmed.split('(')[0].replace('def ', '').replace('function ', '').trim();
      } else if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) {
        type = 'diamond';
        label = trimmed.replace('if ', '').replace('elif ', '').replace(':', '').trim();
      } else if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) {
        type = 'loop';
        label = trimmed.replace(':', '').trim();
      } else if (trimmed.includes('return ')) {
        type = 'box';
        label = trimmed.trim();
      }

      if (label) {
        const id = String(idx++);
        parsedShapes.push({
          id,
          type,
          x: 100 + (idx * 90) % 400,
          y: 80 + idx * 80,
          w: type === 'diamond' ? 120 : 160,
          h: type === 'diamond' ? 90 : 65,
          label
        });

        if (lastId) {
          parsedConns.push({ from: lastId, to: id, label: '' });
        }
        lastId = id;
      }
    });

    if (parsedShapes.length > 0) {
      setShapes(parsedShapes);
      setConnections(parsedConns);
    }
  };

  // ── EXPLAIN SHAPE CONCEPT ──
  const handleExplainShape = async () => {
    if (!selectedShapeId) return;
    const target = shapes.find(s => s.id === selectedShapeId);
    if (!target) return;

    setIsExplaining(true);
    setExplanation('');

    const prompt = `Explain the programmatic purpose and standard logic for a flowchart shape of type "${target.type.toUpperCase()}" labeled "${target.label}". Give a short 2-sentence visual developer description.`;
    try {
      const ans = await generateGeminiContent(prompt);
      setExplanation(ans || 'Perfect flowchart block layout.');
    } catch (e) {
      setExplanation('Standard algorithmic execution logic.');
    }
    setIsExplaining(false);
  };

  // Save to community whiteboard library
  const handleSaveToLibrary = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveWhiteboard(
        currentUser?.uid || 'anon',
        currentUser?.displayName || 'PixelCoder',
        problemId || 'general',
        diagramTitle,
        shapes,
        code
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  // Highlight matching code line in editor
  const highlightAssociatedCode = (label) => {
    if (!editorRef) return;
    const cleanLabel = label.toLowerCase();
    const lines = code.split('\n');
    const matchIdx = lines.findIndex(l => l.toLowerCase().includes(cleanLabel));
    if (matchIdx !== -1) {
      setHighlightedCodeLine(matchIdx + 1);
      editorRef.revealLineInCenter(matchIdx + 1);
    }
  };

  return (
    <div className="cp-whiteboard-page">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(0, 221, 255, 0.02)' }} />

      <div className="cp-whiteboard-container">
        
        {/* Header HUD Settings Dashboard */}
        <div className="cp-whiteboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="cp-whiteboard-title-logo">📐</span>
            <div>
              <input
                type="text"
                value={diagramTitle}
                onChange={e => setDiagramTitle(e.target.value)}
                className="cp-whiteboard-title-input"
              />
              <p className="cp-whiteboard-meta">// AI WHITEBOARD-TO-CODE RADAR SYSTEM</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="cp-whiteboard-toggle-label">
              <input
                type="checkbox"
                checked={smartRecognition}
                onChange={e => setSmartRecognition(e.target.checked)}
              />
              <span>SMART RECOGNITION</span>
            </label>

            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="cp-whiteboard-lang-select"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang.toUpperCase()}</option>
              ))}
            </select>

            <button onClick={handleSaveToLibrary} className="cp-radar-btn" disabled={isSaving}>
              {isSaving ? 'PERSISTING...' : saveSuccess ? 'SAVED ✓' : 'SAVE TO LIBRARY 💾'}
            </button>
          </div>
        </div>

        {/* Main interactive split workspace view */}
        <div className="cp-whiteboard-workspace">
          
          {/* Left panel drawing canvas */}
          <div className="cp-whiteboard-canvas-wrap">
            
            {/* Draw controls HUD toolbar */}
            <div className="cp-whiteboard-toolbar">
              {[
                { id: 'SELECT', label: '🖲️ SELECT' },
                { id: 'PEN', label: '✏️ PEN' },
                { id: 'BOX', label: '🟥 BOX' },
                { id: 'DIAMOND', label: '🔷 DIAMOND' },
                { id: 'ARROW', label: '➡️ ARROW' },
                { id: 'TEXT', label: '🔤 TEXT' },
                { id: 'ERASER', label: '🧹 ERASER' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`cp-toolbar-btn ${tool === t.id ? 'active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <canvas
              ref={canvasRef}
              width={740}
              height={500}
              className="cp-whiteboard-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            <p className="cp-whiteboard-instructions">
              * Select <strong>PEN</strong> and draw rough circles to recognize loops. Select <strong>SELECT</strong> and click any placed node to trigger editor code-lines highlighting.
            </p>
          </div>

          {/* Right panel Monaco code editor */}
          <div className="cp-whiteboard-editor-wrap">
            
            {/* Editor toolbar */}
            <div className="cp-whiteboard-editor-header">
              <span className="cp-whiteboard-editor-title">MONACO INTERACTIVE EDITOR</span>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSyncBack} className="cp-toolbar-btn">
                  SYNC DIAGRAM 🔄
                </button>
                <button onClick={handleConvertToCode} className="cp-radar-btn cp-radar-btn--active" disabled={isConverting}>
                  {isConverting ? '🤖 TRANSLATING...' : 'CONVERT FLOWCHART ⚡'}
                </button>
              </div>
            </div>

            {/* Monaco instance */}
            <div className="cp-whiteboard-editor-container">
              <Editor
                height="320px"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={val => setCode(val)}
                onMount={editor => setEditorRef(editor)}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  fontFamily: 'Share Tech Mono'
                }}
              />
            </div>

            {/* AI Explanation / Diagnostic details card */}
            <div className="cp-whiteboard-explanation-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="cp-whiteboard-exp-title">SHAPE LOGIC DIAGNOSTICS</span>
                {selectedShapeId && (
                  <button onClick={handleExplainShape} className="cp-toolbar-btn" style={{ padding: '2px 8px', fontSize: '0.62rem' }}>
                    {isExplaining ? 'ANALYZING...' : 'EXPLAIN BLOCK 💡'}
                  </button>
                )}
              </div>

              {explanation ? (
                <p className="cp-whiteboard-exp-text">{explanation}</p>
              ) : selectedShapeId ? (
                <p className="cp-whiteboard-exp-text" style={{ color: '#666688' }}>
                  Click "EXPLAIN BLOCK" to analyze the algorithmic target step: "<strong>{shapes.find(s => s.id === selectedShapeId)?.label}</strong>".
                </p>
              ) : (
                <p className="cp-whiteboard-exp-text" style={{ color: '#666688' }}>
                  No shape selected. Choose SELECT tool and click any shape node on the canvas to fetch Gemini diagnostics details.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Whiteboard;
