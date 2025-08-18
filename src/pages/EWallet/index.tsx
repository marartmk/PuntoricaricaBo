import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./ewallet-analytics.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Interfacce per le statistiche E-Wallet
interface EWalletStatistic {
  tipologiaServizio: string; // "PRELIEVI" | "DEPOSITI" | "ALTRO"
  nomeServizio: string;
  numeroOperazioni: number;
  importoTotale: number;
  importoMedio: number;
  percentuale: number;
  primaOperazione: string;
  ultimaOperazione: string;
}

interface EWalletTotals {
  totaleOperazioni: number;
  importoComplessivo: number;
  numeroCategorie: number;
  soloConfermate: boolean;
  generatedAt: string;
}

interface EWalletFilters {
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

interface EWalletStatsResponse {
  success: boolean;
  message: string;
  data: {
    statistiche: EWalletStatistic[];
    totali: EWalletTotals;
    filtriApplicati: EWalletFilters;
  };
  errors: unknown[];
}

// Interfacce per il nuovo endpoint E-Wallet
interface EWalletDealerResponse {
  success: boolean;
  message: string;
  data: {
    dealers: EWalletDealer[];
    statistiche: {
      totaleDealers: number;
      totaleOperazioni: number;
      importoComplessivo: number;
      importoMedio: number;
      periodoAnalizzato: {
        dataInizio?: string;
        dataFine?: string;
      };
      tipoOperazione?: string;
    };
    paginazione: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalCount: number;
    };
    filtriApplicati: {
      dataInizio?: string;
      dataFine?: string;
      tipoOperazione?: string;
      dealerCodice?: string;
    };
  };
}

interface EWalletDealer {
  dealerCodice: string;
  dealerRagSoc: string;
  numeroOperazioni: number;
  importoTotale: number;
  importoMedio: number;
  primaOperazione: string;
  ultimaOperazione: string;
  province: string[];
  operazioni: EWalletOperazione[];
}

interface EWalletOperazione {
  schId: string;
  schDataOperazione: string;
  schImportoRic: number;
  schProvincia: string;
  schStato: string;
}

// Interfaccia per dealer raggruppati (compatibile con nuovo endpoint)
interface DealerSummary {
  dealerCodice: string;
  dealerRagSoc: string;
  numeroOperazioni: number;
  importoTotale: number;
  importoMedio: number;
  primaOperazione: string;
  ultimaOperazione: string;
  province: string[];
  operazioni: EWalletOperazione[];
}

