import { useState, useEffect, FC } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent } from "react";
import { Eye, EyeOff, User, LogIn } from "lucide-react";
import styles from "./styles.module.css"; // 👈 CSS Modules aggiornato

const API_URL = process.env.REACT_APP_API_URL;

interface LoginResponse {
  token: string;
  fullName: string;
  email: string;
  idCompany: string;
  companyName: string;
}

const Login: FC = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message] = useState("Accesso Area Backoffice");

  /* redirect se già loggato */
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      // window.location.href = "/dashboard";
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

    const urlLogin = `${API_URL}/api/auth/login`;

    try {
      const res = await fetch(urlLogin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "Username o Password errata");
        return;
      }

      const result: LoginResponse = await res.json();

      // ✅ Salvataggio token JWT
      localStorage.setItem("token", result.token);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("IdCompany", result.idCompany || "");
      localStorage.setItem("fullName", result.companyName || "");

      // 🔍 Decodifica token JWT client-side
      const payload = JSON.parse(atob(result.token.split(".")[1]));

      localStorage.setItem("userId", payload.unique_name || "");
      localStorage.setItem("userLevel", payload.role || "");
      localStorage.setItem(
        "isExternalUser",
        String(payload.role === "External")
      );

      // 🔁 Redirect condizionato
      window.location.href =
        payload.role === "External" ? "/external-dashboard" : "/dashboard";
    } catch (error: unknown) {
      console.error("Errore durante il login:", error);

      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        setError(
          "Impossibile connettersi al server. Verifica la connessione di rete."
        );
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
    <div className={styles.loginPage}>
      {/* Elementi geometrici decorativi */}
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>

      {/* Overlay con effetto blur */}
      <div className={styles.loginOverlay} />

      {/* Form di login moderno */}
      <form onSubmit={handleLogin} className={styles.loginFormWrapper}>
        <h1 className={styles.loginTitle}>{message}</h1>

        <div className={styles.loginForm}>
          {/* Campo Username */}
          <div className={styles.inputGroup}>
            <input
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Inserisci il tuo username"
              autoComplete="username"
              className={styles.input}
              disabled={loading}
            />
            <div className={styles.inputIcon}>
              <User size={20} />
            </div>
          </div>

          {/* Campo Password */}
          <div className={styles.inputGroup}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Inserisci la tua password"
              autoComplete="current-password"
              className={styles.input}
              disabled={loading}
            />
            <div className={styles.inputIcon}>
              <User size={20} />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.toggleBtn}
              disabled={loading}
              aria-label={
                showPassword ? "Nascondi password" : "Mostra password"
              }
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Messaggio di errore */}
          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* Pulsante di submit */}
          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
            aria-label={loading ? "Accesso in corso..." : "Effettua il login"}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                <span>Accesso in corso...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Accedi</span>
              </>
            )}
          </button>
        </div>

        <p className={styles.loginFooter}>
          Sistema di gestione PuntoRicarica - Backoffice
        </p>
      </form>
    </div>
  );
};

export default Login;
