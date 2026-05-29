const fs   = require('fs');
const path = require('path');

// ── PATHS ──────────────────────────────────────────────────────────────────
const DATA_DIR      = path.resolve(__dirname, '..', 'data');
const DETAILS_FILE  = path.join(DATA_DIR, 'problem_details.json');
const OUTPUT_FILE   = path.join(DATA_DIR, 'codearena_problems.json');

// ── HELPERS ────────────────────────────────────────────────────────────────

function mapDifficulty(d) {
  if (d === 'Easy')   return 'Easy';
  if (d === 'Medium') return 'Medium';
  return 'Hard';
}

/**
 * Extract starter code snippets for the languages CodeArena supports.
 */
function extractStarterCode(codeSnippets) {
  const langs = ['python3', 'java', 'cpp', 'javascript', 'typescript', 'go', 'rust', 'kotlin', 'swift', 'csharp'];
  const result = {};
  for (const lang of langs) {
    const snippet = codeSnippets?.find(s => s.langSlug === lang);
    if (snippet) result[lang] = snippet.code;
  }
  return result;
}

/**
 * Convert LeetCode HTML problem content to clean Markdown.
 */
function cleanHTML(html) {
  if (!html) return '';
  return html
    // Code blocks
    .replace(/<pre[^>]*>/gi,  '\n```\n')
    .replace(/<\/pre>/gi,     '\n```\n')
    .replace(/<code>/gi,      '`')
    .replace(/<\/code>/gi,    '`')
    // Bold / italic
    .replace(/<strong>/gi,    '**')
    .replace(/<\/strong>/gi,  '**')
    .replace(/<b>/gi,         '**')
    .replace(/<\/b>/gi,       '**')
    .replace(/<em>/gi,        '*')
    .replace(/<\/em>/gi,      '*')
    .replace(/<i>/gi,         '*')
    .replace(/<\/i>/gi,       '*')
    // Lists
    .replace(/<ul>/gi,        '\n')
    .replace(/<\/ul>/gi,      '\n')
    .replace(/<ol>/gi,        '\n')
    .replace(/<\/ol>/gi,      '\n')
    .replace(/<li>/gi,        '- ')
    .replace(/<\/li>/gi,      '\n')
    // Paragraphs / line breaks
    .replace(/<\/p>/gi,       '\n\n')
    .replace(/<p>/gi,         '')
    .replace(/<br\s*\/?>/gi,  '\n')
    // Headings
    .replace(/<h[1-6][^>]*>/gi,  '\n### ')
    .replace(/<\/h[1-6]>/gi,     '\n')
    // Superscript (common in LeetCode: 10^9)
    .replace(/<sup>/gi,       '^')
    .replace(/<\/sup>/gi,     '')
    // Sub
    .replace(/<sub>/gi,       '_')
    .replace(/<\/sub>/gi,     '')
    // Strip remaining tags
    .replace(/<[^>]*>/g,      '')
    // HTML entities
    .replace(/&nbsp;/g,       ' ')
    .replace(/&lt;/g,         '<')
    .replace(/&gt;/g,         '>')
    .replace(/&amp;/g,        '&')
    .replace(/&quot;/g,       '"')
    .replace(/&#39;/g,        "'")
    .replace(/&le;/g,         '≤')
    .replace(/&ge;/g,         '≥')
    .replace(/&times;/g,      '×')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g,       '\n\n')
    .trim();
}

/**
 * Parse up to 3 Input/Output example pairs out of the HTML content.
 * Handles the "Example N:" label format LeetCode uses.
 */
function extractExamples(content) {
  if (!content) return [];
  const examples = [];

  // Strip HTML first for cleaner regex matching
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  const regex = /Example\s+\d+\s*:?\s*Input\s*:([\s\S]*?)Output\s*:([\s\S]*?)(?=Example\s+\d|Constraints|Explanation|Follow-up|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null && examples.length < 3) {
    const rawInput  = match[1].trim();
    const rawOutput = match[2].trim();

    // Strip trailing "Explanation: …" lines that sometimes bleed in
    const explanation = rawOutput.match(/Explanation\s*:(.*)/i);
    examples.push({
      input:       rawInput,
      output:      explanation ? rawOutput.slice(0, rawOutput.indexOf(explanation[0])).trim() : rawOutput,
      explanation: explanation ? explanation[1].trim() : ''
    });
  }

  return examples;
}

/**
 * Parse constraint bullet points from HTML content.
 */
function extractConstraints(content) {
  if (!content) return [];
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const section = text.match(/Constraints\s*:([\s\S]*?)(?=Follow-up|$)/i);
  if (!section) return [];
  return section[1]
    .split(/[-•]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 200)
    .slice(0, 10);
}

/**
 * Derive a CodeArena "number" field from the LeetCode frontend ID.
 * Keeps it as an integer for sorting.
 */
