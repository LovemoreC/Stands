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
import ManagerDashboard from './pages/ManagerDashboard';
import AgentsPage from './pages/Agents';
import ComplianceDashboard from './pages/ComplianceDashboard';
import Deposits from './pages/Deposits';
import DepositDetail from './pages/DepositDetail';
import LoanAccounts from './pages/LoanAccounts';
import DocumentRequirementsPage from './pages/DocumentRequirements';
import ImportedDeposits from './pages/ImportedDeposits';
import ImportedLoanAccounts from './pages/ImportedLoanAccounts';
import ContactSettingsPage from './pages/ContactSettings';
import CustomerProfileAgent from './pages/CustomerProfileAgent';
import CustomerProfilesManage from './pages/CustomerProfilesManage';
import PropertyApplicationsQueue from './pages/PropertyApplicationsQueue';
import Agreements from './pages/Agreements';
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
          { to: '/document-requirements', label: 'Document Requirements' },
          { to: '/contact-settings', label: 'Contact Settings' },
          { to: '/agents', label: 'Agents' },
          { to: '/property-applications', label: 'Property Applications' },
          { to: '/agreements', label: 'Agreements' },
          { to: '/account-openings', label: 'Account Openings' },
          { to: '/customer-profiles/manage', label: 'Customer Profiles' },
          { to: '/loan-applications', label: 'Loan Applications' },
          { to: '/loan-approvals', label: 'Loan Approvals' },
          { to: '/deposits', label: 'Deposits' },
          { to: '/loan-accounts-open', label: 'Loan Accounts' },
          { to: '/imported-deposits', label: 'Imported Deposits' },
          { to: '/imported-loan-accounts', label: 'Imported Loan Accounts' },
        ]
      : auth.role === 'manager'
        ? [
            { to: '/manager-dashboard', label: 'Dashboard' },
            { to: '/property-applications', label: 'Property Applications' },
            { to: '/agreements', label: 'Agreements' },
            { to: '/account-openings', label: 'Account Openings' },
            { to: '/customer-profiles/manage', label: 'Customer Profiles' },
            { to: '/imported-deposits', label: 'Imported Deposits' },
            { to: '/imported-loan-accounts', label: 'Imported Loan Accounts' },
          ]
        : auth.role === 'compliance'
          ? [{ to: '/compliance-dashboard', label: 'Dashboard' }]
          : auth.role === 'agent'
            ? [
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/submit', label: 'New Submission' },
                { to: '/agreements', label: 'Agreements' },
                { to: '/customer-profiles', label: 'Customer Profiles' },
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
              path="/contact-settings"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <ContactSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-requirements"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <DocumentRequirementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-profiles/manage"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <CustomerProfilesManage />
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
              path="/agreements"
              element={
                <ProtectedRoute roles={["admin", "manager", "agent"]}>
                  <Agreements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property-applications"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <PropertyApplicationsQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-openings"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
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
                <ProtectedRoute roles={["admin", "manager"]}>
                  <DepositDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/imported-deposits"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <ImportedDeposits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/imported-loan-accounts"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <ImportedLoanAccounts />
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
                <ProtectedRoute roles={["admin", "manager"]}>
                  <AccountOpeningDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager-dashboard"
              element={
                <ProtectedRoute roles={["manager"]}>
                  <ManagerDashboard />
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
              path="/customer-profiles"
              element={
                <ProtectedRoute roles={["agent"]}>
                  <CustomerProfileAgent />
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
                          : auth.role === 'manager'
                            ? '/manager-dashboard'
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
