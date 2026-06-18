import React, { useState, useEffect, useRef, Suspense } from 'react';
import { loader } from '@monaco-editor/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { fetchLanguages } from '../../services/pistonService';
import { starterTemplates, MONACO_LANGUAGE_MAP } from '../../utils/starterCode';

const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

// Language metadata mapping for styling and tags
const LANGUAGES_METADATA = {
  python:     { name: 'Python 3',      difficulty: 'Beginner',     color: '#3572A5', emoji: '🐍' },
  javascript: { name: 'JavaScript',    difficulty: 'Beginner',     color: '#f1e05a', emoji: '🟨' },
  typescript: { name: 'TypeScript',    difficulty: 'Intermediate', color: '#3178c6', emoji: '🟦' },
  java:       { name: 'Java',           difficulty: 'Intermediate', color: '#b07219', emoji: '☕' },
  cpp:        { name: 'C++',            difficulty: 'Advanced',     color: '#f34b7d', emoji: '👾' },
  c:          { name: 'C',              difficulty: 'Advanced',     color: '#555555', emoji: '⚙️' },
  go:         { name: 'Go',             difficulty: 'Intermediate', color: '#00ADD8', emoji: '🐹' },
  rust:       { name: 'Rust',           difficulty: 'Advanced',     color: '#dea584', emoji: '🦀' },
  kotlin:     { name: 'Kotlin',         difficulty: 'Intermediate', color: '#A97BFF', emoji: '🎯' },
  swift:      { name: 'Swift',          difficulty: 'Intermediate', color: '#F05138', emoji: '🐦' },
  ruby:       { name: 'Ruby',           difficulty: 'Beginner',     color: '#701516', emoji: '💎' },
  php:        { name: 'PHP',            difficulty: 'Beginner',     color: '#4F5D95', emoji: '🐘' },
  csharp:     { name: 'C#',             difficulty: 'Intermediate', color: '#178600', emoji: '🔮' },
  scala:      { name: 'Scala',          difficulty: 'Advanced',     color: '#c22d40', emoji: '🌀' },
  perl:       { name: 'Perl',           difficulty: 'Intermediate', color: '#0298c3', emoji: '🐫' },
  r:          { name: 'R',              difficulty: 'Intermediate', color: '#198CE7', emoji: '📊' },
  dart:       { name: 'Dart',           difficulty: 'Intermediate', color: '#00B4AB', emoji: '🎯' },
  bash:       { name: 'Bash',           difficulty: 'Beginner',     color: '#89e051', emoji: '🐚' },
  sql:        { name: 'SQL',            difficulty: 'Beginner',     color: '#e38c00', emoji: '🗄️' },
  haskell:    { name: 'Haskell',        difficulty: 'Advanced',     color: '#5e5086', emoji: 'λ' },
  lua:        { name: 'Lua',            difficulty: 'Beginner',     color: '#000080', emoji: '🌙' },
  fsharp:     { name: 'F#',             difficulty: 'Intermediate', color: '#b845fc', emoji: '📐' },
  clojure:    { name: 'Clojure',        difficulty: 'Advanced',     color: '#db5855', emoji: '☘️' },
  elixir:     { name: 'Elixir',         difficulty: 'Intermediate', color: '#6e4a7e', emoji: '💧' },
  erlang:     { name: 'Erlang',         difficulty: 'Advanced',     color: '#B83998', emoji: '⚙️' },
  groovy:     { name: 'Groovy',         difficulty: 'Intermediate', color: '#427833', emoji: '☕' },
  pascal:     { name: 'Pascal',         difficulty: 'Beginner',     color: '#E3F1F1', emoji: '🧪' },
  fortran:    { name: 'Fortran',        difficulty: 'Advanced',     color: '#4d41b1', emoji: '💾' },
  cobol:      { name: 'COBOL',          difficulty: 'Advanced',     color: '#1d2c40', emoji: '📼' },
  vbnet:      { name: 'VB.NET',         difficulty: 'Beginner',     color: '#945db7', emoji: '💻' },
  ocaml:      { name: 'OCaml',          difficulty: 'Advanced',     color: '#3be133', emoji: '🐫' },
  prolog:     { name: 'Prolog',         difficulty: 'Advanced',     color: '#74283c', emoji: '🧩' },
  assembly:   { name: 'Assembly',       difficulty: 'Advanced',     color: '#6e7681', emoji: '🔌' },
};

