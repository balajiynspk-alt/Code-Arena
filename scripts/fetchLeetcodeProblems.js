const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const LEETCODE_API = 'https://leetcode.com/graphql';

const query = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        acRate
        difficulty
        freqBar
        frontendQuestionId: questionFrontendId
        isFavor
        paidOnly: isPaidOnly
        status
        title
        titleSlug
        topicTags {
          name
          slug
        }
        companyTagStats
        hasSolution
        hasVideoSolution
      }
    }
  }
`;

async function fetchAllProblems() {
  let allProblems = [];
  let skip = 0;
  const limit = 100;
  let total = 9999;

  while (skip < total) {
    try {
      const response = await fetch(LEETCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          query,
          variables: {
            categorySlug: '',
            limit,
            skip,
            filters: {}
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message);
      }

      const result = data.data.problemsetQuestionList;
      total = result.total;
      allProblems = [...allProblems, ...result.questions];
      skip += limit;

      console.log(`✅ Fetched ${allProblems.length} / ${total}`);

      // Rate-limit delay (500ms between requests)
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`❌ Error at skip=${skip}:`, err.message);
      console.log('⏳ Retrying in 3 seconds...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return allProblems;
}

async function main() {
  console.log('🚀 Starting LeetCode problem fetch...');

  const problems = await fetchAllProblems();

  // Ensure output directory exists
  const outDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`📁 Created output directory: ${outDir}`);
  }

  const outPath = path.join(outDir, 'leetcode_problems.json');
  fs.writeFileSync(outPath, JSON.stringify(problems, null, 2));

  console.log(`\n✅ Done! Saved ${problems.length} problems to:\n   ${outPath}`);

  // Print a quick summary breakdown
  const easy   = problems.filter(p => p.difficulty === 'Easy').length;
  const medium = problems.filter(p => p.difficulty === 'Medium').length;
  const hard   = problems.filter(p => p.difficulty === 'Hard').length;
  const free   = problems.filter(p => !p.paidOnly).length;
  const paid   = problems.filter(p =>  p.paidOnly).length;

  console.log('\n📊 Problem Breakdown:');
  console.log(`   Easy:   ${easy}`);
  console.log(`   Medium: ${medium}`);
  console.log(`   Hard:   ${hard}`);
  console.log(`   Free:   ${free}`);
  console.log(`   Paid:   ${paid}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
