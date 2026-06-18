import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import { EmotionProvider } from './context/EmotionContext';
import EmotionBadge from './components/EmotionBadge';
import { auth } from './services/firebase';
import { updateStreak } from './utils/streakTracker';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Lazy load page components
const Landing = lazy(() => import('./pages/Landing'));
const Problems = lazy(() => import('./pages/Problems'));
const ProblemDetail = lazy(() => import('./pages/ProblemDetail'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Skills = lazy(() => import('./pages/Skills'));
const Battle = lazy(() => import('./pages/Battle'));
const ReplayTheatre = lazy(() => import('./pages/ReplayTheatre'));
const TopReplays = lazy(() => import('./pages/TopReplays'));
const BossBattle = lazy(() => import('./pages/BossBattle'));
const ThoughtReplay = lazy(() => import('./pages/ThoughtReplay'));
const InterviewSimulator = lazy(() => import('./pages/InterviewSimulator'));
const ConstellationMap = lazy(() => import('./pages/ConstellationMap'));
const PairProgramming = lazy(() => import('./pages/PairProgramming'));
const Guild = lazy(() => import('./pages/Guild'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Whiteboard = lazy(() => import('./pages/Whiteboard'));
const WhiteboardLibrary = lazy(() => import('./pages/WhiteboardLibrary'));
const Multiverse = lazy(() => import('./pages/Multiverse'));
const WatchStream = lazy(() => import('./pages/WatchStream'));
const QuantumGenerator = lazy(() => import('./pages/QuantumGenerator'));
const Contest = lazy(() => import('./pages/Contest'));
const Communities = lazy(() => import('./pages/Communities'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const Chat = lazy(() => import('./pages/Chat'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));
const TagPage = lazy(() => import('./pages/TagPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A0A0F', color: '#00FF88', fontFamily: 'Orbitron' }}>
    <div className="cp-pd-judging" style={{ fontSize: '1.2rem', letterSpacing: '3px', textShadow: '0 0 10px #00FF88' }}>
      LOADING_GRID // CONNECTING...
    </div>
  </div>
);



function MainApp() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      updateStreak(currentUser.uid);
      import('./services/presenceService').then(({ trackPresence }) => {
        trackPresence(currentUser.uid);
      });
    }
  }, [currentUser]);

  const location = useLocation();
  const hideNav = location.pathname === '/login' || location.pathname === '/';

  return (
    <div className="App">
      {!hideNav && <Navbar />}
      <main className={hideNav ? '' : 'main-content'}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/battle/:id" element={<Battle />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/tag/:topic" element={<TagPage />} />
            <Route path="/replay/:userId/:problemId" element={<ReplayTheatre />} />
            <Route path="/theatre" element={<TopReplays />} />
            <Route path="/boss" element={<BossBattle />} />
            <Route path="/thoughts/:userId/:problemId" element={<ThoughtReplay />} />
            <Route path="/interview" element={<InterviewSimulator />} />
            <Route path="/constellation" element={<ConstellationMap />} />
            <Route path="/pair/:roomId" element={<PairProgramming />} />
            <Route path="/guild" element={<Guild />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/whiteboard" element={<Whiteboard />} />
            <Route path="/whiteboard/:problemId" element={<Whiteboard />} />
            <Route path="/whiteboard/library" element={<WhiteboardLibrary />} />
            <Route path="/multiverse/:problemId" element={<Multiverse />} />
            <Route path="/watch" element={<WatchStream />} />
            <Route path="/watch/:userId" element={<WatchStream />} />
            <Route path="/quantum" element={<QuantumGenerator />} />
            <Route path="/contest" element={<Contest />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/community/:slug" element={<CommunityDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </Suspense>
      </main>
      <EmotionBadge />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EmotionProvider>
          <Router>
            <MainApp />
          </Router>
        </EmotionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
