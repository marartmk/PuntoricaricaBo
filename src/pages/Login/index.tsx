import { useState, useEffect } from "react";
import type { FC } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
  Eye,
  EyeOff,
  User,
  LogIn,
  Shield,
  Copy,
  ArrowLeft,
} from "lucide-react";
import styles from "./styles.module.css";

const API_URL = import.meta.env.VITE_API_URL;

interface LoginData {
  token: string;
  fullName: string;
  email: string;
  id: string;
  idUser: string;
  idCompany: string;
  companyName: string;
  role: string;
  expiresAt: string;
  requires2FA?: boolean;
  needsSetup2FA?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginData;
  errors: string[];
}

interface Setup2FAResponse {
  secret: string; // La backup key per inserimento manuale
  otpAuthUrl: string; // L'URL da convertire in QR code
}

// ✅ CORRETTO: L'API verify ritorna solo success
interface Verify2FAResponse {
  success: boolean;
}

type AuthStep = "LOGIN_FORM" | "SETUP_2FA" | "VERIFY_2FA";

const generateQRCodeUrl = (otpAuthUrl: string): string => {
  const encodedUrl = encodeURIComponent(otpAuthUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodedUrl}&size=256x256&ecc=M`;
};

const Login: FC = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message] = useState("Accesso Area Backoffice");

  // Stati per gestione 2FA
  const [authStep, setAuthStep] = useState<AuthStep>("LOGIN_FORM");
  const [twoFACode, setTwoFACode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupKey, setBackupKey] = useState("");
  const [showBackupKey, setShowBackupKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [currentToken, setCurrentToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // ✅ AGGIUNTO: Stato per salvare i dati completi dal login iniziale
  const [currentLoginData, setCurrentLoginData] = useState<LoginData | null>(
    null
  );

  /* redirect se già loggato */
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      // window.location.href = "/dashboard";
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "twoFACode") {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (authStep === "LOGIN_FORM") {
        handleLogin(e as any);
      } else if (authStep === "SETUP_2FA" || authStep === "VERIFY_2FA") {
        handleVerify2FA();
      }
    }
  };

  const validateForm = () => {
    if (authStep === "LOGIN_FORM") {
      if (!formData.username.trim()) {
        setError("Username è richiesto");
        return false;
      }
      if (!formData.password.trim()) {
        setError("Password è richiesta");
        return false;
      }
    } else if (authStep === "VERIFY_2FA" || authStep === "SETUP_2FA") {
      if (twoFACode.length !== 6) {
        setError("Inserisci un codice a 6 cifre");
        return false;
      }
    }
    return true;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
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

      if (!result.success) {
        setError(result.message || "Errore durante il login");
        return;
      }

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(", "));
        return;
      }

      const { data } = result;

      if (data.needsSetup2FA) {
        setCurrentToken(data.token);
        setCurrentUserId(data.idUser);
        setCurrentLoginData(data); // ✅ AGGIUNTO: Salva tutti i dati
        await initiate2FASetup(data.token, data.idUser, data.email);
        setAuthStep("SETUP_2FA");
      } else if (data.requires2FA) {
        setCurrentToken(data.token);
        setCurrentUserId(data.idUser);
        setCurrentLoginData(data); // ✅ AGGIUNTO: Salva tutti i dati
        setAuthStep("VERIFY_2FA");
      } else {
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

  const initiate2FASetup = async (
    token: string,
    userId: string,
    email: string
  ) => {
    try {
      const setupUrl = `${API_URL}/api/TwoFactor/setup?userid=${encodeURIComponent(
        userId
      )}&email=${encodeURIComponent(email)}`;

      const res = await fetch(setupUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Errore HTTP: ${res.status}`);
      }

      const result: Setup2FAResponse = await res.json();

      const qrImageUrl = generateQRCodeUrl(result.otpAuthUrl);
      setQrCodeUrl(qrImageUrl);
      setBackupKey(result.secret);

      console.log("OTP Auth URL:", result.otpAuthUrl);
      console.log("QR Image URL:", qrImageUrl);
    } catch (error) {
      console.error("Errore setup 2FA:", error);
      setError("Impossibile configurare l'autenticazione a due fattori");
    }
  };

  // ✅ CORRETTO: Funzione per verificare il codice 2FA
  const handleVerify2FA = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/TwoFactor/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          userId: currentUserId,
          code: twoFACode,
        }),
      });

      const result: Verify2FAResponse = await res.json();

      if (!res.ok || !result.success) {
        setError("Codice non valido");
        return;
      }

      // ✅ CORRETTO: Usa i dati salvati dal login iniziale
      if (!currentLoginData) {
        setError("Errore: dati di login mancanti");
        return;
      }

      if (authStep === "SETUP_2FA") {
        setSetupComplete(true);
        setTimeout(() => {
          completeLogin(currentLoginData);
        }, 1500);
      } else {
        completeLogin(currentLoginData);
      }
    } catch (error) {
      console.error("Errore verifica 2FA:", error);
      setError("Errore durante la verifica del codice");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: LoginData) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("IdCompany", data.idCompany || "");
    localStorage.setItem("fullName", data.fullName || "");
    localStorage.setItem("userId", data.id || "");
    localStorage.setItem("idUser", data.idUser || "");
    localStorage.setItem("userLevel", data.role || "");
    localStorage.setItem("companyName", data.companyName || "");
    localStorage.setItem("userEmail", data.email || "");
    localStorage.setItem("tokenExpiresAt", data.expiresAt || "");
    localStorage.setItem("isExternalUser", String(data.role === "External"));

    window.location.href =
      data.role === "External" ? "/external-dashboard" : "/dashboard";
  };

  const toggleBackupKey = () => {
    setShowBackupKey(!showBackupKey);
  };

  const copyBackupKey = async () => {
    try {
      await navigator.clipboard.writeText(backupKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy backup key:", err);
    }
  };

  const goBack = () => {
    if (authStep === "VERIFY_2FA" || authStep === "SETUP_2FA") {
      setAuthStep("LOGIN_FORM");
      setError("");
      setTwoFACode("");
      setQrCodeUrl("");
      setBackupKey("");
      setShowBackupKey(false);
      setCopied(false);
      setSetupComplete(false);
      setCurrentLoginData(null);
    }
  };

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
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code per 2FA"
                  className={styles.qrCode}
                />
              )}
            </div>

            <div className={styles.backupKeySection}>
              <p className={styles.backupKeyLabel}>
                Non riesci a scansionare il QR code?
              </p>
              <p className={styles.backupKeySubtext}>
                Inserisci la chiave manualmente:
              </p>

              {!showBackupKey ? (
                <button
                  type="button"
                  onClick={toggleBackupKey}
                  className={styles.showKeyBtn}
                >
                  Mostra Chiave
                </button>
              ) : (
                <div className={styles.backupKeyContainer}>
                  <code className={styles.backupKey}>{backupKey}</code>
                  <button
                    type="button"
                    onClick={copyBackupKey}
                    className={styles.copyBtn}
                    title="Copia chiave"
                  >
                    <Copy size={16} />
                  </button>
                  {copied && (
                    <span className={styles.copiedFeedback}>Copiato!</span>
                  )}
                </div>
              )}
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
        <p>
          Apri la tua app di autenticazione e inserisci il codice a 6 cifre:
        </p>

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
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>
      <div className={styles.geometricElement}></div>

      <div className={styles.loginOverlay} />

      <div className={styles.loginFormWrapper}>
        <h1 className={styles.loginTitle}>{message}</h1>

        <div className={styles.loginForm}>
          {authStep === "LOGIN_FORM" && (
            <>
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

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button
                type="submit"
                onClick={handleLogin}
                disabled={loading}
                className={styles.submitBtn}
                aria-label={
                  loading ? "Accesso in corso..." : "Effettua il login"
                }
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

          {authStep === "SETUP_2FA" && renderSetup2FA()}
          {authStep === "VERIFY_2FA" && renderVerify2FA()}
        </div>

        <p className={styles.loginFooter}>
          Sistema di gestione PuntoRicarica - Backoffice
        </p>
      </div>
    </div>
  );
};

export default Login;
