import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PDFViewer.css';

const SURVEY_API_URL = process.env.REACT_APP_SURVEY_API_URL || 'http://localhost:8002';

function PDFViewer({ darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurvey();
    updateSurveyStatus();
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

  const updateSurveyStatus = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // 사용자의 survey 목록에서 해당 survey 찾기
      const userSurveysResponse = await axios.get(
        `${SURVEY_API_URL}/surveys/user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userSurvey = userSurveysResponse.data.find(
        us => us.survey_id === parseInt(id)
      );

      if (userSurvey && userSurvey.status !== 'reading') {
        await axios.put(
          `${SURVEY_API_URL}/surveys/${userSurvey.id}/status?new_status=reading`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const markAsCompleted = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const userSurveysResponse = await axios.get(
        `${SURVEY_API_URL}/surveys/user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userSurvey = userSurveysResponse.data.find(
        us => us.survey_id === parseInt(id)
      );

      if (userSurvey) {
        await axios.put(
          `${SURVEY_API_URL}/surveys/${userSurvey.id}/status?new_status=completed`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        alert('Survey를 완료했습니다! 🎉');
        navigate('/home');
      }
    } catch (err) {
      console.error('Failed to mark as completed:', err);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!survey) {
    return <div className="error">Survey를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="pdf-viewer-container">
      <header className="pdf-viewer-header">
        <button onClick={() => navigate(`/survey/${id}`)} className="btn btn-secondary">
          ← 뒤로
        </button>
        <h2>{survey.title}</h2>
        <button onClick={markAsCompleted} className="btn btn-primary">
          ✅ 완료
        </button>
      </header>

      <div className="pdf-viewer-content">
        <iframe
          src={`${survey.pdf_url}#view=FitH`}
          title="PDF Viewer"
          className="pdf-iframe"
        />
      </div>

      <div className="pdf-viewer-info">
        <p>💡 Tip: 브라우저의 전체화면 모드(F11)를 사용하면 더 편하게 읽을 수 있습니다.</p>
      </div>
    </div>
  );
}

export default PDFViewer;