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
import ComplianceDashboard from './pages/ComplianceDashboard';
import Deposits from './pages/Deposits';
import DepositDetail from './pages/DepositDetail';
import LoanAccounts from './pages/LoanAccounts';
import { ProtectedRoute, useAuth } from './auth';

const App: React.FC = () => {
  const { auth, logout } = useAuth();
  return (
    <div>
      {auth && (
        <nav>
          {auth.role === 'admin' && (
            <>
              <Link to="/admin-dashboard">Dashboard</Link> |{' '}
              <Link to="/projects">Projects</Link> |{' '}
              <Link to="/stands">Stands</Link> |{' '}
              <Link to="/mandates">Mandates</Link> |{' '}
              <Link to="/account-openings">Account Openings</Link> |{' '}
              <Link to="/loan-applications">Loan Applications</Link> |{' '}
              <Link to="/loan-approvals">Loan Approvals</Link> |{' '}
              <Link to="/deposits">Deposits</Link> |{' '}
              <Link to="/loan-accounts-open">Loan Accounts</Link> |{' '}
            </>
          )}
          {auth.role === 'manager' && (
            <>
              <Link to="/admin-dashboard">Dashboard</Link> |{' '}
            </>
          )}
          {auth.role === 'compliance' && (
            <>
              <Link to="/compliance-dashboard">Dashboard</Link> |{' '}
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
    </div>
  );
};

export default App;
