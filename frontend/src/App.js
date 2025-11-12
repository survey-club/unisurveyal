import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import SurveyDetail from './components/Survey/SurveyDetail';
import Recommend from './components/Recommend/Recommend';
import PDFViewer from './components/PDFViewer/PDFViewer';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 다크모드 설정 로드
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.body.className = savedMode ? 'dark-mode' : 'light-mode';

    // 인증 상태 확인
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.body.className = newMode ? 'dark-mode' : 'light-mode';
  };

  return (
    <Router>
      <div className={`App ${darkMode ? 'dark' : 'light'}`}>
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/home" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register setAuth={setIsAuthenticated} /> : <Navigate to="/home" />} 
          />
          <Route 
            path="/home" 
            element={isAuthenticated ? <Home darkMode={darkMode} toggleDarkMode={toggleDarkMode} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/survey/:id" 
            element={isAuthenticated ? <SurveyDetail darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recommend" 
            element={isAuthenticated ? <Recommend darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/pdf-viewer/:id" 
            element={isAuthenticated ? <PDFViewer darkMode={darkMode} /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;