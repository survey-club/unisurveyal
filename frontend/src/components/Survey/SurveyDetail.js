import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SurveyDetail.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [userSurvey, setUserSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurvey();
    recordActivity();
  }, [id]);

  const recordActivity = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${SURVEY_API_URL}/activity/record`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to record activity:', err);
    }
  };

  const loadSurvey = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await axios.get(`${SURVEY_API_URL}/surveys/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSurvey(response.data.survey);
      setUserSurvey(response.data.user_survey);
    } catch (err) {
      console.error('Failed to load survey:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!userSurvey) {
      console.log('보관함에 추가된 논문만 상태를 변경할 수 있습니다.');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      await axios.put(
        `${SURVEY_API_URL}/surveys/${userSurvey.id}/status?new_status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserSurvey(prev => ({ ...prev, status: newStatus }));
      loadSurvey(); // 새로고침
    } catch (err) {
      console.error('Failed to update status:', err);
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

  if (loading) {
    return (
      <div className="survey-detail-container">
        <div className="loading-container">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="survey-detail-container">
        <div className="error-container">
          <p>논문을 찾을 수 없습니다.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    // 이전 페이지가 있으면 뒤로가기, 없으면 홈으로
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="survey-detail-container page-fade-in">
      {/* 헤더 */}
      <header className="detail-header">
        <button onClick={handleBack} className="btn-back">
          ← 뒤로가기
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="detail-main">
        <div className="detail-emoji">
          {getEmojiForCategory(survey.categories)}
        </div>

        <h1 className="detail-title">{survey.title}</h1>

        <div className="detail-meta">
          <span className="meta-item">📅 {survey.published_date}</span>
          <span className="meta-item">👁️ {survey.view_count || 0} views</span>
          <span className="meta-item">🏷️ {survey.categories}</span>
        </div>

        {/* 키워드 */}
        {survey.keywords && (
          <div className="detail-section">
            <h2>🔍 키워드</h2>
            <div className="keywords-container">
              {survey.keywords.split(',').map((keyword, idx) => (
                <span key={idx} className="badge">{keyword.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* 저자 */}
        <div className="detail-section">
          <h2>✍️ 저자</h2>
          <p className="authors-text">{survey.authors}</p>
        </div>

        {/* Abstract */}
        <div className="detail-section">
          <h2>📝 Abstract</h2>
          <div className="abstract-box">
            <p>{survey.abstract}</p>
          </div>
        </div>

        {/* 상태 변경 */}
        {userSurvey && (
          <div className="detail-section">
            <h2>📊 논문 상태</h2>
            <div className="status-buttons">
              <button
                className={`status-btn ${userSurvey.status === 'recommended' ? 'active' : ''}`}
                onClick={() => handleStatusChange('recommended')}
              >
                📌 추천받음
              </button>
              <button
                className={`status-btn ${userSurvey.status === 'reading' ? 'active' : ''}`}
                onClick={() => handleStatusChange('reading')}
              >
                📖 읽는 중
              </button>
              <button
                className={`status-btn ${userSurvey.status === 'completed' ? 'active' : ''}`}
                onClick={() => handleStatusChange('completed')}
              >
                ✅ 완료
              </button>
            </div>
          </div>
        )}

        {/* ArXiv 링크 & PDF 다운로드 */}
        <div className="detail-actions">
          <a
            href={survey.pdf_url?.replace('/pdf/', '/abs/')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary arxiv-btn"
          >
            📄 ArXiv에서 보기
          </a>
          <a
            href={survey.pdf_url}
            download
            className="btn btn-secondary"
          >
            💾 PDF 다운로드
          </a>
        </div>
      </main>
    </div>
  );
}

export default SurveyDetail;
