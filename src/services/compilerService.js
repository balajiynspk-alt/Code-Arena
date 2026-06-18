const LANGUAGE_MAP = {
  python:     { id: 71,  name: 'Python 3',      ext: 'py'  },
  javascript: { id: 63,  name: 'JavaScript',    ext: 'js'  },
  java:       { id: 62,  name: 'Java',           ext: 'java'},
  cpp:        { id: 54,  name: 'C++ (GCC 9.2)',  ext: 'cpp' },
  c:          { id: 50,  name: 'C (GCC 9.2)',    ext: 'c'   },
  go:         { id: 60,  name: 'Go',             ext: 'go'  },
  rust:       { id: 73,  name: 'Rust',           ext: 'rs'  },
  kotlin:     { id: 78,  name: 'Kotlin',         ext: 'kt'  },
  swift:      { id: 83,  name: 'Swift',          ext: 'swift'},
  ruby:       { id: 72,  name: 'Ruby',           ext: 'rb'  },
  php:        { id: 68,  name: 'PHP',            ext: 'php' },
  csharp:     { id: 51,  name: 'C#',             ext: 'cs'  },
  typescript: { id: 74,  name: 'TypeScript',     ext: 'ts'  },
  scala:      { id: 81,  name: 'Scala',          ext: 'scala'},
  perl:       { id: 85,  name: 'Perl',           ext: 'pl'  },
  haskell:    { id: 61,  name: 'Haskell',        ext: 'hs'  },
  lua:        { id: 64,  name: 'Lua',            ext: 'lua' },
  r:          { id: 80,  name: 'R',              ext: 'r'   },
  dart:       { id: 90,  name: 'Dart',           ext: 'dart'},
  bash:       { id: 46,  name: 'Bash',           ext: 'sh'  },
  sql:        { id: 82,  name: 'SQL',            ext: 'sql' },
  pascal:     { id: 67,  name: 'Pascal',         ext: 'pas' },
  fortran:    { id: 59,  name: 'Fortran',        ext: 'f90' },
  assembly:   { id: 45,  name: 'Assembly (x86)', ext: 'asm' },
  cobol:      { id: 77,  name: 'COBOL',          ext: 'cbl' },
  fsharp:     { id: 87,  name: 'F#',             ext: 'fs'  },
  erlang:     { id: 58,  name: 'Erlang',         ext: 'erl' },
  elixir:     { id: 57,  name: 'Elixir',         ext: 'ex'  },
  clojure:    { id: 86,  name: 'Clojure',        ext: 'clj' },
  prolog:     { id: 69,  name: 'Prolog',         ext: 'pl'  },
  ocaml:      { id: 65,  name: 'OCaml',          ext: 'ml'  },
  groovy:     { id: 88,  name: 'Groovy',         ext: 'groovy'},
  objectivec: { id: 79,  name: 'Objective-C',    ext: 'm'   },
  vbnet:      { id: 84,  name: 'VB.NET',         ext: 'vb'  },
};

const ENGINES = [
  {
    name: 'judge0_self',
    url: process.env.REACT_APP_JUDGE0_SELF_URL,
    enabled: !!process.env.REACT_APP_JUDGE0_SELF_URL
  },
  {
    name: 'judge0_rapid',
    url: process.env.REACT_APP_JUDGE0_URL,
    key: process.env.REACT_APP_JUDGE0_KEY,
    enabled: !!process.env.REACT_APP_JUDGE0_KEY
  },
];

/**
 * Safely decodes base64 strings containing UTF-8 characters.
 */
function safeAtob(str) {
  if (!str) return '';
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    try {
      return atob(str);
    } catch (err) {
      return str;
    }
  }
}

export const getAllLanguages = () => 
  Object.entries(LANGUAGE_MAP).map(([key, val]) => ({
    key, ...val
  }));

export const fetchLanguages = getAllLanguages; // Alias for compatibility

/**
 * Low-level execution helper for a specific engine.
 */
async function executeWithEngine(engine, { language, code, stdin = '' }) {
  const lang = LANGUAGE_MAP[language];
  if (!lang) throw new Error(`Language not supported: ${language}`);

  const headers = { 'Content-Type': 'application/json' };
  if (engine.name === 'judge0_rapid') {
    headers['X-RapidAPI-Key'] = engine.key;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }

  // Submit
  const submitRes = await fetch(`${engine.url}/submissions?base64_encoded=true&wait=false`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language_id: lang.id,
      source_code: btoa(unescape(encodeURIComponent(code))),
      stdin: btoa(unescape(encodeURIComponent(stdin))),
      cpu_time_limit: 5,
      memory_limit: 256000,
    })
  });

  if (!submitRes.ok) {
    throw new Error(`Submit failed with status: ${submitRes.status}`);
  }

  const { token } = await submitRes.json();

  // Poll for result
  let data;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 700));
    
    const pollHeaders = {};
    if (engine.name === 'judge0_rapid') {
      pollHeaders['X-RapidAPI-Key'] = engine.key;
      pollHeaders['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    const res = await fetch(`${engine.url}/submissions/${token}?base64_encoded=true`, {
      headers: pollHeaders
    });
    
    if (!res.ok) {
      throw new Error(`Polling failed with status: ${res.status}`);
    }

    data = await res.json();

    // Status id: 1=InQueue, 2=Processing, 3=Accepted, 4=WA, 5=TLE, 6=CE...
    if (data.status?.id > 2) {
      break;
    }
  }

  if (!data || data.status?.id <= 2) {
    throw new Error('Execution timed out');
  }

  const stdout = safeAtob(data.stdout);
  const stderr = safeAtob(data.stderr);
  const compileOutput = safeAtob(data.compile_output);
  const exitCode = data.exit_code ?? 0;

  return {
    stdout,
    stderr,
    compileOutput,
    exitCode,
    time: data.time,
    memory: data.memory,
    statusId: data.status.id,
    statusDesc: data.status.description,
    run: {
      stdout,
      stderr,
      code: exitCode
    }
  };
}

