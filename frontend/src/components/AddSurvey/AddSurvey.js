import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddSurvey.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function AddSurvey({ mode: initialMode }) {
  const [mode, setMode] = useState(initialMode || null); // null, 'search', 'recommend'
  const [searchQuery, setSearchQuery] = useState('');
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveys, setSelectedSurveys] = useState([]); // 선택된 논문들
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('relevance'); // 'date', 'relevance'
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();

  // URL에 따라 mode 설정 및 자동 실행
  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);

      // 저장된 검색 결과 복원 시도
      const savedState = sessionStorage.getItem(`addSurvey_${initialMode}`);
      if (savedState) {
        const { surveys: savedSurveys, searchQuery: savedQuery, selectedSurveys: savedSelected, viewMode: savedViewMode, sortBy: savedSortBy } = JSON.parse(savedState);
        setSurveys(savedSurveys);
        if (savedQuery) setSearchQuery(savedQuery);
        if (savedSelected) setSelectedSurveys(savedSelected);
        if (savedViewMode) setViewMode(savedViewMode);
        if (savedSortBy) setSortBy(savedSortBy);
        return; // 복원했으면 API 호출 안 함
      }

      // recommend 모드일 때 자동으로 추천 시작
      if (initialMode === 'recommend') {
        handleRecommend();
      }
    }
  }, [initialMode]);

  // 스크롤 이벤트 감지
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // selectedSurveys, viewMode, sortBy 변경될 때마다 sessionStorage 업데이트
  React.useEffect(() => {
    if (mode && surveys.length > 0) {
      const savedState = sessionStorage.getItem(`addSurvey_${mode}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        sessionStorage.setItem(`addSurvey_${mode}`, JSON.stringify({
          ...parsed,
          selectedSurveys,
          viewMode,
          sortBy
        }));
      }
    }
  }, [selectedSurveys, viewMode, sortBy, mode, surveys]);

  // 직접 검색
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${SURVEY_API_URL}/search`, {
        params: { q: searchQuery, max_results: 500 },
        headers: { Authorization: `Bearer ${token}` }
      });

      // 원본 순서(관련순) 저장을 위해 인덱스 추가
      const surveysWithIndex = response.data.map((survey, index) => ({
        ...survey,
        originalIndex: index
      }));
      setSurveys(surveysWithIndex);

      // 검색 결과 저장 (뒤로가기 시 복원용)
      sessionStorage.setItem('addSurvey_search', JSON.stringify({
        surveys: surveysWithIndex,
        searchQuery,
        selectedSurveys: [],
        viewMode: 'grid',
        sortBy: 'relevance'
      }));
    } catch (err) {
      console.error('Search failed:', err);
      setError('검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 추천받기 (100개 가져오기)
  const handleRecommend = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${SURVEY_API_URL}/recommend/personalized`,
        {},
        {
          params: { top_n: 500 }, // 500개 가져오기
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // similarity_score와 원본 인덱스를 survey 객체에 포함
      const surveysWithIndex = response.data.map((item, index) => ({
        ...item.survey,
        similarity_score: item.similarity_score,
        originalIndex: index
      }));
      setSurveys(surveysWithIndex);

      // 추천 결과 저장 (뒤로가기 시 복원용)
      sessionStorage.setItem('addSurvey_recommend', JSON.stringify({
        surveys: surveysWithIndex,
        searchQuery: '',
        selectedSurveys: [],
        viewMode: 'grid',
        sortBy: 'relevance'
      }));
    } catch (err) {
      console.error('Recommendation failed:', err);
      if (err.response?.status === 400) {
        setError('최소 5개 이상의 논문을 읽어야 개인화 추천을 받을 수 있습니다.');
      } else {
        setError('추천에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // 선택 취소
    setSelectedSurveys([]);
  };

  const handleSaveSurvey = async (surveyId) => {
    const token = localStorage.getItem('token');

    // 이미 선택된 논문이면 삭제
    if (selectedSurveys.includes(surveyId)) {
      try {
        await axios.delete(
          `${SURVEY_API_URL}/surveys/${surveyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedSurveys(prev => prev.filter(id => id !== surveyId));
      } catch (err) {
        console.error('Failed to remove survey:', err);
        if (err.response?.status === 404) {
          // 이미 삭제된 경우 UI만 업데이트
          setSelectedSurveys(prev => prev.filter(id => id !== surveyId));
        }
      }
      return;
    }

    // 선택되지 않은 논문이면 추가
    // 사용자 기반 추천에서 저장하면 'recommended', 검색에서 저장하면 'saved'
    const status = mode === 'recommend' ? 'recommended' : 'saved';

    try {
      await axios.post(
        `${SURVEY_API_URL}/surveys/add`,
        { survey_id: surveyId, status: status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // 저장 성공하면 선택된 목록에 추가
      setSelectedSurveys(prev => [...prev, surveyId]);
    } catch (err) {
      console.error('Failed to save survey:', err);
      if (err.response?.status === 400) {
        // 이미 보관함에 있는 경우 체크 표시만
        setSelectedSurveys(prev => [...prev, surveyId]);
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

  const getCategoryName = (categories) => {
    if (!categories) return 'General';
    const cat = categories.toLowerCase();
    if (cat.includes('cv') || cat.includes('vision')) return 'Computer Vision';
    if (cat.includes('cl') || cat.includes('nlp')) return 'NLP';
    if (cat.includes('lg') || cat.includes('learning')) return 'Machine Learning';
    if (cat.includes('ai')) return 'AI';
    return 'General';
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="add-survey-container page-fade-in">
      <header className="add-survey-header">
        <button
          className="btn-back"
          onClick={() => {
            if (mode) {
              setMode(null);
              setSurveys([]);
              setSearchQuery('');
              setError('');
            } else {
              navigate('/home');
            }
          }}
        >
          ← {mode ? '뒤로가기' : '홈으로'}
        </button>
        <h1>새 논문 추가하기</h1>
      </header>

      <div className="add-survey-content">
        {!mode && (
          <div className="mode-selection">
            <div className="mode-card" onClick={() => navigate('/add-survey/direct')}>
              <div className="mode-icon">🔍</div>
              <h2>직접 검색</h2>
              <p>키워드로 ArXiv에서<br/>Survey 논문을 검색합니다</p>
            </div>

            <div
              className="mode-card"
              onClick={() => navigate('/add-survey/recommend')}
            >
              <div className="mode-icon">✨</div>
              <h2>사용자 기반 추천받기</h2>
              <p>완료한 논문 5개 이상 필요<br/>유사한 논문을 추천받습니다</p>
            </div>
          </div>
        )}

        {mode === 'search' && (
          <div className="search-mode">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="키워드를 입력하세요 (예: machine learning, transformer)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '검색 중...' : '🔍 검색'}
                </button>
              </div>
            </form>
          </div>
        )}

        {((mode === 'search' && surveys.length > 0) || (mode === 'recommend' && surveys.length > 0)) && !loading && (
          <div className="results-header">
            <h2>
              {mode === 'recommend' ? '추천 논문' : '검색 결과'} ({surveys.length}개)
              {mode === 'recommend' && selectedSurveys.length > 0 && (
                <span className="selected-count"> - {selectedSurveys.length}개 선택됨</span>
              )}
            </h2>
            <div className="results-controls">
              {mode === 'search' && (
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="relevance">관련순</option>
                  <option value="date">날짜순</option>
                </select>
              )}
              <div className="view-controls">
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="목록형"
                >
                  ☰
                </button>
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="블록형"
                >
                  ⊞
                </button>
              </div>
              {mode === 'recommend' && selectedSurveys.length > 0 && (
                <button className="btn btn-secondary" onClick={handleReset}>
                  ✕ 선택 취소
                </button>
              )}
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {mode === 'recommend' && !loading && !error && (
          <section className="recommendation-info-section">
            <div className="info-card">
              <h3>🤖 개인화 추천 시스템 동작 원리</h3>
              <div className="info-content">
                <div className="info-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>ML/DL Survey 논문 수집</h4>
                    <p>ArXiv에서 초록에 "deep learning" 또는 "machine learning"이 포함되고, 제목에 "survey", "comprehensive", "a review" 중 하나가 포함된 논문 500개를 가져옵니다.</p>
                  </div>
                </div>
                <div className="info-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>TF-IDF 벡터화 & 코사인 유사도</h4>
                    <p>완료한 논문들과 후보 논문들의 제목·초록을 TF-IDF로 벡터화한 후, 코사인 유사도를 계산합니다.</p>
                    <div className="formula">
                      <strong>추천지수 계산식:</strong><br/>
                      <code>similarity = cos(θ) = (A · B) / (||A|| × ||B||)</code><br/>
                      <small>A: 읽은 논문들의 평균 벡터, B: 후보 논문 벡터</small>
                    </div>
                  </div>
                </div>
                <div className="info-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>유사도 순 정렬</h4>
                    <p>코사인 유사도가 높은 순서대로 논문을 정렬하여 추천합니다. 추천지수는 0~100점으로 표시됩니다.</p>
                  </div>
                </div>
              </div>
              <div className="info-note">
                💡 <strong>최소 5개 이상의 논문을 완료해야</strong> 개인화 추천을 받을 수 있습니다. 더 많은 논문을 읽을수록 추천 정확도가 향상됩니다!
              </div>
            </div>
          </section>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loader"></div>
            <p>{mode === 'recommend' ? 'TF-IDF + Cosine Similarity로 유사 논문을 분석하고 있습니다...' : 'ArXiv에서 논문을 검색하고 있습니다...'}</p>
          </div>
        )}

        {!loading && surveys.length > 0 && (() => {
          // 추천 모드는 정렬 없음 (이미 유사도 순), 검색 모드만 정렬
          const sortedSurveys = mode === 'recommend' ? surveys : [...surveys].sort((a, b) => {
            if (sortBy === 'date') {
              return new Date(b.published_date) - new Date(a.published_date);
            } else if (sortBy === 'relevance') {
              // 원본 순서(ArXiv Relevance)로 정렬
              return (a.originalIndex || 0) - (b.originalIndex || 0);
            }
            return 0;
          });

          // 순위 계산 함수
          const getRankSuffix = (rank) => {
            if (rank === 1) return 'st';
            if (rank === 2) return 'nd';
            if (rank === 3) return 'rd';
            return 'th';
          };

          return (
            <>
              <div className={`surveys-container ${viewMode}`}>
                {sortedSurveys.map((survey, index) => (
                  <div
                    key={survey.id}
                    className={`survey-card ${selectedSurveys.includes(survey.id) ? 'selected' : ''}`}
                    onClick={() => navigate(`/survey/${survey.id}?increase_view=false`)}
                  >
                    <div
                      className="checkbox-wrapper"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSurvey(survey.id);
                      }}
                      title="보관하기"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSurveys.includes(survey.id)}
                        readOnly
                      />
                    </div>
                    {mode === 'recommend' && (
                      <div className="rank-badge">
                        {index + 1}<sup>{getRankSuffix(index + 1)}</sup>
                      </div>
                    )}
                    <div className="survey-category-section">
                      <div className="survey-emoji">
                        {getEmojiForCategory(survey.categories)}
                      </div>
                      <div className="category-name">
                        {getCategoryName(survey.categories)}
                      </div>
                    </div>
                    <div className="survey-content">
                      <h3 className="survey-title">{survey.title}</h3>

                      {viewMode === 'list' && (
                        <p className="survey-abstract">
                          {survey.abstract?.substring(0, 150)}...
                        </p>
                      )}

                      <div className="survey-keywords">
                        {survey.keywords?.split(',').slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="badge">{keyword.trim()}</span>
                        ))}
                      </div>

                      <div className="survey-meta">
                        <span className="survey-date">
                          📅 {new Date(survey.published_date).toLocaleDateString('ko-KR')}
                        </span>
                        <span className="view-count">👁️ {survey.view_count || 0}</span>
                        {mode === 'recommend' && survey.similarity_score !== undefined && (
                          <span className="recommendation-score-value" title="TF-IDF + Cosine Similarity 기반 추천지수">
                            🎯 추천지수: {survey.similarity_score.toFixed(1)}점
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 맨위로가기 버튼 */}
              {showScrollTop && (
                <button className="scroll-to-top" onClick={scrollToTop} title="맨 위로">
                  ↑
                </button>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

export default AddSurvey;
