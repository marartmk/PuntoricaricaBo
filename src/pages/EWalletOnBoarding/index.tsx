import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./onboarding-analytics.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ===============================
// === INTERFACCE ADATTATE API ===
// ===============================

interface OnBoardingStatistic {
  stepNumero: number;
  stepNome: string;
  stepDescrizione: string;
  registrazioniTotali: number;
  registrazioniCompletate: number;
  registrazioniInCorso: number;
  registrazioniAbbandonate: number;
  percentualeCompletamento: number;
  tempoMedioCompletamento: number; // in minuti
  primaRegistrazione: string;
  ultimaRegistrazione: string;
}

interface OnBoardingTotals {
  totaleRegistrazioni: number;
  registrazioniCompletate: number;
  registrazioniInCorso: number;
  registrazioniAbbandonate: number;
  percentualeSuccesso: number;
  tempoMedioTotale: number;
  generatedAt: string;
}

interface _OnBoardingFilters {
  anno: number;
  mese: number | null;
  dataInizio: string | null;
  dataFine: string | null;
  stepMinimo: number | null;
  soloCompletate: boolean;
}

interface UserRegistration {
  identificativoRegistrazione: string;
  codiceFiscale: string;
  nomeCompleto: string;
  dataRegistrazione: string;
  stepCorrente: number;
  stepCompletati: number[];
  statoRegistrazione: "IN_LAVORAZIONE" | "COMPLETATA" | "ERRORE" | "UNKNOWN";
  canaleRegistrazione: string;
  tipoUtente: string;
  ultimaAttivita: string;
  tempoImpiegato: number; // in minuti
  stepDettagli: StepDettaglio[];
  isCompletata: boolean;
  hasErroriBloccanti: boolean;
  percentualeCompletamento: number;
}

interface StepDettaglio {
  stepNumero: number;
  stepNome: string;
  dataInizio: string;
  dataCompletamento: string | null;
  stato: "NON_INIZIATO" | "IN_CORSO" | "COMPLETATO" | "FALLITO";
  tentativi: number;
  noteErrore?: string;
  url: string;
  metodo: string;
  successo: boolean;
  durataStep?: number; // in minuti
}

// API Response Types (dal backend)
interface RegistrationPathAnalysisDto {
  periodoInizio: string;
  periodoFine: string;
  totaleRegistrazioniIniziate: number;
  registrazioniCompletate: number;
  tassoConversione: number;
  tempoMedioCompletamento: string; // TimeSpan from backend
  stepPiuProblematico: string;
  abbandonoPerStep: StepAbandonmentDto[];
  statisticheTentativi: any;
}

interface StepAbandonmentDto {
  nomeStep: string;
  numeroStep: number;
  registrazioniArrivate: number;
  registrazioniCompletate: number;
  registrazioniAbbandonate: number;
  percentualeAbbandono: number;
  percentualeSuccesso: number;
  tempoMedioStep: string; // TimeSpan from backend
}

interface RegistrationSequenceDto {
  identificativoRegistrazione: string;
  codiceFiscale: string;
  dataInizio: string;
  dataUltimaAttivita: string;
  statoAttuale: string;
  stepAttuale: number;
  descrizioneStepAttuale: string;
  prossimoStep: string;
  isCompletata: boolean;
  hasErroriBloccanti: boolean;
  durataTotale: string;
  steps: RegistrationStepDto[];
  tentativiFalliti: number;
  percentualeCompletamento: number;
  ultimoErrore: string;
}

interface RegistrationStepDto {
  id: number;
  numeroStep: number;
  nomeStep: string;
  dataEsecuzione: string;
  durata: string;
  successo: boolean;
  codiceStato: string;
  errore: string;
  url: string;
  metodo: string;
  isRitentativo: boolean;
  numeroTentativo: number;
}

// ===============================
// === CONFIGURAZIONE API ===
// ===============================

const API_BASE_URL = import.meta.env.VITE_API_URL;

