# 🏟️ CodeArena

> A competitive coding platform where developers battle it out in real-time coding challenges, climb leaderboards, and sharpen their skills.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-ffca28?logo=firebase)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 🚀 Features

- 🔐 **Authentication** — Sign up / login via Firebase Auth
- 💻 **Code Editor** — Powered by Monaco Editor (same engine as VS Code)
- 🏆 **Leaderboards** — Real-time rankings with Recharts visualizations
- 📚 **Challenges** — Markdown-rendered problem statements with math support
- 🎬 **Video Tutorials** — Integrated React Player for solution walkthroughs
- 📡 **Real-time Data** — Firestore-backed live updates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v6 |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Data Fetching | TanStack React Query v5 |
| Charts | Recharts |
| Markdown | react-markdown + remark-math + rehype-highlight |
| Video | React Player |
| Hosting | Vercel |

---

## 📁 Project Structure

```
src/
├── assets/          # Images, icons, static files
├── components/      # Reusable UI components
├── context/         # React Context providers
├── hooks/           # Custom React hooks
├── pages/           # Route-level page components
├── services/        # Firebase & external API integrations
└── utils/           # Helper functions
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js >= 18
- A Firebase project ([create one here](https://console.firebase.google.com/))

### 1. Clone the repo
```bash
git clone https://github.com/balajiynspk-alt/Code-Arena.git
cd codearena
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Copy `.env` and fill in your Firebase credentials:
```bash
cp .env .env.local
```

```env
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 4. Start the dev server
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment

The project is configured for **Vercel** out of the box (`vercel.json` handles SPA routing).

```bash
npm run build
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## 📄 License

MIT © CodeArena
