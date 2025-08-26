import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./anagrafica-agenti.css";
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

interface AgenteCreateDto {
  codiceAgente: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
}

interface AgenteUpdateDto {
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

interface StatisticheAgenti {
  totaleAgenti: number;
  agentiAttivi: number;
  agentiNonAttivi: number;
  percentualeAttivi: number;
}

interface ErroriValidazione {
  codiceAgente?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
}

// --- DTO/Types per gestione account ---
interface UserDto {
  id: string;
  idUser: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isEnabled: boolean;
  accessLevel?: string;
  twoFactorEnabled?: boolean;
}

interface UserExistsResponse {
  success: boolean;
  message: string;
  data: { exists: boolean; user?: UserDto };
}

type Ruolo = "Admin" | "User";

const AnagraficaAgenti: React.FC = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ STATI PER DATI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // ✅ STATI PER FILTRI E RICERCA
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Tutti");
  const [provinciaFilter, setProvinciaFilter] = useState<string>("Tutte");

  // ✅ STATI PER PAGINAZIONE
  const [recordPerPagina, setRecordPerPagina] = useState<number>(10);
  const [paginaCorrente, setPaginaCorrente] = useState<number>(1);

  // ✅ STATI PER FORM
  const [mostraForm, setMostraForm] = useState<boolean>(false);
  const [modalitaModifica, setModalitaModifica] = useState<boolean>(false);
  const [agenteInModifica, setAgenteInModifica] = useState<string>("");

