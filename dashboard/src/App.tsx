import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Stands from './pages/Stands';
import Mandates from './pages/Mandates';
import Dashboard from './pages/Dashboard';
import MultiStepForm from './pages/MultiStepForm';
import AccountOpenings from './pages/AccountOpenings';
import AccountOpeningDetail from './pages/AccountOpeningDetail';
import LoanApplications from './pages/LoanApplications';
import LoanApprovals from './pages/LoanApprovals';
import AdminDashboard from './pages/AdminDashboard';
import AgentsPage from './pages/Agents';
import ComplianceDashboard from './pages/ComplianceDashboard';
import Deposits from './pages/Deposits';
import DepositDetail from './pages/DepositDetail';
import LoanAccounts from './pages/LoanAccounts';
import { ProtectedRoute, useAuth } from './auth';

const App: React.FC = () => {
  const { auth, logout } = useAuth();
  const navLinks = auth
    ? auth.role === 'admin'
      ? [
          { to: '/admin-dashboard', label: 'Dashboard' },
          { to: '/projects', label: 'Projects' },
          { to: '/stands', label: 'Stands' },
          { to: '/mandates', label: 'Mandates' },
          { to: '/agents', label: 'Agents' },
          { to: '/account-openings', label: 'Account Openings' },
          { to: '/loan-applications', label: 'Loan Applications' },
          { to: '/loan-approvals', label: 'Loan Approvals' },
          { to: '/deposits', label: 'Deposits' },
          { to: '/loan-accounts-open', label: 'Loan Accounts' },
        ]
      : auth.role === 'manager'
        ? [{ to: '/admin-dashboard', label: 'Dashboard' }]
        : auth.role === 'compliance'
          ? [{ to: '/compliance-dashboard', label: 'Dashboard' }]
          : auth.role === 'agent'
            ? [
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/submit', label: 'New Submission' },
              ]
            : []
    : [];

  return (
    <div className="app-shell">
      {auth && (
        <nav className="app-nav" aria-label="Primary">
          <ul className="app-nav__list">
            {navLinks.map((link) => (
              <li key={link.to} className="app-nav__item">
                <Link to={link.to} className="app-nav__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="app-nav__actions">
            <button type="button" className="app-nav__button" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>
      )}
        <main className="app-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/agents"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />
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
              path="/account-openings"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AccountOpenings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loan-applications"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <LoanApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loan-approvals"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <LoanApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deposits"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Deposits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deposits/:id"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <DepositDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loan-accounts-open"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <LoanAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-openings/:id"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AccountOpeningDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compliance-dashboard"
              element={
                <ProtectedRoute roles={["compliance", "admin"]}>
                  <ComplianceDashboard />
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
                        : auth.role === 'compliance'
                          ? '/compliance-dashboard'
                          : '/admin-dashboard'
                      : '/login'
                  }
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    );
  };

export default App;
