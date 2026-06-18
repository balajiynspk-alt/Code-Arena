const PISTON_API = 'https://emkc.org/api/v2/piston';

export async function fetchLanguages() {
  try {
    const res = await fetch(`${PISTON_API}/runtimes`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const runtimes = await res.json();
    return runtimes.map(r => ({
      language: r.language,
      version: r.version,
      aliases: r.aliases,
      displayName: r.language.charAt(0).toUpperCase() + r.language.slice(1)
    }));
  } catch (err) {
    console.warn("Failed to fetch Piston runtimes, using fallback list:", err);
    // Fallback popular runtimes list
    return [
      { language: 'python', version: '3.10.0', displayName: 'Python' },
      { language: 'javascript', version: '18.0.0', displayName: 'JavaScript' },
      { language: 'typescript', version: '5.0.0', displayName: 'TypeScript' },
      { language: 'java', version: '17.0.0', displayName: 'Java' },
      { language: 'c++', version: '11.0.0', displayName: 'C++' },
      { language: 'c', version: '11.0.0', displayName: 'C' },
      { language: 'go', version: '1.20.0', displayName: 'Go' },
      { language: 'rust', version: '1.68.0', displayName: 'Rust' },
      { language: 'kotlin', version: '1.8.0', displayName: 'Kotlin' },
      { language: 'csharp', version: '6.0.0', displayName: 'C#' }
    ];
  }
}
