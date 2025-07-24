import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";

// 🔐 Componente per proteggere le route
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 🏠 Componente per redirect alla dashboard appropriata
const DashboardRedirect = () => {
  const isExternalUser = localStorage.getItem("isExternalUser") === "true";

  if (isExternalUser) {
    return <Navigate to="/external-dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* 🔓 Rotta pubblica - Login */}
        <Route path="/login" element={<Login />} />

        {/* 🏠 Redirect root */}
        <Route
          path="/"
          element={
            localStorage.getItem("isAuthenticated") === "true" ? (
              <DashboardRedirect />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 🔐 Rotte protette - Dashboard interno */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Interno - TODO: Implementare componente</div>
            </ProtectedRoute>
          }
        />

        {/* 🔐 Rotte protette - Dashboard esterno */}
        <Route
          path="/external-dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard Esterno - TODO: Implementare componente</div>
            </ProtectedRoute>
          }
        />

        {/* 🔐 Rotte protette - Gestione stazioni di ricarica */}
        <Route
          path="/charging-stations"
          element={
            <ProtectedRoute>
              <div>
                Gestione Stazioni di Ricarica - TODO: Implementare componente
              </div>
            </ProtectedRoute>
          }
        />

        {/* 🔐 Rotte protette - Gestione utenti */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <div>Gestione Utenti - TODO: Implementare componente</div>
            </ProtectedRoute>
          }
        />

        {/* 🔐 Rotte protette - Report */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <div>Report e Statistiche - TODO: Implementare componente</div>
            </ProtectedRoute>
          }
        />

        {/* 🚫 Catch-all per 404 */}
        <Route
          path="*"
          element={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                flexDirection: "column",
              }}
            >
              <h1>404 - Pagina non trovata</h1>
              <p>La pagina che stai cercando non esiste.</p>
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
