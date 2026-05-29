import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Battle from './pages/Battle';
import ReplayTheatre from './pages/ReplayTheatre';
import TopReplays from './pages/TopReplays';
import BossBattle from './pages/BossBattle';
import ThoughtReplay from './pages/ThoughtReplay';
import InterviewSimulator from './pages/InterviewSimulator';
import ConstellationMap from './pages/ConstellationMap';
import PairProgramming from './pages/PairProgramming';
import Guild from './pages/Guild';
import Leaderboard from './pages/Leaderboard';
import Whiteboard from './pages/Whiteboard';
import WhiteboardLibrary from './pages/WhiteboardLibrary';
import Multiverse from './pages/Multiverse';
import WatchStream from './pages/WatchStream';
import QuantumGenerator from './pages/QuantumGenerator';
import Contest from './pages/Contest';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Chat from './pages/Chat';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import TagPage from './pages/TagPage';
import Navbar from './components/Navbar';
import { EmotionProvider } from './context/EmotionContext';
import EmotionBadge from './components/EmotionBadge';
import { auth } from './services/firebase';
import { updateStreak } from './utils/streakTracker';
import './App.css';

const queryClient = new QueryClient();



function MainApp() {
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      updateStreak(currentUser.uid);
      import('./services/presenceService').then(({ trackPresence }) => {
        trackPresence(currentUser.uid);
      });
    }
  }, [currentUser]);

  const location = useLocation();
  const hideNav = location.pathname === '/login';

  return (
    <div className="App">
      {!hideNav && <Navbar />}
      <main className={hideNav ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      </main>
      <EmotionBadge />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EmotionProvider>
        <Router>
          <MainApp />
        </Router>
      </EmotionProvider>
    </QueryClientProvider>
  );
}

export default App;
