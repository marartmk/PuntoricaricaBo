import { useState, useEffect } from "react";
import type { FC } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent } from "react";
import { Eye, EyeOff, User, LogIn } from "lucide-react";
import "./styles.css"; // 👈 importa gli stili standard
import logo from "../../assets/LogoBaseBlack_300.png"; // Importa il logo se necessario
const API_URL = import.meta.env.VITE_API_URL;

interface LoginResponse {
  token: string;
  idCompany: string;
}

const LoginAdmin: FC = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message] = useState("Accedi Area Global Admin");

  /* redirect se già loggato */
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      //window.location.href = "/dashboard";
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "username" ? value : value,
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Username è richiesto");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Password è richiesta");
      return false;
    }
    return true;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    const urlLogin = `${API_URL}/api/auth/login-admin`;

    try {
      const res = await fetch(urlLogin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "UserId o Password errata");
        return;
      }

      const result: LoginResponse = await res.json();

      // ✅ Salvataggio token JWT
      localStorage.setItem("token", result.token);
      localStorage.setItem("isAuthenticated", "true");

      // ✅ Salvataggio dati utente
      localStorage.setItem("userId", formData.username);
      localStorage.setItem("IdCompanyAdmin", result.idCompany);

      // 🔍 Se vuoi decodificare il token JWT client-side (opzionale):
      const payload = JSON.parse(atob(result.token.split(".")[1]));

      localStorage.setItem("userId", payload.unique_name || ""); // o email
      localStorage.setItem("userLevel", payload.role || "");
      localStorage.setItem(
        "isExternalUser",
        String(payload.role === "External")
      ); // esempio

      // 🔁 Redirect condizionato
      window.location.href =
        payload.role === "External" ? "/dashboard-admin" : "/dashboard-admin";
    } catch (error: unknown) {
      console.error("Errore durante il login:", error);

      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        setError("Impossibile connettersi al server. Verifica la rete.");
      } else if (error instanceof Error) {
        setError(error.message || "Errore sconosciuto durante la connessione.");
      } else {
        setError("Errore sconosciuto durante la connessione.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* overlay scuro sopra lo sfondo */}
      <div className="login-overlay" />

      {/* logo */}
      <div className="login-logo">
        <img src={logo} alt="Medialab Logo" />
      </div>

      {/* form */}
      <form onSubmit={handleLogin} className="login-form-wrapper">
        <h1 className="login-title">{message}</h1>

        <div className="login-form">
          {/* username */}
          <div className="input-group">
            <input
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username"
              autoComplete="off"
              className="input"
              disabled={loading}
            />
            <div className="input-icon">
              <User size={20} />
            </div>
          </div>

          {/* password */}
          <div className="input-group">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              autoComplete="off"
              className="input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="input-icon toggle-btn"
              disabled={loading}
            >
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          {/* submit */}
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <div className="spinner" />
                <span>Accesso…</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Login</span>
              </>
            )}
          </button>

          {/* error */}
          {error && <p className="error-msg">{error}</p>}
        </div>

        <p className="login-footer">Sistema di gestione assistenza tecnica</p>
      </form>
    </div>
  );
};

export default LoginAdmin;
