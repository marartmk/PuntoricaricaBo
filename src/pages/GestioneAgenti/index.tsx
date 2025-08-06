import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./gestione-agenti.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// ✅ INTERFACCE API BACKEND
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

// interface AgenteCreateDto {
//   codiceAgente: string;
//   nome: string;
//   cognome: string;
//   email?: string;
//   telefono?: string;
//   indirizzo?: string;
//   citta?: string;
//   provincia?: string;
//   cap?: string;
// }

interface TipoAttivita {
  id: number;
  nome: string;
}

interface EsitoAttivita {
  id: number;
  nome: string;
}

interface Prodotto {
  id: number;
  nome: string;
}

interface MotivoNonProduzione {
  id: number;
  nome: string;
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

// ✅ INTERFACCE ATTIVITÀ AGENTI (da implementare nel backend)
interface AttivitaAgente {
  id: string;
  idAgente: string;
  settimana: string;
  giorno: string;
  data: string;
  tipoAttivita: string;
  cliente?: string;
  obiettivo?: string;
  esito?: string;
  durata?: number;
  note?: string;
  valorePotenziale?: number | null;
  followUp?: string;
  statoProduzione: boolean;
  prodottoSelezionato?: string;
  motivoNonProduzione?: string;
  trasferta?: boolean;
  dataInserimento: string;
  dataUltimaModifica?: string;
  nomeAgente: string;
  cognomeAgente: string;
}

interface AttivitaAgenteCreateDto {
  settimana: string;
  giorno: string;
  data: string;
  agenteId: string; // ID (dal select agente)
  tipoAttivitaId: number; // ID (dal select tipoAttivita)
  cliente: string;
  obiettivo: string;
  esitoId: number; // ID (dal select esito)
  durata: number;
  note: string;
  valorePotenziale: number | null;
  followUp: string;
  statoProduzione: boolean;
  prodottoId?: number; // ID (dal select prodotto)
  motivoNonProduzioneId?: number; // ID (dal select motivo)
  trasferta?: boolean;
}

interface StatisticheAgenti {
  totaleAttivita: number;
  totaleDurata: number;
  valoreTotal: number;
  attivitaCompletate: number;
  percentualeCompletate: number;
}

const GestioneAgenti: React.FC = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ STATI PER DATI REALI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [tipiAttivita, setTipiAttivita] = useState<TipoAttivita[]>([]);
  const [esiti, setEsiti] = useState<EsitoAttivita[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [motiviNonProduzione, setMotiviNonProduzione] = useState<
    MotivoNonProduzione[]
  >([]);
  const [attivita, setAttivita] = useState<AttivitaAgente[]>([]);

  // ✅ STATI DI LOADING E ERRORI
  const [isLoadingAgenti, setIsLoadingAgenti] = useState<boolean>(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState<boolean>(false);
  const [isLoadingAttivita, setIsLoadingAttivita] = useState<boolean>(false);
  const [errorAgenti, setErrorAgenti] = useState<string>("");
  const [errorLookups, setErrorLookups] = useState<string>("");
  const [errorAttivita, setErrorAttivita] = useState<string>("");

  // ✅ STATI PER FILTRI
  const [settimanaSelezionata, setSettimanaSelezionata] =
    useState<string>("Tutte");
  const [giornoSelezionato, setGiornoSelezionato] = useState<string>("Tutti");
  const [agenteSelezionato, setAgenteSelezionato] = useState<string>("Tutti");
  const [mostraFormAggiunta, setMostraFormAggiunta] = useState<boolean>(false);

  const defaultNuovaAttivita: AttivitaAgenteCreateDto = {
    settimana: "",
    giorno: "",
    data: "",
    agenteId: "",
    tipoAttivitaId: 0,
    cliente: "",
    obiettivo: "",
    esitoId: 0,
    durata: 0,
    note: "",
    valorePotenziale: null,
    followUp: "Da fare",
    statoProduzione: false,
    trasferta: false,
  };

  // ✅ FORM NUOVA ATTIVITÀ
  const [nuovaAttivita, setNuovaAttivita] =
    useState<AttivitaAgenteCreateDto>(defaultNuovaAttivita);

  // ✅ HELPER PER TOKEN AUTH
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

  // ✅ FUNZIONI API - AGENTI
  const fetchAgenti = async () => {
    setIsLoadingAgenti(true);
    setErrorAgenti("");
    console.log("📡 Iniziando caricamento agenti...");

    try {
      const headers = getAuthHeaders();
      console.log("🔐 Headers:", headers);

      const url = `${API_URL}/api/Agenti?pageSize=1000`;
      console.log("🌐 URL chiamata:", url);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        const errorText = await response.text();
        console.error("❌ Errore response:", errorText);
        throw new Error(
          `Errore nel caricamento agenti: ${response.status} - ${errorText}`
        );
      }

      const data: ApiResponseDto<PaginatedResponse<AgenteDto>> =
        await response.json();
      console.log("📊 Dati ricevuti agenti:", data);

      if (data.success && data.data && data.data.items) {
        console.log("✅ Agenti caricati:", data.data.items.length);
        setAgenti(data.data.items);
      } else {
        console.error("❌ Struttura dati non valida:", data);
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento agenti:", error);

      // ✅ FALLBACK: Usa dati fake se API non funziona
      console.warn("🔄 Usando dati fake per agenti...");
      const agentiFake: AgenteDto[] = [
        {
          id: "fake-1",
          codiceAgente: "AGE001",
          nome: "Luca",
          cognome: "Rossi",
          email: "l.rossi@test.com",
          telefono: "123456789",
          attivo: true,
          dataInserimento: new Date().toISOString(),
        },
        {
          id: "fake-2",
          codiceAgente: "AGE002",
          nome: "Anna",
          cognome: "Verdi",
          email: "a.verdi@test.com",
          telefono: "987654321",
          attivo: true,
          dataInserimento: new Date().toISOString(),
        },
        {
          id: "fake-3",
          codiceAgente: "AGE003",
          nome: "Mario",
          cognome: "Bianchi",
          email: "m.bianchi@test.com",
          telefono: "456789123",
          attivo: true,
          dataInserimento: new Date().toISOString(),
        },
      ];

      setAgenti(agentiFake);

      if (error instanceof Error) {
        setErrorAgenti(`API Error: ${error.message} (usando dati fake)`);
      } else {
        setErrorAgenti(
          "Errore imprevisto nel caricamento agenti (usando dati fake)"
        );
      }
    } finally {
      setIsLoadingAgenti(false);
    }
  };

  // ✅ FUNZIONI API - LOOKUPS
  const fetchLookups = async () => {
    setIsLoadingLookups(true);
    setErrorLookups("");
    console.log("📡 Caricamento lookups...");

    try {
      const headers = getAuthHeaders();

      // Chiamate parallele per tutti i lookup
      const urls = {
        tipi: `${API_URL}/api/Lookup/tipi-attivita`,
        esiti: `${API_URL}/api/Lookup/esiti`,
        prodotti: `${API_URL}/api/Lookup/prodotti`,
        motivi: `${API_URL}/api/Lookup/motivi-non-produzione`,
      };

      const [tipiResponse, esitiResponse, prodottiResponse, motiviResponse] =
        await Promise.all([
          fetch(urls.tipi, { method: "GET", headers }),
          fetch(urls.esiti, { method: "GET", headers }),
          fetch(urls.prodotti, { method: "GET", headers }),
          fetch(urls.motivi, { method: "GET", headers }),
        ]);

      console.log("📡 Lookups responses:", {
        tipi: tipiResponse.status,
        esiti: esitiResponse.status,
        prodotti: prodottiResponse.status,
        motivi: motiviResponse.status,
      });

      // Verifica risposte
      if (
        !tipiResponse.ok ||
        !esitiResponse.ok ||
        !prodottiResponse.ok ||
        !motiviResponse.ok
      ) {
        throw new Error("Errore nel caricamento dei dati di lookup");
      }

      // Parse JSON
      const [tipiData, esitiData, prodottiData, motiviData] = await Promise.all(
        [
          tipiResponse.json() as Promise<ApiResponseDto<TipoAttivita[]>>,
          esitiResponse.json() as Promise<ApiResponseDto<EsitoAttivita[]>>,
          prodottiResponse.json() as Promise<ApiResponseDto<Prodotto[]>>,
          motiviResponse.json() as Promise<
            ApiResponseDto<MotivoNonProduzione[]>
          >,
        ]
      );

      // Aggiorna stati
      if (tipiData.success && tipiData.data) {
        console.log("✅ Tipi attività:", tipiData.data.length);
        console.log(
          "📋 Lista tipi attività:",
          tipiData.data.map((t) => `${t.id}: "${t.nome}"`)
        );
        setTipiAttivita(tipiData.data);
      }
      if (esitiData.success && esitiData.data) {
        console.log("✅ Esiti:", esitiData.data.length);
        setEsiti(esitiData.data);
      }
      if (prodottiData.success && prodottiData.data) {
        console.log("✅ Prodotti:", prodottiData.data.length);
        setProdotti(prodottiData.data);
      }
      if (motiviData.success && motiviData.data) {
        console.log("✅ Motivi:", motiviData.data.length);
        setMotiviNonProduzione(motiviData.data);
      }
    } catch (error) {
      console.error("🚨 Errore caricamento lookups:", error);

      if (error instanceof Error) {
        setErrorLookups(error.message);
      } else {
        setErrorLookups("Errore imprevisto nel caricamento dei dati");
      }
    } finally {
      setIsLoadingLookups(false);
    }
  };

  // ✅ FUNZIONI API - ATTIVITÀ
  const fetchAttivita = async () => {
    setIsLoadingAttivita(true);
    setErrorAttivita("");

    try {
      const response = await fetch(`${API_URL}/api/AttivitaAgenti`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Errore caricamento attività: ${response.status}`);
      }

      const data: AttivitaAgente[] = await response.json();
      setAttivita(data);
    } catch (error) {
      console.error("🚨 Errore caricamento attività:", error);
      if (error instanceof Error) {
        setErrorAttivita(error.message);
      } else {
        setErrorAttivita("Errore imprevisto nel caricamento attività");
      }
    } finally {
      setIsLoadingAttivita(false);
    }
  };

  // ✅ FUNZIONE PER SALVARE NUOVA ATTIVITÀ
  const salvaAttivita = async () => {
    if (!nuovaAttivita.agenteId || !nuovaAttivita.data) {
      alert("Compila i campi obbligatori");
      return;
    }

    // Trovo i valori string dai lookup
    const tipo = tipiAttivita.find(
      (t) => t.id === nuovaAttivita.tipoAttivitaId
    );
    const esito = esiti.find((e) => e.id === nuovaAttivita.esitoId);
    const prodotto = prodotti.find((p) => p.id === nuovaAttivita.prodottoId);
    const motivo = motiviNonProduzione.find(
      (m) => m.id === nuovaAttivita.motivoNonProduzioneId
    );

    // Costruisco payload conforme al BE
    const payload = {
      idAgente: nuovaAttivita.agenteId,
      settimana: nuovaAttivita.settimana,
      giorno: nuovaAttivita.giorno,
      data: nuovaAttivita.data,
      tipoAttivita: tipo?.nome || "",
      cliente: nuovaAttivita.cliente,
      obiettivo: nuovaAttivita.obiettivo,
      esito: esito?.nome || "",
      durata: nuovaAttivita.durata,
      note: nuovaAttivita.note,
      valorePotenziale: nuovaAttivita.valorePotenziale,
      followUp: nuovaAttivita.followUp,
      statoProduzione: nuovaAttivita.statoProduzione,
      prodottoSelezionato: prodotto?.nome || undefined,
      motivoNonProduzione: motivo?.nome || undefined,
      trasferta: nuovaAttivita.trasferta,
    };

    console.log("📤 Payload inviato:", payload);

    try {
      const response = await fetch(`${API_URL}/api/AttivitaAgenti`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Errore salvataggio attività: ${response.status}`);
      }

      await fetchAttivita();
      setMostraFormAggiunta(false);
      alert("Attività salvata con successo!");
    } catch (error) {
      console.error("🚨 Errore salvataggio attività:", error);
      alert("Errore nel salvataggio dell'attività");
    }
  };

  // ✅ CARICAMENTO DATI ALL'AVVIO
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    // Verifica che API_URL sia configurato
    if (!API_URL) {
      setErrorAgenti("VITE_API_URL non configurato nel file .env");
      setErrorLookups("VITE_API_URL non configurato nel file .env");
      return;
    }

    // Verifica token di autenticazione
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorAgenti("Token di autenticazione non trovato. Effettua il login.");
      setErrorLookups(
        "Token di autenticazione non trovato. Effettua il login."
      );
      return;
    }