  // --- State per gestione account agente nel form ---
  const [abilitaAccesso, setAbilitaAccesso] = useState<boolean>(false);
  const [ruolo, setRuolo] = useState<Ruolo>("User");
  const [accountUtente, setAccountUtente] = useState<UserDto | null>(null);
  const [usernameAcc, setUsernameAcc] = useState<string>("");
  const [emailAcc, setEmailAcc] = useState<string>("");
  const [passwordAcc, setPasswordAcc] = useState<string>("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [isAccountLoading, setIsAccountLoading] = useState<boolean>(false);

  // Id company (da whoami/localStorage/env). Fallback da env:
  const DEFAULT_COMPANY_ID = import.meta.env.VITE_DEFAULT_COMPANY_ID ?? "";

  const defaultNuovoAgente: AgenteCreateDto = {
    codiceAgente: "",
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    indirizzo: "",
    citta: "",
    provincia: "",
    cap: "",
  };

  const [nuovoAgente, setNuovoAgente] =
    useState<AgenteCreateDto>(defaultNuovoAgente);

  // ✅ STATI PER VALIDAZIONE
  const [erroriValidazione, setErroriValidazione] = useState<ErroriValidazione>(
    {}
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  // Legge IdCompany dal localStorage con fallback all'env
  const getCompanyId = (): string => {
    const fromLogin = localStorage.getItem("IdCompany") || "";
    return fromLogin || DEFAULT_COMPANY_ID || "";
  };

  // Valida che sia un GUID
  const isGuid = (s: string) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      s || ""
    );

  // ✅ FUNZIONI DI VALIDAZIONE
  const validaCampo = (
    campo: keyof AgenteCreateDto,
    valore: string
  ): string | undefined => {
    const valoreTrimmed = valore.trim();

    switch (campo) {
      case "codiceAgente":
        if (!valoreTrimmed) return "Il codice agente è obbligatorio";
        if (valoreTrimmed.length < 3)
          return "Il codice deve essere di almeno 3 caratteri";
        if (!/^[A-Z0-9]+$/i.test(valoreTrimmed))
          return "Il codice può contenere solo lettere e numeri";
        // Verifica duplicati (escluso l'agente in modifica)
        const esisteGia = agenti.some(
          (a) =>
            a.codiceAgente.toLowerCase() === valoreTrimmed.toLowerCase() &&
            (!modalitaModifica || a.id !== agenteInModifica)
        );
        if (esisteGia) return "Questo codice agente è già in uso";
        break;

      case "nome":
        if (!valoreTrimmed) return "Il nome è obbligatorio";
        if (valoreTrimmed.length < 2)
          return "Il nome deve essere di almeno 2 caratteri";
        if (!/^[a-zA-ZÀ-ÿ\s']+$/.test(valoreTrimmed))
          return "Il nome può contenere solo lettere, spazi e apostrofi";
        break;

      case "cognome":
        if (!valoreTrimmed) return "Il cognome è obbligatorio";
        if (valoreTrimmed.length < 2)
          return "Il cognome deve essere di almeno 2 caratteri";
        if (!/^[a-zA-ZÀ-ÿ\s']+$/.test(valoreTrimmed))
          return "Il cognome può contenere solo lettere, spazi e apostrofi";
        break;

      case "email":
        if (!valoreTrimmed) return "L'email è obbligatoria";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(valoreTrimmed))
          return "Inserisci un indirizzo email valido";
        // Verifica duplicati email (escluso l'agente in modifica)
        const emailEsisteGia = agenti.some(
          (a) =>
            a.email?.toLowerCase() === valoreTrimmed.toLowerCase() &&
            (!modalitaModifica || a.id !== agenteInModifica)
        );
        if (emailEsisteGia) return "Questa email è già in uso";
        break;

      case "telefono":
        if (!valoreTrimmed) return "Il telefono è obbligatorio";
        const telefonoRegex = /^[\d\s\-\+\(\)\.]{8,20}$/;
        if (!telefonoRegex.test(valoreTrimmed))
          return "Inserisci un numero di telefono valido (8-20 cifre)";
        break;

      case "indirizzo":
        if (!valoreTrimmed) return "L'indirizzo è obbligatorio";
        if (valoreTrimmed.length < 5)
          return "L'indirizzo deve essere di almeno 5 caratteri";
        break;

      case "citta":
        if (!valoreTrimmed) return "La città è obbligatoria";
        if (valoreTrimmed.length < 2)
          return "La città deve essere di almeno 2 caratteri";
        if (!/^[a-zA-ZÀ-ÿ\s'\.]+$/.test(valoreTrimmed))
          return "La città può contenere solo lettere, spazi, apostrofi e punti";
        break;

      case "provincia":
        if (!valoreTrimmed) return "La provincia è obbligatoria";
        if (valoreTrimmed.length !== 2)
          return "La provincia deve essere di 2 caratteri (es: RM, MI)";
        if (!/^[A-Z]{2}$/.test(valoreTrimmed))
          return "La provincia deve contenere solo 2 lettere maiuscole";
        break;

      case "cap":
        if (!valoreTrimmed) return "Il CAP è obbligatorio";
        if (!/^\d{5}$/.test(valoreTrimmed))
          return "Il CAP deve essere di 5 cifre numeriche";
        break;

      default:
        break;
    }

    return undefined;
  };

  const validaFormCompleto = (): ErroriValidazione => {
    const errori: ErroriValidazione = {};

    // Valida tutti i campi
    Object.keys(nuovoAgente).forEach((campo) => {
      const nomeCampo = campo as keyof AgenteCreateDto;
      const valore = nuovoAgente[nomeCampo] || "";
      const errore = validaCampo(nomeCampo, valore);
      if (errore) {
        errori[nomeCampo] = errore;
      }
    });

    return errori;
  };

  const handleCampoChange = (campo: keyof AgenteCreateDto, valore: string) => {
    // Aggiorna il valore
    setNuovoAgente((prev) => ({ ...prev, [campo]: valore }));

    // Validazione real-time
    const errore = validaCampo(campo, valore);
    setErroriValidazione((prev) => ({
      ...prev,
      [campo]: errore,
    }));
  };

  // ✅ FUNZIONI API
  const fetchAgenti = async () => {
    setIsLoading(true);
    setError("");
    console.log("🔄 Caricamento agenti...");

    try {
      const headers = getAuthHeaders();
      const url = `${API_URL}/api/Agenti?pageSize=1000&search=${encodeURIComponent(
        searchTerm
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
          throw new Error("Sessione scaduta. Effettua nuovamente il login.");
        }
        throw new Error(`Errore nel caricamento agenti: ${response.status}`);
      }

      const data: ApiResponseDto<PaginatedResponse<AgenteDto>> =
        await response.json();

      if (data.success && data.data && data.data.items) {
        console.log("✅ Agenti caricati:", data.data.items.length);
        setAgenti(data.data.items);
      } else {
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento agenti:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Errore imprevisto nel caricamento agenti");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const salvaAgente = async () => {
    setIsSaving(true);

    // ✅ VALIDAZIONE COMPLETA
    const errori = validaFormCompleto();
    setErroriValidazione(errori);

    // Se ci sono errori, non procedere
    if (Object.keys(errori).length > 0) {
      setIsSaving(false);

      // Mostra un alert con i primi 3 errori
      const elencoErrori = Object.values(errori).slice(0, 3).join("\n• ");
      const messaggioErrore = `Correggi i seguenti errori prima di salvare:\n\n• ${elencoErrori}`;

      if (Object.keys(errori).length > 3) {
        alert(
          messaggioErrore +
            `\n\n... e altri ${Object.keys(errori).length - 3} errori.`
        );
      } else {
        alert(messaggioErrore);
      }

      // Focus sul primo campo con errore
      const primoErrore = Object.keys(errori)[0];
      const elemento = document.querySelector(
        `input[name="${primoErrore}"], select[name="${primoErrore}"]`
      ) as HTMLElement;
      elemento?.focus();

      return;
    }

    // ✅ DETERMINA METODO E URL
    const method = modalitaModifica ? "PUT" : "POST";
    const url = modalitaModifica
      ? `${API_URL}/api/Agenti/${agenteInModifica}`
      : `${API_URL}/api/Agenti`;

    // ✅ PAYLOAD CON DATI PULITI
    const payload = modalitaModifica
      ? {
          id: agenteInModifica,
          codiceAgente: nuovoAgente.codiceAgente.trim(),
          nome: nuovoAgente.nome.trim(),
          cognome: nuovoAgente.cognome.trim(),
          email: nuovoAgente.email?.trim(),
          telefono: nuovoAgente.telefono?.trim(),
          indirizzo: nuovoAgente.indirizzo?.trim(),
          citta: nuovoAgente.citta?.trim(),
          provincia: nuovoAgente.provincia?.trim().toUpperCase(),
          cap: nuovoAgente.cap?.trim(),
          attivo: true,
        }
      : {
          codiceAgente: nuovoAgente.codiceAgente.trim(),
          nome: nuovoAgente.nome.trim(),
          cognome: nuovoAgente.cognome.trim(),
          email: nuovoAgente.email?.trim(),
          telefono: nuovoAgente.telefono?.trim(),
          indirizzo: nuovoAgente.indirizzo?.trim(),
          citta: nuovoAgente.citta?.trim(),
          provincia: nuovoAgente.provincia?.trim().toUpperCase(),
          cap: nuovoAgente.cap?.trim(),
        };

    console.log(`📤 ${modalitaModifica ? "MODIFICA" : "INSERIMENTO"} Agente:`);
    console.log("URL:", url);
    console.log("Method:", method);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Errore ${
          modalitaModifica ? "modifica" : "salvataggio"
        } agente: ${response.status}`;
        try {
          const errorData = await response.text();
          if (errorData) errorMessage += ` - ${errorData}`;
        } catch {}
        throw new Error(errorMessage);
      }

      // ✅ ottengo l'id dell'agente (dalla risposta del BE)
      const apiResponse = await response.json();
      const agenteId = modalitaModifica
        ? agenteInModifica
        : apiResponse?.data?.id ?? apiResponse?.data?.Id ?? "";

      // --- GESTIONE ACCOUNT: crea/aggiorna se richiesto ---
      if (abilitaAccesso) {
        if (!usernameAcc.trim())
          throw new Error("Username obbligatorio per l'account.");
        if (!emailAcc.trim())
          throw new Error("Email obbligatoria per l'account.");
        if (!accountUtente) {
          await creaAccount(agenteId);
        } else {
          await aggiornaAccount(accountUtente.id);
        }
      }

      // Ricarica la lista
      await fetchAgenti();

      // Reset form e stati
      setNuovoAgente(defaultNuovoAgente);
      setErroriValidazione({});
      setMostraForm(false);
      setModalitaModifica(false);
      setAgenteInModifica("");
      setAccountUtente(null);
      setAbilitaAccesso(false);
      setUsernameAcc("");
      setEmailAcc("");
      setPasswordAcc("");

      alert(
        `✅ Agente ${modalitaModifica ? "modificato" : "salvato"} con successo!`
      );
    } catch (error) {
      console.error(
        `🚨 Errore ${modalitaModifica ? "modifica" : "salvataggio"} agente:`,
        error
      );

      let userMessage = `Errore nel ${
        modalitaModifica ? "modificare" : "salvare"
      } l'agente.`;

      if (error instanceof Error) {
        if (error.message.includes("401")) {
          userMessage = "Sessione scaduta. Effettua nuovamente il login.";
          localStorage.removeItem("token");
          localStorage.removeItem("isAuthenticated");
        } else if (error.message.includes("403")) {
          userMessage = "Non hai i permessi per questa operazione.";
        } else if (error.message.includes("404")) {
          userMessage = modalitaModifica
            ? "L'agente da modificare non è stato trovato."
            : "Endpoint non trovato.";
        } else if (error.message.includes("500")) {
          userMessage = "Errore interno del server. Riprova più tardi.";
        } else {
          userMessage += `\n\nDettagli: ${error.message}`;
        }
      }

      alert(`❌ ${userMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const modificaAgente = (agenteId: string) => {
    const agente = agenti.find((a) => a.id === agenteId);
    if (!agente) {
      alert("Agente non trovato");
      return;
    }

    // Popola il form con i dati esistenti
    setNuovoAgente({
      codiceAgente: agente.codiceAgente,
      nome: agente.nome,
      cognome: agente.cognome,
      email: agente.email || "",
      telefono: agente.telefono || "",
      indirizzo: agente.indirizzo || "",
      citta: agente.citta || "",
      provincia: agente.provincia || "",
      cap: agente.cap || "",
    });

    // Reset errori di validazione
    setErroriValidazione({});
    setModalitaModifica(true);
    setAgenteInModifica(agenteId);
    setMostraForm(true);

    // Scroll al form
    setTimeout(() => {
      const formElement = document.getElementById("form-agente");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        formElement.classList.add("border-warning");
        formElement.style.boxShadow = "0 0 20px rgba(255, 193, 7, 0.5)";
        setTimeout(() => {
          formElement.classList.remove("border-warning");
          formElement.style.boxShadow = "";
        }, 3000);
      }
    }, 100);
    checkAccountEsistente(agenteId);
  };

  const eliminaAgente = async (agenteId: string, nomeCompleto: string) => {
    const conferma = window.confirm(
      `Sei sicuro di voler eliminare l'agente ${nomeCompleto}?\n\nQuesta operazione non può essere annullata.`
    );

    if (!conferma) return;

    try {
      const response = await fetch(`${API_URL}/api/Agenti/${agenteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Errore eliminazione agente: ${response.status}`);
      }

      await fetchAgenti();
      alert("Agente eliminato con successo!");
    } catch (error) {
      console.error("🚨 Errore eliminazione agente:", error);
      alert("Errore nell'eliminazione dell'agente");
    }
  };

  const toggleStatoAgente = async (agenteId: string, nuovoStato: boolean) => {
    const agente = agenti.find((a) => a.id === agenteId);
    if (!agente) return;

    try {
      const payload: AgenteUpdateDto = {
        id: agenteId,
        codiceAgente: agente.codiceAgente,
        nome: agente.nome,
        cognome: agente.cognome,
        email: agente.email || "",
        telefono: agente.telefono || "",
        indirizzo: agente.indirizzo || "",
        citta: agente.citta || "",
        provincia: agente.provincia || "",
        cap: agente.cap || "",
        attivo: nuovoStato,
      };

      const response = await fetch(`${API_URL}/api/Agenti/${agenteId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Errore aggiornamento stato: ${response.status}`);
      }

      await fetchAgenti();
    } catch (error) {
      console.error("🚨 Errore aggiornamento stato:", error);
      alert("Errore nell'aggiornamento dello stato dell'agente");
    }
  };

  // ✅ EFFETTI
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    if (!API_URL) {
      setError("VITE_API_URL non configurato nel file .env");
      return;
    }

    fetchAgenti();
  }, [API_URL]);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setPaginaCorrente(1);
  }, [searchTerm, statusFilter, provinciaFilter]);