class WalletRegistrationApi {
  private static getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getRegistrationSequences(
    filters: any
  ): Promise<RegistrationSequenceDto[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/WalletRegistration/sequences`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(filters),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async analyzeRegistrationPaths(
    startDate: string,
    endDate: string
  ): Promise<RegistrationPathAnalysisDto> {
    const params = new URLSearchParams({
      startDate: startDate,
      endDate: endDate,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/WalletRegistration/analysis/paths?${params}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async getAdvancedDashboard(): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/WalletRegistration/dashboard/advanced`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async getBasicStats(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await fetch(
      `${API_BASE_URL}/api/WalletRegistration/stats?${params}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async getProblemSteps(
    days: number = 30
  ): Promise<StepAbandonmentDto[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/WalletRegistration/analysis/problem-steps?days=${days}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// ===============================
// === COMPONENTE PRINCIPALE ===
// ===============================

const OnBoardingAnalytics: React.FC = () => {
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

  // Stati per i dati reali dall'API
  const [onboardingStats, setOnboardingStats] = useState<OnBoardingStatistic[]>(
    []
  );
  const [onboardingTotals, setOnboardingTotals] =
    useState<OnBoardingTotals | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] =
    useState<boolean>(false);
  const [errorOnboarding, setErrorOnboarding] = useState<string>("");

  // Step selezionato
  const [selectedStep, setSelectedStep] = useState<string>("");

  // Stati per la gestione utenti
  const [usersList, setUsersList] = useState<UserRegistration[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [errorUsers, setErrorUsers] = useState<string>("");
  const [usersCurrentPage, setUsersCurrentPage] = useState<number>(1);
  const [usersItemsPerPage] = useState<number>(20);

  // Filtri per la ricerca utenti
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [selectedUserStatus, setSelectedUserStatus] = useState<string>("");

  // Modal utente dettagli
  const [selectedUserForModal, setSelectedUserForModal] =
    useState<UserRegistration | null>(null);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  // Colori per il grafico (diversi per i vari step)
  const chartColors = {
    STEP_1: ["#e74c3c", "#c0392b", "#a93226", "#922b21", "#7b2d26"],
    STEP_2: ["#f39c12", "#e67e22", "#d68910", "#b7950b", "#9a7d0a"],
    STEP_3: ["#3498db", "#2980b9", "#1f618d", "#1a5490", "#154360"],
    STEP_4: ["#9b59b6", "#8e44ad", "#7d3c98", "#6c3483", "#5b2c6f"],
    STEP_5: ["#2ecc71", "#27ae60", "#229954", "#1e8449", "#196f3d"],
    STEP_6: ["#e91e63", "#ad1457", "#880e4f", "#4a148c", "#311b92"],
    DEFAULT: ["#34495e", "#2c3e50", "#273746", "#212f3c", "#1b2631"],
  };

  // ===============================
  // === FUNZIONI API REALI ===
  // ===============================

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // Carica i dati quando cambiano i parametri
  useEffect(() => {
    console.log(
      "🔄 useEffect - Anno:",
      selectedYear,
      "Mese:",
      selectedMonth,
      "Modalità:",
      viewMode
    );
    fetchOnBoardingStats();
  }, [selectedYear, selectedMonth, selectedDay, viewMode]);

  // Funzione per recuperare le statistiche reali dall'API
  const fetchOnBoardingStats = async () => {
    setIsLoadingOnboarding(true);
    setErrorOnboarding("");

    try {
      console.log("📊 Caricamento statistiche On Boarding reali...");

      // Calcola le date in base ai parametri
      const { startDate, endDate } = calculateDateRange();

      // Chiamata parallela alle API
      const [pathAnalysis, basicStats] = await Promise.all([
        WalletRegistrationApi.analyzeRegistrationPaths(startDate, endDate),
        WalletRegistrationApi.getBasicStats(startDate, endDate),
      ]);

      console.log("📊 Path Analysis ricevuta:", pathAnalysis);
      console.log("📊 Basic Stats ricevute:", basicStats);

      // Converte i dati del backend nel formato frontend
      const convertedStats = convertPathAnalysisToOnBoardingStats(pathAnalysis);
      const convertedTotals = convertToOnBoardingTotals(
        pathAnalysis,
        basicStats
      );

      setOnboardingStats(convertedStats);
      setOnboardingTotals(convertedTotals);

      console.log("✅ Statistiche On Boarding caricate:", convertedStats);
    } catch (error: any) {
      console.error("🚨 Errore caricamento On Boarding:", error);
      setErrorOnboarding(
        error.message || "Errore nel caricamento delle statistiche"
      );
    } finally {
      setIsLoadingOnboarding(false);
    }
  };

  // Funzione per recuperare gli utenti per step selezionato
  const fetchUsersForStep = async (stepNumber: number) => {
    setIsLoadingUsers(true);
    setErrorUsers("");

    try {
      console.log("🔍 Caricamento utenti per step:", stepNumber);

      const { startDate, endDate } = calculateDateRange();

      // Filtri per le sequenze
      const filters = {
        dataInizio: startDate,
        dataFine: endDate,
        stepMinimo: stepNumber,
        stepMassimo: stepNumber,
        limite: 1000,
      };

      const sequences = await WalletRegistrationApi.getRegistrationSequences(
        filters
      );

      console.log("📊 Sequenze ricevute:", sequences);

      // Converte le sequenze in formato UserRegistration
      const convertedUsers = sequences.map((seq) =>
        convertSequenceToUserRegistration(seq)
      );

      setUsersList(convertedUsers);
      setUsersCurrentPage(1);

      console.log(
        `✅ ${convertedUsers.length} utenti caricati per step ${stepNumber}`
      );
    } catch (error: any) {
      console.error("🚨 Errore caricamento utenti:", error);
      setErrorUsers(error.message || "Errore nel caricamento degli utenti");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    console.log("🎯 selectedStep cambiato:", selectedStep);

    if (selectedStep) {
      const stepNumber = parseInt(selectedStep.split("-")[1]);
      fetchUsersForStep(stepNumber);
    } else {
      setUsersList([]);
      setErrorUsers("");
    }
  }, [selectedStep, viewMode, selectedYear, selectedMonth, selectedDay]);

  // ===============================
  // === FUNZIONI DI CONVERSIONE ===
  // ===============================

  const calculateDateRange = () => {
    let startDate: string;
    let endDate: string;

    if (viewMode === "day" && selectedDay && selectedMonth) {
      const day = new Date(selectedYear, selectedMonth - 1, selectedDay);
      startDate = day.toISOString().split("T")[0];
      endDate = new Date(day.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    } else if (viewMode === "month" && selectedMonth) {
      startDate = new Date(selectedYear, selectedMonth - 1, 1)
        .toISOString()
        .split("T")[0];
      endDate = new Date(selectedYear, selectedMonth, 0)
        .toISOString()
        .split("T")[0];
    } else {
      startDate = new Date(selectedYear, 0, 1).toISOString().split("T")[0];
      endDate = new Date(selectedYear, 11, 31).toISOString().split("T")[0];
    }

    return { startDate, endDate };
  };

  const convertPathAnalysisToOnBoardingStats = (
    pathAnalysis: RegistrationPathAnalysisDto
  ): OnBoardingStatistic[] => {
    const stepDescriptions = [
      "Inserimento dati anagrafici e personali",
      "Verifica e conferma indirizzo email",
      "Verifica numero di telefono via SMS",
      "Inserimento indirizzi residenza e domicilio",
      "Upload e verifica documento di identità",
      "Completamento dati professionali e finalizzazione",
    ];

    return pathAnalysis.abbandonoPerStep.map((step, index) => {
      // Converte il TimeSpan in minuti
      const tempoMedio = step.tempoMedioStep
        ? parseTimeSpanToMinutes(step.tempoMedioStep)
        : 0;

      return {
        stepNumero: step.numeroStep,
        stepNome: mapStepName(step.nomeStep),
        stepDescrizione:
          stepDescriptions[index] || "Descrizione non disponibile",
        registrazioniTotali: step.registrazioniArrivate,
        registrazioniCompletate: step.registrazioniCompletate,
        registrazioniInCorso: Math.max(
          0,
          step.registrazioniArrivate -
            step.registrazioniCompletate -
            step.registrazioniAbbandonate
        ),
        registrazioniAbbandonate: step.registrazioniAbbandonate,
        percentualeCompletamento: step.percentualeSuccesso,
        tempoMedioCompletamento: tempoMedio,
        primaRegistrazione: pathAnalysis.periodoInizio,
        ultimaRegistrazione: pathAnalysis.periodoFine,
      };
    });
  };

  const convertToOnBoardingTotals = (
    pathAnalysis: RegistrationPathAnalysisDto,
    _basicStats: any
  ): OnBoardingTotals => {
    const tempoMedio = pathAnalysis.tempoMedioCompletamento
      ? parseTimeSpanToMinutes(pathAnalysis.tempoMedioCompletamento)
      : 0;

    return {
      totaleRegistrazioni: pathAnalysis.totaleRegistrazioniIniziate,
      registrazioniCompletate: pathAnalysis.registrazioniCompletate,
      registrazioniInCorso: Math.max(
        0,
        pathAnalysis.totaleRegistrazioniIniziate -
          pathAnalysis.registrazioniCompletate
      ),
      registrazioniAbbandonate:
        pathAnalysis.totaleRegistrazioniIniziate -
        pathAnalysis.registrazioniCompletate,
      percentualeSuccesso: pathAnalysis.tassoConversione,
      tempoMedioTotale: tempoMedio,
      generatedAt: new Date().toISOString(),
    };
  };

  const convertSequenceToUserRegistration = (
    sequence: RegistrationSequenceDto
  ): UserRegistration => {
    const durataTotale = sequence.durataTotale
      ? parseTimeSpanToMinutes(sequence.durataTotale)
      : 0;

    // Estrae i dettagli degli step
    const stepDettagli: StepDettaglio[] = sequence.steps.map((step) => ({
      stepNumero: step.numeroStep,
      stepNome: mapStepName(step.nomeStep),
      dataInizio: step.dataEsecuzione,
      dataCompletamento: step.successo ? step.dataEsecuzione : null,
      stato: step.successo
        ? "COMPLETATO"
        : step.errore
        ? "FALLITO"
        : "IN_CORSO",
      tentativi: step.numeroTentativo,
      noteErrore: step.errore || undefined,
      url: step.url,
      metodo: step.metodo,
      successo: step.successo,
      durataStep: step.durata ? parseTimeSpanToMinutes(step.durata) : undefined,
    }));

    return {
      identificativoRegistrazione: sequence.identificativoRegistrazione,
      codiceFiscale: sequence.codiceFiscale,
      nomeCompleto: `Cliente ${sequence.codiceFiscale.substring(0, 6)}`, // Masking per privacy
      dataRegistrazione: sequence.dataInizio,
      stepCorrente: sequence.stepAttuale,
      stepCompletati: sequence.steps
        .filter((s) => s.successo)
        .map((s) => s.numeroStep),
      statoRegistrazione: mapStatoRegistrazione(sequence.statoAttuale),
      canaleRegistrazione: "Web Desktop", // Default, non disponibile nell'API
      tipoUtente: "Privato", // Default, non disponibile nell'API
      ultimaAttivita: sequence.dataUltimaAttivita,
      tempoImpiegato: durataTotale,
      stepDettagli: stepDettagli,
      isCompletata: sequence.isCompletata,
      hasErroriBloccanti: sequence.hasErroriBloccanti,
      percentualeCompletamento: sequence.percentualeCompletamento,
    };
  };

  // Helper functions per conversioni
  const parseTimeSpanToMinutes = (timeSpan: string): number => {
    try {
      // TimeSpan format: "00:05:30" (HH:MM:SS)
      const parts = timeSpan.split(":");
      if (parts.length >= 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return hours * 60 + minutes + seconds / 60;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const mapStepName = (backendStepName: string): string => {
    const mapping: { [key: string]: string } = {
      Step1_DatiAnagrafici: "Dati Personali",
      Step2_Email: "Verifica Email",
      Step3_Cellulare: "Verifica Telefono",
      Step4_Indirizzi: "Indirizzi",
      Step5_Documenti: "Documento Identità",
      Step6_DatiProfessionali: "Completamento",
      Verify_OTP_Step2: "Conferma Email",
      Verify_OTP_Step3: "Conferma Telefono",
      Verify_OTP_Step9: "Conferma Finale",
      Completa_Registrazione: "Finalizzazione",
    };
    return mapping[backendStepName] || backendStepName;
  };

  const mapStatoRegistrazione = (
    backendStato: string
  ): "IN_LAVORAZIONE" | "COMPLETATA" | "ERRORE" | "UNKNOWN" => {
    const mapping: {
      [key: string]: "IN_LAVORAZIONE" | "COMPLETATA" | "ERRORE" | "UNKNOWN";
    } = {
      COMPLETATA: "COMPLETATA",
      IN_LAVORAZIONE: "IN_LAVORAZIONE",
      ERRORE: "ERRORE",
    };
    return mapping[backendStato] || "UNKNOWN";
  };

  // ===============================
  // === RESTO DEL COMPONENTE ===
  // ===============================

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
    navigate(`/onboarding-analytics?${params.toString()}`, { replace: true });
  };

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // Preparazione dati per grafico a torta
  const preparePieData = () => {
    console.log("🥧 Preparazione dati grafico On Boarding:", onboardingStats);
    if (!onboardingStats.length) return [];

    const pieData = onboardingStats.map((step, index) => {
      const colorArray =
        chartColors[`STEP_${step.stepNumero}` as keyof typeof chartColors] ||
        chartColors.DEFAULT;

      return {
        name: `Step ${step.stepNumero}: ${step.stepNome}`,
        value: step.registrazioniTotali,
        fill: colorArray[0],
        step: step.stepNome,
        completate: step.registrazioniCompletate,
        percentuale: step.percentualeCompletamento.toFixed(1),
      };
    });

    console.log("🥧 Dati grafico On Boarding preparati:", pieData);
    return pieData;
  };

  // Preparazione dati per grafico a barre (tasso completamento)
  const prepareBarData = () => {
    if (!onboardingStats.length) return [];

    return onboardingStats.map((step, index) => ({
      step: `Step ${step.stepNumero}`,
      completamento: step.percentualeCompletamento,
      abbandono:
        (step.registrazioniAbbandonate / step.registrazioniTotali) * 100,
      fill:
        chartColors[
          `STEP_${step.stepNumero}` as keyof typeof chartColors
        ]?.[0] || chartColors.DEFAULT[0],
    }));
  };

  // Calcola il totale delle registrazioni
  const getTotalRegistrations = () => {
    return onboardingTotals?.totaleRegistrazioni || 0;
  };

  // Calcola il tasso di successo
  const getSuccessRate = () => {
    return onboardingTotals?.percentualeSuccesso || 0;
  };

  // Calcola il numero di step attivi
  const getActiveSteps = () => {
    return onboardingStats.length;
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

  // Funzioni helper per la gestione utenti
  const getFilteredUsers = () => {
    let filtered = usersList;

    // Filtro per termine di ricerca
    if (userSearchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.identificativoRegistrazione
            .toLowerCase()
            .includes(userSearchTerm.toLowerCase()) ||
          user.codiceFiscale
            .toLowerCase()
            .includes(userSearchTerm.toLowerCase()) ||
          user.nomeCompleto.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
    }

    // Filtro per stato
    if (selectedUserStatus) {
      filtered = filtered.filter(
        (user) => user.statoRegistrazione === selectedUserStatus
      );
    }

    return filtered;
  };

  const getPaginatedUsers = () => {
    const filtered = getFilteredUsers();
    const startIndex = (usersCurrentPage - 1) * usersItemsPerPage;
    const endIndex = startIndex + usersItemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalUsersPages = () => {
    const filtered = getFilteredUsers();
    return Math.ceil(filtered.length / usersItemsPerPage);
  };

  // Funzioni per gestire il modal utente
  const openUserModal = (user: UserRegistration) => {
    setSelectedUserForModal(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUserForModal(null);
  };

  // Helper function per ottenere i giorni del mese
  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Funzione per aggiornare i dati
  const handleRefreshData = () => {
    fetchOnBoardingStats();
  };

  // Funzione per ottenere il colore dello stato
  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETATA":
        return "success";
      case "IN_LAVORAZIONE":
        return "primary";
      case "ERRORE":
        return "danger";
      case "UNKNOWN":
        return "warning";
      default:
        return "secondary";
    }
  };

  // Funzione per ottenere l'icona dello step
  const getStepIcon = (stepNumber: number) => {
    const icons = [
      "fa-user", // Dati Personali
      "fa-envelope", // Email
      "fa-phone", // Telefono
      "fa-home", // Indirizzi
      "fa-id-card", // Documento
      "fa-check-circle", // Completamento
    ];
    return icons[stepNumber - 1] || "fa-circle";
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } onboarding-analytics-page`}
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
                    On Boarding Analytics
                  </li>
                </ol>
              </nav>
              <h2 className="onboarding-analytics-title">
                <i className="fa-solid fa-user-plus me-2"></i>
                On Boarding Analytics - {getCurrentPeriodText()}
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
                  title="Vista giornaliera"
                >
                  <i className="fa-solid fa-calendar-day me-1"></i>
                  Giorno
                </button>
                <button
                  className={`btn ${
                    viewMode === "month" ? "btn-info" : "btn-outline-info"
                  }`}
                  onClick={() => handleViewModeChange("month")}
                  title="Vista mensile"
                >
                  <i className="fa-solid fa-calendar-alt me-1"></i>
                  Mese
                </button>
                <button
                  className={`btn ${
                    viewMode === "year" ? "btn-warning" : "btn-outline-warning"
                  }`}
                  onClick={() => handleViewModeChange("year")}
                  title="Vista annuale"
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
                    <h6 className="dropdown-header">Vista Mensile</h6>
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
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">Vista Annuale</h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() =>
                        handlePeriodChange(2025, null, null, "year")
                      }
                    >
                      2025 - Anno Completo
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() =>
                        handlePeriodChange(2024, null, null, "year")
                      }
                    >
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
                disabled={isLoadingOnboarding}
              >
                <i
                  className={`fa-solid ${
                    isLoadingOnboarding ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Alert informativi per le diverse modalità */}
          {viewMode === "day" && (
            <div
              className="alert alert-success d-flex align-items-center mb-4"
              role="alert"
            >
              <i className="fa-solid fa-rocket me-2"></i>
              <div>
                <strong>Vista Giornaliera:</strong> Stai visualizzando le
                registrazioni per un singolo giorno. Questa modalità offre il
                massimo dettaglio.
              </div>
            </div>
          )}

          {/* Alert per confermare che stiamo usando dati reali */}
          <div
            className="alert alert-info d-flex align-items-center mb-4"
            role="alert"
          >
            <i className="fa-solid fa-database me-2"></i>
            <div>
              <strong>Dati Reali:</strong> Questa pagina utilizza dati reali dal
              database AdmiralPay_PROD. I dati vengono aggiornati in tempo
              reale.
            </div>
          </div>

          {/* Prima riga: Grafico a Torta e KPI */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione Registrazioni per Step</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  {isLoadingOnboarding ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati On Boarding...</h5>
                        <p className="text-primary">
                          Elaborazione statistiche registrazioni in corso...
                        </p>
                      </div>
                    </div>
                  ) : errorOnboarding ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorOnboarding}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={handleRefreshData}
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : onboardingStats.length > 0 ? (
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
                                `${name} (${props.payload.percentuale}% completato)`,
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
                              {getTotalRegistrations().toLocaleString("it-IT")}
                            </h1>
                            <h5 className="text-muted">Registrazioni Totali</h5>
                            <small className="text-muted">
                              {getCurrentPeriodText()}
                            </small>
                          </div>
                          <div className="d-grid gap-3">
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-success mb-1">
                                {getSuccessRate().toFixed(1)}%
                              </h3>
                              <small className="text-muted">
                                Tasso di Successo
                              </small>
                            </div>
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-info mb-1">
                                {onboardingTotals?.tempoMedioTotale.toFixed(
                                  0
                                ) || 0}{" "}
                                min
                              </h3>
                              <small className="text-muted">Tempo Medio</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-user-plus fa-3x mb-3"></i>
                        <h5>Nessuna registrazione disponibile</h5>
                        <p>
                          Nessuna registrazione trovata per il periodo
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
                  <span>KPI On Boarding</span>
                  <i className="fa-solid fa-tachometer-alt"></i>
                </div>
                <div className="card-body">
                  {/* Istruzioni per l'utente */}
                  {!selectedStep && onboardingStats.length > 0 && (
                    <div
                      className="alert alert-info d-flex align-items-center mb-3"
                      role="alert"
                    >
                      <i className="fa-solid fa-info-circle me-2"></i>
                      <div>
                        <strong>💡 Suggerimento:</strong> Clicca su uno step
                        sottostante per visualizzare gli utenti in quello step.
                      </div>
                    </div>
                  )}

                  {onboardingTotals ? (
                    <div className="d-grid gap-3">
                      <div className="card bg-primary text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {onboardingTotals.registrazioniCompletate.toLocaleString(
                              "it-IT"
                            )}
                          </h4>
                          <small>Registrazioni Completate</small>
                        </div>
                      </div>
                      <div className="card bg-warning text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {onboardingTotals.registrazioniInCorso.toLocaleString(
                              "it-IT"
                            )}
                          </h4>
                          <small>In Corso</small>
                        </div>
                      </div>
                      <div className="card bg-danger text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {onboardingTotals.registrazioniAbbandonate.toLocaleString(
                              "it-IT"
                            )}
                          </h4>
                          <small>Abbandonate</small>
                        </div>
                      </div>
                      <div className="card bg-info text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{getActiveSteps()}/6</h4>
                          <small>Step Attivi</small>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-bar fa-2x mb-2"></i>
                        <div>
                          {isLoadingOnboarding
                            ? "Caricamento..."
                            : "Nessun dato"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga: Grafico a Barre per Tasso di Completamento */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>
                    Tasso di Completamento per Step - {getCurrentPeriodText()}
                  </span>
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <div className="card-body">
                  {onboardingStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={prepareBarData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="step" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === "completamento"
                              ? "Completamento"
                              : "Abbandono",
                          ]}
                        />
                        <Bar
                          dataKey="completamento"
                          fill="#28a745"
                          name="completamento"
                        />
                        <Bar
                          dataKey="abbandono"
                          fill="#dc3545"
                          name="abbandono"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-chart-bar fa-3x mb-3"></i>
                        <h5>Nessun dato disponibile</h5>
                        <p>
                          I dati dei tassi di completamento non sono
                          disponibili.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terza riga: Dettagli Step */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>
                    Dettaglio Step On Boarding - {getCurrentPeriodText()}
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
                  {onboardingStats.length > 0 ? (
                    <div className="row g-3">
                      {onboardingStats.map((step, index) => {
                        const colorArray =
                          chartColors[
                            `STEP_${step.stepNumero}` as keyof typeof chartColors
                          ] || chartColors.DEFAULT;
                        const cardColor = colorArray[0];

                        return (
                          <div
                            key={`step-${step.stepNumero}`}
                            className="col-md-6 col-lg-4"
                          >
                            <div
                              className={`card h-100 step-card ${
                                selectedStep === `step-${step.stepNumero}`
                                  ? "border-primary"
                                  : ""
                              }`}
                              style={{
                                cursor: "pointer",
                                borderLeft: `4px solid ${cardColor}`,
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                const stepKey = `step-${step.stepNumero}`;

                                if (selectedStep === stepKey) {
                                  setSelectedStep("");
                                } else {
                                  setSelectedStep(stepKey);
                                }
                              }}
                            >
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h5 className="card-title mb-0">
                                    <i
                                      className={`fa-solid ${getStepIcon(
                                        step.stepNumero
                                      )} me-2`}
                                    ></i>
                                    {step.stepNome}
                                    {selectedStep ===
                                      `step-${step.stepNumero}` && (
                                      <i
                                        className="fa-solid fa-check-circle text-primary ms-2"
                                        title="Selezionato"
                                      ></i>
                                    )}
                                  </h5>
                                  <span className="badge rounded-pill bg-primary">
                                    Step {step.stepNumero}
                                  </span>
                                </div>
                                <p className="card-text small mb-3 text-muted">
                                  {step.stepDescrizione}
                                </p>
                                <div className="row text-center mb-3">
                                  <div className="col-4">
                                    <div className="fw-bold text-primary h5">
                                      {step.registrazioniTotali.toLocaleString(
                                        "it-IT"
                                      )}
                                    </div>
                                    <small className="text-muted">Totali</small>
                                  </div>
                                  <div className="col-4">
                                    <div className="fw-bold text-success h5">
                                      {step.registrazioniCompletate.toLocaleString(
                                        "it-IT"
                                      )}
                                    </div>
                                    <small className="text-muted">
                                      Completate
                                    </small>
                                  </div>
                                  <div className="col-4">
                                    <div className="fw-bold text-warning h5">
                                      {step.registrazioniInCorso.toLocaleString(
                                        "it-IT"
                                      )}
                                    </div>
                                    <small className="text-muted">
                                      In Corso
                                    </small>
                                  </div>
                                </div>

                                {/* Barra di progresso */}
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between mb-1">
                                    <small className="text-muted">
                                      Completamento
                                    </small>
                                    <small className="text-muted">
                                      {step.percentualeCompletamento.toFixed(1)}
                                      %
                                    </small>
                                  </div>
                                  <div
                                    className="progress"
                                    style={{ height: "8px" }}
                                  >
                                    <div
                                      className="progress-bar bg-success"
                                      style={{
                                        width: `${step.percentualeCompletamento}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <div className="row text-center">
                                    <div className="col-6">
                                      <small className="text-muted">
                                        Tempo medio:
                                      </small>
                                      <div
                                        className="fw-bold"
                                        style={{ fontSize: "0.9rem" }}
                                      >
                                        {step.tempoMedioCompletamento.toFixed(
                                          0
                                        )}{" "}
                                        min
                                      </div>
                                    </div>
                                    <div className="col-6">
                                      <small className="text-muted">
                                        Abbandonate:
                                      </small>
                                      <div
                                        className="fw-bold text-danger"
                                        style={{ fontSize: "0.9rem" }}
                                      >
                                        {step.registrazioniAbbandonate}
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
                        <i className="fa-solid fa-user-plus fa-3x mb-3"></i>
                        <h5>Nessuno step disponibile</h5>
                        <p>
                          I dati degli step di registrazione non sono
                          disponibili per {getCurrentPeriodText()}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quarta riga: Lista Utenti per Step Selezionato */}
          {selectedStep && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card border-primary">
                  <div className="custom-card-header">
                    <span>
                      <i className="fa-solid fa-users me-2"></i>
                      Utenti per {selectedStep.replace("step-", "Step ")} -{" "}
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
                          setSelectedStep("");
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
                    <div
                      className="alert alert-success d-flex align-items-center mb-3"
                      role="alert"
                    >
                      <i className="fa-solid fa-check-circle me-2"></i>
                      <div>
                        <strong>Step selezionato:</strong>{" "}
                        {selectedStep.replace("step-", "Step ")}
                        <br />
                        <small>
                          Periodo: {getCurrentPeriodText()} •{" "}
                          {getFilteredUsers().length} utenti trovati
                        </small>
                      </div>
                    </div>

                    {/* Filtri per la ricerca utenti */}
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="fa-solid fa-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Cerca per ID, codice fiscale..."
                            value={userSearchTerm}
                            onChange={(e) => {
                              setUserSearchTerm(e.target.value);
                              setUsersCurrentPage(1);
                            }}
                          />
                          {userSearchTerm && (
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setUserSearchTerm("");
                                setUsersCurrentPage(1);
                              }}
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <select
                          className="form-select"
                          value={selectedUserStatus}
                          onChange={(e) => {
                            setSelectedUserStatus(e.target.value);
                            setUsersCurrentPage(1);
                          }}
                        >
                          <option value="">Tutti gli stati</option>
                          <option value="COMPLETATA">Completata</option>
                          <option value="IN_LAVORAZIONE">In Lavorazione</option>
                          <option value="ERRORE">Errore</option>
                          <option value="UNKNOWN">Sconosciuto</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <div className="d-flex justify-content-end align-items-center gap-2">
                          <small className="text-muted">
                            {getFilteredUsers().length} utenti
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Contenuto utenti */}
                    {isLoadingUsers ? (
                      <div className="chart-placeholder">
                        <div className="text-center text-muted">
                          <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                          <h5>Caricamento utenti...</h5>
                          <p>Recupero delle registrazioni in corso...</p>
                        </div>
                      </div>
                    ) : errorUsers ? (
                      <div className="chart-placeholder">
                        <div className="text-center text-danger">
                          <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                          <h5>Errore nel caricamento utenti</h5>
                          <p>{errorUsers}</p>
                          <button
                            className="btn btn-primary-dark btn-sm mt-2"
                            onClick={() => {
                              const stepNumber = parseInt(
                                selectedStep.split("-")[1]
                              );
                              fetchUsersForStep(stepNumber);
                            }}
                          >
                            <i className="fa-solid fa-refresh me-1"></i>
                            Riprova
                          </button>
                        </div>
                      </div>
                    ) : usersList.length > 0 ? (
                      <>
                        {/* Tabella utenti */}
                        <div className="table-responsive">
                          <div
                            className="alert alert-info d-flex align-items-center mb-2"
                            role="alert"
                          >
                            <i className="fa-solid fa-info-circle me-2"></i>
                            <small>
                              <strong>💡 Suggerimento:</strong> Clicca su una
                              riga per vedere tutti i dettagli della
                              registrazione.
                            </small>
                          </div>
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th style={{ width: "150px" }}>
                                  ID Registrazione
                                </th>
                                <th>Codice Fiscale</th>
                                <th style={{ width: "150px" }}>Nome</th>
                                <th
                                  className="text-center"
                                  style={{ width: "100px" }}
                                >
                                  Step
                                </th>
                                <th
                                  className="text-center"
                                  style={{ width: "120px" }}
                                >
                                  Stato
                                </th>
                                <th
                                  className="text-center"
                                  style={{ width: "100px" }}
                                >
                                  %
                                </th>
                                <th
                                  className="text-center"
                                  style={{ width: "100px" }}
                                >
                                  Tempo
                                </th>
                                <th
                                  className="text-center"
                                  style={{ width: "60px" }}
                                >
                                  <i
                                    className="fa-solid fa-eye"
                                    title="Dettagli"
                                  ></i>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getPaginatedUsers().map((user, _index) => (
                                <tr
                                  key={user.identificativoRegistrazione}
                                  onClick={() => openUserModal(user)}
                                  style={{ cursor: "pointer" }}
                                  title="Clicca per vedere i dettagli"
                                >
                                  <td>
                                    <code
                                      className="badge bg-secondary text-truncate"
                                      style={{ maxWidth: "120px" }}
                                    >
                                      {user.identificativoRegistrazione}
                                    </code>
                                  </td>
                                  <td>
                                    <small>{user.codiceFiscale}</small>
                                  </td>
                                  <td>
                                    <div className="fw-bold">
                                      {user.nomeCompleto}
                                    </div>
                                    <small className="text-muted">
                                      {new Date(
                                        user.dataRegistrazione
                                      ).toLocaleDateString("it-IT")}
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-info rounded-pill">
                                      {user.stepCorrente}/6
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span
                                      className={`badge bg-${getStatusColor(
                                        user.statoRegistrazione
                                      )}`}
                                    >
                                      {user.statoRegistrazione.replace(
                                        "_",
                                        " "
                                      )}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <small>
                                      {user.percentualeCompletamento.toFixed(0)}
                                      %
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <small>
                                      {user.tempoImpiegato.toFixed(0)} min
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <i
                                      className="fa-solid fa-search-plus text-primary"
                                      style={{ fontSize: "0.9rem" }}
                                    ></i>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginazione */}
                        {getTotalUsersPages() > 1 && (
                          <nav aria-label="Paginazione utenti">
                            <ul className="pagination justify-content-center">
                              <li
                                className={`page-item ${
                                  usersCurrentPage === 1 ? "disabled" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    setUsersCurrentPage(usersCurrentPage - 1)
                                  }
                                  disabled={usersCurrentPage === 1}
                                >
                                  <i className="fa-solid fa-chevron-left"></i>
                                </button>
                              </li>

                              {Array.from(
                                { length: Math.min(5, getTotalUsersPages()) },
                                (_, i) => {
                                  const pageNum =
                                    Math.max(1, usersCurrentPage - 2) + i;
                                  if (pageNum > getTotalUsersPages())
                                    return null;

                                  return (
                                    <li
                                      key={pageNum}
                                      className={`page-item ${
                                        usersCurrentPage === pageNum
                                          ? "active"
                                          : ""
                                      }`}
                                    >
                                      <button
                                        className="page-link"
                                        onClick={() =>
                                          setUsersCurrentPage(pageNum)
                                        }
                                      >
                                        {pageNum}
                                      </button>
                                    </li>
                                  );
                                }
                              )}

                              <li
                                className={`page-item ${
                                  usersCurrentPage === getTotalUsersPages()
                                    ? "disabled"
                                    : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    setUsersCurrentPage(usersCurrentPage + 1)
                                  }
                                  disabled={
                                    usersCurrentPage === getTotalUsersPages()
                                  }
                                >
                                  <i className="fa-solid fa-chevron-right"></i>
                                </button>
                              </li>
                            </ul>
                            <div className="text-center mt-2">
                              <small className="text-muted">
                                Pagina {usersCurrentPage} di{" "}
                                {getTotalUsersPages()} • Mostrando{" "}
                                {getPaginatedUsers().length} di{" "}
                                {getFilteredUsers().length} utenti
                              </small>
                            </div>
                          </nav>
                        )}
                      </>
                    ) : (
                      <div className="chart-placeholder">
                        <div className="text-center text-muted">
                          <i className="fa-solid fa-users-slash fa-3x mb-3"></i>
                          <h5>Nessun utente trovato</h5>
                          <p>
                            Non sono stati trovati utenti per lo{" "}
                            <strong>{selectedStep}</strong> nel periodo{" "}
                            <strong>{getCurrentPeriodText()}</strong>.
                          </p>
                          {userSearchTerm && (
                            <p className="small">
                              Prova a modificare o rimuovere il filtro di
                              ricerca.
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

          {/* Modal Dettagli Utente */}
          {showUserModal && selectedUserForModal && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header custom-card-header">
                    <h5 className="modal-title mb-0">
                      <i className="fa-solid fa-user me-2"></i>
                      Dettagli Registrazione:{" "}
                      {selectedUserForModal.nomeCompleto}
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={closeUserModal}
                      aria-label="Close"
                    ></button>
                  </div>

                  <div className="modal-body">
                    {/* Header con informazioni utente */}
                    <div className="row mb-4">
                      <div className="col-md-8">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-primary">
                              <i className="fa-solid fa-user me-2"></i>
                              Informazioni Registrazione
                            </h6>
                            <div className="row">
                              <div className="col-sm-6">
                                <strong>ID Registrazione:</strong>
                                <div className="mb-2">
                                  <code className="badge bg-secondary fs-6 p-2">
                                    {
                                      selectedUserForModal.identificativoRegistrazione
                                    }
                                  </code>
                                </div>
                                <strong>Codice Fiscale:</strong>
                                <div className="fw-bold text-dark mb-2">
                                  {selectedUserForModal.codiceFiscale}
                                </div>
                                <strong>Nome:</strong>
                                <div className="text-primary mb-2">
                                  {selectedUserForModal.nomeCompleto}
                                </div>
                              </div>
                              <div className="col-sm-6">
                                <strong>Canale Registrazione:</strong>
                                <div className="mb-2">
                                  <span className="badge bg-info">
                                    {selectedUserForModal.canaleRegistrazione}
                                  </span>
                                </div>
                                <strong>Tipo Utente:</strong>
                                <div className="mb-2">
                                  <span className="badge bg-secondary">
                                    {selectedUserForModal.tipoUtente}
                                  </span>
                                </div>
                                <strong>Data Registrazione:</strong>
                                <div className="text-muted small">
                                  {new Date(
                                    selectedUserForModal.dataRegistrazione
                                  ).toLocaleString("it-IT")}
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
                              Statistiche Registrazione
                            </h6>
                            <div className="row">
                              <div className="col-12 mb-3">
                                <div className="display-6 fw-bold text-primary">
                                  {selectedUserForModal.stepCorrente}/6
                                </div>
                                <small className="text-muted">
                                  Step Corrente
                                </small>
                              </div>
                              <div className="col-12 mb-3">
                                <div
                                  className={`h4 fw-bold text-${getStatusColor(
                                    selectedUserForModal.statoRegistrazione
                                  )}`}
                                >
                                  {selectedUserForModal.statoRegistrazione.replace(
                                    "_",
                                    " "
                                  )}
                                </div>
                                <small className="text-muted">
                                  Stato Registrazione
                                </small>
                              </div>
                              <div className="col-12 mb-3">
                                <div className="h5 fw-bold text-success">
                                  {selectedUserForModal.percentualeCompletamento.toFixed(
                                    0
                                  )}
                                  %
                                </div>
                                <small className="text-muted">
                                  Completamento
                                </small>
                              </div>
                              <div className="col-12">
                                <div className="h5 fw-bold text-info">
                                  {selectedUserForModal.tempoImpiegato.toFixed(
                                    0
                                  )}{" "}
                                  min
                                </div>
                                <small className="text-muted">
                                  Tempo Totale
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline degli step */}
                    <div className="card">
                      <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">
                            <i className="fa-solid fa-list-ol me-2"></i>
                            Timeline Step Registrazione
                          </h6>
                          <div className="text-muted small">
                            Ultima attività:{" "}
                            <strong>
                              {new Date(
                                selectedUserForModal.ultimaAttivita
                              ).toLocaleString("it-IT")}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="timeline">
                          {selectedUserForModal.stepDettagli.map(
                            (step, idx) => {
                              const isCompleted = step.stato === "COMPLETATO";
                              const isInProgress = step.stato === "IN_CORSO";
                              const isFailed = step.stato === "FALLITO";
                              const isNotStarted =
                                step.stato === "NON_INIZIATO";

                              return (
                                <div
                                  key={step.stepNumero}
                                  className={`timeline-item ${
                                    isCompleted
                                      ? "completed"
                                      : isInProgress
                                      ? "in-progress"
                                      : isFailed
                                      ? "failed"
                                      : "not-started"
                                  }`}
                                >
                                  <div className="timeline-marker">
                                    <i
                                      className={`fa-solid ${
                                        isCompleted
                                          ? "fa-check-circle text-success"
                                          : isInProgress
                                          ? "fa-clock text-warning"
                                          : isFailed
                                          ? "fa-times-circle text-danger"
                                          : "fa-circle text-muted"
                                      }`}
                                    ></i>
                                  </div>
                                  <div className="timeline-content">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <h6 className="mb-1">
                                          <i
                                            className={`fa-solid ${getStepIcon(
                                              step.stepNumero
                                            )} me-2`}
                                          ></i>
                                          Step {step.stepNumero}:{" "}
                                          {step.stepNome}
                                        </h6>
                                        <div className="row">
                                          <div className="col-md-6">
                                            <small className="text-muted">
                                              <strong>Iniziato:</strong>{" "}
                                              {new Date(
                                                step.dataInizio
                                              ).toLocaleString("it-IT")}
                                            </small>
                                            {step.dataCompletamento && (
                                              <div>
                                                <small className="text-muted">
                                                  <strong>Completato:</strong>{" "}
                                                  {new Date(
                                                    step.dataCompletamento
                                                  ).toLocaleString("it-IT")}
                                                </small>
                                              </div>
                                            )}
                                          </div>
                                          <div className="col-md-6">
                                            <small className="text-muted">
                                              <strong>Tentativi:</strong>{" "}
                                              {step.tentativi}
                                            </small>
                                            {step.durataStep && (
                                              <div>
                                                <small className="text-muted">
                                                  <strong>Durata:</strong>{" "}
                                                  {step.durataStep.toFixed(0)}{" "}
                                                  min
                                                </small>
                                              </div>
                                            )}
                                            {step.noteErrore && (
                                              <div>
                                                <small className="text-danger">
                                                  <strong>Errore:</strong>{" "}
                                                  {step.noteErrore}
                                                </small>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {step.url && (
                                          <div className="mt-1">
                                            <small className="text-muted">
                                              <strong>URL:</strong>{" "}
                                              <code>
                                                {step.metodo} {step.url}
                                              </code>
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                      <span
                                        className={`badge bg-${
                                          isCompleted
                                            ? "success"
                                            : isInProgress
                                            ? "warning"
                                            : isFailed
                                            ? "danger"
                                            : "secondary"
                                        }`}
                                      >
                                        {step.stato.replace("_", " ")}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-primary-dark"
                      onClick={() => {
                        console.log(
                          "Export utente:",
                          selectedUserForModal.identificativoRegistrazione
                        );
                      }}
                    >
                      <i className="fa-solid fa-download me-1"></i>
                      Esporta Dettagli
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary-dark"
                      onClick={closeUserModal}
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

export default OnBoardingAnalytics;
