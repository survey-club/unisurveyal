import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Streak.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://survey.unisurveyal.com';

function Streak({ streakColor = 'green' }) {
  const [streakData, setStreakData] = useState([]);
  const [totalDaysActive, setTotalDaysActive] = useState(0);
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  useEffect(() => {
    loadStreakData();
  }, []);

  const loadStreakData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${SURVEY_API_URL}/activity/streak`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStreakData(response.data.streak_data);
      setTotalDaysActive(response.data.total_days_active);
    } catch (err) {
      console.error('Failed to load streak data:', err);
    }
  };

  const getColorClass = (count) => {
    if (count === 0) return 'level-0';
    if (count === 1) return 'level-1';
    if (count <= 3) return 'level-2';
    if (count <= 5) return 'level-3';
    return 'level-4';
  };

  const handleMouseEnter = (day, event) => {
    if (!day) return;
    const rect = event.target.getBoundingClientRect();
    setTooltip({
      show: true,
      content: `${day.date}\n${day.count}개 논문 읽음`,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  const getWeekData = () => {
    // 365일을 7주(행) 단위로 그룹화
    const weeks = [];
    const totalDays = streakData.length;

    // 시작 요일 계산 (일요일 = 0, 월요일 = 1, ...)
    const firstDate = new Date(streakData[0]?.date);
    const startDayOfWeek = firstDate.getDay();

    let currentWeek = new Array(7).fill(null);
    let weekIndex = 0;

    // 첫 주의 빈 칸 채우기
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek[i] = null;
    }

    // 데이터 채우기
    streakData.forEach((day, index) => {
      const dayOfWeek = (startDayOfWeek + index) % 7;

      currentWeek[dayOfWeek] = day;

      if (dayOfWeek === 6 || index === totalDays - 1) {
        weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill(null);
      }
    });

    return weeks;
  };

  const weeks = getWeekData();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className={`streak-container streak-${streakColor}`}>
      <div className="streak-header">
        <h3>📅 활동 스트릭</h3>
        <span className="streak-count">{totalDaysActive}일 활동</span>
      </div>

      <div className="streak-grid-container">
        {/* 요일 레이블 */}
        <div className="streak-days-labels">
          <span>일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
        </div>

        {/* 스트릭 그리드 */}
        <div className="streak-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="streak-week">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`streak-day ${day ? getColorClass(day.count) : 'empty'}`}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {day && day.count > 0 && <span className="day-count">{day.count}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 툴팁 */}
        {tooltip.show && (
          <div
            className="streak-tooltip"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`
            }}
          >
            {tooltip.content.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="streak-legend">
        <span>적음</span>
        <div className="legend-box level-0"></div>
        <div className="legend-box level-1"></div>
        <div className="legend-box level-2"></div>
        <div className="legend-box level-3"></div>
        <div className="legend-box level-4"></div>
        <span>많음</span>
      </div>
    </div>
  );
}

export default Streak;
