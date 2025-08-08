import { useState, useEffect } from "react";
import type { FC } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Eye, EyeOff, User, LogIn, Shield, Copy, Check, ArrowLeft } from "lucide-react";
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
  // ✅ AGGIUNTO: Proprietà per gestire 2FA
  requires2FA?: boolean;
  needsSetup2FA?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginData;
  errors: string[];
}

// ✅ AGGIUNTO: Interfacce per 2FA
interface Setup2FAResponse {
  success: boolean;
  data: {
    qrCodeUrl: string;
    backupKey: string;
  };
  message: string;
}

interface Verify2FAResponse {
  success: boolean;
  message: string;
  data: LoginData;
}

// ✅ AGGIUNTO: Tipo per gestire gli step di autenticazione
type AuthStep = 'LOGIN_FORM' | 'SETUP_2FA' | 'VERIFY_2FA';

const Login: FC = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message] = useState("Accesso Area Backoffice");

  // ✅ AGGIUNTO: Stati per la gestione 2FA
  const [authStep, setAuthStep] = useState<AuthStep>('LOGIN_FORM');
  const [twoFACode, setTwoFACode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupKey, setBackupKey] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentToken, setCurrentToken] = useState(""); // Per mantenere il token tra le chiamate

  /* redirect se già loggato */
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      // window.location.href = "/dashboard";
    }
  }, []);

  // ✅ MODIFICATO: Gestisce anche il codice 2FA
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'twoFACode') {
      // Solo 6 cifre per il codice 2FA
      if (value.length <= 6 && /^\d*$/.test(value)) {
        setTwoFACode(value);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (error) setError("");
  };

  // ✅ AGGIUNTO: Gestione tasto Enter per tutti i form
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (authStep === 'LOGIN_FORM') {
        handleLogin(e as any);
      } else if (authStep === 'SETUP_2FA' || authStep === 'VERIFY_2FA') {
        handleVerify2FA();
      }
    }
  };

  // ✅ MODIFICATO: Validazione per tutti gli step
  const validateForm = () => {
    if (authStep === 'LOGIN_FORM') {
      if (!formData.username.trim()) {
        setError("Username è richiesto");
        return false;
      }
      if (!formData.password.trim()) {
        setError("Password è richiesta");
        return false;
      }
    } else if (authStep === 'VERIFY_2FA' || authStep === 'SETUP_2FA') {
      if (twoFACode.length !== 6) {
        setError("Inserisci un codice a 6 cifre");
        return false;
      }
    }
    return true;
  };

  // ✅ MODIFICATO: Login originale + gestione 2FA
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

      // ✅ AGGIUNTO: Gestione flussi 2FA
      if (data.needsSetup2FA) {
        // Prima volta - setup 2FA
        setCurrentToken(data.token);
        await initiate2FASetup(data.token);
        setAuthStep('SETUP_2FA');
      } else if (data.requires2FA) {
        // Login successivi - richiedi codice 2FA
        setCurrentToken(data.token);
        setAuthStep('VERIFY_2FA');
      } else {
        // Login normale senza 2FA
        completeLogin(data);
      }

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

  // ✅ AGGIUNTO: Inizia il setup 2FA
  const initiate2FASetup = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/TwoFactor/setup`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Errore durante il setup 2FA");

      const result: Setup2FAResponse = await res.json();
      
      if (result.success) {
        setQrCodeUrl(result.data.qrCodeUrl);
        setBackupKey(result.data.backupKey);
      } else {
        setError("Errore durante il setup 2FA");
      }
    } catch (error) {
      console.error("Errore setup 2FA:", error);
      setError("Impossibile configurare l'autenticazione a due fattori");
    }
  };

  // ✅ AGGIUNTO: Verifica codice 2FA
  const handleVerify2FA = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/TwoFactor/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ 
          code: twoFACode 
        }),
      });

      const result: Verify2FAResponse = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Codice non valido");
        return;
      }

      if (authStep === 'SETUP_2FA') {
        setSetupComplete(true);
        // Attendi un momento poi completa il login
        setTimeout(() => {
          completeLogin(result.data);
        }, 1500);
      } else {
        completeLogin(result.data);
      }

    } catch (error) {
      console.error("Errore verifica 2FA:", error);
      setError("Errore durante la verifica del codice");
    } finally {
      setLoading(false);
    }
  };

  // ✅ ORIGINALE: Completa il login (invariato)
  const completeLogin = (data: LoginData) => {
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
  };

  // ✅ AGGIUNTO: Funzioni di utilità per 2FA
  const copyBackupKey = async () => {
    try {
      await navigator.clipboard.writeText(backupKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy backup key:', err);
    }
  };

  const goBack = () => {
    if (authStep === 'VERIFY_2FA' || authStep === 'SETUP_2FA') {
      setAuthStep('LOGIN_FORM');
      setError("");
      setTwoFACode("");
    }
  };

  // ✅ AGGIUNTO: Render setup 2FA
  const renderSetup2FA = () => (
    <div className={styles.twofaContainer}>
      <div className={styles.twofaHeader}>
        <button onClick={goBack} className={styles.backBtn} type="button">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.twofaTitle}>
          <Shield size={24} className={styles.shieldIcon} />
          <h3>Configura Autenticazione a Due Fattori</h3>
        </div>
      </div>

      {!setupComplete ? (
        <>
          <div className={styles.recommendedApps}>
            <p>App da utilizzare</p>
            <div className={styles.authApps}>              
              <div className={styles.authApp}>
                <div className={`${styles.appIcon} ${styles.google}`}></div>
                <span>Google Authenticator</span>
              </div>
            </div>
          </div>

          <div className={styles.setupContent}>
            <p>Apri la tua app di autenticazione e scansiona il codice QR:</p>
            
            <div className={styles.qrCodeContainer}>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code per 2FA" className={styles.qrCode} />}
            </div>

            <div className={styles.backupKeySection}>
              <p><strong>Chiave di backup:</strong></p>
              <div className={styles.backupKeyContainer}>
                <code className={styles.backupKey}>{backupKey}</code>
                <button 
                  type="button" 
                  onClick={copyBackupKey}
                  className={styles.copyBtn}
                  title="Copia chiave di backup"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <small>Salva questa chiave in un posto sicuro. Ti servirà se perdi l'accesso al dispositivo.</small>
            </div>

            <div className={styles.verifyForm}>
              <div className={styles.inputGroup}>
                <input
                  name="twoFACode"
                  value={twoFACode}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Inserisci il codice a 6 cifre"
                  className={`${styles.input} ${styles.twofaInput}`}
                  disabled={loading}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button
                type="button"
                onClick={handleVerify2FA}
                disabled={loading || twoFACode.length !== 6}
                className={styles.submitBtn}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner} />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    <span>Completa Configurazione</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.setupSuccess}>
          <div className={styles.successIcon}>✓</div>
          <h3>Configurazione completata!</h3>
          <p>L'autenticazione a due fattori è stata attivata con successo.</p>
        </div>
      )}
    </div>
  );

  // ✅ AGGIUNTO: Render verifica 2FA
  const renderVerify2FA = () => (
    <div className={styles.twofaContainer}>
      <div className={styles.twofaHeader}>
        <button onClick={goBack} className={styles.backBtn} type="button">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.twofaTitle}>
          <Shield size={24} className={styles.shieldIcon} />
          <h2>Verifica Autenticazione</h2>
        </div>
      </div>

      <div className={styles.verifyContent}>
        <p>Apri la tua app di autenticazione e inserisci il codice a 6 cifre:</p>
        
        <div className={styles.verifyForm}>
          <div className={styles.inputGroup}>
            <input
              name="twoFACode"
              value={twoFACode}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              className={`${styles.input} ${styles.twofaInput}`}
              disabled={loading}
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            type="button"
            onClick={handleVerify2FA}
            disabled={loading || twoFACode.length !== 6}
            className={styles.submitBtn}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>Verifica e Accedi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.loginPage}>
      {/* Elementi geometrici decorativi */}
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>

      {/* Overlay con effetto blur */}
      <div className={styles.loginOverlay} />

      {/* Form di login moderno */}
      <div className={styles.loginFormWrapper}>
        <h1 className={styles.loginTitle}>{message}</h1>

        <div className={styles.loginForm}>
          {/* ✅ MODIFICATO: Rendering condizionale basato su authStep */}
          {authStep === 'LOGIN_FORM' && (
            <>
              {/* Campo Username */}
              <div className={styles.inputGroup}>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
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
                  onKeyDown={handleKeyDown}
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
                onClick={handleLogin}
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
            </>
          )}

          {/* ✅ AGGIUNTO: Rendering per setup 2FA */}
          {authStep === 'SETUP_2FA' && renderSetup2FA()}
          
          {/* ✅ AGGIUNTO: Rendering per verifica 2FA */}
          {authStep === 'VERIFY_2FA' && renderVerify2FA()}
        </div>

        <p className={styles.loginFooter}>
          Sistema di gestione PuntoRicarica - Backoffice
        </p>
      </div>
    </div>
  );
};

export default Login;