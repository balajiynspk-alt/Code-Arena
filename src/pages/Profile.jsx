import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { db, auth, storage, isMockMode } from '../services/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ALL_BADGES } from '../utils/badgeChecker';
import { followUser, unfollowUser, checkIsFollowing, getFollowers, getFollowing } from '../services/followService';
import { getUserSubmissions } from '../services/problemService';
import { subscribeToPresence, formatLastSeen } from '../services/presenceService';
import { createBattleInvite, getUserBattles } from '../services/battleService';
import ChallengeModal from '../components/ChallengeModal';
import './Profile.css';

const LANGUAGES_POOL = ['python', 'javascript', 'cpp', 'java', 'rust', 'go', 'ruby'];

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [collegeInput, setCollegeInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [favLangs, setFavLangs] = useState([]);

  // Upload Avatar states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Followers Modal state
  const [activeModal, setActiveModal] = useState(null); // 'followers' | 'following' | null
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState({});

  // Follow states
  const [isFollowing, setIsFollowing] = useState(false);

  // Local Profile state for quick updates
  const [profile, setProfile] = useState(null);

  // Submissions history, metadata, and filter states
  const [submissions, setSubmissions] = useState([]);
  const [problemMetadata, setProblemMetadata] = useState({});
  const [filterVerdict, setFilterVerdict] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterLanguage, setFilterLanguage] = useState('All');
  const [filterDate, setFilterDate] = useState('All');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);

  // Social Battle states
  const [userPresence, setUserPresence] = useState({ online: false, lastSeen: null });
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('submissions'); // 'submissions' | 'battles'
  const [battleHistory, setBattleHistory] = useState([]);
  const [expandedBattleId, setExpandedBattleId] = useState(null);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        const { getAllProblems } = await import('../services/problemService');
        const list = await getAllProblems();
        const meta = {};
        list.forEach(p => {
          meta[p.id] = { title: p.title, difficulty: p.difficulty };
        });
        setProblemMetadata(meta);
      } catch (err) {
        console.error("Failed to load problem metadata:", err);
      }
    };
    loadProblems();
  }, []);

  // 1. Refresh live follow lists and relationships
  const refreshFollowData = async () => {
    if (!username) return;
    try {
      const following = await checkIsFollowing(username);
      setIsFollowing(following);

      const followers = await getFollowers(username);
      const followingUsers = await getFollowing(username);
      setFollowersList(followers);
      setFollowingList(followingUsers);

      const map = {};
      const allUsers = [...followers, ...followingUsers];
      for (const u of allUsers) {
        map[u.uid] = await checkIsFollowing(u.uid);
      }
      setFollowingMap(map);

      // Keep local counts updated
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          followerCount: followers.length,
          followingCount: followingUsers.length
        };
      });
    } catch (e) {
      console.error("Error loading follow relations:", e);
    }
  };

  // 2. Fetch user profile from Firestore or mock fallback
  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      let data = null;

      if (!isMockMode) {
        try {
          const snap = await getDoc(doc(db, 'users', username));
          if (snap.exists()) {
            data = snap.data();
          }
        } catch (e) {
          console.error("Firestore read error:", e);
        }
      }

      // Local storage fallback for offline/mock modes
      if (!data) {
        const localRaw = localStorage.getItem(`mock_profile_${username}`);
        if (localRaw) {
          data = JSON.parse(localRaw);
        }
      }

      // Default populated fallback if nothing exists
      if (!data) {
        data = {
          username: username,
          displayName: username,
          bio: 'Cybernetic developer seeking algorithmic dominance in the CodeArena. // NODE_ACTIVE',
          college: 'Nexus Institute of Technology',
          location: 'Neo-Tokyo Sector 4',
          favoriteLanguages: ['python', 'javascript', 'cpp'],
          avatarUrl: '',
          followers: ['Glitch_Viper', 'Aura_Netrunner'],
          following: ['Glitch_Viper'],
          rating: 1540,
          rank: 'Expert',
          easySolved: 42,
          mediumSolved: 28,
          hardSolved: 12,
          currentStreak: 8,
          longestStreak: 21,
          contestRating: 1620,
          globalRank: 124,
          coins: 480,
          badges: ['first_blood', 'week_warrior', 'century_club'],
          recentSubmissions: [
            { id: 's1', problemId: 'two-sum', language: 'python', verdict: 'Accepted', timestamp: Date.now() - 3600000 },
            { id: 's2', problemId: 'lru-cache', language: 'cpp', verdict: 'Accepted', timestamp: Date.now() - 86400000 },
            { id: 's3', problemId: 'validate-bst', language: 'javascript', verdict: 'Wrong Answer', timestamp: Date.now() - 172800000 },
            { id: 's4', problemId: 'reverse-linked-list', language: 'python', verdict: 'Accepted', timestamp: Date.now() - 259200000 },
            { id: 's5', problemId: 'course-schedule', language: 'python', verdict: 'Accepted', timestamp: Date.now() - 432000000 }
          ],
          activityFeed: [
            { id: 'a1', text: 'Completed Course: Advanced Dynamic Programming', time: '1 day ago' },
            { id: 'a2', text: 'Won 1v1 Battle against Glitch_Viper (+32 Elo)', time: '3 days ago' },
            { id: 'a3', text: 'Decoupled and optimization-checked LRU Cache solution', time: '5 days ago' }
          ]
        };
      }

      setProfile(data);
      setBioInput(data.bio || '');
      setCollegeInput(data.college || '');
      setLocationInput(data.location || '');
      setFavLangs(data.favoriteLanguages || []);
      
      // Fetch real user submissions
      try {
        const subList = await getUserSubmissions(username);
        setSubmissions(subList || []);
      } catch (err) {
        console.error("Failed to load user submissions:", err);
      }

      // Fetch battle history
      try {
        const battlesList = await getUserBattles(username);
        setBattleHistory(battlesList || []);
      } catch (err) {
        console.error("Failed to load battle history:", err);
      }

      // Determine if current user follows them and load lists
      await refreshFollowData();
    };

    fetchProfile();
  }, [username, currentUser]);

  useEffect(() => {
    if (!username) return;
    const unsubscribe = subscribeToPresence(username, (status) => {
      setUserPresence(status || { online: false, lastSeen: null });
    });
    return () => unsubscribe();
  }, [username]);

  const handleInitiateChallenge = async ({ difficulty, timeLimit }) => {
    if (!currentUser || !profile) return;
    try {
      await createBattleInvite(
        currentUser.uid,
        currentUser.displayName || 'Operator',
        profile.username,
        profile.displayName,
        difficulty,
        timeLimit
      );
      alert(`⚔️ COMBAT PROTOCOL DISPATCHED! Duel link transmitted to @${profile.displayName}.`);
    } catch (err) {
      console.error("Challenge launch aborted:", err);
      alert("Abort link: " + err.message);
    }
  };

  // 2. Avatar Uploader (Firebase Storage with reactive progress bar + local base64 fallback)
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file || !profile) return;

    setIsUploading(true);
    setUploadProgress(10);

    if (isMockMode) {
      // Offline mock upload using FileReader
      const reader = new FileReader();
      
      // Simulate upload task progress bar ticking over 800ms
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 20;
        });
      }, 150);

      reader.onloadend = () => {
        setTimeout(() => {
          clearInterval(interval);
          setUploadProgress(100);
          
          const base64Url = reader.result;
          const updated = { ...profile, avatarUrl: base64Url };
          setProfile(updated);
          localStorage.setItem(`mock_profile_${username}`, JSON.stringify(updated));
          
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 400);
        }, 800);
      };
      
      reader.readAsDataURL(file);
    } else {
      // Real Firebase Storage upload
      const path = `avatars/${username}_${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.max(10, Math.floor(progress)));
        }, 
        (error) => {
          console.error("Upload error:", error);
          setIsUploading(false);
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const updated = { ...profile, avatarUrl: downloadUrl };
          setProfile(updated);
          await setDoc(doc(db, 'users', username), updated, { merge: true });
          setIsUploading(false);
          setUploadProgress(0);
        }
      );
    }
  };

  // 3. Save profile metadata edits
  const handleSaveProfile = async () => {
    if (!profile) return;

    const updated = {
      ...profile,
      bio: bioInput.substring(0, 160),
      college: collegeInput,
      location: locationInput,
      favoriteLanguages: favLangs
    };

    setProfile(updated);
    setIsEditing(false);

    if (!isMockMode) {
      try {
        await setDoc(doc(db, 'users', username), updated, { merge: true });
      } catch (e) {
        console.error("Error saving profile to Firestore:", e);
      }
    }

    localStorage.setItem(`mock_profile_${username}`, JSON.stringify(updated));
  };

  // 4. Follow/Unfollow toggle
  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;

    try {
      if (isFollowing) {
        await unfollowUser(username);
      } else {
        await followUser(username);
        const { createNotification } = await import('../services/notificationService');
        await createNotification(
          username,
          'NEW_FOLLOWER',
          `@${currentUser.displayName || 'Operator'} established a link to your node profile.`,
          `/profile/${currentUser.displayName || currentUser.uid}`
        );
      }
      await refreshFollowData();
    } catch (e) {
      console.error("Follow toggle failed:", e);
    }
  };

  // 5. Follow/Unfollow toggle directly inside followers list modal items
  const handleModalFollowToggle = async (e, targetUid) => {
    e.stopPropagation();
    if (!currentUser) return;
    const isCurrentlyFollowing = !!followingMap[targetUid];

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUid);
      } else {
        await followUser(targetUid);
        const { createNotification } = await import('../services/notificationService');
        await createNotification(
          targetUid,
          'NEW_FOLLOWER',
          `@${currentUser.displayName || 'Operator'} established a link to your node profile.`,
          `/profile/${currentUser.displayName || currentUser.uid}`
        );
      }
      // Update follow counts and the mapping for instantaneous UI response
      setFollowingMap(prev => ({
        ...prev,
        [targetUid]: !isCurrentlyFollowing
      }));
      await refreshFollowData();
    } catch (error) {
      console.error("Modal follow toggle failed:", error);
    }
  };

  // Toggle Lang select
  const toggleLanguageTag = (lang) => {
    if (favLangs.includes(lang)) {
      setFavLangs(prev => prev.filter(l => l !== lang));
    } else {
      if (favLangs.length < 3) {
        setFavLangs(prev => [...prev, lang]);
      }
    }
  };

  if (!profile) return <div className="loading" style={{ color: '#FF2D78', padding: '100px', textAlign: 'center', fontFamily: 'Orbitron', fontSize: '1.2rem' }}>BOOTING INTERFACE PROFILE...</div>;

  // Easy / Med / Hard math solved percentages
  const easyCount = profile.easySolved || 0;
  const medCount = profile.mediumSolved || 0;
  const hardCount = profile.hardSolved || 0;
  const totalSolved = easyCount + medCount + hardCount;

  // Dynamic solved statistics computed from actual user submissions
  const totalSubmissionsCount = submissions.length;
  const acceptedSubmissionsCount = submissions.filter(s => s.verdict === 'Accepted').length;
  const acceptanceRate = totalSubmissionsCount > 0 ? Math.round((acceptedSubmissionsCount / totalSubmissionsCount) * 100) : 0;

  // Language counts
  const langCounts = {};
  submissions.forEach(s => {
    const lang = s.language?.toLowerCase() || 'python';
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  const colorPalette = {
    python: '#FF2D78',
    javascript: '#00FF88',
    cpp: '#FFAA00',
    java: '#00A2FF',
    rust: '#B57CFF',
    go: '#FF5500',
    ruby: '#FF0055'
  };

  const dynamicLangPie = Object.keys(langCounts).map(lang => {
    const count = langCounts[lang];
    const percentage = totalSubmissionsCount > 0 ? Math.round((count / totalSubmissionsCount) * 100) : 0;
    return {
      name: lang.toUpperCase(),
      value: percentage,
      color: colorPalette[lang] || '#8888AA'
    };
  });

  const langPieData = dynamicLangPie.length > 0 ? dynamicLangPie : [
    { name: 'PYTHON', value: 60, color: '#FF2D78' },
    { name: 'JAVASCRIPT', value: 30, color: '#00FF88' },
    { name: 'C++', value: 10, color: '#FFAA00' }
  ];

  // Filtered submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Verdict
    if (filterVerdict !== 'All' && sub.verdict !== filterVerdict) return false;

    // Difficulty
    const diff = problemMetadata[sub.problemId]?.difficulty || 'Easy';
    if (filterDifficulty !== 'All' && diff.toLowerCase() !== filterDifficulty.toLowerCase()) return false;

    // Language
    if (filterLanguage !== 'All' && sub.language?.toLowerCase() !== filterLanguage.toLowerCase()) return false;

    // Date
    if (filterDate !== 'All') {
      const subTime = sub.timestamp;
      const now = Date.now();
      const diffTime = now - subTime;
      if (filterDate === 'Today' && diffTime > 86400000) return false;
      if (filterDate === 'Week' && diffTime > 604800000) return false;
      if (filterDate === 'Month' && diffTime > 2592000000) return false;
    }

    return true;
  });

  // 52 week heatmap data mapping (colors correspond to solved count)
  const heatmapCells = Array.from({ length: 52 * 7 }).map((_, index) => {
    // Generate organic patterns with a deterministic mock distribution
    const solvedVal = (index % 11 === 0 || index % 17 === 3) ? Math.min(3, (index % 4)) : 0;
    return solvedVal;
  });

  const isOwner = currentUser && (currentUser.displayName === username || currentUser.uid === username || username === 'me');
  const initials = profile.displayName ? profile.displayName.substring(0, 2).toUpperCase() : 'CO';

  return (
    <div className="profile-container">
      
      {/* 1. Cyberpunk Header Card */}
      <div className="cp-p-header-deck">
        
        {/* Avatar Wrap */}
        <div className="cp-p-avatar-wrap" style={{ position: 'relative' }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Operator Avatar" className="cp-p-avatar" />
          ) : (
            <div className="cp-p-avatar-fallback">{initials}</div>
          )}

          {/* Dynamic presence green status dot */}
          <span className={`cp-status-dot ${userPresence.online ? 'online' : 'offline'}`} style={{ position: 'absolute', bottom: '6px', right: '6px', width: '14px', height: '14px', border: '2px solid #0E0D16' }} />

          {isOwner && (
            <label className="cp-p-avatar-upload-overlay">
              <span className="cp-upload-icon">📷</span>
              <span className="cp-upload-text">UPLINK FILE</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: 'none' }} 
                disabled={isUploading}
              />
            </label>
          )}

          {/* Glowing upload progress bar */}
          {isUploading && (
            <div className="cp-p-upload-progress-container">
              <div 
                className="cp-p-upload-progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* User metadata properties */}
        <div className="cp-p-meta-block">
          <div className="cp-p-user-row">
            <div>
              <h2 className="cp-p-username">{profile.displayName?.toUpperCase()}</h2>
              {/* Dynamic last seen subtitle */}
              <div style={{ fontSize: '0.72rem', color: userPresence.online ? 'var(--cyber-green)' : '#8888AA', marginBottom: '6px', fontFamily: 'Share Tech Mono', letterSpacing: '0.5px' }}>
                {userPresence.online ? (
                  <span>🟢 ONLINE OPERATOR</span>
                ) : (
                  <span>⏳ LAST SEEN: {formatLastSeen(userPresence.lastSeen)?.toUpperCase()}</span>
                )}
              </div>
              <span className={`cp-p-rank-badge ${profile.rank?.toLowerCase() || 'expert'}`}>
                Tier: {profile.rank || 'Expert'} (ELO {profile.rating || 1500})
              </span>
            </div>

            {/* Follow/Unfollow & Edit Profile Button Decks */}
            <div className="cp-p-buttons-deck">
              {!isOwner && currentUser && (
                <>
                  <button 
                    onClick={handleFollowToggle} 
                    className={isFollowing ? "cp-btn-unfollow" : "cp-btn-follow"}
                  >
                    {isFollowing ? "DISCONNECT // UNFOLLOW" : "ESTABLISH LINK // FOLLOW"}
                  </button>

                  <button 
                    onClick={() => setIsChallengeModalOpen(true)}
                    className="cp-btn-follow"
                    style={{ borderColor: 'var(--cyber-pink)', color: 'var(--cyber-pink)' }}
                  >
                    ⚔️ CHALLENGE NODE
                  </button>

                  <button 
                    onClick={async () => {
                      const { startConversation } = await import('../services/dmService');
                      await startConversation(profile.username, profile.displayName);
                      navigate('/messages');
                    }} 
                    className="cp-btn-follow"
                    style={{ borderColor: '#00FF88', color: '#00FF88' }}
                  >
                    DIRECT SIGNAL // DM
                  </button>
                </>
              )}
              {isOwner && (
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className="cp-btn-edit"
                >
                  {isEditing ? "CANCEL" : "EDIT PROFILE"}
                </button>
              )}
            </div>
          </div>

          {/* Editable properties layout fields */}
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--cyber-pink)', display: 'block', marginBottom: '4px' }}>BIO // 160 CHARS MAX</label>
                <textarea 
                  className="cp-p-bio-input-area"
                  value={bioInput}
                  maxLength={160}
                  onChange={e => setBioInput(e.target.value)}
                />
                <div className="cp-p-bio-counter">{bioInput.length}/160</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', color: 'var(--cyber-pink)', display: 'block', marginBottom: '4px' }}>COLLEGE</label>
                  <input 
                    type="text" 
                    className="cp-p-bio-input-area" 
                    value={collegeInput} 
                    onChange={e => setCollegeInput(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', color: 'var(--cyber-pink)', display: 'block', marginBottom: '4px' }}>LOCATION</label>
                  <input 
                    type="text" 
                    className="cp-p-bio-input-area" 
                    value={locationInput} 
                    onChange={e => setLocationInput(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', color: 'var(--cyber-pink)', display: 'block', marginBottom: '6px' }}>FAVORITE LANGUAGES (MAX 3)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {LANGUAGES_POOL.map(lang => {
                    const isSel = favLangs.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => toggleLanguageTag(lang)}
                        className={`cp-p-tag ${isSel ? 'active-lang' : ''}`}
                        style={{ cursor: 'pointer', background: 'transparent' }}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={handleSaveProfile} 
                className="cp-btn-follow" 
                style={{ marginTop: '10px', alignSelf: 'flex-start' }}
              >
                SAVE OVERRIDES 💾
              </button>
            </div>
          ) : (
            <>
              {/* Bio display */}
              <div className="cp-p-bio-box">
                <p className="cp-p-bio-text">// {profile.bio || "No telemetry data recorded."}</p>
              </div>

              {/* College & Location */}
              <div className="cp-p-school-row">
                {profile.college && (
                  <span>🏫 {profile.college}</span>
                )}
                {profile.location && (
                  <span>📍 {profile.location}</span>
                )}
              </div>

              {/* Languages badges */}
              <div className="cp-p-tags-row">
                {profile.favoriteLanguages?.map(lang => (
                  <span key={lang} className="cp-p-tag active-lang">{lang}</span>
                )) || <span className="cp-p-tag">// ALL_LANGS</span>}
              </div>
            </>
          )}

          {/* Follow / Following Counters clickable triggers */}
          <div className="cp-p-followers-deck">
            <span className="cp-p-follower-counter" onClick={() => setActiveModal('followers')}>
              FOLLOWERS <strong>{profile.followers?.length || 0}</strong>
            </span>
            <span className="cp-p-follower-counter" onClick={() => setActiveModal('following')}>
              FOLLOWING <strong>{profile.following?.length || 0}</strong>
            </span>
          </div>

        </div>

      </div>

      {/* 2. Stats Grid Row (4 cards) */}
      <div className="cp-p-stats-deck">
        
        {/* Problems Solved Breakdown */}
        <div className="cp-p-stat-card">
          <div className="cp-p-stat-num">{totalSolved}</div>
          <div className="cp-p-stat-label">SOLVED PROBLEMS</div>
          
          <div className="cp-p-solved-bar-deck">
            <div>
              <div className="cp-p-solved-row-mini">
                <span style={{ color: 'var(--cyber-green)' }}>EASY</span>
                <span>{easyCount}</span>
              </div>
              <div className="cp-mini-progress-container">
                <div className="cp-mini-progress-bar easy" style={{ width: `${totalSolved ? (easyCount / totalSolved) * 100 : 0}%`, height: '100%' }} />
              </div>
            </div>

            <div>
              <div className="cp-p-solved-row-mini">
                <span style={{ color: 'var(--cyber-gold)' }}>MEDIUM</span>
                <span>{medCount}</span>
              </div>
              <div className="cp-mini-progress-container">
                <div className="cp-mini-progress-bar medium" style={{ width: `${totalSolved ? (medCount / totalSolved) * 100 : 0}%`, height: '100%' }} />
              </div>
            </div>

            <div>
              <div className="cp-p-solved-row-mini">
                <span style={{ color: 'var(--cyber-pink)' }}>HARD</span>
                <span>{hardCount}</span>
              </div>
              <div className="cp-mini-progress-container">
                <div className="cp-mini-progress-bar hard" style={{ width: `${totalSolved ? (hardCount / totalSolved) * 100 : 0}%`, height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="cp-p-stat-card">
          <div className="cp-p-stat-num">{profile.currentStreak || 0} 🔥</div>
          <div className="cp-p-stat-label">CURRENT ACTIVE STREAK</div>
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', fontSize: '0.72rem', color: '#8888AA' }}>
            LONGEST STREAK RECORD: <strong style={{ color: '#FFF' }}>{profile.longestStreak || 0} DAYS</strong>
          </div>
        </div>

        {/* Arena rating */}
        <div className="cp-p-stat-card">
          <div className="cp-p-stat-num">{profile.contestRating || 0}</div>
          <div className="cp-p-stat-label">CONTEST RATING</div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', fontSize: '0.72rem', color: '#8888AA' }}>
            GLOBAL RANKING: <strong style={{ color: 'var(--cyber-green)' }}>#{profile.globalRank || 99}+</strong>
          </div>
        </div>

        {/* Coins and Badges count */}
        <div className="cp-p-stat-card">
          <div className="cp-p-stat-num">{profile.coins || 0} 🪙</div>
          <div className="cp-p-stat-label">OPERATOR BALANCES</div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', fontSize: '0.72rem', color: '#8888AA' }}>
            BADGES UNLOCKED: <strong style={{ color: 'var(--cyber-pink)' }}>{profile.badges?.length || 0} EARNED</strong>
          </div>
        </div>

      </div>

      {/* 3. 52-Week Solve Heatmap (GitHub style) */}
      <div className="cp-p-heatmap-card">
        <div className="cp-p-heatmap-scroll">
          <div className="cp-p-heatmap-matrix">
            {heatmapCells.map((level, i) => (
              <div key={i} className="cp-p-cell" data-level={level} />
            ))}
          </div>
        </div>

        <div className="cp-p-heatmap-legend">
          <span>Dim</span>
          <div className="cp-p-cell" data-level="0" />
          <div className="cp-p-cell" data-level="1" />
          <div className="cp-p-cell" data-level="2" />
          <div className="cp-p-cell" data-level="3" />
          <span>Laser Bright</span>
        </div>
      </div>

      {/* 4. Language Pie Chart & Badge Wall Split Panels */}
      <div className="cp-p-splits-row">
        
        {/* Recharts Pie Chart */}
        <div className="cp-p-split-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 className="cp-p-split-card-title" style={{ border: 'none', margin: 0, padding: 0 }}>// COGNITIVE LANGUAGES DENSITY</h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--cyber-green)', fontFamily: 'Orbitron', fontWeight: 'bold', textShadow: '0 0 6px rgba(0, 255, 136, 0.2)' }}>
              ACC RATE: {acceptanceRate}%
            </span>
          </div>
          
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={langPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {langPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.08)', color: '#FFF' }}
                  itemStyle={{ fontSize: '0.72rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.68rem', color: '#8888AA', marginTop: '10px' }}>
            {langPieData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                <span>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badge Wall Panel */}
        <div className="cp-p-split-card">
          <h3 className="cp-p-split-card-title">// EARNED OPERATOR BADGES</h3>
          <div className="cp-p-badge-grid">
            {ALL_BADGES.map(badge => {
              const isEarned = (profile.badges || []).includes(badge.id);
              return (
                <div key={badge.id} className={`cp-p-badge-item ${isEarned ? 'earned' : 'locked'}`}>
                  <div className="cp-p-badge-icon">
                    {badge.id === 'first_blood' ? '🩸' : 
                     badge.id === 'week_warrior' ? '⚔️' : 
                     badge.id === 'century_club' ? '💯' : '🎓'}
                  </div>
                  <div className="cp-p-badge-name">{badge.name}</div>
                  <div className="cp-p-badge-desc">{badge.description}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. Console Tabs Selector */}
      <div className="cp-profile-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveProfileTab('submissions')}
          style={{
            fontFamily: 'Orbitron',
            fontSize: '0.72rem',
            padding: '10px 22px',
            color: activeProfileTab === 'submissions' ? 'var(--cyber-green)' : '#8888AA',
            borderColor: activeProfileTab === 'submissions' ? 'var(--cyber-green)' : 'rgba(255,255,255,0.08)',
            background: activeProfileTab === 'submissions' ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono',
            letterSpacing: '0.5px',
            textShadow: activeProfileTab === 'submissions' ? '0 0 8px rgba(0, 255, 136, 0.3)' : 'none',
            boxShadow: activeProfileTab === 'submissions' ? '0 0 10px rgba(0, 255, 136, 0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          📁 TRANSMISSION ARCHIVES
        </button>
        <button
          onClick={() => setActiveProfileTab('battles')}
          style={{
            fontFamily: 'Orbitron',
            fontSize: '0.72rem',
            padding: '10px 22px',
            color: activeProfileTab === 'battles' ? 'var(--cyber-pink)' : '#8888AA',
            borderColor: activeProfileTab === 'battles' ? 'var(--cyber-pink)' : 'rgba(255,255,255,0.08)',
            background: activeProfileTab === 'battles' ? 'rgba(255, 45, 120, 0.05)' : 'transparent',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono',
            letterSpacing: '0.5px',
            textShadow: activeProfileTab === 'battles' ? '0 0 8px rgba(255, 45, 120, 0.3)' : 'none',
            boxShadow: activeProfileTab === 'battles' ? '0 0 10px rgba(255, 45, 120, 0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          ⚔️ BATTLE GROUND HISTORY
        </button>
      </div>

      {/* Submissions Panel */}
      {activeProfileTab === 'submissions' && (
        <div className="cp-p-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h3 className="cp-p-split-card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
              // TRANSMISSION ARCHIVES ({filteredSubmissions.length} DETECTED)
            </h3>
            
            {/* Interactive filter dropdown list */}
            <div className="cp-table-filters" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select 
                value={filterVerdict} 
                onChange={e => setFilterVerdict(e.target.value)}
                style={{ background: '#090912', border: '1px solid rgba(255,255,255,0.08)', color: '#FFF', borderRadius: '4px', padding: '6px 10px', fontSize: '0.7rem', fontFamily: 'Share Tech Mono', outline: 'none' }}
              >
                <option value="All">VERDICT: ALL</option>
                <option value="Accepted">ACCEPTED</option>
                <option value="Wrong Answer">WRONG ANSWER</option>
                <option value="Time Limit Exceeded">TLE</option>
              </select>

              <select 
                value={filterDifficulty} 
                onChange={e => setFilterDifficulty(e.target.value)}
                style={{ background: '#090912', border: '1px solid rgba(255,255,255,0.08)', color: '#FFF', borderRadius: '4px', padding: '6px 10px', fontSize: '0.7rem', fontFamily: 'Share Tech Mono', outline: 'none' }}
              >
                <option value="All">DIFFICULTY: ALL</option>
                <option value="Easy">EASY</option>
                <option value="Medium">MEDIUM</option>
                <option value="Hard">HARD</option>
              </select>

              <select 
                value={filterLanguage} 
                onChange={e => setFilterLanguage(e.target.value)}
                style={{ background: '#090912', border: '1px solid rgba(255,255,255,0.08)', color: '#FFF', borderRadius: '4px', padding: '6px 10px', fontSize: '0.7rem', fontFamily: 'Share Tech Mono', outline: 'none' }}
              >
                <option value="All">COMPILER: ALL</option>
                <option value="python">PYTHON</option>
                <option value="javascript">JAVASCRIPT</option>
                <option value="cpp">C++</option>
                <option value="java">JAVA</option>
                <option value="rust">RUST</option>
                <option value="go">GO</option>
              </select>

              <select 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)}
                style={{ background: '#090912', border: '1px solid rgba(255,255,255,0.08)', color: '#FFF', borderRadius: '4px', padding: '6px 10px', fontSize: '0.7rem', fontFamily: 'Share Tech Mono', outline: 'none' }}
              >
                <option value="All">DATE RANGE: ALL</option>
                <option value="Today">TODAY</option>
                <option value="Week">PAST 7 DAYS</option>
                <option value="Month">PAST 30 DAYS</option>
              </select>
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: '40px', textTransform: 'uppercase', textAlign: 'center', fontSize: '0.8rem', color: '#666688', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              // NO SOLUTION LOG ARCHIVES DETECTED IN CHOSEN SPECTRUM
            </div>
          ) : (
            <table className="cp-p-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="cp-p-th" style={{ textAlign: 'left' }}>PROBLEM ID</th>
                  <th className="cp-p-th">DIFFICULTY</th>
                  <th className="cp-p-th">COMPILER LANGUAGE</th>
                  <th className="cp-p-th">VERDICT</th>
                  <th className="cp-p-th">EXEC TIME</th>
                  <th className="cp-p-th" style={{ textAlign: 'right' }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => {
                  const isExpanded = expandedSubmissionId === sub.id;
                  const probMeta = problemMetadata[sub.problemId] || { title: sub.problemId, difficulty: 'Easy' };
                  const diffClass = probMeta.difficulty.toLowerCase();

                  return (
                    <React.Fragment key={sub.id}>
                      <tr 
                        className={`cp-p-tr cp-interactive-tr ${isExpanded ? 'active' : ''}`}
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s ease' }}
                      >
                        <td className="cp-p-td" style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'left' }}>
                          {sub.problemId.toUpperCase()}
                        </td>
                        <td className="cp-p-td">
                          <span className={`cp-search-rank ${diffClass}`} style={{ fontSize: '0.58rem', padding: '2px 6px', fontWeight: 'bold' }}>
                            {probMeta.difficulty.toUpperCase()}
                          </span>
                        </td>
                        <td className="cp-p-td" style={{ color: 'var(--cyber-green)' }}>
                          {sub.language.toUpperCase()}
                        </td>
                        <td className="cp-p-td">
                          <span className={`cp-verdict-badge ${sub.verdict === 'Accepted' ? 'ok' : 'fail'}`}>
                            {sub.verdict}
                          </span>
                        </td>
                        <td className="cp-p-td" style={{ color: '#8888AA' }}>
                          {sub.runtime || 24} ms
                        </td>
                        <td className="cp-p-td" style={{ color: '#666688', textAlign: 'right' }}>
                          {new Date(sub.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ background: '#090912', padding: '20px', borderTop: '1px solid rgba(255, 45, 120, 0.15)', borderBottom: '1px solid rgba(255, 45, 120, 0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.68rem', color: 'var(--cyber-pink)', fontFamily: 'Orbitron', letterSpacing: '1px' }}>
                                // CODE MATRIX ENVELOPE PAYLOAD : {sub.id}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(sub.code || '');
                                  alert("CODE COPIED TO CLIPBOARD!");
                                }}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--cyber-green)',
                                  borderRadius: '4px',
                                  color: 'var(--cyber-green)',
                                  padding: '4px 10px',
                                  fontSize: '0.62rem',
                                  fontFamily: 'Share Tech Mono',
                                  cursor: 'pointer'
                                }}
                              >
                                📋 COPY TO CLIPBOARD
                              </button>
                            </div>
                            <pre style={{
                              margin: 0,
                              padding: '16px',
                              background: '#040408',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              overflowX: 'auto',
                              color: '#00FF88',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              lineHeight: '1.4'
                            }}>
                              <code>{sub.code || `// no source code payload detected`}</code>
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Battle Ground Tab Panel */}
      {activeProfileTab === 'battles' && (
        <div className="cp-p-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <h3 className="cp-p-split-card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
              // COMBAT LOG ARCHIVES ({battleHistory.length} ENGAGEMENTS)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--cyber-pink)', fontFamily: 'Orbitron', fontWeight: 'bold' }}>
              RECORD: {battleHistory.filter(b => b.result === 'win').length}W / {battleHistory.filter(b => b.result === 'loss').length}L ({battleHistory.length > 0 ? Math.round((battleHistory.filter(b => b.result === 'win').length / (battleHistory.filter(b => b.result === 'win').length + battleHistory.filter(b => b.result === 'loss').length || 1)) * 100) : 0}%)
            </span>
          </div>

          {battleHistory.length === 0 ? (
            <div style={{ padding: '40px', textTransform: 'uppercase', textAlign: 'center', fontSize: '0.8rem', color: '#666688', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              // NO ARENA ENGAGEMENT RECORDS REPORTED ON THIS NODE
            </div>
          ) : (
            <table className="cp-p-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="cp-p-th" style={{ textAlign: 'left' }}>OPPONENT</th>
                  <th className="cp-p-th">PROBLEM CHALLENGE</th>
                  <th className="cp-p-th">OUTCOME</th>
                  <th className="cp-p-th">ELO RATING DELTA</th>
                  <th className="cp-p-th" style={{ textAlign: 'right' }}>REPLAY ANALYZER</th>
                </tr>
              </thead>
              <tbody>
                {battleHistory.map(battle => {
                  const isWin = battle.result === 'win';
                  const isLoss = battle.result === 'loss';
                  const outcomeColor = isWin ? 'var(--cyber-green)' : (isLoss ? 'var(--cyber-pink)' : '#8888AA');

                  return (
                    <React.Fragment key={battle.id}>
                      <tr className="cp-p-tr cp-interactive-tr" onClick={() => setExpandedBattleId(expandedBattleId === battle.id ? null : battle.id)} style={{ cursor: 'pointer' }}>
                        <td className="cp-p-td" style={{ textAlign: 'left', fontWeight: 'bold' }}>
                          @{battle.opponent}
                        </td>
                        <td className="cp-p-td" style={{ fontFamily: 'Share Tech Mono' }}>
                          {battle.problemTitle}
                        </td>
                        <td className="cp-p-td" style={{ color: outcomeColor, fontWeight: 'bold', letterSpacing: '0.5px' }}>
                          {battle.result?.toUpperCase() === 'DRAW' ? '✓ DRAW' : (isWin ? '🏆 VICTORY' : '💀 DEFEAT')}
                        </td>
                        <td className="cp-p-td" style={{ color: outcomeColor, fontFamily: 'Share Tech Mono' }}>
                          {battle.ratingDelta}
                        </td>
                        <td className="cp-p-td" style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedBattleId(expandedBattleId === battle.id ? null : battle.id);
                            }}
                            className="cp-quick-btn"
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.62rem',
                              borderColor: 'var(--cyber-pink)',
                              color: 'var(--cyber-pink)',
                              background: expandedBattleId === battle.id ? 'rgba(255, 45, 120, 0.1)' : 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'Share Tech Mono',
                              borderRadius: '3px'
                            }}
                          >
                            {expandedBattleId === battle.id ? 'CLOSE DRAWER' : 'REPLAY SOLUTIONS ⚔️'}
                          </button>
                        </td>
                      </tr>
                      {expandedBattleId === battle.id && (
                        <tr>
                          <td colSpan="5" style={{ background: '#09080F', padding: '20px', borderLeft: '3px solid var(--cyber-pink)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              <div>
                                <h4 style={{ color: 'var(--cyber-pink)', fontSize: '0.72rem', marginBottom: '8px', fontFamily: 'Orbitron', letterSpacing: '0.5px' }}>
                                  // YOUR SOLUTION
                                </h4>
                                <pre style={{
                                  background: '#040408',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  padding: '14px',
                                  borderRadius: '4px',
                                  color: '#A0A0C5',
                                  fontSize: '0.68rem',
                                  fontFamily: 'Fira Code, monospace',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '260px'
                                }}>
                                  {battle.challengerCode || '// No submission recorded.'}
                                </pre>
                              </div>
                              <div>
                                <h4 style={{ color: 'var(--cyber-green)', fontSize: '0.72rem', marginBottom: '8px', fontFamily: 'Orbitron', letterSpacing: '0.5px' }}>
                                  // OPPONENT SOLUTION (@{battle.opponent})
                                </h4>
                                <pre style={{
                                  background: '#040408',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  padding: '14px',
                                  borderRadius: '4px',
                                  color: '#A0A0C5',
                                  fontSize: '0.68rem',
                                  fontFamily: 'Fira Code, monospace',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '260px'
                                }}>
                                  {battle.opponentCode || '// No submission recorded.'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 6. Live Activity Feed stream */}
      <div className="cp-p-table-card">
        <h3 className="cp-p-split-card-title" style={{ borderBottom: 'none', marginBottom: '12px' }}>// LOGGED SYSTEM ACTIVITY</h3>
        <div className="cp-p-activity-list">
          {profile.activityFeed?.map(act => (
            <div key={act.id} className="cp-p-activity-item">
              <span>{act.text}</span>
              <span className="cp-p-activity-time">{act.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Followers / Following Clickable List Modals */}
      {activeModal && (
        <div className="cp-p-modal-backdrop" onClick={() => { setActiveModal(null); setSearchQuery(''); }}>
          <div className="cp-p-modal" onClick={e => e.stopPropagation()}>
            <button className="cp-p-modal-close" onClick={() => { setActiveModal(null); setSearchQuery(''); }}>✕</button>
            
            <h4 className="cp-p-modal-title">
              {activeModal === 'followers' ? 'LINKED FOLLOWERS' : 'LINKED FOLLOWING'}
            </h4>

            {/* Cyber search input */}
            <input 
              type="text"
              placeholder="SEARCH NODE ID..."
              className="cp-p-bio-input-area"
              style={{ width: '100%', marginBottom: '16px', textTransform: 'uppercase', borderColor: 'var(--cyber-green)', fontSize: '0.74rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            
            <div className="cp-p-modal-list">
              {(() => {
                const listToDisplay = activeModal === 'followers' ? followersList : followingList;
                const filtered = listToDisplay.filter(u => 
                  u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.uid?.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filtered.length === 0) {
                  return <div style={{ fontSize: '0.72rem', color: '#666688', textAlign: 'center', padding: '16px' }}>NO LINKED NODES DETECTED.</div>;
                }

                return filtered.map(user => {
                  const isMe = currentUser && (currentUser.uid === user.uid || currentUser.displayName === user.displayName);
                  const isUserFollowing = !!followingMap[user.uid];

                  return (
                    <div 
                      key={user.uid} 
                      className="cp-p-modal-row" 
                      onClick={() => { navigate(`/profile/${user.uid}`); setActiveModal(null); setSearchQuery(''); }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="cp-p-modal-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                        ) : (
                          <div className="cp-p-modal-avatar">
                            {user.displayName?.substring(0, 2).toUpperCase() || 'OP'}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="cp-p-modal-name" style={{ fontFamily: 'var(--cyber-font-title)', fontSize: '0.78rem', fontWeight: 'bold' }}>
                            {user.displayName}
                          </span>
                          <span className={`cp-p-rank-badge ${user.rank?.toLowerCase() || 'beginner'}`} style={{ fontSize: '0.52rem', padding: '2px 4px', width: 'fit-content', marginTop: '2px' }}>
                            {user.rank || 'Expert'}
                          </span>
                        </div>
                      </div>

                      {/* Follow toggle button next to each user item */}
                      {!isMe && currentUser && (
                        <button
                          onClick={(e) => handleModalFollowToggle(e, user.uid)}
                          className={isUserFollowing ? "cp-btn-unfollow" : "cp-btn-follow"}
                          style={{ padding: '4px 8px', fontSize: '0.55rem', letterSpacing: '0.5px' }}
                        >
                          {isUserFollowing ? "DISCONNECT" : "CONNECT"}
                        </button>
                      )}
                      {isMe && (
                        <span style={{ fontSize: '0.58rem', color: 'var(--cyber-green)', fontFamily: 'var(--cyber-font-title)' }}>[YOU]</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        opponentName={profile.displayName || profile.username}
        onSubmit={handleInitiateChallenge}
      />

    </div>
  );
};

export default Profile;