  // ✅ TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // ✅ PAGINAZIONE
  const vaiAllaPagina = (pagina: number) => setPaginaCorrente(pagina);
  const vaiAllaPaginaPrecedente = () => {
    if (paginaCorrente > 1) setPaginaCorrente(paginaCorrente - 1);
  };
  const vaiAllaPaginaSuccessiva = () => {
    if (paginaCorrente < infoPaginazione.totalePagine)
      setPaginaCorrente(paginaCorrente + 1);
  };

  // ✅ DATI FILTRATI
  const datiFilter = useMemo(() => {
    return agenti.filter((agente) => {
      const matchSearch =
        searchTerm === "" ||
        agente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agente.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agente.codiceAgente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agente.email &&
          agente.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === "Tutti" ||
        (statusFilter === "Attivi" && agente.attivo) ||
        (statusFilter === "Non Attivi" && !agente.attivo);

      const matchProvincia =
        provinciaFilter === "Tutte" ||
        (agente.provincia && agente.provincia === provinciaFilter);

      return matchSearch && matchStatus && matchProvincia;
    });
  }, [agenti, searchTerm, statusFilter, provinciaFilter]);

  // ✅ DATI PAGINATI
  const datiPaginati = useMemo(() => {
    const startIndex = (paginaCorrente - 1) * recordPerPagina;
    const endIndex = startIndex + recordPerPagina;
    return datiFilter.slice(startIndex, endIndex);
  }, [datiFilter, paginaCorrente, recordPerPagina]);

