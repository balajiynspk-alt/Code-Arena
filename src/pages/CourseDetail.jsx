import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { getCourseById, getCourseProgress, markLessonComplete, checkCourseCompletion } from '../services/courseService';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { checkAndAwardBadges } from '../utils/badgeChecker';
import './CourseDetail.css';

const CourseDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const currentUser = auth.currentUser;

  const [activeLesson, setActiveLesson] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState([0]);
  const [quizSelection, setQuizSelection] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseById(id)
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', currentUser?.uid, id],
    queryFn: () => getCourseProgress(currentUser?.uid, id),
    enabled: !!currentUser
  });

  useEffect(() => {
    if (course && !activeLesson && course.chapters?.[0]?.lessons?.[0]) {
      setActiveLesson(course.chapters[0].lessons[0]);
    }
  }, [course, activeLesson]);

  const completeMutation = useMutation({
    mutationFn: async ({ lessonId, isQuiz, score }) => {
      await markLessonComplete(currentUser.uid, id, lessonId, isQuiz, score);
      
      const totalLessons = course.chapters.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0);
      await checkCourseCompletion(currentUser.uid, id, totalLessons);
      
      // Re-evaluate gamification
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        await checkAndAwardBadges(currentUser.uid, userDoc.data());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', currentUser?.uid, id] });
    }
  });

  if (courseLoading || progressLoading) return <div className="loading">Loading...</div>;
  if (!course) return <div className="error">Course not found.</div>;

  const totalLessonsCount = course.chapters.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0);
  const completedLessons = progress?.completedLessons || [];
  const progressPercent = totalLessonsCount === 0 ? 0 : (completedLessons.length / totalLessonsCount) * 100;

  const handleLessonSelect = (lesson) => {
    setActiveLesson(lesson);
    setQuizSelection(null);
    setQuizSubmitted(false);
  };

  const toggleChapter = (index) => {
    if (expandedChapters.includes(index)) {
      setExpandedChapters(expandedChapters.filter(i => i !== index));
    } else {
      setExpandedChapters([...expandedChapters, index]);
    }
  };

  const handleComplete = () => {
    if (!activeLesson || !currentUser) return;
    completeMutation.mutate({ lessonId: activeLesson.id, isQuiz: false });
  };

  const submitQuiz = () => {
    if (quizSelection === null || !activeLesson || !currentUser) return;
    setQuizSubmitted(true);
    
    // Check if correct
    const isCorrect = quizSelection === activeLesson.content.correctOption;
    if (isCorrect) {
      completeMutation.mutate({ lessonId: activeLesson.id, isQuiz: true, score: 100 });
    }
  };

  const renderLessonContent = () => {
    if (!activeLesson) return null;

    if (activeLesson.type === 'video') {
      return (
        <div className="video-container">
          <ReactPlayer 
            url={activeLesson.youtubeId ? `https://www.youtube.com/watch?v=${activeLesson.youtubeId}` : ''}
            width="100%"
            height="100%"
            controls
            onEnded={handleComplete}
          />
        </div>
      );
    }

    if (activeLesson.type === 'article') {
      return (
        <div className="article-content">
          <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
        </div>
      );
    }

    if (activeLesson.type === 'quiz') {
      const isCorrect = quizSelection === activeLesson.content.correctOption;
      
      return (
        <div className="quiz-container">
          <h3>{activeLesson.content.question}</h3>
          <div className="quiz-options">
            {activeLesson.content.options.map((opt, idx) => {
              let className = 'quiz-option';
              if (quizSelection === idx) className += ' selected';
              if (quizSubmitted) {
                if (idx === activeLesson.content.correctOption) className += ' correct';
                else if (quizSelection === idx && !isCorrect) className += ' wrong';
              }

              return (
                <div 
                  key={idx} 
                  className={className}
                  onClick={() => !quizSubmitted && setQuizSelection(idx)}
                >
                  {opt}
                </div>
              );
            })}
          </div>
          
          {quizSubmitted && (
            <div style={{ marginTop: '20px', fontWeight: 'bold', color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
              {isCorrect ? 'Correct! Lesson completed.' : 'Incorrect, try again.'}
            </div>
          )}
          
          {!quizSubmitted && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '24px' }}
              onClick={submitQuiz}
              disabled={quizSelection === null}
            >
              Submit Answer
            </button>
          )}
        </div>
      );
    }
    
    return null;
  };

  const isCompleted = completedLessons.includes(activeLesson?.id);

  return (
    <div className="course-detail-container">
      {/* Sidebar */}
      <div className="course-sidebar">
        <div className="sidebar-header">
          <h2>{course.title}</h2>
          <div className="progress-wrapper">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="progress-text">{completedLessons.length} / {totalLessonsCount} completed ({Math.round(progressPercent)}%)</div>
        </div>

        <div className="chapters-list">
          {course.chapters.map((chapter, cIdx) => (
            <div key={cIdx} className="chapter-item">
              <div className="chapter-title" onClick={() => toggleChapter(cIdx)}>
                <span>{chapter.title}</span>
                <span>{expandedChapters.includes(cIdx) ? '▼' : '▶'}</span>
              </div>
              
              {expandedChapters.includes(cIdx) && (
                <div className="lessons-list">
                  {chapter.lessons?.map((lesson) => {
                    const isActive = activeLesson?.id === lesson.id;
                    const isLessonCompleted = completedLessons.includes(lesson.id);
                    
                    return (
                      <div 
                        key={lesson.id} 
                        className={`lesson-item ${isActive ? 'active' : ''} ${isLessonCompleted ? 'completed' : ''}`}
                        onClick={() => handleLessonSelect(lesson)}
                      >
                        <span className="lesson-icon">
                          {lesson.type === 'video' ? '▶️' : lesson.type === 'article' ? '📄' : '❓'}
                        </span>
                        <span>{lesson.title}</span>
                        {isLessonCompleted && <span className="lesson-check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="lesson-content-area">
        {activeLesson && (
          <>
            <div className="lesson-header">
              <h1>{activeLesson.title}</h1>
              {isCompleted ? (
                <span className="badge easy">✓ Completed</span>
              ) : (
                <span className="badge topic">In Progress</span>
              )}
            </div>
            
            <div className="lesson-body">
              {renderLessonContent()}
              
              {activeLesson.type === 'article' && (
                <div className="lesson-actions">
                  <button 
                    className={`btn ${isCompleted ? 'btn-success' : 'btn-primary'}`}
                    onClick={handleComplete}
                    disabled={isCompleted || completeMutation.isPending}
                  >
                    {isCompleted ? 'Completed' : completeMutation.isPending ? 'Marking...' : 'Mark as Complete'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
