import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://auth.unisurveyal.com';
const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

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

function Register({ setAuth }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 8) {
      setPasswordStrength('약함');
    } else if (password.length < 12) {
      setPasswordStrength('보통');
    } else {
      setPasswordStrength('강함');
    }
  };

  const handleFieldToggle = (field) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (!/[!@#$%^&*]/.test(formData.password)) {
      setError('비밀번호는 특수문자를 포함해야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 회원가입만 수행
      await axios.post(`${AUTH_API_URL}/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname || formData.username,
        interest_fields: selectedFields
      });

      // 회원가입 성공 시 로그인 페이지로 이동
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container page-fade-in">
      <div className="auth-left">
        {(() => {
          const emojis = ['📚', '📖', '📝', '📄', '✍️', '🔖', '🎓', '📑', '📰', '🗂️'];
          // 큰 이모티콘 3개 위치 (겹치지 않게)
          const positions = [
            { top: 10, left: 15, size: 120 },  // 큰 이모티콘 1
            { top: 55, left: 70, size: 110 },  // 큰 이모티콘 2
            { top: 75, left: 20, size: 100 },  // 큰 이모티콘 3
            { top: 25, left: 60, size: 65 },
            { top: 40, left: 40, size: 70 },
            { top: 15, left: 80, size: 60 },
            { top: 85, left: 55, size: 75 },
            { top: 50, left: 10, size: 65 },
            { top: 30, left: 85, size: 70 },
            { top: 65, left: 45, size: 60 }
          ];

          return positions.map((pos, i) => (
            <div
              key={i}
              className="floating-emoji"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                fontSize: `${pos.size}px`
              }}
            >
              {emojis[i % emojis.length]}
            </div>
          ));
        })()}
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1>UniSurveyal</h1>
          <p className="auth-subtitle">AI/ML Survey 논문 추천 플랫폼</p>

          {step === 1 ? (
            <form onSubmit={handleStep1Submit}>
              <h2>회원가입 (1/2)</h2>
              <p className="step-description">기본 정보를 입력해주세요</p>

              <div className="form-group">
                <label>아이디</label>
                <input
                  type="text"
                  name="username"
                  className="input-field"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="아이디를 입력하세요"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>별명 (선택)</label>
                <input
                  type="text"
                  name="nickname"
                  className="input-field"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="별명을 입력하세요"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  name="email"
                  className="input-field"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일을 입력하세요"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>비밀번호</label>
                <input
                  type="password"
                  name="password"
                  className="input-field"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요 (8자 이상, 특수문자 포함)"
                  disabled={loading}
                />
                {formData.password && (
                  <div className={`password-strength ${passwordStrength}`}>
                    비밀번호 강도: {passwordStrength}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>비밀번호 확인</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="input-field"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                다음 단계
              </button>

              <p className="auth-switch">
                이미 계정이 있으신가요? <button type="button" onClick={() => navigate('/login')}>로그인</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit}>
              <h2>회원가입 (2/2)</h2>
              <p className="step-description">관심 있는 AI/ML 분야를 선택하세요 (중복 선택 가능)</p>

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

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  이전
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '가입 중...' : '회원가입 완료'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;
