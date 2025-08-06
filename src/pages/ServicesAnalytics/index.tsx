import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./services-analytics.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Interfacce per le statistiche dei servizi (API reale)
interface ServiceStatistic {
  tipologiaServizio: string;
  nomeServizio: string;
  numeroOperazioni: number;
  importoTotale: number;
  importoMedio: number;
  percentuale: number;
  primaOperazione: string;
  ultimaOperazione: string;
}

interface ServiceTotals {
  totaleOperazioni: number;
  importoComplessivo: number;
  numeroCategorie: number;
  soloConfermate: boolean;
  generatedAt: string;
}

interface ServiceFilters {
  anno: number;
  mese: number | null;
  dataInizio: string | null;
  dataFine: string | null;
  dealerCodice: string | null;
  gestore: string | null;
  stato: string;
  provincia: string | null;
  categoriaServizio: string | null;
}

interface ServiceStatsResponse {
  success: boolean;
  message: string;
  data: {
    statistiche: ServiceStatistic[];
    totali: ServiceTotals;
    filtriApplicati: ServiceFilters;
  };
  errors: unknown[];
}

const ServicesAnalytics: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // Parametri URL
  const annoFromUrl = parseInt(
    searchParams.get("anno") || new Date().getFullYear().toString()
  );
  const meseFromUrl = parseInt(searchParams.get("mese") || "0") || null;
  const giornoFromUrl = parseInt(searchParams.get("giorno") || "0") || null;

  const [selectedYear, setSelectedYear] = useState<number>(annoFromUrl);

  // OTTIMIZZAZIONE: Gestione dei tre livelli di filtro
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    meseFromUrl || currentMonth
  );

  const [selectedDay, setSelectedDay] = useState<number | null>(giornoFromUrl);

  // Modalità di visualizzazione: 'day' | 'month' | 'year'
  const [viewMode, setViewMode] = useState<"day" | "month" | "year">(
    giornoFromUrl ? "day" : meseFromUrl || !giornoFromUrl ? "month" : "year"
  );

  const [serviceStats, setServiceStats] = useState<ServiceStatistic[]>([]);
  const [serviceTotals, setServiceTotals] = useState<ServiceTotals | null>(
    null
  );
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [errorServices, setErrorServices] = useState<string>("");

  // Servizio selezionato
  const [selectedService, setSelectedService] = useState<string>("");

  // Filtri per la lista dealer (preparazione per future implementazioni)
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Ordinamento
  const [_sortColumn, _setSortColumn] = useState<string>("");
  const [_sortDirection, _setSortDirection] = useState<"asc" | "desc">("asc");

  // Paginazione
  const [_currentPage, _setCurrentPage] = useState<number>(1);
  const [_itemsPerPage] = useState<number>(20);

  const API_URL = import.meta.env.VITE_API_URL;

  console.log("🌐 API_URL configurato:", API_URL);

  // Colori per il grafico
  const chartColors = [
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#e74c3c",
    "#9b59b6",
    "#1abc9c",
    "#34495e",
    "#f1c40f",
    "#e67e22",
    "#8e44ad",
    "#16a085",
    "#2c3e50",
    "#d35400",
  ];

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // OTTIMIZZAZIONE: Carica i dati quando cambiano i parametri
  useEffect(() => {
    let monthToFetch = null;
    let dataInizio = null;
    let dataFine = null;

    if (viewMode === "day") {
      // Vista giornaliera: usa range di date per un singolo giorno
      const year = selectedYear;
      const month = String(selectedMonth || currentMonth).padStart(2, "0");
      const day = String(selectedDay || currentDay).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      dataInizio = dateString;
      dataFine = dateString;
    } else if (viewMode === "month") {
      // Vista mensile: usa il parametro mese
      monthToFetch = selectedMonth;
    }
    // Per viewMode === 'year' non passiamo né mese né date

    console.log(
      "🔄 useEffect - Anno:",
      selectedYear,
      "Mese:",
      monthToFetch,
      "DataInizio:",
      dataInizio,
      "DataFine:",
      dataFine,
      "Modalità:",
      viewMode
    );
    fetchServiceStats(selectedYear, monthToFetch, dataInizio, dataFine);
  }, [selectedYear, selectedMonth, selectedDay, viewMode]);

  // Debug: Log degli stati quando cambiano
  useEffect(() => {
    console.log("📊 serviceStats aggiornato:", serviceStats);
  }, [serviceStats]);

  useEffect(() => {
    console.log("📋 serviceTotals aggiornato:", serviceTotals);
  }, [serviceTotals]);

  useEffect(() => {
    console.log("⏳ isLoadingServices:", isLoadingServices);
  }, [isLoadingServices]);

  useEffect(() => {
    console.log("❌ errorServices:", errorServices);
  }, [errorServices]);

  // Funzione per recuperare le statistiche dei servizi
  const fetchServiceStats = async (
    anno: number,
    mese?: number | null,
    dataInizio?: string | null,
    dataFine?: string | null
  ) => {
    setIsLoadingServices(true);
    setErrorServices("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      let url = `${API_URL}/api/Reports/stats-by-service-category?Anno=${anno}&soloConfermate=true`;
      if (mese) {
        url += `&Mese=${mese}`;
      }
      if (dataInizio) {
        url += `&DataInizio=${dataInizio}`;
      }
      if (dataFine) {
        url += `&DataFine=${dataFine}`;
      }

      console.log("🔍 Chiamata API:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(`Errore nel caricamento: ${response.status}`);
      }

      const data: ServiceStatsResponse = await response.json();
      console.log("📊 Dati ricevuti:", data);

      if (data.success && data.data) {
        console.log("✅ Statistiche:", data.data.statistiche);
        console.log("✅ Totali:", data.data.totali);

        setServiceStats(data.data.statistiche);
        setServiceTotals(data.data.totali);
      } else {
        console.error("❌ Errore nei dati:", data.message);
        throw new Error(data.message || "Errore nel recupero dei dati");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento statistiche servizi:", error);
      if (error instanceof Error) {
        setErrorServices(error.message);
      } else {
        setErrorServices("Errore imprevisto");
      }
    } finally {
      setIsLoadingServices(false);
    }
  };

  // OTTIMIZZAZIONE: Gestione cambio modalità visualizzazione
  const handleViewModeChange = (mode: "day" | "month" | "year") => {
    setViewMode(mode);

    if (mode === "day") {
      // Vista giornaliera: imposta giorno corrente se non già selezionato
      if (!selectedDay) {
        setSelectedDay(currentDay);
      }
      if (!selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    } else if (mode === "month") {
      // Vista mensile: resetta il giorno
      setSelectedDay(null);
      if (!selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    } else if (mode === "year") {
      // Vista annuale: resetta mese e giorno
      setSelectedDay(null);
      setSelectedMonth(null);
    }
  };

  // OTTIMIZZAZIONE: Gestione selezione periodo
  const handlePeriodChange = (
    year: number,
    month?: number | null,
    day?: number | null,
    mode?: "day" | "month" | "year"
  ) => {
    setSelectedYear(year);

    if (mode) {
      setViewMode(mode);
    }

    if (day && month) {
      setViewMode("day");
      setSelectedMonth(month);
      setSelectedDay(day);
    } else if (month && !day) {
      setViewMode("month");
      setSelectedMonth(month);
      setSelectedDay(null);
    } else if (!month && !day) {
      setViewMode("year");
      setSelectedMonth(null);
      setSelectedDay(null);
    }

    // Aggiorna URL
    const params = new URLSearchParams();
    params.set("anno", year.toString());
    if (month) {
      params.set("mese", month.toString());
    }
    if (day) {
      params.set("giorno", day.toString());
    }
    navigate(`/services-analytics?${params.toString()}`, { replace: true });
  };

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // Preparazione dati per grafico a torta
  const preparePieData = () => {
    console.log("🥧 Preparazione dati grafico, serviceStats:", serviceStats);
    if (!serviceStats.length) return [];

    const pieData = serviceStats.map((service, index) => ({
      name: service.nomeServizio,
      value: service.numeroOperazioni,
      fill: chartColors[index % chartColors.length],
      codice: service.tipologiaServizio,
      importoTotale: service.importoTotale,
      importoMedio: service.importoMedio,
      percentage: service.percentuale.toFixed(1),
    }));

    console.log("🥧 Dati grafico preparati:", pieData);
    return pieData;
  };

  // Calcola il totale delle transazioni
  const getTotalTransactions = () => {
    const total = serviceTotals?.totaleOperazioni || 0;
    console.log("📊 Totale operazioni:", total);
    return total;
  };

  // Calcola il totale del fatturato
  const getTotalRevenue = () => {
    const total = serviceTotals?.importoComplessivo || 0;
    console.log("💰 Totale importo:", total);
    return total;
  };

  // Calcola il numero di categorie attive
  const getTotalCategories = () => {
    const total = serviceTotals?.numeroCategorie || 0;
    console.log("📋 Totale categorie:", total);
    return total;
  };

  // OTTIMIZZAZIONE: Funzione per ottenere il testo del periodo corrente
  const getCurrentPeriodText = () => {
    if (viewMode === "year") {
      return `Anno ${selectedYear}`;
    } else if (viewMode === "month") {
      return `${getMonthName(selectedMonth || currentMonth)} ${selectedYear}`;
    } else if (viewMode === "day") {
      return `${selectedDay || currentDay} ${getMonthName(
        selectedMonth || currentMonth
      )} ${selectedYear}`;
    }
    return `${selectedYear}`;
  };

  // Helper function per ottenere i giorni del mese
  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } services-analytics-page`}
      id="wrapper"
    >
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        <div className="container-fluid">
          <div>
            <p />
            <p />
          </div>

          {/* Header con breadcrumb */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate("/report")}
                    >
                      <i className="fa-solid fa-chart-line me-1"></i>
                      Report
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Servizi Analytics
                  </li>
                </ol>
              </nav>
              <h2 className="services-analytics-title">
                <i className="fa-solid fa-cogs me-2"></i>
                Servizi Analytics - {getCurrentPeriodText()}
              </h2>
            </div>
            <div className="d-flex gap-2">
              {/* OTTIMIZZAZIONE: Toggle per modalità visualizzazione */}
              <div className="btn-group" role="group">
                <button
                  className={`btn ${
                    viewMode === "day" ? "btn-success" : "btn-outline-success"
                  }`}
                  onClick={() => handleViewModeChange("day")}
                  title="Vista giornaliera (caricamento rapido)"
                >
                  <i className="fa-solid fa-calendar-day me-1"></i>
                  Giorno
                </button>
                <button
                  className={`btn ${
                    viewMode === "month" ? "btn-info" : "btn-outline-info"
                  }`}
                  onClick={() => handleViewModeChange("month")}
                  title="Vista mensile (caricamento rapido)"
                >
                  <i className="fa-solid fa-calendar-alt me-1"></i>
                  Mese
                </button>
                <button
                  className={`btn ${
                    viewMode === "year" ? "btn-warning" : "btn-outline-warning"
                  }`}
                  onClick={() => handleViewModeChange("year")}
                  title="Vista annuale (elaborazione più lenta)"
                >
                  <i className="fa-solid fa-calendar me-1"></i>
                  Anno
                </button>
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-outline-primary-dark dropdown-toggle"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fa-solid fa-calendar me-1"></i>
                  {getCurrentPeriodText()}
                </button>
                <ul
                  className="dropdown-menu dropdown-menu-end"
                  style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                  <li>
                    <h6 className="dropdown-header">
                      Oggi (Vista Giornaliera)
                    </h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() =>
                        handlePeriodChange(
                          new Date().getFullYear(),
                          new Date().getMonth() + 1,
                          new Date().getDate()
                        )
                      }
                    >
                      <i className="fa-solid fa-star me-1 text-success"></i>
                      Oggi - {new Date().getDate()}{" "}
                      {getMonthName(new Date().getMonth() + 1)}{" "}
                      {new Date().getFullYear()}
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">
                      Vista Mensile (Caricamento Rapido)
                    </h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => handlePeriodChange(2025, currentMonth)}
                    >
                      2025 - {getMonthName(currentMonth)} (Mese Corrente)
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => handlePeriodChange(2024, 12)}
                    >
                      2024 - Dicembre
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => handlePeriodChange(2023, 12)}
                    >
                      2023 - Dicembre
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">
                      Vista Annuale (Elaborazione Lenta)
                    </h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item text-warning"
                      onClick={() =>
                        handlePeriodChange(2025, null, null, "year")
                      }
                    >
                      <i className="fa-solid fa-exclamation-triangle me-1"></i>
                      2025 - Anno Completo
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item text-warning"
                      onClick={() =>
                        handlePeriodChange(2024, null, null, "year")
                      }
                    >
                      <i className="fa-solid fa-exclamation-triangle me-1"></i>
                      2024 - Anno Completo
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">Mesi {selectedYear}</h6>
                  </li>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <li key={month}>
                      <button
                        className="dropdown-item"
                        onClick={() => handlePeriodChange(selectedYear, month)}
                      >
                        {getMonthName(month)}
                      </button>
                    </li>
                  ))}
                  {/* Giorni del mese corrente (se in vista mensile o giornaliera) */}
                  {(viewMode === "day" || viewMode === "month") &&
                    selectedMonth && (
                      <>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <h6 className="dropdown-header">
                            Giorni di {getMonthName(selectedMonth)}{" "}
                            {selectedYear}
                          </h6>
                        </li>
                        {getDaysInMonth(selectedYear, selectedMonth).map(
                          (day) => (
                            <li key={day}>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  handlePeriodChange(
                                    selectedYear,
                                    selectedMonth,
                                    day
                                  )
                                }
                              >
                                {day} {getMonthName(selectedMonth)}
                                {day === currentDay &&
                                  selectedMonth === currentMonth &&
                                  selectedYear === new Date().getFullYear() && (
                                    <span className="badge bg-success ms-1">
                                      Oggi
                                    </span>
                                  )}
                              </button>
                            </li>
                          )
                        )}
                      </>
                    )}
                </ul>
              </div>
              <button className="btn btn-outline-primary-dark">
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={() => {
                  let monthToFetch = null;
                  let dataInizio = null;
                  let dataFine = null;

                  if (viewMode === "day") {
                    const year = selectedYear;
                    const month = String(
                      selectedMonth || currentMonth
                    ).padStart(2, "0");
                    const day = String(selectedDay || currentDay).padStart(
                      2,
                      "0"
                    );
                    const dateString = `${year}-${month}-${day}`;
                    dataInizio = dateString;
                    dataFine = dateString;
                  } else if (viewMode === "month") {
                    monthToFetch = selectedMonth;
                  }

                  fetchServiceStats(
                    selectedYear,
                    monthToFetch,
                    dataInizio,
                    dataFine
                  );
                }}
                disabled={isLoadingServices}
              >
                <i
                  className={`fa-solid ${
                    isLoadingServices ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* OTTIMIZZAZIONE: Alert informativi per le diverse modalità */}
          {viewMode === "year" && (
            <div
              className="alert alert-warning d-flex align-items-center mb-4"
              role="alert"
            >
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <div>
                <strong>Attenzione:</strong> Stai visualizzando i dati dell'anno
                completo. L'elaborazione può richiedere più tempo. Per un
                caricamento più rapido, usa la vista mensile o giornaliera.
                <button
                  className="btn btn-link p-0 ms-2"
                  onClick={() => handleViewModeChange("month")}
                >
                  Passa alla vista mensile
                </button>
              </div>
            </div>
          )}

          {/* Info sulla modalità di visualizzazione corrente */}
          {viewMode === "day" && (
            <div
              className="alert alert-success d-flex align-items-center mb-4"
              role="alert"
            >
              <i className="fa-solid fa-rocket me-2"></i>
              <div>
                <strong>Vista Giornaliera:</strong> Stai visualizzando i dati
                per un singolo giorno. Questa modalità offre il massimo
                dettaglio con caricamento rapido.
              </div>
            </div>
          )}

          {/* Prima riga: Grafico e Statistiche Generali */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione Servizi per Transazioni</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  {isLoadingServices ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati...</h5>
                        {viewMode === "year" && (
                          <p className="text-warning">
                            Elaborazione anno completo in corso... può
                            richiedere tempo
                          </p>
                        )}
                        {viewMode === "day" && (
                          <p className="text-success">
                            Elaborazione giornaliera in corso... sarà veloce!
                          </p>
                        )}
                        {viewMode === "month" && (
                          <p className="text-info">
                            Elaborazione mensile in corso...
                          </p>
                        )}
                      </div>
                    </div>
                  ) : errorServices ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorServices}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={() => {
                            //fetchServiceCategories();

                            let monthToFetch = null;
                            let dataInizio = null;
                            let dataFine = null;

                            if (viewMode === "day") {
                              const year = selectedYear;
                              const month = String(
                                selectedMonth || currentMonth
                              ).padStart(2, "0");
                              const day = String(
                                selectedDay || currentDay
                              ).padStart(2, "0");
                              const dateString = `${year}-${month}-${day}`;
                              dataInizio = dateString;
                              dataFine = dateString;
                            } else if (viewMode === "month") {
                              monthToFetch = selectedMonth;
                            }

                            fetchServiceStats(
                              selectedYear,
                              monthToFetch,
                              dataInizio,
                              dataFine
                            );
                          }}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : serviceStats.length > 0 ? (
                    <div className="row h-100">
                      <div className="col-md-8">
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={preparePieData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={90}
                              outerRadius={160}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={2}
                            >
                              {preparePieData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(
                                value: number,
                                name: string,
                                props: any
                              ) => [
                                value.toLocaleString("it-IT"),
                                `${name} (${props.payload.percentage}%)`,
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
                        </ResponsiveContainer>
                      </div>
                      <div className="col-md-4">
                        <div className="h-100 d-flex flex-column justify-content-center">
                          <div className="text-center mb-4">
                            <h1 className="display-4 text-primary mb-2">
                              {getTotalTransactions().toLocaleString("it-IT")}
                            </h1>
                            <h5 className="text-muted">Operazioni Totali</h5>
                            <small className="text-muted">
                              {getCurrentPeriodText()}
                            </small>
                          </div>
                          <div className="d-grid gap-3">
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-success mb-1">
                                €
                                {getTotalRevenue().toLocaleString("it-IT", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </h3>
                              <small className="text-muted">
                                Importo Complessivo
                              </small>
                            </div>
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-info mb-1">
                                {getTotalCategories()}
                              </h3>
                              <small className="text-muted">
                                Categorie Attive
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-pie fa-3x mb-3"></i>
                        <h5>Nessun dato disponibile</h5>
                        <p>
                          Nessun servizio trovato per il periodo selezionato.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>KPI Principali</span>
                  <i className="fa-solid fa-tachometer-alt"></i>
                </div>
                <div className="card-body">
                  {serviceStats.length > 0 ? (
                    <div className="d-grid gap-3">
                      <div className="card bg-primary text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{getTotalCategories()}</h4>
                          <small>Categorie Attive</small>
                        </div>
                      </div>
                      <div className="card bg-success text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            €
                            {getTotalTransactions() > 0
                              ? (
                                  getTotalRevenue() / getTotalTransactions()
                                ).toLocaleString("it-IT", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "0.00"}
                          </h4>
                          <small>Importo Medio per Operazione</small>
                        </div>
                      </div>
                      <div
                        className={`card ${
                          viewMode === "year"
                            ? "bg-warning"
                            : viewMode === "day"
                            ? "bg-success"
                            : "bg-info"
                        } text-white`}
                      >
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {viewMode === "year"
                              ? "Anno Completo"
                              : viewMode === "day"
                              ? "Vista Giornaliera"
                              : "Vista Mensile"}
                          </h4>
                          <small>
                            {serviceTotals?.soloConfermate
                              ? "Solo Confermate"
                              : "Tutte"}
                          </small>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-bar fa-2x mb-2"></i>
                        <div>
                          {isLoadingServices ? "Caricamento..." : "Nessun dato"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga: Dettaglio Servizi */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Dettaglio Servizi - {getCurrentPeriodText()}</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-list"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-download"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {serviceStats.length > 0 ? (
                    <div className="row g-3">
                      {serviceStats.map((service, index) => (
                        <div
                          key={service.tipologiaServizio}
                          className="col-md-6 col-lg-4"
                        >
                          <div
                            className={`card h-100 service-card ${
                              selectedService === service.tipologiaServizio
                                ? "border-primary"
                                : ""
                            }`}
                            style={{
                              cursor: "pointer",
                              borderLeft: `4px solid ${
                                chartColors[index % chartColors.length]
                              }`,
                            }}
                            onClick={() =>
                              setSelectedService(
                                selectedService === service.tipologiaServizio
                                  ? ""
                                  : service.tipologiaServizio
                              )
                            }
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title text-truncate mb-0">
                                  {service.nomeServizio}
                                </h6>
                                <span
                                  className="badge rounded-pill"
                                  style={{
                                    backgroundColor:
                                      chartColors[index % chartColors.length],
                                    color: "white",
                                  }}
                                >
                                  {service.percentuale.toFixed(1)}%
                                </span>
                              </div>
                              <p className="card-text text-muted small mb-3">
                                {service.tipologiaServizio}
                              </p>
                              <div className="row text-center">
                                <div className="col-4">
                                  <div className="fw-bold text-primary">
                                    {service.numeroOperazioni.toLocaleString(
                                      "it-IT"
                                    )}
                                  </div>
                                  <small className="text-muted">
                                    Operazioni
                                  </small>
                                </div>
                                <div className="col-4">
                                  <div className="fw-bold text-success">
                                    €{Math.round(service.importoTotale / 1000)}k
                                  </div>
                                  <small className="text-muted">Importo</small>
                                </div>
                                <div className="col-4">
                                  <div className="fw-bold text-info">
                                    €{service.importoMedio.toFixed(2)}
                                  </div>
                                  <small className="text-muted">Medio</small>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="row text-center">
                                  <div className="col-6">
                                    <small className="text-muted">Prima:</small>
                                    <div
                                      className="fw-bold"
                                      style={{ fontSize: "0.75rem" }}
                                    >
                                      {new Date(
                                        service.primaOperazione
                                      ).toLocaleDateString("it-IT")}
                                    </div>
                                  </div>
                                  <div className="col-6">
                                    <small className="text-muted">
                                      Ultima:
                                    </small>
                                    <div
                                      className="fw-bold"
                                      style={{ fontSize: "0.75rem" }}
                                    >
                                      {new Date(
                                        service.ultimaOperazione
                                      ).toLocaleDateString("it-IT")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-cogs fa-3x mb-3"></i>
                        <h5>Nessun servizio disponibile</h5>
                        <p>
                          I dati dei servizi non sono ancora disponibili per{" "}
                          {getCurrentPeriodText()}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terza riga: Lista Dealer per Servizio Selezionato (Placeholder) */}
          {selectedService && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="custom-card-header">
                    <span>
                      Dealer per Servizio:{" "}
                      {
                        serviceStats.find(
                          (s) => s.tipologiaServizio === selectedService
                        )?.nomeServizio
                      }{" "}
                      - {getCurrentPeriodText()}
                    </span>
                    <div className="menu-right">
                      <div className="menu-icon">
                        <i className="fa-solid fa-users"></i>
                      </div>
                      <div
                        className="menu-icon"
                        onClick={() => setSelectedService("")}
                      >
                        <i className="fa-solid fa-times"></i>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {/* Filtri per la lista dealer */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Cerca dealer..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <select
                          className="form-select form-select-sm"
                          value={selectedProvincia}
                          onChange={(e) => setSelectedProvincia(e.target.value)}
                        >
                          <option value="">Tutte le province</option>
                          {/* TODO: Popolare con le province dal backend */}
                        </select>
                      </div>
                    </div>

                    {/* Placeholder per la lista dealer */}
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-construction fa-3x mb-3"></i>
                        <h5>Sezione in Sviluppo</h5>
                        <p>
                          La lista dettagliata dei dealer per il servizio "
                          {
                            serviceStats.find(
                              (s) => s.tipologiaServizio === selectedService
                            )?.nomeServizio
                          }
                          " nel periodo {getCurrentPeriodText()} sarà
                          implementata nella prossima versione.
                        </p>
                        <p className="small">
                          Saranno necessarie API aggiuntive per recuperare i
                          dettagli dei dealer per ogni servizio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <p />
            <p />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
function getMonthName(monthNumber: number): string {
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
}

export default ServicesAnalytics;
