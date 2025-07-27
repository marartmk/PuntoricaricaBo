import { type JSX } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/index";
import LoginAdmin from "./pages/LoginAdmin";
import Dashboard from "./pages/Dashboard";

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


      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
