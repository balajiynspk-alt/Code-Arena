import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCourses, enrollInCourse } from '../services/courseService';
import { auth } from '../services/firebase';
import './Courses.css';

const TRACKS = ['All', 'DSA', 'Aptitude', 'System Design'];

const Courses = () => {
  const [activeTrack, setActiveTrack] = useState('All');
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ['courses', activeTrack],
    queryFn: () => getCourses(activeTrack)
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId) => {
      if (!currentUser) throw new Error("Must be logged in to enroll");
      await enrollInCourse(currentUser.uid, courseId);
      return courseId;
    },
    onSuccess: (courseId) => {
      navigate(`/courses/${courseId}`);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleEnroll = (courseId) => {
    enrollMutation.mutate(courseId);
  };

  const calculateTotalLessons = (chapters) => {
    if (!chapters) return 0;
    return chapters.reduce((total, chapter) => total + (chapter.lessons?.length || 0), 0);
  };

  return (
    <div className="courses-container">
      <div className="courses-header">
        <h1>Learning Tracks</h1>
        <p style={{ color: 'var(--text-muted)' }}>Master new skills with our structured courses.</p>
      </div>

      <div className="track-tabs">
        {TRACKS.map(track => (
          <button 
            key={track}
            className={`track-tab ${activeTrack === track ? 'active' : ''}`}
            onClick={() => setActiveTrack(track)}
          >
            {track}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading">Loading courses...</div>
      ) : isError ? (
        <div className="error">Error loading courses.</div>
      ) : courses?.length === 0 ? (
        <div className="no-results">No courses found for this track.</div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <img src={course.thumbnail || 'https://via.placeholder.com/320x160/1a1d2d/6366f1?text=Course'} alt={course.title} className="course-thumbnail" />
              <div className="course-content">
                <div className="course-meta">
                  <span className={`badge ${course.difficulty?.toLowerCase()}`}>
                    {course.difficulty}
                  </span>
                  <span className="badge topic">{course.track}</span>
                </div>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-description">{course.description}</p>
                <div className="course-footer">
                  <div className="lesson-count">
                    📚 {calculateTotalLessons(course.chapters)} lessons
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
