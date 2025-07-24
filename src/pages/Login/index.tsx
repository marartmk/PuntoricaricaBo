import { useState, useEffect, FC } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent } from "react";
import { Eye, EyeOff, User, LogIn } from "lucide-react";
import styles from "./styles.module.css"; // 👈 CSS Modules aggiornato

const API_URL = import.meta.env.VITE_API_URL;

interface LoginData {
  token: string;
  fullName: string;
  email: string;
  id: string;
  idCompany: string;
  companyName: string;
  role: string;
  expiresAt: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginData;
  errors: string[];
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

    const urlLogin = `${API_URL}/api/auth/login-user`;

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

      // ✅ Controllo se il login è avvenuto con successo
      if (!result.success) {
        setError(result.message || "Errore durante il login");
        return;
      }

      // ✅ Gestione errori dall'array errors
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(", "));
        return;
      }

      // ✅ Estrazione dati dalla proprietà data
      const { data } = result;

      // ✅ Salvataggio token JWT e dati utente
      localStorage.setItem("token", data.token);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("IdCompany", data.idCompany || "");
      localStorage.setItem("fullName", data.fullName || "");
      localStorage.setItem("userId", data.id || "");
      localStorage.setItem("userLevel", data.role || "");
      localStorage.setItem("companyName", data.companyName || "");
      localStorage.setItem("userEmail", data.email || "");
      localStorage.setItem("tokenExpiresAt", data.expiresAt || "");
      localStorage.setItem(
        "isExternalUser",
        String(data.role === "External")
      );

      // 🔁 Redirect condizionato basato sul ruolo
      window.location.href =
        data.role === "External" ? "/external-dashboard" : "/dashboard";

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