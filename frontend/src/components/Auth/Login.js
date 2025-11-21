import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://auth.unisurveyal.com';

function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setAuth(true);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-fade-in">
      {/* 왼쪽: 애니메이션 배경 */}
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
        <div className="auth-left-content">
          <h1 className="auth-title">UniSurveyal</h1>
          <p className="auth-subtitle">AI/ML Survey 논문 추천 플랫폼</p>
        </div>
      </div>

      {/* 오른쪽: 로그인 폼 */}
      <div className="auth-right">
        <div className="auth-form-container slide-in-right">
          <h2>로그인</h2>
          <p className="auth-description">AI Survey 논문 추천을 시작하세요</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary full-width"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              계정이 없으신가요? <Link to="/register" className="auth-link">회원가입</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
