import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Recommend.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function Recommend() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSurveys, setSelectedSurveys] = useState([]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // 1. 사용자 통계 확인
      const statsResponse = await axios.get(`${SURVEY_API_URL}/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data);

      // 2. 완료한 논문이 5개 이상이면 개인화 추천, 아니면 초기 추천
      if (statsResponse.data.completed_surveys >= 5) {
        // 개인화 추천
        const recResponse = await axios.post(
          `${SURVEY_API_URL}/recommend/personalized`,
          { top_n: 20 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecommendations(recResponse.data);
      } else {
        // 초기 추천 (관심 분야 기반)
        const userData = JSON.parse(localStorage.getItem('user'));
        const fields = userData?.interest_fields || [];

        if (fields.length > 0) {
          const recResponse = await axios.post(
            `${SURVEY_API_URL}/recommend/initial`,
            { fields },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setRecommendations(recResponse.data);
        }
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSurveySelection = (surveyId) => {
    setSelectedSurveys(prev =>
      prev.includes(surveyId)
        ? prev.filter(id => id !== surveyId)
        : [...prev, surveyId]
    );
  };

  const handleAddToLibrary = async () => {
    if (selectedSurveys.length === 0) {
      alert('추가할 논문을 선택해주세요.');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      for (const surveyId of selectedSurveys) {
        await axios.post(
          `${SURVEY_API_URL}/surveys/add`,
          { survey_id: surveyId, status: 'recommended' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert(`${selectedSurveys.length}개의 논문이 라이브러리에 추가되었습니다!`);
      navigate('/home');
    } catch (err) {
      console.error('Failed to add surveys:', err);
      alert('논문 추가에 실패했습니다.');
    }
  };

  const getEmojiForCategory = (categories) => {
    if (!categories) return '📄';
    const cat = categories.toLowerCase();
    if (cat.includes('cv') || cat.includes('vision')) return '👁️';
    if (cat.includes('cl') || cat.includes('nlp')) return '💬';
    if (cat.includes('lg') || cat.includes('learning')) return '🤖';
    if (cat.includes('ai')) return '🧠';
    if (cat.includes('ro') || cat.includes('robot')) return '🤖';
    if (cat.includes('as') || cat.includes('audio')) return '🎵';
    return '📄';
  };

  const isPersonalized = stats && stats.completed_surveys >= 5;

  return (
    <div className="recommend-container page-fade-in">
      {/* 헤더 */}
      <header className="recommend-header">
        <div className="header-left">
          <button onClick={() => navigate('/home')} className="btn-back">
            ← 홈으로
          </button>
          <h1>논문 추천</h1>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="recommend-main">
        {loading ? (
          <div className="loading-container">
            <div className="loader"></div>
          </div>
        ) : (
          <>
            {/* 추천 헤더 */}
            <div className="recommend-info">
              <div className="info-left">
                <h2>
                  {isPersonalized ? '🎯 맞춤 추천' : '📚 초기 추천'}
                </h2>
                <p className="info-description">
                  {isPersonalized
                    ? `읽은 논문 ${stats.completed_surveys}개를 기반으로 유사한 논문을 추천합니다`
                    : `관심 분야를 기반으로 추천합니다 (${5 - stats.completed_surveys}개 더 읽으면 맞춤 추천이 활성화됩니다)`
                  }
                </p>
              </div>
              <div className="info-right">
                <div className="view-controls">
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    ☰
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    ⊞
                  </button>
                </div>
              </div>
            </div>

            {/* 추천 결과 */}
            {recommendations.length > 0 ? (
              <>
                <div className={`recommendations-container ${viewMode}`}>
                  {recommendations.map((item) => {
                    const survey = item.survey || item;
                    const similarity = item.similarity_score;
                    const isSelected = selectedSurveys.includes(survey.id);

                    return (
                      <div
                        key={survey.id}
                        className={`recommendation-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="card-header">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSurveySelection(survey.id)}
                            className="survey-checkbox"
                          />
                          {isPersonalized && similarity && (
                            <div className="similarity-badge">
                              {Math.round(similarity * 100)}% 유사
                            </div>
                          )}
                        </div>

                        <div
                          className="card-content"
                          onClick={() => navigate(`/survey/${survey.id}`)}
                        >
                          <div className="card-emoji">
                            {getEmojiForCategory(survey.categories)}
                          </div>
                          <div className="card-body">
                            <h3 className="card-title">{survey.title}</h3>
                            <div className="card-keywords">
                              {survey.keywords?.split(',').slice(0, 3).map((keyword, idx) => (
                                <span key={idx} className="badge">{keyword.trim()}</span>
                              ))}
                            </div>
                            <div className="card-meta">
                              <span className="meta-item">👁️ {survey.view_count || 0}</span>
                              <span className="meta-item">📅 {survey.published_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 액션 버튼 */}
                <div className="recommend-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleAddToLibrary}
                    disabled={selectedSurveys.length === 0}
                  >
                    ✅ 선택한 논문 추가 ({selectedSurveys.length})
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={loadRecommendations}
                  >
                    🔄 새로고침
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>추천할 논문이 없습니다.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/profile')}
                >
                  관심 분야 설정하기
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Recommend;
