const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_MAP = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
};

export const executeCode = async (langKey, code, stdin = "") => {
  const langConfig = LANGUAGE_MAP[langKey];
  if (!langConfig) throw new Error("Unsupported language");

  const response = await fetch(PISTON_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ content: code }],
      stdin: stdin
    })
  });

  if (!response.ok) {
    throw new Error('Code execution failed due to API error');
  }

  const data = await response.json();
  return data;
};

export const judgeSubmission = async (langKey, code, testCases) => {
  let results = [];
  let allPassed = true;
  let maxExecutionTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const { input, expectedOutput } = testCases[i];
    
    try {
      const startTime = performance.now();
      const outputData = await executeCode(langKey, code, input);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      if (executionTime > maxExecutionTime) {
        maxExecutionTime = executionTime;
      }

      const actualOutput = outputData.run.stdout.trim();
      const errorOutput = outputData.run.stderr.trim();
      
      if (errorOutput) {
        results.push({
          testCase: i + 1,
          status: 'Error',
          output: errorOutput,
          expected: expectedOutput,
          executionTime: Math.round(executionTime)
        });
        allPassed = false;
        break; // Stop at first error
      }

      if (actualOutput === expectedOutput.trim()) {
        results.push({
          testCase: i + 1,
          status: 'Accepted',
          output: actualOutput,
          expected: expectedOutput,
          executionTime: Math.round(executionTime)
        });
      } else {
        results.push({
          testCase: i + 1,
          status: 'Wrong',
          output: actualOutput,
          expected: expectedOutput,
          executionTime: Math.round(executionTime)
        });
        allPassed = false;
        break; // Stop at first wrong answer
      }
    } catch (err) {
      results.push({
        testCase: i + 1,
        status: 'Error',
        output: err.message,
        expected: expectedOutput,
        executionTime: 0
      });
      allPassed = false;
      break;
    }
  }

  const finalVerdict = allPassed ? 'Accepted' : results[results.length - 1].status;

  return {
    verdict: finalVerdict,
    executionTime: Math.round(maxExecutionTime),
    results
  };
};