  // ✅ INFO PAGINAZIONE
  const infoPaginazione = useMemo(() => {
    const totalePagine = Math.ceil(datiFilter.length / recordPerPagina);
    const startRecord =
      datiFilter.length === 0 ? 0 : (paginaCorrente - 1) * recordPerPagina + 1;
    const endRecord = Math.min(
      paginaCorrente * recordPerPagina,
      datiFilter.length
    );

    return {
      totalePagine,
      startRecord,
      endRecord,
      totaleRecord: datiFilter.length,
    };
  }, [datiFilter.length, paginaCorrente, recordPerPagina]);

  // ✅ STATISTICHE
  const statistiche = useMemo((): StatisticheAgenti => {
    const agentiAttivi = datiFilter.filter((a) => a.attivo).length;
    const agentiNonAttivi = datiFilter.filter((a) => !a.attivo).length;

    return {
      totaleAgenti: datiFilter.length,
      agentiAttivi,
      agentiNonAttivi,
      percentualeAttivi:
        datiFilter.length > 0
          ? parseFloat(((agentiAttivi / datiFilter.length) * 100).toFixed(1))
          : 0,
    };
  }, [datiFilter]);

  // ✅ PROVINCE UNICHE
  const provinceUniche = useMemo(() => {
    const province = agenti
      .map((a) => a.provincia)
      .filter((p) => p && p.trim())
      .map((p) => p!.trim());
    return [...new Set(province)].sort();
  }, [agenti]);

