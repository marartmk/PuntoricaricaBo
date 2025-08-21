import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./tasks-custom.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// âœ… INTERFACCE PER TASK MANAGEMENT
interface Cliente {
  id: string;
  nome: string;
  cognome?: string;
  email: string;
  telefono?: string;
  citta?: string;
  provincia?: string;
  tipoAttivita?: string;
  azienda?: string;
  indirizzo?: string;
  cap?: string;
}

interface Agente {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  reparto?: string;
  attivo: boolean;
  codiceAgente?: string;
}

interface TaskIntervento {
  id: string;
  taskId: string;
  operatoreId: string;
  nomeOperatore: string;
  cognomeOperatore: string;
  tipoIntervento:
    | "Chiamata"
    | "Email"
    | "Note"
    | "Assegnazione"
    | "Cambio Stato"
    | "Altro";
  descrizione: string;
  dataIntervento: string;
  durata?: number;
  esitoIntervento?: "Positivo" | "Negativo" | "Neutrale" | "Da Ricontattare";
  prossimaAzione?: string;
  dataProximoContatto?: string;
}

interface Task {
  id: string;
  numeroTask: string;
  titolo: string;
  descrizione: string;
  stato:
    | "Aperto"
    | "In Corso"
    | "In Attesa"
    | "Completato"
    | "Chiuso"
    | "Sospeso";
  priorita: "Bassa" | "Media" | "Alta" | "Urgente";
  cliente: Cliente;
  agenteAssegnato?: Agente;
  dataCreazione: string;
  dataUltimaModifica?: string;
  dataScadenza?: string;
  dataChiusura?: string;
  origine: "Email" | "Telefono" | "Sito Web" | "Manuale" | "Chat" | "Social";
  categoria:
    | "Vendita"
    | "Supporto"
    | "Tecnico"
    | "Amministrativo"
    | "Reclamo"
    | "Informazioni";
  valorePotenziale?: number;
  note?: string;
  interventI: TaskIntervento[];
  tags?: string[];
}

interface TaskStats {
  totaleTask: number;
  aperti: number;
  inCorso: number;
  completati: number;
  scaduti: number;
  mediaRisoluzione: number;
  valoreTotalePotenziale: number;
}

interface NuovoTaskForm {
  titolo: string;
  descrizione: string;
  priorita: "Bassa" | "Media" | "Alta" | "Urgente";
  categoria:
    | "Vendita"
    | "Supporto"
    | "Tecnico"
    | "Amministrativo"
    | "Reclamo"
    | "Informazioni";
  agenteAssegnatoId: string;
  dataScadenza: string;
  valorePotenziale?: number;
  note: string;
  clienteNome: string;
  clienteCognome: string;
  clienteEmail: string;
  clienteTelefono: string;
  clienteCitta: string;
  clienteProvincia: string;
  clienteAzienda: string;
  clienteTipoAttivita: string;
}

// âœ… INTERFACCE API BACKEND
interface AgenteDto {
  id: string;
  codiceAgente: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  attivo: boolean;
  dataInserimento: string;
  dataUltimaModifica?: string;
}

interface ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TaskManagement: React.FC = () => {
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // âœ… CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // âœ… STATI PRINCIPALI
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // âœ… STATI AGENTI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [isLoadingAgenti, setIsLoadingAgenti] = useState<boolean>(false);
  const [errorAgenti, setErrorAgenti] = useState<string>("");

  // âœ… STATI PAGINAZIONE SERVER
  const [totalCount, setTotalCount] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(0);

  // âœ… STATI FILTRI E VISUALIZZAZIONE
  const [activeTab, setActiveTab] = useState<
    "aperti" | "tutti" | "completati" | "scaduti"
  >("aperti");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("tutte");
  const [selectedAgent, setSelectedAgent] = useState<string>("tutti");
  const [selectedCategory, setSelectedCategory] = useState<string>("tutte");
  const [selectedStatus, setSelectedStatus] = useState<string>("tutti");

  // âœ… STATI FORM E MODALI
  const [showNewTaskForm, setShowNewTaskForm] = useState<boolean>(false);
  const [showTaskDetail, setShowTaskDetail] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [showAddInterventionModal, setShowAddInterventionModal] =
    useState<boolean>(false);

  // âœ… STATI PER RIASSEGNAZIONE
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");

  // âœ… STATI PER NUOVO INTERVENTO
  const defaultNewIntervention: Omit<TaskIntervento, "id" | "taskId"> = {
    operatoreId: "",
    nomeOperatore: "",
    cognomeOperatore: "",
    tipoIntervento: "Note",
    descrizione: "",
    dataIntervento: new Date().toISOString(),
    durata: undefined,
    esitoIntervento: undefined,
    prossimaAzione: undefined,
    dataProximoContatto: undefined,
  };

  const [newIntervention, setNewIntervention] = useState<
    Omit<TaskIntervento, "id" | "taskId">
  >(defaultNewIntervention);

  // âœ… PAGINAZIONE
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // âœ… FORM NUOVO TASK
  const defaultNewTask: NuovoTaskForm = {
    titolo: "",
    descrizione: "",
    priorita: "Media",
    categoria: "Vendita",
    agenteAssegnatoId: "",
    dataScadenza: "",
    valorePotenziale: undefined,
    note: "",
    clienteNome: "",
    clienteCognome: "",
    clienteEmail: "",
    clienteTelefono: "",
    clienteCitta: "",
    clienteProvincia: "",
    clienteAzienda: "",
    clienteTipoAttivita: "",
  };

  const [newTask, setNewTask] = useState<NuovoTaskForm>(defaultNewTask);

