const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

// ── PATHS ──────────────────────────────────────────────────────────────────
const DATA_DIR       = path.resolve(__dirname, '..', 'data');
const PROBLEMS_FILE  = path.join(DATA_DIR, 'leetcode_problems.json');
const DETAILS_FILE   = path.join(DATA_DIR, 'problem_details.json');
const FAILED_FILE    = path.join(DATA_DIR, 'problem_details_failed.json');

const LEETCODE_API   = 'https://leetcode.com/graphql';
const DELAY_MS       = 800;   // between successful requests
const SAVE_EVERY     = 50;    // checkpoint writes
const MAX_RETRIES    = 3;     // per problem before marking failed

// ── GRAPHQL QUERY ──────────────────────────────────────────────────────────
const detailQuery = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      content
      difficulty
      topicTags { name slug }
      hints
      sampleTestCase
      exampleTestcases
      metaData
      codeSnippets {
        lang
        langSlug
        code
      }
      stats
      acRate
      solution { id canSeeDetail }
    }
  }
`;

// ── HELPERS ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function formatETA(remainingMs) {
  const s = Math.round(remainingMs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)  return `${h}h ${m % 60}m`;
  if (m > 0)  return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ── FETCH WITH RETRY + EXPONENTIAL BACK-OFF ────────────────────────────────
async function fetchDetail(titleSlug) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(LEETCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer':      'https://leetcode.com',
          'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ query: detailQuery, variables: { titleSlug } })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const json = await res.json();

      if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
      if (!json.data?.question) throw new Error('Empty question payload');

      return json.data.question;

    } catch (err) {
      lastErr = err;
      const backoff = attempt * 2000; // 2s, 4s, 6s
      console.warn(`   ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed (${err.message}). Retrying in ${backoff / 1000}s…`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function fetchAll() {
  if (!fs.existsSync(PROBLEMS_FILE)) {
    console.error(`❌ ${PROBLEMS_FILE} not found. Run fetchLeetcodeProblems.js first.`);
    process.exit(1);
  }

  const allProblems  = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
  const freeProblems = allProblems.filter(p => !p.paidOnly);
  console.log(`📋 Total free problems: ${freeProblems.length}`);

  // ── RESUME SUPPORT ──
  // Load any previously fetched details so we can skip already-done slugs.
  let details  = [];
  let failed   = [];
  let fetchedSlugs = new Set();

  if (fs.existsSync(DETAILS_FILE)) {
    try {
      details = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));
      details.forEach(d => d?.titleSlug && fetchedSlugs.add(d.titleSlug));
      console.log(`♻️  Resuming — ${fetchedSlugs.size} problems already saved, skipping them.`);
    } catch {
      console.warn('⚠️  Could not parse existing details file; starting fresh.');
    }
  }

  if (fs.existsSync(FAILED_FILE)) {
    try { failed = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8')); } catch {}
  }

  const todo = freeProblems.filter(p => !fetchedSlugs.has(p.titleSlug));
  console.log(`🚀 Fetching ${todo.length} remaining problems…\n`);

  if (todo.length === 0) {
    console.log('✅ Nothing to do — all problems already fetched!');
    process.exit(0);
  }

  const startTime = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];

    // ETA calculation
    const elapsed   = Date.now() - startTime;
    const perItem   = i > 0 ? elapsed / i : DELAY_MS;
    const remaining = perItem * (todo.length - i);
    const etaStr    = i > 0 ? formatETA(remaining) : '—';
    const overall   = fetchedSlugs.size + i + 1;

    process.stdout.write(
      `[${overall}/${freeProblems.length}] ` +
      `#${p.frontendQuestionId?.toString().padStart(4, ' ')} ${p.title.substring(0, 42).padEnd(42)} ` +
      `ETA: ${etaStr.padStart(8)} `
    );

    try {
      const detail = await fetchDetail(p.titleSlug);
      details.push(detail);
      fetchedSlugs.add(p.titleSlug);
      process.stdout.write('✅\n');
    } catch (err) {
      process.stdout.write(`❌  (${err.message})\n`);
      failed.push({ titleSlug: p.titleSlug, title: p.title, error: err.message });
    }

    // Checkpoint save every SAVE_EVERY items
    if ((i + 1) % SAVE_EVERY === 0) {
      saveJSON(DETAILS_FILE, details);
      saveJSON(FAILED_FILE,  failed);
      console.log(`   💾 Checkpoint saved (${details.length} details, ${failed.length} failed)`);
    }

    await sleep(DELAY_MS);
  }

  // ── FINAL SAVE ──
  saveJSON(DETAILS_FILE, details);
  saveJSON(FAILED_FILE,  failed);

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Done in ${elapsed} min`);
  console.log(`📦  Total fetched : ${details.length}`);
  console.log(`❌  Total failed  : ${failed.length}`);
  console.log(`💾  Output        : ${DETAILS_FILE}`);
  if (failed.length > 0) {
    console.log(`⚠️   Failed list   : ${FAILED_FILE}`);
  }
  console.log('─────────────────────────────────────────');
}

fetchAll().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