function toNumber(frontendId) {
  const n = parseInt(frontendId, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map LeetCode topic tags to CodeArena's canonical tag set.
 * Unknown tags are kept as-is.
 */
const TAG_MAP = {
  'Array':                    'Arrays',
  'Hash Table':               'HashMap',
  'Linked List':              'Linked List',
  'Math':                     'Math',
  'Two Pointers':             'Two Pointers',
  'String':                   'Strings',
  'Binary Search':            'Binary Search',
  'Divide and Conquer':       'Divide and Conquer',
  'Dynamic Programming':      'DP',
  'Backtracking':             'Backtracking',
  'Stack':                    'Stack',
  'Heap (Priority Queue)':    'Heap',
  'Graph':                    'Graphs',
  'Depth-First Search':       'BFS/DFS',
  'Breadth-First Search':     'BFS/DFS',
  'Tree':                     'Trees',
  'Binary Tree':              'Trees',
  'Binary Search Tree':       'Trees',
  'Sliding Window':           'Sliding Window',
  'Bit Manipulation':         'Bit Manipulation',
  'Greedy':                   'Greedy',
  'Recursion':                'Recursion',
  'Trie':                     'Trie',
  'Union Find':               'Union Find',
  'Monotonic Stack':          'Stack',
  'Matrix':                   'Arrays',
  'Simulation':               'Simulation',
  'Sorting':                  'Sorting',
  'Counting':                 'Math',
  'Prefix Sum':               'Arrays',
  'Queue':                    'Queue',
  'Segment Tree':             'Trees',
  'Memoization':              'DP',
  'Number Theory':            'Math',
  'Geometry':                 'Math',
  'String Matching':          'Strings',
};

function normalizeTags(topicTags) {
  const seen = new Set();
  return (topicTags || [])
    .map(t => TAG_MAP[t.name] || t.name)
    .filter(t => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

// ── MAIN TRANSFORM ─────────────────────────────────────────────────────────

if (!fs.existsSync(DETAILS_FILE)) {
  console.error(`❌ ${DETAILS_FILE} not found. Run fetchProblemDetails.js first.`);
  process.exit(1);
}

console.log('📖 Reading problem_details.json…');
const raw = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));
console.log(`   Raw records: ${raw.length}`);

const transformed = raw
  .filter(p => p && p.title && p.content)   // must have content
  .map(p => {
    const examples    = extractExamples(p.content);
    const constraints = extractConstraints(p.content);
    const description = cleanHTML(p.content);
    const topics      = normalizeTags(p.topicTags);

    // Parse stats JSON safely
    let statsObj = {};
    try { statsObj = p.stats ? JSON.parse(p.stats) : {}; } catch {}

    return {
      // ── Identity ──
      id:              `lc_${p.questionFrontendId}`,
      source:          'leetcode',
      leetcodeId:      toNumber(p.questionFrontendId),
      number:          toNumber(p.questionFrontendId),
      title:           p.title,
      slug:            p.titleSlug,

      // ── Classification ──
      difficulty:      mapDifficulty(p.difficulty),
      topics,
      companyTags:     [],
      type:            'coding',

      // ── Content ──
      description,
      hints:           Array.isArray(p.hints) ? p.hints : [],
      examples,
      constraints,

      // ── Test data ──
      sampleTestCase:    p.sampleTestCase    || '',
      exampleTestcases:  p.exampleTestcases  || '',

      // ── Code ──
      starterCode: extractStarterCode(p.codeSnippets),

      // ── Stats ──
      acRate:         parseFloat(p.acRate || 0).toFixed(1),
      totalAccepted:  statsObj.totalAccepted  || '',
      totalSubmission: statsObj.totalSubmission || '',

      // ── Flags ──
      hasSolution:      !!p.solution?.canSeeDetail,
      isPremium:        false,   // we only imported free problems

      // ── Meta ──
      createdAt: new Date().toISOString()
    };
  })
  // Sort by LeetCode problem number for clean Firestore ordering
  .sort((a, b) => a.leetcodeId - b.leetcodeId);

// ── WRITE OUTPUT ──────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformed, null, 2));

// ── SUMMARY ───────────────────────────────────────────────────────────────
const skipped = raw.length - transformed.length;
const byDiff  = { Easy: 0, Medium: 0, Hard: 0 };
const topicFreq = {};

for (const p of transformed) {
  byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
  p.topics.forEach(t => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
}

const topTopics = Object.entries(topicFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('\n─────────────────────────────────────────');
console.log(`✅  Transformed  : ${transformed.length} problems`);
console.log(`⏭️   Skipped      : ${skipped} (no title or content)`);
console.log(`💾  Output       : ${OUTPUT_FILE}`);
console.log('\n📊 By Difficulty:');
console.log(`   Easy   : ${byDiff.Easy}`);
console.log(`   Medium : ${byDiff.Medium}`);
console.log(`   Hard   : ${byDiff.Hard}`);
console.log('\n🏷️  Top Topics:');
topTopics.forEach(([t, n]) => console.log(`   ${t.padEnd(22)} ${n}`));
console.log('─────────────────────────────────────────');