  // âœ… HELPER PER TOKEN AUTH
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error(
        "Token di autenticazione non trovato. Effettua il login dalla pagina di accesso."
      );
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // âœ… DATI FAKE PER FALLBACK
  const generateTasksFake = (): Task[] => [
    {
      id: "task-1",
      numeroTask: "TSK-001",
      titolo: "Richiesta informazioni POS",
      descrizione: "Cliente interessato a soluzioni POS per la sua attività",
      stato: "Aperto",
      priorita: "Alta",
      cliente: {
        id: "client-1",
        nome: "Marco",
        cognome: "Amicone",
        email: "aaaamiconeasssicurazioni@gmail.com",
        telefono: "3389105515",
        citta: "San Valentino in abruzzo citeriore",
        provincia: "PE",
        tipoAttivita: "Assicurazioni",
        azienda: "Amicone Assicurazioni",
      },
      agenteAssegnato: {
        id: "fake-1",
        nome: "Marco",
        cognome: "Rossi",
        email: "m.rossi@company.com",
        telefono: "+39 339 1234567",
        reparto: "Commerciale",
        attivo: true,
        codiceAgente: "AGE001",
      },
      dataCreazione: "2025-08-20T10:30:00Z",
      dataScadenza: "2025-08-25T17:00:00Z",
      origine: "Email",
      categoria: "Vendita",
      valorePotenziale: 2500,
      interventI: [], // IMPORTANTE: sempre array vuoto, mai undefined
      tags: ["pos", "vendita", "assicurazioni"],
    },
    {
      id: "task-2",
      numeroTask: "TSK-002",
      titolo: "Supporto tecnico dispositivo",
      descrizione: "Problema con lettore carte cliente esistente",
      stato: "In Corso",
      priorita: "Media",
      cliente: {
        id: "client-2",
        nome: "Giulia",
        cognome: "Ferrari",
        email: "g.ferrari@ristorante.it",
        telefono: "+39 334 9876543",
        citta: "Milano",
        provincia: "MI",
        tipoAttivita: "Ristorazione",
        azienda: "Ristorante Da Giulia",
      },
      agenteAssegnato: {
        id: "fake-3",
        nome: "Luigi",
        cognome: "Bianchi",
        email: "l.bianchi@company.com",
        telefono: "+39 347 9876543",
        reparto: "Tecnico",
        attivo: true,
        codiceAgente: "AGE003",
      },
      dataCreazione: "2025-08-19T14:20:00Z",
      dataScadenza: "2025-08-22T18:00:00Z",
      origine: "Telefono",
      categoria: "Tecnico",
      interventI: [], // IMPORTANTE: sempre array vuoto, mai undefined
      tags: ["supporto", "hardware", "lettore"],
    },
  ];

  // âœ… FUNZIONE API PER RECUPERARE AGENTI
  const fetchAgenti = async () => {
    setIsLoadingAgenti(true);
    setErrorAgenti("");
    console.log("ðŸ“¡ Iniziando caricamento agenti...");

    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Agenti?pageSize=1000`;
      console.log("ðŸŒ URL chiamata agenti:", url);

      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        const errorText = await response.text();
        throw new Error(
          `Errore nel caricamento agenti: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<PaginatedResponse<AgenteDto>> =
        await response.json();
      console.log("ðŸ“Š Dati ricevuti agenti:", data);

      if (data.success && data.data && data.data.items) {
        console.log("âœ… Agenti caricati:", data.data.items.length);
        const agentiAttivi = data.data.items.filter((agente) => agente.attivo);
        setAgenti(agentiAttivi);
      } else {
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("ðŸš¨ Errore caricamento agenti:", error);

      // FALLBACK: Usa dati fake
      const agentiFake: AgenteDto[] = [
        {
          id: "fake-1",
          codiceAgente: "AGE001",
          nome: "Marco",
          cognome: "Rossi",
          email: "m.rossi@company.com",
          telefono: "+39 339 1234567",
          attivo: true,
          dataInserimento: new Date().toISOString(),
        },
        {
          id: "fake-2",
          codiceAgente: "AGE002",
          nome: "Anna",
          cognome: "Verdi",
          email: "a.verdi@company.com",
          telefono: "+39 338 7654321",
          attivo: true,
          dataInserimento: new Date().toISOString(),
        },
      ];

      setAgenti(agentiFake);
      setErrorAgenti(
        error instanceof Error
          ? `API Error: ${error.message} (usando dati fake)`
          : "Errore imprevisto nel caricamento agenti (usando dati fake)"
      );
    } finally {
      setIsLoadingAgenti(false);
    }
  };

  // âœ… FUNZIONE API PER RECUPERARE TASKS
  const fetchTasks = async (filters?: {
    page?: number;
    pageSize?: number;
    search?: string;
    stato?: string;
    priorita?: string;
    categoria?: string;
    agenteId?: string;
    scaduti?: boolean;
  }) => {
    setIsLoading(true);
    setError("");
    console.log("ðŸ“¡ Iniziando caricamento tasks...");

    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();

      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.pageSize)
        params.append("pageSize", filters.pageSize.toString());
      if (filters?.search) params.append("search", filters.search);
      if (filters?.stato && filters.stato !== "tutti")
        params.append("stato", filters.stato);
      if (filters?.priorita && filters.priorita !== "tutte")
        params.append("priorita", filters.priorita);
      if (filters?.categoria && filters.categoria !== "tutte")
        params.append("categoria", filters.categoria);
      if (filters?.agenteId && filters.agenteId !== "tutti")
        params.append("agenteId", filters.agenteId);
      if (filters?.scaduti) params.append("scaduti", "true");

