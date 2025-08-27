import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./tasks-custom.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// INTERFACCE PER TASK MANAGEMENT
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
  esitoChiusura?: "Positivo" | "Negativo" | null;
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
  productProposals?: TaskProductProposalDto[];
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

// INTERFACCE API BACKEND
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

interface NewInterventionForm extends Omit<TaskIntervento, "id" | "taskId"> {
  nuovoStato?: Task["stato"];
  esitoChiusuraFinale?: "Positivo" | "Negativo";
}

interface Prodotto {
  id: number;
  nome: string;
  prezzo?: number | null;
}

// Proposta di prodotto associata al Task
interface TaskProductProposalDto {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
  insertDateUtc?: string;
  isActive: boolean;
  isDeleted: boolean;
}

const ATTIVITA_OPTIONS = [
  "Agenzia assicurativa",
  "Agenzia pratiche auto",
  "Agenzia di Viaggio",
  "Alimentari e prodotti casa",
  "Amministratore di condominio",
  "Bar",
  "CAF e associazioni",
  "Cartolibreria",
  "Centro scommesse",
  "Edicola",
  "Elettronica, Telefonia e Informatica",
  "Energia e Carburanti",
  "Farmacia",
  "Money Transfer",
  "Poste private",
  "Tabacchi",
  "Varie",
];

const GESTORI_OPTIONS = [
  "Lis",
  "Drop point",
  "Mooney",
  "Buffetti Finance",
  "Moneynet",
  "Snaipay",
  "Euronet",
  "MBSpay",
  "MrPay",
  "aLTRO",
];

const CONCESSIONARI_OPTIONS = [
  "Eurobet",
  "Bet365",
  "Sisal",
  "Lottomatica",
  "Snaitech",
  "PlanetWin365",
  "GoldBet",
  "Stanleybet",
  "Admiral",
  "Altro",
];

