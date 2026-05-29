/**
 * scripts/fetchNewProblemsOnly.js
 *
 * Differential detail fetcher — only fetches problem details for slugs
 * that exist in leetcode_problems.json but NOT yet in problem_details.json.
 *
 * This is the CI-optimised version used by the GitHub Actions weekly sync.
 * On first run it behaves identically to fetchProblemDetails.js.
 * On subsequent runs it only fetches newly added problems (usually 5-20/week).
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const DATA_DIR      = path.resolve(__dirname, '..', 'data');
const PROBLEMS_FILE = path.join(DATA_DIR, 'leetcode_problems.json');
const DETAILS_FILE  = path.join(DATA_DIR, 'problem_details.json');
const FAILED_FILE   = path.join(DATA_DIR, 'problem_details_failed.json');

const LEETCODE_API  = 'https://leetcode.com/graphql';
const DELAY_MS      = 800;
const MAX_RETRIES   = 3;
const SAVE_EVERY    = 25;

const detailQuery = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId questionFrontendId title titleSlug content
      difficulty topicTags { name slug } hints sampleTestCase
      exampleTestcases metaData
      codeSnippets { lang langSlug code }
      stats acRate solution { id canSeeDetail }
    }
  }
`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchDetail(titleSlug) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(LEETCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ query: detailQuery, variables: { titleSlug } })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      if (!json.data?.question) throw new Error('Empty payload');
      return json.data.question;
    } catch (err) {
      lastErr = err;
      await sleep(attempt * 2000);
    }
  }
  throw lastErr;
}

async function main() {
  // ── Load all problem titles ──
  if (!fs.existsSync(PROBLEMS_FILE)) {
    console.error('❌  leetcode_problems.json not found. Run fetchLeetcodeProblems.js first.');
    process.exit(1);
  }
  const allProblems  = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
  const freeProblems = allProblems.filter(p => !p.paidOnly);

  // ── Load existing details (resume / diff base) ──
  let details = [];
  const existingSlugs = new Set();

  if (fs.existsSync(DETAILS_FILE)) {
    try {
      details = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));
      details.forEach(d => d?.titleSlug && existingSlugs.add(d.titleSlug));
    } catch { /* corrupt file — start fresh */ }
  }

  let failed = [];
  if (fs.existsSync(FAILED_FILE)) {
    try { failed = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8')); } catch {}
  }

  // ── Compute diff ──
  const newProblems = freeProblems.filter(p => !existingSlugs.has(p.titleSlug));

  console.log(`\n📋  Total free problems  : ${freeProblems.length}`);
  console.log(`♻️   Already fetched      : ${existingSlugs.size}`);
  console.log(`🆕  New problems to fetch : ${newProblems.length}\n`);

  if (newProblems.length === 0) {
    console.log('✅  No new problems — problem_details.json is already up to date!');
    process.exit(0);
  }

  const startTime = Date.now();

  for (let i = 0; i < newProblems.length; i++) {
    const p = newProblems[i];

    const elapsed   = Date.now() - startTime;
    const perItem   = i > 0 ? elapsed / i : DELAY_MS;
    const remaining = (newProblems.length - i) * perItem;
    const eta       = i > 0 ? `${Math.round(remaining / 1000)}s` : '—';

    process.stdout.write(
      `[${i + 1}/${newProblems.length}] #${p.frontendQuestionId?.toString().padStart(4)} ` +
      `${p.title.substring(0, 40).padEnd(40)} ETA: ${eta.padStart(6)} `
    );

    try {
      const detail = await fetchDetail(p.titleSlug);
      details.push(detail);
      existingSlugs.add(p.titleSlug);
      process.stdout.write('✅\n');
    } catch (err) {
      process.stdout.write(`❌  ${err.message}\n`);
      failed.push({ titleSlug: p.titleSlug, title: p.title, error: err.message });
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2));
      fs.writeFileSync(FAILED_FILE,  JSON.stringify(failed,  null, 2));
      console.log(`   💾  Checkpoint: ${details.length} total details saved`);
    }

    await sleep(DELAY_MS);
  }

  // Final save
  fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2));
  fs.writeFileSync(FAILED_FILE,  JSON.stringify(failed,  null, 2));

  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Done in ${elapsed} min`);
  console.log(`🆕  New fetched  : ${newProblems.length - failed.length}`);
  console.log(`📦  Total stored : ${details.length}`);
  if (failed.length) console.log(`❌  Failed       : ${failed.length}`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
