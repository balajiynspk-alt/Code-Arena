const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const problems = [
  {
    number: 1,
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Arrays"],
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    hints: ["Try using a hash map to store the elements you've seen so far.", "The key in the hash map can be the number, and the value its index."],
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1" },
      { input: "3 2 4\n6", expectedOutput: "1 2" }
    ]
  },
  {
    number: 2,
    title: "Valid Anagram",
    difficulty: "Easy",
    topics: ["Strings"],
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    hints: ["Count the frequency of characters in both strings.", "Alternatively, sort both strings and compare them."],
    testCases: [
      { input: "anagram\nnagaram", expectedOutput: "true" },
      { input: "rat\ncar", expectedOutput: "false" }
    ]
  },
  {
    number: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topics: ["Strings", "Arrays"],
    description: "Given a string `s`, find the length of the longest substring without repeating characters.",
    hints: ["Use a sliding window approach.", "Keep a set of characters in the current window."],
    testCases: [
      { input: "abcabcbb", expectedOutput: "3" },
      { input: "bbbbb", expectedOutput: "1" }
    ]
  },
  {
    number: 4,
    title: "Maximum Subarray",
    difficulty: "Medium",
    topics: ["Arrays", "DP"],
    description: "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    hints: ["Use Kadane's algorithm.", "Keep track of the current subarray sum and the maximum sum seen so far."],
    testCases: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { input: "1", expectedOutput: "1" }
    ]
  },
  {
    number: 5,
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    topics: ["Trees"],
    description: "Given the `root` of a binary tree, return the inorder traversal of its nodes' values.",
    hints: ["You can solve this recursively or iteratively.", "For iterative approach, use a stack."],
    testCases: [
      { input: "1 null 2 3", expectedOutput: "1 3 2" },
      { input: "", expectedOutput: "" }
    ]
  },
  {
    number: 6,
    title: "Climbing Stairs",
    difficulty: "Easy",
    topics: ["DP"],
    description: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    hints: ["This is a classic dynamic programming problem.", "The number of ways to reach step `n` is the sum of ways to reach `n-1` and `n-2`."],
    testCases: [
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" }
    ]
  },
  {
    number: 7,
    title: "Course Schedule",
    difficulty: "Medium",
    topics: ["Graphs"],
    description: "There are a total of `numCourses` courses you have to take. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.",
    hints: ["This problem is equivalent to finding if a cycle exists in a directed graph.", "Use topological sorting or DFS/BFS to detect cycles."],
    testCases: [
      { input: "2\n1 0", expectedOutput: "true" },
      { input: "2\n1 0 0 1", expectedOutput: "false" }
    ]
  },
  {
    number: 8,
    title: "Number of Islands",
    difficulty: "Medium",
    topics: ["Graphs", "Arrays"],
    description: "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    hints: ["Iterate through the grid.", "When you find a '1', increment the island count and use DFS or BFS to mark all adjacent '1's as visited."],
    testCases: [
      { input: "1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", expectedOutput: "1" },
      { input: "1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", expectedOutput: "3" }
    ]
  },
  {
    number: 9,
    title: "Coin Change",
    difficulty: "Medium",
    topics: ["DP", "Arrays"],
    description: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.",
    hints: ["Use dynamic programming.", "Let `dp[i]` be the fewest number of coins needed to make up amount `i`."],
    testCases: [
      { input: "1 2 5\n11", expectedOutput: "3" },
      { input: "2\n3", expectedOutput: "-1" }
    ]
  },
  {
    number: 10,
    title: "Longest Valid Parentheses",
    difficulty: "Hard",
    topics: ["Strings", "DP"],
    description: "Given a string containing just the characters `'('` and `')'`, return the length of the longest valid (well-formed) parentheses substring.",
    hints: ["You can use a stack to keep track of the indices of the parentheses.", "Dynamic programming is also a valid approach."],
    testCases: [
      { input: "(()", expectedOutput: "2" },
      { input: ")()())", expectedOutput: "4" }
    ]
  },
  {
    number: 11,
    title: "Merge k Sorted Lists",
    difficulty: "Hard",
    topics: ["Arrays", "Trees"], // Linked lists often overlap with arrays/trees in generic topics
    description: "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
    hints: ["Use a priority queue (min-heap) to keep track of the smallest current element among all lists.", "Alternatively, use a divide and conquer approach to merge pairs of lists."],
    testCases: [
      { input: "1 4 5\n1 3 4\n2 6", expectedOutput: "1 1 2 3 4 4 5 6" },
      { input: "", expectedOutput: "" }
    ]
  },
  {
    number: 12,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    topics: ["Arrays"],
    description: "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    hints: ["For each bar, the water it can trap depends on the maximum height of bars on its left and right.", "Use two arrays to precompute the max left and max right heights."],
    testCases: [
      { input: "0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6" },
      { input: "4 2 0 3 2 5", expectedOutput: "9" }
    ]
  },
  {
    number: 13,
    title: "Minimum Window Substring",
    difficulty: "Hard",
    topics: ["Strings", "Arrays"],
    description: "Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string `\"\"`.",
    hints: ["Use a sliding window.", "Use two pointers to represent a window and a hash map to track the character frequencies."],
    testCases: [
      { input: "ADOBECODEBANC\nABC", expectedOutput: "BANC" },
      { input: "a\na", expectedOutput: "a" }
    ]
  },
  {
    number: 14,
    title: "Alien Dictionary",
    difficulty: "Hard",
    topics: ["Graphs", "Strings"],
    description: "There is a new alien language that uses the English alphabet. However, the order among the letters is unknown to you.\n\nYou are given a list of strings `words` from the alien language's dictionary, where the strings in `words` are sorted lexicographically by the rules of this new language.\n\nReturn a string of the unique letters in the new alien language sorted in lexicographically increasing order by the new language's rules. If there is no valid ordering, return `\"\"`.",
    hints: ["Build a directed graph where each edge represents a precedence rule between two characters.", "Perform topological sorting on the graph."],
    testCases: [
      { input: "wrt\nwrf\ner\nett\nrftt", expectedOutput: "wertf" },
      { input: "z\nx", expectedOutput: "zx" }
    ]
  },
  {
    number: 15,
    title: "Lowest Common Ancestor of a Binary Tree",
    difficulty: "Medium",
    topics: ["Trees"],
    description: "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.",
    hints: ["The LCA can be the root itself, or it can be in either the left or right subtree.", "Use recursion to search for the two nodes in the subtrees."],
    testCases: [
      { input: "3 5 1 6 2 0 8 null null 7 4\n5\n1", expectedOutput: "3" },
      { input: "3 5 1 6 2 0 8 null null 7 4\n5\n4", expectedOutput: "5" }
    ]
  }
];

async function seedProblems() {
  console.log("Starting to seed problems...");
  let successCount = 0;
  for (const problem of problems) {
    try {
      const docRef = doc(collection(db, "problems"), problem.number.toString());
      await setDoc(docRef, problem);
      console.log(`Successfully added problem: ${problem.title}`);
      successCount++;
    } catch (e) {
      console.error(`Error adding problem: ${problem.title}`, e);
    }
  }
  console.log(`Seeding complete. Added ${successCount} problems.`);
  process.exit(0);
}

seedProblems();
