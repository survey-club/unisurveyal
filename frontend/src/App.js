import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import Profile from './components/Profile/Profile';
import SurveyDetail from './components/Survey/SurveyDetail';
import Recommend from './components/Recommend/Recommend';
import Search from './components/Search/Search';
import AddSurvey from './components/AddSurvey/AddSurvey';
import PDFViewer from './components/PDFViewer/PDFViewer';

// Protected Route 컴포넌트
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user || user === 'undefined') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 인증 상태 확인
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setIsAuthenticated(!!token && !!user && user !== 'undefined');
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/home" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register setAuth={setIsAuthenticated} /> : <Navigate to="/home" replace />}
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home setAuth={setIsAuthenticated} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile setAuth={setIsAuthenticated} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/survey/:id"
            element={
              <ProtectedRoute>
                <SurveyDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommend"
            element={
              <ProtectedRoute>
                <Recommend />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-survey"
            element={
              <ProtectedRoute>
                <AddSurvey />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-survey/direct"
            element={
              <ProtectedRoute>
                <AddSurvey mode="search" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-survey/recommend"
            element={
              <ProtectedRoute>
                <AddSurvey mode="recommend" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pdf-viewer/:id"
            element={
              <ProtectedRoute>
                <PDFViewer />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;