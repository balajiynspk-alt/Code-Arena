const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
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

const courses = [
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
            youtubeId: "PkZNo7MFNFg" // Example video ID
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
      },
      {
        title: "Chapter 3: Trees",
        lessons: [
          {
            id: "l6",
            title: "Binary Search Trees",
            type: "article",
            content: "A Binary Search Tree is a node-based binary tree data structure which has the following properties: \n\n- The left subtree of a node contains only nodes with keys lesser than the node's key.\n- The right subtree of a node contains only nodes with keys greater than the node's key."
          },
          {
            id: "l7",
            title: "Tree Quiz",
            type: "quiz",
            content: {
              question: "What is the maximum number of children a node in a Binary Tree can have?",
              options: ["1", "2", "3", "Unlimited"],
              correctOption: 1
            }
          }
        ]
      },
      {
        title: "Chapter 4: Dynamic Programming",
        lessons: [
          {
            id: "l8",
            title: "Fibonacci Sequence",
            type: "video",
            youtubeId: "vYquumk4nWw"
          }
        ]
      },
      {
        title: "Chapter 5: Graphs",
        lessons: [
          {
            id: "l9",
            title: "Graph Traversals (BFS & DFS)",
            type: "article",
            content: "Breadth-First Search (BFS) uses a queue and explores layer by layer. Depth-First Search (DFS) uses a stack (or recursion) and explores as far as possible along each branch before backtracking."
          },
          {
            id: "l10",
            title: "Graph Quiz",
            type: "quiz",
            content: {
              question: "Which data structure is typically used to implement Breadth-First Search (BFS)?",
              options: ["Stack", "Queue", "Priority Queue", "Hash Map"],
              correctOption: 1
            }
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
      },
      {
        title: "Module 2: Logical Reasoning",
        lessons: [
          {
            id: "a3",
            title: "Blood Relations",
            type: "article",
            content: "Drawing a family tree is the best way to solve blood relation problems. Use squares for males, circles for females, horizontal lines for siblings, and vertical lines for generations."
          },
          {
            id: "a4",
            title: "Blood Relations Quiz",
            type: "quiz",
            content: {
              question: "Pointing to a photograph of a boy Suresh said, 'He is the son of the only son of my mother.' How is Suresh related to that boy?",
              options: ["Brother", "Uncle", "Cousin", "Father"],
              correctOption: 3
            }
          }
        ]
      },
      {
        title: "Module 3: Data Interpretation",
        lessons: [
          {
            id: "a5",
            title: "Pie Charts and Bar Graphs",
            type: "video",
            youtubeId: "tV9F0Xo4U1I"
          }
        ]
      }
    ]
  }
];

async function seedCourses() {
  console.log("Starting to seed courses...");
  let successCount = 0;
  for (const course of courses) {
    try {
      const docRef = doc(db, COURSES_COLLECTION, course.id);
      await setDoc(docRef, course);
      console.log(`Successfully added course: ${course.title}`);
      successCount++;
    } catch (e) {
      console.error(`Error adding course: ${course.title}`, e);
    }
  }
  console.log(`Seeding complete. Added ${successCount} courses.`);
  process.exit(0);
}

const COURSES_COLLECTION = 'courses';
seedCourses();
