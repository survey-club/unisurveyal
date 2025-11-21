import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://auth.unisurveyal.com';

const AI_FIELDS = [
  // Core ML/DL
  'Deep Learning',
  'Machine Learning',
  'Reinforcement Learning',
  'Transfer Learning',
  'Meta Learning',
  'Federated Learning',

  // Computer Vision
  'Computer Vision',
  'Image Classification',
  'Object Detection',
  'Image Segmentation',
  '3D Vision',
  'Video Understanding',

  // NLP & Language
  'NLP',
  'Large Language Models',
  'Machine Translation',
  'Question Answering',
  'Text Generation',
  'Sentiment Analysis',

  // Generative AI
  'Generative Models',
  'GAN',
  'VAE',
  'Diffusion Models',

  // Graph & Structure
  'Graph Neural Networks',
  'Knowledge Graphs',

  // Audio & Speech
  'Speech Recognition',
  'Speech Synthesis',
  'Audio Processing',

  // Time Series & Prediction
  'Time Series',
  'Forecasting',

  // Recommendation & Personalization
  'Recommender Systems',
  'Collaborative Filtering',

  // Robotics & Control
  'Robotics',
  'Autonomous Driving',
  'Control Theory',

  // Optimization & Theory
  'Optimization',
  'Neural Network Theory',
  'Explainable AI',

  // Applications
  'Medical AI',
  'Financial AI',
  'Game AI',
  'Edge AI',
  'Multimodal Learning'
];

function Profile({ setAuth }) {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [streakColor, setStreakColor] = useState('green');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
    loadStreakColor();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${AUTH_API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setUser(response.data);
      setNickname(response.data.nickname || '');
      setProfileImage(response.data.profile_image || '');
      setBackgroundImage(response.data.background_image || '');
      // interest_fields가 문자열이면 배열로 변환
      const fields = response.data.interest_fields;
      if (typeof fields === 'string' && fields) {
        setSelectedFields(fields.split(',').map(f => f.trim()));
      } else if (Array.isArray(fields)) {
        setSelectedFields(fields);
      } else {
        setSelectedFields([]);
      }
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  };

  const loadStreakColor = () => {
    const savedColor = localStorage.getItem('streakColor') || 'green';
    setStreakColor(savedColor);
  };

  const handleFieldToggle = (field) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowPasswordModal(true);
  };

  const handlePasswordVerify = async () => {
    if (!password) {
      setMessage({ type: 'error', text: '비밀번호를 입력해주세요.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');

      // 비밀번호 확인
      await axios.post(
        `${AUTH_API_URL}/verify-password`,
        { password },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // 프로필 업데이트
      await axios.put(
        `${AUTH_API_URL}/user/profile`,
        {
          nickname: nickname || user.username,
          profile_image: profileImage,
          background_image: backgroundImage,
          interest_fields: selectedFields
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다!' });
      setShowPasswordModal(false);
      setPassword('');

      // 로컬 스토리지 업데이트
      const updatedUser = {
        ...user,
        nickname,
        profile_image: profileImage,
        background_image: backgroundImage,
        interest_fields: selectedFields
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('streakColor', streakColor);
      setUser(updatedUser);

      // 2초 후 홈으로 이동
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: '프로필 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(false);
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="profile-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="profile-container page-fade-in">
      <div className="profile-header">
        <button className="btn-back" onClick={() => navigate('/home')}>
          ← 홈으로
        </button>
        <h1>프로필 설정</h1>
      </div>

      <div className="profile-content">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-section">
            <h2>기본 정보</h2>

            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                className="input-field"
                value={user.username}
                disabled
              />
            </div>

            <div className="form-group">
              <label>별명</label>
              <input
                type="text"
                className="input-field"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="별명을 입력하세요"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>이메일</label>
              <input
                type="email"
                className="input-field"
                value={user.email}
                disabled
              />
            </div>

            <div className="form-group">
              <label>프로필 이미지 URL (선택)</label>
              <input
                type="url"
                className="input-field"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={loading}
              />
              {profileImage && (
                <div className="profile-image-preview">
                  <img src={profileImage} alt="프로필 미리보기" />
                </div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h2>배경 이미지</h2>
            <p className="section-description">홈 화면 상단 배경 이미지 URL을 입력하세요 (60% 투명도 적용)</p>

            <div className="form-group">
              <label>배경 이미지 URL (선택)</label>
              <input
                type="url"
                className="input-field"
                value={backgroundImage}
                onChange={(e) => setBackgroundImage(e.target.value)}
                placeholder="https://example.com/background.jpg"
                disabled={loading}
              />
              {backgroundImage && (
                <div className="background-image-preview">
                  <img src={backgroundImage} alt="배경 미리보기" />
                </div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h2>관심 분야</h2>
            <p className="section-description">AI/ML 분야에서 관심있는 주제를 선택하세요</p>

            <div className="fields-grid">
              {AI_FIELDS.map(field => (
                <div
                  key={field}
                  className={`field-checkbox ${selectedFields.includes(field) ? 'selected' : ''}`}
                  onClick={() => handleFieldToggle(field)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field)}
                    onChange={() => {}}
                  />
                  <label>{field}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <h2>스트릭 색상 테마</h2>
            <p className="section-description">활동 스트릭 그래프의 색상을 선택하세요</p>

            <div className="color-options">
              <div
                className={`color-option ${streakColor === 'green' ? 'selected' : ''}`}
                onClick={() => setStreakColor('green')}
              >
                <div className="color-preview green">
                  <div className="preview-box level-1"></div>
                  <div className="preview-box level-2"></div>
                  <div className="preview-box level-3"></div>
                  <div className="preview-box level-4"></div>
                </div>
                <span>초록색</span>
              </div>

              <div
                className={`color-option ${streakColor === 'blue' ? 'selected' : ''}`}
                onClick={() => setStreakColor('blue')}
              >
                <div className="color-preview blue">
                  <div className="preview-box level-1"></div>
                  <div className="preview-box level-2"></div>
                  <div className="preview-box level-3"></div>
                  <div className="preview-box level-4"></div>
                </div>
                <span>파란색</span>
              </div>

              <div
                className={`color-option ${streakColor === 'red' ? 'selected' : ''}`}
                onClick={() => setStreakColor('red')}
              >
                <div className="color-preview red">
                  <div className="preview-box level-1"></div>
                  <div className="preview-box level-2"></div>
                  <div className="preview-box level-3"></div>
                  <div className="preview-box level-4"></div>
                </div>
                <span>빨간색</span>
              </div>
            </div>
          </div>

          {message.text && (
            <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
              {message.text}
            </div>
          )}

          <div className="profile-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '저장 중...' : '변경사항 저장'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </form>
      </div>

      {/* 비밀번호 확인 모달 */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>비밀번호 확인</h2>
            <p>프로필을 수정하려면 비밀번호를 입력해주세요.</p>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoFocus
            />
            {message.type === 'error' && (
              <p className="error-message">{message.text}</p>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                disabled={loading}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePasswordVerify}
                disabled={loading}
              >
                {loading ? '확인 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