const EWalletAnalytics: React.FC = () => {
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

  // Gestione dei tre livelli di filtro
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

  const [ewalletStats, setEwalletStats] = useState<EWalletStatistic[]>([]);
  const [ewalletTotals, setEwalletTotals] = useState<EWalletTotals | null>(
    null
  );
  const [isLoadingEwallet, setIsLoadingEwallet] = useState<boolean>(false);
  const [errorEwallet, setErrorEwallet] = useState<string>("");

  // Operazione selezionata
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  // Filtro per tipo operazione
  const [selectedOperationType, setSelectedOperationType] = useState<string>("");

  // Stati per la gestione dealer
  const [dealersList, setDealersList] = useState<DealerSummary[]>([]);
  const [isLoadingDealers, setIsLoadingDealers] = useState<boolean>(false);
  const [errorDealers, setErrorDealers] = useState<string>("");
  const [dealersCurrentPage, setDealersCurrentPage] = useState<number>(1);
  const [dealersItemsPerPage] = useState<number>(20);

  // Filtri per la ricerca dealer
  const [dealerSearchTerm, setDealerSearchTerm] = useState<string>("");
  const [_selectedProvincia, _setSelectedProvincia] = useState<string>("");

  // Modal dealer dettagli
  const [selectedDealerForModal, setSelectedDealerForModal] = useState<DealerSummary | null>(null);
  const [showDealerModal, setShowDealerModal] = useState<boolean>(false);

  const API_URL = import.meta.env.VITE_API_URL;

  console.log("🌐 API_URL configurato:", API_URL);

  // Colori per il grafico (diversi per prelievi e depositi)
  const chartColors = {
    PRELIEVI: ["#e74c3c", "#c0392b", "#a93226", "#922b21", "#7b2d26"],
    DEPOSITI: ["#2ecc71", "#27ae60", "#229954", "#1e8449", "#196f3d"],
    DEFAULT: ["#3498db", "#2980b9", "#1f618d", "#1a5490", "#154360"],
  };

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // Carica i dati quando cambiano i parametri
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
      "📄 useEffect - Anno:",
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
    fetchEWalletStats(selectedYear, monthToFetch, dataInizio, dataFine);
  }, [
    selectedYear,
    selectedMonth,
    selectedDay,
    viewMode,
    selectedOperationType,
  ]);

  // Funzione per recuperare i dealer per operazione selezionata (NUOVO ENDPOINT)
  const fetchDealersForOperation = async (operationType: "DEPOSITI" | "PRELIEVI") => {
    setIsLoadingDealers(true);
    setErrorDealers("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      // Costruisci i parametri della data in base alla modalità di visualizzazione
      let dataInizio = "";
      let dataFine = "";

      if (viewMode === "day") {
        const year = selectedYear;
        const month = String(selectedMonth || currentMonth).padStart(2, "0");
        const day = String(selectedDay || currentDay).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;
        dataInizio = dateString;
        dataFine = dateString;
      } else if (viewMode === "month") {
        const year = selectedYear;
        const month = selectedMonth || currentMonth;
        dataInizio = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        dataFine = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else if (viewMode === "year") {
        dataInizio = `${selectedYear}-01-01`;
        dataFine = `${selectedYear}-12-31`;
      }

      // 🎯 NUOVO ENDPOINT nel ReportsController - Più coerente e completo
      let url = `${API_URL}/api/Reports/ewallet-analytics?page=1&pageSize=1000&tipoOperazione=${operationType}`;
      
      // Usa la stessa logica di filtri del ReportsController esistente
      if (viewMode === "day" && dataInizio && dataFine) {
        url += `&dataInizio=${dataInizio}&dataFine=${dataFine}`;
      } else if (viewMode === "month" && selectedMonth) {
        url += `&anno=${selectedYear}&mese=${selectedMonth}`;
      } else if (viewMode === "year") {
        url += `&anno=${selectedYear}`;
      }

      console.log("🔍 Chiamata NUOVO API E-Wallet Analytics:", url);
      console.log("📅 Parametri - Tipo:", operationType, "Inizio:", dataInizio, "Fine:", dataFine);

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
        throw new Error(`Errore nel caricamento: ${response.status}`);
      }

      const data: EWalletDealerResponse = await response.json();
      console.log("📋 Risposta nuovo endpoint E-Wallet:", data);

      if (data.success && data.data) {
        console.log("✅ STATISTICHE DAL NUOVO ENDPOINT:");
        console.log(`📊 Dealer trovati: ${data.data.statistiche.totaleDealers}`);
        console.log(`📊 Operazioni totali: ${data.data.statistiche.totaleOperazioni}`);
        console.log(`💰 Importo complessivo: €${data.data.statistiche.importoComplessivo.toFixed(2)}`);
        console.log(`💰 Importo medio: €${data.data.statistiche.importoMedio.toFixed(2)}`);

        // Converte i dealer dal nuovo formato al formato utilizzato dal frontend
        const dealerList: DealerSummary[] = data.data.dealers.map(dealer => ({
          dealerCodice: dealer.dealerCodice,
          dealerRagSoc: dealer.dealerRagSoc,
          numeroOperazioni: dealer.numeroOperazioni,
          importoTotale: dealer.importoTotale,
          importoMedio: dealer.importoMedio,
          primaOperazione: dealer.primaOperazione,
          ultimaOperazione: dealer.ultimaOperazione,
          province: dealer.province || [],
          operazioni: dealer.operazioni || []
        }));

        setDealersList(dealerList);
        setDealersCurrentPage(1);
        
        console.log(`✅ ${dealerList.length} dealer caricati correttamente per ${operationType}`);
        console.log("🎯 CONFRONTO IMPORTI:");
        console.log(`📊 Backend dice: €${data.data.statistiche.importoComplessivo.toFixed(2)}`);
        console.log(`📊 Frontend calcola: €${dealerList.reduce((sum, d) => sum + Math.abs(d.importoTotale), 0).toFixed(2)}`);
        
      } else {
        throw new Error(data.message || "Errore nel recupero dei dati dealer dal nuovo endpoint");
      }
    } catch (error) {
      console.error("🚨 Errore nuovo endpoint E-Wallet:", error);
      if (error instanceof Error) {
        setErrorDealers(error.message);
      } else {
        setErrorDealers("Errore imprevisto");
      }
    } finally {
      setIsLoadingDealers(false);
    }
  };

  useEffect(() => {
    console.log("💰 ewalletTotals aggiornato:", ewalletTotals);
  }, [ewalletTotals]);

  useEffect(() => {
    console.log("⏳ isLoadingEwallet:", isLoadingEwallet);
  }, [isLoadingEwallet]);

  // Debug: Log degli stati quando cambiano
  useEffect(() => {
    console.log("💳 ewalletStats aggiornato:", ewalletStats);
  }, [ewalletStats]);

  useEffect(() => {
    console.log("💰 ewalletTotals aggiornato:", ewalletTotals);
  }, [ewalletTotals]);

  useEffect(() => {
    console.log("⏳ isLoadingEwallet:", isLoadingEwallet);
  }, [isLoadingEwallet]);

  useEffect(() => {
    console.log("❌ errorEwallet:", errorEwallet);
  }, [errorEwallet]);

  // Debug: Log quando selectedOperation cambia e carica i dealer
  useEffect(() => {
    console.log("🎯 selectedOperation cambiato:", selectedOperation);
    
    if (selectedOperation) {
      // Estrai il tipo di operazione dalla chiave
      const operationType = selectedOperation.includes("PRELIEVI") ? "PRELIEVI" : "DEPOSITI";
      console.log("🔄 Caricamento dealer per:", operationType);
      fetchDealersForOperation(operationType as "DEPOSITI" | "PRELIEVI");
    } else {
      // Reset dei dealer quando non c'è selezione
      setDealersList([]);
      setErrorDealers("");
    }
  }, [selectedOperation, viewMode, selectedYear, selectedMonth, selectedDay]);

  // Funzione per filtrare solo PRELIEVI e DEPOSITI
  const filterEWalletData = (data: EWalletStatistic[]): EWalletStatistic[] => {
    return data.filter(
      (item) =>
        item.tipologiaServizio === "PRELIEVI" ||
        item.tipologiaServizio === "DEPOSITI"
    );
  };

  // Funzione per recuperare le statistiche degli e-wallet
  const fetchEWalletStats = async (
    anno: number,
    mese?: number | null,
    dataInizio?: string | null,
    dataFine?: string | null
  ) => {
    setIsLoadingEwallet(true);
    setErrorEwallet("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      let url = `${API_URL}/api/Reports/stats-ewallet?Anno=${anno}&soloConfermate=true`;
      if (mese) {
        url += `&Mese=${mese}`;
      }
      if (dataInizio) {
        url += `&DataInizio=${dataInizio}`;
      }
      if (dataFine) {
        url += `&DataFine=${dataFine}`;
      }
      if (selectedOperationType) {
        url += `&TipologiaServizio=${selectedOperationType}`;
      }

      console.log("🔍 Chiamata API E-Wallet:", url);

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

      const data: EWalletStatsResponse = await response.json();
      console.log("💳 Dati E-Wallet ricevuti:", data);

      if (data.success && data.data) {
        console.log("✅ Statistiche E-Wallet grezze:", data.data.statistiche);

        // Filtra solo PRELIEVI e DEPOSITI
        const filteredStats = filterEWalletData(data.data.statistiche);
        console.log("✅ Statistiche E-Wallet filtrate:", filteredStats);

        setEwalletStats(filteredStats);
        setEwalletTotals(data.data.totali);
      } else {
        console.error("❌ Errore nei dati E-Wallet:", data.message);
        throw new Error(
          data.message || "Errore nel recupero dei dati E-Wallet"
        );
      }
    } catch (error) {
      console.error("🚨 Errore caricamento statistiche E-Wallet:", error);
      if (error instanceof Error) {
        setErrorEwallet(error.message);
      } else {
        setErrorEwallet("Errore imprevisto");
      }
    } finally {
      setIsLoadingEwallet(false);
    }
  };

  // Gestione cambio modalità visualizzazione
  const handleViewModeChange = (mode: "day" | "month" | "year") => {
    setViewMode(mode);

    if (mode === "day") {
      if (!selectedDay) {
        setSelectedDay(currentDay);
      }
      if (!selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    } else if (mode === "month") {
      setSelectedDay(null);
      if (!selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    } else if (mode === "year") {
      setSelectedDay(null);
      setSelectedMonth(null);
    }
  };

  // Gestione selezione periodo
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
    navigate(`/ewallet-analytics?${params.toString()}`, { replace: true });
  };

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // Preparazione dati per grafico a torta usando i campi reali
  const preparePieData = () => {
    console.log(
      "🥧 Preparazione dati grafico E-Wallet, ewalletStats:",
      ewalletStats
    );
    if (!ewalletStats.length) return [];

    const pieData = ewalletStats.map((ewallet, index) => {
      const operationType = ewallet.tipologiaServizio;
      const colorArray =
        chartColors[operationType as keyof typeof chartColors] ||
        chartColors.DEFAULT;

      return {
        name: `${ewallet.nomeServizio} (${ewallet.tipologiaServizio})`,
        value: ewallet.numeroOperazioni,
        fill: colorArray[index % colorArray.length],
        servizio: ewallet.nomeServizio,
        tipologia: ewallet.tipologiaServizio,
        importoTotale: Math.abs(ewallet.importoTotale),
        importoMedio: Math.abs(ewallet.importoMedio),
        percentage: ewallet.percentuale.toFixed(1),
      };
    });

    console.log("🥧 Dati grafico E-Wallet preparati:", pieData);
    return pieData;
  };

  // Calcola il totale delle transazioni solo per PRELIEVI e DEPOSITI
  const getTotalTransactions = () => {
    const total = ewalletStats.reduce(
      (sum, stat) => sum + stat.numeroOperazioni,
      0
    );
    console.log("💳 Totale operazioni E-Wallet (filtrate):", total);
    return total;
  };

  // Calcola il totale del fatturato solo per PRELIEVI e DEPOSITI
  const getTotalRevenue = () => {
    const total = ewalletStats.reduce(
      (sum, stat) => sum + Math.abs(stat.importoTotale),
      0
    );
    console.log("💰 Totale importo E-Wallet (filtrato):", total);
    return total;
  };

  // Calcola numero di tipologie (sempre 2: PRELIEVI + DEPOSITI)
  const getTotalTypes = () => {
    const uniqueTypes = new Set(
      ewalletStats.map((stat) => stat.tipologiaServizio)
    );
    const total = uniqueTypes.size;
    console.log("🔢 Totale tipologie E-Wallet:", total);
    return total;
  };

  // Calcola i prelievi vs depositi
  const getPrelievoVsDeposito = () => {
    const prelievi = ewalletStats.find(
      (stat) => stat.tipologiaServizio === "PRELIEVI"
    );
    const depositi = ewalletStats.find(
      (stat) => stat.tipologiaServizio === "DEPOSITI"
    );

    return {
      prelievi: prelievi ? Math.abs(prelievi.importoTotale) : 0,
      depositi: depositi ? Math.abs(depositi.importoTotale) : 0,
      operazioniPrelievi: prelievi ? prelievi.numeroOperazioni : 0,
      operazioniDepositi: depositi ? depositi.numeroOperazioni : 0,
    };
  };

  // Funzione per ottenere il testo del periodo corrente
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

  // Funzioni helper per la gestione dealer
  const getFilteredDealers = () => {
    let filtered = dealersList;

    // Filtro per termine di ricerca
    if (dealerSearchTerm) {
      filtered = filtered.filter(
        (dealer) =>
          dealer.dealerCodice.toLowerCase().includes(dealerSearchTerm.toLowerCase()) ||
          dealer.dealerRagSoc.toLowerCase().includes(dealerSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getPaginatedDealers = () => {
    const filtered = getFilteredDealers();
    const startIndex = (dealersCurrentPage - 1) * dealersItemsPerPage;
    const endIndex = startIndex + dealersItemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalDealersPages = () => {
    const filtered = getFilteredDealers();
    return Math.ceil(filtered.length / dealersItemsPerPage);
  };

  // Funzioni per gestire il modal dealer
  const openDealerModal = (dealer: DealerSummary) => {
    setSelectedDealerForModal(dealer);
    setShowDealerModal(true);
  };

  const closeDealerModal = () => {
    setShowDealerModal(false);
    setSelectedDealerForModal(null);
  };

  // Helper function per ottenere i giorni del mese
  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Funzione per aggiornare i dati
  const handleRefreshData = () => {
    let monthToFetch = null;
    let dataInizio = null;
    let dataFine = null;

    if (viewMode === "day") {
      const year = selectedYear;
      const month = String(selectedMonth || currentMonth).padStart(2, "0");
      const day = String(selectedDay || currentDay).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      dataInizio = dateString;
      dataFine = dateString;
    } else if (viewMode === "month") {
      monthToFetch = selectedMonth;
    }

    fetchEWalletStats(selectedYear, monthToFetch, dataInizio, dataFine);
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
                    E-Wallet Analytics
                  </li>
                </ol>
              </nav>
              <h2 className="services-analytics-title">
                <i className="fa-solid fa-wallet me-2"></i>
                E-Wallet Analytics - {getCurrentPeriodText()}
              </h2>
            </div>
            <div className="d-flex gap-2">
              {/* Toggle per modalità visualizzazione */}
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

              {/* Filtro per tipologia operazione */}
              <div className="btn-group">
                <select
                  className="form-select"
                  value={selectedOperationType}
                  onChange={(e) => setSelectedOperationType(e.target.value)}
                >
                  <option value="">Tutte le operazioni</option>
                  <option value="PRELIEVI">Solo Prelievi</option>
                  <option value="DEPOSITI">Solo Depositi</option>
                </select>
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
                  {/* Giorni del mese corrente */}
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
                onClick={handleRefreshData}
                disabled={isLoadingEwallet}
              >
                <i
                  className={`fa-solid ${
                    isLoadingEwallet ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Alert informativi per le diverse modalità */}
          {viewMode === "year" && (
            <div
              className="alert alert-warning d-flex align-items-center mb-4"
              role="alert"
            >
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <div>
                <strong>Attenzione:</strong> Stai visualizzando i dati E-Wallet
                dell'anno completo. L'elaborazione può richiedere più tempo. Per
                un caricamento più rapido, usa la vista mensile o giornaliera.
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
                E-Wallet per un singolo giorno. Questa modalità offre il massimo
                dettaglio con caricamento rapido.
              </div>
            </div>
          )}

          {/* Prima riga: Grafico e Statistiche Generali */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione E-Wallet: Prelievi vs Depositi</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  {isLoadingEwallet ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati E-Wallet...</h5>
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
                  ) : errorEwallet ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorEwallet}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={handleRefreshData}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : ewalletStats.length > 0 ? (
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
                            <h5 className="text-muted">Operazioni E-Wallet</h5>
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
                                Volume Totale
                              </small>
                            </div>
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-info mb-1">
                                {getTotalTypes()}/2
                              </h3>
                              <small className="text-muted">
                                Tipologie Attive
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-wallet fa-3x mb-3"></i>
                        <h5>Nessun dato E-Wallet disponibile</h5>
                        <p>
                          Nessuna operazione E-Wallet trovata per il periodo
                          selezionato.
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
                  <span>KPI E-Wallet</span>
                  <i className="fa-solid fa-tachometer-alt"></i>
                </div>
                <div className="card-body">
                  {/* Istruzioni per l'utente */}
                  {!selectedOperation && ewalletStats.length > 0 && (
                    <div className="alert alert-info d-flex align-items-center mb-3" role="alert">
                      <i className="fa-solid fa-info-circle me-2"></i>
                      <div>
                        <strong>💡 Suggerimento:</strong> Clicca su una delle card sottostanti per visualizzare i dettagli dei dealer per quella specifica operazione E-Wallet.
                      </div>
                    </div>
                  )}

                  {ewalletStats.length > 0 ? (
                    (() => {
                      const stats = getPrelievoVsDeposito();
                      return (
                        <div className="d-grid gap-3">
                          <div className="card bg-danger text-white">
                            <div className="card-body text-center p-3">
                              <h4 className="mb-1">
                                €{stats.prelievi.toLocaleString("it-IT")}
                              </h4>
                              <small>
                                Prelievi ({stats.operazioniPrelievi})
                              </small>
                            </div>
                          </div>
                          <div className="card bg-success text-white">
                            <div className="card-body text-center p-3">
                              <h4 className="mb-1">
                                €{stats.depositi.toLocaleString("it-IT")}
                              </h4>
                              <small>
                                Depositi ({stats.operazioniDepositi})
                              </small>
                            </div>
                          </div>
                          <div className="card bg-info text-white">
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
                              <small>Importo Medio</small>
                            </div>
                          </div>
                          <div
                            className={`card ${
                              viewMode === "year"
                                ? "bg-warning"
                                : viewMode === "day"
                                ? "bg-primary"
                                : "bg-secondary"
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
                                {ewalletTotals?.soloConfermate
                                  ? "Solo Confermate"
                                  : "Tutte"}
                              </small>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-bar fa-2x mb-2"></i>
                        <div>
                          {isLoadingEwallet ? "Caricamento..." : "Nessun dato"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga - Solo PRELIEVI e DEPOSITI */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>
                    Dettaglio E-Wallet: Prelievi e Depositi -{" "}
                    {getCurrentPeriodText()}
                  </span>
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
                  {ewalletStats.length > 0 ? (
                    <div className="row g-3">
                      {ewalletStats.map((ewallet, index) => {
                        const operationType = ewallet.tipologiaServizio;
                        const colorArray =
                          chartColors[
                            operationType as keyof typeof chartColors
                          ] || chartColors.DEFAULT;
                        const cardColor = colorArray[index % colorArray.length];

                        return (
                          <div
                            key={`${ewallet.nomeServizio}-${ewallet.tipologiaServizio}`}
                            className="col-md-6"
                          >
                            <div
                              className={`card h-100 service-card ${
                                selectedOperation ===
                                `${ewallet.nomeServizio}-${ewallet.tipologiaServizio}`
                                  ? "border-primary"
                                  : ""
                              }`}
                              style={{
                                cursor: "pointer",
                                borderLeft: `4px solid ${cardColor}`,
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                const operationKey = `${ewallet.nomeServizio}-${ewallet.tipologiaServizio}`;
                                console.log("🖱️ Click su operazione:", operationKey);
                                console.log("🔍 Operazione corrente selezionata:", selectedOperation);
                                
                                if (selectedOperation === operationKey) {
                                  setSelectedOperation("");
                                  console.log("✅ Operazione deselezionata");
                                } else {
                                  setSelectedOperation(operationKey);
                                  console.log("✅ Operazione selezionata:", operationKey);
                                }
                              }}
                            >
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h5 className="card-title mb-0">
                                    {ewallet.nomeServizio}
                                    {selectedOperation === `${ewallet.nomeServizio}-${ewallet.tipologiaServizio}` && (
                                      <i className="fa-solid fa-check-circle text-primary ms-2" title="Selezionato"></i>
                                    )}
                                  </h5>
                                  <span
                                    className={`badge rounded-pill ${
                                      ewallet.tipologiaServizio === "PRELIEVI"
                                        ? "bg-danger"
                                        : "bg-success"
                                    }`}
                                  >
                                    {ewallet.percentuale.toFixed(1)}%
                                  </span>
                                </div>
                                <p
                                  className={`card-text small mb-3 fw-bold ${
                                    ewallet.tipologiaServizio === "PRELIEVI"
                                      ? "text-danger"
                                      : "text-success"
                                  }`}
                                >
                                  <i
                                    className={`fa-solid ${
                                      ewallet.tipologiaServizio === "PRELIEVI"
                                        ? "fa-arrow-down"
                                        : "fa-arrow-up"
                                    } me-2`}
                                  ></i>
                                  {ewallet.tipologiaServizio}
                                </p>
                                <div className="row text-center mb-3">
                                  <div className="col-4">
                                    <div className="fw-bold text-primary h4">
                                      {ewallet.numeroOperazioni.toLocaleString(
                                        "it-IT"
                                      )}
                                    </div>
                                    <small className="text-muted">
                                      Operazioni
                                    </small>
                                  </div>
                                  <div className="col-4">
                                    <div className="fw-bold text-success h4">
                                      €
                                      {Math.round(
                                        Math.abs(ewallet.importoTotale) / 1000
                                      )}
                                      k
                                    </div>
                                    <small className="text-muted">Volume</small>
                                  </div>
                                  <div className="col-4">
                                    <div className="fw-bold text-info h4">
                                      €
                                      {Math.abs(ewallet.importoMedio).toFixed(
                                        0
                                      )}
                                    </div>
                                    <small className="text-muted">Medio</small>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <div className="row text-center">
                                    <div className="col-6">
                                      <small className="text-muted">
                                        Prima operazione:
                                      </small>
                                      <div
                                        className="fw-bold"
                                        style={{ fontSize: "0.8rem" }}
                                      >
                                        {new Date(
                                          ewallet.primaOperazione
                                        ).toLocaleDateString("it-IT")}
                                      </div>
                                    </div>
                                    <div className="col-6">
                                      <small className="text-muted">
                                        Ultima operazione:
                                      </small>
                                      <div
                                        className="fw-bold"
                                        style={{ fontSize: "0.8rem" }}
                                      >
                                        {new Date(
                                          ewallet.ultimaOperazione
                                        ).toLocaleDateString("it-IT")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-wallet fa-3x mb-3"></i>
                        <h5>Nessuna operazione E-Wallet disponibile</h5>
                        <p>
                          I dati delle operazioni E-Wallet non sono ancora
                          disponibili per {getCurrentPeriodText()}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terza riga: Lista Dealer per Operazione Selezionata */}
          {selectedOperation && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card border-primary">
                  <div className="custom-card-header">
                    <span>
                      <i className="fa-solid fa-users me-2"></i>
                      Dealer per Operazione E-Wallet: {selectedOperation} -{" "}
                      {getCurrentPeriodText()}
                    </span>
                    <div className="menu-right">
                      <div className="menu-icon">
                        <i className="fa-solid fa-download"></i>
                      </div>
                      <div
                        className="menu-icon"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log("🔴 Chiusura sezione dealer");
                          setSelectedOperation("");
                        }}
                        style={{ cursor: "pointer" }}
                        title="Chiudi sezione"
                      >
                        <i className="fa-solid fa-times"></i>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {/* Alert di successo per confermare la selezione */}
                    <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
                      <i className="fa-solid fa-check-circle me-2"></i>
                      <div>
                        <strong>Operazione selezionata:</strong> {selectedOperation}
                        <br />
                        <small>Periodo: {getCurrentPeriodText()} • {getFilteredDealers().length} dealer trovati</small>
                      </div>
                    </div>

                    {/* Filtri per la ricerca dealer */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="fa-solid fa-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Cerca per codice o ragione sociale..."
                            value={dealerSearchTerm}
                            onChange={(e) => {
                              setDealerSearchTerm(e.target.value);
                              setDealersCurrentPage(1);
                            }}
                          />
                          {dealerSearchTerm && (
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setDealerSearchTerm("");
                                setDealersCurrentPage(1);
                              }}
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex justify-content-end align-items-center gap-2">
                          <small className="text-muted">
                            {getFilteredDealers().length} dealer • 
                            Totale: €{getFilteredDealers().reduce((sum, d) => sum + Math.abs(d.importoTotale), 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Contenuto dealer */}
                    {isLoadingDealers ? (
                      <div className="chart-placeholder">
                        <div className="text-center text-muted">
                          <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                          <h5>Caricamento dealer...</h5>
                          <p>Recupero delle transazioni E-Wallet in corso...</p>
                        </div>
                      </div>
                    ) : errorDealers ? (
                      <div className="chart-placeholder">
                        <div className="text-center text-danger">
                          <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                          <h5>Errore nel caricamento dealer</h5>
                          <p>{errorDealers}</p>
                          <button
                            className="btn btn-primary-dark btn-sm mt-2"
                            onClick={() => {
                              const operationType = selectedOperation.includes("PRELIEVI") ? "PRELIEVI" : "DEPOSITI";
                              fetchDealersForOperation(operationType as "DEPOSITI" | "PRELIEVI");
                            }}
                          >
                            <i className="fa-solid fa-refresh me-1"></i>
                            Riprova
                          </button>
                        </div>
                      </div>
                    ) : dealersList.length > 0 ? (
                      <>
                        {/* Tabella dealer */}
                        <div className="table-responsive">
                          <div className="alert alert-info d-flex align-items-center mb-2" role="alert">
                            <i className="fa-solid fa-info-circle me-2"></i>
                            <small>
                              <strong>💡 Suggerimento:</strong> Clicca su una riga per vedere tutti i dettagli e le transazioni del dealer.
                            </small>
                          </div>
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th style={{ width: "120px" }}>Codice</th>
                                <th>Ragione Sociale</th>
                                <th className="text-center" style={{ width: "100px" }}>Operazioni</th>
                                <th className="text-end" style={{ width: "140px" }}>Importo Totale</th>
                                <th className="text-center" style={{ width: "120px" }}>Prima</th>
                                <th className="text-center" style={{ width: "120px" }}>Ultima</th>
                                <th className="text-center" style={{ width: "60px" }}>
                                  <i className="fa-solid fa-eye" title="Dettagli"></i>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getPaginatedDealers().map((dealer, _index) => (
                                <tr 
                                  key={dealer.dealerCodice}
                                  onClick={() => openDealerModal(dealer)}
                                  style={{ cursor: "pointer" }}
                                  title="Clicca per vedere i dettagli"
                                >
                                  <td>
                                    <code className="badge bg-secondary">
                                      {dealer.dealerCodice}
                                    </code>
                                  </td>
                                  <td>
                                    <div className="fw-bold">{dealer.dealerRagSoc}</div>
                                    <small className="text-muted">
                                      €{Math.abs(dealer.importoTotale / dealer.numeroOperazioni).toFixed(2)} medio
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-primary rounded-pill">
                                      {dealer.numeroOperazioni}
                                    </span>
                                  </td>
                                  <td className="text-end">
                                    <div className={`fw-bold ${selectedOperation.includes("PRELIEVI") ? "text-danger" : "text-success"}`}>
                                      {selectedOperation.includes("PRELIEVI") ? "-" : "+"}€{Math.abs(dealer.importoTotale).toLocaleString("it-IT", { 
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2 
                                      })}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <small>{new Date(dealer.primaOperazione).toLocaleDateString("it-IT")}</small>
                                  </td>
                                  <td className="text-center">
                                    <small>{new Date(dealer.ultimaOperazione).toLocaleDateString("it-IT")}</small>
                                  </td>
                                  <td className="text-center">
                                    <i className="fa-solid fa-search-plus text-primary" style={{ fontSize: "0.9rem" }}></i>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginazione */}
                        {getTotalDealersPages() > 1 && (
                          <nav aria-label="Paginazione dealer">
                            <ul className="pagination justify-content-center">
                              <li className={`page-item ${dealersCurrentPage === 1 ? "disabled" : ""}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setDealersCurrentPage(dealersCurrentPage - 1)}
                                  disabled={dealersCurrentPage === 1}
                                >
                                  <i className="fa-solid fa-chevron-left"></i>
                                </button>
                              </li>
                              
                              {Array.from({ length: Math.min(5, getTotalDealersPages()) }, (_, i) => {
                                const pageNum = Math.max(1, dealersCurrentPage - 2) + i;
                                if (pageNum > getTotalDealersPages()) return null;
                                
                                return (
                                  <li key={pageNum} className={`page-item ${dealersCurrentPage === pageNum ? "active" : ""}`}>
                                    <button
                                      className="page-link"
                                      onClick={() => setDealersCurrentPage(pageNum)}
                                    >
                                      {pageNum}
                                    </button>
                                  </li>
                                );
                              })}
                              
                              <li className={`page-item ${dealersCurrentPage === getTotalDealersPages() ? "disabled" : ""}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setDealersCurrentPage(dealersCurrentPage + 1)}
                                  disabled={dealersCurrentPage === getTotalDealersPages()}
                                >
                                  <i className="fa-solid fa-chevron-right"></i>
                                </button>
                              </li>
                            </ul>
                            <div className="text-center mt-2">
                              <small className="text-muted">
                                Pagina {dealersCurrentPage} di {getTotalDealersPages()} • 
                                Mostrando {getPaginatedDealers().length} di {getFilteredDealers().length} dealer
                              </small>
                            </div>
                          </nav>
                        )}
                      </>
                    ) : (
                      <div className="chart-placeholder">
                        <div className="text-center text-muted">
                          <i className="fa-solid fa-users-slash fa-3x mb-3"></i>
                          <h5>Nessun dealer trovato</h5>
                          <p>
                            Non sono stati trovati dealer per l'operazione{" "}
                            <strong>{selectedOperation}</strong> nel periodo{" "}
                            <strong>{getCurrentPeriodText()}</strong>.
                          </p>
                          {dealerSearchTerm && (
                            <p className="small">
                              Prova a modificare o rimuovere il filtro di ricerca.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <p />
            <p />
          </div>

          {/* Modal Dettagli Dealer */}
          {showDealerModal && selectedDealerForModal && (
            <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header custom-card-header">
                    <h5 className="modal-title mb-0">
                      <i className="fa-solid fa-user-tie me-2"></i>
                      Dettagli Dealer: {selectedDealerForModal.dealerRagSoc}
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={closeDealerModal}
                      aria-label="Close"
                    ></button>
                  </div>
                  
                  <div className="modal-body">
                    {/* Header con informazioni dealer */}
                    <div className="row mb-4">
                      <div className="col-md-8">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-primary">
                              <i className="fa-solid fa-building me-2"></i>
                              Informazioni Dealer
                            </h6>
                            <div className="row">
                              <div className="col-sm-6">
                                <strong>Codice:</strong>
                                <div className="mb-2">
                                  <code className="badge bg-secondary fs-6 p-2">
                                    {selectedDealerForModal.dealerCodice}
                                  </code>
                                </div>
                                <strong>Ragione Sociale:</strong>
                                <div className="fw-bold text-dark">
                                  {selectedDealerForModal.dealerRagSoc}
                                </div>
                              </div>
                              <div className="col-sm-6">
                                <strong>Province:</strong>
                                <div className="mb-2">
                                  {selectedDealerForModal.province.length > 0 ? (
                                    selectedDealerForModal.province.map((prov, idx) => (
                                      <span key={idx} className="badge bg-info me-1">
                                        {prov}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted">Non specificato</span>
                                  )}
                                </div>
                                <strong>Periodo attività:</strong>
                                <div className="text-muted small">
                                  Dal {new Date(selectedDealerForModal.primaOperazione).toLocaleDateString("it-IT")} al {" "}
                                  {new Date(selectedDealerForModal.ultimaOperazione).toLocaleDateString("it-IT")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card h-100 bg-light">
                          <div className="card-body text-center">
                            <h6 className="card-title text-primary">
                              <i className="fa-solid fa-chart-bar me-2"></i>
                              Statistiche E-Wallet
                            </h6>
                            <div className="row">
                              <div className="col-12 mb-3">
                                <div className="display-6 fw-bold text-primary">
                                  {selectedDealerForModal.numeroOperazioni}
                                </div>
                                <small className="text-muted">Operazioni Totali</small>
                              </div>
                              <div className="col-12 mb-3">
                                <div className={`h4 fw-bold ${selectedOperation.includes("PRELIEVI") ? "text-danger" : "text-success"}`}>
                                  {selectedOperation.includes("PRELIEVI") ? "-" : "+"}€{Math.abs(selectedDealerForModal.importoTotale).toLocaleString("it-IT", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                                <small className="text-muted">Importo Totale</small>
                              </div>
                              <div className="col-12">
                                <div className="h5 fw-bold text-info">
                                  €{Math.abs(selectedDealerForModal.importoMedio).toFixed(2)}
                                </div>
                                <small className="text-muted">Importo Medio</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tabella transazioni */}
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">
                            <i className="fa-solid fa-receipt me-2"></i>
                            Transazioni E-Wallet ({selectedDealerForModal.operazioni.length})
                          </h6>
                          <div className="text-muted small">
                            Tipo: <strong>{selectedOperation.replace("Deposito e-Wallet-", "")}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                          <table className="table table-sm table-hover mb-0">
                            <thead className="table-dark sticky-top">
                              <tr>
                                <th style={{ width: "120px" }}>Numero</th>
                                <th style={{ width: "120px" }}>Data</th>
                                <th className="text-end" style={{ width: "120px" }}>Importo</th>
                                <th style={{ width: "100px" }}>Provincia</th>
                                <th style={{ width: "80px" }}>Stato</th>
                                <th>Descrizione</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDealerForModal.operazioni.map((operazione, idx) => (
                                <tr key={`${operazione.schId}-${idx}`}>
                                  <td>
                                    <code className="small">{operazione.schId}</code>
                                  </td>
                                  <td>
                                    <small>
                                      {new Date(operazione.schDataOperazione).toLocaleDateString("it-IT")}
                                      <br />
                                      <span className="text-muted">
                                        {new Date(operazione.schDataOperazione).toLocaleTimeString("it-IT", {
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </span>
                                    </small>
                                  </td>
                                  <td className="text-end">
                                    <span className={`fw-bold ${operazione.schImportoRic < 0 ? "text-danger" : "text-success"}`}>
                                      {operazione.schImportoRic < 0 ? "-" : "+"}€{Math.abs(operazione.schImportoRic).toFixed(2)}
                                    </span>
                                  </td>
                                  <td>
                                    {operazione.schProvincia && (
                                      <span className="badge bg-secondary small">
                                        {operazione.schProvincia}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge ${operazione.schStato === "Y" ? "bg-success" : "bg-warning"}`}>
                                      {operazione.schStato === "Y" ? "OK" : operazione.schStato}
                                    </span>
                                  </td>
                                  <td>
                                    <small className="text-muted">AP WALLET</small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-primary-dark"
                      onClick={() => {
                        // Qui potresti aggiungere l'export delle transazioni del dealer
                        console.log("Export dealer:", selectedDealerForModal.dealerCodice);
                      }}
                    >
                      <i className="fa-solid fa-download me-1"></i>
                      Esporta Transazioni
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary-dark"
                      onClick={closeDealerModal}
                    >
                      <i className="fa-solid fa-check me-1"></i>
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

export default EWalletAnalytics;
