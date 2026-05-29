/**
 * scripts/uploadToFirestore.js
 *
 * Uploads data/codearena_problems.json → Firestore /problems collection
 * using the Firebase Admin SDK (service-account credentials).
 *
 * Usage:
 *   node scripts/uploadToFirestore.js              # full upload
 *   node scripts/uploadToFirestore.js --dry-run    # validate only, no writes
 *   node scripts/uploadToFirestore.js --resume     # skip IDs already in Firestore
 *   node scripts/uploadToFirestore.js --diff       # only upload changed docs
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── CLI FLAGS ──────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESUME  = args.includes('--resume');
const DIFF    = args.includes('--diff');

// ── PATHS ──────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const SA_PATH      = path.join(ROOT, 'serviceAccountKey.json');
const PROBLEMS_FILE = path.join(ROOT, 'data', 'codearena_problems.json');
const PROGRESS_FILE = path.join(ROOT, 'data', 'upload_progress.json');

// ── CONFIG ─────────────────────────────────────────────────────────────────
const BATCH_SIZE    = 400;   // Firestore hard cap is 500; keep headroom
const BATCH_DELAY   = 1000;  // ms between batch commits
const COLLECTION    = 'problems';

// ── INIT ───────────────────────────────────────────────────────────────────
if (!fs.existsSync(SA_PATH)) {
  console.error(`
❌  Service account key not found at:
    ${SA_PATH}

To generate one:
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key"
  3. Save the JSON file as serviceAccountKey.json in the project root

⚠️  Never commit serviceAccountKey.json to Git!
`);
  process.exit(1);
}

if (!fs.existsSync(PROBLEMS_FILE)) {
  console.error(`❌  ${PROBLEMS_FILE} not found. Run transformProblems.js first.`);
  process.exit(1);
}

const serviceAccount = require(SA_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── HELPERS ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return { uploaded: [] };
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return { uploaded: [] }; }
}

function saveProgress(uploadedIds) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ uploaded: uploadedIds }, null, 2));
}

function formatETA(remainingItems, msPerItem) {
  const ms = remainingItems * msPerItem;
  const s  = Math.round(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  if (h > 0)  return `${h}h ${m % 60}m`;
  if (m > 0)  return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/**
 * Fetch all existing document IDs in the collection (for --resume / --diff).
 * Uses paginated collection group reads to avoid memory issues.
 */
async function fetchExistingIds() {
  console.log('🔍 Fetching existing Firestore document IDs…');
  const ids = new Set();
  let last  = null;
  let page  = 0;

  while (true) {
    let q = db.collection(COLLECTION).select().limit(1000);   // select() = IDs only
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    snap.docs.forEach(d => ids.add(d.id));
    last = snap.docs[snap.docs.length - 1];
    page++;
    process.stdout.write(`\r   …page ${page} (${ids.size} IDs loaded)`);
  }

  console.log(`\r   ✅  ${ids.size} existing IDs loaded.            `);
  return ids;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function uploadProblems() {
  const allProblems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
  console.log(`\n📋  Loaded ${allProblems.length} problems from ${PROBLEMS_FILE}`);

  if (DRY_RUN) {
    console.log('\n🔎  DRY-RUN mode — validating documents, no writes will happen.\n');
  }

  // ── FILTER: resume / diff ──
  let problems = allProblems;

  if (RESUME || DIFF) {
    const existingIds = await fetchExistingIds();

    if (RESUME) {
      // Skip IDs already present in Firestore
      problems = allProblems.filter(p => !existingIds.has(p.id));
      console.log(`♻️   Resume mode  — ${allProblems.length - problems.length} already uploaded, ${problems.length} remaining.\n`);
    } else if (DIFF) {
      // Also skip, but note we can't compare content without fetching full docs.
      // Treat same as resume for now; a full --diff would require fetching & hashing.
      problems = allProblems.filter(p => !existingIds.has(p.id));
      console.log(`🔄  Diff mode    — ${allProblems.length - problems.length} IDs already exist, uploading ${problems.length} new.\n`);
    }
  }

  if (problems.length === 0) {
    console.log('✅  Nothing to upload — Firestore is already up to date!');
    process.exit(0);
  }

  // ── PROGRESS RESUME (local file) ──
  const progress     = loadProgress();
  const doneSet      = new Set(progress.uploaded);
  const uploadQueue  = problems.filter(p => !doneSet.has(p.id));
  const skippedLocal = problems.length - uploadQueue.length;

  if (skippedLocal > 0) {
    console.log(`📌  Resuming from local progress file — skipping ${skippedLocal} already committed.\n`);
  }

  const total     = uploadQueue.length;
  let   uploaded  = doneSet.size;
  let   failed    = [];
  const startTime = Date.now();

  console.log(`🚀  Uploading ${total} problems in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < uploadQueue.length; i += BATCH_SIZE) {
    const chunk    = uploadQueue.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uploadQueue.length / BATCH_SIZE);

    // ETA
    const elapsed   = Date.now() - startTime;
    const perItem   = i > 0 ? elapsed / i : BATCH_DELAY;
    const remaining = uploadQueue.length - i;
    const etaStr    = i > 0 ? formatETA(remaining, perItem) : '—';

    process.stdout.write(
      `   Batch ${batchNum.toString().padStart(3)}/${totalBatches}` +
      `  [${(uploaded + chunk.length).toString().padStart(5)}/${allProblems.length}]` +
      `  ETA: ${etaStr.padStart(8)}  `
    );

    if (!DRY_RUN) {
      try {
        const batch = db.batch();
        chunk.forEach(problem => {
          const ref = db.collection(COLLECTION).doc(problem.id);
          batch.set(ref, problem, { merge: true });  // merge: true = non-destructive update
        });

        await batch.commit();

        // Update local progress
        chunk.forEach(p => doneSet.add(p.id));
        saveProgress([...doneSet]);

        uploaded += chunk.length;
        process.stdout.write('✅\n');
      } catch (err) {
        process.stdout.write(`❌  (${err.message})\n`);
        failed.push({ batchNum, ids: chunk.map(p => p.id), error: err.message });
      }
    } else {
      // Dry run: just validate each doc has required fields
      const invalid = chunk.filter(p => !p.id || !p.title || !p.difficulty);
      if (invalid.length > 0) {
        process.stdout.write(`⚠️  ${invalid.length} invalid docs\n`);
        invalid.forEach(p => console.warn(`      Missing fields: ${p.id}`));
      } else {
        process.stdout.write('✅  (dry)\n');
      }
      uploaded += chunk.length;
    }

    await sleep(BATCH_DELAY);
  }

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  const grand   = allProblems.length;

  console.log('\n─────────────────────────────────────────────────────');
  if (DRY_RUN) {
    console.log(`🔎  Dry run complete in ${elapsed} min — no writes made.`);
    console.log(`📋  Validated: ${uploaded} / ${total} documents`);
  } else {
    console.log(`✅  Upload complete in ${elapsed} min`);
    console.log(`📦  Committed : ${[...doneSet].length} / ${grand} total problems`);
    if (failed.length > 0) {
      console.log(`❌  Failed batches: ${failed.length}`);
      failed.forEach(f => console.log(`   Batch ${f.batchNum}: ${f.error}`));
    }
  }
  console.log(`🔗  Collection : firestore → /${COLLECTION}`);
  console.log('─────────────────────────────────────────────────────\n');
}

uploadProblems().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
