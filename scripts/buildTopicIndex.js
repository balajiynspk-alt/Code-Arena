/**
 * scripts/buildTopicIndex.js
 *
 * Reads all /problems docs from Firestore and writes a rich index into /meta:
 *
 *   /meta/problemStats   → total counts, difficulty breakdown, last updated
 *   /meta/topics         → sorted list of topics with count + difficulty split
 *   /meta/companies      → sorted list of companies with count
 *   /meta/difficultyIndex → per-difficulty problem ID lists (for fast filtering)
 *   /topicIndex/{topic}  → per-topic doc with full problem ID list + difficulty map
 *
 * Usage:
 *   node scripts/buildTopicIndex.js              # build full index in Firestore
 *   node scripts/buildTopicIndex.js --dry-run    # compute & print, no writes
 *   node scripts/buildTopicIndex.js --local      # also write data/topic_index.json
 *   node scripts/buildTopicIndex.js --local-only # only write local JSON (no Firebase)
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── CLI FLAGS ──────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const LOCAL      = args.includes('--local') || args.includes('--local-only');
const LOCAL_ONLY = args.includes('--local-only');

// ── PATHS ──────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const SA_PATH    = path.join(ROOT, 'serviceAccountKey.json');
const LOCAL_OUT  = path.join(ROOT, 'data', 'topic_index.json');
const LOCAL_PROB = path.join(ROOT, 'data', 'codearena_problems.json');

// ── FIREBASE INIT ──────────────────────────────────────────────────────────
let db;
if (!LOCAL_ONLY) {
  if (!fs.existsSync(SA_PATH)) {
    console.error(`❌  serviceAccountKey.json not found at ${SA_PATH}`);
    console.error('    Use --local-only to build index from local JSON instead.');
    process.exit(1);
  }
  const serviceAccount = require(SA_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── PAGINATED FIRESTORE READ ───────────────────────────────────────────────
// Avoids loading all 3000+ docs into memory at once.
async function readAllProblems() {
  const problems = [];
  let last = null;
  let page = 0;

  while (true) {
    let q = db.collection('problems').orderBy('leetcodeId').limit(500);
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    snap.docs.forEach(doc => problems.push({ id: doc.id, ...doc.data() }));
    last = snap.docs[snap.docs.length - 1];
    page++;
    process.stdout.write(`\r   📥  Page ${page}: ${problems.length} problems loaded…`);
  }

  console.log(`\r   ✅  ${problems.length} problems loaded.            `);
  return problems;
}

// ── LOCAL JSON READ ────────────────────────────────────────────────────────
function readLocalProblems() {
  if (!fs.existsSync(LOCAL_PROB)) {
    console.error(`❌  ${LOCAL_PROB} not found. Run transformProblems.js first.`);
    process.exit(1);
  }
  const problems = JSON.parse(fs.readFileSync(LOCAL_PROB, 'utf8'));
  console.log(`   ✅  ${problems.length} problems loaded from local JSON.`);
  return problems.map(p => ({ id: p.id, ...p }));
}

// ── BUILD INDEX STRUCTURES ─────────────────────────────────────────────────
function buildIndexStructures(problems) {
  // topicMap[topic] = { count, easy, medium, hard, ids[] }
  const topicMap   = {};
  const companyMap = {};
  const diffIndex  = { Easy: [], Medium: [], Hard: [] };

  let easy = 0, medium = 0, hard = 0;
  let withHints = 0, withSolution = 0;
  const langCoverage = {};

  for (const p of problems) {
    // ── Difficulty counts ──
    if      (p.difficulty === 'Easy')   { easy++;   diffIndex.Easy.push(p.id);   }
    else if (p.difficulty === 'Medium') { medium++;  diffIndex.Medium.push(p.id); }
    else if (p.difficulty === 'Hard')   { hard++;    diffIndex.Hard.push(p.id);   }

    // ── Topic index ──
    for (const topic of (p.topics || [])) {
      if (!topicMap[topic]) {
        topicMap[topic] = { count: 0, easy: 0, medium: 0, hard: 0, ids: [] };
      }
      topicMap[topic].count++;
      topicMap[topic][p.difficulty?.toLowerCase() || 'easy']++;
      topicMap[topic].ids.push(p.id);
    }

    // ── Company index ──
    for (const company of (p.companyTags || [])) {
      if (!companyMap[company]) companyMap[company] = { count: 0, ids: [] };
      companyMap[company].count++;
      companyMap[company].ids.push(p.id);
    }

    // ── Misc stats ──
    if (p.hints?.length > 0)  withHints++;
    if (p.hasSolution)         withSolution++;

    // ── Language coverage ──
    for (const lang of Object.keys(p.starterCode || {})) {
      langCoverage[lang] = (langCoverage[lang] || 0) + 1;
    }
  }

  // ── Sort topic & company lists ──
  const topicList = Object.entries(topicMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, d]) => ({ name, count: d.count, easy: d.easy, medium: d.medium, hard: d.hard }));

  const companyList = Object.entries(companyMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, d]) => ({ name, count: d.count }));

  const stats = {
    total:       problems.length,
    easy, medium, hard,
    withHints,
    withSolution,
    topics:      topicList.length,
    companies:   companyList.length,
    langCoverage
  };

  return { stats, topicList, topicMap, companyList, companyMap, diffIndex };
}

// ── PRINT REPORT ───────────────────────────────────────────────────────────
function printReport({ stats, topicList, companyList }) {
  console.log('\n════════════════════════════════════════════════════');
  console.log('📊  PROBLEM INDEX REPORT');
  console.log('════════════════════════════════════════════════════');
  console.log(`Total problems  : ${stats.total}`);
  console.log(`  🟢 Easy       : ${stats.easy}`);
  console.log(`  🟡 Medium     : ${stats.medium}`);
  console.log(`  🔴 Hard       : ${stats.hard}`);
  console.log(`  💡 With hints : ${stats.withHints}`);
  console.log(`  ✅ With sol.  : ${stats.withSolution}`);

  console.log('\n🏷️  Top 15 Topics:');
  topicList.slice(0, 15).forEach((t, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${t.name.padEnd(28)} ${String(t.count).padStart(4)} (E:${t.easy} M:${t.medium} H:${t.hard})`)
  );

  console.log('\n🏢  Top 15 Companies:');
  companyList.slice(0, 15).forEach((c, i) =>
    console.log(`  ${String(i + 1).padStart(2)}. ${c.name.padEnd(24)} ${String(c.count).padStart(4)} problems`)
  );

  console.log('\n💻  Language Coverage:');
  Object.entries(stats.langCoverage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) =>
      console.log(`   ${lang.padEnd(16)} ${count} problems`)
    );

  console.log('════════════════════════════════════════════════════\n');
}

// ── FIRESTORE WRITES ───────────────────────────────────────────────────────
async function writeToFirestore({ stats, topicList, topicMap, companyList, companyMap, diffIndex }) {
  const batch1 = db.batch();

  // /meta/problemStats
  batch1.set(db.collection('meta').doc('problemStats'), {
    ...stats,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  // /meta/topics  (summary list, no ID arrays — keeps doc small)
  batch1.set(db.collection('meta').doc('topics'), { list: topicList });

  // /meta/companies
  batch1.set(db.collection('meta').doc('companies'), { list: companyList });

  // /meta/difficultyIndex  (ID lists per difficulty for instant filter)
  batch1.set(db.collection('meta').doc('difficultyIndex'), diffIndex);

  console.log('   💾  Writing /meta docs…');
  await batch1.commit();
  console.log('   ✅  /meta docs committed.');

  // ── Per-topic docs: /topicIndex/{topic} ──
  // Each doc contains the full problem ID list + difficulty split.
  // Use batches of 400 to stay under Firestore's 500-op limit.
  const topicEntries = Object.entries(topicMap);
  const BATCH_SIZE   = 400;
  let topicsDone     = 0;

  for (let i = 0; i < topicEntries.length; i += BATCH_SIZE) {
    const chunk = topicEntries.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(([topic, data]) => {
      const ref = db.collection('topicIndex').doc(
        topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      );
      batch.set(ref, {
        name:   topic,
        count:  data.count,
        easy:   data.easy,
        medium: data.medium,
        hard:   data.hard,
        ids:    data.ids
      });
    });
    await batch.commit();
    topicsDone += chunk.length;
    console.log(`   💾  /topicIndex: ${topicsDone}/${topicEntries.length} topics written`);
    await sleep(500);
  }
}

// ── LOCAL JSON WRITE ───────────────────────────────────────────────────────
function writeLocal({ stats, topicList, topicMap, companyList, diffIndex }) {
  const out = {
    generatedAt: new Date().toISOString(),
    stats,
    topicList,
    companyList,
    topicDetails: Object.fromEntries(
      Object.entries(topicMap).map(([k, v]) => [k, { ...v }])
    ),
    difficultyIndex: {
      Easy:   diffIndex.Easy.length,
      Medium: diffIndex.Medium.length,
      Hard:   diffIndex.Hard.length
    }
  };
  fs.mkdirSync(path.dirname(LOCAL_OUT), { recursive: true });
  fs.writeFileSync(LOCAL_OUT, JSON.stringify(out, null, 2));
  console.log(`   ✅  Local index written to: ${LOCAL_OUT}`);
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function buildIndex() {
  console.log('\n🔨  Building topic index…\n');

  // ── Load problems ──
  const problems = LOCAL_ONLY ? readLocalProblems() : await readAllProblems();

  // ── Compute index structures ──
  console.log('⚙️   Computing index structures…');
  const index = buildIndexStructures(problems);

  // ── Print report ──
  printReport(index);

  if (DRY_RUN) {
    console.log('🔎  DRY-RUN — no writes performed.\n');
    return;
  }

  // ── Write outputs ──
  if (LOCAL) writeLocal(index);

  if (!LOCAL_ONLY) {
    console.log('🚀  Writing to Firestore…');
    await writeToFirestore(index);
    console.log('\n✅  Index build complete!\n');
  }
}

buildIndex().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
