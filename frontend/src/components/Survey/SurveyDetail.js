import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SurveyDetail.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://localhost:8002';

function SurveyDetail({ darkMode, toggleDarkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurvey();
  }, [id]);

  const loadSurvey = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(`${SURVEY_API_URL}/surveys/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSurvey(response.data);
    } catch (err) {
      console.error('Failed to load survey:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReadPDF = () => {
    navigate(`/pdf-viewer/${id}`);
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!survey) {
    return <div className="error">Survey를 찾을 수 없습니다.</div>;
  }

  const difficultyMap = {
    '새싹': 'beginner',
    '묘목': 'intermediate',
    '나무': 'advanced'
  };

  const difficultyKey = difficultyMap[survey.difficulty_level] || 'intermediate';

  return (
    <div className="survey-detail-container">
      <header className="survey-detail-header">
        <button onClick={() => navigate('/home')} className="btn btn-secondary">
          ← 홈으로
        </button>
        <button onClick={toggleDarkMode} className="btn btn-secondary">
          {darkMode ? '🌞' : '🌙'}
        </button>
      </header>

      <main className="survey-detail-main">
        <div className="survey-header-section">
          <h1>{survey.title}</h1>
          <div className="survey-meta">
            <span className="meta-item">📅 {survey.published_date}</span>
            <span className="meta-item">👥 {survey.authors}</span>
            <span className="meta-item">🏷️ {survey.categories}</span>
          </div>
        </div>

        <div className="survey-abstract-section">
          <h2>📝 Abstract (영문)</h2>
          <div className="abstract-box">
            <p>{survey.abstract}</p>
          </div>
        </div>

        <div className="survey-abstract-section">
          <h2>🇰🇷 Abstract (번역)</h2>
          <div className="abstract-box">
            <p>{survey.abstract_translation || '번역 중...'}</p>
          </div>
        </div>

        <div className="survey-reading-time-section">
          <h2>⏱️ 예상 읽기 소요 시간</h2>
          <div className="reading-time-bars">
            <div className="reading-time-item">
              <div className="level-icon">🌱</div>
              <div className="level-info">
                <span className="level-name">새싹</span>
                <div className="time-bar beginner">
                  <div className="time-fill" style={{width: '100%'}}></div>
                </div>
                <span className="time-value">{survey.estimated_reading_time_beginner} 분</span>
              </div>
            </div>

            <div className="reading-time-item">
              <div className="level-icon">🌿</div>
              <div className="level-info">
                <span className="level-name">묘목</span>
                <div className="time-bar intermediate">
                  <div className="time-fill" style={{width: '80%'}}></div>
                </div>
                <span className="time-value">{survey.estimated_reading_time_intermediate} 분</span>
              </div>
            </div>

            <div className="reading-time-item">
              <div className="level-icon">🌳</div>
              <div className="level-info">
                <span className="level-name">나무</span>
                <div className="time-bar advanced">
                  <div className="time-fill" style={{width: '60%'}}></div>
                </div>
                <span className="time-value">{survey.estimated_reading_time_advanced} 분</span>
              </div>
            </div>
          </div>
        </div>

        <div className="survey-tags-section">
          <h2>🏷️ 관련 기술</h2>
          <div className="tags-container">
            {survey.tags?.split(',').map((tag, idx) => (
              <span key={idx} className="tech-tag">{tag.trim()}</span>
            ))}
          </div>
        </div>

        <div className="survey-actions">
          <button onClick={handleReadPDF} className="btn btn-primary read-btn">
            📖 읽기 시작하기
          </button>
          <a href={survey.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            🔗 ArXiv에서 보기
          </a>
        </div>
      </main>
    </div>
  );
}

export default SurveyDetail;