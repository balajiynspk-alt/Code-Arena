/**
 * CodeDNA Heuristic Code Analyzer for CodeArena
 * Supports: Python, JavaScript, Java, C++, Go
 */

export const analyzeCode = (code, language = 'python') => {
  if (!code) {
    return {
      loops: 0,
      recursion: 0,
      comprehensions: 0,
      builtins: 0,
      avgLineLength: 0,
      commentRatio: 0,
      namingStyle: 'camelCase'
    };
  }

  const lines = code.split('\n');
  const totalLines = lines.length;
  let commentLines = 0;
  let cleanedLines = [];

  let inMultiLineComment = false;

  // 1. Line-by-line comment counting and stripping
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let hasComment = false;

    if (language === 'python') {
      // Heuristic for python triple quotes
      const tripleQuotesCount = (trimmed.match(/"""|'''/g) || []).length;
      
      if (inMultiLineComment) {
        hasComment = true;
        if (tripleQuotesCount % 2 !== 0 || trimmed.endsWith('"""') || trimmed.endsWith("'''")) {
          inMultiLineComment = false;
        }
        cleanedLines.push('');
      } else {
        if (tripleQuotesCount % 2 !== 0 && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
          inMultiLineComment = true;
          hasComment = true;
          cleanedLines.push('');
        } else if (trimmed.includes('#')) {
          hasComment = true;
          const hashIndex = line.indexOf('#');
          cleanedLines.push(line.substring(0, hashIndex));
        } else {
          cleanedLines.push(line);
        }
      }
    } else {
      // JS / Java / C++ / Go
      if (inMultiLineComment) {
        hasComment = true;
        if (trimmed.includes('*/')) {
          inMultiLineComment = false;
          const index = line.indexOf('*/');
          cleanedLines.push(line.substring(index + 2));
        } else {
          cleanedLines.push('');
        }
      } else {
        if (trimmed.startsWith('/*')) {
          inMultiLineComment = true;
          hasComment = true;
          if (trimmed.includes('*/')) {
            inMultiLineComment = false;
            cleanedLines.push(line.replace(/\/\*[\s\S]*?\*\//g, ''));
          } else {
            cleanedLines.push('');
          }
        } else if (trimmed.includes('//')) {
          hasComment = true;
          const index = line.indexOf('//');
          cleanedLines.push(line.substring(0, index));
        } else if (trimmed.includes('/*')) {
          hasComment = true;
          if (trimmed.includes('*/')) {
            cleanedLines.push(line.replace(/\/\*[\s\S]*?\*\//g, ''));
          } else {
            inMultiLineComment = true;
            const index = line.indexOf('/*');
            cleanedLines.push(line.substring(0, index));
          }
        } else {
          cleanedLines.push(line);
        }
      }
    }

    if (hasComment) {
      commentLines++;
    }
  }

  const cleanCode = cleanedLines.join('\n');

  // 2. String literal stripping to prevent false positives in string values
  const strippedCode = cleanCode
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, "``");

  // 3. Extract Loops
  // Using standard keyword boundary matching
  const loopsMatch = strippedCode.match(/\b(for|while)\b/g);
  const loopsCount = loopsMatch ? loopsMatch.length : 0;

  // 4. Extract Functions and check for Recursion
  const funcNames = [];
  const pyFunc = /\bdef\s+([a-zA-Z_]\w*)\s*\(/g;
  const jsFunc1 = /\bfunction\s+([a-zA-Z_]\w*)\s*\(/g;
  const jsFunc2 = /\bconst\s+([a-zA-Z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  const goFunc = /\bfunc\s+([a-zA-Z_]\w*)\s*\(/g;
  const cLikeFunc = /\b(?:int|void|string|double|float|auto|char|bool|var|let|public|private|static)\s+([a-zA-Z_]\w*)\s*\(/g;

  let match;
  if (language === 'python') {
    while ((match = pyFunc.exec(strippedCode)) !== null) {
      funcNames.push(match[1]);
    }
  } else if (language === 'javascript') {
    while ((match = jsFunc1.exec(strippedCode)) !== null) {
      funcNames.push(match[1]);
    }
    while ((match = jsFunc2.exec(strippedCode)) !== null) {
      funcNames.push(match[1]);
    }
  } else if (language === 'go') {
    while ((match = goFunc.exec(strippedCode)) !== null) {
      funcNames.push(match[1]);
    }
  } else { // java / cpp
    while ((match = cLikeFunc.exec(strippedCode)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch', 'return'].includes(match[1])) {
        funcNames.push(match[1]);
      }
    }
  }

  // Check recursive self-calls inside function blocks
  let recursionCount = 0;
  funcNames.forEach(name => {
    if (language === 'python') {
      const defIndex = strippedCode.indexOf(`def ${name}`);
      if (defIndex !== -1) {
        const remaining = strippedCode.substring(defIndex);
        const codeLines = remaining.split('\n');
        const bodyLines = [];
        let baseIndent = -1;
        for (let i = 1; i < codeLines.length; i++) {
          const l = codeLines[i];
          if (l.trim().length === 0) continue;
          const indent = l.length - l.trimStart().length;
          if (baseIndent === -1) {
            baseIndent = indent;
          }
          if (indent < baseIndent) {
            break;
          }
          bodyLines.push(l);
        }
        const body = bodyLines.join('\n');
        const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
        const matches = body.match(regex);
        if (matches) {
          recursionCount += matches.length;
        }
      }
    } else {
      const defIndex = strippedCode.indexOf(`${name}`);
      if (defIndex !== -1) {
        const bodyStart = strippedCode.indexOf('{', defIndex);
        if (bodyStart !== -1) {
          let openBraces = 1;
          let bodyEnd = -1;
          for (let i = bodyStart + 1; i < strippedCode.length; i++) {
            if (strippedCode[i] === '{') openBraces++;
            else if (strippedCode[i] === '}') openBraces--;
            if (openBraces === 0) {
              bodyEnd = i;
              break;
            }
          }
          if (bodyEnd !== -1) {
            const body = strippedCode.substring(bodyStart + 1, bodyEnd);
            const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
            const matches = body.match(regex);
            if (matches) {
              recursionCount += matches.length;
            }
          }
        }
      }
    }
  });

  // 5. Extract Comprehensions
  let comprehensionsCount = 0;
  if (language === 'python') {
    const listComp = strippedCode.match(/\[\s*[^\]\n]+?\s+for\s+[^\]\n]+?\s+in\s+[^\]\n]+?\]/g);
    const dictComp = strippedCode.match(/\{\s*[^}\n]+?\s+for\s+[^}\n]+?\s+in\s+[^}\n]+?\}/g);
    comprehensionsCount = (listComp ? listComp.length : 0) + (dictComp ? dictComp.length : 0);
  } else if (language === 'javascript') {
    // Array methods acting as JS list/collection comprehensions
    const jsComps = strippedCode.match(/\.(map|filter|reduce|flatMap)\s*\(/g);
    comprehensionsCount = jsComps ? jsComps.length : 0;
  }

  // 6. Extract Built-ins
  const builtinLists = {
    python: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'sum', 'min', 'max', 'abs', 'sorted', 'map', 'filter', 'zip', 'enumerate', 'any', 'all', 'open'],
    javascript: ['console', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'setTimeout', 'setInterval'],
    cpp: ['cout', 'cin', 'endl', 'vector', 'string', 'map', 'set', 'unordered_map', 'unordered_set', 'pair', 'sort', 'reverse', 'max', 'min', 'abs', 'push_back', 'size', 'begin', 'end'],
    java: ['System', 'Math', 'Integer', 'Double', 'String', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Collections', 'Arrays', 'print', 'println', 'size', 'length', 'add', 'get', 'put'],
    go: ['fmt', 'print', 'println', 'append', 'len', 'cap', 'make', 'new', 'panic', 'recover', 'close', 'delete', 'real', 'imag', 'complex']
  };

  const builtins = builtinLists[language] || [];
  let builtinsCount = 0;
  builtins.forEach(b => {
    const regex = new RegExp(`\\b${b}\\b`, 'g');
    const matches = strippedCode.match(regex);
    if (matches) {
      builtinsCount += matches.length;
    }
  });

  // 7. Calculate Average Line Length
  const nonSubstantialLines = lines.map(l => l.trim()).filter(l => l.length > 0);
  const avgLineLength = nonSubstantialLines.length > 0
    ? Math.round(nonSubstantialLines.reduce((sum, l) => sum + l.length, 0) / nonSubstantialLines.length)
    : 0;

  // 8. Comment Ratio
  const commentRatio = totalLines > 0 ? parseFloat((commentLines / totalLines).toFixed(3)) : 0;

  // 9. Naming Style style
  const keywords = new Set(['if', 'for', 'while', 'switch', 'return', 'catch', 'new', 'function', 'class', 'const', 'let', 'var', 'def', 'import', 'export', 'public', 'private', 'static', 'void', 'int', 'char', 'double', 'float', 'package', 'func', 'struct', 'interface', 'nil', 'null', 'true', 'false', 'and', 'or', 'not', 'elif', 'else', 'try', 'except', 'finally', 'with', 'as', 'assert', 'break', 'continue', 'del', 'from', 'global', 'in', 'is', 'lambda', 'nonlocal', 'pass', 'raise', 'yield']);
  
  const words = strippedCode.match(/\b[a-zA-Z_]\w{2,}\b/g) || [];
  const identifiers = words.filter(w => !keywords.has(w));
  
  let camelCount = 0;
  let snakeCount = 0;
  
  identifiers.forEach(id => {
    if (/^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(id)) {
      camelCount++;
    } else if (/^[a-z0-9]+_[a-z0-9_]+$/.test(id)) {
      snakeCount++;
    }
  });
  
  let namingStyle = 'mixed';
  if (camelCount > 0 && snakeCount === 0) {
    namingStyle = 'camelCase';
  } else if (snakeCount > 0 && camelCount === 0) {
    namingStyle = 'snake_case';
  } else if (camelCount === 0 && snakeCount === 0) {
    namingStyle = language === 'python' ? 'snake_case' : 'camelCase';
  }

  return {
    loops: loopsCount,
    recursion: recursionCount,
    comprehensions: comprehensionsCount,
    builtins: builtinsCount,
    avgLineLength,
    commentRatio,
    namingStyle
  };
};
