import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProblems, getUserSolvedProblems } from '../services/problemService';
import './Problems.css';
import { auth } from '../services/firebase';

const TOPICS = ['Arrays', 'Strings', 'Trees', 'DP', 'Graphs'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const Problems = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  
  // Real active filters from URL
  const searchFilter = searchParams.get('search') || '';
  const difficultyFilter = searchParams.get('difficulty') || 'All';
  const topicsFilter = searchParams.get('topic') ? searchParams.get('topic').split(',') : [];

  const [lastDocs, setLastDocs] = useState([]); // Stack for backwards pagination
  const [currentLastDoc, setCurrentLastDoc] = useState(null);
  const [page, setPage] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchInput) {
        newParams.set('search', searchInput);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
      // Reset pagination on filter change
      setPage(0);
      setCurrentLastDoc(null);
      setLastDocs([]);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['problems', difficultyFilter, topicsFilter, page],
    queryFn: () => getProblems({ difficulty: difficultyFilter, topics: topicsFilter }, currentLastDoc),
    keepPreviousData: true
  });

  const currentUser = auth.currentUser;
  
  const { data: solvedProblems = [] } = useQuery({
    queryKey: ['solvedProblems', currentUser?.uid],
    queryFn: () => getUserSolvedProblems(currentUser?.uid),
    enabled: !!currentUser
  });

  const handleDifficultyChange = (e) => {
    const newParams = new URLSearchParams(searchParams);
    if (e.target.value === 'All') {
      newParams.delete('difficulty');
    } else {
      newParams.set('difficulty', e.target.value);
    }
    setSearchParams(newParams);
    resetPagination();
  };

  const handleTopicChange = (topic) => {
    const newParams = new URLSearchParams(searchParams);
    let newTopics = [...topicsFilter];
    
    if (newTopics.includes(topic)) {
      newTopics = newTopics.filter(t => t !== topic);
    } else {
      newTopics.push(topic);
    }

    if (newTopics.length > 0) {
      newParams.set('topic', newTopics.join(','));
    } else {
      newParams.delete('topic');
    }
    setSearchParams(newParams);
    resetPagination();
  };

  const resetPagination = () => {
    setPage(0);
    setCurrentLastDoc(null);
    setLastDocs([]);
  };

  const handleNextPage = () => {
    if (data?.lastDoc) {
      setLastDocs([...lastDocs, currentLastDoc]);
      setCurrentLastDoc(data.lastDoc);
      setPage(p => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      const newLastDocs = [...lastDocs];
      const prevDoc = newLastDocs.pop();
      setLastDocs(newLastDocs);
      setCurrentLastDoc(prevDoc);
      setPage(p => p - 1);
    }
  };

  // Client side search filtering since Firestore doesn't do substring matching easily without third-party services
  const filteredProblems = useMemo(() => {
    if (!data?.problems) return [];
    if (!searchFilter) return data.problems;
    return data.problems.filter(p => 
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
      p.number.toString().includes(searchFilter)
    );
  }, [data?.problems, searchFilter]);

  return (
    <div className="problems-container">
      <aside className="filters-sidebar">
        <div className="filter-section">
          <h3>Difficulty</h3>
          <label className="checkbox-label">
            <input 
              type="radio" 
              name="difficulty" 
              value="All" 
              checked={difficultyFilter === 'All'}
              onChange={handleDifficultyChange}
            /> All
          </label>
          {DIFFICULTIES.map(diff => (
            <label key={diff} className="checkbox-label">
              <input 
                type="radio" 
                name="difficulty" 
                value={diff} 
                checked={difficultyFilter === diff}
                onChange={handleDifficultyChange}
              /> {diff}
            </label>
          ))}
        </div>

        <div className="filter-section">
          <h3>Topics</h3>
          {TOPICS.map(topic => (
            <label key={topic} className="checkbox-label">
              <input 
                type="checkbox" 
                checked={topicsFilter.includes(topic)}
                onChange={() => handleTopicChange(topic)}
              /> {topic}
            </label>
          ))}
        </div>
      </aside>

      <div className="problems-content">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search problems by title or number..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="loading">Loading problems...</div>
        ) : isError ? (
          <div className="error">Error loading problems: {error.message}</div>
        ) : filteredProblems.length === 0 ? (
          <div className="no-results">No problems match your criteria.</div>
        ) : (
          <>
            <table className="problems-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>#</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Topics</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map(problem => (
                  <tr key={problem.id}>
                    <td>
                      {solvedProblems.includes(problem.id) ? (
                        <span style={{ color: 'var(--success)' }}>✓ Solved</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>{problem.number}</td>
                    <td>
                      <Link to={`/problems/${problem.id}`} className="problem-link">
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td>
                      {problem.topics?.map(t => (
                        <span key={t} className="badge topic">{t}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button 
                className="btn btn-primary" 
                onClick={handlePrevPage} 
                disabled={page === 0}
              >
                Previous
              </button>
              <span>Page {page + 1}</span>
              <button 
                className="btn btn-primary" 
                onClick={handleNextPage} 
                disabled={!data?.lastDoc || data.problems.length < 20}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Problems;
