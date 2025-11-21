import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Search.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${SURVEY_API_URL}/search`, {
        params: { q: searchQuery, max_results: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });

      setSurveys(response.data);
    } catch (err) {
      console.error('Search failed:', err);
      setError('검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSurvey = async (surveyId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${SURVEY_API_URL}/surveys/add`,
        { survey_id: surveyId, status: 'recommended' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('논문이 보관함에 추가되었습니다!');
    } catch (err) {
      console.error('Failed to save survey:', err);
      if (err.response?.status === 400) {
        alert('이미 보관함에 있는 논문입니다.');
      } else {
        alert('논문 저장에 실패했습니다.');
      }
    }
  };

  const getEmojiForCategory = (categories) => {
    if (!categories) return '📄';
    const cat = categories.toLowerCase();
    if (cat.includes('cv') || cat.includes('vision')) return '👁️';
    if (cat.includes('cl') || cat.includes('nlp')) return '💬';
    if (cat.includes('lg') || cat.includes('learning')) return '🤖';
    if (cat.includes('ai')) return '🧠';
    return '📄';
  };

  return (
    <div className="search-container page-fade-in">
      <header className="search-header">
        <button className="btn-back" onClick={() => navigate('/home')}>
          ← 홈으로
        </button>
        <h1>논문 검색</h1>
      </header>

      <div className="search-content">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="키워드를 입력하세요 (예: machine learning, computer vision)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
              {loading ? '검색 중...' : '🔍 검색'}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <div className="loading-container">
            <div className="loader"></div>
            <p>ArXiv에서 논문을 검색하고 있습니다...</p>
          </div>
        )}

        {!loading && hasSearched && surveys.length === 0 && (
          <div className="no-results">
            <p>검색 결과가 없습니다.</p>
            <p>다른 키워드로 검색해보세요.</p>
          </div>
        )}

        {!loading && surveys.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <h2>검색 결과 ({surveys.length}개)</h2>
            </div>

            <div className="surveys-grid">
              {surveys.map((survey) => (
                <div key={survey.id} className="survey-card">
                  <div className="survey-card-header">
                    <span className="survey-emoji">{getEmojiForCategory(survey.categories)}</span>
                    <div className="survey-meta">
                      <span className="survey-date">
                        {new Date(survey.published_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  <h3
                    className="survey-title"
                    onClick={() => navigate(`/survey/${survey.id}`)}
                  >
                    {survey.title}
                  </h3>

                  <p className="survey-abstract">
                    {survey.abstract?.substring(0, 200)}...
                  </p>

                  <div className="survey-tags">
                    {survey.categories?.split(',').slice(0, 3).map((cat, idx) => (
                      <span key={idx} className="tag">{cat.trim()}</span>
                    ))}
                  </div>

                  <div className="survey-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigate(`/survey/${survey.id}`)}
                    >
                      자세히 보기
                    </button>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleSaveSurvey(survey.id)}
                    >
                      📚 보관하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasSearched && (
          <div className="search-placeholder">
            <div className="placeholder-icon">🔍</div>
            <h2>AI/ML Survey 논문을 검색하세요</h2>
            <p>ArXiv에서 최신 Survey 논문을 실시간으로 검색합니다.</p>
            <div className="search-tips">
              <h3>검색 팁</h3>
              <ul>
                <li>영문 키워드로 검색하세요 (예: deep learning, transformer)</li>
                <li>여러 키워드를 함께 입력하면 더 정확한 결과를 얻을 수 있습니다</li>
                <li>Survey 논문만 검색됩니다</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