    // Carica dati
    fetchAgenti();
    fetchLookups();
  }, [API_URL]);

  // ✅ CARICA ATTIVITÀ QUANDO I DATI SONO PRONTI
  useEffect(() => {
    // Carica attività solo se i lookup sono disponibili
    // (non importa se ci sono 0 agenti - è normale all'inizio)
    if (tipiAttivita.length > 0 && esiti.length > 0) {
      console.log("📋 Lookup pronti, carico attività...");
      fetchAttivita();
    }
  }, [tipiAttivita, esiti]);

  // ✅ GESTIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // ✅ HELPER FUNCTIONS
  const getWeekNumber = (date: Date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    return (
      tempDate.getFullYear() +
      "-W" +
      String(
        1 +
          Math.round(
            ((tempDate.getTime() - week1.getTime()) / 86400000 -
              3 +
              ((week1.getDay() + 6) % 7)) /
              7
          )
      ).padStart(2, "0")
    );
  };

  const getItalianDay = (date: Date) => {
    const giorni = [
      "Domenica",
      "Lunedì",
      "Martedì",
      "Mercoledì",
      "Giovedì",
      "Venerdì",
      "Sabato",
    ];
    return giorni[date.getDay()];
  };

  // ✅ GESTORI DI EVENTI
  const handleStatoProduzioneChange = (isProduction: boolean) => {
    setNuovaAttivita({
      ...nuovaAttivita,
      statoProduzione: isProduction,
      prodottoId: isProduction ? undefined : nuovaAttivita.prodottoId,
      motivoNonProduzioneId: !isProduction
        ? undefined
        : nuovaAttivita.motivoNonProduzioneId,
    });
  };

  const handleTipoAttivitaChange = (tipoId: number) => {
    const tipo = tipiAttivita.find((t) => t.id === tipoId);
    const isFuoriSede = tipo?.nome.toLowerCase().includes("fuori") || false;

    console.log("🔧 Tipo attività cambiato:", {
      tipoId,
      nome: tipo?.nome,
      isFuoriSede,
      tipiDisponibili: tipiAttivita.map((t) => `${t.id}: ${t.nome}`),
    });

    setNuovaAttivita({
      ...nuovaAttivita,
      tipoAttivitaId: tipoId,
      // Reset trasferta se non è "Fuori sede"
      trasferta: isFuoriSede ? nuovaAttivita.trasferta || false : false,
    });
  };

  // ✅ DATI FILTRATI E STATISTICHE
  const settimaneUniche = useMemo(
    () => [...new Set(attivita.map((item) => item.settimana))].sort(),
    [attivita]
  );

  const giorniUnici = useMemo(
    () => [
      "Lunedì",
      "Martedì",
      "Mercoledì",
      "Giovedì",
      "Venerdì",
      "Sabato",
      "Domenica",
    ],
    []
  );

  const datiFiltrati = useMemo(() => {
    return attivita.filter((item) => {
      const matchSettimana =
        settimanaSelezionata === "Tutte" ||
        item.settimana === settimanaSelezionata;
      const matchGiorno =
        giornoSelezionato === "Tutti" || item.giorno === giornoSelezionato;
      const matchAgente =
        agenteSelezionato === "Tutti" || item.idAgente === agenteSelezionato;
      return matchSettimana && matchGiorno && matchAgente;
    });
  }, [attivita, settimanaSelezionata, giornoSelezionato, agenteSelezionato]);

  const statistiche = useMemo((): StatisticheAgenti => {
    const totaleDurata = datiFiltrati.reduce<number>(
      (sum, item) => sum + (item.durata ?? 0),
      0
    );

    const valoreTotal = datiFiltrati.reduce<number>(
      (sum, item) => sum + (item.valorePotenziale ?? 0),
      0
    );

    const attivitaCompletate = datiFiltrati.filter(
      (item) => item.followUp === "Completato"
    ).length;

    return {
      totaleAttivita: datiFiltrati.length,
      totaleDurata,
      valoreTotal,
      attivitaCompletate,
      percentualeCompletate:
        datiFiltrati.length > 0
          ? parseFloat(
              ((attivitaCompletate / datiFiltrati.length) * 100).toFixed(1)
            )
          : 0,
    };
  }, [datiFiltrati]);

  // ✅ BADGE FUNCTIONS
  const getBadgeClass = (followUp: string) => {
    switch (followUp) {
      case "Completato":
        return "badge bg-success";
      case "In corso":
        return "badge bg-warning text-dark";
      case "Da fare":
        return "badge bg-danger";
      default:
        return "badge bg-secondary";
    }
  };

  const getTipoAttivitaBadgeClass = (tipo: string) => {
    switch (tipo) {
      case "Fuori sede":
        return "badge bg-primary";
      case "In sede":
        return "badge bg-info";
      case "Telefonico":
        return "badge bg-secondary";
      case "Online":
        return "badge bg-success";
      default:
        return "badge bg-light text-dark";
    }
  };

  const getStatoProduzioneBadgeClass = (statoProduzione: boolean) => {
    return statoProduzione ? "badge bg-success" : "badge bg-warning text-dark";
  };

  const getProdottoBadgeClass = (prodotto: string) => {
    switch (prodotto) {
      case "Sunmi":
        return "badge bg-primary";
      case "Apay Station":
        return "badge bg-info";
      case "Piatt.Web":
        return "badge bg-success";
      case "Apay Gaming":
        return "badge bg-warning text-dark";
      default:
        return "badge bg-secondary";
    }
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } gestione-agenti-page`}
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

          {/* Alert stato database vuoto */}
          {agenti.length === 0 && !isLoadingAgenti && !errorAgenti && (
            <div className="alert alert-warning mb-4" role="alert">
              <i className="fa-solid fa-database me-2"></i>
              <strong>Database vuoto:</strong> Non ci sono agenti nel sistema.
              <button
                className="btn btn-link p-0 ms-2"
                onClick={() => navigate("/agenti")}
              >
                Vai alla gestione agenti →
              </button>
            </div>
          )}

          {/* Header con breadcrumb */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate("/dashboard")}
                    >
                      <i className="fa-solid fa-home me-1"></i>
                      Dashboard
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Gestione Agenti
                  </li>
                </ol>
              </nav>
              <h2 className="gestione-agenti-title">
                <i className="fa-solid fa-users me-2"></i>
                Gestione Agenti - Foglio Lavoro
              </h2>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={() => {
                  setNuovaAttivita(defaultNuovaAttivita); // ✅ reset valori
                  setMostraFormAggiunta(true); // ✅ apri form
                }}
                disabled={tipiAttivita.length === 0}
                title={
                  tipiAttivita.length === 0
                    ? "Dati di lookup non disponibili"
                    : agenti.length === 0
                    ? "⚠️ Nessun agente nel sistema - dovrai prima aggiungere agenti"
                    : "Aggiungi nuova attività"
                }
              >
                <i className="fa-solid fa-plus me-1"></i>
                Aggiungi Attività
              </button>

              <button
                className="btn btn-outline-success"
                onClick={() => navigate("/agenti")}
                title="Gestisci anagrafica agenti"
              >
                <i className="fa-solid fa-user-plus me-1"></i>
                Gestisci Agenti
              </button>
              <button className="btn btn-outline-primary-dark">
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={() => {
                  fetchAgenti();
                  fetchLookups();
                  fetchAttivita();
                }}
                disabled={
                  isLoadingAgenti || isLoadingLookups || isLoadingAttivita
                }
              >
                <i
                  className={`fa-solid ${
                    isLoadingAgenti || isLoadingLookups || isLoadingAttivita
                      ? "fa-spinner fa-spin"
                      : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Alert errori */}
          {(errorAgenti || errorLookups || errorAttivita) && (
            <div className="alert alert-danger mb-4" role="alert">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>Errori di caricamento:</strong>
              <ul className="mb-0 mt-2">
                {errorAgenti && <li>Agenti: {errorAgenti}</li>}
                {errorLookups && <li>Dati di lookup: {errorLookups}</li>}
                {errorAttivita && <li>Attività: {errorAttivita}</li>}
              </ul>
            </div>
          )}

          {/* Alert caricamento */}
          {(isLoadingAgenti || isLoadingLookups || isLoadingAttivita) && (
            <div className="alert alert-info mb-4" role="alert">
              <i className="fa-solid fa-spinner fa-spin me-2"></i>
              Caricamento dati in corso...
              {isLoadingAgenti && " [Agenti]"}
              {isLoadingLookups && " [Lookup]"}
              {isLoadingAttivita && " [Attività]"}
            </div>
          )}

          {/* Sezione Filtri */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Filtri di Ricerca</span>
                  <i className="fa-solid fa-filter"></i>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Settimana</label>
                      <select
                        className="form-select"
                        value={settimanaSelezionata}
                        onChange={(e) =>
                          setSettimanaSelezionata(e.target.value)
                        }
                      >
                        <option value="Tutte">Tutte le settimane</option>
                        {settimaneUniche.map((settimana) => (
                          <option key={settimana} value={settimana}>
                            {settimana}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Giorno</label>
                      <select
                        className="form-select"
                        value={giornoSelezionato}
                        onChange={(e) => setGiornoSelezionato(e.target.value)}
                      >
                        <option value="Tutti">Tutti i giorni</option>
                        {giorniUnici.map((giorno) => (
                          <option key={giorno} value={giorno}>
                            {giorno}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Agente</label>
                      <select
                        className="form-select"
                        value={agenteSelezionato}
                        onChange={(e) => setAgenteSelezionato(e.target.value)}
                      >
                        <option value="Tutti">Tutti gli agenti</option>
                        {agenti.map((agente) => (
                          <option key={agente.id} value={agente.id}>
                            {agente.nome} {agente.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiche */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card bg-primary text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.totaleAttivita}</h3>
                  <small>Attività Totali</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-success text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.totaleDurata}h</h3>
                  <small>Ore Totali</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-info text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">
                    €{statistiche.valoreTotal.toLocaleString()}
                  </h3>
                  <small>Valore Potenziale</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-warning text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.percentualeCompletate}%</h3>
                  <small>Completate</small>
                </div>
              </div>
            </div>
          </div>

          {/* Form Aggiunta Attività */}
          {mostraFormAggiunta && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="custom-card-header">
                    <span>Nuova Attività</span>
                    <i className="fa-solid fa-plus"></i>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {/* Data */}
                      <div className="col-md-4">
                        <label className="form-label">Data *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={nuovaAttivita.data}
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              data: e.target.value,
                              settimana: getWeekNumber(selectedDate),
                              giorno: getItalianDay(selectedDate),
                            });
                          }}
                        />
                      </div>

                      {/* Settimana (readonly) */}
                      <div className="col-md-4">
                        <label className="form-label">Settimana</label>
                        <input
                          type="text"
                          className="form-control"
                          value={nuovaAttivita.settimana}
                          readOnly
                        />
                      </div>

                      {/* Giorno (readonly) */}
                      <div className="col-md-4">
                        <label className="form-label">Giorno</label>
                        <input
                          type="text"
                          className="form-control"
                          value={nuovaAttivita.giorno}
                          readOnly
                        />
                      </div>

                      {/* Agente */}
                      <div className="col-md-4">
                        <label className="form-label">Agente *</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.agenteId}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              agenteId: e.target.value,
                            })
                          }
                        >
                          <option value="">
                            {agenti.length === 0
                              ? "⚠️ Nessun agente disponibile"
                              : "Seleziona agente"}
                          </option>
                          {agenti.map((agente) => (
                            <option key={agente.id} value={agente.id}>
                              {agente.nome} {agente.cognome}
                            </option>
                          ))}
                        </select>
                        {agenti.length === 0 && (
                          <small className="text-warning">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            Devi prima aggiungere agenti al sistema.{" "}
                            <button
                              className="btn btn-link p-0 text-warning"
                              onClick={() => navigate("/agenti")}
                            >
                              Vai alla gestione agenti
                            </button>
                          </small>
                        )}
                      </div>

                      {/* Tipo Attività */}
                      <div className="col-md-4">
                        <label className="form-label">Tipo Attività</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.tipoAttivitaId}
                          onChange={(e) =>
                            handleTipoAttivitaChange(parseInt(e.target.value))
                          }
                        >
                          <option value="0">Seleziona tipo</option>
                          {tipiAttivita.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>
                              {tipo.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cliente */}
                      <div className="col-md-4">
                        <label className="form-label">Cliente/Prospect</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Nome cliente"
                          value={nuovaAttivita.cliente}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              cliente: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Trasferta - SEMPRE VISIBILE ma condizionale */}
                      <div className="col-md-4">
                        <label className="form-label">
                          Trasferta Richiesta
                        </label>
                        <div className="d-flex align-items-center gap-3 mt-2">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id="trasferta"
                              checked={nuovaAttivita.trasferta || false}
                              onChange={(e) =>
                                setNuovaAttivita({
                                  ...nuovaAttivita,
                                  trasferta: e.target.checked,
                                })
                              }
                              disabled={
                                !nuovaAttivita.tipoAttivitaId ||
                                !tipiAttivita
                                  .find(
                                    (t) => t.id === nuovaAttivita.tipoAttivitaId
                                  )
                                  ?.nome.toLowerCase()
                                  .includes("fuori")
                              }
                              style={{ transform: "scale(1.2)" }}
                            />
                            <label
                              className="form-check-label fw-bold ms-2"
                              htmlFor="trasferta"
                            >
                              {nuovaAttivita.trasferta ? (
                                <span className="text-info">
                                  <i className="fa-solid fa-plane me-1"></i>
                                  TRASFERTA - SÌ
                                </span>
                              ) : (
                                <span className="text-secondary">
                                  <i className="fa-solid fa-building me-1"></i>
                                  TRASFERTA - NO
                                </span>
                              )}
                            </label>
                          </div>
                        </div>
                        {!nuovaAttivita.tipoAttivitaId ? (
                          <small className="text-muted">
                            <i className="fa-solid fa-info-circle me-1"></i>
                            Seleziona prima il tipo di attività
                          </small>
                        ) : !tipiAttivita
                            .find((t) => t.id === nuovaAttivita.tipoAttivitaId)
                            ?.nome.toLowerCase()
                            .includes("fuori") ? (
                          <small className="text-muted">
                            <i className="fa-solid fa-info-circle me-1"></i>
                            Trasferta disponibile solo per attività "Fuori sede"
                            {tipiAttivita.length > 0 && (
                              <span className="d-block mt-1">
                                Tipi disponibili:{" "}
                                {tipiAttivita.map((t) => t.nome).join(", ")}
                              </span>
                            )}
                          </small>
                        ) : null}
                      </div>

                      {/* Stato Produzione */}
                      <div className="col-md-6">
                        <label className="form-label">Stato Produzione</label>
                        <div className="d-flex align-items-center gap-3 mt-2">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id="statoProduzione"
                              checked={nuovaAttivita.statoProduzione}
                              onChange={(e) =>
                                handleStatoProduzioneChange(e.target.checked)
                              }
                              style={{ transform: "scale(1.2)" }}
                            />
                            <label
                              className="form-check-label fw-bold ms-2"
                              htmlFor="statoProduzione"
                            >
                              {nuovaAttivita.statoProduzione ? (
                                <span className="text-success">
                                  <i className="fa-solid fa-check me-1"></i>
                                  PRODUZIONE - SÌ
                                </span>
                              ) : (
                                <span className="text-warning">
                                  <i className="fa-solid fa-times me-1"></i>
                                  PRODUZIONE - NO
                                </span>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Prodotto (se produzione = true) */}
                      {nuovaAttivita.statoProduzione && (
                        <div className="col-md-6">
                          <label className="form-label">
                            Prodotto Selezionato
                          </label>
                          <select
                            className="form-select"
                            value={nuovaAttivita.prodottoId || ""}
                            onChange={(e) =>
                              setNuovaAttivita({
                                ...nuovaAttivita,
                                prodottoId: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              })
                            }
                          >
                            <option value="">Seleziona prodotto</option>
                            {prodotti.map((prodotto) => (
                              <option key={prodotto.id} value={prodotto.id}>
                                {prodotto.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Motivo Non Produzione (se produzione = false) */}
                      {!nuovaAttivita.statoProduzione && (
                        <div className="col-md-6">
                          <label className="form-label">
                            Motivo Non Produzione
                          </label>
                          <select
                            className="form-select"
                            value={nuovaAttivita.motivoNonProduzioneId || ""}
                            onChange={(e) =>
                              setNuovaAttivita({
                                ...nuovaAttivita,
                                motivoNonProduzioneId: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              })
                            }
                          >
                            <option value="">Seleziona motivo</option>
                            {motiviNonProduzione.map((motivo) => (
                              <option key={motivo.id} value={motivo.id}>
                                {motivo.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Obiettivo */}
                      <div className="col-md-4">
                        <label className="form-label">Obiettivo</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Obiettivo attività"
                          value={nuovaAttivita.obiettivo}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              obiettivo: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Esito */}
                      <div className="col-md-4">
                        <label className="form-label">Esito</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.esitoId}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              esitoId: parseInt(e.target.value),
                            })
                          }
                        >
                          <option value="0">Seleziona esito</option>
                          {esiti.map((esito) => (
                            <option key={esito.id} value={esito.id}>
                              {esito.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Durata */}
                      <div className="col-md-4">
                        <label className="form-label">Durata (ore)</label>
                        <input
                          type="number"
                          step="0.5"
                          className="form-control"
                          placeholder="0.0"
                          value={nuovaAttivita.durata}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              durata: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      {/* Valore Potenziale */}
                      <div className="col-md-4">
                        <label className="form-label">
                          Valore Potenziale (€)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          value={nuovaAttivita.valorePotenziale || ""}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              valorePotenziale: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            })
                          }
                        />
                      </div>

                      {/* Follow-up */}
                      <div className="col-md-4">
                        <label className="form-label">Follow-up</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.followUp}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              followUp: e.target.value,
                            })
                          }
                        >
                          <option value="Da fare">Da fare</option>
                          <option value="In corso">In corso</option>
                          <option value="Completato">Completato</option>
                        </select>
                      </div>

                      {/* Note */}
                      <div className="col-12">
                        <label className="form-label">Note/Dettagli</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Note aggiuntive..."
                          value={nuovaAttivita.note}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              note: e.target.value,
                            })
                          }
                        ></textarea>
                      </div>
                    </div>

                    {/* Pulsanti Form */}
                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={salvaAttivita}
                      >
                        <i className="fa-solid fa-save me-1"></i>
                        Salva Attività
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setMostraFormAggiunta(false)}
                      >
                        <i className="fa-solid fa-times me-1"></i>
                        Annulla
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabella Attività */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>
                    Attività Filtrate ({datiFiltrati.length} risultati)
                  </span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-table"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-download"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {datiFiltrati.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Settimana</th>
                            <th>Giorno</th>
                            <th>Data</th>
                            <th>Agente</th>
                            <th>Tipo</th>
                            <th>Cliente</th>
                            <th>Obiettivo</th>
                            <th>Esito</th>
                            <th>Durata</th>
                            <th>Valore €</th>
                            <th>Follow-up</th>
                            <th>Produzione</th>
                            <th>Prodotto/Motivo</th>
                            <th>Trasferta</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiFiltrati.map((item, index) => (
                            <tr key={item.id || index}>
                              <td>{item.settimana}</td>
                              <td>{item.giorno}</td>
                              <td>{item.data}</td>
                              <td className="fw-bold">
                                {item.nomeAgente} {item.cognomeAgente}
                              </td>
                              <td>
                                <span
                                  className={getTipoAttivitaBadgeClass(
                                    item.tipoAttivita
                                  )}
                                >
                                  {item.tipoAttivita}
                                </span>
                              </td>
                              <td>{item.cliente}</td>
                              <td>{item.obiettivo}</td>
                              <td>{item.esito}</td>
                              <td>{item.durata}h</td>
                              <td>
                                {item.valorePotenziale
                                  ? `€${item.valorePotenziale.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td>
                                <span
                                  className={getBadgeClass(item.followUp ?? "")}
                                >
                                  {item.followUp ?? "-"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={getStatoProduzioneBadgeClass(
                                    item.statoProduzione
                                  )}
                                >
                                  {item.statoProduzione ? "SÌ" : "NO"}
                                </span>
                              </td>
                              <td>
                                {item.statoProduzione ? (
                                  item.prodottoSelezionato ? (
                                    <span
                                      className={getProdottoBadgeClass(
                                        item.prodottoSelezionato
                                      )}
                                    >
                                      {item.prodottoSelezionato}
                                    </span>
                                  ) : (
                                    "-"
                                  )
                                ) : item.motivoNonProduzione ? (
                                  <span className="badge bg-secondary">
                                    {item.motivoNonProduzione}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {item.trasferta !== undefined ? (
                                  item.trasferta ? (
                                    <span className="badge bg-info">
                                      <i className="fa-solid fa-plane me-1"></i>
                                      SÌ
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">
                                      <i className="fa-solid fa-building me-1"></i>
                                      NO
                                    </span>
                                  )
                                ) : (
                                  <span className="badge bg-light text-dark">
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td>{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-search fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessuna attività trovata</h5>
                      <p className="text-muted">
                        {isLoadingAttivita
                          ? "Caricamento dati in corso..."
                          : "Nessuna attività corrisponde ai filtri selezionati."}
                      </p>
                    </div>
                  )}
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
    </div>
  );
};

export default GestioneAgenti;