/**
 * Priority Chain Execution Engine.
 * Supports both object signature and positional signature (language, code, stdin).
 */
export async function executeCode(arg1, arg2, arg3) {
  let params = {};
  if (typeof arg1 === 'object' && arg1 !== null) {
    params = {
      language: arg1.language,
      code: arg1.code,
      stdin: arg1.stdin ?? ''
    };
  } else {
    params = {
      language: arg1,
      code: arg2,
      stdin: arg3 ?? ''
    };
  }

  const activeEngines = ENGINES.filter(e => e.enabled);
  if (activeEngines.length === 0) {
    throw new Error('No execution engines are enabled. Please verify your environment configuration.');
  }

  for (const engine of activeEngines) {
    try {
      const result = await executeWithEngine(engine, params);
      return result;
    } catch (err) {
      console.warn(`Engine ${engine.name} failed, trying next... Error:`, err);
      continue;
    }
  }
  throw new Error('All execution engines unavailable. Please try again in a moment.');
}

/**
 * Checks the status/health of the active engines.
 */
export async function checkEngineHealth() {
  const testCode = { 
    language: 'python', 
    code: 'print("hello")', 
    stdin: '' 
  };

  const activeEngines = ENGINES.filter(e => e.enabled);
  if (activeEngines.length === 0) {
    return { engine: null, status: 'offline', healthy: false };
  }

  for (const engine of activeEngines) {
    try {
      const startTime = performance.now();
      const r = await executeWithEngine(engine, testCode);
      const latency = performance.now() - startTime;
      
      if (r.stdout.trim() === 'hello') {
        const status = latency > 5000 ? 'slow' : 'healthy';
        return { engine: engine.name, status, healthy: true };
      }
    } catch (e) {
      console.warn(`Health check failed for engine ${engine.name}:`, e);
    }
  }
  return { engine: null, status: 'offline', healthy: false };
}

/**
 * Judges code against multiple test cases sequentially.
 */
export async function judgeCode({ language, code, testCases, onProgress }) {
  const results = [];
  let allPassed = true;
  const start = performance.now();

  for (let i = 0; i < testCases.length; i++) {
    if (onProgress) onProgress(i + 1, testCases.length);
    const tc = testCases[i];
    const result = await executeCode({ language, code, stdin: tc.input });

    const actual = (result.stdout || '').trim();
    const expected = (tc.expectedOutput || '').trim();
    const passed = actual === expected;
    if (!passed) allPassed = false;

    let verdict = 'Accepted';
    if (result.statusId === 5) verdict = 'Time Limit Exceeded';
    else if (result.statusId === 6) verdict = 'Compilation Error';
    else if (result.statusId >= 7) verdict = 'Runtime Error';
    else if (!passed) verdict = 'Wrong Answer';

    results.push({
      input: tc.input,
      expected,
      actual,
      passed,
      verdict,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      time: result.time,
      memory: result.memory
    });
    if (!passed && verdict !== 'Accepted') { allPassed = false; break; }
  }

  const totalTime = Math.round(performance.now() - start);
  const finalVerdict = allPassed ? 'Accepted'
    : results.find(r => r.verdict === 'Time Limit Exceeded') ? 'Time Limit Exceeded'
    : results.find(r => r.verdict === 'Compilation Error') ? 'Compilation Error'
    : results.find(r => r.verdict === 'Runtime Error') ? 'Runtime Error'
    : 'Wrong Answer';

  return { verdict: finalVerdict, results, totalTime, allPassed };
}

/**
 * Compatibility helper for judgeSubmission in ProblemDetail.jsx.
 */
export async function judgeSubmission(language, code, testCases) {
  const mappedTestCases = testCases.map(tc => ({
    input: tc.input || '',
    expectedOutput: tc.expectedOutput || tc.output || ''
  }));
  
  const judgeRes = await judgeCode({
    language,
    code,
    testCases: mappedTestCases
  });

  const results = judgeRes.results.map((r, idx) => ({
    testCase: idx + 1,
    status: r.verdict === 'Compilation Error' || r.verdict === 'Runtime Error' ? 'Error'
          : r.verdict === 'Wrong Answer' ? 'Wrong'
          : r.verdict,
    output: r.actual || r.stderr || r.compileOutput || '',
    expected: r.expected,
    executionTime: r.time ? Math.round(r.time * 1000) : 0
  }));

  let finalVerdict = judgeRes.verdict;
  if (finalVerdict === 'Compilation Error' || finalVerdict === 'Runtime Error') {
    finalVerdict = 'Error';
  } else if (finalVerdict === 'Wrong Answer') {
    finalVerdict = 'Wrong Answer';
  }

  return {
    verdict: finalVerdict,
    executionTime: judgeRes.totalTime,
    results
  };
}
