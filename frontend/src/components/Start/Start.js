import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Start.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function Start() {
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveys, setSelectedSurveys] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
    loadInitialRecommendations();
  }, []);

  const loadUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined') {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
    }
  };

  const loadInitialRecommendations = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');

    try {
      const userStr = localStorage.getItem('user');
      const userData = JSON.parse(userStr);

      // interest_fields가 문자열인 경우 배열로 변환
      let interestFields = [];
      if (userData.interest_fields) {
        if (Array.isArray(userData.interest_fields)) {
          interestFields = userData.interest_fields;
        } else if (typeof userData.interest_fields === 'string') {
          interestFields = userData.interest_fields.split(',').map(f => f.trim()).filter(f => f);
        }
      }

      // 관심 분야가 없으면 기본값 사용
      if (interestFields.length === 0) {
        interestFields = ['Machine Learning', 'Deep Learning'];
      }

      console.log('Sending interest fields:', interestFields);

      const response = await axios.post(
        `${SURVEY_API_URL}/recommend/initial`,
        { fields: interestFields },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSurveys(response.data.slice(0, 10)); // 최대 10개
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      console.error('Error details:', err.response?.data);
      setError('추천 논문을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('선택을 초기화하고 새로운 논문을 추천받으시겠습니까?')) {
      setSelectedSurveys([]);
      loadInitialRecommendations();
    }
  };

  const toggleSurveySelection = (surveyId) => {
    if (selectedSurveys.includes(surveyId)) {
      setSelectedSurveys(selectedSurveys.filter(id => id !== surveyId));
    } else {
      setSelectedSurveys([...selectedSurveys, surveyId]);
    }
  };

  const handleComplete = async () => {
    if (selectedSurveys.length < 5) {
      alert('최소 5개 이상의 논문을 선택해주세요.');
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // 선택한 논문들을 저장
      const savePromises = selectedSurveys.map(surveyId => {
        console.log('Saving survey:', surveyId);
        return axios.post(
          `${SURVEY_API_URL}/surveys/add`,
          { survey_id: surveyId, status: 'recommended' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });

      await Promise.all(savePromises);

      // 초기 추천 완료 플래그 설정
      localStorage.setItem('hasInitialRecommendation', 'true');
      navigate('/home');
    } catch (err) {
      console.error('Failed to save surveys:', err);
      console.error('Error details:', err.response?.data);
      alert('논문 보관에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
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
    <div className="start-container page-fade-in">
      <header className="start-header">
        <h1>환영합니다, {user?.nickname || user?.username}님! 🎉</h1>
        <p className="start-subtitle">
          관심 분야에 맞는 Survey 논문을 추천드립니다. 최소 5개 이상 선택해주세요.
        </p>
      </header>

      <div className="start-content">
        <div className="content-header">
          <div className="selection-status">
            <span className={selectedSurveys.length >= 5 ? 'valid' : 'invalid'}>
              선택: {selectedSurveys.length} / 10 (최소 5개)
            </span>
          </div>
          <div className="controls">
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
            <button className="btn-reset" onClick={handleReset}>
              🔄 Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loader"></div>
            <p>추천 논문을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button className="btn-retry" onClick={loadInitialRecommendations}>
              다시 시도
            </button>
          </div>
        ) : (
          <div className={`surveys-grid ${viewMode}`}>
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`survey-card ${selectedSurveys.includes(survey.id) ? 'selected' : ''}`}
              >
                <div className="survey-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSurveys.includes(survey.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSurveySelection(survey.id);
                    }}
                  />
                </div>
                <div
                  className="survey-clickable"
                  onClick={() => navigate(`/survey/${survey.id}`)}
                >
                  <div className="survey-emoji">
                    {getEmojiForCategory(survey.categories)}
                  </div>
                  <div className="survey-content">
                    <h3 className="survey-title">{survey.title}</h3>
                    <div className="survey-keywords">
                      {survey.keywords?.split(',').slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="badge">{keyword.trim()}</span>
                      ))}
                    </div>
                    <div className="survey-meta">
                      <span>{survey.published?.split('T')[0]}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="start-footer">
        <button
          className="btn-complete"
          onClick={handleComplete}
          disabled={selectedSurveys.length < 5}
        >
          완료하고 시작하기 ({selectedSurveys.length}/10)
        </button>
      </div>
    </div>
  );
}

export default Start;
