import { type JSX } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/index";
import LoginAdmin from "./pages/LoginAdmin";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import DealerAnalytics from "./pages/DealerAnalytics";
import ServicesAnalytics from "./pages/ServicesAnalytics";
import GestioneAgenti from "./pages/GestioneAgenti";
import DettagliAttivita from "./pages/GestioneAgenti/DettagliAttivita";
import EWalletAnalytics from "./pages/EWallet";
import OnBoardingAnalytics from "./pages/EWalletOnBoarding";

// Componente per proteggere le route
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotta pubblica */}
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<LoginAdmin />} />

      {/* Rotte protette */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/dealer-analytics"
        element={
          <ProtectedRoute>
            <DealerAnalytics />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/services-analytics"
        element={
          <ProtectedRoute>
            <ServicesAnalytics />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/gestione-agenti"
        element={
          <ProtectedRoute>
            <GestioneAgenti />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/dettagli-attivita/:id"
        element={
          <ProtectedRoute>
            <DettagliAttivita />
          </ProtectedRoute>
        }
      />

      {/* Rotte protette */}
      <Route
        path="/elwallet-analytics"
        element={
          <ProtectedRoute>
            <EWalletAnalytics />
          </ProtectedRoute>
        }
      />

       {/* Rotte protette */}
      <Route
        path="/elwallet-onboarding"
        element={
          <ProtectedRoute>
            <OnBoardingAnalytics />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
