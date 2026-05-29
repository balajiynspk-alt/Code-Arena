/**
 * scripts/addCompanyTags.js
 *
 * Enriches Firestore /problems docs with real company tag data.
 * Matches by `slug` field, batches Firestore updates (max 500/batch),
 * and optionally patches the local codearena_problems.json too.
 *
 * Usage:
 *   node scripts/addCompanyTags.js              # update Firestore
 *   node scripts/addCompanyTags.js --dry-run    # print matches, no writes
 *   node scripts/addCompanyTags.js --local      # also patch local JSON file
 *   node scripts/addCompanyTags.js --local-only # only patch local JSON (no Firestore)
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── CLI FLAGS ──────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const LOCAL       = args.includes('--local') || args.includes('--local-only');
const LOCAL_ONLY  = args.includes('--local-only');

// ── PATHS ──────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const SA_PATH      = path.join(ROOT, 'serviceAccountKey.json');
const LOCAL_FILE   = path.join(ROOT, 'data', 'codearena_problems.json');

// ── COMPANY TAG MAP ────────────────────────────────────────────────────────
// 200+ problems across FAANG, unicorns, and top-tier tech companies.
const COMPANY_TAG_MAP = {
  // ── Arrays & Two Pointers ──────────────────────────────────────────────
  'two-sum':                                  ['Amazon', 'Google', 'Facebook', 'Microsoft', 'Apple', 'Adobe'],
  '3sum':                                     ['Amazon', 'Adobe', 'Facebook', 'Bloomberg'],
  '4sum':                                     ['Amazon', 'Adobe'],
  'container-with-most-water':                ['Amazon', 'Bloomberg', 'Facebook'],
  'trapping-rain-water':                      ['Amazon', 'Google', 'Bloomberg', 'Goldman Sachs'],
  'product-of-array-except-self':             ['Amazon', 'Facebook', 'Microsoft', 'Lyft'],
  'maximum-subarray':                         ['Amazon', 'LinkedIn', 'Google', 'Apple'],
  'move-zeroes':                              ['Facebook', 'Bloomberg', 'Adobe'],
  'find-duplicate-number':                    ['Bloomberg', 'Amazon'],
  'spiral-matrix':                            ['Amazon', 'Microsoft', 'Apple', 'Bloomberg'],
  'set-matrix-zeroes':                        ['Amazon', 'Microsoft', 'Apple'],
  'rotate-image':                             ['Amazon', 'Microsoft', 'Apple'],
  'search-a-2d-matrix':                       ['Amazon', 'Microsoft'],
  'merge-intervals':                          ['Amazon', 'Google', 'Facebook', 'Bloomberg', 'Microsoft'],
  'insert-interval':                          ['Google', 'LinkedIn', 'Facebook'],
  'jump-game':                                ['Amazon', 'Microsoft'],
  'jump-game-ii':                             ['Amazon', 'Google'],
  'best-time-to-buy-and-sell-stock':          ['Amazon', 'Bloomberg', 'Facebook', 'Goldman Sachs'],
  'best-time-to-buy-and-sell-stock-ii':       ['Bloomberg', 'Amazon'],
  'contains-duplicate':                       ['Palantir', 'Yahoo'],
  'subarray-sum-equals-k':                    ['Facebook', 'Google', 'Amazon'],
  'longest-consecutive-sequence':             ['Google', 'Facebook', 'Amazon'],
  'sliding-window-maximum':                   ['Amazon', 'Google'],
  'minimum-size-subarray-sum':                ['Facebook', 'Amazon'],

  // ── Strings ───────────────────────────────────────────────────────────
  'longest-substring-without-repeating-characters': ['Amazon', 'Bloomberg', 'Uber', 'Facebook'],
  'longest-palindromic-substring':            ['Amazon', 'Microsoft', 'Bloomberg'],
  'valid-anagram':                            ['Amazon', 'Bloomberg'],
  'group-anagrams':                           ['Amazon', 'Facebook', 'Bloomberg', 'Uber'],
  'valid-parentheses':                        ['Amazon', 'Bloomberg', 'Facebook', 'Google', 'Microsoft'],
  'generate-parentheses':                     ['Google', 'Bloomberg', 'Facebook'],
  'decode-ways':                              ['Amazon', 'Facebook', 'Microsoft'],
  'word-break':                               ['Amazon', 'Bloomberg', 'Google', 'Square'],
  'word-search':                              ['Amazon', 'Microsoft', 'Snapchat'],
  'minimum-window-substring':                 ['LinkedIn', 'Facebook', 'Uber', 'Snapchat'],
  'palindrome-partitioning':                  ['Bloomberg', 'Amazon'],
  'longest-common-prefix':                    ['Amazon'],
  'first-unique-character-in-a-string':       ['Amazon', 'Bloomberg', 'Microsoft'],
  'implement-strstr':                         ['Apple', 'Microsoft'],
  'string-to-integer-atoi':                   ['Amazon', 'Bloomberg', 'Microsoft'],
  'letter-combinations-of-a-phone-number':    ['Amazon', 'Google', 'Uber'],
  'count-and-say':                            ['Amazon', 'Facebook', 'Microsoft'],
  'edit-distance':                            ['Bloomberg', 'Twitter', 'Uber'],
  'is-subsequence':                           ['Google', 'Facebook'],
  'roman-to-integer':                         ['Amazon', 'Bloomberg', 'Microsoft'],
  'integer-to-roman':                         ['Amazon', 'Bloomberg'],

  // ── Linked Lists ──────────────────────────────────────────────────────
  'add-two-numbers':                          ['Amazon', 'Microsoft', 'Adobe', 'Bloomberg'],
  'reverse-linked-list':                      ['Amazon', 'Apple', 'Adobe', 'Google', 'Bloomberg'],
  'merge-two-sorted-lists':                   ['Amazon', 'Microsoft', 'Apple', 'Bloomberg'],
  'merge-k-sorted-lists':                     ['Amazon', 'Google', 'Facebook', 'Uber'],
  'linked-list-cycle':                        ['Amazon', 'Bloomberg', 'Microsoft'],
  'linked-list-cycle-ii':                     ['Amazon', 'Bloomberg'],
  'remove-nth-node-from-end-of-list':         ['Amazon', 'Microsoft'],
  'reorder-list':                             ['Amazon', 'Bloomberg'],
  'lru-cache':                                ['Amazon', 'Google', 'Facebook', 'Microsoft', 'Bloomberg'],
  'copy-list-with-random-pointer':            ['Amazon', 'Microsoft', 'Bloomberg'],
  'reverse-linked-list-ii':                   ['Facebook', 'Amazon'],
  'sort-list':                                ['Amazon', 'Google'],
  'intersection-of-two-linked-lists':         ['Amazon', 'Bloomberg'],
  'palindrome-linked-list':                   ['Amazon', 'Bloomberg', 'Facebook'],

  // ── Trees ─────────────────────────────────────────────────────────────
  'binary-tree-inorder-traversal':            ['Microsoft', 'Amazon'],
  'symmetric-tree':                           ['Microsoft', 'Bloomberg'],
  'maximum-depth-of-binary-tree':             ['LinkedIn', 'Amazon', 'Apple', 'Bloomberg'],
  'binary-tree-level-order-traversal':        ['Amazon', 'Bloomberg', 'Facebook', 'Google'],
  'convert-sorted-array-to-binary-search-tree': ['Airbnb', 'Amazon'],
  'path-sum':                                 ['Microsoft', 'Amazon'],
  'path-sum-ii':                              ['Amazon', 'Bloomberg'],
  'lowest-common-ancestor-of-a-binary-tree':  ['Amazon', 'Facebook', 'LinkedIn', 'Microsoft'],
  'lowest-common-ancestor-of-a-binary-search-tree': ['Amazon', 'Bloomberg'],
  'validate-binary-search-tree':              ['Amazon', 'Bloomberg', 'Facebook', 'Microsoft'],
  'kth-smallest-element-in-a-bst':            ['Google', 'Bloomberg'],
  'serialize-and-deserialize-binary-tree':    ['Google', 'Amazon', 'Facebook', 'Microsoft'],
  'binary-tree-maximum-path-sum':             ['Amazon', 'Microsoft'],
  'diameter-of-binary-tree':                  ['Google', 'Facebook'],
  'invert-binary-tree':                       ['Amazon', 'Google', 'Apple'],
  'balanced-binary-tree':                     ['Bloomberg', 'Amazon'],
  'same-tree':                                ['Bloomberg', 'Amazon'],
  'binary-tree-zigzag-level-order-traversal': ['Bloomberg', 'LinkedIn', 'Amazon'],
  'count-complete-tree-nodes':                ['Google'],
  'house-robber-iii':                         ['Google', 'Amazon'],
  'construct-binary-tree-from-preorder-and-inorder-traversal': ['Amazon', 'Microsoft'],
  'flatten-binary-tree-to-linked-list':       ['Microsoft', 'Bloomberg'],
  'sum-root-to-leaf-numbers':                 ['Bloomberg'],
  'right-side-view-of-binary-tree':           ['Amazon', 'Facebook', 'Bloomberg'],

  // ── Graphs ────────────────────────────────────────────────────────────
  'number-of-islands':                        ['Amazon', 'Google', 'Facebook', 'Bloomberg'],
  'course-schedule':                          ['Amazon', 'Apple', 'Uber', 'Google'],
  'course-schedule-ii':                       ['Amazon', 'Apple', 'Facebook'],
  'clone-graph':                              ['Amazon', 'Facebook', 'Google'],
  'pacific-atlantic-water-flow':              ['Google', 'Amazon'],
  'graph-valid-tree':                         ['LinkedIn', 'Google'],
  'alien-dictionary':                         ['Google', 'Airbnb', 'Facebook', 'Uber'],
  'word-ladder':                              ['Amazon', 'LinkedIn', 'Bloomberg'],
  'word-ladder-ii':                           ['Amazon', 'Yelp'],
  'surrounded-regions':                       ['Spotify'],
  'reconstruct-itinerary':                    ['Google'],
  'network-delay-time':                       ['Amazon'],
  'redundant-connection':                     ['Bloomberg'],
  'number-of-connected-components-in-an-undirected-graph': ['LinkedIn', 'Google'],
  'walls-and-gates':                          ['Facebook', 'Snapchat'],
  'rotten-oranges':                           ['Amazon', 'DoorDash'],
  'accounts-merge':                           ['Google', 'Facebook'],

  // ── Stack & Queue ──────────────────────────────────────────────────────
  'min-stack':                                ['Amazon', 'Bloomberg', 'Google', 'Uber'],
  'daily-temperatures':                       ['Amazon', 'Google'],
  'largest-rectangle-in-histogram':           ['Amazon', 'Google'],
  'evaluate-reverse-polish-notation':         ['Amazon', 'LinkedIn'],
  'simplify-path':                            ['Facebook', 'Microsoft'],
  'decode-string':                            ['Google', 'Amazon', 'Bloomberg'],
  'asteroid-collision':                       ['Amazon'],
  'basic-calculator':                         ['Google'],
  'basic-calculator-ii':                      ['Amazon', 'Bloomberg'],

  // ── Heap / Priority Queue ──────────────────────────────────────────────
  'top-k-frequent-elements':                  ['Amazon', 'Facebook', 'Yelp', 'Bloomberg'],
  'k-closest-points-to-origin':              ['Facebook', 'Amazon', 'Uber'],
  'find-k-pairs-with-smallest-sums':          ['Google'],
  'kth-largest-element-in-an-array':          ['Facebook', 'Amazon', 'Bloomberg'],
  'meeting-rooms-ii':                         ['Google', 'Amazon', 'Facebook', 'Snapchat'],
  'task-scheduler':                           ['Facebook', 'Amazon'],
  'reorganize-string':                        ['Google', 'LinkedIn'],
  'find-median-from-data-stream':             ['Amazon', 'Google', 'Bloomberg'],
  'sliding-window-median':                    ['Google'],

  // ── Binary Search ──────────────────────────────────────────────────────
  'binary-search':                            ['Bloomberg', 'Amazon'],
  'search-in-rotated-sorted-array':           ['Amazon', 'Facebook', 'Bloomberg', 'Microsoft'],
  'search-in-rotated-sorted-array-ii':        ['LinkedIn'],
  'find-minimum-in-rotated-sorted-array':     ['Microsoft', 'Amazon'],
  'median-of-two-sorted-arrays':              ['Google', 'Amazon', 'Apple', 'Adobe'],
  'first-bad-version':                        ['Facebook'],
  'search-a-2d-matrix-ii':                    ['Amazon', 'Google'],
  'kth-smallest-element-in-a-sorted-matrix':  ['Twitter', 'Google'],
  'capacity-to-ship-packages-within-d-days':  ['Amazon'],
  'find-peak-element':                        ['Google', 'Microsoft'],

  // ── Dynamic Programming ────────────────────────────────────────────────
  'climbing-stairs':                          ['Amazon', 'Adobe', 'Apple'],
  'house-robber':                             ['Amazon', 'Airbnb', 'LinkedIn'],
  'house-robber-ii':                          ['Microsoft'],
  'coin-change':                              ['Amazon', 'Goldman Sachs', 'Microsoft'],
  'coin-change-ii':                           ['Amazon'],
  'unique-paths':                             ['Amazon', 'Goldman Sachs', 'Bloomberg'],
  'unique-paths-ii':                          ['Amazon'],
  'longest-increasing-subsequence':           ['Microsoft', 'Amazon', 'Alibaba'],
  'word-break-ii':                            ['Google', 'Uber'],
  'combination-sum-iv':                       ['Amazon', 'Bloomberg'],
  'target-sum':                               ['Amazon', 'Facebook'],
  'partition-equal-subset-sum':               ['Amazon', 'Bloomberg'],
  'burst-balloons':                           ['Google'],
  'regular-expression-matching':              ['Google', 'Facebook', 'Airbnb'],
  'wildcard-matching':                        ['Facebook', 'Google'],
  'interleaving-string':                      ['Amazon'],
  'distinct-subsequences':                    ['Bloomberg', 'Twitter'],
  'maximal-square':                           ['Facebook', 'Airbnb'],
  'maximal-rectangle':                        ['Amazon'],
  'minimum-path-sum':                         ['Amazon', 'Google'],
  'triangle':                                 ['Amazon'],
  'dungeon-game':                             ['Google'],
  'palindromic-substrings':                   ['Facebook', 'Bloomberg'],
  'longest-palindromic-subsequence':          ['Amazon'],
  'arithmetic-slices':                        ['Microsoft'],
  'decode-ways-ii':                           ['Facebook'],

  // ── Backtracking ──────────────────────────────────────────────────────
  'combination-sum':                          ['Amazon', 'Snapchat'],
  'combination-sum-ii':                       ['Snapchat'],
  'permutations':                             ['LinkedIn', 'Microsoft', 'Facebook'],
  'permutations-ii':                          ['Microsoft'],
  'subsets':                                  ['Facebook', 'Bloomberg', 'Amazon'],
  'subsets-ii':                               ['Bloomberg', 'Facebook'],
  'n-queens':                                 ['Airbnb', 'Amazon'],
  'sudoku-solver':                            ['Microsoft', 'Uber'],
  'palindrome-partitioning-ii':               ['Bloomberg'],
  'letter-combinations-of-a-phone-number':    ['Amazon', 'Google', 'Uber'],
  'restore-ip-addresses':                     ['Amazon'],

  // ── Sorting & Searching ────────────────────────────────────────────────
  'sort-colors':                              ['Facebook', 'Microsoft'],
  'find-the-duplicate-number':               ['Bloomberg'],
  'missing-number':                           ['Bloomberg', 'Microsoft'],
  'first-missing-positive':                   ['Amazon'],
  'h-index':                                  ['Facebook'],

  // ── Math & Bit Manipulation ────────────────────────────────────────────
  'single-number':                            ['Amazon', 'Apple'],
  'single-number-ii':                         ['Airbnb'],
  'power-of-two':                             ['Google', 'Apple'],
  'reverse-bits':                             ['Apple'],
  'number-of-1-bits':                         ['Apple', 'Microsoft'],
  'counting-bits':                            ['Facebook'],
  'missing-number':                           ['Bloomberg', 'Microsoft', 'Adobe'],
  'palindrome-number':                        ['Bloomberg'],
  'excel-sheet-column-number':               ['Microsoft'],

  // ── Design ────────────────────────────────────────────────────────────
  'design-hashset':                           ['Amazon'],
  'design-hashmap':                           ['Amazon', 'Bloomberg'],
  'implement-trie-prefix-tree':               ['Google', 'Uber', 'Microsoft', 'Bloomberg'],
  'add-and-search-word-data-structure-design': ['Facebook'],
  'design-search-autocomplete-system':        ['Google'],
  'lfu-cache':                                ['Amazon'],
  'time-based-key-value-store':              ['Google', 'Uber'],
  'design-twitter':                           ['Amazon'],
  'find-median-from-data-stream':            ['Amazon', 'Google', 'Bloomberg'],
};

// ── FIREBASE INIT (skip if local-only) ────────────────────────────────────
let db;
if (!LOCAL_ONLY) {
  if (!fs.existsSync(SA_PATH)) {
    console.error(`❌  serviceAccountKey.json not found at ${SA_PATH}`);
    console.error('   Run with --local-only to patch only the JSON file.');
    process.exit(1);
  }
  const serviceAccount = require(SA_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
}

// ── HELPERS ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── PATCH LOCAL JSON ───────────────────────────────────────────────────────
function patchLocalFile() {
  if (!fs.existsSync(LOCAL_FILE)) {
    console.warn(`⚠️  ${LOCAL_FILE} not found — skipping local patch.`);
    return 0;
  }
  const problems = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
  const slugIndex = {};
  problems.forEach((p, i) => { if (p.slug) slugIndex[p.slug] = i; });

  let patched = 0;
  for (const [slug, companies] of Object.entries(COMPANY_TAG_MAP)) {
    if (slugIndex[slug] !== undefined) {
      problems[slugIndex[slug]].companyTags = companies;
      patched++;
    }
  }

  fs.writeFileSync(LOCAL_FILE, JSON.stringify(problems, null, 2));
  return patched;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function addCompanyTags() {
  const entries = Object.entries(COMPANY_TAG_MAP);
  console.log(`\n🏷️  Company tag map: ${entries.length} slugs defined`);

  // ── PATCH LOCAL FILE ──
  if (LOCAL || LOCAL_ONLY) {
    console.log('\n📄  Patching local codearena_problems.json…');
    const count = patchLocalFile();
    console.log(`   ✅  ${count} local problems patched.`);
    if (LOCAL_ONLY) process.exit(0);
  }

  if (DRY_RUN) {
    console.log('\n🔎  DRY-RUN — printing matches, no Firestore writes.\n');
  } else {
    console.log('\n🚀  Updating Firestore…\n');
  }

  // ── COLLECT UPDATES VIA SLUG QUERIES ──
  // Batch all slug queries concurrently (40 at a time to avoid rate limits)
  const QUERY_CONCURRENCY = 40;
  const updates = [];  // { ref, slug, companies }
  let notFound  = [];

  for (let i = 0; i < entries.length; i += QUERY_CONCURRENCY) {
    const chunk = entries.slice(i, i + QUERY_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async ([slug, companies]) => {
        const snap = await db.collection('problems')
          .where('slug', '==', slug).limit(1).get();
        return { slug, companies, doc: snap.empty ? null : snap.docs[0] };
      })
    );
    results.forEach(r => {
      if (r.doc) updates.push({ ref: r.doc.ref, slug: r.slug, companies: r.companies });
      else        notFound.push(r.slug);
    });
    process.stdout.write(`\r   Queried ${Math.min(i + QUERY_CONCURRENCY, entries.length)}/${entries.length} slugs…`);
    await sleep(200);
  }

  console.log(`\n\n   ✅  ${updates.length} matched in Firestore`);
  if (notFound.length) {
    console.log(`   ⚠️  ${notFound.length} not found: ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? '…' : ''}`);
  }

  if (DRY_RUN) {
    console.log('\n──────────── DRY-RUN MATCHES ─────────────');
    updates.forEach(u => console.log(`  ${u.slug.padEnd(50)} → ${u.companies.join(', ')}`));
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  }

  // ── BATCH COMMIT UPDATES (500 max per batch) ───────────────────────────
  const BATCH_SIZE = 400;
  let committed = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(u => batch.update(u.ref, { companyTags: u.companies }));
    await batch.commit();
    committed += chunk.length;
    console.log(`   💾  Committed ${committed}/${updates.length}`);
    await sleep(500);
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────
  const allCompanies = [...new Set(Object.values(COMPANY_TAG_MAP).flat())].sort();
  console.log('\n─────────────────────────────────────────────────');
  console.log(`✅  Done!`);
  console.log(`📦  Updated in Firestore : ${committed}`);
  console.log(`❌  Not found            : ${notFound.length}`);
  console.log(`🏢  Unique companies     : ${allCompanies.length}`);
  console.log(`   ${allCompanies.join(' · ')}`);
  console.log('─────────────────────────────────────────────────\n');
}

addCompanyTags().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
