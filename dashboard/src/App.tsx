import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Stands from './pages/Stands';
import Mandates from './pages/Mandates';
import Dashboard from './pages/Dashboard';
import MultiStepForm from './pages/MultiStepForm';
import { ProtectedRoute, useAuth } from './auth';

const App: React.FC = () => {
  const { auth, logout } = useAuth();
  return (
    <div>
      {auth && (
        <nav>
          {auth.role === 'admin' && (
            <>
              <Link to="/projects">Projects</Link> |{' '}
              <Link to="/stands">Stands</Link> |{' '}
              <Link to="/mandates">Mandates</Link> |{' '}
            </>
          )}
          {auth.role === 'agent' && (
            <>
              <Link to="/dashboard">Dashboard</Link> |{' '}
              <Link to="/submit">New Submission</Link> |{' '}
            </>
          )}
          <button onClick={logout}>Logout</button>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stands"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Stands />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mandates"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Mandates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["agent"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute roles={["agent"]}>
              <MultiStepForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={
                auth
                  ? auth.role === 'agent'
                    ? '/dashboard'
                    : '/projects'
                  : '/login'
              }
              replace
            />
          }
        />
      </Routes>
    </div>
  );
};

export default App;
