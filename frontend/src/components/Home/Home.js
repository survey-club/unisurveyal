import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Streak from '../Streak/Streak';
import Onboarding from '../Onboarding/Onboarding';
import './Home.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function Home({ setAuth }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'alphabetical', 'views'
  const [showStarredOnly, setShowStarredOnly] = useState(false); // 즐겨찾기 필터
  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지
  const [loading, setLoading] = useState(true);
  const [streakColor, setStreakColor] = useState('green');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // 제목 검색
  const [showInterestOnly, setShowInterestOnly] = useState(false); // 관심분야 필터
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    // 온보딩 확인
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadStats();
    loadSurveys();
    loadStreakColor();

    // 페이지가 포커스될 때마다 user 데이터 다시 로드 (프로필 수정 후 반영)
    const handleFocus = () => {
      loadUserData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined') {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } else {
        console.error('User data not found in localStorage');
        // 로그인 페이지로 리디렉션
        navigate('/login');
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
      navigate('/login');
    }
  };

  const loadStreakColor = () => {
    const savedColor = localStorage.getItem('streakColor') || 'green';
    setStreakColor(savedColor);
  };

  const loadStats = async () => {
    const token = localStorage.getItem('token');
    console.log('Loading stats with token:', token);
    try {
      const response = await axios.get(`${SURVEY_API_URL}/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Stats loaded:', response.data);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      console.error('Error details:', err.response?.data);
      // 에러 발생시 기본값 설정
      setStats({
        saved_surveys: 0,
        completed_surveys: 0,
        recommended_surveys: 0
      });
    }
  };

  const loadSurveys = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await axios.get(`${SURVEY_API_URL}/surveys/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSurveys(response.data);
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuth(false);
      alert('로그아웃되었습니다.');
      navigate('/login');
    }
  };

  const toggleStar = async (userSurveyId, event) => {
    event.stopPropagation(); // 카드 클릭 이벤트 방지
    const token = localStorage.getItem('token');

    try {
      await axios.put(
        `${SURVEY_API_URL}/surveys/${userSurveyId}/star`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 로컬 상태 업데이트
      setSurveys(surveys.map(s =>
        s.id === userSurveyId
          ? { ...s, is_starred: !s.is_starred }
          : s
      ));
    } catch (err) {
      console.error('Failed to toggle star:', err);
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
    if (cat.includes('cs.cv')) return 'Computer Vision';
    if (cat.includes('cs.cl')) return 'Natural Language Processing';
    if (cat.includes('cs.lg')) return 'Machine Learning';
    if (cat.includes('cs.ai')) return 'Artificial Intelligence';
    if (cat.includes('cs.ro')) return 'Robotics';
    if (cat.includes('eess.as')) return 'Audio & Speech';
    if (cat.includes('stat.ml')) return 'Statistics';
    // 첫 번째 카테고리 반환
    return categories.split(',')[0].trim();
  };

  const getStatusLabel = (userSurvey) => {
    // 출처 (추천받은 논문 vs 검색한 논문 vs 저장한 논문)
    const source = userSurvey.status === 'recommended' ? '추천받은 논문' :
                   userSurvey.status === 'saved' ? '저장한 논문' : '검색한 논문';

    // 상태
    let statusText = '';
    if (userSurvey.status === 'completed') {
      statusText = '완료';
    } else if (userSurvey.status === 'in_progress') {
      statusText = '진행중';
    } else if (userSurvey.status === 'saved') {
      statusText = '아직 읽지 않음';
    } else if (userSurvey.status === 'recommended') {
      statusText = '추천됨';
    } else {
      statusText = '아직 읽지 않음';
    }

    return `${source} | ${statusText}`;
  };

  return (
    <div className="home-container page-fade-in">
      {/* 배경 이미지 */}
      {user?.background_image && (
        <div
          className="home-background-image"
          style={{
            backgroundImage: `url(${user.background_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {/* 온보딩 */}
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      {/* 헤더 */}
      <header className="home-header">
        <div className="header-left">
          <h1>UniSurveyal</h1>
        </div>
        <div className="header-right">
          <button onClick={() => navigate('/add-survey')} className="btn btn-primary">
            ➕ 새 논문 추가하기
          </button>
          <button onClick={() => navigate('/profile')} className="btn-icon">
            ⚙️ 프로필 수정
          </button>
          <button onClick={handleLogout} className="btn-icon btn-logout">
            🚪 로그아웃
          </button>
        </div>
      </header>

      {/* 사용자 정보 대시보드 */}
      <section className="user-dashboard">
        <div className="user-info">
          <div className="user-avatar">
            {user?.profile_image ? (
              <img src={user.profile_image} alt="프로필" />
            ) : (
              <div className="avatar-placeholder">
                {user?.nickname?.[0] || user?.username?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="user-details">
            <h2>{user?.nickname || user?.username}</h2>
            <p className="user-id">@{user?.username}</p>
            {user?.interest_fields && (
              <div className="user-interests">
                {(typeof user.interest_fields === 'string'
                  ? user.interest_fields.split(',')
                  : user.interest_fields
                ).slice(0, 3).map((field, idx) => (
                  <span key={idx} className="interest-badge">{typeof field === 'string' ? field.trim() : field}</span>
                ))}
                {(typeof user.interest_fields === 'string'
                  ? user.interest_fields.split(',')
                  : user.interest_fields
                ).length > 3 && (
                  <span className="interest-badge more">+{(typeof user.interest_fields === 'string'
                    ? user.interest_fields.split(',')
                    : user.interest_fields
                  ).length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="user-stats">
          <div className="stat-item">
            <div className="stat-number">{stats?.saved_surveys || 0}</div>
            <div className="stat-label">보관중인 Survey</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats?.completed_surveys || 0}</div>
            <div className="stat-label">완료한 Survey</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats?.recommended_surveys || 0}</div>
            <div className="stat-label">추천받은 Survey</div>
          </div>
        </div>
      </section>

      {/* 스트릭 섹션 */}
      <section className="streak-section">
        <div className="streak-wrapper">
          <Streak streakColor={streakColor} />
        </div>
      </section>

      {/* 보관중인 Survey 섹션 */}
      <section className="surveys-section">
        <div className="section-header">
          <h2>📚 보관중인 Survey ({surveys.length})</h2>
          <div className="section-controls">
            <button
              className={`filter-btn ${showStarredOnly ? 'active' : ''}`}
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              title={showStarredOnly ? "전체 보기" : "즐겨찾기만 보기"}
            >
              {showStarredOnly ? '⭐ 즐겨찾기' : '☆ 즐겨찾기'}
            </button>
            <button
              className={`filter-btn ${showInterestOnly ? 'active' : ''}`}
              onClick={() => setShowInterestOnly(!showInterestOnly)}
              title={showInterestOnly ? "전체 보기" : "관심분야만 보기"}
            >
              {showInterestOnly ? '💡 관심분야' : '💡 관심분야'}
            </button>
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="date">날짜순</option>
                <option value="alphabetical">알파벳순</option>
                <option value="views">조회수순</option>
              </select>
            </div>
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
            <input
              type="text"
              className="search-input"
              placeholder="논문 제목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loader"></div>
          </div>
        ) : surveys.length > 0 ? (() => {
          const filteredAndSorted = surveys
            .filter(us => {
              // 즐겨찾기 필터
              if (showStarredOnly && !us.is_starred) return false;

              // 제목 검색 필터
              if (searchQuery) {
                const titleMatch = us.survey?.title?.toLowerCase().includes(searchQuery.toLowerCase());
                if (!titleMatch) return false;
              }

              // 관심분야 필터
              if (showInterestOnly && user?.interest_fields) {
                const title = (us.survey?.title || '').toLowerCase();
                const keywords = (us.survey?.keywords || '').toLowerCase();
                const abstract = (us.survey?.abstract || '').toLowerCase();
                const categories = (us.survey?.categories || '').toLowerCase();

                // interest_fields가 문자열이면 배열로 변환
                const interestArray = typeof user.interest_fields === 'string'
                  ? user.interest_fields.split(',').map(f => f.trim())
                  : Array.isArray(user.interest_fields) ? user.interest_fields : [];

                const hasInterest = interestArray.some(field => {
                  if (!field) return false;
                  const f = field.trim().toLowerCase();

                  // "Computer Vision" -> ["computer", "vision"] 각 단어로 분리해서 검색
                  const words = f.split(/\s+/);

                  // 모든 단어가 제목, 키워드, 초록, 카테고리 중 하나에 포함되는지 확인
                  const allWordsFound = words.every(word => {
                    return title.includes(word) ||
                           keywords.includes(word) ||
                           abstract.includes(word) ||
                           categories.includes(word);
                  });

                  return allWordsFound;
                });

                if (!hasInterest) return false;
              }

              return true;
            })
            .sort((a, b) => {
              if (sortBy === 'date') {
                return new Date(b.survey?.published_date) - new Date(a.survey?.published_date);
              } else if (sortBy === 'alphabetical') {
                const titleA = (a.survey?.title || '').toLowerCase();
                const titleB = (b.survey?.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
              } else if (sortBy === 'views') {
                return (b.survey?.view_count || 0) - (a.survey?.view_count || 0);
              }
              return 0;
            });

          const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
          const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
          const endIndex = startIndex + ITEMS_PER_PAGE;
          const currentSurveys = filteredAndSorted.slice(startIndex, endIndex);

          return (
            <>
              <div className={`surveys-container ${viewMode}`}>
                {currentSurveys.map((us) => (
                  <div
                    key={us.id}
                    className="survey-card"
                    onClick={() => navigate(`/survey/${us.survey_id}`)}
                  >
                    <button
                      className="star-btn"
                      onClick={(e) => toggleStar(us.id, e)}
                      title={us.is_starred ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    >
                      {us.is_starred ? '⭐' : '☆'}
                    </button>
                    <div className="survey-category-badge">
                      <div className="category-emoji">
                        {getEmojiForCategory(us.survey?.categories)}
                      </div>
                      <div className="category-name">
                        {getCategoryName(us.survey?.categories)}
                      </div>
                    </div>
                    <div className="survey-content">
                      <h3 className="survey-title">{us.survey?.title}</h3>

                      {viewMode === 'list' && (
                        <p className="survey-abstract">
                          {us.survey?.abstract?.substring(0, 150)}...
                        </p>
                      )}

                      <div className="survey-keywords">
                        {us.survey?.keywords?.split(',').slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="badge">{keyword.trim()}</span>
                        ))}
                      </div>

                      <div className="survey-meta">
                        <span className="survey-status">
                          {getStatusLabel(us)}
                        </span>
                        <span className="survey-date">
                          📅 {new Date(us.survey?.published_date).toLocaleDateString('ko-KR')}
                        </span>
                        <span className="view-count">👁️ {us.survey?.view_count || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ← 이전
                  </button>

                  <div className="pagination-numbers">
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={page}
                            className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 3 || page === currentPage + 3) {
                        return <span key={page} className="pagination-ellipsis">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          );
        })() : (
          <div className="empty-state">
            <p>아직 보관중인 논문이 없습니다</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/add-survey')}
            >
              새 논문 추가하기
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
