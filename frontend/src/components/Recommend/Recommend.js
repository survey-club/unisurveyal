import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Recommend.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://localhost:8002';

const AI_STACKS = [
  '순수 딥러닝', 'AI 수학', '컴퓨터 비전', 'LLM/NLP', 
  '시계열', '강화학습', '그래프 신경망', '생성 모델',
  '메타러닝', '연합학습'
];

const DOMAINS = [
  '범용', '순수 딥러닝', '순수 머신러닝', '의료', 
  '로봇', '자율주행', '금융', '제조',
  '추천시스템', '음성인식', '게임 AI', '생명공학'
];

function Recommend({ darkMode, toggleDarkMode }) {
  const navigate = useNavigate();
  const [recommendType, setRecommendType] = useState(null);
  
  // Custom 추천 상태
  const [difficulty, setDifficulty] = useState('묘목');
  const [description, setDescription] = useState('');
  
  // End-to-End 추천 상태
  const [selectedStacks, setSelectedStacks] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [customStack, setCustomStack] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState([]);

  const handleCustomRecommend = async () => {
    if (!description.trim()) {
      alert('설명을 입력해주세요.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${SURVEY_API_URL}/recommend/custom`,
        {
          difficulty: difficulty,
          description: description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResults(response.data);
    } catch (err) {
      console.error('Recommendation failed:', err);
      alert('추천에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndToEndRecommend = async () => {
    if (selectedStacks.length === 0 && selectedDomains.length === 0 && !customStack && !customDomain) {
      alert('최소 하나의 AI 스택 또는 분야를 선택해주세요.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${SURVEY_API_URL}/recommend/end-to-end`,
        {
          difficulty: difficulty,
          ai_stacks: selectedStacks,
          domains: selectedDomains,
          custom_stack: customStack || null,
          custom_domain: customDomain || null,
          max_results: maxResults
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResults(response.data);
    } catch (err) {
      console.error('Recommendation failed:', err);
      alert('추천에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStack = (stack) => {
    setSelectedStacks(prev => 
      prev.includes(stack) 
        ? prev.filter(s => s !== stack)
        : [...prev, stack]
    );
  };

  const toggleDomain = (domain) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const toggleSurveySelection = (surveyId) => {
    setSelectedSurveys(prev => 
      prev.includes(surveyId)
        ? prev.filter(id => id !== surveyId)
        : [...prev, surveyId]
    );
  };

  const handleAddToHome = async () => {
    if (selectedSurveys.length === 0) {
      alert('최소 하나의 Survey를 선택해주세요.');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      for (const surveyId of selectedSurveys) {
        await axios.post(
          `${SURVEY_API_URL}/surveys/add`,
          {
            survey_id: surveyId,
            status: 'recommended'
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      alert(`${selectedSurveys.length}개의 Survey가 홈에 추가되었습니다!`);
      navigate('/home');
    } catch (err) {
      console.error('Failed to add surveys:', err);
      alert('Survey 추가에 실패했습니다.');
    }
  };

  return (
    <div className="recommend-container">
      <header className="recommend-header">
        <button onClick={() => navigate('/home')} className="btn btn-secondary">
          ← 홈으로
        </button>
        <h1>🔍 Survey 추천받기</h1>
        <button onClick={toggleDarkMode} className="btn btn-secondary">
          {darkMode ? '🌞' : '🌙'}
        </button>
      </header>

      <main className="recommend-main">
        {!recommendType && (
          <div className="recommend-type-selection">
            <h2>추천 방식을 선택하세요</h2>
            <div className="type-buttons">
              <div 
                className="type-card"
                onClick={() => setRecommendType('custom')}
              >
                <div className="type-icon">🎯</div>
                <h3>사용자 설정 추천</h3>
                <p>난이도를 설정하고 상황이나 키워드를 입력하여 맞춤 추천을 받습니다</p>
              </div>

              <div 
                className="type-card"
                onClick={() => setRecommendType('end-to-end')}
              >
                <div className="type-icon">🎨</div>
                <h3>엔드 투 엔드 추천</h3>
                <p>AI 스택과 분야를 선택하여 관련 Survey를 추천받습니다</p>
              </div>
            </div>
          </div>
        )}

        {recommendType === 'custom' && !results.length && (
          <div className="recommend-form">
            <button 
              onClick={() => { setRecommendType(null); setResults([]); }}
              className="btn btn-secondary back-btn"
            >
              ← 뒤로
            </button>

            <h2>🎯 사용자 설정 추천</h2>

            <div className="form-section">
              <label>난이도 선택</label>
              <div className="difficulty-buttons">
                {['새싹', '묘목', '나무'].map(level => (
                  <button
                    key={level}
                    className={`difficulty-btn ${difficulty === level ? 'active' : ''}`}
                    onClick={() => setDifficulty(level)}
                  >
                    {level === '새싹' && '🌱'} 
                    {level === '묘목' && '🌿'} 
                    {level === '나무' && '🌳'} 
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label>상황 또는 키워드 설명</label>
              <textarea
                className="input-field description-textarea"
                placeholder="예: 저는 컴퓨터 비전 석사 과정에 있으며, object detection에 관심이 많습니다. 최신 트렌드를 파악하고 싶어요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
            </div>

            <button 
              onClick={handleCustomRecommend}
              className="btn btn-primary recommend-btn"
              disabled={loading}
            >
              {loading ? '추천 중...' : '추천받기'}
            </button>
          </div>
        )}

        {recommendType === 'end-to-end' && !results.length && (
          <div className="recommend-form">
            <button 
              onClick={() => { setRecommendType(null); setResults([]); }}
              className="btn btn-secondary back-btn"
            >
              ← 뒤로
            </button>

            <h2>🎨 엔드 투 엔드 추천</h2>

            <div className="form-section">
              <label>난이도 선택</label>
              <div className="difficulty-buttons">
                {['새싹', '묘목', '나무'].map(level => (
                  <button
                    key={level}
                    className={`difficulty-btn ${difficulty === level ? 'active' : ''}`}
                    onClick={() => setDifficulty(level)}
                  >
                    {level === '새싹' && '🌱'} 
                    {level === '묘목' && '🌿'} 
                    {level === '나무' && '🌳'} 
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label>AI 스택 선택 (중복 가능)</label>
              <div className="selection-grid">
                {AI_STACKS.map(stack => (
                  <button
                    key={stack}
                    className={`selection-btn ${selectedStacks.includes(stack) ? 'selected' : ''}`}
                    onClick={() => toggleStack(stack)}
                  >
                    {stack}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="기타 AI 스택 (선택사항)"
                value={customStack}
                onChange={(e) => setCustomStack(e.target.value)}
              />
            </div>

            <div className="form-section">
              <label>분야 선택 (중복 가능)</label>
              <div className="selection-grid">
                {DOMAINS.map(domain => (
                  <button
                    key={domain}
                    className={`selection-btn ${selectedDomains.includes(domain) ? 'selected' : ''}`}
                    onClick={() => toggleDomain(domain)}
                  >
                    {domain}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="기타 분야 (선택사항)"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
              />
            </div>

            <div className="form-section">
              <label>최대 결과 수: {maxResults}개</label>
              <input
                type="range"
                min="5"
                max="50"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="range-slider"
              />
            </div>

            <button 
              onClick={handleEndToEndRecommend}
              className="btn btn-primary recommend-btn"
              disabled={loading}
            >
              {loading ? '추천 중...' : '추천받기'}
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h2>📚 추천 결과 ({results.length}개)</h2>
              <div className="results-actions">
                <button 
                  onClick={handleAddToHome}
                  className="btn btn-primary"
                  disabled={selectedSurveys.length === 0}
                >
                  ✅ 선택한 Survey 홈에 추가 ({selectedSurveys.length})
                </button>
                <button 
                  onClick={() => { setResults([]); setSelectedSurveys([]); }}
                  className="btn btn-secondary"
                >
                  🔄 다시 추천받기
                </button>
              </div>
            </div>

            <div className="results-grid">
              {results.map(survey => (
                <div 
                  key={survey.id}
                  className={`result-card ${selectedSurveys.includes(survey.id) ? 'selected' : ''}`}
                >
                  <div className="card-header">
                    <input
                      type="checkbox"
                      checked={selectedSurveys.includes(survey.id)}
                      onChange={() => toggleSurveySelection(survey.id)}
                      className="survey-checkbox"
                    />
                    <h3 onClick={() => navigate(`/survey/${survey.id}`)}>
                      {survey.title}
                    </h3>
                  </div>
                  
                  <p className="survey-abstract-preview">
                    {survey.abstract?.substring(0, 200)}...
                  </p>

                  <div className="survey-meta-info">
                    <span>📅 {survey.published_date}</span>
                    <span>⏱️ {survey[`estimated_reading_time_${difficulty === '새싹' ? 'beginner' : difficulty === '묘목' ? 'intermediate' : 'advanced'}`]} 분</span>
                  </div>

                  <div className="survey-card-tags">
                    {survey.tags?.split(',').slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="mini-tag">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Recommend;