  // ✅ FORMAT DATE
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const checkAccountEsistente = async (agentId: string) => {
    try {
      setIsAccountLoading(true);
      const res = await fetch(
        `${API_URL}/api/Auth/users/exists/by-agent/${agentId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error(`Errore verifica account (${res.status})`);
      const data: UserExistsResponse = await res.json();
      if (data.success && data.data.exists && data.data.user) {
        setAccountUtente(data.data.user);
        setAbilitaAccesso(true);
        setUsernameAcc(data.data.user.username);
        setEmailAcc(data.data.user.email);
        setRuolo(data.data.user.isAdmin ? "Admin" : "User");
        setTwoFactorEnabled(
          !!(data.data.user.requires2FA ?? data.data.user.twoFactorEnabled)
        );
      } else {
        setAccountUtente(null);
        setUsernameAcc("");
        setEmailAcc(nuovoAgente.email || "");
        setPasswordAcc("");
        setAbilitaAccesso(false);
        setRuolo("User");
        setTwoFactorEnabled(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAccountLoading(false);
    }
  };

  const generaPassword = async () => {
    try {
      const res = await fetch(`${API_URL}/api/Auth/users/generate-password`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Errore generazione password");
      const data = await res.json(); // il controller restituisce ApiResponseDto<object> con Data=string
      const pwd = (data?.data ?? data)?.toString?.() ?? "";
      setPasswordAcc(pwd);
    } catch (e) {
      console.error(e);
      alert("Impossibile generare la password");
    }
  };

  const creaAccount = async (agentId: string) => {
    const companyId = getCompanyId();

    if (!companyId) {
      throw new Error(
        "IdCompany mancante: effettua nuovamente il login oppure configura VITE_DEFAULT_COMPANY_ID."
      );
    }
    if (!isGuid(companyId)) {
      throw new Error(
        `IdCompany non valido: "${companyId}". Verifica il valore salvato al login.`
      );
    }

    const payload = {
      IdUser: agentId,
      IdCompany: companyId,
      Username: usernameAcc.trim(),
      Password: passwordAcc.trim(),
      Email: emailAcc.trim(),
      IsAdmin: ruolo === "Admin",
      IsEnabled: true,
      AccessLevel: ruolo === "Admin" ? "ADMIN" : "USER",
      TwoFactorEnabled: twoFactorEnabled, // NEW
      Requires2FA: twoFactorEnabled, // opzionale
    };

    const res = await fetch(`${API_URL}/api/Auth/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Errore creazione account: ${res.status} - ${t}`);
    }
    const result = await res.json();
    return result;
  };

  const aggiornaAccount = async (userId: string) => {
    const payload = {
      Id: userId,
      Username: usernameAcc.trim(),
      Email: emailAcc.trim(),
      Password: passwordAcc ? passwordAcc.trim() : undefined,
      IsAdmin: ruolo === "Admin",
      IsEnabled: accountUtente?.isEnabled ?? true,
      AccessLevel: ruolo === "Admin" ? "ADMIN" : "USER",

      // 👉 inviamo solo i flag, nessun secret
      TwoFactorEnabled: twoFactorEnabled, // BE li riceve in PascalCase (case-insensitive)
      Requires2FA: twoFactorEnabled, // opzionale: se ON, chiederà il codice dopo setup
    };

    const res = await fetch(`${API_URL}/api/Auth/users/${userId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Errore aggiornamento account: ${res.status} - ${t}`);
    }

    const result = await res.json();

    // (facoltativo) refresh UI e pulizia password dal campo
    const agentId = accountUtente?.idUser || agenteInModifica || "";
    if (agentId) await checkAccountEsistente(agentId);
    setPasswordAcc("");

    return result;
  };

  const toggleStatoAccount = async (userId: string) => {
    const res = await fetch(
      `${API_URL}/api/Auth/users/${userId}/toggle-status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) throw new Error(`Errore toggle stato (${res.status})`);
    const data = await res.json();
    await checkAccountEsistente(accountUtente?.idUser ?? agenteInModifica);
    return data;
  };

  const avviaSetup2FA = async (userId: string) => {
    const url = `${API_URL}/api/TwoFactor/setup?userId=${encodeURIComponent(
      userId
    )}`;
    const res = await fetch(url, { method: "GET", headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Errore setup 2FA (${res.status})`);
    // Non mostriamo il QR qui: serve solo a far mettere TwoFactorEnabled=true lato BE
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } anagrafica-agenti-page`}
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
                      onClick={() => navigate("/dashboard")}
                    >
                      <i className="fa-solid fa-home me-1"></i>
                      Dashboard
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Anagrafica Agenti
                  </li>
                </ol>
              </nav>
              <h2 className="anagrafica-agenti-title">
                <i className="fa-solid fa-address-book me-2"></i>
                Anagrafica Agenti
              </h2>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={() => {
                  setNuovoAgente(defaultNuovoAgente);
                  setModalitaModifica(false);
                  setAgenteInModifica("");
                  setErroriValidazione({});
                  setMostraForm(true);
                }}
              >
                <i className="fa-solid fa-user-plus me-1"></i>
                Nuovo Agente
              </button>
              <button className="btn btn-outline-success">
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={fetchAgenti}
                disabled={isLoading}
              >
                <i
                  className={`fa-solid ${
                    isLoading ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Alert errori */}
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>Errore:</strong> {error}
            </div>
          )}

          {/* Alert caricamento */}
          {isLoading && (
            <div className="alert alert-info mb-4" role="alert">
              <i className="fa-solid fa-spinner fa-spin me-2"></i>
              Caricamento dati in corso...
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
                    <div className="col-md-6">
                      <label className="form-label">Ricerca</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fa-solid fa-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cerca per nome, cognome, codice o email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setSearchTerm("")}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Stato</label>
                      <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tutti">Tutti gli stati</option>
                        <option value="Attivi">Solo Attivi</option>
                        <option value="Non Attivi">Solo Non Attivi</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Provincia</label>
                      <select
                        className="form-select"
                        value={provinciaFilter}
                        onChange={(e) => setProvinciaFilter(e.target.value)}
                      >
                        <option value="Tutte">Tutte le province</option>
                        {provinceUniche.map((provincia) => (
                          <option key={provincia} value={provincia}>
                            {provincia}
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
                  <h3 className="mb-1">{statistiche.totaleAgenti}</h3>
                  <small>Agenti Totali</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-success text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.agentiAttivi}</h3>
                  <small>Agenti Attivi</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-warning text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.agentiNonAttivi}</h3>
                  <small>Agenti Non Attivi</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-info text-white h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistiche.percentualeAttivi}%</h3>
                  <small>% Attivi</small>
                </div>
              </div>
            </div>
          </div>

          {/* Form Aggiunta/Modifica Agente */}
          {mostraForm && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card" id="form-agente">
                  <div className="custom-card-header">
                    <span>
                      {modalitaModifica ? "Modifica Agente" : "Nuovo Agente"}
                    </span>
                    <i
                      className={`fa-solid ${
                        modalitaModifica ? "fa-edit" : "fa-user-plus"
                      }`}
                    ></i>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Codice Agente *</label>
                        <input
                          type="text"
                          name="codiceAgente"
                          className={`form-control ${
                            erroriValidazione.codiceAgente
                              ? "is-invalid"
                              : nuovoAgente.codiceAgente &&
                                !erroriValidazione.codiceAgente
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="Es: AGE001"
                          value={nuovoAgente.codiceAgente}
                          onChange={(e) =>
                            handleCampoChange("codiceAgente", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.codiceAgente && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.codiceAgente}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Nome *</label>
                        <input
                          type="text"
                          name="nome"
                          className={`form-control ${
                            erroriValidazione.nome
                              ? "is-invalid"
                              : nuovoAgente.nome && !erroriValidazione.nome
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="Nome"
                          value={nuovoAgente.nome}
                          onChange={(e) =>
                            handleCampoChange("nome", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.nome && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.nome}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Cognome *</label>
                        <input
                          type="text"
                          name="cognome"
                          className={`form-control ${
                            erroriValidazione.cognome
                              ? "is-invalid"
                              : nuovoAgente.cognome &&
                                !erroriValidazione.cognome
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="Cognome"
                          value={nuovoAgente.cognome}
                          onChange={(e) =>
                            handleCampoChange("cognome", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.cognome && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.cognome}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          name="email"
                          className={`form-control ${
                            erroriValidazione.email
                              ? "is-invalid"
                              : nuovoAgente.email && !erroriValidazione.email
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="email@esempio.com"
                          value={nuovoAgente.email}
                          onChange={(e) =>
                            handleCampoChange("email", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.email && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.email}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Telefono *</label>
                        <input
                          type="tel"
                          name="telefono"
                          className={`form-control ${
                            erroriValidazione.telefono
                              ? "is-invalid"
                              : nuovoAgente.telefono &&
                                !erroriValidazione.telefono
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="123-456-7890"
                          value={nuovoAgente.telefono}
                          onChange={(e) =>
                            handleCampoChange("telefono", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.telefono && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.telefono}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Indirizzo *</label>
                        <input
                          type="text"
                          name="indirizzo"
                          className={`form-control ${
                            erroriValidazione.indirizzo
                              ? "is-invalid"
                              : nuovoAgente.indirizzo &&
                                !erroriValidazione.indirizzo
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="Via Roma, 123"
                          value={nuovoAgente.indirizzo}
                          onChange={(e) =>
                            handleCampoChange("indirizzo", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.indirizzo && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.indirizzo}
                          </div>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Città *</label>
                        <input
                          type="text"
                          name="citta"
                          className={`form-control ${
                            erroriValidazione.citta
                              ? "is-invalid"
                              : nuovoAgente.citta && !erroriValidazione.citta
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="Roma"
                          value={nuovoAgente.citta}
                          onChange={(e) =>
                            handleCampoChange("citta", e.target.value)
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.citta && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.citta}
                          </div>
                        )}
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Provincia *</label>
                        <input
                          type="text"
                          name="provincia"
                          className={`form-control ${
                            erroriValidazione.provincia
                              ? "is-invalid"
                              : nuovoAgente.provincia &&
                                !erroriValidazione.provincia
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="RM"
                          maxLength={2}
                          style={{ textTransform: "uppercase" }}
                          value={nuovoAgente.provincia}
                          onChange={(e) =>
                            handleCampoChange(
                              "provincia",
                              e.target.value.toUpperCase()
                            )
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.provincia && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.provincia}
                          </div>
                        )}
                      </div>
                      <div className="col-md-1">
                        <label className="form-label">CAP *</label>
                        <input
                          type="text"
                          name="cap"
                          className={`form-control ${
                            erroriValidazione.cap
                              ? "is-invalid"
                              : nuovoAgente.cap && !erroriValidazione.cap
                              ? "is-valid"
                              : ""
                          }`}
                          placeholder="00100"
                          maxLength={5}
                          value={nuovoAgente.cap}
                          onChange={(e) =>
                            handleCampoChange(
                              "cap",
                              e.target.value.replace(/\D/g, "")
                            )
                          }
                          disabled={isSaving}
                        />
                        {erroriValidazione.cap && (
                          <div className="invalid-feedback">
                            <i className="fa-solid fa-exclamation-triangle me-1"></i>
                            {erroriValidazione.cap}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card mt-3">
                      <div className="custom-card-header">
                        <span>Account di accesso agente</span>
                        <div className="menu-right">
                          {accountUtente && (
                            <span
                              className={`badge ${
                                accountUtente.isEnabled
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {accountUtente.isEnabled
                                ? "Abilitato"
                                : "Disabilitato"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="form-check form-switch mb-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="switch-accesso"
                            checked={abilitaAccesso}
                            onChange={(e) =>
                              setAbilitaAccesso(e.target.checked)
                            }
                          />
                          <label
                            className="form-check-label"
                            htmlFor="switch-accesso"
                          >
                            Abilita accesso al portale per questo agente
                          </label>
                        </div>

                        <fieldset
                          disabled={!abilitaAccesso || isAccountLoading}
                        >
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label">Username</label>
                              <input
                                className="form-control"
                                value={usernameAcc}
                                onChange={(e) => setUsernameAcc(e.target.value)}
                                placeholder="es. nome.cognome"
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Email</label>
                              <input
                                type="email"
                                className="form-control"
                                value={emailAcc}
                                onChange={(e) => setEmailAcc(e.target.value)}
                                placeholder="es. nome@azienda.it"
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Ruolo</label>
                              <select
                                className="form-select"
                                value={ruolo}
                                onChange={(e) =>
                                  setRuolo(e.target.value as Ruolo)
                                }
                              >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Password</label>
                              <div className="input-group">
                                <input
                                  type="text"
                                  className="form-control"
                                  value={passwordAcc}
                                  onChange={(e) =>
                                    setPasswordAcc(e.target.value)
                                  }
                                  placeholder={
                                    accountUtente
                                      ? "Lascia vuoto per non cambiarla"
                                      : "Imposta password o genera"
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={generaPassword}
                                >
                                  <i className="fa-solid fa-wand-magic-sparkles me-1" />
                                  Genera
                                </button>
                              </div>
                            </div>

                            {accountUtente && (
                              <div className="col-md-4 d-flex align-items-end">
                                <button
                                  type="button"
                                  className={`btn ${
                                    accountUtente.isEnabled
                                      ? "btn-secondary"
                                      : "btn-success"
                                  }`}
                                  onClick={() =>
                                    toggleStatoAccount(accountUtente.id)
                                  }
                                >
                                  <i className="fa-solid fa-power-off me-1" />
                                  {accountUtente.isEnabled
                                    ? "Disabilita account"
                                    : "Abilita account"}
                                </button>
                              </div>
                            )}
                            <div className="col-md-4 d-flex align-items-end">
                              <div className="form-check form-switch">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="switch-2fa"
                                  checked={twoFactorEnabled}
                                  onChange={(e) =>
                                    setTwoFactorEnabled(e.target.checked)
                                  }
                                  disabled={!emailAcc.trim()} // opzionale: senza email non abilitiamo 2FA
                                  title={
                                    !emailAcc.trim()
                                      ? "Imposta prima l'email per abilitare la 2FA"
                                      : ""
                                  }
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor="switch-2fa"
                                >
                                  Autenticazione a 2 fattori
                                </label>
                              </div>
                            </div>
                          </div>
                        </fieldset>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={salvaAgente}
                        disabled={isSaving}
                      >
                        <i
                          className={`fa-solid ${
                            isSaving
                              ? "fa-spinner fa-spin"
                              : modalitaModifica
                              ? "fa-save"
                              : "fa-user-plus"
                          } me-1`}
                        ></i>
                        {isSaving
                          ? "Salvataggio..."
                          : modalitaModifica
                          ? "Salva Modifiche"
                          : "Salva Agente"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setMostraForm(false);
                          setModalitaModifica(false);
                          setAgenteInModifica("");
                          setNuovoAgente(defaultNuovoAgente);
                          setErroriValidazione({});
                        }}
                        disabled={isSaving}
                      >
                        <i className="fa-solid fa-times me-1"></i>
                        Annulla
                      </button>
                      {modalitaModifica && (
                        <button
                          className="btn btn-outline-info ms-2"
                          onClick={() => {
                            setModalitaModifica(false);
                            setAgenteInModifica("");
                            setNuovoAgente(defaultNuovoAgente);
                            setErroriValidazione({});
                          }}
                          disabled={isSaving}
                        >
                          <i className="fa-solid fa-user-plus me-1"></i>
                          Nuovo Agente
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controlli Paginazione - SOPRA LA TABELLA */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <label className="form-label mb-0">Mostra:</label>
                  <select
                    className="form-select"
                    style={{ width: "auto" }}
                    value={recordPerPagina}
                    onChange={(e) => {
                      setRecordPerPagina(parseInt(e.target.value));
                      setPaginaCorrente(1);
                    }}
                  >
                    <option value={5}>5 per pagina</option>
                    <option value={10}>10 per pagina</option>
                    <option value={25}>25 per pagina</option>
                    <option value={50}>50 per pagina</option>
                    <option value={100}>100 per pagina</option>
                    <option value={datiFilter.length || 1}>
                      Tutti ({datiFilter.length})
                    </option>
                  </select>
                </div>

                <div className="text-muted">
                  {infoPaginazione.totaleRecord > 0
                    ? `Mostrando ${infoPaginazione.startRecord}-${infoPaginazione.endRecord} di ${infoPaginazione.totaleRecord} risultati`
                    : "Nessun risultato"}
                </div>
              </div>
            </div>
          </div>

          {/* Tabella Agenti */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Agenti ({datiFilter.length} risultati)</span>
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
                  {datiFilter.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Codice</th>
                              <th>Nome Completo</th>
                              <th>Email</th>
                              <th>Telefono</th>
                              <th>Città</th>
                              <th>Provincia</th>
                              <th>Stato</th>
                              <th>Data Inserimento</th>
                              <th style={{ width: "160px" }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {datiPaginati.map((agente) => (
                              <tr key={agente.id}>
                                <td>
                                  <span className="badge bg-primary">
                                    {agente.codiceAgente}
                                  </span>
                                </td>
                                <td className="fw-bold">
                                  {agente.nome} {agente.cognome}
                                </td>
                                <td>{agente.email || "-"}</td>
                                <td>{agente.telefono || "-"}</td>
                                <td>{agente.citta || "-"}</td>
                                <td>
                                  {agente.provincia ? (
                                    <span className="badge bg-info">
                                      {agente.provincia}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>
                                  <div className="form-check form-switch">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={agente.attivo}
                                      onChange={(e) =>
                                        toggleStatoAgente(
                                          agente.id,
                                          e.target.checked
                                        )
                                      }
                                      title={`${
                                        agente.attivo ? "Disattiva" : "Attiva"
                                      } agente`}
                                    />
                                    <label className="form-check-label">
                                      <span
                                        className={`badge ${
                                          agente.attivo
                                            ? "bg-success"
                                            : "bg-warning text-dark"
                                        }`}
                                      >
                                        {agente.attivo
                                          ? "Attivo"
                                          : "Non Attivo"}
                                      </span>
                                    </label>
                                  </div>
                                </td>
                                <td>{formatDate(agente.dataInserimento)}</td>
                                <td>
                                  <div className="d-flex gap-1">
                                    <button
                                      className="btn btn-outline-secondary btn-sm"
                                      onClick={() => modificaAgente(agente.id)}
                                      title="Modifica agente"
                                    >
                                      <i className="fa-solid fa-edit"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() =>
                                        eliminaAgente(
                                          agente.id,
                                          `${agente.nome} ${agente.cognome}`
                                        )
                                      }
                                      title="Elimina agente"
                                    >
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Controlli Paginazione - SOTTO LA TABELLA */}
                      {infoPaginazione.totalePagine > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <div className="text-muted">
                            Pagina {paginaCorrente} di{" "}
                            {infoPaginazione.totalePagine}
                          </div>

                          <nav aria-label="Navigazione pagine">
                            <ul className="pagination mb-0">
                              <li
                                className={`page-item ${
                                  paginaCorrente === 1 ? "disabled" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => vaiAllaPagina(1)}
                                  disabled={paginaCorrente === 1}
                                >
                                  <i className="fa-solid fa-angles-left"></i>
                                </button>
                              </li>

                              <li
                                className={`page-item ${
                                  paginaCorrente === 1 ? "disabled" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={vaiAllaPaginaPrecedente}
                                  disabled={paginaCorrente === 1}
                                >
                                  <i className="fa-solid fa-angle-left"></i>
                                </button>
                              </li>

                              {Array.from(
                                {
                                  length: Math.min(
                                    5,
                                    infoPaginazione.totalePagine
                                  ),
                                },
                                (_, i) => {
                                  let pageNumber;
                                  if (infoPaginazione.totalePagine <= 5) {
                                    pageNumber = i + 1;
                                  } else if (paginaCorrente <= 3) {
                                    pageNumber = i + 1;
                                  } else if (
                                    paginaCorrente >=
                                    infoPaginazione.totalePagine - 2
                                  ) {
                                    pageNumber =
                                      infoPaginazione.totalePagine - 4 + i;
                                  } else {
                                    pageNumber = paginaCorrente - 2 + i;
                                  }

                                  return (
                                    <li
                                      key={pageNumber}
                                      className={`page-item ${
                                        paginaCorrente === pageNumber
                                          ? "active"
                                          : ""
                                      }`}
                                    >
                                      <button
                                        className="page-link"
                                        onClick={() =>
                                          vaiAllaPagina(pageNumber)
                                        }
                                      >
                                        {pageNumber}
                                      </button>
                                    </li>
                                  );
                                }
                              )}

                              <li
                                className={`page-item ${
                                  paginaCorrente ===
                                  infoPaginazione.totalePagine
                                    ? "disabled"
                                    : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={vaiAllaPaginaSuccessiva}
                                  disabled={
                                    paginaCorrente ===
                                    infoPaginazione.totalePagine
                                  }
                                >
                                  <i className="fa-solid fa-angle-right"></i>
                                </button>
                              </li>

                              <li
                                className={`page-item ${
                                  paginaCorrente ===
                                  infoPaginazione.totalePagine
                                    ? "disabled"
                                    : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    vaiAllaPagina(infoPaginazione.totalePagine)
                                  }
                                  disabled={
                                    paginaCorrente ===
                                    infoPaginazione.totalePagine
                                  }
                                >
                                  <i className="fa-solid fa-angles-right"></i>
                                </button>
                              </li>
                            </ul>
                          </nav>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-users fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessun agente trovato</h5>
                      <p className="text-muted">
                        {isLoading
                          ? "Caricamento dati in corso..."
                          : searchTerm ||
                            statusFilter !== "Tutti" ||
                            provinciaFilter !== "Tutte"
                          ? "Nessun agente corrisponde ai filtri selezionati."
                          : "Non ci sono agenti nel sistema."}
                      </p>
                      {!isLoading &&
                        !searchTerm &&
                        statusFilter === "Tutti" &&
                        provinciaFilter === "Tutte" && (
                          <button
                            className="btn btn-primary-dark"
                            onClick={() => {
                              setNuovoAgente(defaultNuovoAgente);
                              setModalitaModifica(false);
                              setAgenteInModifica("");
                              setErroriValidazione({});
                              setMostraForm(true);
                            }}
                          >
                            <i className="fa-solid fa-user-plus me-1"></i>
                            Aggiungi il primo agente
                          </button>
                        )}
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

export default AnagraficaAgenti;
