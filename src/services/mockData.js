// High-fidelity local mock data for CodeArena offline/fallback mode
export const MOCK_PROBLEMS = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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
    id: "5",
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
    id: "6",
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
    id: "7",
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
    id: "8",
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
    id: "9",
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
    id: "10",
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
  }
];

export const MOCK_COURSES = [
  {
    id: "dsa-fundamentals",
    title: "DSA Fundamentals",
    track: "DSA",
    description: "Master the basics of Data Structures and Algorithms with this comprehensive course.",
    thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=320&h=160&auto=format&fit=crop",
    difficulty: "Beginner",
    chapters: [
      {
        title: "Chapter 1: Arrays & Strings",
        lessons: [
          {
            id: "l1",
            title: "Introduction to Arrays",
            type: "video",
            youtubeId: "PkZNo7MFNFg"
          },
          {
            id: "l2",
            title: "Memory Allocation",
            type: "article",
            content: "Arrays are contiguous blocks of memory. In many languages like C++, the size of an array is fixed at compile time. \n\n```cpp\nint arr[5] = {1, 2, 3, 4, 5};\n```\n\nAccessing elements takes O(1) time because we can calculate the exact memory address."
          },
          {
            id: "l3",
            title: "Array Quiz",
            type: "quiz",
            content: {
              question: "What is the time complexity of accessing an element in an array by index?",
              options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
              correctOption: 0
            }
          }
        ]
      },
      {
        title: "Chapter 2: Linked Lists",
        lessons: [
          {
            id: "l4",
            title: "Singly Linked Lists",
            type: "video",
            youtubeId: "WwfhLC16bis"
          },
          {
            id: "l5",
            title: "Reversing a Linked List",
            type: "article",
            content: "To reverse a linked list, we maintain three pointers: `prev`, `curr`, and `next`. We iterate through the list, reversing the pointers one by one."
          }
        ]
      }
    ]
  },
  {
    id: "aptitude-mastery",
    title: "Aptitude Mastery",
    track: "Aptitude",
    description: "Crack the quantitative and logical reasoning rounds of top tech companies.",
    thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=320&h=160&auto=format&fit=crop",
    difficulty: "Intermediate",
    chapters: [
      {
        title: "Module 1: Quantitative",
        lessons: [
          {
            id: "a1",
            title: "Time and Work",
            type: "article",
            content: "If A can do a piece of work in `x` days and B can do it in `y` days, then they together can finish it in `(x*y)/(x+y)` days."
          },
          {
            id: "a2",
            title: "Time and Work Quiz",
            type: "quiz",
            content: {
              question: "A does a work in 10 days and B does the same work in 15 days. In how many days they together will do the same work?",
              options: ["5 days", "6 days", "8 days", "9 days"],
              correctOption: 1
            }
          }
        ]
      }
    ]
  }
];

export const MOCK_WHITEBOARDS = [
  {
    id: "wb_twosum_demo",
    userId: "expert_coach",
    displayName: "NeonPro",
    problemId: "1",
    title: "Two Sum Optimal Hashmap Flow",
    code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    upvotes: 42,
    timestamp: Date.now(),
    shapes: [
      { id: "s1", type: "box", x: 40, y: 120, w: 100, h: 60, label: "Map Initialization" },
      { id: "s2", type: "loop", x: 180, y: 120, w: 80, h: 60, label: "Loop Elements" },
      { id: "s3", type: "diamond", x: 300, y: 110, w: 100, h: 80, label: "Complement In Map?" },
      { id: "s4", type: "box", x: 440, y: 120, w: 100, h: 60, label: "Return Indices" }
    ]
  },
  {
    id: "wb_anagram_demo",
    userId: "pixel_master",
    displayName: "ByteKnight",
    problemId: "2",
    title: "Anagram Character Frequency Count",
    code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (let c of s) count[c] = (count[c] || 0) + 1;
  for (let c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}`,
    upvotes: 28,
    timestamp: Date.now(),
    shapes: [
      { id: "a1", type: "diamond", x: 40, y: 120, w: 100, h: 70, label: "Lengths Equal?" },
      { id: "a2", type: "box", x: 180, y: 120, w: 100, h: 60, label: "Increment S Counts" },
      { id: "a3", type: "box", x: 320, y: 120, w: 100, h: 60, label: "Decrement T Counts" },
      { id: "a4", type: "diamond", x: 460, y: 115, w: 100, h: 70, label: "All Zeroes?" }
    ]
  }
];
