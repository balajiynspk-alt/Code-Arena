const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const LOCAL_ONLY = args.includes('--local-only');

const SA_PATH = path.resolve(__dirname, '..', 'serviceAccountKey.json');

let db;
if (!LOCAL_ONLY) {
  if (!fs.existsSync(SA_PATH)) {
    console.error('❌  serviceAccountKey.json not found. Use --local-only to skip Firebase.');
    process.exit(1);
  }
  const serviceAccount = require(SA_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
}

// ── EXAM PROBLEMS DATASET ──────────────────────────────────────────────────
const examProblems = [

  // ── PLACEMENT APTITUDE ────────────────────────────────────────────────
  {
    id: 'apt_001', source: 'codearena', type: 'mcq',
    title: 'Speed Distance Time — Train Problem',
    difficulty: 'Easy', topics: ['Aptitude', 'Speed-Time'],
    description: 'A train 150m long passes a pole in 15 seconds. Find the speed of the train in km/h.',
    options: ['36 km/h', '40 km/h', '54 km/h', '60 km/h'],
    correctOption: 0,
    explanation: 'Speed = 150/15 = 10 m/s = 10 × 3.6 = 36 km/h',
    category: 'placement_aptitude', companyTags: ['TCS', 'Infosys', 'Wipro']
  },
  {
    id: 'apt_002', source: 'codearena', type: 'mcq',
    title: 'Profit and Loss — Cost Price',
    difficulty: 'Easy', topics: ['Aptitude', 'Profit-Loss'],
    description: 'A shopkeeper sells an article for ₹1200 at a profit of 20%. Find the cost price.',
    options: ['₹900', '₹1000', '₹1100', '₹800'],
    correctOption: 1,
    explanation: 'CP = SP / (1 + profit%) = 1200 / 1.2 = ₹1000',
    category: 'placement_aptitude', companyTags: ['TCS', 'Cognizant']
  },
  {
    id: 'apt_003', source: 'codearena', type: 'mcq',
    title: 'Number Series — Find Next Term',
    difficulty: 'Easy', topics: ['Reasoning', 'Number Series'],
    description: 'Find the next term: 2, 6, 12, 20, 30, ?',
    options: ['40', '42', '44', '46'],
    correctOption: 1,
    explanation: 'Differences: 4,6,8,10,12 → Next = 30+12 = 42',
    category: 'reasoning', companyTags: ['Infosys', 'Wipro', 'Accenture']
  },
  {
    id: 'apt_004', source: 'codearena', type: 'mcq',
    title: 'Probability — Two Dice',
    difficulty: 'Medium', topics: ['Aptitude', 'Probability'],
    description: 'Two dice are thrown simultaneously. Probability of getting sum = 7?',
    options: ['1/6', '1/4', '5/36', '7/36'],
    correctOption: 0,
    explanation: 'Favorable: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6 out of 36 → 1/6',
    category: 'placement_aptitude', companyTags: ['Amazon', 'Google', 'Microsoft']
  },
  {
    id: 'apt_005', source: 'codearena', type: 'mcq',
    title: 'Time and Work — Pipes',
    difficulty: 'Easy', topics: ['Aptitude', 'Time-Work'],
    description: 'Pipe A fills a tank in 10h, Pipe B empties in 20h. Both open together — time to fill?',
    options: ['10h', '15h', '20h', '25h'],
    correctOption: 2,
    explanation: 'Net rate = 1/10 − 1/20 = 1/20. Time = 20h',
    category: 'placement_aptitude', companyTags: ['TCS', 'Wipro', 'HCL']
  },
  {
    id: 'apt_006', source: 'codearena', type: 'mcq',
    title: 'Simple Interest — Principal',
    difficulty: 'Easy', topics: ['Aptitude', 'Interest'],
    description: 'SI on a sum for 3 years at 8% per annum is ₹1920. Find the principal.',
    options: ['₹6000', '₹7000', '₹8000', '₹9000'],
    correctOption: 2,
    explanation: 'P = (SI × 100) / (R × T) = (1920 × 100) / (8 × 3) = ₹8000',
    category: 'placement_aptitude', companyTags: ['TCS', 'Infosys']
  },
  {
    id: 'apt_007', source: 'codearena', type: 'mcq',
    title: 'Permutation — Arrangements',
    difficulty: 'Medium', topics: ['Aptitude', 'Permutation-Combination'],
    description: 'In how many ways can the letters of TRIANGLE be arranged so that vowels always come together?',
    options: ['4320', '8640', '720', '2160'],
    correctOption: 0,
    explanation: 'Vowels {I,A,E} treated as 1 unit → 6! × 3! = 720 × 6 = 4320',
    category: 'placement_aptitude', companyTags: ['Capgemini', 'Accenture']
  },
  {
    id: 'apt_008', source: 'codearena', type: 'mcq',
    title: 'Ages — Father and Son',
    difficulty: 'Easy', topics: ['Aptitude', 'Ages'],
    description: 'Father is 3× his son\'s age. 10 years later, father is 2× son\'s age. Find son\'s current age.',
    options: ['10', '15', '20', '25'],
    correctOption: 0,
    explanation: 'Let son = x, father = 3x. Then 3x+10 = 2(x+10) → x = 10',
    category: 'placement_aptitude', companyTags: ['TCS', 'Infosys', 'Wipro']
  },
  {
    id: 'apt_009', source: 'codearena', type: 'mcq',
    title: 'Ratio — Mixture Alligation',
    difficulty: 'Medium', topics: ['Aptitude', 'Ratio-Proportion'],
    description: 'In what ratio should water be mixed with milk costing ₹60/L to get a mixture worth ₹40/L? (Water cost = 0)',
    options: ['1:2', '1:3', '2:1', '2:3'],
    correctOption: 0,
    explanation: 'Alligation: (60−40) : (40−0) = 20:40 = 1:2',
    category: 'placement_aptitude', companyTags: ['TCS', 'Cognizant', 'HCL']
  },
  {
    id: 'apt_010', source: 'codearena', type: 'mcq',
    title: 'Boats and Streams',
    difficulty: 'Medium', topics: ['Aptitude', 'Speed-Time'],
    description: 'A boat goes 30 km upstream in 6h and 30 km downstream in 3h. Speed of stream?',
    options: ['2.5 km/h', '3 km/h', '4 km/h', '5 km/h'],
    correctOption: 0,
    explanation: 'Upstream speed=5, Downstream=10. Stream = (10−5)/2 = 2.5 km/h',
    category: 'placement_aptitude', companyTags: ['Wipro', 'Infosys']
  },

  // ── VERBAL REASONING ──────────────────────────────────────────────────
  {
    id: 'vrb_001', source: 'codearena', type: 'mcq',
    title: 'Synonyms — Ameliorate',
    difficulty: 'Easy', topics: ['Verbal', 'Synonyms'],
    description: 'Choose the word closest in meaning to AMELIORATE.',
    options: ['Worsen', 'Improve', 'Maintain', 'Complicate'],
    correctOption: 1,
    explanation: 'Ameliorate means to make something bad better → Improve',
    category: 'verbal', companyTags: ['TCS', 'Infosys', 'Wipro', 'Accenture']
  },
  {
    id: 'vrb_002', source: 'codearena', type: 'mcq',
    title: 'Antonyms — Loquacious',
    difficulty: 'Easy', topics: ['Verbal', 'Antonyms'],
    description: 'Choose the word opposite in meaning to LOQUACIOUS.',
    options: ['Talkative', 'Verbose', 'Taciturn', 'Garrulous'],
    correctOption: 2,
    explanation: 'Loquacious = very talkative. Antonym = Taciturn (habitually silent)',
    category: 'verbal', companyTags: ['Capgemini', 'Cognizant']
  },
  {
    id: 'vrb_003', source: 'codearena', type: 'mcq',
    title: 'Reading Comprehension — Inference',
    difficulty: 'Medium', topics: ['Verbal', 'Comprehension'],
    description: '"All that glitters is not gold." What does this proverb imply?',
    options: [
      'Gold is not always shiny',
      'Appearances can be deceptive',
      'Glitter is made of gold',
      'Gold has no value'
    ],
    correctOption: 1,
    explanation: 'The proverb warns that outward appearance may not reflect true worth — appearances deceive.',
    category: 'verbal', companyTags: ['TCS', 'Infosys']
  },
  {
    id: 'vrb_004', source: 'codearena', type: 'mcq',
    title: 'Sentence Correction — Subject-Verb Agreement',
    difficulty: 'Easy', topics: ['Verbal', 'Grammar'],
    description: 'Identify the correct sentence.',
    options: [
      'The team are playing well.',
      'The team is playing well.',
      'The team were playing well.',
      'The team have playing well.'
    ],
    correctOption: 1,
    explanation: '"Team" is a collective noun treated as singular in standard usage → "is".',
    category: 'verbal', companyTags: ['Wipro', 'Accenture', 'Capgemini']
  },

  // ── LOGICAL REASONING ─────────────────────────────────────────────────
  {
    id: 'lr_001', source: 'codearena', type: 'mcq',
    title: 'Blood Relations — Uncle',
    difficulty: 'Easy', topics: ['Reasoning', 'Blood-Relations'],
    description: 'A is B\'s sister. C is B\'s mother. D is C\'s father. E is D\'s mother. How is A related to D?',
    options: ['Granddaughter', 'Daughter', 'Niece', 'Sister'],
    correctOption: 0,
    explanation: 'A → B (siblings), B → C (child), C → D (child). So A is D\'s granddaughter.',
    category: 'reasoning', companyTags: ['TCS', 'Infosys', 'Wipro']
  },
  {
    id: 'lr_002', source: 'codearena', type: 'mcq',
    title: 'Direction Sense — Final Position',
    difficulty: 'Easy', topics: ['Reasoning', 'Direction-Sense'],
    description: 'A walks 10m North, turns right walks 5m, turns right walks 10m. How far and in which direction from start?',
    options: ['5m West', '5m East', '10m South', '5m North'],
    correctOption: 1,
    explanation: 'N→E→S net displacement: 5m East from starting point.',
    category: 'reasoning', companyTags: ['Cognizant', 'Accenture']
  },
  {
    id: 'lr_003', source: 'codearena', type: 'mcq',
    title: 'Coding-Decoding — Letter Shift',
    difficulty: 'Easy', topics: ['Reasoning', 'Coding-Decoding'],
    description: 'In a code APPLE is written as BQQMF. How is MANGO written?',
    options: ['NBOHO', 'NBOHP', 'MBOHO', 'NBOHO'],
    correctOption: 1,
    explanation: 'Each letter is shifted +1: M→N, A→B, N→O, G→H, O→P = NBOHP',
    category: 'reasoning', companyTags: ['TCS', 'Wipro', 'HCL']
  },
  {
    id: 'lr_004', source: 'codearena', type: 'mcq',
    title: 'Syllogism — Conclusion',
    difficulty: 'Medium', topics: ['Reasoning', 'Syllogism'],
    description: 'All dogs are animals. All animals are living things. Conclusion: All dogs are living things.',
    options: ['True', 'False', 'Uncertain', 'Neither true nor false'],
    correctOption: 0,
    explanation: 'By transitive property: dogs → animals → living things. Conclusion is definitely True.',
    category: 'reasoning', companyTags: ['Infosys', 'Wipro', 'Capgemini']
  },

  // ── GATE CS ───────────────────────────────────────────────────────────
  {
    id: 'gate_001', source: 'codearena', type: 'mcq',
    title: 'OS — Page Replacement FIFO',
    difficulty: 'Medium', topics: ['Operating Systems', 'GATE'],
    description: 'FIFO page replacement, 3 frames. Reference string: 1,2,3,4,1,2,5,1,2,3,4,5. Page faults?',
    options: ['7', '8', '9', '10'],
    correctOption: 2,
    explanation: 'Trace FIFO with 3 frames step by step yields 9 page faults.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_002', source: 'codearena', type: 'mcq',
    title: 'Data Structures — AVL Rotation',
    difficulty: 'Hard', topics: ['Data Structures', 'Trees', 'GATE'],
    description: 'Insert 10, 20, 30 into empty AVL tree. What rotation is performed?',
    options: ['Left-Left', 'Right-Right', 'Left-Right', 'Right-Left'],
    correctOption: 1,
    explanation: 'RR imbalance at root → Single Left rotation.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_003', source: 'codearena', type: 'mcq',
    title: 'DBMS — Normal Forms',
    difficulty: 'Medium', topics: ['DBMS', 'GATE'],
    description: 'A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on:',
    options: ['Any key', 'Every candidate key', 'The primary key only', 'A superkey'],
    correctOption: 1,
    explanation: '2NF: 1NF + no partial dependency of non-prime attributes on any candidate key.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_004', source: 'codearena', type: 'mcq',
    title: 'Networks — IP Subnetting',
    difficulty: 'Medium', topics: ['Computer Networks', 'GATE'],
    description: 'How many usable host addresses does a /26 subnet provide?',
    options: ['30', '62', '64', '126'],
    correctOption: 1,
    explanation: '/26 → 6 host bits → 2^6 − 2 = 62 usable hosts.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_005', source: 'codearena', type: 'mcq',
    title: 'Algorithms — Dijkstra Complexity',
    difficulty: 'Medium', topics: ['Algorithms', 'Graphs', 'GATE'],
    description: 'Time complexity of Dijkstra\'s algorithm using a Min-Heap with V vertices and E edges?',
    options: ['O(V²)', 'O(E log V)', 'O(V log E)', 'O(E + V)'],
    correctOption: 1,
    explanation: 'With a binary min-heap: each extract-min is O(log V), done V times; decrease-key O(log V) done E times → O(E log V).',
    category: 'gate_cs', companyTags: ['GATE', 'Google', 'Amazon']
  },
  {
    id: 'gate_006', source: 'codearena', type: 'mcq',
    title: 'TOC — Context-Free Language',
    difficulty: 'Hard', topics: ['Theory of Computation', 'GATE'],
    description: 'Which language is NOT context-free?',
    options: ['{ aⁿbⁿ | n≥0 }', '{ aⁿbⁿcⁿ | n≥0 }', '{ wwᴿ | w∈{a,b}* }', '{ aⁿb²ⁿ | n≥0 }'],
    correctOption: 1,
    explanation: '{ aⁿbⁿcⁿ } requires counting three equal groups — not possible with a PDA → not CFL.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_007', source: 'codearena', type: 'mcq',
    title: 'COA — Cache Mapping',
    difficulty: 'Hard', topics: ['Computer Organization', 'GATE'],
    description: 'A direct-mapped cache has 256 lines of 16 bytes each. Main memory has 64KB. Number of tag bits?',
    options: ['2', '4', '6', '8'],
    correctOption: 2,
    explanation: 'Offset bits=4 (16B), Index bits=8 (256 lines), Address bits=16 (64KB). Tag = 16−8−4 = 4 bits. Wait: 64KB=2^16 so tag=16-8-4=4. Answer is 4.',
    category: 'gate_cs', companyTags: ['GATE']
  },
  {
    id: 'gate_008', source: 'codearena', type: 'mcq',
    title: 'OS — Deadlock Conditions',
    difficulty: 'Easy', topics: ['Operating Systems', 'GATE'],
    description: 'Which of the following is NOT a necessary condition for deadlock?',
    options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'],
    correctOption: 2,
    explanation: 'The four Coffman conditions are Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. Preemption (allowing it) breaks deadlock — "No Preemption" is the condition.',
    category: 'gate_cs', companyTags: ['GATE', 'Microsoft', 'Amazon']
  },

  // ── CAT / MBA QUANT ───────────────────────────────────────────────────
  {
    id: 'cat_001', source: 'codearena', type: 'mcq',
    title: 'CAT Quant — Geometry: Circle Chord',
    difficulty: 'Medium', topics: ['CAT', 'Geometry'],
    description: 'A chord of length 16cm is at a distance of 6cm from the centre. Find the radius.',
    options: ['8 cm', '10 cm', '12 cm', '14 cm'],
    correctOption: 1,
    explanation: 'Half-chord = 8. r² = 8² + 6² = 64+36 = 100 → r = 10 cm',
    category: 'cat_quant', companyTags: ['CAT']
  },
  {
    id: 'cat_002', source: 'codearena', type: 'mcq',
    title: 'CAT Quant — Progressions',
    difficulty: 'Medium', topics: ['CAT', 'Progressions'],
    description: 'Sum of first n natural numbers is 325. Find n.',
    options: ['24', '25', '26', '27'],
    correctOption: 1,
    explanation: 'n(n+1)/2 = 325 → n(n+1) = 650 → n=25 (25×26=650)',
    category: 'cat_quant', companyTags: ['CAT']
  },
  {
    id: 'cat_003', source: 'codearena', type: 'mcq',
    title: 'CAT LRDI — Arrangement',
    difficulty: 'Hard', topics: ['CAT', 'Logical-Reasoning'],
    description: 'P, Q, R, S, T sit in a row. P is next to Q. R is not adjacent to S. T is at an end. If Q is at position 2, where is T?',
    options: ['Position 1', 'Position 3', 'Position 4', 'Position 5'],
    correctOption: 3,
    explanation: 'T must be at an end (1 or 5). Q=2 means P=1 or 3. If P=1, T cannot be 1 → T=5.',
    category: 'cat_lrdi', companyTags: ['CAT']
  },
  {
    id: 'cat_004', source: 'codearena', type: 'mcq',
    title: 'CAT Verbal — Para-Jumbles',
    difficulty: 'Hard', topics: ['CAT', 'Verbal'],
    description: 'Arrange: (A) It also pollutes rivers. (B) Industries cause air pollution. (C) This affects human health seriously. (D) Moreover, noise disturbs residents.',
    options: ['BADC', 'BDAC', 'BACD', 'BCDA'],
    correctOption: 2,
    explanation: 'B (topic) → A (adds river pollution) → C (consequence) → D (additional point): BACD',
    category: 'cat_verbal', companyTags: ['CAT']
  }
];

// ── UPLOAD ────────────────────────────────────────────────────────────────
async function uploadExamProblems() {
  console.log(`\n📚  Exam problems: ${examProblems.length} total`);

  const byCategory = {};
  examProblems.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });
  Object.entries(byCategory).forEach(([cat, n]) =>
    console.log(`   ${cat.padEnd(24)} ${n} problems`)
  );

  if (DRY_RUN) {
    console.log('\n🔎  DRY-RUN — no writes.\n');
    examProblems.forEach(p => console.log(`  [${p.id}] ${p.title}`));
    return;
  }

  if (LOCAL_ONLY) {
    const outPath = path.resolve(__dirname, '..', 'data', 'exam_problems.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(examProblems, null, 2));
    console.log(`✅  Written locally: ${outPath}`);
    return;
  }

  // Batch upload (max 500 per batch)
  const BATCH_SIZE = 400;
  let committed = 0;
  for (let i = 0; i < examProblems.length; i += BATCH_SIZE) {
    const chunk = examProblems.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(p => {
      const ref = db.collection('problems').doc(p.id);
      batch.set(ref, { ...p, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    committed += chunk.length;
    console.log(`💾  Committed ${committed}/${examProblems.length}`);
  }

  console.log(`\n✅  Done! ${committed} exam problems uploaded to /problems`);
}

uploadExamProblems().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
