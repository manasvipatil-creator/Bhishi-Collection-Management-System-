import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AddAgent from "./pages/AddAgent";
import ViewAgents from "./pages/ViewAgents";
import ManageRoutes from "./pages/ManageRoutes";

import ViewCustomers from "./pages/ViewCustomers";
import WeeklyCollections from "./pages/WeeklyCollections";
import MonthlyCollections from "./pages/MonthlyCollections";
import Transactions from "./pages/Transactions";
import YearEndBonus from "./pages/YearEndBonus";
import GiftDistribution from "./pages/GiftDistribution";
import ProcessWithdrawal from "./pages/ProcessWithdrawal";
import AddCollection from "./pages/AddCollection";
import ViewCollections from "./pages/ViewCollections";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import PrintPage from "./pages/PrintPage";
import AgentLogin from "./pages/AgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import AgentIdManager from "./pages/AgentIdManager";
import AllData from "./pages/AllData";

import AgentSequentialManager from "./pages/AgentSequentialManager";
import SimpleIdConverter from "./pages/SimpleIdConverter";
import TestFirebaseStructure from "./components/TestFirebaseStructure";
import SetupAdmin from "./components/SetupAdmin";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/main.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/agent-login" element={<AgentLogin />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
          
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="d-flex">
                <Sidebar />
                <div className="main-content flex-grow-1">
                  <Navbar />
                  <div className="p-4">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/add-agent" element={<AddAgent />} />
                      <Route path="/view-agents" element={<ViewAgents />} />
                      <Route path="/manage-routes" element={<ManageRoutes />} />
                      <Route path="/view-customers" element={<ViewCustomers />} />
                      <Route path="/weekly-collections" element={<WeeklyCollections />} />
                      <Route path="/monthly-collections" element={<MonthlyCollections />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/year-end-bonus" element={<YearEndBonus />} />
                      <Route path="/gift-distribution" element={<GiftDistribution />} />
                      <Route path="/process-withdrawal" element={<ProcessWithdrawal />} />
                      <Route path="/add-collection" element={<AddCollection />} />
                      <Route path="/view-collections" element={<ViewCollections />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/agent-id-manager" element={<AgentIdManager />} />
                      <Route path="/agent-sequential-manager" element={<AgentSequentialManager />} />
                      <Route path="/simple-id-converter" element={<SimpleIdConverter />} />
                      <Route path="/test-firebase-structure" element={<TestFirebaseStructure />} />
                      <Route path="/all-data" element={<AllData />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/print" element={<PrintPage />} />
                    </Routes>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;