const POPULAR_KEYS = ['python', 'javascript', 'java', 'cpp', 'c', 'go', 'rust', 'kotlin', 'typescript', 'csharp'];

export function LanguageSelector({ language, onLanguageChange, availableLangs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'Beginner': return '#00FF88';
      case 'Intermediate': return '#00A2FF';
      case 'Advanced': return '#FF2D78';
      default: return '#888';
    }
  };

  // Build full language list from API info merged with metadata
  const completeList = availableLangs.length > 0 
    ? availableLangs.map(item => {
        const key = item.language.toLowerCase();
        const meta = LANGUAGES_METADATA[key] || { name: item.displayName, difficulty: 'Intermediate', color: '#A0A0B0', emoji: '💻' };
        return {
          key,
          name: meta.name,
          version: item.version,
          difficulty: meta.difficulty,
          color: meta.color,
          emoji: meta.emoji
        };
      })
    : Object.keys(LANGUAGES_METADATA).map(key => {
        const meta = LANGUAGES_METADATA[key];
        return {
          key,
          name: meta.name,
          version: '',
          difficulty: meta.difficulty,
          color: meta.color,
          emoji: meta.emoji
        };
      });

  const popularLangs = completeList.filter(item => POPULAR_KEYS.includes(item.key));
  const otherLangs = completeList
    .filter(item => !POPULAR_KEYS.includes(item.key))
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentSelection = completeList.find(item => item.key === language) || {
    key: language,
    name: language.toUpperCase(),
    emoji: '💻',
    color: '#888'
  };

  const renderItem = (item) => {
    const isSelected = item.key === language;
    return (
      <div
        key={item.key}
        onClick={() => {
          onLanguageChange(item.key);
          setIsOpen(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(255, 45, 120, 0.1)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--cyber-pink, #FF2D78)' : '2px solid transparent',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: item.color }}>{item.emoji}</span>
          <span style={{ fontSize: '0.72rem', color: '#FFF', fontFamily: 'Share Tech Mono' }}>
            {item.name} {item.version ? `(${item.version})` : ''}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.52rem',
            fontFamily: 'Orbitron',
            padding: '1px 4px',
            borderRadius: '2px',
            border: `1px solid ${getDifficultyColor(item.difficulty)}`,
            color: getDifficultyColor(item.difficulty),
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          {item.difficulty}
        </span>
      </div>
    );
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#0B0B12',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          color: '#FFF',
          padding: '6px 12px',
          fontSize: '0.74rem',
          fontFamily: 'Orbitron',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '170px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: currentSelection.color }}>{currentSelection.emoji}</span>
          <span>{currentSelection.name}</span>
        </div>
        <span style={{ fontSize: '0.55rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: '#07070C',
            border: '1px solid var(--cyber-pink, #FF2D78)',
            borderRadius: '4px',
            marginTop: '6px',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(255, 45, 120, 0.2)',
            maxHeight: '280px',
            overflowY: 'auto',
            width: '250px',
            padding: '8px 0'
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: '0.58rem', color: '#555577', fontWeight: 'bold', fontFamily: 'Orbitron', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            POPULAR LANGUAGES
          </div>
          {popularLangs.map(renderItem)}
          
          <div style={{ padding: '8px 12px 4px 12px', fontSize: '0.58rem', color: '#555577', fontWeight: 'bold', fontFamily: 'Orbitron', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            MORE LANGUAGES
          </div>
          {otherLangs.map(renderItem)}
        </div>
      )}
    </div>
  );
}

export default function CodeEditor({
  problemId,
  userId,
  problem,
  code,
  onChange,
  language,
  onLanguageChange,
  onMount,
  onDraftLoaded,
  onRun,
  onSubmit
}) {
  const [editorTheme, setEditorTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [availableLangs, setAvailableLangs] = useState([]);
  
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch languages dynamically from Piston API
  useEffect(() => {
    const getLangs = async () => {
      const runtimes = await fetchLanguages();
      setAvailableLangs(runtimes);
    };
    getLangs();
  }, []);

  // Save selected language to localStorage per problem
  useEffect(() => {
    if (problemId && language) {
      localStorage.setItem(`lang_${problemId}`, language);
    }
  }, [problemId, language]);

  // Load problem-specific starter code or drafts
  useEffect(() => {
    if (!problemId) return;

    let isMounted = true;

    const loadCodeDraft = async () => {
      // 1. Check localStorage first
      const localKey = `draft_${userId || 'guest'}_${problemId}_${language}`;
      const localDraft = localStorage.getItem(localKey);
      if (localDraft) {
        if (isMounted) {
          onChange(localDraft);
          if (onDraftLoaded) onDraftLoaded(localDraft);
        }
        return;
      }

      // 2. Check Firestore codeDrafts/{userId}_{problemId}
      if (userId) {
        try {
          const docRef = doc(db, 'codeDrafts', `${userId}_${problemId}`);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data[language]) {
              if (isMounted) {
                onChange(data[language]);
                localStorage.setItem(localKey, data[language]);
                if (onDraftLoaded) onDraftLoaded(data[language]);
              }
              return;
            }
          }
        } catch (err) {
          console.warn("Failed to load Firestore draft:", err);
        }
      }

      // 3. Check problem.starterCode[selectedLanguage] in Firestore / Problem object
      if (problem && problem.starterCode && problem.starterCode[language]) {
        if (isMounted) {
          onChange(problem.starterCode[language]);
          if (onDraftLoaded) onDraftLoaded(problem.starterCode[language]);
        }
        return;
      }

      // 4. Fall back to starterTemplates[selectedLanguage] generic template
      const fallbackCode = starterTemplates[language] || `// Write your ${language} solution here\n`;
      if (isMounted) {
        onChange(fallbackCode);
        if (onDraftLoaded) onDraftLoaded(fallbackCode);
      }
    };

    loadCodeDraft();

    return () => {
      isMounted = false;
    };
  }, [problemId, userId, language]);

  // Debounced Auto-saving to localStorage & Firestore
  useEffect(() => {
    if (!userId || !problemId || !code) return;

    const localKey = `draft_${userId}_${problemId}_${language}`;
    localStorage.setItem(localKey, code);

    const timeoutId = setTimeout(async () => {
      try {
        const docRef = doc(db, 'codeDrafts', `${userId}_${problemId}`);
        await setDoc(docRef, {
          [language]: code
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to auto-save code draft to Firestore:", err);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [code, language, userId, problemId]);

  // Reload starter templates / reset code function
  const handleResetCode = () => {
    if (window.confirm("Are you sure you want to reset your code to the default starter template? All current changes will be lost.")) {
      const defaultCode = (problem && problem.starterCode && problem.starterCode[language]) || starterTemplates[language] || '';
      onChange(defaultCode);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom cyberpunk dark theme
    monaco.editor.defineTheme('codearena-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'FF2D9E', fontStyle: 'bold' },
        { token: 'string', foreground: 'FFD23F' },
        { token: 'comment', foreground: '555577', fontStyle: 'italic' },
        { token: 'number', foreground: '44AAFF' },
        { token: 'type', foreground: '00FFA8' },
        { token: 'function', foreground: '00FFA8' },
      ],
      colors: {
        'editor.background': '#080810',
        'editor.foreground': '#E8E8FF',
        'editorLineNumber.foreground': '#333355',
        'editor.selectionBackground': '#FF2D9E33',
        'editor.lineHighlightBackground': '#0F0F1A',
      }
    });

    monaco.editor.setTheme(editorTheme === 'dark' ? 'codearena-dark' : 'vs');

    // Register Keyboard Commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) onRun();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      if (onSubmit) onSubmit();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
    });

    if (onMount) onMount(editor, monaco);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Fullscreen change listener to sync status on Escape press
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        background: editorTheme === 'dark' ? '#080810' : '#FFF',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Editor Toolbar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '8px 16px', 
          background: editorTheme === 'dark' ? '#0A0A12' : '#F4F4F9',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Left Toolbar: Language selector */}
        <LanguageSelector 
          language={language} 
          onLanguageChange={onLanguageChange} 
          availableLangs={availableLangs} 
        />

        {/* Right Toolbar: Control buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Reset Code */}
          <button 
            onClick={handleResetCode} 
            title="Reset code template"
            style={btnStyle(editorTheme)}
          >
            🔄 RESET
          </button>

          {/* Font Controls */}
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              onClick={() => setFontSize(prev => Math.max(10, prev - 1))} 
              title="Decrease font size"
              style={fontBtnStyle(editorTheme)}
            >
              A-
            </button>
            <button 
              onClick={() => setFontSize(prev => Math.min(24, prev + 1))} 
              title="Increase font size"
              style={fontBtnStyle(editorTheme)}
            >
              A+
            </button>
          </div>

          {/* Keyboard Shortcuts Trigger */}
          <button 
            onClick={() => setShowShortcutModal(true)} 
            title="Keyboard Shortcuts"
            style={btnStyle(editorTheme)}
          >
            ⌨️ KEYS
          </button>

          {/* Fullscreen Toggle */}
          <button 
            onClick={toggleFullscreen} 
            title="Toggle Fullscreen"
            style={btnStyle(editorTheme)}
          >
            {isFullscreen ? '⏹ EXIT' : '⛶ FULL'}
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={() => {
              const nextTheme = editorTheme === 'dark' ? 'light' : 'dark';
              setEditorTheme(nextTheme);
              if (loader.__monaco) {
                loader.__monaco.editor.setTheme(nextTheme === 'dark' ? 'codearena-dark' : 'vs');
              }
            }}
            title="Toggle theme"
            style={btnStyle(editorTheme)}
          >
            {editorTheme === 'dark' ? '☀️ LIGHT' : '🌙 DARK'}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080810', color: '#00FF88', fontFamily: 'Orbitron', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', letterSpacing: '2px', animation: 'cp-blink 1s step-end infinite' }}>🔌 LOADING MONACO IDE...</span>
          </div>
        }>
          <MonacoEditor
            height="100%"
            language={MONACO_LANGUAGE_MAP[language] || 'plaintext'}
            theme={editorTheme === 'dark' ? 'codearena-dark' : 'vs'}
            value={code}
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize,
              fontFamily: 'JetBrains Mono, Fira Code, Share Tech Mono, monospace',
              fontLigatures: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              formatOnPaste: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: 'line',
              cursorBlinking: 'phase',
              cursorStyle: 'block',
            }}
          />
        </Suspense>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowShortcutModal(false)}
        >
          <div 
            style={{
              background: '#0F0F1A',
              border: '1px solid var(--cyber-pink, #FF2D9E)',
              borderRadius: '8px',
              width: '380px',
              padding: '24px',
              boxShadow: '0 0 20px rgba(255, 45, 158, 0.3)',
              fontFamily: 'Share Tech Mono, monospace',
              color: '#FFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontFamily: 'Orbitron', color: 'var(--cyber-pink, #FF2D9E)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
              KEYBOARD SHORTCUTS
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { keys: 'Ctrl + Enter', desc: 'Run Sample Code' },
                { keys: 'Ctrl + Shift + Enter', desc: 'Submit Code' },
                { keys: 'Ctrl + /', desc: 'Toggle Line Comment' },
                { keys: 'Ctrl + Z', desc: 'Undo last edit' },
                { keys: 'Ctrl + Shift + F', desc: 'Format Code Document' }
              ].map(item => (
                <div key={item.keys} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', alignItems: 'center' }}>
                  <span style={{ color: '#8888AA' }}>{item.desc}</span>
                  <span style={{ background: '#1C1C2E', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', color: '#00FFA8' }}>
                    {item.keys}
                  </span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowShortcutModal(false)}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#FFF',
                padding: '8px',
                marginTop: '20px',
                cursor: 'pointer',
                fontFamily: 'Orbitron',
                fontSize: '0.75rem',
                transition: 'border 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00FFA8'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
              CLOSE COMMANDS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling helper variables
const btnStyle = (theme) => ({
  background: theme === 'dark' ? '#080810' : '#E8E8FF',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '4px',
  color: theme === 'dark' ? '#FFF' : '#333',
  padding: '6px 12px',
  fontSize: '0.66rem',
  fontFamily: 'Orbitron',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});

const fontBtnStyle = (theme) => ({
  background: theme === 'dark' ? '#080810' : '#E8E8FF',
  border: 'none',
  color: theme === 'dark' ? '#FFF' : '#333',
  padding: '6px 10px',
  fontSize: '0.66rem',
  fontFamily: 'Orbitron',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});
