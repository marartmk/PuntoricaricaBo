import React, { useState, useEffect } from "react";
import "../Dashboard/dashboard.css"; // File principale condiviso
import "./report-custom.css"; // Solo personalizzazioni Report
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// Interfacce per i dati API
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

// Interfacce per Top Dealer
interface TopDealer {
  dealerCodice: string;
  dealerRagSoc: string;
  numeroSchede: number;
  importoTotale: number;
  importoMedio: number;
  primaOperazione: string;
  ultimaOperazione: string;
}

interface TopDealerResponse {
  success: boolean;
  message: string;
  data: {
    topDealer: TopDealer[];
    totalCount: number;
    filtriApplicati: {
      anno: number;
      mese: number | null;
      dataInizio: string | null;
      dataFine: string | null;
      dealerCodice: string | null;
      gestore: string | null;
      stato: string | null;
      provincia: string | null;
    };
    generatedAt: string;
  };
  errors: unknown[];
}

// Nuove interfacce per Statistiche Servizi
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
    filtriApplicati: {
      anno: number;
      mese: number | null;
      dataInizio: string | null;
      dataFine: string | null;
      dealerCodice: string | null;
      gestore: string | null;
      stato: string | null;
      provincia: string | null;
      categoriaServizio: string | null;
    };
  };
  errors: unknown[];
}

