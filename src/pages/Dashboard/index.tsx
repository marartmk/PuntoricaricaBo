import React, { useState, useEffect } from "react";
import "./dashboard.css";
import "./dashboard-custom.css"; // Nuovo CSS dedicato alla dashboard
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// Interfacce per i dati API (same as report page)
interface DettaglioMensile {
  anno: number;
  mese: number;
  nomeMese: string;
  numeroSchede: number;
  numeroDealerDistinti: number;
  importoTotale: number;
  importoMedio: number;
}

interface RiepilogoAnnuale {
  anno: number;
  numeroSchedeUniche: number;
  numeroDealerDistinti: number;
  importoTotale: number;
  dettaglioMensile: DettaglioMensile[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: RiepilogoAnnuale;
  errors: unknown[];
}

interface StatisticaServizio {
  tipologiaServizio: string;
  nomeServizio: string;
  numeroOperazioni: number;
  importoTotale: number;
  importoMedio: number;
  percentuale: number;
  primaOperazione: string;
  ultimaOperazione: string;
}

interface StatsByServiceResponse {
  success: boolean;
  message: string;
  data: {
    statistiche: StatisticaServizio[];
    totali: {
      totaleOperazioni: number;
      importoComplessivo: number;
      numeroCategorie: number;
      soloConfermate: boolean;
      generatedAt: string;
    };
  };
  errors: unknown[];
}

interface DealerTransactionTotals {
  conTransazioni: number;
  senzaTransazioni: number;
}

interface DealerTransactionResponse {
  success: boolean;
  message: string;
  data: {
    totali: DealerTransactionTotals;
  };
  errors: unknown[];
}

interface AIMessage {
  id: number;
  type: "user" | "ai";
  message: string;
  timestamp: Date;
}

const Dashboard: React.FC = () => {
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // Stati per AI Assistant
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // Stati per i dati reali del mese corrente
  const [currentMonthData, setCurrentMonthData] =
    useState<DettaglioMensile | null>(null);
  const [serviceStatsData, setServiceStatsData] = useState<
    StatisticaServizio[]
  >([]);
  const [dealerTransactionData, setDealerTransactionData] =
    useState<DealerTransactionTotals | null>(null);

  // Stati di loading per ogni sezione
  const [isLoadingMonthData, setIsLoadingMonthData] = useState<boolean>(false);
  const [isLoadingServiceStats, setIsLoadingServiceStats] =
    useState<boolean>(false);
  const [isLoadingDealerStats, setIsLoadingDealerStats] =
    useState<boolean>(false);

  // Stati di errore
  const [errorMonthData, setErrorMonthData] = useState<string>("");
  const [errorServiceStats, setErrorServiceStats] = useState<string>("");
  const [errorDealerStats, setErrorDealerStats] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL;

  // Data corrente per i filtri
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    // Carica dati del mese corrente all'avvio
    fetchCurrentMonthData();
    fetchCurrentMonthServiceStats();
    fetchCurrentMonthDealerStats();
  }, []);

  // Funzione per recuperare i dati del mese corrente
  const fetchCurrentMonthData = async () => {
    setIsLoadingMonthData(true);
    setErrorMonthData("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(
        `${API_URL}/api/Reports/riepilogo-annuale?anno=${currentYear}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(`Errore nel caricamento dati: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data?.dettaglioMensile) {
        // Trova i dati del mese corrente
        const currentMonthDetail = data.data.dettaglioMensile.find(
          (month) => month.mese === currentMonth
        );
        setCurrentMonthData(currentMonthDetail || null);
      } else {
        throw new Error(data.message || "Errore nel recupero dei dati");
      }
    } catch (error) {
      console.error("Errore nel caricamento dati mese corrente:", error);
      if (error instanceof Error) {
        setErrorMonthData(error.message);
      } else {
        setErrorMonthData("Errore imprevisto nel caricamento dei dati");
      }
    } finally {
      setIsLoadingMonthData(false);
    }
  };

  // Funzione per recuperare le statistiche servizi del mese corrente
  const fetchCurrentMonthServiceStats = async () => {
    setIsLoadingServiceStats(true);
    setErrorServiceStats("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(
        `${API_URL}/api/Reports/stats-by-service-category?anno=${currentYear}&mese=${currentMonth}&stato=Y`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(
          `Errore nel caricamento statistiche servizi: ${response.status}`
        );
      }

      const data: StatsByServiceResponse = await response.json();

      if (data.success && data.data?.statistiche) {
        setServiceStatsData(data.data.statistiche);
      } else {
        setServiceStatsData([]);
      }
    } catch (error) {
      console.error("Errore nel caricamento statistiche servizi:", error);
      if (error instanceof Error) {
        setErrorServiceStats(error.message);
      } else {
        setErrorServiceStats(
          "Errore imprevisto nel caricamento delle statistiche servizi"
        );
      }
      setServiceStatsData([]);
    } finally {
      setIsLoadingServiceStats(false);
    }
  };

  // Funzione per recuperare i totali dealer del mese corrente
  const fetchCurrentMonthDealerStats = async () => {
    setIsLoadingDealerStats(true);
    setErrorDealerStats("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(
        `${API_URL}/api/Reports/dealer-istransaction-totals?anno=${currentYear}&mese=${currentMonth}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(
          `Errore nel caricamento totali dealer: ${response.status}`
        );
      }

      const data: DealerTransactionResponse = await response.json();

      if (data.success && data.data?.totali) {
        setDealerTransactionData(data.data.totali);
      } else {
        setDealerTransactionData(null);
      }
    } catch (error) {
      console.error("Errore nel caricamento totali dealer:", error);
      if (error instanceof Error) {
        setErrorDealerStats(error.message);
      } else {
        setErrorDealerStats(
          "Errore imprevisto nel caricamento dei totali dealer"
        );
      }
    } finally {
      setIsLoadingDealerStats(false);
    }
  };

  // Funzione per ricaricare tutti i dati
  const refreshAllData = () => {
    fetchCurrentMonthData();
    fetchCurrentMonthServiceStats();
    fetchCurrentMonthDealerStats();
  };

  // Funzione per formattare i numeri in euro
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Funzione per ottenere il nome del mese
  const getMonthName = (monthNumber: number) => {
    const months = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    return months[monthNumber - 1] || "Mese non valido";
  };

  // Calcola le statistiche aggregate dai servizi
  const getServiceStatsAggregated = () => {
    if (!serviceStatsData || serviceStatsData.length === 0) {
      return {
        totalServices: 0,
        totalRevenue: 0,
        totalOperations: 0,
        avgTicket: 0,
      };
    }

    const totalRevenue = serviceStatsData.reduce(
      (sum, service) => sum + service.importoTotale,
      0
    );
    const totalOperations = serviceStatsData.reduce(
      (sum, service) => sum + service.numeroOperazioni,
      0
    );

    return {
      totalServices: serviceStatsData.length,
      totalRevenue,
      totalOperations,
      avgTicket: totalOperations > 0 ? totalRevenue / totalOperations : 0,
    };
  };

  // Calcola i dati del dealer con percentuali per il grafico
  const getDealerStats = () => {
    if (!dealerTransactionData) {
      return {
        attivi: 0,
        totali: 0,
        percentualeAttivi: 0,
        percentualeInattivi: 0,
      };
    }

    const attivi = dealerTransactionData.conTransazioni;
    const inattivi = dealerTransactionData.senzaTransazioni;
    const totali = attivi + inattivi;

    return {
      attivi,
      totali,
      percentualeAttivi: totali > 0 ? Math.round((attivi / totali) * 100) : 0,
      percentualeInattivi:
        totali > 0 ? Math.round((inattivi / totali) * 100) : 0,
    };
  };

  // Funzioni AI Assistant
  const getOpenAIApiKey = async (): Promise<string> => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error(
        "Token di autenticazione non trovato. Effettua il login."
      );
    }

    try {
      const response = await fetch(`${API_URL}/api/OpenAi/get-key`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(`Errore nel recupero dell'API key: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.apiKey) {
        throw new Error("API key non disponibile dal server");
      }

      return data.apiKey;
    } catch (error) {
      console.error("Errore nel recupero dell'API key:", error);
      throw error;
    }
  };

  const getAIResponse = async (question: string): Promise<string> => {
    try {
      const openaiApiKey = await getOpenAIApiKey();

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "Sei un assistente specializzato in analisi di KPI e prestazioni nelle vendite per un sistema di pagamenti e terminali POS. Rispondi in italiano in modo professionale e utile, focalizzandoti su analisi dati, metriche di performance, troubleshooting terminali e procedure operative.",
              },
              {
                role: "user",
                content: question,
              },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error("API key OpenAI non valida o scaduta");
        } else if (response.status === 429) {
          throw new Error(
            "Limite di utilizzo OpenAI raggiunto. Riprova tra poco."
          );
        } else if (response.status >= 500) {
          throw new Error("Servizio OpenAI temporaneamente non disponibile");
        }

        throw new Error(
          `Errore API OpenAI: ${response.status} - ${
            errorData.error?.message || "Errore sconosciuto"
          }`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error("Risposta non valida dal servizio AI");
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error("Errore chiamata OpenAI:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("Token di autenticazione") ||
          error.message.includes("Sessione scaduta")
        ) {
          window.location.href = "/login";
          return "Sessione scaduta. Reindirizzamento al login...";
        }
        return error.message;
      }

      return "Si è verificato un errore imprevisto. Riprova tra poco.";
    }
  };

  const handleSendQuestion = async () => {
    if (!currentQuestion.trim()) return;

    setAiError("");

    const questionToSend = currentQuestion;

    const userMessage: AIMessage = {
      id: Date.now(),
      type: "user",
      message: currentQuestion,
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setCurrentQuestion("");
    setIsAiTyping(true);

    try {
      const aiResponseText = await getAIResponse(questionToSend);

      const aiResponse: AIMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: aiResponseText,
        timestamp: new Date(),
      };

      setAiMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Errore durante la risposta AI:", error);

      let errorMessage = "Si è verificato un errore. Riprova tra poco.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setAiError(errorMessage);

      const errorAIMessage: AIMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: `⚠️ ${errorMessage}`,
        timestamp: new Date(),
      };

      setAiMessages((prev) => [...prev, errorAIMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // Gestione data e ora
  const [currentDateDisplay, setCurrentDateDisplay] = useState({
    day: "",
    date: "",
    month: "",
  });

  useEffect(() => {
    const days = [
      "Domenica",
      "Lunedì",
      "Martedì",
      "Mercoledì",
      "Giovedì",
      "Venerdì",
      "Sabato",
    ];
    const now = new Date();

    setCurrentDateDisplay({
      day: days[now.getDay()].toUpperCase(),
      date: now.getDate().toString(),
      month: now.toLocaleString("it-IT", { month: "long" }),
    });
  }, []);

  const serviceStatsAggregated = getServiceStatsAggregated();
  const dealerStats = getDealerStats();

  return (
    <div
      className={`d-flex dashboard-page ${
        menuState === "closed" ? "menu-closed" : ""
      }`}
      id="wrapper"
    >
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        <div className="container-fluid">
          <div>
            <p />
            <p />
            <p />
          </div>

          {/* Header con titolo e pulsante refresh */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="text-dark">
              <i className="fa-solid fa-chart-line me-2"></i>
              Dashboard - {getMonthName(currentMonth)} {currentYear}
            </h4>
            <button
              className="btn btn-primary-dark"
              onClick={refreshAllData}
              disabled={
                isLoadingMonthData ||
                isLoadingServiceStats ||
                isLoadingDealerStats
              }
            >
              <i
                className={`fa-solid ${
                  isLoadingMonthData ||
                  isLoadingServiceStats ||
                  isLoadingDealerStats
                    ? "fa-spinner fa-spin"
                    : "fa-refresh"
                } me-1`}
              ></i>
              Aggiorna Dati
            </button>
          </div>

          {/* KPI Cards - LAYOUT 6 BOX (3+3) */}
          <div className="row g-4 mb-5">
            {/* Prima riga - 3 card principali */}
            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-primary kpi-card-compact">
                {isLoadingMonthData ? (
                  <div className="kpi-loading">
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span>Caricamento...</span>
                  </div>
                ) : errorMonthData ? (
                  <div className="kpi-error">
                    <i className="fa-solid fa-exclamation-triangle fa-2x"></i>
                    <span>Errore</span>
                    <button
                      className="btn btn-sm btn-outline-light mt-2"
                      onClick={fetchCurrentMonthData}
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                ) : currentMonthData ? (
                  <>
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-euro-sign kpi-icon-small"></i>
                      <div className="kpi-period-simple">
                        {getMonthName(currentMonth)} {currentYear}
                      </div>
                    </div>
                    <div className="kpi-value">
                      {formatCurrency(currentMonthData.importoTotale)}
                    </div>
                    <div className="kpi-label">Fatturato Mensile</div>
                    <div className="kpi-trend">
                      <i className="fa-solid fa-arrow-up"></i>
                      <span>+12.5% vs mese scorso</span>
                    </div>
                  </>
                ) : (
                  <div className="kpi-empty">
                    <i className="fa-solid fa-chart-line fa-2x"></i>
                    <span>Nessun dato disponibile</span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-secondary kpi-card-compact">
                {isLoadingMonthData ? (
                  <div className="kpi-loading">
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span>Caricamento...</span>
                  </div>
                ) : errorMonthData ? (
                  <div className="kpi-error">
                    <i className="fa-solid fa-exclamation-triangle fa-2x"></i>
                    <span>Errore</span>
                    <button
                      className="btn btn-sm btn-outline-light mt-2"
                      onClick={fetchCurrentMonthData}
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                ) : currentMonthData ? (
                  <>
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-credit-card kpi-icon-small"></i>
                      <div className="kpi-period-simple">
                        {getMonthName(currentMonth)} {currentYear}
                      </div>
                    </div>
                    <div className="kpi-value">
                      {currentMonthData.numeroSchede.toLocaleString("it-IT")}
                    </div>
                    <div className="kpi-label">Transazioni</div>
                    <div className="kpi-trend">
                      <i className="fa-solid fa-arrow-up"></i>
                      <span>+8.2% vs mese scorso</span>
                    </div>
                  </>
                ) : (
                  <div className="kpi-empty">
                    <i className="fa-solid fa-credit-card fa-2x"></i>
                    <span>Nessun dato disponibile</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box Dealer con Grafico a Torta */}
            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-success kpi-card-compact">
                {isLoadingDealerStats ? (
                  <div className="kpi-loading">
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span>Caricamento...</span>
                  </div>
                ) : errorDealerStats ? (
                  <div className="kpi-error">
                    <i className="fa-solid fa-exclamation-triangle fa-2x"></i>
                    <span>Errore</span>
                    <button
                      className="btn btn-sm btn-outline-light mt-2"
                      onClick={fetchCurrentMonthDealerStats}
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                ) : dealerTransactionData ? (
                  <>
                    {/* HEADER come gli altri box */}
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-users kpi-icon-small"></i>
                      <div className="kpi-period-simple">
                        {getMonthName(currentMonth)} {currentYear}
                      </div>
                    </div>

                    {/* CONTENUTO */}
                    <div className="dealer-box-header">
                      <div className="dealer-box-left">
                        <div className="kpi-value dealer-main-number">
                          {dealerStats.attivi.toLocaleString("it-IT")}
                        </div>
                        <div className="kpi-label">Dealer Attivi</div>
                        <div className="dealer-sub-text">
                          Su {dealerStats.totali.toLocaleString("it-IT")} totali
                        </div>
                      </div>

                      <div className="dealer-box-right">
                        <div className="mini-pie-chart">
                          <svg width="88" height="88" viewBox="0 0 60 60">
                            {/* base */}
                            <circle
                              cx="30"
                              cy="30"
                              r="25"
                              fill="none"
                              stroke="rgba(255,255,255,0.25)"
                              strokeWidth="8"
                            />
                            {/* progress (ruotiamo SOLO l’arco, non il testo) */}
                            <circle
                              cx="30"
                              cy="30"
                              r="25"
                              fill="none"
                              stroke="rgba(255,255,255,0.9)"
                              strokeWidth="8"
                              strokeDasharray={`${
                                (dealerStats.percentualeAttivi * 157) / 100
                              } 157`}
                              strokeDashoffset="39.25"
                              transform="rotate(-90 30 30)"
                              strokeLinecap="round"
                            />
                            {/* testo orizzontale e centrato */}
                            <text
                              x="30"
                              y="35"
                              textAnchor="middle"
                              fill="white"
                              fontSize="14"
                              fontWeight="bold"
                            >
                              {dealerStats.percentualeAttivi}%
                            </text>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="kpi-empty">
                    <i className="fa-solid fa-users fa-2x"></i>
                    <span>Nessun dato disponibile</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seconda riga - 3 card */}
            {/* Box Oggi Arricchito */}
            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-calendar kpi-card-compact">
                <div className="kpi-header-simple">
                  <i className="fa-solid fa-calendar-day kpi-icon-small"></i>
                  <div className="kpi-period-simple">
                    {currentDateDisplay.month} {currentYear}
                  </div>
                </div>

                <div className="today-content">
                  <div className="today-date-section">
                    <div className="kpi-value kpi-value-date">
                      {currentDateDisplay.date}
                    </div>
                    <div className="kpi-label">{currentDateDisplay.day}</div>
                  </div>

                  <div className="today-stats">
                    <div className="today-stat-item">
                      <div className="today-stat-value">
                        {currentMonthData
                          ? Math.round(
                              currentMonthData.numeroSchede / 30
                            ).toLocaleString("it-IT")
                          : "---"}
                      </div>
                      <div className="today-stat-label">Transazioni oggi</div>
                    </div>
                    <div className="today-stat-item">
                      <div className="today-stat-value">
                        {currentMonthData
                          ? formatCurrency(
                              Math.round(currentMonthData.importoTotale / 30)
                            )
                          : "---"}
                      </div>
                      <div className="today-stat-label">Fatturato oggi</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-warning kpi-card-compact">
                {isLoadingMonthData ? (
                  <div className="kpi-loading">
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span>Caricamento...</span>
                  </div>
                ) : errorMonthData ? (
                  <div className="kpi-error">
                    <i className="fa-solid fa-exclamation-triangle fa-2x"></i>
                    <span>Errore</span>
                    <button
                      className="btn btn-sm btn-outline-light mt-2"
                      onClick={fetchCurrentMonthData}
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                ) : currentMonthData ? (
                  <>
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-calendar-day kpi-icon-small"></i>
                      <div className="kpi-period-simple">
                        {currentDateDisplay.month} {currentYear}
                      </div>
                    </div>
                    <div className="kpi-value">
                      {formatCurrency(currentMonthData.importoMedio)}
                    </div>
                    <div className="kpi-label">Importo Medio</div>
                    <div className="kpi-trend">
                      <i className="fa-solid fa-arrow-down"></i>
                      <span>-2.1% vs mese scorso</span>
                    </div>
                  </>
                ) : (
                  <div className="kpi-empty">
                    <i className="fa-solid fa-calculator fa-2x"></i>
                    <span>Nessun dato disponibile</span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-xl-4 col-lg-4 col-md-6">
              <div className="kpi-card kpi-card-purple kpi-card-compact">
                {isLoadingServiceStats ? (
                  <div className="kpi-loading">
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span>Caricamento...</span>
                  </div>
                ) : errorServiceStats ? (
                  <div className="kpi-error">
                    <i className="fa-solid fa-exclamation-triangle fa-2x"></i>
                    <span>Errore</span>
                    <button
                      className="btn btn-sm btn-outline-light mt-2"
                      onClick={fetchCurrentMonthServiceStats}
                    >
                      <i className="fa-solid fa-refresh"></i>
                    </button>
                  </div>
                ) : serviceStatsAggregated.totalRevenue > 0 ? (
                  <>
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-chart-bar kpi-icon-small"></i>
                      <div className="kpi-period-simple">Revenue Servizi</div>
                    </div>
                    <div className="kpi-value">
                      {formatCurrency(serviceStatsAggregated.totalRevenue)}
                    </div>
                    <div className="kpi-label">Fatturato Servizi</div>
                    <div className="kpi-trend">
                      <i className="fa-solid fa-arrow-up"></i>
                      <span>+15.7% vs mese scorso</span>
                    </div>
                  </>
                ) : (
                  <div className="kpi-empty">
                    <i className="fa-solid fa-chart-bar fa-2x"></i>
                    <span>Nessun dato disponibile</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Assistant Section - PROMINENTE E ENFATIZZATA */}
          <div className="ai-assistant-section mb-5">
            <div className="row">
              <div className="col-12">
                <div className="ai-assistant-container">
                  <div className="ai-assistant-header">
                    <div className="ai-header-content">
                      <div className="ai-header-left">
                        <div className="ai-icon-large">
                          <i className="fa-solid fa-robot"></i>
                        </div>
                        <div className="ai-header-text">
                          <h3>AI Assistant</h3>
                          <p>
                            Il tuo assistente intelligente per analisi KPI,
                            troubleshooting e procedure operative
                          </p>
                        </div>
                      </div>
                      <div className="ai-status">
                        <div className="ai-status-indicator online"></div>
                        <span>Online</span>
                      </div>
                    </div>
                  </div>

                  <div className="ai-assistant-body">
                    {aiError && (
                      <div className="alert alert-warning mb-3" role="alert">
                        <i className="fa-solid fa-exclamation-triangle"></i>{" "}
                        {aiError}
                      </div>
                    )}

                    <div className="ai-chat-container">
                      {aiMessages.length === 0 ? (
                        <div className="ai-welcome">
                          <div className="welcome-content">
                            <div className="welcome-icon">
                              <i className="fa-solid fa-comments"></i>
                            </div>
                            <h4>Benvenuto nell'AI Assistant!</h4>
                            <p className="text-muted">
                              Sono qui per aiutarti con analisi di KPI,
                              informazioni su transazioni, terminali di
                              pagamento e procedure operative. Cosa vorresti
                              sapere?
                            </p>
                            <div className="quick-actions">
                              <button
                                className="btn btn-outline-primary btn-sm me-2"
                                onClick={() =>
                                  setCurrentQuestion(
                                    "Analizza le performance del mese corrente"
                                  )
                                }
                              >
                                <i className="fa-solid fa-chart-line me-1"></i>
                                Analisi Performance
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm me-2"
                                onClick={() =>
                                  setCurrentQuestion(
                                    "Mostrami lo stato dei dealer"
                                  )
                                }
                              >
                                <i className="fa-solid fa-users me-1"></i>
                                Stato Dealer
                              </button>
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() =>
                                  setCurrentQuestion(
                                    "Come migliorare il tasso di attivazione?"
                                  )
                                }
                              >
                                <i className="fa-solid fa-lightbulb me-1"></i>
                                Suggerimenti
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="ai-messages">
                          {aiMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`ai-message ${msg.type}`}
                            >
                              <div className="message-content">
                                <div className="message-header">
                                  <span className="sender">
                                    {msg.type === "user" ? (
                                      <>
                                        <i className="fa-solid fa-user"></i> Tu
                                      </>
                                    ) : (
                                      <>
                                        <i className="fa-solid fa-robot"></i> AI
                                        Assistant
                                      </>
                                    )}
                                  </span>
                                  <span className="timestamp">
                                    {msg.timestamp.toLocaleTimeString("it-IT", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="message-text">
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          ))}
                          {isAiTyping && (
                            <div className="ai-message ai">
                              <div className="message-content">
                                <div className="message-header">
                                  <span className="sender">
                                    <i className="fa-solid fa-robot"></i> AI
                                    Assistant
                                  </span>
                                </div>
                                <div className="typing-indicator">
                                  <span></span>
                                  <span></span>
                                  <span></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ai-input-container">
                      <div className="ai-input-wrapper">
                        <textarea
                          className="ai-input"
                          value={currentQuestion}
                          onChange={(e) => setCurrentQuestion(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Scrivi la tua domanda qui... (es. Analizza le performance del mese, Problemi con i terminali, Suggerimenti per migliorare i KPI)"
                          rows={2}
                          disabled={isAiTyping}
                        />
                        <button
                          className="ai-send-btn"
                          onClick={handleSendQuestion}
                          disabled={!currentQuestion.trim() || isAiTyping}
                        >
                          <i className="fa-solid fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p />
            <p />
            <p />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