      const url = `${API_URL}/api/Tasks?${params.toString()}`;
      console.log("ðŸŒ URL chiamata tasks:", url);

      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        const errorText = await response.text();
        throw new Error(
          `Errore nel caricamento tasks: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<PaginatedResponse<Task>> =
        await response.json();
      console.log("ðŸ“Š Dati ricevuti tasks:", data);

      if (data.success && data.data && data.data.items) {
        console.log("✅ Tasks caricati:", data.data.items.length);

        const tasksWithInterventi = data.data.items.map((task) => ({
          ...task,
          interventI: task.interventI || [],
        }));

        setTasks(tasksWithInterventi); // ← QUESTA è la riga corretta!
        setTotalCount(data.data.totalCount);
        setServerTotalPages(data.data.totalPages);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nel recupero tasks");
      }
    } catch (error) {
      console.error("ðŸš¨ Errore caricamento tasks:", error);

      // FALLBACK: Usa dati fake
      console.warn("ðŸ”„ Usando dati fake per tasks...");
      const tasksFakeLocal = generateTasksFake();
      setTasks(tasksFakeLocal);
      setTotalCount(tasksFakeLocal.length);
      setServerTotalPages(1);

      setError(
        error instanceof Error
          ? `API Error: ${error.message} (usando dati fake)`
          : "Errore imprevisto nel caricamento tasks (usando dati fake)"
      );

      return {
        items: tasksFakeLocal,
        totalCount: tasksFakeLocal.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // âœ… FUNZIONE API PER CREARE NUOVO TASK
  const createTask = async (taskData: {
    titolo: string;
    descrizione: string;
    priorita: string;
    categoria: string;
    idAgenteAssegnato?: string;
    dataScadenza?: string;
    valorePotenziale?: number;
    note?: string;
    cliente: {
      nome: string;
      cognome?: string;
      email: string;
      telefono?: string;
      citta?: string;
      provincia?: string;
      azienda?: string;
      tipoAttivita?: string;
    };
    tags?: string[];
  }) => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Errore nella creazione task: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<Task> = await response.json();

      if (data.success && data.data) {
        console.log("âœ… Task creato:", data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nella creazione task");
      }
    } catch (error) {
      console.error("ðŸš¨ Errore creazione task:", error);
      throw error;
    }
  };

  // âœ… FUNZIONE API PER AGGIORNARE TASK
  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks/${taskId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...taskData, id: taskId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Errore nell'aggiornamento task: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<Task> = await response.json();

      if (data.success && data.data) {
        console.log("âœ… Task aggiornato:", data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nell'aggiornamento task");
      }
    } catch (error) {
      console.error("ðŸš¨ Errore aggiornamento task:", error);
      throw error;
    }
  };

  // âœ… FUNZIONE API PER AGGIUNGERE INTERVENTO
  const addTaskIntervention = async (
    taskId: string,
    interventoData: {
      operatoreId: string;
      nomeOperatore: string;
      cognomeOperatore: string;
      tipoIntervento: string;
      descrizione: string;
      durata?: number;
      esitoIntervento?: string;
      prossimaAzione?: string;
      dataProximoContatto?: string;
    }
  ) => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks/${taskId}/interventi`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(interventoData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Errore nell'aggiunta intervento: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<TaskIntervento> = await response.json();

      if (data.success && data.data) {
        console.log("âœ… Intervento aggiunto:", data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nell'aggiunta intervento");
      }
    } catch (error) {
      console.error("ðŸš¨ Errore aggiunta intervento:", error);
      throw error;
    }
  };

  // âœ… GESTIONE FILTRI COLLEGATA ALLE API
  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchTasks({
      page: 1,
      pageSize: itemsPerPage,
      search: searchTerm || undefined,
      stato: activeTab === "tutti" ? undefined : activeTab,
      priorita: selectedPriority === "tutte" ? undefined : selectedPriority,
      categoria: selectedCategory === "tutte" ? undefined : selectedCategory,
      agenteId: selectedAgent === "tutti" ? undefined : selectedAgent,
      scaduti: activeTab === "scaduti" ? true : undefined,
    });
  };

