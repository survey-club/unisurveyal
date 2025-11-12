import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:8001';
const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://localhost:8002';

function Home({ darkMode, toggleDarkMode, setAuth }) {
  const [user, setUser] = useState(null);
  const [readSurveys, setReadSurveys] = useState([]);
  const [recommendedSurveys, setRecommendedSurveys] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
    loadSurveys();
  }, []);

  const loadUserData = () => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  };

  const loadSurveys = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // 읽은/읽고 있는 Survey 조회
      const readResponse = await axios.get(`${SURVEY_API_URL}/surveys/user?status_filter=reading`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const completedResponse = await axios.get(`${SURVEY_API_URL}/surveys/user?status_filter=completed`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReadSurveys([...readResponse.data, ...completedResponse.data]);

      // 추천받은 Survey 조회
      const recommendedResponse = await axios.get(`${SURVEY_API_URL}/surveys/user?status_filter=recommended`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRecommendedSurveys(recommendedResponse.data);
    } catch (err) {
      console.error('Failed to load surveys:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(false);
    navigate('/login');
  };

  const handleSurveyClick = (surveyId) => {
    navigate(`/survey/${surveyId}`);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>AI Survey Platform</h1>
        <div className="header-actions">
          <span className="user-name">환영합니다, {user?.username}님</span>
          <button onClick={toggleDarkMode} className="btn btn-secondary">
            {darkMode ? '🌞 라이트' : '🌙 다크'}
          </button>
          <button onClick={handleLogout} className="btn btn-secondary">
            로그아웃
          </button>
        </div>
      </header>

      <main className="home-main">
        {/* 읽은 Survey 섹션 */}
        <section className="survey-section">
          <h2>📚 읽은 Survey</h2>
          <div className="survey-scroll-container">
            {readSurveys.length > 0 ? (
              readSurveys.map((us) => (
                <div 
                  key={us.id} 
                  className="survey-card"
                  onClick={() => handleSurveyClick(us.survey_id)}
                >
                  <div className="survey-thumbnail">
                    📄
                  </div>
                  <div className="survey-info">
                    <h3>{us.survey?.title}</h3>
                    <div className="survey-tags">
                      {us.survey?.tags?.split(',').slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="tag">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">
                <p>아직 읽은 survey가 없어요</p>
              </div>
            )}
          </div>
        </section>

        {/* 추천받은 Survey 섹션 */}
        <section className="survey-section">
          <h2>⭐ 추천받은 Survey</h2>
          <div className="survey-scroll-container">
            {recommendedSurveys.length > 0 ? (
              recommendedSurveys.map((us) => (
                <div 
                  key={us.id} 
                  className="survey-card"
                  onClick={() => handleSurveyClick(us.survey_id)}
                >
                  <div className="survey-thumbnail">
                    📄
                  </div>
                  <div className="survey-info">
                    <h3>{us.survey?.title}</h3>
                    <div className="survey-tags">
                      {us.survey?.tags?.split(',').slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="tag">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">
                <p>아직 추천받은 survey가 없어요</p>
              </div>
            )}
          </div>
        </section>

        {/* 새로운 Survey 찾기 버튼 */}
        <section className="find-survey-section">
          <button 
            className="btn btn-primary find-survey-btn"
            onClick={() => navigate('/recommend')}
          >
            🔍 새로운 Survey 찾기
          </button>
        </section>
      </main>
    </div>
  );
}

export default Home;