const TaskManagement: React.FC = () => {
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const [_allTasks, setAllTasks] = useState<Task[]>([]);

  // CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // STATI PRINCIPALI
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // STATI AGENTI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [isLoadingAgenti, setIsLoadingAgenti] = useState<boolean>(false);
  const [errorAgenti, setErrorAgenti] = useState<string>("");

  // STATI PAGINAZIONE SERVER
  const [totalCount, setTotalCount] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(0);

  // STATI FILTRI E VISUALIZZAZIONE
  const [activeTab, setActiveTab] = useState<
    "aperti" | "tutti" | "completati" | "scaduti"
  >("aperti");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("tutte");
  const [selectedAgent, setSelectedAgent] = useState<string>("tutti");
  const [selectedCategory, setSelectedCategory] = useState<string>("tutte");
  const [selectedStatus, setSelectedStatus] = useState<string>("tutti");

  // STATI FORM E MODALI
  const [showNewTaskForm, setShowNewTaskForm] = useState<boolean>(false);
  const [showTaskDetail, setShowTaskDetail] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [showAddInterventionModal, setShowAddInterventionModal] =
    useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // STATI PER RIASSEGNAZIONE
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");

  // HELPER PER GESTIRE DATETIME SENZA TIME
  const toLocalDateTimeInput = (isoString: string) => {
    const d = new Date(isoString);
    // correzione locale per il campo datetime-local (senza secondi)
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // HELPER Task chiuso?
  const isTaskClosed = (t?: Task | null) =>
    (t?.stato || "").toLowerCase() === "chiuso";

  // STATI PER NUOVO INTERVENTO
  const defaultNewIntervention: NewInterventionForm = {
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
    nuovoStato: undefined,
    esitoChiusuraFinale: undefined,
  };

  // GESTIONE RUOLO UTENTE
  const userRole = (localStorage.getItem("userLevel") || "")
    .trim()
    .toLowerCase();
  const isAdmin = userRole === "admin";

  const [newIntervention, setNewIntervention] = useState<NewInterventionForm>(
    defaultNewIntervention
  );

  // PAGINAZIONE
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // FORM NUOVO TASK
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

  // --- Stati per i prodotti e la scelta nell’intervento
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [isLoadingProdotti, setIsLoadingProdotti] = useState<boolean>(false);
  const [errorProdotti, setErrorProdotti] = useState<string>("");

  const [selectedProdottoId, setSelectedProdottoId] = useState<number | "">("");
  const [valorePotenzialeProdotto, setValorePotenzialeProdotto] = useState<
    number | ""
  >("");

  // HELPER PER CALCOLARE IL TOTALE DELLE PROPOSTE
  const getProposalsTotal = (task?: Task | null) => {
    if (!task?.productProposals?.length) return 0;
    return task.productProposals
      .filter((p) => !p.isDeleted)
      .reduce((sum, p) => sum + (p.unitPrice ?? 0) * (p.quantity ?? 1), 0);
  };

  // HELPER PER TOKEN AUTH
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

  // --- helper per resettare il form intervento
  const resetInterventionForm = () => {
    setNewIntervention(defaultNewIntervention);
    setSelectedProdottoId("");
    setValorePotenzialeProdotto("");
    setHasOtherProvider(null);
    setOtherProviderName("");
    setPvrInterest(null);
    setPvrConcessionario("");
  };

  // DATI PROVIDER
  const [hasOtherProvider, setHasOtherProvider] = useState<null | boolean>(
    null
  );
  const [otherProviderName, setOtherProviderName] = useState<string>("");

  const [pvrInterest, setPvrInterest] = useState<null | boolean>(null);
  const [pvrConcessionario, setPvrConcessionario] = useState<string>("");

  // DATI FAKE PER FALLBACK
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
      interventI: [],
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
      interventI: [],
      tags: ["supporto", "hardware", "lettore"],
    },
  ];

  // FUNZIONE PER OTTENERE GLI STATI VALIDI
  const getValidStates = (currentState: Task["stato"]): Task["stato"][] => {
    switch (currentState) {
      case "Aperto":
        return ["In Corso", "In Attesa", "Sospeso", "Chiuso"];
      case "In Corso":
        return ["In Attesa", "Completato", "Sospeso", "Chiuso"];
      case "In Attesa":
        return ["In Corso", "Completato", "Sospeso", "Chiuso"];
      case "Completato":
        return ["Chiuso"];
      case "Sospeso":
        return ["Aperto", "In Corso", "Chiuso"];
      case "Chiuso":
        return [];
      default:
        return ["Chiuso"]; // fallback prudente
    }
  };

  // FUNZIONI OTTIMIZZATE PER PERFORMANCE
  const handleNewTaskFieldChange = useCallback(
    (field: keyof NuovoTaskForm) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const value =
          e.target.type === "number"
            ? e.target.value
              ? parseFloat(e.target.value)
              : undefined
            : e.target.value;

        setNewTask((prev) => ({ ...prev, [field]: value }));
      },
    []
  );

  const handleNewInterventionFieldChange = useCallback(
    (field: keyof NewInterventionForm) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const value =
          e.target.type === "number"
            ? e.target.value
              ? parseInt(e.target.value)
              : undefined
            : e.target.value || undefined;

        setNewIntervention((prev) => ({
          ...prev,
          [field]: value,
          ...(field === "nuovoStato" && value
            ? { tipoIntervento: "Cambio Stato" }
            : {}),
        }));
      },
    []
  );

  // FUNZIONE PER CARICARE TUTTI I TASK
  const fetchAllTasks = async () => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks?pageSize=1000`;
      console.log("🔍 Caricamento tutti i task per statistiche:", url);

      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        throw new Error(
          `Errore nel caricamento tutti i tasks: ${response.status}`
        );
      }

      const data: ApiResponseDto<PaginatedResponse<Task>> =
        await response.json();

      if (data.success && data.data && data.data.items) {
        console.log(
          "🔍 DEBUG fetchAllTasks - Dati ricevuti:",
          data.data.items.length
        );
        console.log("🔍 DEBUG fetchAllTasks - Primo task:", data.data.items[0]);
        console.log(
          "🔍 DEBUG fetchAllTasks - Primo task interventI:",
          data.data.items[0]?.interventI
        );
        console.log(
          "🔍 DEBUG fetchAllTasks - Primo task interventi:",
          (data.data.items[0] as any)?.interventi
        );

        const tasksWithInterventi = data.data.items.map((task) => ({
          ...task,
          interventI:
            task.interventI ||
            (task as any).interventi ||
            (task as any).Interventi ||
            [],
        }));

        setAllTasks(tasksWithInterventi);
        console.log(
          "📊 Tutti i task caricati per statistiche:",
          tasksWithInterventi.length
        );
      }
    } catch (error) {
      console.error("🚨 Errore caricamento tutti i task:", error);
      const tasksFakeLocal = generateTasksFake();
      setAllTasks(tasksFakeLocal);
    }
  };

  // FUNZIONE API PER RECUPERARE AGENTI
  const fetchAgenti = async () => {
    setIsLoadingAgenti(true);
    setErrorAgenti("");
    console.log("🔡 Iniziando caricamento agenti...");

    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Agenti?pageSize=1000`;
      console.log("🔗 URL chiamata agenti:", url);

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
      console.log("📝 Dati ricevuti agenti:", data);

      if (data.success && data.data && data.data.items) {
        console.log("✅ Agenti caricati:", data.data.items.length);
        const agentiAttivi = data.data.items.filter((agente) => agente.attivo);
        setAgenti(agentiAttivi);
      } else {
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento agenti:", error);

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

  // FUNZIONE API PER RECUPERARE TASKS
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
    console.log("🔡 Iniziando caricamento tasks...");

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
      console.log("🔗 URL chiamata tasks:", url);

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
      console.log("📝 Dati ricevuti tasks:", data);

      if (data.success && data.data && data.data.items) {
        console.log("✅ Tasks caricati:", data.data.items.length);
        console.log(
          "🔍 DEBUG fetchTasks - Primo task dal server:",
          data.data.items[0]
        );
        console.log(
          "🔍 DEBUG fetchTasks - Primo task interventI:",
          data.data.items[0]?.interventI
        );
        console.log(
          "🔍 DEBUG fetchTasks - Primo task interventi:",
          (data.data.items[0] as any)?.interventi
        );
        console.log(
          "🔍 DEBUG fetchTasks - Primo task Interventi:",
          (data.data.items[0] as any)?.Interventi
        );

        const tasksWithInterventi = data.data.items.map((task) => {
          console.log(
            `🔍 DEBUG task ${task.id} - interventI originali:`,
            task.interventI
          );
          console.log(
            `🔍 DEBUG task ${task.id} - interventi:`,
            (task as any).interventi
          );
          console.log(
            `🔍 DEBUG task ${task.id} - Interventi:`,
            (task as any).Interventi
          );

          return {
            ...task,
            interventI:
              task.interventI ||
              (task as any).interventi ||
              (task as any).Interventi ||
              [],
          };
        });

        console.log(
          "🔍 DEBUG fetchTasks - Tasks dopo mappatura:",
          tasksWithInterventi
        );
        console.log(
          "🔍 DEBUG fetchTasks - Primo task dopo mappatura interventi:",
          tasksWithInterventi[0]?.interventI?.length || 0
        );

        setTasks(tasksWithInterventi);
        setTotalCount(data.data.totalCount);
        setServerTotalPages(data.data.totalPages);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nel recupero tasks");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento tasks:", error);

      console.warn("⚠️ Usando dati fake per tasks...");
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

  // FUNZIONE API PER CREARE NUOVO TASK
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
        console.log("✅ Task creato:", data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nella creazione task");
      }
    } catch (error) {
      console.error("🚨 Errore creazione task:", error);
      throw error;
    }
  };

  // FUNZIONE API PER AGGIORNARE TASK
  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const headers = getAuthHeaders();
      // se mancano campi chiave, carico il task esistente e completo il dto
      const needFetch =
        !taskData.titolo ||
        !taskData.descrizione ||
        !taskData.stato ||
        !taskData.priorita ||
        !taskData.categoria;

      let dto = { ...taskData, id: taskId } as any;

      if (needFetch) {
        const current = await fetchSingleTask(taskId); // tua funzione già presente
        if (!current) throw new Error("Task non trovato per l'update");

        dto = {
          id: taskId,
          titolo: taskData.titolo ?? current.titolo,
          descrizione: taskData.descrizione ?? current.descrizione,
          stato: (taskData as any).stato ?? current.stato,
          priorita: (taskData as any).priorita ?? current.priorita,
          categoria: (taskData as any).categoria ?? current.categoria,
          idAgenteAssegnato:
            (taskData as any).idAgenteAssegnato ?? current.agenteAssegnato?.id,
          dataScadenza: (taskData as any).dataScadenza ?? current.dataScadenza,
          valorePotenziale:
            (taskData as any).valorePotenziale ?? current.valorePotenziale,
          note: (taskData as any).note ?? current.note,
          cliente: (taskData as any).cliente ?? {
            id: current.cliente?.id,
            nome: current.cliente?.nome,
            cognome: current.cliente?.cognome,
            email: current.cliente?.email,
            telefono: current.cliente?.telefono,
            citta: current.cliente?.citta,
            provincia: current.cliente?.provincia,
            azienda: current.cliente?.azienda,
            tipoAttivita: current.cliente?.tipoAttivita,
          },
          tags: (taskData as any).tags ?? current.tags ?? [],
        };
      }

      const url = `${API_URL}/api/Tasks/${taskId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Errore nell'aggiornamento task: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<Task> = await response.json();
      if (data.success && data.data) {
        console.log("✅ Task aggiornato:", data.data);
        return data.data;
      }
      throw new Error(data.message || "Errore nell'aggiornamento task");
    } catch (error) {
      console.error("🚨 Errore aggiornamento task:", error);
      throw error;
    }
  };

  // FUNZIONE API PER AGGIUNGERE INTERVENTO
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
        console.log("✅ Intervento aggiunto:", data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Errore nell'aggiunta intervento");
      }
    } catch (error) {
      console.error("🚨 Errore aggiunta intervento:", error);
      throw error;
    }
  };

  // FUNZIONE PER RICARICARE UN SINGOLO TASK
  const fetchSingleTask = async (taskId: string): Promise<Task | null> => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks/${taskId}`;
      console.log("🔄 DEBUG fetchSingleTask - URL:", url);

      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok)
        throw new Error(`Errore nel caricamento task: ${response.status}`);

      const payload: ApiResponseDto<any> = await response.json();
      console.log("🔄 DEBUG fetchSingleTask - Dati ricevuti:", payload);

      if (!payload.success || !payload.data) return null;

      const srv = payload.data as any;

      // 1) Normalizza interventi (qualsiasi casing) e ordina DESC per DataIntervento
      const interventionsRaw =
        srv.interventI ?? srv.interventi ?? srv.Interventi ?? [];
      const interventI = Array.isArray(interventionsRaw)
        ? [...interventionsRaw].sort((a, b) => {
            const da = new Date(
              a.dataIntervento ?? a.DataIntervento ?? 0
            ).getTime();
            const db = new Date(
              b.dataIntervento ?? b.DataIntervento ?? 0
            ).getTime();
            return db - da;
          })
        : [];

      // 2) Proposte prodotto: dal DTO se presenti (qualsiasi casing)
      let productProposals: TaskProductProposalDto[] = Array.isArray(
        srv.productProposals ?? srv.ProductProposals
      )
        ? srv.productProposals ?? srv.ProductProposals
        : [];

      // Filtra cancellate e ordina per InsertDate desc (se disponibile)
      const sortByInsertDesc = (list: any[]) =>
        [...list]
          .filter((p) => !p.isDeleted)
          .sort((a, b) => {
            const da = new Date(
              a.insertDateUtc ?? a.InsertDateUtc ?? 0
            ).getTime();
            const db = new Date(
              b.insertDateUtc ?? b.InsertDateUtc ?? 0
            ).getTime();
            return db - da;
          });

      productProposals = sortByInsertDesc(
        productProposals
      ) as TaskProductProposalDto[];

      // 2.b) Fallback: se il DTO non le contiene, prova a leggerle dall’endpoint dedicato
      if ((!productProposals || productProposals.length === 0) && taskId) {
        try {
          const urlProps = `${API_URL}/api/Tasks/${taskId}/proposals`;
          console.log(
            "🧩 DEBUG fetchSingleTask - Fallback proposte:",
            urlProps
          );
          const resProps = await fetch(urlProps, { method: "GET", headers });
          if (resProps.ok) {
            const jsonProps = await resProps.json(); // { success, data }
            const list = Array.isArray(jsonProps?.data) ? jsonProps.data : [];
            productProposals = sortByInsertDesc(
              list
            ) as TaskProductProposalDto[];
          } else {
            console.warn(
              "⚠️ DEBUG fetchSingleTask - Fallback proposte non ok:",
              resProps.status
            );
          }
        } catch (e) {
          console.warn(
            "⚠️ DEBUG fetchSingleTask - Errore fallback proposte:",
            e
          );
        }
      }

      // 3) Costruisci il task normalizzato verso il FE
      const taskWithInterventi: Task = {
        ...srv,
        interventI,
        productProposals,
      };

      console.log(
        "🔄 DEBUG fetchSingleTask - Task finale:",
        taskWithInterventi
      );
      console.log(
        "🔄 DEBUG fetchSingleTask - Interventi finali:",
        taskWithInterventi.interventI?.length || 0
      );
      console.log(
        "🔄 DEBUG fetchSingleTask - Proposte prodotto:",
        taskWithInterventi.productProposals?.length || 0
      );

      return taskWithInterventi;
    } catch (error) {
      console.error("🚨 DEBUG fetchSingleTask - Errore:", error);
      return null;
    }
  };

  // FUNZIONE SALVA INTERVENTO CON CAMBIO STATO
  const saveIntervention = async () => {
    if (!newIntervention.descrizione.trim()) {
      alert("La descrizione dell'intervento è obbligatoria");
      return;
    }

    if (!selectedTask) {
      alert("Nessun task selezionato");
      return;
    }

    if (isTaskClosed(selectedTask)) {
      alert("Il task è chiuso: non è possibile aggiungere interventi.");
      return;
    }

    console.log(
      "📊 DEBUG: Interventi attuali nel selectedTask:",
      selectedTask.interventI?.length || 0
    );

    // Validazione cambio stato
    if (newIntervention.nuovoStato) {
      const validStates = getValidStates(selectedTask.stato);
      if (!validStates.includes(newIntervention.nuovoStato)) {
        alert(
          `Cambio stato non valido. Da "${
            selectedTask.stato
          }" puoi passare solo a: ${validStates.join(", ")}`
        );
        return;
      }
    }

    // Se sto chiudendo il task, l'esito finale è obbligatorio
    const closing = newIntervention.nuovoStato === "Chiuso";
    if (closing && !newIntervention.esitoChiusuraFinale) {
      alert(
        "Se imposti lo stato su 'Chiuso' devi selezionare l'esito finale (Positivo o Negativo)."
      );
      return;
    }

    setIsLoading(true);

    try {
      // 0) Prepara la descrizione dell'intervento
      let descrizioneCompleta = newIntervention.descrizione;

      if (
        newIntervention.nuovoStato &&
        newIntervention.nuovoStato !== selectedTask.stato
      ) {
        descrizioneCompleta = `${descrizioneCompleta}\n\n📋 CAMBIO STATO: Da "${selectedTask.stato}" a "${newIntervention.nuovoStato}"`;
      }
      if (closing && newIntervention.esitoChiusuraFinale) {
        descrizioneCompleta += `\n✅ ESITO FINALE: ${newIntervention.esitoChiusuraFinale}`;
      }

      // Append info prodotto scelto (solo testo informativo nell'intervento)
      if (selectedProdottoId !== "") {
        const prod = prodotti.find(
          (p) => String(p.id) === String(selectedProdottoId)
        );
        const valoreTxt =
          typeof valorePotenzialeProdotto === "number" &&
          !isNaN(valorePotenzialeProdotto)
            ? ` • Valore potenziale: € ${valorePotenzialeProdotto.toFixed(2)}`
            : "";
        descrizioneCompleta += `\n🛒 PROPOSTA PRODOTTO: ${
          prod?.nome ?? "N/D"
        }${valoreTxt}`;
      }

      const isFirstIntervention = (selectedTask.interventI?.length ?? 0) === 0;

      if (isFirstIntervention) {
        const righe: string[] = [];
        if (hasOtherProvider !== null) {
          righe.push(
            `• Servizi con altri gestori: ${hasOtherProvider ? "Sì" : "No"}`
          );
          if (hasOtherProvider && otherProviderName) {
            righe.push(`  Gestore attuale: ${otherProviderName}`);
          }
        }
        if (pvrInterest !== null) {
          righe.push(`• Interesse PVR: ${pvrInterest ? "Sì" : "No"}`);
          if (pvrInterest && pvrConcessionario) {
            righe.push(`  Concessionario preferito: ${pvrConcessionario}`);
          }
        }
        if (righe.length) {
          descrizioneCompleta += `\n📌 DATI PRIMO CONTATTO:\n${righe.join(
            "\n"
          )}`;
        }
      }

      const interventoData = {
        operatoreId: newIntervention.operatoreId || "current-user",
        nomeOperatore: newIntervention.nomeOperatore || "Sistema",
        cognomeOperatore: newIntervention.cognomeOperatore || "Admin",
        tipoIntervento: newIntervention.nuovoStato
          ? "Cambio Stato"
          : newIntervention.tipoIntervento,
        descrizione: descrizioneCompleta,
        durata: newIntervention.durata,
        esitoIntervento: newIntervention.esitoIntervento,
        prossimaAzione: newIntervention.prossimaAzione,
        dataProximoContatto: newIntervention.dataProximoContatto,
      };

      console.log("📝 DEBUG: Salvando intervento:", interventoData);

      // 1) Aggiungi l'intervento
      const nuovoIntervento = await addTaskIntervention(
        selectedTask.id,
        interventoData
      );
      console.log("✅ DEBUG: Intervento salvato dal server:", nuovoIntervento);

      // 2) Eventuale update del task per cambio stato
      let updatedTaskFromServer: Task | null = null;
      if (
        newIntervention.nuovoStato &&
        newIntervention.nuovoStato !== selectedTask.stato
      ) {
        const taskUpdateData: any = {
          id: selectedTask.id,
          titolo: selectedTask.titolo,
          descrizione: selectedTask.descrizione,
          stato: newIntervention.nuovoStato,
          priorita: selectedTask.priorita,
          categoria: selectedTask.categoria,
          idAgenteAssegnato: selectedTask.agenteAssegnato?.id,
          dataScadenza: selectedTask.dataScadenza,
          valorePotenziale: selectedTask.valorePotenziale, // ❗ non modifichiamo col prezzo del prodotto
          note: selectedTask.note,
          cliente: { ...selectedTask.cliente },
          tags: selectedTask.tags || [],
        };

        if (closing) {
          taskUpdateData.esitoChiusura = newIntervention.esitoChiusuraFinale;
        }

        console.log(
          "🔄 DEBUG: Aggiornando stato task:",
          newIntervention.nuovoStato
        );
        updatedTaskFromServer = await updateTask(
          selectedTask.id,
          taskUpdateData
        );
      }

      // 2.b) NUOVO: se è stato selezionato un prodotto → crea *proposta prodotto* su BE
      //            (sostituisce vecchio tag 'prod:<id>' + incremento ValorePotenziale)
      let proposalsAfterPost: TaskProductProposalDto[] | null = null;
      if (selectedProdottoId !== "") {
        const baseTask = updatedTaskFromServer || selectedTask;
        const prod = prodotti.find(
          (p) => String(p.id) === String(selectedProdottoId)
        );

        const unitPriceFromUI =
          typeof valorePotenzialeProdotto === "number" &&
          !isNaN(valorePotenzialeProdotto)
            ? valorePotenzialeProdotto
            : undefined;

        // Usa helper se esiste, altrimenti fallback inline
        const doAddProposal = async () => {
          if (typeof (globalThis as any).addTaskProposal === "function") {
            await (globalThis as any).addTaskProposal(baseTask.id, {
              productCode: String(selectedProdottoId),
              productName: prod?.nome ?? "Prodotto",
              quantity: 1, // se in UI aggiungi Qta, sostituisci qui
              unitPrice:
                unitPriceFromUI ??
                (prod as any)?.prezzo ??
                (prod as any)?.price ??
                null,
              notes: "Selezione da intervento",
            });
          } else {
            // fallback diretto
            const url = `${API_URL}/api/Tasks/${baseTask.id}/proposals`;
            const res = await fetch(url, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                productCode: String(selectedProdottoId),
                productName: prod?.nome ?? "Prodotto",
                quantity: 1,
                unitPrice:
                  unitPriceFromUI ??
                  (prod as any)?.prezzo ??
                  (prod as any)?.price ??
                  null,
                notes: "Selezione da intervento",
              }),
            });
            if (!res.ok) {
              const t = await res.text();
              throw new Error(`Errore proposta prodotto: ${res.status} - ${t}`);
            }
          }
        };

        const doFetchProposals = async () => {
          if (typeof (globalThis as any).fetchTaskProposals === "function") {
            return (await (globalThis as any).fetchTaskProposals(
              baseTask.id
            )) as TaskProductProposalDto[];
          } else {
            const url = `${API_URL}/api/Tasks/${baseTask.id}/proposals`;
            const res = await fetch(url, {
              method: "GET",
              headers: getAuthHeaders(),
            });
            if (!res.ok)
              throw new Error(`Errore lettura proposte: ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []) as TaskProductProposalDto[];
          }
        };

        try {
          await doAddProposal();
          proposalsAfterPost = await doFetchProposals();
          console.log(
            "🧾 DEBUG: Proposte ricaricate:",
            proposalsAfterPost?.length || 0
          );
        } catch (e) {
          console.error(
            "🚨 DEBUG: Errore creazione/lettura proposta prodotto:",
            e
          );
          // non blocco il flusso: l'intervento resta salvato
        }
      }

      // 2.d) Riallinea ValorePotenziale del task = somma delle proposte (anche se non ho aggiunto prodotti)
      const proposalsForValue =
        proposalsAfterPost ?? selectedTask.productProposals ?? [];
      const newTotal = proposalsForValue
        .filter((p) => !p.isDeleted)
        .reduce((s, p) => s + (p.unitPrice ?? 0) * (p.quantity ?? 1), 0);

      // Salvo su BE usando il PUT /api/Tasks/{id} (updateTask accetta partial)
      try {
        await updateTask(selectedTask.id, {
          valorePotenziale: newTotal,
        } as Partial<Task>);
        console.log("💾 DEBUG: ValorePotenziale aggiornato (PUT):", newTotal);
      } catch (e) {
        console.warn("⚠️ DEBUG: Persistenza ValorePotenziale fallita:", e);
      }

      // 2.c) Se è il primo intervento, aggiorna i tag con i dati raccolti (come prima)
      let updatedTaskAfterExtras: Task | null = null;
      if (isFirstIntervention) {
        const baseTask = updatedTaskFromServer || selectedTask;
        const extraTags: string[] = [];

        if (hasOtherProvider !== null)
          extraTags.push(`has_other:${hasOtherProvider ? "yes" : "no"}`);
        if (hasOtherProvider && otherProviderName)
          extraTags.push(`other_provider:${otherProviderName}`);

        if (pvrInterest !== null)
          extraTags.push(`pvr_interest:${pvrInterest ? "yes" : "no"}`);
        if (pvrInterest && pvrConcessionario)
          extraTags.push(`pvr_conc:${pvrConcessionario}`);

        if (extraTags.length) {
          const tagsAggiornati = Array.from(
            new Set([...(baseTask.tags ?? []), ...extraTags])
          );
          updatedTaskAfterExtras = await updateTask(baseTask.id, {
            tags: tagsAggiornati,
          } as Partial<Task>);
        }
      }

      // 3) Aggiornamento manuale del task in memoria (interventi + proposte + stato)
      console.log("🔄 DEBUG: Aggiornamento manuale del task...");

      const sorgenteAggiornata =
        updatedTaskAfterExtras || updatedTaskFromServer || selectedTask;
      const nuovoStatoEffettivo =
        newIntervention.nuovoStato || sorgenteAggiornata.stato;

      const taskAggiornato: Task = {
        ...sorgenteAggiornata,
        interventI: [...(selectedTask.interventI || []), nuovoIntervento],
        productProposals:
          proposalsAfterPost ??
          sorgenteAggiornata.productProposals ??
          selectedTask.productProposals ??
          [],
        valorePotenziale: newTotal, // 👈 allinea subito la UI e la lista
        dataUltimaModifica: new Date().toISOString(),
        stato: nuovoStatoEffettivo,
        esitoChiusura:
          nuovoStatoEffettivo === "Chiuso"
            ? newIntervention.esitoChiusuraFinale ??
              sorgenteAggiornata.esitoChiusura ??
              null
            : null,
      };

      console.log(
        "📊 DEBUG: Task aggiornato - nuovi interventi:",
        taskAggiornato.interventI?.length || 0
      );
      console.log(
        "📦 DEBUG: Task aggiornato - proposte prodotto:",
        taskAggiornato.productProposals?.length || 0
      );

      // 4) Aggiorna stati locali
      setTasks(
        tasks.map((task) =>
          task.id === selectedTask.id ? taskAggiornato : task
        )
      );
      setSelectedTask(taskAggiornato);

      // 5) Reset form e chiudi modal
      resetInterventionForm();
      setShowAddInterventionModal(false);

      // 6) Ricarica lista dei task per aggiornare statistiche
      fetchTasks({ page: currentPage, pageSize: itemsPerPage }).catch(
        console.warn
      );
      fetchAllTasks().catch(console.warn);

      // 7) Messaggio di successo
      const messaggioSuccesso =
        newIntervention.nuovoStato &&
        newIntervention.nuovoStato !== selectedTask.stato
          ? `✅ Intervento registrato e stato cambiato da "${selectedTask.stato}" a "${newIntervention.nuovoStato}"`
          : "✅ Intervento registrato con successo!";

      alert(messaggioSuccesso);
      console.log("🎉 DEBUG: Operazione completata con successo!");
    } catch (error) {
      console.error("🚨 DEBUG: Errore salvataggio intervento:", error);
      alert(
        `❌ Errore nell'aggiunta intervento: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper per mappare i tab ai filtri
  const getFiltersForTab = (
    tab: "tutti" | "aperti" | "completati" | "scaduti",
    searchTerm: string,
    selectedPriority: string,
    selectedCategory: string,
    selectedAgent: string,
    selectedStatus?: string
  ) => {
    let stato: string | undefined;
    let scaduti: boolean | undefined;

    switch (tab) {
      case "aperti":
        stato = "Aperto";
        break;
      case "completati":
        // per default mostro "Completato"; "Chiuso" si può selezionare dal dropdown Stato
        stato = "Completato";
        break;
      case "scaduti":
        scaduti = true;
        break;
      case "tutti":
      default:
        break;
    }

    // 🔁 override: se l'utente ha scelto uno stato specifico dal filtro
    if (selectedStatus && selectedStatus !== "tutti") {
      stato = selectedStatus as Task["stato"];
      scaduti = undefined; // uno esclude l'altro
    }

    return {
      page: 1,
      pageSize: itemsPerPage, // 👈 non fisso a 10
      search: (searchTerm || "").trim() || undefined,
      stato,
      priorita: selectedPriority === "tutte" ? undefined : selectedPriority,
      categoria: selectedCategory === "tutte" ? undefined : selectedCategory,
      agenteId: selectedAgent === "tutti" ? undefined : selectedAgent,
      scaduti,
    };
  };

  type FilterOverrides = Partial<{
    activeTab: "tutti" | "aperti" | "completati" | "scaduti";
    searchTerm: string;
    selectedPriority: string;
    selectedCategory: string;
    selectedAgent: string;
    selectedStatus: string;
  }>;

  // GESTIONE FILTRI COLLEGATA ALLE API
  const handleFilterChange = (over?: FilterOverrides) => {
    const tab = over?.activeTab ?? activeTab;

    const filters = getFiltersForTab(
      tab,
      over?.searchTerm ?? searchTerm,
      over?.selectedPriority ?? selectedPriority,
      over?.selectedCategory ?? selectedCategory,
      over?.selectedAgent ?? selectedAgent,
      over?.selectedStatus ?? selectedStatus
    );

    setCurrentPage(1);
    fetchTasks(filters);
  };

  // GESTIONE PAGINAZIONE COLLEGATA ALLE API
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > serverTotalPages || newPage === currentPage)
      return;

    setCurrentPage(newPage);

    // mappa il tab ai valori attesi dal BE
    const statoFromTab =
      activeTab === "aperti"
        ? "Aperto"
        : activeTab === "completati"
        ? "Completato"
        : undefined;

    // il filtro Stato (dropdown) ha la precedenza sul tab
    const stato =
      selectedStatus && selectedStatus !== "tutti"
        ? selectedStatus
        : statoFromTab;

    // se scegli uno stato specifico, "scaduti" non si applica
    const scaduti =
      selectedStatus && selectedStatus !== "tutti"
        ? undefined
        : activeTab === "scaduti"
        ? true
        : undefined;

    fetchTasks({
      page: newPage,
      pageSize: itemsPerPage,
      search: (searchTerm || "").trim() || undefined,
      stato,
      priorita: selectedPriority === "tutte" ? undefined : selectedPriority,
      categoria: selectedCategory === "tutte" ? undefined : selectedCategory,
      agenteId: selectedAgent === "tutti" ? undefined : selectedAgent,
      scaduti,
    });
  };

  // CARICAMENTO INIZIALE
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

    fetchProdottiLookup();

    const loadInitialData = async () => {
      try {
        await fetchAgenti();
        await fetchAllTasks();
        await fetchTasks({ page: 1, pageSize: itemsPerPage });
        console.log("✅ Dati iniziali caricati");
      } catch (error) {
        console.error("🚨 Errore caricamento dati iniziali:", error);
      }
    };

    loadInitialData();
  }, [API_URL]);

  // FUNZIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // STATISTICHE TASKS
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

  // DATI PER GRAFICO STATI
  const chartData = useMemo(() => {
    if (tasks.length === 0) return [];

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

  // BADGE FUNCTIONS
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

  // HELPER FUNCTIONS
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

  // AZIONI TASK
  const handleTaskClick = async (task: Task) => {
    console.log("🔍 DEBUG handleTaskClick - Task originale:", task);
    console.log("🔍 DEBUG handleTaskClick - task.interventI:", task.interventI);
    console.log(
      "🔍 DEBUG handleTaskClick - task.interventi:",
      (task as any).interventi
    );
    console.log(
      "🔍 DEBUG handleTaskClick - task.Interventi:",
      (task as any).Interventi
    );
    console.log(
      "🔍 DEBUG handleTaskClick - Tutte le proprietà del task:",
      Object.keys(task)
    );

    // Prima proviamo con i dati locali
    const taskWithInterventi = {
      ...task,
      interventI:
        task.interventI ||
        (task as any).interventi ||
        (task as any).Interventi ||
        [],
    };

    console.log(
      "🔍 DEBUG handleTaskClick - Task finale con interventi locali:",
      taskWithInterventi
    );
    console.log(
      "🔍 DEBUG handleTaskClick - Numero interventi locali:",
      taskWithInterventi.interventI?.length || 0
    );

    setSelectedTask(taskWithInterventi);
    setShowTaskDetail(true);

    // Poi ricariciamo dal server per avere i dati più aggiornati
    console.log("🔄 DEBUG handleTaskClick - Ricaricamento dal server...");
    const freshTask = await fetchSingleTask(task.id);
    if (freshTask) {
      console.log(
        "🔄 DEBUG handleTaskClick - Task fresco dal server:",
        freshTask
      );
      console.log(
        "🔄 DEBUG handleTaskClick - Interventi freschi:",
        freshTask.interventI?.length || 0
      );
      setSelectedTask(freshTask);

      // Aggiorniamo anche l'array tasks locale
      setTasks(tasks.map((t) => (t.id === freshTask.id ? freshTask : t)));
    }
  };

  const handleReassignTask = (task: Task) => {
    if (isTaskClosed(task)) {
      alert("Il task è chiuso: non può essere riassegnato.");
      return;
    }
    setTaskToReassign(task);
    setShowReassignModal(true);
  };

  // SALVA NUOVO TASK
  // const saveNewTask = async () => {
  //   if (!newTask.titolo.trim()) {
  //     alert("Il titolo del task è obbligatorio");
  //     return;
  //   }

  //   if (!newTask.clienteNome.trim() || !newTask.clienteEmail.trim()) {
  //     alert("Nome e email del cliente sono obbligatori");
  //     return;
  //   }

  //   setIsLoading(true);

  //   try {
  //     const taskData = {
  //       titolo: newTask.titolo,
  //       descrizione: newTask.descrizione,
  //       priorita: newTask.priorita,
  //       categoria: newTask.categoria,
  //       idAgenteAssegnato: newTask.agenteAssegnatoId || undefined,
  //       dataScadenza: newTask.dataScadenza || undefined,
  //       valorePotenziale: newTask.valorePotenziale,
  //       note: newTask.note,
  //       cliente: {
  //         nome: newTask.clienteNome,
  //         cognome: newTask.clienteCognome,
  //         email: newTask.clienteEmail,
  //         telefono: newTask.clienteTelefono,
  //         citta: newTask.clienteCitta,
  //         provincia: newTask.clienteProvincia,
  //         azienda: newTask.clienteAzienda,
  //         tipoAttivita: newTask.clienteTipoAttivita,
  //       },
  //       tags: [],
  //     };

  //     await createTask(taskData);
  //     setNewTask(defaultNewTask);
  //     setShowNewTaskForm(false);
  //     alert("Task creato con successo!");

  //     await fetchTasks({ page: 1, pageSize: itemsPerPage });
  //   } catch (error) {
  //     console.error("🚨 Errore salvataggio task:", error);
  //     alert(
  //       `Errore nella creazione del task: ${
  //         error instanceof Error ? error.message : "Errore sconosciuto"
  //       }`
  //     );
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // RIASSEGNA TASK
  const confirmReassignTask = async () => {
    if (!taskToReassign || !newAssigneeId) return;

    setIsLoading(true);

    try {
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

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedTask(task);

    setNewTask({
      titolo: task.titolo || "",
      descrizione: task.descrizione || "",
      priorita: task.priorita || "Media",
      categoria: task.categoria || "Informazioni",
      agenteAssegnatoId: task.agenteAssegnato?.id || "",
      // se usi <input type="datetime-local"> conviene un valore "YYYY-MM-DDTHH:mm"
      dataScadenza: task.dataScadenza
        ? toLocalDateTimeInput(task.dataScadenza)
        : "",
      valorePotenziale: task.valorePotenziale,
      note: task.note || "",
      clienteNome: task.cliente?.nome || "",
      clienteCognome: task.cliente?.cognome || "",
      clienteEmail: task.cliente?.email || "",
      clienteTelefono: task.cliente?.telefono || "",
      clienteCitta: task.cliente?.citta || "",
      clienteProvincia: task.cliente?.provincia || "",
      clienteAzienda: task.cliente?.azienda || "",
      clienteTipoAttivita: task.cliente?.tipoAttivita || "",
    });

    setShowNewTaskForm(true);

    // 👇 stesso comportamento del bottone "Nuovo Task"
    setTimeout(() => {
      const formElement = document.getElementById(
        "form-nuovo-task"
      ) as HTMLElement;
      const firstInput = document.getElementById(
        "titolo-task"
      ) as HTMLInputElement;
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        formElement.classList.add("border-warning");
        formElement.style.boxShadow = "0 0 20px rgba(255, 193, 7, 0.5)";
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
  };

  const handleDeleteTask = async (task: Task) => {
    const ok = window.confirm(
      `Confermi l'eliminazione del task ${task.numeroTask}?`
    );
    if (!ok) return;

    setIsLoading(true);
    try {
      await deleteTask(task.id);

      // chiudi il dettaglio se stava mostrando proprio quel task
      if (selectedTask?.id === task.id) {
        setShowTaskDetail(false);
        setSelectedTask(null);
      }

      // ricarica la lista come se avessi premuto "Aggiorna"
      await fetchTasks({ page: 1, pageSize: itemsPerPage });
      // oppure: handleFilterChange();

      // refresh statistiche globali
      fetchAllTasks().catch(console.warn);

      alert("Task eliminato con successo.");
    } catch (error) {
      alert(
        `Errore nella cancellazione: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Tasks/${taskId}`;

      const response = await fetch(url, { method: "DELETE", headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Errore nella cancellazione del task: ${response.status} - ${errorText}`
        );
      }

      return true;
    } catch (error) {
      console.error("🚨 Errore cancellazione task:", error);
      throw error;
    }
  };

  const saveTask = async () => {
    // 1) Validazioni base
    if (!newTask.titolo.trim()) {
      alert("Il titolo del task è obbligatorio");
      return;
    }
    if (!newTask.clienteNome.trim() || !newTask.clienteEmail.trim()) {
      alert("Nome e email del cliente sono obbligatori");
      return;
    }

    // 2) Helper per rimuovere i campi undefined
    const clean = <T extends object>(obj: T): T =>
      JSON.parse(JSON.stringify(obj));

    setIsLoading(true);
    try {
      const isEdit = !!editingTaskId;

      // 3) Payload comune dal form
      const basePayload = {
        titolo: newTask.titolo,
        descrizione: newTask.descrizione || undefined,
        priorita: newTask.priorita || "Media",
        categoria: newTask.categoria || "Vendita",
        idAgenteAssegnato: newTask.agenteAssegnatoId || undefined,
        dataScadenza: newTask.dataScadenza || undefined,
        // ⚠️ valorePotenziale NON lo includiamo in create; lo gestiamo in update solo se serve
        note: newTask.note || undefined,
        cliente: {
          // in update aggiungiamo anche l'id sotto
          nome: newTask.clienteNome,
          cognome: newTask.clienteCognome || undefined,
          email: newTask.clienteEmail,
          telefono: newTask.clienteTelefono || undefined,
          citta: newTask.clienteCitta || undefined,
          provincia: newTask.clienteProvincia || undefined,
          azienda: newTask.clienteAzienda || undefined,
          tipoAttivita: newTask.clienteTipoAttivita || undefined,
        },
        tags: [] as string[],
      };

      if (isEdit) {
        // ===== PUT (UPDATE) =====
        const statoCorrente = selectedTask?.stato || "Aperto";

        // costruisci DTO per update
        const dto: any = clean({
          ...basePayload,
          id: editingTaskId,
          stato: statoCorrente,
          valorePotenziale:
            typeof newTask.valorePotenziale === "number"
              ? newTask.valorePotenziale
              : undefined,
          cliente: clean({
            ...basePayload.cliente,
            id: selectedTask?.cliente?.id ?? "", // il BE lo vuole in update
          }),
        });

        // ✅ se lo stato è "Chiuso" il BE richiede esitoChiusura
        if (statoCorrente === "Chiuso") {
          dto.esitoChiusura = selectedTask?.esitoChiusura ?? "Negativo";
        }

        const updated = await updateTask(editingTaskId, dto);

        // aggiorna lista e dettaglio
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        if (selectedTask?.id === updated.id) setSelectedTask(updated);

        alert("Task aggiornato con successo!");
      } else {
        // ===== POST (CREATE) =====
        // niente valorePotenziale in creazione: viene calcolato dopo con le proposte
        const dtoCreate = clean(basePayload);
        await createTask(dtoCreate);
        alert("Task creato con successo!");
      }

      // 4) Chiudi form + reset stato edit
      setShowNewTaskForm(false);
      setNewTask(defaultNewTask);
      setEditingTaskId(null);

      // 5) Ricarica lista/statistiche
      await fetchTasks({ page: currentPage, pageSize: itemsPerPage });
      fetchAllTasks().catch(console.warn);
    } catch (error) {
      console.error("🚨 Salvataggio task:", error);
      alert(
        `Errore nel salvataggio: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProdottiLookup = async () => {
    setIsLoadingProdotti(true);
    setErrorProdotti("");
    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Lookup/prodotti`;
      const res = await fetch(url, { method: "GET", headers });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Lookup prodotti: ${res.status} - ${t}`);
      }

      // La tua API di solito ritorna { success, data } come negli altri lookup
      const json = (await res.json()) as ApiResponseDto<Prodotto[]>;
      if (json.success && Array.isArray(json.data)) {
        setProdotti(json.data);
      } else {
        throw new Error(json.message || "Struttura lookup prodotti non valida");
      }
    } catch (err) {
      setErrorProdotti(
        err instanceof Error
          ? err.message
          : "Errore imprevisto nel lookup prodotti"
      );
      // fallback opzionale
      setProdotti([
        { id: 1, nome: "POS A920PRO" },
        { id: 2, nome: "Stampante termica" },
      ]);
    } finally {
      setIsLoadingProdotti(false);
    }
  };

  // POST /api/Tasks/{taskId}/proposals
  // TODO[MG][2025-08-27]: breve motivo. Rimuovere se in futuro non necessario.
  // const addTaskProposal = async (
  //   taskId: string,
  //   payload: {
  //     productCode: string;
  //     productName: string;
  //     quantity: number;
  //     unitPrice?: number | null;
  //     notes?: string | null;
  //   }
  // ): Promise<TaskProductProposalDto> => {
  //   const headers = getAuthHeaders();
  //   const url = `${API_URL}/api/Tasks/${taskId}/proposals`;

  //   const res = await fetch(url, {
  //     method: "POST",
  //     headers,
  //     body: JSON.stringify(payload),
  //   });

  //   if (!res.ok) {
  //     const t = await res.text();
  //     throw new Error(`Errore proposta prodotto: ${res.status} - ${t}`);
  //   }

  //   const json: ApiResponseDto<TaskProductProposalDto> = await res.json();
  //   if (!json.success || !json.data) {
  //     throw new Error(
  //       json.message || "Impossibile creare la proposta prodotto"
  //     );
  //   }
  //   return json.data;
  // };

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

          {/* ALERT PER STATO LOADING/ERRORI */}
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
                    Riprova caricamento ↻
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
                    Riprova caricamento ↻
                  </button>
                </>
              )}
            </div>
          )}

          {/* HEADER CON BREADCRUMB */}
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
                  setEditingTaskId(null);
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
                    ? "⚠️ Nessun agente disponibile - controlla la connessione API"
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

          {/* STATISTICHE E GRAFICO */}
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

          {/* FILTRI E RICERCA */}
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
                                  const newTab = tab as
                                    | "tutti"
                                    | "aperti"
                                    | "completati"
                                    | "scaduti";
                                  setActiveTab(newTab);
                                  handleFilterChange({
                                    activeTab: newTab,
                                    selectedStatus,
                                  });
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
                          const v = e.target.value;
                          setSearchTerm(v);
                          if (searchTimeoutRef.current)
                            clearTimeout(searchTimeoutRef.current);
                          searchTimeoutRef.current = setTimeout(() => {
                            handleFilterChange({ searchTerm: v });
                          }, 500);
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
                          const v = e.target.value;
                          setSelectedPriority(v);
                          handleFilterChange({ selectedPriority: v });
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
                          const v = e.target.value;
                          setSelectedAgent(v);
                          handleFilterChange({ selectedAgent: v });
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
                          const v = e.target.value;
                          setSelectedStatus(v);
                          handleFilterChange({ selectedStatus: v });
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

          {/* LISTA TASK */}
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
                              <th>Priorità</th>
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
                                  {task.stato === "Chiuso" &&
                                    task.esitoChiusura && (
                                      <span
                                        className={`badge ms-2 ${
                                          task.esitoChiusura === "Positivo"
                                            ? "bg-success"
                                            : "bg-danger"
                                        }`}
                                        title="Esito chiusura"
                                      >
                                        {task.esitoChiusura}
                                      </span>
                                    )}
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
                                      title="Riassegna task"
                                      disabled={isTaskClosed(task)}
                                      onClick={() => {
                                        if (!isTaskClosed(task))
                                          handleReassignTask(task);
                                      }}
                                    >
                                      <i className="fa-solid fa-user-check"></i>
                                    </button>

                                    <button
                                      className="btn btn-outline-info btn-sm"
                                      title="Aggiungi intervento"
                                      disabled={isTaskClosed(task)}
                                      onClick={() => {
                                        if (isTaskClosed(task)) return;
                                        setSelectedTask(task);
                                        setShowAddInterventionModal(true);
                                        setNewIntervention({
                                          ...defaultNewIntervention,
                                          operatoreId: "current-user",
                                          nomeOperatore: "Sistema",
                                          cognomeOperatore: "Admin",
                                        });
                                      }}
                                    >
                                      <i className="fa-solid fa-plus"></i>
                                    </button>
                                    {isAdmin && (
                                      <>
                                        <button
                                          className="btn btn-outline-warning btn-sm"
                                          onClick={() => handleEditTask(task)}
                                          title="Modifica task"
                                        >
                                          <i className="fa-solid fa-pen-to-square"></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => handleDeleteTask(task)}
                                          title="Cancella task"
                                        >
                                          <i className="fa-solid fa-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* PAGINAZIONE SERVER */}
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

          {/* FORM NUOVO/MODIFICA TASK */}
          {showNewTaskForm && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card" id="form-nuovo-task">
                  <div className="custom-card-header">
                    <span>
                      {editingTaskId ? "Modifica Task" : "Nuovo Task"}
                    </span>
                    <i
                      className={`fa-solid ${
                        editingTaskId ? "fa-pen-to-square" : "fa-plus"
                      }`}
                    ></i>
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
                          onChange={handleNewTaskFieldChange("titolo")}
                          placeholder="Inserisci il titolo del task..."
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Priorità</label>
                        <select
                          className="form-select"
                          value={newTask.priorita}
                          onChange={handleNewTaskFieldChange("priorita")}
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
                          onChange={handleNewTaskFieldChange("categoria")}
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
                          onChange={handleNewTaskFieldChange("descrizione")}
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
                          onChange={handleNewTaskFieldChange("clienteNome")}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Cognome</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteCognome}
                          onChange={handleNewTaskFieldChange("clienteCognome")}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newTask.clienteEmail}
                          onChange={handleNewTaskFieldChange("clienteEmail")}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Telefono</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={newTask.clienteTelefono}
                          onChange={handleNewTaskFieldChange("clienteTelefono")}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Azienda</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteAzienda}
                          onChange={handleNewTaskFieldChange("clienteAzienda")}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tipo Attività</label>
                        <select
                          className="form-select"
                          value={newTask.clienteTipoAttivita}
                          onChange={handleNewTaskFieldChange(
                            "clienteTipoAttivita"
                          )}
                        >
                          <option value="">Seleziona Attività</option>
                          {ATTIVITA_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <hr />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Assegna a</label>
                        <select
                          className="form-select"
                          value={newTask.agenteAssegnatoId}
                          onChange={handleNewTaskFieldChange(
                            "agenteAssegnatoId"
                          )}
                          disabled={isLoadingAgenti}
                        >
                          <option value="">
                            {isLoadingAgenti
                              ? "Caricamento agenti..."
                              : agenti.length === 0
                              ? "⚠️ Nessun agente disponibile"
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
                                Vai alla gestione agenti ↻
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
                          onChange={handleNewTaskFieldChange("dataScadenza")}
                        />
                      </div>
                      {/* Valore Potenziale: visibile SOLO in modifica */}
                      {editingTaskId && (
                        <div className="col-md-4">
                          <label className="form-label">
                            Valore Potenziale
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={newTask.valorePotenziale || ""}
                            onChange={handleNewTaskFieldChange(
                              "valorePotenziale"
                            )}
                          />
                        </div>
                      )}
                      <div className="col-12">
                        <label className="form-label">Note</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={newTask.note}
                          onChange={handleNewTaskFieldChange("note")}
                        ></textarea>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={saveTask}
                        disabled={isLoading}
                      >
                        <i
                          className={`fa-solid ${
                            isLoading ? "fa-spinner fa-spin" : "fa-save"
                          } me-1`}
                        ></i>
                        {isLoading
                          ? "Salvando..."
                          : editingTaskId
                          ? "Salva Modifiche"
                          : "Salva Task"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowNewTaskForm(false);
                          setNewTask(defaultNewTask);
                          setEditingTaskId(null);
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

          {/* DETTAGLIO TASK MODAL */}
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
                                <strong>Priorità:</strong>
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
                                {(() => {
                                  const tot = getProposalsTotal(selectedTask); // somma € di tutte le proposte attive
                                  if (tot > 0) {
                                    return `€ ${tot.toLocaleString("it-IT", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`;
                                  }
                                  // fallback: se non ci sono proposte mostro l’eventuale valorePotenziale storico
                                  return selectedTask.valorePotenziale &&
                                    selectedTask.valorePotenziale > 0
                                    ? `€ ${selectedTask.valorePotenziale.toLocaleString(
                                        "it-IT",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}`
                                    : "-";
                                })()}
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
                                <strong>Attività:</strong>
                              </td>
                              <td>
                                {selectedTask.cliente.tipoAttivita || "-"}
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Città:</strong>
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

                    {selectedTask?.productProposals &&
                      selectedTask.productProposals.filter((p) => !p.isDeleted)
                        .length > 0 && (
                        <div className="row mt-2">
                          <div className="col-12">
                            <div className="card product-proposals-card">
                              <div className="card-body py-2">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <h6 className="mb-0">Prodotti prenotati</h6>
                                  <span className="badge bg-secondary">
                                    Totale €{" "}
                                    {getProposalsTotal(selectedTask).toFixed(2)}
                                  </span>
                                </div>
                                <ul className="list-unstyled mb-0 small">
                                  {selectedTask.productProposals
                                    .filter((p) => !p.isDeleted)
                                    .map((p) => (
                                      <li
                                        key={p.id}
                                        className="d-flex justify-content-between"
                                      >
                                        <span>
                                          🛒 {p.productName}
                                          {p.productCode
                                            ? ` (${p.productCode})`
                                            : ""}{" "}
                                          × {p.quantity}
                                        </span>
                                        <span>
                                          {p.unitPrice != null
                                            ? `€ ${(
                                                p.unitPrice * (p.quantity ?? 1)
                                              ).toFixed(2)}`
                                            : "-"}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

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
                        <div className="d-flex justify-content-between align-items-center">
                          <h6>
                            Cronologia Interventi (
                            {selectedTask.interventI?.length || 0})
                          </h6>
                          {/* <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={async () => {
                                console.log(
                                  "🔄 Ricaricamento task dal server..."
                                );
                                const freshTask = await fetchSingleTask(
                                  selectedTask.id
                                );
                                if (freshTask) {
                                  setSelectedTask(freshTask);
                                  setTasks(
                                    tasks.map((t) =>
                                      t.id === freshTask.id ? freshTask : t
                                    )
                                  );
                                  alert(
                                    `✅ Task ricaricato! Interventi trovati: ${
                                      freshTask.interventI?.length || 0
                                    }`
                                  );
                                } else {
                                  alert("❌ Errore nel ricaricamento del task");
                                }
                              }}
                            >
                              🔄 RICARICA DAL SERVER
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask:",
                                  selectedTask
                                );
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask.interventI:",
                                  selectedTask.interventI
                                );
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask.interventi:",
                                  (selectedTask as any).interventi
                                );
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask.Interventi:",
                                  (selectedTask as any).Interventi
                                );
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask keys:",
                                  Object.keys(selectedTask)
                                );
                                console.log(
                                  "🔍 DEBUG MODAL selectedTask ID:",
                                  selectedTask.id
                                );
                                console.log(
                                  "🔍 DEBUG MODAL tasks array completo:",
                                  tasks
                                );

                                // Cerca il task nell'array tasks per confronto
                                const taskFromArray = tasks.find(
                                  (t) => t.id === selectedTask.id
                                );
                                console.log(
                                  "🔍 DEBUG MODAL task dall'array tasks:",
                                  taskFromArray
                                );
                                console.log(
                                  "🔍 DEBUG MODAL task dall'array interventI:",
                                  taskFromArray?.interventI
                                );

                                if (
                                  selectedTask.interventI &&
                                  selectedTask.interventI.length > 0
                                ) {
                                  selectedTask.interventI.forEach(
                                    (intervento, index) => {
                                      console.log(
                                        `🔍 DEBUG MODAL Intervento ${
                                          index + 1
                                        }:`,
                                        intervento
                                      );
                                    }
                                  );
                                } else {
                                  console.log(
                                    "🔍 DEBUG MODAL: Nessun intervento trovato nell'array"
                                  );
                                }

                                // Mostra tutti i campi del selectedTask che potrebbero contenere interventi
                                Object.keys(selectedTask).forEach((key) => {
                                  if (key.toLowerCase().includes("intervent")) {
                                    console.log(
                                      `🔍 DEBUG MODAL Campo ${key}:`,
                                      (selectedTask as any)[key]
                                    );
                                  }
                                });

                                alert(`DEBUG: 
                                - Task ID: ${selectedTask.id}
                                - interventI: ${
                                  selectedTask?.interventI?.length || 0
                                }
                                - interventi: ${
                                  (selectedTask as any)?.interventi?.length || 0
                                }
                                - Interventi: ${
                                  (selectedTask as any)?.Interventi?.length || 0
                                }
                                
                                Controlla la console per i dettagli completi.`);
                              }}
                            >
                              🔍 DEBUG DETTAGLIATO
                            </button>
                          </div> */}
                        </div>
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
                      title={
                        isTaskClosed(selectedTask)
                          ? "Il task è chiuso"
                          : "Aggiungi intervento"
                      }
                      disabled={isTaskClosed(selectedTask)}
                      onClick={() => {
                        if (isTaskClosed(selectedTask)) return;
                        setShowAddInterventionModal(true);
                        setNewIntervention({
                          ...defaultNewIntervention,
                          operatoreId: "current-user",
                          nomeOperatore: "Sistema",
                          cognomeOperatore: "Admin",
                        });
                      }}
                    >
                      <i className="fa-solid fa-plus me-1"></i>Aggiungi
                      Intervento
                    </button>

                    <button
                      className="btn btn-info"
                      title={
                        isTaskClosed(selectedTask)
                          ? "Il task è chiuso"
                          : "Riassegna"
                      }
                      disabled={isTaskClosed(selectedTask)}
                      onClick={() => {
                        if (isTaskClosed(selectedTask)) return;
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

          {/* MODAL RIASSEGNAZIONE TASK */}
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
                        setReassignReason("");
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
                      disabled={
                        isTaskClosed(taskToReassign) ||
                        !newAssigneeId ||
                        isLoading
                      }
                    >
                      <i
                        className={`fa-solid ${
                          isLoading ? "fa-spinner fa-spin" : "fa-check"
                        } me-1`}
                      ></i>
                      {isLoading
                        ? "Riassegnando..."
                        : "Conferma Riassegnazione"}
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

          {/* MODAL AGGIUNGI INTERVENTO CON CAMBIO STATO */}
          {showAddInterventionModal && selectedTask && (
            <div
              className="modal show d-block"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-plus me-2"></i>Registra
                      Intervento
                      <small className="ms-3 opacity-75">
                        Task: <strong>{selectedTask.numeroTask}</strong> -
                        Stato:
                        <span className="badge bg-light text-dark ms-1">
                          {selectedTask.stato}
                        </span>
                      </small>
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => {
                        setShowAddInterventionModal(false);
                        setNewIntervention(defaultNewIntervention);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    {/* SEZIONE CAMBIO STATO - PRIORITARIA */}
                    <div className="card border-warning mb-4">
                      <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          <i className="fa-solid fa-exchange-alt me-2"></i>
                          Cambio Stato del Task
                        </h6>
                        <small className="badge bg-dark">
                          {getValidStates(selectedTask.stato).length > 0
                            ? "Disponibile"
                            : "Non disponibile"}
                        </small>
                      </div>
                      <div className="card-body">
                        {getValidStates(selectedTask.stato).length > 0 ? (
                          <div className="row align-items-center">
                            <div className="col-md-3">
                              <label className="form-label small fw-bold">
                                Stato Attuale
                              </label>
                              <div>
                                <span
                                  className={`${getStatusBadgeClass(
                                    selectedTask.stato
                                  )} fs-6`}
                                >
                                  <i className="fa-solid fa-circle me-1"></i>
                                  {selectedTask.stato}
                                </span>
                              </div>
                            </div>
                            <div className="col-md-1 text-center">
                              <i className="fa-solid fa-arrow-right text-warning fa-2x"></i>
                            </div>
                            <div className="col-md-8">
                              <label className="form-label small fw-bold">
                                Nuovo Stato
                              </label>
                              <select
                                className="form-select"
                                value={newIntervention.nuovoStato || ""}
                                onChange={handleNewInterventionFieldChange(
                                  "nuovoStato"
                                )}
                              >
                                <option value="">
                                  🚫 Mantieni stato "{selectedTask.stato}"
                                </option>
                                {getValidStates(selectedTask.stato).map(
                                  (stato) => {
                                    const icon =
                                      stato === "In Corso"
                                        ? "▶️"
                                        : stato === "Completato"
                                        ? "✅"
                                        : stato === "Chiuso"
                                        ? "🔒"
                                        : stato === "In Attesa"
                                        ? "⏸️"
                                        : stato === "Sospeso"
                                        ? "⛔"
                                        : "🔄";
                                    return (
                                      <option key={stato} value={stato}>
                                        {icon} {stato}
                                      </option>
                                    );
                                  }
                                )}
                              </select>
                              {newIntervention.nuovoStato && (
                                <div className="alert alert-success mt-2 py-2">
                                  <i className="fa-solid fa-info-circle me-2"></i>
                                  <strong>Cambio pianificato:</strong> Il task
                                  passerà da
                                  <span className="badge bg-secondary mx-1">
                                    {selectedTask.stato}
                                  </span>
                                  a{" "}
                                  <span className="badge bg-success mx-1">
                                    {newIntervention.nuovoStato}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted">
                            <i className="fa-solid fa-lock fa-2x mb-2"></i>
                            <p className="mb-0">
                              <strong>Nessun cambio stato disponibile</strong>
                              <br />
                              Il task è in stato "{selectedTask.stato}" e non
                              può essere modificato.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DATI PRIMO CONTATTO - visibile solo al 1° intervento */}
                    {(selectedTask?.interventI?.length ?? 0) === 0 && (
                      <div className="card border-info mb-4">
                        <div className="card-header bg-info text-white">
                          <strong>📞 Dati raccolti al primo contatto</strong>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">
                                Ha già i nostri servizi con altri gestori?
                              </label>
                              <select
                                className="form-select"
                                value={
                                  hasOtherProvider === null
                                    ? ""
                                    : hasOtherProvider
                                    ? "yes"
                                    : "no"
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setHasOtherProvider(
                                    v === "" ? null : v === "yes"
                                  );
                                  if (v !== "yes") setOtherProviderName("");
                                }}
                              >
                                <option value="">Seleziona…</option>
                                <option value="yes">Sì</option>
                                <option value="no">No</option>
                              </select>
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">
                                Gestore attuale
                              </label>
                              <select
                                className="form-select"
                                disabled={!hasOtherProvider}
                                value={otherProviderName}
                                onChange={(e) =>
                                  setOtherProviderName(e.target.value)
                                }
                              >
                                <option value="">Seleziona gestore…</option>
                                {GESTORI_OPTIONS.map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">
                                Interessato a diventare PVR?
                              </label>
                              <select
                                className="form-select"
                                value={
                                  pvrInterest === null
                                    ? ""
                                    : pvrInterest
                                    ? "yes"
                                    : "no"
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setPvrInterest(v === "" ? null : v === "yes");
                                  if (v !== "yes") setPvrConcessionario("");
                                }}
                              >
                                <option value="">Seleziona…</option>
                                <option value="yes">Sì</option>
                                <option value="no">No</option>
                              </select>
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">
                                Concessionario preferito
                              </label>
                              <select
                                className="form-select"
                                disabled={!pvrInterest}
                                value={pvrConcessionario}
                                onChange={(e) =>
                                  setPvrConcessionario(e.target.value)
                                }
                              >
                                <option value="">
                                  Seleziona concessionario…
                                </option>
                                {CONCESSIONARI_OPTIONS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SEZIONE DETTAGLI INTERVENTO */}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Tipo Intervento</label>
                        <select
                          className="form-select"
                          value={newIntervention.tipoIntervento}
                          onChange={handleNewInterventionFieldChange(
                            "tipoIntervento"
                          )}
                          disabled={!!newIntervention.nuovoStato}
                        >
                          <option value="Chiamata">📞 Chiamata</option>
                          <option value="Email">📧 Email</option>
                          <option value="Note">📝 Note</option>
                          <option value="Assegnazione">👤 Assegnazione</option>
                          <option value="Cambio Stato">🔄 Cambio Stato</option>
                          <option value="Altro">➕ Altro</option>
                        </select>
                        {newIntervention.nuovoStato && (
                          <small className="text-info">
                            <i className="fa-solid fa-info-circle me-1"></i>
                            Tipo automaticamente impostato su "Cambio Stato"
                          </small>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Esito Intervento</label>
                        <select
                          className="form-select"
                          value={newIntervention.esitoIntervento || ""}
                          onChange={handleNewInterventionFieldChange(
                            "esitoIntervento"
                          )}
                        >
                          <option value="">Seleziona esito...</option>
                          <option value="Positivo">✅ Positivo</option>
                          <option value="Negativo">❌ Negativo</option>
                          <option value="Neutrale">➖ Neutrale</option>
                          <option value="Da Ricontattare">
                            🔄 Da Ricontattare
                          </option>
                        </select>
                      </div>
                      {newIntervention.nuovoStato === "Chiuso" && (
                        <div className="col-md-4">
                          <label className="form-label">Esito finale *</label>
                          <select
                            className="form-select"
                            value={newIntervention.esitoChiusuraFinale || ""}
                            onChange={(e) =>
                              setNewIntervention((prev) => ({
                                ...prev,
                                esitoChiusuraFinale: e.target.value as
                                  | "Positivo"
                                  | "Negativo",
                              }))
                            }
                            required
                          >
                            <option value="">— seleziona —</option>
                            <option value="Positivo">Positivo</option>
                            <option value="Negativo">Negativo</option>
                          </select>
                          <small className="text-muted">
                            Obbligatorio quando imposti lo stato su{" "}
                            <b>Chiuso</b>.
                          </small>
                        </div>
                      )}

                      <div className="col-md-6">
                        <label className="form-label">Durata (minuti)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newIntervention.durata || ""}
                          onChange={handleNewInterventionFieldChange("durata")}
                          placeholder="es. 15"
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
                          onChange={handleNewInterventionFieldChange(
                            "dataProximoContatto"
                          )}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">
                          📝 Descrizione Intervento *
                          {newIntervention.nuovoStato && (
                            <span className="badge bg-warning text-dark ms-2">
                              Includi motivazione del cambio stato
                            </span>
                          )}
                        </label>
                        <textarea
                          className="form-control"
                          rows={newIntervention.nuovoStato ? 5 : 4}
                          value={newIntervention.descrizione}
                          onChange={handleNewInterventionFieldChange(
                            "descrizione"
                          )}
                          placeholder={
                            newIntervention.nuovoStato
                              ? `Descrivi l'intervento e MOTIVA il cambio stato da "${selectedTask.stato}" a "${newIntervention.nuovoStato}".\n\nEsempio: "Contattato cliente via telefono. Cliente ha confermato interesse e richiesto preventivo dettagliato. Procedo con elaborazione offerta commerciale."`
                              : "Descrivi cosa è stato fatto durante l'intervento..."
                          }
                          style={{
                            borderColor: newIntervention.nuovoStato
                              ? "#ffc107"
                              : "",
                            borderWidth: newIntervention.nuovoStato
                              ? "2px"
                              : "1px",
                          }}
                        ></textarea>
                        {newIntervention.nuovoStato && (
                          <div className="form-text text-warning">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            <strong>Richiesta motivazione:</strong> Spiega
                            dettagliatamente perché il task sta cambiando stato.
                            Questa informazione verrà registrata permanentemente
                            nella cronologia.
                          </div>
                        )}
                      </div>
                      {/* Proposta prodotto + valore potenziale */}
                      <div className="row g-3 mt-2">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">
                            Prodotto proposto (opzionale)
                          </label>
                          <select
                            className="form-select"
                            value={selectedProdottoId}
                            onChange={(e) => {
                              const v = e.target.value
                                ? parseInt(e.target.value, 10)
                                : "";
                              setSelectedProdottoId(
                                isNaN(Number(v)) ? "" : (v as number)
                              );
                              // se deseleziono, azzero il valore
                              if (v === "") setValorePotenzialeProdotto("");
                            }}
                            disabled={isLoadingProdotti}
                          >
                            <option value="">
                              {isLoadingProdotti
                                ? "Caricamento prodotti..."
                                : "Seleziona prodotto"}
                            </option>
                            {prodotti.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                          {errorProdotti && (
                            <small className="text-danger d-block mt-1">
                              {errorProdotti}
                            </small>
                          )}
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-bold">
                            Valore potenziale (€)
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0,00"
                            min={0}
                            step="0.01"
                            value={valorePotenzialeProdotto}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setValorePotenzialeProdotto(
                                raw === "" ? "" : Number(raw)
                              );
                            }}
                            disabled={selectedProdottoId === ""}
                          />
                          <small className="text-muted">
                            Attivo solo se selezioni un prodotto.
                          </small>
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label">
                          🎯 Prossima Azione Pianificata
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={newIntervention.prossimaAzione || ""}
                          onChange={handleNewInterventionFieldChange(
                            "prossimaAzione"
                          )}
                          placeholder={
                            newIntervention.nuovoStato === "Completato"
                              ? "es. Preparare chiusura definitiva del task"
                              : newIntervention.nuovoStato === "In Attesa"
                              ? "es. Attendere risposta cliente entro 3 giorni"
                              : "Cosa va fatto successivamente..."
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer bg-light">
                    <div className="w-100">
                      {/* Riepilogo azioni */}
                      <div className="alert alert-info py-2 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="fa-solid fa-info-circle fa-2x me-3"></i>
                          <div>
                            <strong>Riepilogo operazioni:</strong>
                            <ul className="mb-0 mt-1">
                              <li>
                                ✅ Registrazione intervento di tipo "
                                {newIntervention.tipoIntervento}"
                              </li>

                              {newIntervention.nuovoStato ? (
                                <li className="text-warning">
                                  <strong>
                                    🔄 Cambio stato: da "{selectedTask.stato}" a
                                    "{newIntervention.nuovoStato}"
                                  </strong>
                                </li>
                              ) : (
                                <li>➖ Nessun cambio stato</li>
                              )}

                              <li>📝 Aggiornamento cronologia task</li>

                              {selectedProdottoId !== "" && (
                                <li>
                                  🛒 Proposta prodotto:{" "}
                                  <strong>
                                    {
                                      prodotti.find(
                                        (p) => p.id === selectedProdottoId
                                      )?.nome
                                    }
                                  </strong>
                                  {typeof valorePotenzialeProdotto ===
                                    "number" && !isNaN(valorePotenzialeProdotto)
                                    ? ` (valore potenziale € ${valorePotenzialeProdotto.toFixed(
                                        2
                                      )})`
                                    : ""}
                                </li>
                              )}

                              {/* ⬇️ RIEPILOGO DATI PRIMO CONTATTO (solo al 1° intervento) */}
                              {(selectedTask?.interventI?.length ?? 0) ===
                                0 && (
                                <>
                                  {hasOtherProvider !== null && (
                                    <li>
                                      📌 Servizi con altri gestori:{" "}
                                      <strong>
                                        {hasOtherProvider ? "Sì" : "No"}
                                      </strong>
                                      {hasOtherProvider && otherProviderName
                                        ? ` — ${otherProviderName}`
                                        : ""}
                                    </li>
                                  )}
                                  {pvrInterest !== null && (
                                    <li>
                                      🎯 Interesse PVR:{" "}
                                      <strong>
                                        {pvrInterest ? "Sì" : "No"}
                                      </strong>
                                      {pvrInterest && pvrConcessionario
                                        ? ` — ${pvrConcessionario}`
                                        : ""}
                                    </li>
                                  )}
                                </>
                              )}
                              {/* ⬆️ FINE BLOCCO PRIMO CONTATTO */}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Pulsanti azione */}
                      <div className="d-flex justify-content-between">
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            resetInterventionForm();
                            setShowAddInterventionModal(false);
                          }}
                        >
                          <i className="fa-solid fa-times me-1"></i>
                          Annulla
                        </button>
                        <button
                          className={`btn ${
                            newIntervention.nuovoStato
                              ? "btn-warning"
                              : "btn-success"
                          } px-4`}
                          onClick={saveIntervention}
                          disabled={
                            !newIntervention.descrizione.trim() || isLoading
                          }
                        >
                          <i
                            className={`fa-solid ${
                              isLoading
                                ? "fa-spinner fa-spin"
                                : newIntervention.nuovoStato
                                ? "fa-exchange-alt"
                                : "fa-save"
                            } me-2`}
                          ></i>
                          {isLoading
                            ? "Elaborazione..."
                            : newIntervention.nuovoStato
                            ? `Registra e Cambia Stato`
                            : "Registra Intervento"}
                        </button>
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

export default TaskManagement;