const Report: React.FC = () => {
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const [riepilogoData, setRiepilogoData] = useState<RiepilogoAnnuale | null>(
    null
  );
  const [isLoadingRiepilogo, setIsLoadingRiepilogo] = useState<boolean>(false);
  const [errorRiepilogo, setErrorRiepilogo] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Stati per Top Dealer
  const [topDealerData, setTopDealerData] = useState<TopDealer[]>([]);
  const [isLoadingTopDealer, setIsLoadingTopDealer] = useState<boolean>(false);
  const [errorTopDealer, setErrorTopDealer] = useState<string>("");

  // Nuovi stati per Statistiche Servizi
  const [serviceStatsData, setServiceStatsData] = useState<
    StatisticaServizio[]
  >([]);
  const [isLoadingServiceStats, setIsLoadingServiceStats] =
    useState<boolean>(false);
  const [errorServiceStats, setErrorServiceStats] = useState<string>("");
  const [serviceStatsViewMode, setServiceStatsViewMode] = useState<
    "month" | "year"
  >("month");
  const [selectedServiceMonth, setSelectedServiceMonth] = useState<number>(7); // Luglio 2025 (mese corrente)

  // Nuovo stato per modal fullscreen del grafico Top Dealer
  const [isTopDealerModalOpen, setIsTopDealerModalOpen] =
    useState<boolean>(false);
  const [isTopDealerModalClosing, setIsTopDealerModalClosing] =
    useState<boolean>(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // Carica i dati del riepilogo annuale e top dealer (solo quando cambia l'anno)
  useEffect(() => {
    fetchRiepilogoAnnuale(selectedYear);
    fetchTopDealer(selectedYear);
  }, [selectedYear]);

  // Carica le statistiche servizi (separato per evitare reload non necessari)
  useEffect(() => {
    if (serviceStatsViewMode === "month") {
      fetchServiceStats(selectedYear, selectedServiceMonth);
    } else {
      fetchServiceStats(selectedYear);
    }
  }, [selectedYear, serviceStatsViewMode, selectedServiceMonth]);

  // Gestione del tasto Esc per chiudere il modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        isTopDealerModalOpen &&
        !isTopDealerModalClosing
      ) {
        closeTopDealerModal();
      }
    };

    if (isTopDealerModalOpen) {
      document.addEventListener("keydown", handleEsc);
      // Previeni lo scroll del body quando il modal è aperto
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      // Ripristina lo scroll del body
      document.body.style.overflow = "unset";
    };
  }, [isTopDealerModalOpen, isTopDealerModalClosing]);

  // Funzione per recuperare il riepilogo annuale
  const fetchRiepilogoAnnuale = async (anno: number) => {
    setIsLoadingRiepilogo(true);
    setErrorRiepilogo("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(
        `${API_URL}/api/Reports/riepilogo-annuale?anno=${anno}`,
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

      if (data.success && data.data) {
        setRiepilogoData(data.data);
      } else {
        throw new Error(data.message || "Errore nel recupero dei dati");
      }
    } catch (error) {
      console.error("Errore nel caricamento riepilogo annuale:", error);
      if (error instanceof Error) {
        setErrorRiepilogo(error.message);
      } else {
        setErrorRiepilogo("Errore imprevisto nel caricamento dei dati");
      }
    } finally {
      setIsLoadingRiepilogo(false);
    }
  };

  // Funzione per recuperare i top dealer
  const fetchTopDealer = async (anno: number, top: number = 10) => {
    setIsLoadingTopDealer(true);
    setErrorTopDealer("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      const response = await fetch(
        `${API_URL}/api/Reports/top-dealer?Anno=${anno}&top=${top}`,
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
          `Errore nel caricamento top dealer: ${response.status}`
        );
      }

      const data: TopDealerResponse = await response.json();

      if (data.success && data.data?.topDealer) {
        setTopDealerData(data.data.topDealer);
      } else {
        throw new Error(data.message || "Errore nel recupero dei top dealer");
      }
    } catch (error) {
      console.error("Errore nel caricamento top dealer:", error);
      if (error instanceof Error) {
        setErrorTopDealer(error.message);
      } else {
        setErrorTopDealer("Errore imprevisto nel caricamento dei top dealer");
      }
    } finally {
      setIsLoadingTopDealer(false);
    }
  };

  // Nuova funzione per recuperare le statistiche servizi
  const fetchServiceStats = async (anno: number, mese?: number) => {
    setIsLoadingServiceStats(true);
    setErrorServiceStats("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      // Costruisce l'URL con i parametri
      let url = `${API_URL}/api/Reports/stats-by-service-category?anno=${anno}&stato=Y`;
      if (mese) {
        url += `&mese=${mese}`;
      }

      const response = await fetch(url, {
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
        throw new Error(
          `Errore nel caricamento statistiche servizi: ${response.status}`
        );
      }

      const data: StatsByServiceResponse = await response.json();

      if (data.success && data.data?.statistiche) {
        setServiceStatsData(data.data.statistiche);
      } else {
        throw new Error(
          data.message || "Errore nel recupero delle statistiche servizi"
        );
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
    } finally {
      setIsLoadingServiceStats(false);
    }
  };

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
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

  // Funzione per formattare i dati per il grafico delle vendite
  const prepareChartData = () => {
    if (!riepilogoData?.dettaglioMensile) return [];

    return riepilogoData.dettaglioMensile.map((item) => ({
      mese: item.nomeMese.charAt(0).toUpperCase() + item.nomeMese.slice(1, 3), // Gen, Feb, Mar...
      importoTotale: item.importoTotale,
      numeroSchede: item.numeroSchede,
      importoMedio: item.importoMedio,
      nomeMeseCompleto: item.nomeMese,
    }));
  };

  // Funzione per preparare i dati dei top dealer per il grafico
  const prepareTopDealerData = () => {
    if (!topDealerData || topDealerData.length === 0) return [];

    // Palette di colori per le barre (dal miglior performer al peggiore)
    const colorPalette = [
      "#1f8b4c", // Verde scuro - 1° posto
      "#28a745", // Verde - 2° posto
      "#20c997", // Verde acqua - 3° posto
      "#17a2b8", // Azzurro - 4° posto
      "#007bff", // Blu - 5° posto
      "#6f42c1", // Viola - 6° posto
      "#e83e8c", // Rosa - 7° posto
      "#fd7e14", // Arancione - 8° posto
      "#ffc107", // Giallo - 9° posto
      "#dc3545", // Rosso - 10° posto
    ];

    return topDealerData
      .sort((a, b) => b.importoTotale - a.importoTotale) // Ordina per fatturato decrescente
      .map((dealer, index) => {
        return {
          dealerLabel: dealer.dealerCodice, // Solo il codice dealer
          dealerNomeCompleto: dealer.dealerRagSoc.trim(),
          dealerCodice: dealer.dealerCodice,
          importoTotale: dealer.importoTotale,
          numeroSchede: dealer.numeroSchede,
          importoMedio: dealer.importoMedio,
          color: colorPalette[index] || "#6c757d", // Colore basato sulla posizione
        };
      });
  };

  // Nuova funzione per preparare i dati delle statistiche servizi per il grafico a torta
  const prepareServiceStatsData = () => {
    if (!serviceStatsData || serviceStatsData.length === 0) return [];

    // Colori specifici per tipologia di servizio (sempre coerenti)
    const colorMapping: Record<string, string> = {
      RICARICHE: "#002454", // Blu scuro aziendale - servizio principale
      BOLLETTINI: "#3498db", // Blu chiaro - secondo servizio per importanza
      SPEDIZIONI: "#2ecc71", // Verde
      PRODOTTI: "#f39c12", // Arancione
      ATTIVAZIONI: "#e74c3c", // Rosso
      VISURE: "#9b59b6", // Viola
      ALTRI: "#1abc9c", // Turchese per eventuali altri servizi
    };

    return serviceStatsData
      .sort((a, b) => b.importoTotale - a.importoTotale) // Ordina per importo decrescente
      .map((servizio) => ({
        name: servizio.nomeServizio,
        value: servizio.importoTotale,
        percentuale: servizio.percentuale,
        numeroOperazioni: servizio.numeroOperazioni,
        importoMedio: servizio.importoMedio,
        tipologia: servizio.tipologiaServizio,
        fill: colorMapping[servizio.tipologiaServizio] || "#95a5a6",
        color: colorMapping[servizio.tipologiaServizio] || "#95a5a6", // Aggiungo anche color per la legenda
      }));
  };

  // Funzione per aggiornare tutti i dati
  const refreshAllData = () => {
    fetchRiepilogoAnnuale(selectedYear);
    fetchTopDealer(selectedYear);
    // Ricarica statistiche servizi in base alla modalità corrente
    if (serviceStatsViewMode === "month") {
      fetchServiceStats(selectedYear, selectedServiceMonth);
    } else {
      fetchServiceStats(selectedYear);
    }
  };

  // Funzione helper per ottenere il nome del mese
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

  // Funzione per cambiare modalità di visualizzazione servizi
  const handleServiceStatsViewChange = (
    mode: "month" | "year",
    month?: number
  ) => {
    setServiceStatsViewMode(mode);
    if (mode === "month" && month) {
      setSelectedServiceMonth(month);
    }
  };

  // Funzioni per gestire il modal fullscreen del Top Dealer
  const openTopDealerModal = () => {
    setIsTopDealerModalOpen(true);
    setIsTopDealerModalClosing(false);
  };

  const closeTopDealerModal = () => {
    setIsTopDealerModalClosing(true);
    // Aspetta che l'animazione finisca prima di chiudere completamente
    setTimeout(() => {
      setIsTopDealerModalOpen(false);
      setIsTopDealerModalClosing(false);
    }, 300); // Durata dell'animazione CSS (0.3s)
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } report-page`}
      id="wrapper"
    >
      {/* Sidebar identica alla dashboard */}
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      {/* Main Content */}
      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        {/* Page content */}
        <div className="container-fluid">
          <div>
            <p />
            <p />
          </div>

          {/* Header della pagina Report */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="report-title">
              <i className="fa-solid fa-chart-line me-2"></i>
              Report e Analytics {riepilogoData && `- ${riepilogoData.anno}`}
            </h2>
            <div className="d-flex gap-2">
              <div className="btn-group">
                <button
                  className="btn btn-outline-primary-dark dropdown-toggle"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fa-solid fa-calendar me-1"></i>
                  Anno {selectedYear}
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSelectedYear(2025)}
                    >
                      2025
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSelectedYear(2024)}
                    >
                      2024
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setSelectedYear(2023)}
                    >
                      2023
                    </button>
                  </li>
                </ul>
              </div>
              <button className="btn btn-outline-primary-dark">
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={refreshAllData}
                disabled={
                  isLoadingRiepilogo ||
                  isLoadingTopDealer ||
                  isLoadingServiceStats
                }
              >
                <i
                  className={`fa-solid ${
                    isLoadingRiepilogo ||
                    isLoadingTopDealer ||
                    isLoadingServiceStats
                      ? "fa-spinner fa-spin"
                      : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Prima riga: KPI Cards con dati reali */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Fatturato Annuale</span>
                  <i className="fa-solid fa-euro-sign"></i>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  {riepilogoData ? (
                    <div className="text-center">
                      <h2 className="text-success mb-2">
                        {formatCurrency(riepilogoData.importoTotale)}
                      </h2>
                      <small className="text-muted">
                        Anno {riepilogoData.anno}
                      </small>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-line fa-2x mb-2"></i>
                        <div>Caricamento...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Transazioni Totali</span>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  {riepilogoData ? (
                    <div className="text-center">
                      <h2 className="text-primary mb-2">
                        {riepilogoData.numeroSchedeUniche.toLocaleString(
                          "it-IT"
                        )}
                      </h2>
                      <small className="text-muted">Schede processate</small>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-bar fa-2x mb-2"></i>
                        <div>Caricamento...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Dealer Attivi</span>
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  {riepilogoData ? (
                    <div className="text-center">
                      <h2 className="text-info mb-2">
                        {riepilogoData.numeroDealerDistinti.toLocaleString(
                          "it-IT"
                        )}
                      </h2>
                      <small className="text-muted">Dealer unici</small>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-pie fa-2x mb-2"></i>
                        <div>Caricamento...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Importo Medio</span>
                  <i className="fa-solid fa-calculator"></i>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  {riepilogoData ? (
                    <div className="text-center">
                      <h2 className="text-warning mb-2">
                        {formatCurrency(
                          riepilogoData.importoTotale /
                            riepilogoData.numeroSchedeUniche
                        )}
                      </h2>
                      <small className="text-muted">Per transazione</small>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-area fa-2x mb-2"></i>
                        <div>Caricamento...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga: Grafici principali */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Andamento Vendite</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-calendar"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-filter"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-download"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {isLoadingRiepilogo ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati vendite...</h5>
                      </div>
                    </div>
                  ) : errorRiepilogo ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorRiepilogo}</p>
                        <button
                          className="btn btn-primary-dark btn-sm"
                          onClick={() => fetchRiepilogoAnnuale(selectedYear)}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : riepilogoData ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart
                        data={prepareChartData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="mese" stroke="#666" fontSize={12} />
                        <YAxis
                          stroke="#666"
                          fontSize={12}
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === "importoTotale") {
                              return [formatCurrency(value), "Fatturato"];
                            }
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Mese: ${label}`}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="importoTotale"
                          stroke="#002454"
                          strokeWidth={3}
                          dot={{ fill: "#002454", strokeWidth: 2, r: 6 }}
                          activeDot={{
                            r: 8,
                            stroke: "#002454",
                            strokeWidth: 2,
                          }}
                          name="Fatturato Mensile"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-line fa-3x mb-3"></i>
                        <h5>Nessun dato disponibile</h5>
                        <p>Seleziona un anno per visualizzare l'andamento</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>
                    Distribuzione Tipologie Servizi
                    {serviceStatsViewMode === "month"
                      ? ` - ${getMonthName(
                          selectedServiceMonth
                        )} ${selectedYear}`
                      : ` - Anno ${selectedYear}`}
                  </span>
                  <div className="menu-right">
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-light dropdown-toggle"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{ fontSize: "11px", padding: "2px 8px" }}
                      >
                        <i className="fa-solid fa-calendar me-1"></i>
                        {serviceStatsViewMode === "month"
                          ? getMonthName(selectedServiceMonth)
                          : "Anno"}
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <h6 className="dropdown-header">
                            Visualizzazione Mensile
                          </h6>
                        </li>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                          (month) => (
                            <li key={month}>
                              <button
                                className={`dropdown-item ${
                                  serviceStatsViewMode === "month" &&
                                  selectedServiceMonth === month
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleServiceStatsViewChange("month", month)
                                }
                              >
                                {getMonthName(month)}
                              </button>
                            </li>
                          )
                        )}
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <button
                            className={`dropdown-item ${
                              serviceStatsViewMode === "year" ? "active" : ""
                            }`}
                            onClick={() => handleServiceStatsViewChange("year")}
                          >
                            <i className="fa-solid fa-calendar-days me-2"></i>
                            Intero Anno {selectedYear}
                          </button>
                        </li>
                      </ul>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-chart-pie"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {isLoadingServiceStats ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h6>Caricamento statistiche servizi...</h6>
                        <small>
                          {serviceStatsViewMode === "month"
                            ? `${getMonthName(
                                selectedServiceMonth
                              )} ${selectedYear}`
                            : `Anno ${selectedYear}`}
                        </small>
                      </div>
                    </div>
                  ) : errorServiceStats ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h6>Errore nel caricamento</h6>
                        <p>{errorServiceStats}</p>
                        <button
                          className="btn btn-primary-dark btn-sm"
                          onClick={() => {
                            if (serviceStatsViewMode === "month") {
                              fetchServiceStats(
                                selectedYear,
                                selectedServiceMonth
                              );
                            } else {
                              fetchServiceStats(selectedYear);
                            }
                          }}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : serviceStatsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={prepareServiceStatsData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {prepareServiceStatsData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(
                            value: number,
                            name: string,
                            props: any
                          ) => [
                            formatCurrency(value),
                            `${
                              props.payload.name
                            } (${props.payload.percentuale.toFixed(1)}%)`,
                          ]}
                          labelFormatter={() => ""}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                      {/* Legenda personalizzata per controllo totale sui colori */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          marginTop: "10px",
                          fontSize: "12px",
                          gap: "10px",
                        }}
                      >
                        {prepareServiceStatsData().map((entry, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: entry.fill,
                              }}
                            />
                            <span>
                              {entry.name} ({entry.percentuale.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-pie fa-3x mb-3"></i>
                        <h6>Nessun dato disponibile</h6>
                        <p>
                          Non ci sono statistiche servizi per
                          {serviceStatsViewMode === "month"
                            ? ` ${getMonthName(
                                selectedServiceMonth
                              )} ${selectedYear}`
                            : ` l'anno ${selectedYear}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terza riga: Report dettagliati */}
          <div className="row mb-4">
            <div className="col-xl-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Top 10 Clienti per Fatturato</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-sort"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-table"></i>
                    </div>
                    <div
                      className="menu-icon"
                      onClick={openTopDealerModal}
                      style={{ cursor: "pointer" }}
                      title="Visualizza a schermo intero"
                    >
                      <i className="fa-solid fa-expand"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {isLoadingTopDealer ? (
                    <div className="chart-placeholder medium">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h6>Caricamento top dealer...</h6>
                      </div>
                    </div>
                  ) : errorTopDealer ? (
                    <div className="chart-placeholder medium">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h6>Errore nel caricamento</h6>
                        <p>{errorTopDealer}</p>
                        <button
                          className="btn btn-primary-dark btn-sm"
                          onClick={() => fetchTopDealer(selectedYear)}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : topDealerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={prepareTopDealerData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="dealerLabel"
                          stroke="#666"
                          fontSize={11}
                          angle={0}
                          textAnchor="middle"
                          height={30}
                          interval={0}
                        />
                        <YAxis
                          stroke="#666"
                          fontSize={10}
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Fatturato",
                          ]}
                          labelFormatter={(label) => {
                            const dealer = topDealerData.find(
                              (d) => d.dealerCodice === label
                            );
                            return dealer
                              ? `${
                                  dealer.dealerCodice
                                } - ${dealer.dealerRagSoc.trim()}`
                              : label;
                          }}
                          labelStyle={{ fontSize: "12px", fontWeight: "bold" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Bar dataKey="importoTotale" radius={[4, 4, 0, 0]}>
                          {prepareTopDealerData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder medium">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-table fa-3x mb-3"></i>
                        <h6>Nessun dato disponibile</h6>
                        <p>Non ci sono dealer per l'anno selezionato</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-6 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Performance Terminali per Zona</span>
                  <i className="fa-solid fa-map-location-dot"></i>
                </div>
                <div className="card-body">
                  <div className="chart-placeholder medium">
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-chart-bar fa-3x mb-3"></i>
                      <h6>Grafico a Barre</h6>
                      <p>Prestazioni per area geografica</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quarta riga: Analytics avanzati */}
          <div className="row mb-4">
            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Tasso di Successo Transazioni</span>
                  <i className="fa-solid fa-check-circle"></i>
                </div>
                <div className="card-body">
                  <div className="chart-placeholder small">
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-gauge-high fa-3x mb-3"></i>
                      <h6>Gauge Chart</h6>
                      <p>Percentuale successo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Orari di Picco</span>
                  <i className="fa-solid fa-clock"></i>
                </div>
                <div className="card-body">
                  <div className="chart-placeholder small">
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-chart-column fa-3x mb-3"></i>
                      <h6>Heatmap Orari</h6>
                      <p>Attività per fascia oraria</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Crescita Mensile</span>
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
                <div className="card-body">
                  <div className="chart-placeholder small">
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-chart-line fa-3x mb-3"></i>
                      <h6>Grafico Crescita</h6>
                      <p>Variazione percentuale</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quinta riga: Report tabellari */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Report Dettagliato Transazioni</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-search"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-filter"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-file-excel"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-print"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="chart-placeholder full">
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-table fa-3x mb-3"></i>
                      <h5>Tabella Dettagliata Transazioni</h5>
                      <p>
                        Data, Cliente, Importo, Terminale, Stato, Commissioni
                      </p>
                      <small>
                        Con funzionalità di ricerca, filtri e ordinamento
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p />
            <p />
          </div>
        </div>
      </div>

      {/* Modal Fullscreen per Top 10 Dealer */}
      {isTopDealerModalOpen && (
        <div
          className={`modal fade show modal-fullscreen-overlay ${
            isTopDealerModalClosing ? "modal-closing" : "modal-opening"
          }`}
          style={{ display: "block" }}
          tabIndex={-1}
          onClick={closeTopDealerModal}
        >
          <div
            className={`modal-dialog modal-fullscreen modal-fullscreen-content ${
              isTopDealerModalClosing
                ? "modal-content-closing"
                : "modal-content-opening"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fa-solid fa-chart-bar me-2"></i>
                  Top 10 Clienti per Fatturato - Anno {selectedYear}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeTopDealerModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4">
                {isLoadingTopDealer ? (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ height: "60vh" }}
                  >
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-spinner fa-spin fa-4x mb-4"></i>
                      <h4>Caricamento dati...</h4>
                    </div>
                  </div>
                ) : errorTopDealer ? (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ height: "60vh" }}
                  >
                    <div className="text-center text-danger">
                      <i className="fa-solid fa-exclamation-triangle fa-4x mb-4"></i>
                      <h4>Errore nel caricamento</h4>
                      <p className="mb-4">{errorTopDealer}</p>
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={() => fetchTopDealer(selectedYear)}
                      >
                        <i className="fa-solid fa-refresh me-2"></i>
                        Riprova
                      </button>
                    </div>
                  </div>
                ) : topDealerData.length > 0 ? (
                  <div style={{ height: "80vh" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareTopDealerData()}
                        margin={{ top: 40, right: 40, left: 40, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="dealerLabel"
                          stroke="#666"
                          fontSize={14}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis
                          stroke="#666"
                          fontSize={14}
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Fatturato",
                          ]}
                          labelFormatter={(label) => {
                            const dealer = topDealerData.find(
                              (d) => d.dealerCodice === label
                            );
                            return dealer
                              ? `${
                                  dealer.dealerCodice
                                } - ${dealer.dealerRagSoc.trim()}`
                              : label;
                          }}
                          labelStyle={{ fontSize: "14px", fontWeight: "bold" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            fontSize: "14px",
                          }}
                        />
                        <Bar dataKey="importoTotale" radius={[6, 6, 0, 0]}>
                          {prepareTopDealerData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Statistiche aggiuntive in modalità fullscreen */}
                    <div className="row mt-4">
                      <div className="col-md-3">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h5 className="card-title">Totale Dealer</h5>
                            <h3 className="text-primary">
                              {topDealerData.length}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h5 className="card-title">Fatturato Totale</h5>
                            <h3 className="text-success">
                              {formatCurrency(
                                topDealerData.reduce(
                                  (sum, dealer) => sum + dealer.importoTotale,
                                  0
                                )
                              )}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h5 className="card-title">Miglior Performer</h5>
                            <h3 className="text-warning">
                              {topDealerData[0]?.dealerCodice || "N/A"}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <h5 className="card-title">Media Fatturato</h5>
                            <h3 className="text-info">
                              {formatCurrency(
                                topDealerData.reduce(
                                  (sum, dealer) => sum + dealer.importoTotale,
                                  0
                                ) / topDealerData.length
                              )}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ height: "60vh" }}
                  >
                    <div className="text-center text-muted">
                      <i className="fa-solid fa-table fa-4x mb-4"></i>
                      <h4>Nessun dato disponibile</h4>
                      <p>Non ci sono dealer per l'anno {selectedYear}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeTopDealerModal}
                >
                  <i className="fa-solid fa-times me-2"></i>
                  Chiudi
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Implementare export PDF/Excel in futuro
                    alert("Funzionalità di export in arrivo!");
                  }}
                >
                  <i className="fa-solid fa-download me-2"></i>
                  Esporta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;