  // âœ… GESTIONE PAGINAZIONE COLLEGATA ALLE API
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTasks({
      page: newPage,
      pageSize: itemsPerPage,
      search: searchTerm || undefined,
      stato: activeTab === "tutti" ? undefined : activeTab,
      priorita: selectedPriority === "tutte" ? undefined : selectedPriority,
      categoria: selectedCategory === "tutte" ? undefined : selectedCategory,
      agenteId: selectedAgent === "tutti" ? undefined : selectedAgent,
      scaduti: activeTab === "scaduti" ? true : undefined,
    });
  };

  // âœ… CARICAMENTO INIZIALE
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    if (!API_URL) {
      setError("VITE_API_URL non configurato nel file .env");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token di autenticazione non trovato. Effettua il login.");
      return;
    }

    const loadInitialData = async () => {
      try {
        await fetchAgenti();
        await fetchTasks({ page: 1, pageSize: itemsPerPage });
        console.log("âœ… Dati iniziali caricati");
      } catch (error) {
        console.error("ðŸš¨ Errore caricamento dati iniziali:", error);
      }
    };

    loadInitialData();
  }, [API_URL]);

  // âœ… FUNZIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // âœ… STATISTICHE TASKS
  const stats = useMemo((): TaskStats => {
    const oggi = new Date();
    const scaduti = tasks.filter((task) => {
      if (
        !task.dataScadenza ||
        task.stato === "Completato" ||
        task.stato === "Chiuso"
      )
        return false;
      return new Date(task.dataScadenza) < oggi;
    }).length;

    const completati = tasks.filter(
      (task) => task.stato === "Completato" || task.stato === "Chiuso"
    );

    const mediaRisoluzione =
      completati.length > 0
        ? completati.reduce((acc, task) => {
            if (task.dataChiusura) {
              const giorni = Math.ceil(
                (new Date(task.dataChiusura).getTime() -
                  new Date(task.dataCreazione).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return acc + giorni;
            }
            return acc;
          }, 0) / completati.length
        : 0;

    return {
      totaleTask: totalCount || tasks.length,
      aperti: tasks.filter((t) => t.stato === "Aperto").length,
      inCorso: tasks.filter(
        (t) => t.stato === "In Corso" || t.stato === "In Attesa"
      ).length,
      completati: completati.length,
      scaduti,
      mediaRisoluzione: Math.round(mediaRisoluzione * 10) / 10,
      valoreTotalePotenziale: tasks.reduce(
        (acc, t) => acc + (t.valorePotenziale || 0),
        0
      ),
    };
  }, [tasks, totalCount]);

  // âœ… DATI PER GRAFICO STATI
  const chartData = useMemo(() => {
    const statiCount = tasks.reduce((acc, task) => {
      acc[task.stato] = (acc[task.stato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      Aperto: "#ffc107",
      "In Corso": "#17a2b8",
      "In Attesa": "#fd7e14",
      Completato: "#28a745",
      Chiuso: "#6c757d",
      Sospeso: "#dc3545",
    };

    return Object.entries(statiCount).map(([stato, count]) => ({
      name: stato,
      value: count,
      fill: colors[stato as keyof typeof colors] || "#6c757d",
    }));
  }, [tasks]);

  // âœ… BADGE FUNCTIONS
  const getPriorityBadgeClass = (priorita: string) => {
    switch (priorita) {
      case "Urgente":
        return "badge bg-danger";
      case "Alta":
        return "badge bg-warning text-dark";
      case "Media":
        return "badge bg-info";
      case "Bassa":
        return "badge bg-secondary";
      default:
        return "badge bg-light text-dark";
    }
  };

  const getStatusBadgeClass = (stato: string) => {
    switch (stato) {
      case "Aperto":
        return "badge bg-warning text-dark";
      case "In Corso":
        return "badge bg-info";
      case "In Attesa":
        return "badge bg-primary";
      case "Completato":
        return "badge bg-success";
      case "Chiuso":
        return "badge bg-secondary";
      case "Sospeso":
        return "badge bg-danger";
      default:
        return "badge bg-light text-dark";
    }
  };

  const getCategoryBadgeClass = (categoria: string) => {
    switch (categoria) {
      case "Vendita":
        return "badge bg-success";
      case "Supporto":
        return "badge bg-info";
      case "Tecnico":
        return "badge bg-primary";
      case "Amministrativo":
        return "badge bg-secondary";
      case "Reclamo":
        return "badge bg-danger";
      case "Informazioni":
        return "badge bg-light text-dark";
      default:
        return "badge bg-light text-dark";
    }
  };

  // âœ… HELPER FUNCTIONS
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dataScadenza || ["Completato", "Chiuso"].includes(task.stato))
      return false;
    return new Date(task.dataScadenza) < new Date();
  };

  // âœ… AZIONI TASK
  const handleTaskClick = (task: Task) => {
    const taskWithInterventi = {
      ...task,
      interventI: task.interventI || [],
    };
    setSelectedTask(taskWithInterventi);
    setShowTaskDetail(true);
  };

  const handleReassignTask = (task: Task) => {
    setTaskToReassign(task);
    setShowReassignModal(true);
  };

  // âœ… SALVA NUOVO TASK
  const saveNewTask = async () => {
    if (!newTask.titolo.trim()) {
      alert("Il titolo del task Ã¨ obbligatorio");
      return;
    }

    if (!newTask.clienteNome.trim() || !newTask.clienteEmail.trim()) {
      alert("Nome e email del cliente sono obbligatori");
      return;
    }

    setIsLoading(true);

    try {
      const taskData = {
        titolo: newTask.titolo,
        descrizione: newTask.descrizione,
        priorita: newTask.priorita,
        categoria: newTask.categoria,
        idAgenteAssegnato: newTask.agenteAssegnatoId || undefined,
        dataScadenza: newTask.dataScadenza || undefined,
        valorePotenziale: newTask.valorePotenziale,
        note: newTask.note,
        cliente: {
          nome: newTask.clienteNome,
          cognome: newTask.clienteCognome,
          email: newTask.clienteEmail,
          telefono: newTask.clienteTelefono,
          citta: newTask.clienteCitta,
          provincia: newTask.clienteProvincia,
          azienda: newTask.clienteAzienda,
          tipoAttivita: newTask.clienteTipoAttivita,
        },
        tags: [],
      };

      await createTask(taskData);
      setNewTask(defaultNewTask);
      setShowNewTaskForm(false);
      alert("Task creato con successo!");

      // Ricarica i tasks
      await fetchTasks({ page: 1, pageSize: itemsPerPage });
    } catch (error) {
      console.error("ðŸš¨ Errore salvataggio task:", error);
      alert(
        `Errore nella creazione del task: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // âœ… RIASSEGNA TASK
  const confirmReassignTask = async () => {
    if (!taskToReassign || !newAssigneeId) return;

    setIsLoading(true);

    try {
      // Usa 'as any' per evitare il controllo TypeScript
      const taskAggiornato = await updateTask(taskToReassign.id, {
        idAgenteAssegnato: newAssigneeId,
      } as Partial<Task>);

      setTasks(
        tasks.map((task) =>
          task.id === taskToReassign.id ? taskAggiornato : task
        )
      );

      setShowReassignModal(false);
      setTaskToReassign(null);
      setNewAssigneeId("");
      setReassignReason("");

      if (selectedTask?.id === taskToReassign.id) {
        setSelectedTask(taskAggiornato);
      }

      alert("Task riassegnato con successo!");
    } catch (error) {
      console.error("🚨 Errore riassegnazione task:", error);
      alert(
        `Errore nella riassegnazione: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // âœ… CAMBIA STATO TASK
  const changeTaskStatus = async (
    taskId: string,
    nuovoStato: Task["stato"]
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setIsLoading(true);

    try {
      const taskAggiornato = await updateTask(taskId, { stato: nuovoStato });
      setTasks(tasks.map((t) => (t.id === taskId ? taskAggiornato : t)));

      if (selectedTask?.id === taskId) {
        setSelectedTask(taskAggiornato);
      }

      alert(`Stato del task cambiato in: ${nuovoStato}`);
    } catch (error) {
      console.error("ðŸš¨ Errore cambio stato:", error);
      alert(
        `Errore nel cambio stato: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // âœ… SALVA INTERVENTO
  const saveIntervention = async () => {
    if (!newIntervention.descrizione.trim()) {
      alert("La descrizione dell'intervento è obbligatoria");
      return;
    }

    if (!selectedTask) {
      alert("Nessun task selezionato");
      return;
    }

    setIsLoading(true);

    try {
      const interventoData = {
        operatoreId: newIntervention.operatoreId || "current-user",
        nomeOperatore: newIntervention.nomeOperatore || "Sistema",
        cognomeOperatore: newIntervention.cognomeOperatore || "Admin",
        tipoIntervento: newIntervention.tipoIntervento,
        descrizione: newIntervention.descrizione,
        durata: newIntervention.durata,
        esitoIntervento: newIntervention.esitoIntervento,
        prossimaAzione: newIntervention.prossimaAzione,
        dataProximoContatto: newIntervention.dataProximoContatto,
      };

      const nuovoIntervento = await addTaskIntervention(
        selectedTask.id,
        interventoData
      );

      const taskAggiornato = {
        ...selectedTask,
        interventI: [...(selectedTask.interventI || []), nuovoIntervento], // Controllo sicurezza
        dataUltimaModifica: new Date().toISOString(),
      };

      setTasks(
        tasks.map((task) =>
          task.id === selectedTask.id ? taskAggiornato : task
        )
      );
      setSelectedTask(taskAggiornato);

      setNewIntervention(defaultNewIntervention);
      setShowAddInterventionModal(false);

      alert("Intervento aggiunto con successo!");
    } catch (error) {
      console.error("🚨 Errore salvataggio intervento:", error);
      alert(
        `Errore nell'aggiunta intervento: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } task-management-page`}
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

          {/* âœ… ALERT PER STATO LOADING/ERRORI */}
          {(isLoadingAgenti || errorAgenti || error) && (
            <div
              className={`alert ${
                errorAgenti || error ? "alert-warning" : "alert-info"
              } mb-4`}
              role="alert"
            >
              <i
                className={`fa-solid ${
                  isLoadingAgenti || isLoading
                    ? "fa-spinner fa-spin"
                    : "fa-exclamation-triangle"
                } me-2`}
              ></i>
              {isLoadingAgenti && (
                <strong>Caricamento agenti in corso...</strong>
              )}
              {isLoading && <strong>Caricamento tasks in corso...</strong>}
              {errorAgenti && (
                <>
                  <strong>Problema con gli agenti:</strong> {errorAgenti}
                  <button
                    className="btn btn-link p-0 ms-2"
                    onClick={fetchAgenti}
                  >
                    Riprova caricamento â†’
                  </button>
                </>
              )}
              {error && !errorAgenti && (
                <>
                  <strong>Problema con i tasks:</strong> {error}
                  <button
                    className="btn btn-link p-0 ms-2"
                    onClick={() =>
                      fetchTasks({ page: 1, pageSize: itemsPerPage })
                    }
                  >
                    Riprova caricamento â†’
                  </button>
                </>
              )}
            </div>
          )}

          {/* âœ… HEADER CON BREADCRUMB */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate("/dashboard")}
                    >
                      <i className="fa-solid fa-home me-1"></i>Dashboard
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Gestione Task
                  </li>
                </ol>
              </nav>
              <h2 className="task-management-title">
                <i className="fa-solid fa-tasks me-2"></i>Gestione Task - Centro
                Assistenza
              </h2>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={() => {
                  setNewTask(defaultNewTask);
                  setShowNewTaskForm(true);
                  setTimeout(() => {
                    const formElement = document.getElementById(
                      "form-nuovo-task"
                    ) as HTMLElement;
                    const firstInput = document.getElementById(
                      "titolo-task"
                    ) as HTMLInputElement;
                    if (formElement) {
                      formElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                      formElement.classList.add("border-warning");
                      formElement.style.boxShadow =
                        "0 0 20px rgba(255, 193, 7, 0.5)";
                      formElement.style.borderWidth = "2px";
                      setTimeout(() => {
                        if (firstInput) firstInput.focus();
                      }, 500);
                      setTimeout(() => {
                        formElement.classList.remove("border-warning");
                        formElement.style.boxShadow = "";
                        formElement.style.borderWidth = "";
                      }, 3000);
                    }
                  }, 100);
                }}
                disabled={isLoadingAgenti}
                title={
                  isLoadingAgenti
                    ? "Caricamento agenti in corso..."
                    : agenti.length === 0
                    ? "âš ï¸ Nessun agente disponibile - controlla la connessione API"
                    : "Crea un nuovo task"
                }
              >
                <i
                  className={`fa-solid ${
                    isLoadingAgenti ? "fa-spinner fa-spin" : "fa-plus"
                  } me-1`}
                ></i>
                Nuovo Task
              </button>
              <button className="btn btn-outline-primary-dark">
                <i className="fa-solid fa-download me-1"></i>Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={() => {
                  fetchAgenti();
                  fetchTasks({ page: currentPage, pageSize: itemsPerPage });
                }}
                disabled={isLoadingAgenti || isLoading}
                title="Aggiorna dati"
              >
                <i
                  className={`fa-solid ${
                    isLoadingAgenti || isLoading
                      ? "fa-spinner fa-spin"
                      : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* âœ… STATISTICHE E GRAFICO */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione Task per Stato</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  <div className="row h-100">
                    <div className="col-md-8">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={140}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="#fff"
                            strokeWidth={3}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="col-md-4">
                      <div className="h-100 d-flex flex-column justify-content-center">
                        <div className="text-center mb-4">
                          <h1 className="display-4 text-primary mb-2">
                            {stats.totaleTask}
                          </h1>
                          <h5 className="text-muted">Task Totali</h5>
                        </div>
                        <div className="d-grid gap-2">
                          {chartData.map((item, index) => (
                            <div
                              key={index}
                              className="d-flex justify-content-between align-items-center p-2 border rounded"
                            >
                              <span
                                style={{ color: item.fill }}
                                className="fw-bold"
                              >
                                <i
                                  className="fa-solid fa-circle me-2"
                                  style={{ fontSize: "0.6rem" }}
                                ></i>
                                {item.name}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: item.fill,
                                  color: "white",
                                }}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="row h-100">
                <div className="col-6 mb-3">
                  <div className="card bg-warning text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.aperti}</h3>
                      <small>Aperti</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-info text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.inCorso}</h3>
                      <small>In Lavorazione</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-success text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.completati}</h3>
                      <small>Completati</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-danger text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.scaduti}</h3>
                      <small>Scaduti</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* âœ… FILTRI E RICERCA */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Filtri e Ricerca</span>
                  <i className="fa-solid fa-filter"></i>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <ul className="nav nav-pills">
                        {["tutti", "aperti", "completati", "scaduti"].map(
                          (tab) => (
                            <li key={tab} className="nav-item">
                              <button
                                className={`nav-link ${
                                  activeTab === tab ? "active" : ""
                                }`}
                                onClick={() => {
                                  setActiveTab(
                                    tab as
                                      | "tutti"
                                      | "aperti"
                                      | "completati"
                                      | "scaduti"
                                  );
                                  setCurrentPage(1);
                                  handleFilterChange();
                                }}
                              >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)} (
                                {tab === "tutti"
                                  ? stats.totaleTask
                                  : tab === "aperti"
                                  ? stats.aperti
                                  : tab === "completati"
                                  ? stats.completati
                                  : stats.scaduti}
                                )
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cerca per numero task, titolo, cliente..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);

                          // Cancella il timeout precedente se esiste
                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }

                          // Imposta nuovo timeout per il debounce
                          searchTimeoutRef.current = setTimeout(
                            handleFilterChange,
                            500
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedPriority}
                        onChange={(e) => {
                          setSelectedPriority(e.target.value);
                          setCurrentPage(1);
                          handleFilterChange();
                        }}
                      >
                        <option value="tutte">Tutte le priorità</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Bassa">Bassa</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedAgent}
                        onChange={(e) => {
                          setSelectedAgent(e.target.value);
                          setCurrentPage(1);
                          handleFilterChange();
                        }}
                        disabled={isLoadingAgenti}
                      >
                        <option value="tutti">
                          {isLoadingAgenti
                            ? "Caricamento..."
                            : "Tutti gli agenti"}
                        </option>
                        {agenti.map((agente) => (
                          <option key={agente.id} value={agente.id}>
                            {agente.nome} {agente.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setCurrentPage(1);
                          handleFilterChange();
                        }}
                      >
                        <option value="tutte">Tutte le categorie</option>
                        <option value="Vendita">Vendita</option>
                        <option value="Supporto">Supporto</option>
                        <option value="Tecnico">Tecnico</option>
                        <option value="Amministrativo">Amministrativo</option>
                        <option value="Reclamo">Reclamo</option>
                        <option value="Informazioni">Informazioni</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                          handleFilterChange();
                        }}
                      >
                        <option value="tutti">Tutti gli stati</option>
                        <option value="Aperto">Aperto</option>
                        <option value="In Corso">In Corso</option>
                        <option value="In Attesa">In Attesa</option>
                        <option value="Completato">Completato</option>
                        <option value="Chiuso">Chiuso</option>
                        <option value="Sospeso">Sospeso</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* âœ… LISTA TASK */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>
                    Task ({totalCount} risultati - Pagina {currentPage} di{" "}
                    {serverTotalPages})
                  </span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-list"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {isLoading && (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-spinner fa-spin fa-3x text-primary mb-3"></i>
                      <h5 className="text-muted">Caricamento tasks...</h5>
                    </div>
                  )}

                  {!isLoading && tasks.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Cliente</th>
                              <th>PrioritÃ </th>
                              <th>Stato</th>
                              <th>Categoria</th>
                              <th>Assegnato a</th>
                              <th>Scadenza</th>
                              <th>Valore</th>
                              <th>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task) => (
                              <tr
                                key={task.id}
                                className={
                                  isTaskOverdue(task) ? "table-danger" : ""
                                }
                              >
                                <td>
                                  <div>
                                    <div className="fw-bold text-primary">
                                      {task.numeroTask}
                                    </div>
                                    <div
                                      className="small text-truncate"
                                      style={{ maxWidth: "200px" }}
                                    >
                                      {task.titolo}
                                    </div>
                                    <div className="small text-muted">
                                      {formatDate(task.dataCreazione)}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div className="fw-bold">
                                      {task.cliente.nome} {task.cliente.cognome}
                                    </div>
                                    <div className="small text-muted">
                                      {task.cliente.email}
                                    </div>
                                    <div className="small text-muted">
                                      {task.cliente.telefono}
                                    </div>
                                    {task.cliente.azienda && (
                                      <div className="small text-primary">
                                        {task.cliente.azienda}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={getPriorityBadgeClass(
                                      task.priorita
                                    )}
                                  >
                                    {task.priorita}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={getStatusBadgeClass(task.stato)}
                                  >
                                    {task.stato}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={getCategoryBadgeClass(
                                      task.categoria
                                    )}
                                  >
                                    {task.categoria}
                                  </span>
                                </td>
                                <td>
                                  {task.agenteAssegnato ? (
                                    <div>
                                      <div className="fw-bold">
                                        {task.agenteAssegnato.nome}{" "}
                                        {task.agenteAssegnato.cognome}
                                      </div>
                                      <div className="small text-muted">
                                        {task.agenteAssegnato.reparto}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted">
                                      Non assegnato
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {task.dataScadenza ? (
                                    <div
                                      className={
                                        isTaskOverdue(task)
                                          ? "text-danger fw-bold"
                                          : ""
                                      }
                                    >
                                      {formatDate(task.dataScadenza)}
                                      {isTaskOverdue(task) && (
                                        <div className="small">
                                          <i className="fa-solid fa-exclamation-triangle me-1"></i>
                                          SCADUTO
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">Nessuna</span>
                                  )}
                                </td>
                                <td>
                                  {task.valorePotenziale ? (
                                    <span className="fw-bold text-success">                                      
                                      {task.valorePotenziale.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => handleTaskClick(task)}
                                      title="Visualizza dettagli"
                                    >
                                      <i className="fa-solid fa-eye"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-secondary btn-sm"
                                      onClick={() => handleReassignTask(task)}
                                      title="Riassegna task"
                                    >
                                      <i className="fa-solid fa-user-check"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-info btn-sm"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowAddInterventionModal(true);
                                        setNewIntervention({
                                          ...defaultNewIntervention,
                                          operatoreId: "current-user",
                                          nomeOperatore: "Sistema",
                                          cognomeOperatore: "Admin",
                                        });
                                      }}
                                      title="Aggiungi intervento"
                                    >
                                      <i className="fa-solid fa-plus"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* âœ… PAGINAZIONE SERVER */}
                      {serverTotalPages > 1 && (
                        <nav className="mt-3">
                          <ul className="pagination justify-content-center">
                            <li
                              className={`page-item ${
                                currentPage === 1 ? "disabled" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(Math.max(1, currentPage - 1))
                                }
                                disabled={currentPage === 1}
                              >
                                <i className="fa-solid fa-chevron-left"></i>
                              </button>
                            </li>
                            {Array.from(
                              { length: Math.min(5, serverTotalPages) },
                              (_, i) => {
                                const pageNum =
                                  Math.max(
                                    1,
                                    Math.min(
                                      serverTotalPages - 4,
                                      currentPage - 2
                                    )
                                  ) + i;
                                return (
                                  <li
                                    key={pageNum}
                                    className={`page-item ${
                                      currentPage === pageNum ? "active" : ""
                                    }`}
                                  >
                                    <button
                                      className="page-link"
                                      onClick={() => handlePageChange(pageNum)}
                                    >
                                      {pageNum}
                                    </button>
                                  </li>
                                );
                              }
                            )}
                            <li
                              className={`page-item ${
                                currentPage === serverTotalPages
                                  ? "disabled"
                                  : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(
                                    Math.min(serverTotalPages, currentPage + 1)
                                  )
                                }
                                disabled={currentPage === serverTotalPages}
                              >
                                <i className="fa-solid fa-chevron-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </>
                  ) : !isLoading ? (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-search fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessun task trovato</h5>
                      <p className="text-muted">
                        Nessun task corrisponde ai filtri selezionati.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* âœ… FORM NUOVO TASK */}
          {showNewTaskForm && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card" id="form-nuovo-task">
                  <div className="custom-card-header">
                    <span>Nuovo Task</span>
                    <i className="fa-solid fa-plus"></i>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Titolo *</label>
                        <input
                          id="titolo-task"
                          type="text"
                          className="form-control"
                          value={newTask.titolo}
                          onChange={(e) =>
                            setNewTask({ ...newTask, titolo: e.target.value })
                          }
                          placeholder="Inserisci il titolo del task..."
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">PrioritÃ </label>
                        <select
                          className="form-select"
                          value={newTask.priorita}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              priorita: e.target.value as "Bassa" | "Media" | "Alta" | "Urgente",
                            })
                          }
                        >
                          <option value="Bassa">Bassa</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Categoria</label>
                        <select
                          className="form-select"
                          value={newTask.categoria}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              categoria: e.target.value as
                                | "Vendita"
                                | "Supporto"
                                | "Tecnico"
                                | "Amministrativo"
                                | "Reclamo"
                                | "Informazioni",
                            })
                          }
                        >
                          <option value="Vendita">Vendita</option>
                          <option value="Supporto">Supporto</option>
                          <option value="Tecnico">Tecnico</option>
                          <option value="Amministrativo">Amministrativo</option>
                          <option value="Reclamo">Reclamo</option>
                          <option value="Informazioni">Informazioni</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descrizione</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={newTask.descrizione}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              descrizione: e.target.value,
                            })
                          }
                        ></textarea>
                      </div>

                      <div className="col-12">
                        <hr />
                      </div>
                      <div className="col-12">
                        <h6>Dati Cliente</h6>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Nome *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteNome}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteNome: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Cognome</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteCognome}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteCognome: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newTask.clienteEmail}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteEmail: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Telefono</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={newTask.clienteTelefono}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteTelefono: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Azienda</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteAzienda}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteAzienda: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tipo AttivitÃ </label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteTipoAttivita}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              clienteTipoAttivita: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="col-12">
                        <hr />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Assegna a</label>
                        <select
                          className="form-select"
                          value={newTask.agenteAssegnatoId}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              agenteAssegnatoId: e.target.value,
                            })
                          }
                          disabled={isLoadingAgenti}
                        >
                          <option value="">
                            {isLoadingAgenti
                              ? "Caricamento agenti..."
                              : agenti.length === 0
                              ? "âš ï¸ Nessun agente disponibile"
                              : "Non assegnato"}
                          </option>
                          {agenti.map((agente) => (
                            <option key={agente.id} value={agente.id}>
                              {agente.nome} {agente.cognome} (
                              {agente.codiceAgente})
                              {agente.email && ` - ${agente.email}`}
                            </option>
                          ))}
                        </select>
                        {isLoadingAgenti && (
                          <small className="text-info">
                            <i className="fa-solid fa-spinner fa-spin me-1"></i>
                            Caricamento agenti in corso...
                          </small>
                        )}
                        {errorAgenti && (
                          <small className="text-warning">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {errorAgenti}
                          </small>
                        )}
                        {agenti.length === 0 &&
                          !isLoadingAgenti &&
                          !errorAgenti && (
                            <small className="text-warning">
                              <i className="fa-solid fa-exclamation-triangle me-1"></i>
                              Nessun agente attivo nel sistema.
                              <button
                                className="btn btn-link p-0 text-warning"
                                onClick={() => navigate("/agenti")}
                              >
                                Vai alla gestione agenti â†’
                              </button>
                            </small>
                          )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Data Scadenza</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={newTask.dataScadenza}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              dataScadenza: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Valore Potenziale
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={newTask.valorePotenziale || ""}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              valorePotenziale: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Note</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={newTask.note}
                          onChange={(e) =>
                            setNewTask({ ...newTask, note: e.target.value })
                          }
                        ></textarea>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={saveNewTask}
                        disabled={isLoading}
                      >
                        <i
                          className={`fa-solid ${
                            isLoading ? "fa-spinner fa-spin" : "fa-save"
                          } me-1`}
                        ></i>
                        {isLoading ? "Salvando..." : "Salva Task"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowNewTaskForm(false);
                          setNewTask(defaultNewTask);
                        }}
                      >
                        <i className="fa-solid fa-times me-1"></i>Annulla
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* âœ… DETTAGLIO TASK MODAL */}
          {showTaskDetail && selectedTask && (
            <div
              className="modal show d-block"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-tasks me-2"></i>
                      {selectedTask.numeroTask} - {selectedTask.titolo}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowTaskDetail(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Informazioni Task</h6>
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Stato:</strong>
                              </td>
                              <td>
                                <span
                                  className={getStatusBadgeClass(
                                    selectedTask.stato
                                  )}
                                >
                                  {selectedTask.stato}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>PrioritÃ :</strong>
                              </td>
                              <td>
                                <span
                                  className={getPriorityBadgeClass(
                                    selectedTask.priorita
                                  )}
                                >
                                  {selectedTask.priorita}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Categoria:</strong>
                              </td>
                              <td>
                                <span
                                  className={getCategoryBadgeClass(
                                    selectedTask.categoria
                                  )}
                                >
                                  {selectedTask.categoria}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Origine:</strong>
                              </td>
                              <td>{selectedTask.origine}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Creato:</strong>
                              </td>
                              <td>{formatDate(selectedTask.dataCreazione)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Scadenza:</strong>
                              </td>
                              <td>
                                {selectedTask.dataScadenza
                                  ? formatDate(selectedTask.dataScadenza)
                                  : "Nessuna"}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Valore:</strong>
                              </td>
                              <td>
                                {selectedTask.valorePotenziale
                                  ? `${selectedTask.valorePotenziale.toLocaleString()}`
                                  : "-"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-md-6">
                        <h6>Dati Cliente</h6>
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Nome:</strong>
                              </td>
                              <td>
                                {selectedTask.cliente.nome}{" "}
                                {selectedTask.cliente.cognome}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Email:</strong>
                              </td>
                              <td>
                                <a
                                  href={`mailto:${selectedTask.cliente.email}`}
                                >
                                  {selectedTask.cliente.email}
                                </a>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Telefono:</strong>
                              </td>
                              <td>
                                {selectedTask.cliente.telefono ? (
                                  <a
                                    href={`tel:${selectedTask.cliente.telefono}`}
                                  >
                                    {selectedTask.cliente.telefono}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Azienda:</strong>
                              </td>
                              <td>{selectedTask.cliente.azienda || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>AttivitÃ :</strong>
                              </td>
                              <td>
                                {selectedTask.cliente.tipoAttivita || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>CittÃ :</strong>
                              </td>
                              <td>
                                {selectedTask.cliente.citta} (
                                {selectedTask.cliente.provincia})
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Assegnato a:</strong>
                              </td>
                              <td>
                                {selectedTask.agenteAssegnato
                                  ? `${selectedTask.agenteAssegnato.nome} ${selectedTask.agenteAssegnato.cognome}`
                                  : "Non assegnato"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="row mt-3">
                      <div className="col-12">
                        <h6>Descrizione</h6>
                        <p>{selectedTask.descrizione}</p>
                        {selectedTask.note && (
                          <>
                            <h6>Note</h6>
                            <p>{selectedTask.note}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="row mt-3">
                      <div className="col-12">
                        <h6>
                          Cronologia Interventi (
                          {selectedTask.interventI?.length || 0})
                        </h6>
                        {selectedTask.interventI &&
                        selectedTask.interventI.length > 0 ? (
                          <div className="timeline">
                            {selectedTask.interventI.map((intervento) => (
                              <div
                                key={intervento.id}
                                className="timeline-item mb-3"
                              >
                                <div className="card">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <strong>
                                          {intervento.nomeOperatore}{" "}
                                          {intervento.cognomeOperatore}
                                        </strong>
                                        <span className="badge bg-info ms-2">
                                          {intervento.tipoIntervento}
                                        </span>
                                        {intervento.esitoIntervento && (
                                          <span
                                            className={`badge ms-1 ${
                                              intervento.esitoIntervento ===
                                              "Positivo"
                                                ? "bg-success"
                                                : intervento.esitoIntervento ===
                                                  "Negativo"
                                                ? "bg-danger"
                                                : intervento.esitoIntervento ===
                                                  "Da Ricontattare"
                                                ? "bg-warning"
                                                : "bg-secondary"
                                            }`}
                                          >
                                            {intervento.esitoIntervento}
                                          </span>
                                        )}
                                      </div>
                                      <small className="text-muted">
                                        {formatDate(intervento.dataIntervento)}
                                      </small>
                                    </div>
                                    <p className="mt-2 mb-1">
                                      {intervento.descrizione}
                                    </p>
                                    {intervento.durata && (
                                      <small className="text-muted">
                                        Durata: {intervento.durata} minuti
                                      </small>
                                    )}
                                    {intervento.prossimaAzione && (
                                      <div className="mt-2">
                                        <strong>Prossima azione:</strong>{" "}
                                        {intervento.prossimaAzione}
                                        {intervento.dataProximoContatto && (
                                          <span className="text-primary">
                                            {" "}
                                            -{" "}
                                            {formatDate(
                                              intervento.dataProximoContatto
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted">
                            Nessun intervento registrato.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        setShowAddInterventionModal(true);
                        setNewIntervention({
                          ...defaultNewIntervention,
                          operatoreId: "current-user",
                          nomeOperatore: "Sistema",
                          cognomeOperatore: "Admin",
                        });
                      }}
                      title="Aggiungi intervento"
                    >
                      <i className="fa-solid fa-plus me-1"></i>Aggiungi
                      Intervento
                    </button>
                    <button
                      className="btn btn-warning me-2"
                      onClick={() =>
                        changeTaskStatus(selectedTask.id, "In Corso")
                      }
                      disabled={selectedTask.stato === "In Corso" || isLoading}
                    >
                      <i className="fa-solid fa-play me-1"></i>Prendi in Carico
                    </button>
                    <button
                      className="btn btn-info"
                      onClick={() => {
                        setShowTaskDetail(false);
                        handleReassignTask(selectedTask);
                      }}
                    >
                      <i className="fa-solid fa-user-check me-1"></i>Riassegna
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowTaskDetail(false)}
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* âœ… MODAL RIASSEGNAZIONE TASK */}
          {showReassignModal && taskToReassign && (
            <div
              className="modal show d-block"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-user-check me-2"></i>Riassegna
                      Task
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowReassignModal(false);
                        setTaskToReassign(null);
                        setNewAssigneeId("");
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p>
                      <strong>Task:</strong> {taskToReassign.numeroTask} -{" "}
                      {taskToReassign.titolo}
                    </p>
                    <p>
                      <strong>Attualmente assegnato a:</strong>{" "}
                      {taskToReassign.agenteAssegnato
                        ? `${taskToReassign.agenteAssegnato.nome} ${taskToReassign.agenteAssegnato.cognome}`
                        : "Non assegnato"}
                    </p>

                    <div className="mb-3">
                      <label className="form-label">Nuovo assegnatario</label>
                      <select
                        className="form-select"
                        value={newAssigneeId}
                        onChange={(e) => setNewAssigneeId(e.target.value)}
                      >
                        <option value="">Non assegnato</option>
                        {agenti
                          .filter(
                            (a) => a.id !== taskToReassign.agenteAssegnato?.id
                          )
                          .map((agente) => (
                            <option key={agente.id} value={agente.id}>
                              {agente.nome} {agente.cognome} (
                              {agente.codiceAgente})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Motivo riassegnazione
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                        placeholder="Descrivi il motivo della riassegnazione..."
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-primary"
                      onClick={confirmReassignTask}
                      disabled={!newAssigneeId || isLoading}
                    >
                      <i
                        className={`fa-solid ${
                          isLoading ? "fa-spinner fa-spin" : "fa-check"
                        } me-1`}
                      ></i>
                      Conferma Riassegnazione
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowReassignModal(false);
                        setTaskToReassign(null);
                        setNewAssigneeId("");
                        setReassignReason("");
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* âœ… MODAL AGGIUNGI INTERVENTO */}
          {showAddInterventionModal && (
            <div
              className="modal show d-block"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-plus me-2"></i>Aggiungi
                      Intervento
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowAddInterventionModal(false);
                        setNewIntervention(defaultNewIntervention);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Tipo Intervento</label>
                        <select
                          className="form-select"
                          value={newIntervention.tipoIntervento}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              tipoIntervento: e.target.value as
                                | "Chiamata"
                                | "Email"
                                | "Note"
                                | "Assegnazione"
                                | "Cambio Stato"
                                | "Altro",
                            })
                          }
                        >
                          <option value="Chiamata">Chiamata</option>
                          <option value="Email">Email</option>
                          <option value="Note">Note</option>
                          <option value="Assegnazione">Assegnazione</option>
                          <option value="Cambio Stato">Cambio Stato</option>
                          <option value="Altro">Altro</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Esito</label>
                        <select
                          className="form-select"
                          value={newIntervention.esitoIntervento || ""}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              esitoIntervento:
                                (e.target.value as
                                  | "Positivo"
                                  | "Negativo"
                                  | "Neutrale"
                                  | "Da Ricontattare"
                                  | "") || undefined,
                            })
                          }
                        >
                          <option value="">Seleziona esito</option>
                          <option value="Positivo">Positivo</option>
                          <option value="Negativo">Negativo</option>
                          <option value="Neutrale">Neutrale</option>
                          <option value="Da Ricontattare">
                            Da Ricontattare
                          </option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Durata (minuti)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newIntervention.durata || ""}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              durata: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Data Prossimo Contatto
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={newIntervention.dataProximoContatto || ""}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              dataProximoContatto: e.target.value || undefined,
                            })
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">
                          Descrizione Intervento *
                        </label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={newIntervention.descrizione}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              descrizione: e.target.value,
                            })
                          }
                          placeholder="Descrivi cosa Ã¨ stato fatto durante l'intervento..."
                        ></textarea>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Prossima Azione</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newIntervention.prossimaAzione || ""}
                          onChange={(e) =>
                            setNewIntervention({
                              ...newIntervention,
                              prossimaAzione: e.target.value || undefined,
                            })
                          }
                          placeholder="Cosa va fatto successivamente..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-success"
                      onClick={saveIntervention}
                      disabled={
                        !newIntervention.descrizione.trim() || isLoading
                      }
                    >
                      <i
                        className={`fa-solid ${
                          isLoading ? "fa-spinner fa-spin" : "fa-save"
                        } me-1`}
                      ></i>
                      Salva Intervento
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddInterventionModal(false);
                        setNewIntervention(defaultNewIntervention);
                      }}
                    >
                      Annulla
                    </button>
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

export default TaskManagement;
