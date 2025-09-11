import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
//import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./prospect-custom.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import * as XLSX from "xlsx";

// INTERFACCE PER PROSPECT MANAGEMENT
interface ProspectData {
  id: string;
  numeroProspect: string;
  dataCreazione: string;
  dataUltimaModifica?: string;
  stato: "Bozza" | "Inviato" | "Approvato" | "Rifiutato" | "In Lavorazione";

  // Dati Azienda/Esercente
  denominazioneEsercente: string;
  denominazioneInsegna?: string;
  telefonoCellularePV?: string;
  telefonoFissoPV?: string;
  emailPV?: string;
  emailPECPV?: string;
  iban?: string;
  swift?: string;
  nomeBanca?: string;
  codiceFatturazioneSDI?: string;
  indirizzoSedeOperativa?: string;
  indirizzoSedeLegale?: string;

  // Rappresentanti Legali (fino a 4)
  rappresentantiLegali: RappresentanteLegale[];

  // Documenti richiesti
  documenti: {
    visuraCamerale: boolean;
    documentoIdentita: boolean;
    codiceFiscale: boolean;
    provaResidenza: boolean;
  };

  // Offerta Commerciale
  offertaCommerciale: {
    postpagato: "SI" | "NO";
    posBillPayment: "ETHERNET" | "GPRS" | "WIFI" | "";
    profiloCommerciale?: string;
    offertaSunmi?: string;
    altreOfferte?: string;
    admiralSport?: string;
    scadenzaOfferta?: string;
  };

  // Dati Commerciali
  datiCommerciali: {
    flagIntercompany: "si" | "no";
    tipologiaPuntoVendita?: string;
    commercialeBUAP?: string;
    canale?: string;
    sottocategoriaCanale?: string;
    intermediario?: string;
    segnalatore?: string;
    promoterAWP?: string;
    promoterGAD?: string;
    sottocategoriaPromoterGAD?: string;
    promoterDirittoSportivo?: string;
    promoterVLT?: string;
    dotazione?: string;
    kitMarketing?: string;
  };

  // Info Aggiuntive
  infoAggiuntive: {
    connettoreWallet: "SI" | "NO" | "";
    connettoreAccreditoVincita?: string;
    utenzaPortale?: string;
  };

  // Metadati
  creatoBy: string;
  modificatoBy?: string;
  taskOriginId?: string;
}

interface RappresentanteLegale {
  nome: string;
  telefono?: string;
  email?: string;
  indirizzoResidenza?: string;
  indirizzoComunicazioni?: string;
}

interface ProspectStats {
  totale: number;
  bozze: number;
  inviati: number;
  approvati: number;
  rifiutati: number;
  inLavorazione: number;
}

interface NuovoProspectForm
  extends Omit<
    ProspectData,
    "id" | "numeroProspect" | "dataCreazione" | "creatoBy"
  > {
  // Form-specific fields if needed
}

const TIPOLOGIA_PV_OPTIONS = [
  "BAR",
  "BAR TABACCHI",
  "EDICOLA",
  "CARTOLERIA",
  "CENTRO SERVIZI",
  "MINIMARKET",
  "NEGOZIO DI TELEFONIA",
  "SALA SCOMMESSE",
  "SALA VLT",
  "TABACCHI",
  "ALTRO",
];

const CANALE_OPTIONS = [
  "Contratto diretto (contrattualizzato solo da commerciale)",
  "Contratto indiretto",
];

const DOTAZIONE_OPTIONS = ["SUNMI", "POS STANDARD", "TERMINAL FISSO", "ALTRO"];

const KIT_MARKETING_OPTIONS = [
  "Kit 1",
  "Kit 2",
  "Kit 3",
  "Kit Standard",
  "Nessun Kit",
];

const PROFILO_COMMERCIALE_OPTIONS = [
  "AP FULL - LISTINO TOP",
  "AP STANDARD - LISTINO MEDIO",
  "AP BASE - LISTINO BASE",
];

const ProspectManagement: React.FC = () => {
  //const navigate = useNavigate();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // CONFIGURAZIONE API
  //const API_URL = import.meta.env.VITE_API_URL;

  // STATI PRINCIPALI
  const [prospects, setProspects] = useState<ProspectData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, _setError] = useState<string>("");

  // GESTIONE RUOLO UTENTE
  const userRole = (localStorage.getItem("userLevel") || "")
    .trim()
    .toLowerCase();
  const isAdmin = userRole === "admin";
  const currentUserId =
    localStorage.getItem("idUser") || localStorage.getItem("userId") || "";

  // STATI FILTRI E VISUALIZZAZIONE
  const [activeTab, setActiveTab] = useState<
    "tutti" | "bozze" | "inviati" | "approvati" | "rifiutati"
  >("tutti");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("tutti");

  // STATI FORM E MODALI
  const [showNewProspectForm, setShowNewProspectForm] =
    useState<boolean>(false);
  const [showProspectDetail, setShowProspectDetail] = useState<boolean>(false);
  const [selectedProspect, setSelectedProspect] = useState<ProspectData | null>(
    null
  );
  const [editingProspectId, setEditingProspectId] = useState<string | null>(
    null
  );

  // PAGINAZIONE
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // FORM NUOVO PROSPECT
  const defaultNewProspect: NuovoProspectForm = {
    dataUltimaModifica: undefined,
    stato: "Bozza",
    denominazioneEsercente: "",
    denominazioneInsegna: "",
    telefonoCellularePV: "",
    telefonoFissoPV: "",
    emailPV: "",
    emailPECPV: "",
    iban: "",
    swift: "",
    nomeBanca: "",
    codiceFatturazioneSDI: "",
    indirizzoSedeOperativa: "",
    indirizzoSedeLegale: "",
    rappresentantiLegali: [
      {
        nome: "",
        telefono: "",
        email: "",
        indirizzoResidenza: "",
        indirizzoComunicazioni: "",
      },
    ],
    documenti: {
      visuraCamerale: false,
      documentoIdentita: false,
      codiceFiscale: false,
      provaResidenza: false,
    },
    offertaCommerciale: {
      postpagato: "NO",
      posBillPayment: "",
      profiloCommerciale: "",
      offertaSunmi: "",
      altreOfferte: "",
      admiralSport: "",
      scadenzaOfferta: "",
    },
    datiCommerciali: {
      flagIntercompany: "no",
      tipologiaPuntoVendita: "",
      commercialeBUAP: "",
      canale: "",
      sottocategoriaCanale: "",
      intermediario: "",
      segnalatore: "",
      promoterAWP: "",
      promoterGAD: "",
      sottocategoriaPromoterGAD: "",
      promoterDirittoSportivo: "",
      promoterVLT: "",
      dotazione: "",
      kitMarketing: "",
    },
    infoAggiuntive: {
      connettoreWallet: "",
      connettoreAccreditoVincita: "",
      utenzaPortale: "",
    },
    modificatoBy: undefined,
    taskOriginId: undefined,
  };

  const [newProspect, setNewProspect] =
    useState<NuovoProspectForm>(defaultNewProspect);

  // DATI FAKE PER SVILUPPO
  const generateProspectsFake = (): ProspectData[] => [
    {
      id: "prospect-1",
      numeroProspect: "PROS-001",
      dataCreazione: "2025-01-10T10:30:00Z",
      stato: "Bozza",
      denominazioneEsercente: "KROTON BAR DI BARBERIO GENNARO & C. SNC",
      denominazioneInsegna: "KROTON BAR",
      telefonoCellularePV: "3466615832",
      emailPV: "timlino73@gmail.com",
      emailPECPV: "KROTONBARSNC@PEC.IT",
      iban: "IT84A0306922212100000100588",
      indirizzoSedeOperativa: "VIA VITTORIO VENETO 104 - CROTONE (KR)",
      indirizzoSedeLegale: "VIA VITTORIO VENETO 104 - CROTONE (KR)",
      rappresentantiLegali: [
        {
          nome: "BARBERIO GENNARO",
          telefono: "3803698576",
          email: "gennarobarberio66@libero.it",
          indirizzoResidenza: "VIA ROMANIA 4 - CROTONE (KR)",
          indirizzoComunicazioni: "VIA VITTORIO VENETO 104 - CROTONE (KR)",
        },
        {
          nome: "FRASCA CARMELO",
          telefono: "3466615832",
          email: "timlino73@gmail.com",
          indirizzoResidenza: "VIA SAN FRANCESCO 57 - CROTONE (KR)",
          indirizzoComunicazioni: "VIA VITTORIO VENETO 104 - CROTONE (KR)",
        },
      ],
      documenti: {
        visuraCamerale: false,
        documentoIdentita: true,
        codiceFiscale: true,
        provaResidenza: false,
      },
      offertaCommerciale: {
        postpagato: "NO",
        posBillPayment: "ETHERNET",
        profiloCommerciale: "AP FULL - LISTINO TOP",
        offertaSunmi: "SUNMI PRO - 199 FEE + 59,90 CANONE - POS INCLUSO",
        scadenzaOfferta: "FINO A CESSAZIONE CONTRATTO",
      },
      datiCommerciali: {
        flagIntercompany: "no",
        tipologiaPuntoVendita: "BAR",
        commercialeBUAP: "Parascandolo Andrea",
        canale: "Contratto diretto (contrattualizzato solo da commerciale)",
        dotazione: "SUNMI",
        kitMarketing: "Kit 3",
      },
      infoAggiuntive: {
        connettoreWallet: "SI",
      },
      creatoBy: "current-user",
    },
    {
      id: "prospect-2",
      numeroProspect: "PROS-002",
      dataCreazione: "2025-01-08T14:20:00Z",
      stato: "Inviato",
      denominazioneEsercente: "TABACCHERIA ROSSI SRL",
      denominazioneInsegna: "TABACCHERIA ROSSI",
      telefonoCellularePV: "3401234567",
      emailPV: "info@tabaccheriarossi.it",
      emailPECPV: "tabaccheriarossi@pec.it",
      iban: "IT60X0542811101000000123456",
      indirizzoSedeOperativa: "VIA ROMA 25 - MILANO (MI)",
      indirizzoSedeLegale: "VIA ROMA 25 - MILANO (MI)",
      rappresentantiLegali: [
        {
          nome: "ROSSI MARIO",
          telefono: "3401234567",
          email: "mario.rossi@gmail.com",
          indirizzoResidenza: "VIA GARIBALDI 10 - MILANO (MI)",
          indirizzoComunicazioni: "VIA ROMA 25 - MILANO (MI)",
        },
      ],
      documenti: {
        visuraCamerale: true,
        documentoIdentita: true,
        codiceFiscale: true,
        provaResidenza: true,
      },
      offertaCommerciale: {
        postpagato: "SI",
        posBillPayment: "WIFI",
        profiloCommerciale: "AP STANDARD - LISTINO MEDIO",
        offertaSunmi: "SUNMI LITE - 99 FEE + 39,90 CANONE",
        scadenzaOfferta: "31/12/2025",
      },
      datiCommerciali: {
        flagIntercompany: "no",
        tipologiaPuntoVendita: "TABACCHI",
        commercialeBUAP: "Verdi Giuseppe",
        canale: "Contratto diretto (contrattualizzato solo da commerciale)",
        dotazione: "POS STANDARD",
        kitMarketing: "Kit Standard",
      },
      infoAggiuntive: {
        connettoreWallet: "NO",
      },
      creatoBy: "current-user",
    },
  ];

  // STATISTICHE PROSPECTS
  const stats = useMemo((): ProspectStats => {
    return {
      totale: prospects.length,
      bozze: prospects.filter((p) => p.stato === "Bozza").length,
      inviati: prospects.filter((p) => p.stato === "Inviato").length,
      approvati: prospects.filter((p) => p.stato === "Approvato").length,
      rifiutati: prospects.filter((p) => p.stato === "Rifiutato").length,
      inLavorazione: prospects.filter((p) => p.stato === "In Lavorazione")
        .length,
    };
  }, [prospects]);

  // DATI PER GRAFICO STATI
  const chartData = useMemo(() => {
    if (prospects.length === 0) return [];

    const statiCount = prospects.reduce((acc, prospect) => {
      acc[prospect.stato] = (acc[prospect.stato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      Bozza: "#6c757d",
      Inviato: "#ffc107",
      "In Lavorazione": "#17a2b8",
      Approvato: "#28a745",
      Rifiutato: "#dc3545",
    };

    return Object.entries(statiCount).map(([stato, count]) => ({
      name: stato,
      value: count,
      fill: colors[stato as keyof typeof colors] || "#6c757d",
    }));
  }, [prospects]);

  // BADGE FUNCTIONS
  const getStatusBadgeClass = (stato: string) => {
    switch (stato) {
      case "Bozza":
        return "badge bg-secondary";
      case "Inviato":
        return "badge bg-warning text-dark";
      case "In Lavorazione":
        return "badge bg-info";
      case "Approvato":
        return "badge bg-success";
      case "Rifiutato":
        return "badge bg-danger";
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

  // FUNZIONI OTTIMIZZATE PER PERFORMANCE
  const handleNewProspectFieldChange = useCallback(
    (field: string) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const value =
          e.target.type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : e.target.value;

        if (field.includes(".")) {
          const [section, subfield] = field.split(".");
          setNewProspect((prev) => ({
            ...prev,
            [section]: {
              ...((prev as any)[section] || {}),
              [subfield]: value,
            },
          }));
        } else {
          setNewProspect((prev) => ({ ...prev, [field]: value }));
        }
      },
    []
  );

  const handleRappresentanteChange = useCallback(
    (index: number, field: keyof RappresentanteLegale, value: string) => {
      setNewProspect((prev) => ({
        ...prev,
        rappresentantiLegali: prev.rappresentantiLegali.map((rap, i) =>
          i === index ? { ...rap, [field]: value } : rap
        ),
      }));
    },
    []
  );

  const addRappresentante = () => {
    if (newProspect.rappresentantiLegali.length < 4) {
      setNewProspect((prev) => ({
        ...prev,
        rappresentantiLegali: [
          ...prev.rappresentantiLegali,
          {
            nome: "",
            telefono: "",
            email: "",
            indirizzoResidenza: "",
            indirizzoComunicazioni: "",
          },
        ],
      }));
    }
  };

  const removeRappresentante = (index: number) => {
    if (newProspect.rappresentantiLegali.length > 1) {
      setNewProspect((prev) => ({
        ...prev,
        rappresentantiLegali: prev.rappresentantiLegali.filter(
          (_, i) => i !== index
        ),
      }));
    }
  };

  // FUNZIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // AZIONI PROSPECT
  const handleProspectClick = (prospect: ProspectData) => {
    setSelectedProspect(prospect);
    setShowProspectDetail(true);
  };

  const handleEditProspect = (prospect: ProspectData) => {
    setEditingProspectId(prospect.id);
    setSelectedProspect(prospect);
    setNewProspect({
      ...prospect,
    });
    setShowNewProspectForm(true);
  };

  const handleDeleteProspect = (prospect: ProspectData) => {
    const ok = window.confirm(
      `Confermi l'eliminazione del prospect ${prospect.numeroProspect}?`
    );
    if (!ok) return;

    setProspects(prospects.filter((p) => p.id !== prospect.id));

    if (selectedProspect?.id === prospect.id) {
      setShowProspectDetail(false);
      setSelectedProspect(null);
    }

    alert("Prospect eliminato con successo.");
  };

  // SALVA PROSPECT
  const saveProspect = () => {
    if (!newProspect.denominazioneEsercente.trim()) {
      alert("La denominazione esercente è obbligatoria");
      return;
    }

    if (!newProspect.rappresentantiLegali[0]?.nome.trim()) {
      alert("È necessario inserire almeno un rappresentante legale");
      return;
    }

    setIsLoading(true);

    try {
      const isEdit = !!editingProspectId;

      const prospectData: ProspectData = {
        ...newProspect,
        id: isEdit ? editingProspectId : `prospect-${Date.now()}`,
        numeroProspect: isEdit
          ? selectedProspect?.numeroProspect || `PROS-${Date.now()}`
          : `PROS-${Date.now()}`,
        dataCreazione: isEdit
          ? selectedProspect?.dataCreazione || new Date().toISOString()
          : new Date().toISOString(),
        dataUltimaModifica: new Date().toISOString(),
        creatoBy: isEdit
          ? selectedProspect?.creatoBy || currentUserId
          : currentUserId,
        modificatoBy: currentUserId,
      };

      if (isEdit) {
        setProspects(
          prospects.map((p) => (p.id === editingProspectId ? prospectData : p))
        );
        if (selectedProspect?.id === editingProspectId) {
          setSelectedProspect(prospectData);
        }
        alert("Prospect aggiornato con successo!");
      } else {
        setProspects([prospectData, ...prospects]);
        alert("Prospect creato con successo!");
      }

      setShowNewProspectForm(false);
      setNewProspect(defaultNewProspect);
      setEditingProspectId(null);
    } catch (error) {
      console.error("Errore salvataggio prospect:", error);
      alert("Errore nel salvataggio del prospect");
    } finally {
      setIsLoading(false);
    }
  };

  // FUNZIONE ESPORTA EXCEL
  const exportToExcel = (prospect: ProspectData) => {
    try {
      const wb = XLSX.utils.book_new();

      const wsData = [
        [
          "Dati PROSPECT",
          null,
          null,
          "Dati PROSPECT PER 2° CDP AD ULTERIORE SEDE OPERATIVA",
        ],
        ["Denominazione Esercente", prospect.denominazioneEsercente],
        [
          "Eventuale denominazione Insegna del locale",
          prospect.denominazioneInsegna || "",
        ],
        ["telefono cellulare PV", prospect.telefonoCellularePV || ""],
        ["telefono fisso PV", prospect.telefonoFissoPV || ""],
        ["email PV", prospect.emailPV || ""],
        ["email PEC PV", prospect.emailPECPV || ""],
        ["IBAN (27 caratteri totali)", prospect.iban || ""],
        ["SWIFT", prospect.swift || ""],
        ["Nome Banca", prospect.nomeBanca || ""],
        ["Codice fatt. elettronica SDI", prospect.codiceFatturazioneSDI || ""],
        ["Indirizzo sede operativa PV", prospect.indirizzoSedeOperativa || ""],
        ["Indirizzo sede legale PV", prospect.indirizzoSedeLegale || ""],
        [""],
        ...prospect.rappresentantiLegali.flatMap((rap, index) => [
          [
            `Rappresentante legale/titolare effettivo${
              index > 0 ? ` (${index + 1})` : ""
            }`,
            rap.nome || "",
          ],
          ["telefono", rap.telefono || ""],
          ["email", rap.email || ""],
          ["indirizzo residenza", rap.indirizzoResidenza || ""],
          ["indirizzo comunicazioni", rap.indirizzoComunicazioni || ""],
          [""],
        ]),
        ["Documenti PROSPECT (per ogni RL / TE con quota dal 26% )"],
        [
          "VISURA CAMERALE (attiva e recente 6 mesi)",
          prospect.documenti.visuraCamerale ? "✓" : "",
        ],
        [
          "DOCUMENTO FRONTE RETRO (CI; PATENTE; PASSAPORTO)",
          prospect.documenti.documentoIdentita ? "✓" : "",
        ],
        ["CF FRONTE RETRO", prospect.documenti.codiceFiscale ? "✓" : ""],
        [
          "EVENTUALE PROVA DI RESIDENZA RECENTE",
          prospect.documenti.provaResidenza ? "✓" : "",
        ],
        [""],
        ["Offerta commerciale"],
        ["POSTPAGATO", prospect.offertaCommerciale.postpagato],
        ["POS BILL PAYMENT", prospect.offertaCommerciale.posBillPayment || ""],
        [
          "Profilo Commerciale - LISTINO",
          prospect.offertaCommerciale.profiloCommerciale || "",
        ],
        ["OFFERTA SUNMI", prospect.offertaCommerciale.offertaSunmi || ""],
        [
          "ALTRE OFFERTE COMMERCIALI",
          prospect.offertaCommerciale.altreOfferte || "",
        ],
        ["ADMIRAL SPORT", prospect.offertaCommerciale.admiralSport || ""],
        ["SCADENZA OFFERTA", prospect.offertaCommerciale.scadenzaOfferta || ""],
        [""],
        ["Dati Commerciali"],
        [
          "Flag intercompany (obbligatorio)",
          prospect.datiCommerciali.flagIntercompany,
        ],
        [
          "Tipologia punto vendita (non obbligatorio)",
          prospect.datiCommerciali.tipologiaPuntoVendita || "",
        ],
        ["Commerciale BU_AP", prospect.datiCommerciali.commercialeBUAP || ""],
        ["Canale", prospect.datiCommerciali.canale || ""],
        [
          "(sottocategoria Canale solo per Contratto indiretto)",
          prospect.datiCommerciali.sottocategoriaCanale || "",
        ],
        [
          "Intermediario (solo attivazione API)",
          prospect.datiCommerciali.intermediario || "",
        ],
        [
          "Segnalatore (con anagrafica cosi come oggi)",
          prospect.datiCommerciali.segnalatore || "",
        ],
        ["Promoter (AWP)", prospect.datiCommerciali.promoterAWP || ""],
        ["Promoter (Gad)", prospect.datiCommerciali.promoterGAD || ""],
        [
          "Sottocategoria Promoter (GAD) [valida solo per Quigioco]",
          prospect.datiCommerciali.sottocategoriaPromoterGAD || "",
        ],
        [
          "Promoter per diritto sportivo",
          prospect.datiCommerciali.promoterDirittoSportivo || "",
        ],
        ["Promoter (VLT)", prospect.datiCommerciali.promoterVLT || ""],
        ["Dotazione (multiscelta)", prospect.datiCommerciali.dotazione || ""],
        ["Kit Marketing", prospect.datiCommerciali.kitMarketing || ""],
        [""],
        ["Info aggiuntive per onboarding"],
        ["Connettore WALLET", prospect.infoAggiuntive.connettoreWallet || ""],
        [
          "Connettore ACCREDITO VINCITA",
          prospect.infoAggiuntive.connettoreAccreditoVincita || "",
        ],
        ["UTENZA AL PORTALE", prospect.infoAggiuntive.utenzaPortale || ""],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "DATI PROSPECT");

      const fileName = `Prospect_${prospect.numeroProspect}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`File Excel generato: ${fileName}`);
    } catch (error) {
      console.error("Errore esportazione Excel:", error);
      alert("Errore durante l'esportazione in Excel");
    }
  };

  // SEARCH HANDLER CON DEBOUNCE
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // La ricerca viene già gestita dal useMemo di filteredProspects
    }, 300);
  };

  // FILTRI E PAGINAZIONE
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const matchesSearch =
        searchTerm === "" ||
        prospect.numeroProspect
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        prospect.denominazioneEsercente
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        prospect.denominazioneInsegna
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesTab =
        activeTab === "tutti" ||
        (activeTab === "bozze" && prospect.stato === "Bozza") ||
        (activeTab === "inviati" && prospect.stato === "Inviato") ||
        (activeTab === "approvati" && prospect.stato === "Approvato") ||
        (activeTab === "rifiutati" && prospect.stato === "Rifiutato");

      const matchesStatus =
        selectedStatus === "tutti" || prospect.stato === selectedStatus;

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [prospects, searchTerm, activeTab, selectedStatus]);

  const paginatedProspects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProspects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProspects, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);

  // CARICAMENTO INIZIALE
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    // Carica dati fake per sviluppo
    const fakeProspects = generateProspectsFake();
    setProspects(fakeProspects);
  }, []);

  // CLEANUP TIMEOUT
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } prospect-management-page`}
      id="wrapper"
    >
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        <div className="container-fluid">
          {/* HEADER SECTION */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="page-title mb-0">
                  <i className="fas fa-user-tie me-2"></i>
                  Gestione Prospects
                </h2>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setNewProspect(defaultNewProspect);
                    setEditingProspectId(null);
                    setShowNewProspectForm(true);
                  }}
                >
                  <i className="fas fa-plus me-2"></i>
                  Nuovo Prospect
                </button>
              </div>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="row mb-4">
            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-primary">
                    <i className="fas fa-clipboard-list text-white"></i>
                  </div>
                  <h3 className="stats-number text-primary">{stats.totale}</h3>
                  <p className="stats-label mb-0">Totale Prospects</p>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-secondary">
                    <i className="fas fa-edit text-white"></i>
                  </div>
                  <h3 className="stats-number text-secondary">{stats.bozze}</h3>
                  <p className="stats-label mb-0">Bozze</p>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-warning">
                    <i className="fas fa-paper-plane text-white"></i>
                  </div>
                  <h3 className="stats-number text-warning">{stats.inviati}</h3>
                  <p className="stats-label mb-0">Inviati</p>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-info">
                    <i className="fas fa-cog text-white"></i>
                  </div>
                  <h3 className="stats-number text-info">
                    {stats.inLavorazione}
                  </h3>
                  <p className="stats-label mb-0">In Lavorazione</p>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-success">
                    <i className="fas fa-check-circle text-white"></i>
                  </div>
                  <h3 className="stats-number text-success">
                    {stats.approvati}
                  </h3>
                  <p className="stats-label mb-0">Approvati</p>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-3">
              <div className="card stats-card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div className="stats-icon bg-danger">
                    <i className="fas fa-times-circle text-white"></i>
                  </div>
                  <h3 className="stats-number text-danger">
                    {stats.rifiutati}
                  </h3>
                  <p className="stats-label mb-0">Rifiutati</p>
                </div>
              </div>
            </div>
          </div>

          {/* CHART SECTION */}
          {chartData.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-chart-pie me-2"></i>
                      Distribuzione Stati Prospects
                    </h5>
                  </div>
                  <div className="card-body">
                    <div style={{ height: "300px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) =>
                              `${entry.name}: ${entry.value} (${(
                                entry.percent * 100
                              ).toFixed(0)}%)`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FILTERS AND SEARCH */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-4">
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cerca per numero, denominazione o insegna..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <select
                        className="form-select"
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                      >
                        <option value="tutti">Tutti gli stati</option>
                        <option value="Bozza">Bozza</option>
                        <option value="Inviato">Inviato</option>
                        <option value="In Lavorazione">In Lavorazione</option>
                        <option value="Approvato">Approvato</option>
                        <option value="Rifiutato">Rifiutato</option>
                      </select>
                    </div>

                    <div className="col-md-5">
                      <ul className="nav nav-pills justify-content-end">
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "tutti" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("tutti");
                              setCurrentPage(1);
                            }}
                          >
                            Tutti ({stats.totale})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "bozze" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("bozze");
                              setCurrentPage(1);
                            }}
                          >
                            Bozze ({stats.bozze})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "inviati" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("inviati");
                              setCurrentPage(1);
                            }}
                          >
                            Inviati ({stats.inviati})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "approvati" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("approvati");
                              setCurrentPage(1);
                            }}
                          >
                            Approvati ({stats.approvati})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "rifiutati" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("rifiutati");
                              setCurrentPage(1);
                            }}
                          >
                            Rifiutati ({stats.rifiutati})
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PROSPECTS TABLE */}
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-list me-2"></i>
                    Lista Prospects ({filteredProspects.length})
                  </h5>
                  <small className="text-muted">
                    Pagina {currentPage} di {totalPages}
                  </small>
                </div>

                <div className="card-body p-0">
                  {isLoading ? (
                    <div className="text-center p-4">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="alert alert-danger m-3" role="alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  ) : paginatedProspects.length === 0 ? (
                    <div className="text-center p-4">
                      <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessun prospect trovato</h5>
                      <p className="text-muted">
                        {searchTerm || selectedStatus !== "tutti"
                          ? "Prova a modificare i filtri di ricerca"
                          : "Inizia creando un nuovo prospect"}
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Numero</th>
                            <th>Denominazione</th>
                            <th>Insegna</th>
                            <th>Stato</th>
                            <th>Data Creazione</th>
                            <th>Ultima Modifica</th>
                            <th>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProspects.map((prospect) => (
                            <tr key={prospect.id}>
                              <td>
                                <strong className="text-primary">
                                  {prospect.numeroProspect}
                                </strong>
                              </td>
                              <td>
                                <div
                                  className="prospect-name"
                                  onClick={() => handleProspectClick(prospect)}
                                  style={{ cursor: "pointer" }}
                                  title="Clicca per visualizzare i dettagli"
                                >
                                  {prospect.denominazioneEsercente}
                                </div>
                              </td>
                              <td>{prospect.denominazioneInsegna || "-"}</td>
                              <td>
                                <span
                                  className={getStatusBadgeClass(
                                    prospect.stato
                                  )}
                                >
                                  {prospect.stato}
                                </span>
                              </td>
                              <td>{formatDate(prospect.dataCreazione)}</td>
                              <td>
                                {prospect.dataUltimaModifica
                                  ? formatDate(prospect.dataUltimaModifica)
                                  : "-"}
                              </td>
                              <td>
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() =>
                                      handleProspectClick(prospect)
                                    }
                                    title="Visualizza dettagli"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>

                                  {(isAdmin ||
                                    prospect.creatoBy === currentUserId) && (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-warning"
                                        onClick={() =>
                                          handleEditProspect(prospect)
                                        }
                                        title="Modifica"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>

                                      <button
                                        className="btn btn-sm btn-outline-success"
                                        onClick={() => exportToExcel(prospect)}
                                        title="Esporta Excel"
                                      >
                                        <i className="fas fa-file-excel"></i>
                                      </button>

                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() =>
                                          handleDeleteProspect(prospect)
                                        }
                                        title="Elimina"
                                      >
                                        <i className="fas fa-trash"></i>
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
                  )}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="card-footer bg-white">
                    <nav aria-label="Paginazione prospects">
                      <ul className="pagination pagination-sm justify-content-center mb-0">
                        <li
                          className={`page-item ${
                            currentPage === 1 ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <i className="fas fa-chevron-left"></i>
                          </button>
                        </li>

                        {Array.from({ length: totalPages }, (_, index) => {
                          const page = index + 1;
                          const isVisible =
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 2 &&
                              page <= currentPage + 2);

                          if (!isVisible) {
                            if (
                              page === currentPage - 3 ||
                              page === currentPage + 3
                            ) {
                              return (
                                <li key={page} className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              );
                            }
                            return null;
                          }

                          return (
                            <li
                              key={page}
                              className={`page-item ${
                                currentPage === page ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          );
                        })}

                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <i className="fas fa-chevron-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL NUOVO/MODIFICA PROSPECT */}
      {showNewProspectForm && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>
                  {editingProspectId ? "Modifica Prospect" : "Nuovo Prospect"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowNewProspectForm(false);
                    setNewProspect(defaultNewProspect);
                    setEditingProspectId(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <form>
                  {/* DATI AZIENDA */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="section-title">
                        <i className="fas fa-building me-2"></i>
                        Dati Azienda/Esercente
                      </h6>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Denominazione Esercente{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.denominazioneEsercente}
                        onChange={handleNewProspectFieldChange(
                          "denominazioneEsercente"
                        )}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Denominazione Insegna
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.denominazioneInsegna || ""}
                        onChange={handleNewProspectFieldChange(
                          "denominazioneInsegna"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Telefono Cellulare PV
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newProspect.telefonoCellularePV || ""}
                        onChange={handleNewProspectFieldChange(
                          "telefonoCellularePV"
                        )}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Telefono Fisso PV</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newProspect.telefonoFissoPV || ""}
                        onChange={handleNewProspectFieldChange(
                          "telefonoFissoPV"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Email PV</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newProspect.emailPV || ""}
                        onChange={handleNewProspectFieldChange("emailPV")}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email PEC PV</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newProspect.emailPECPV || ""}
                        onChange={handleNewProspectFieldChange("emailPECPV")}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">IBAN</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.iban || ""}
                        onChange={handleNewProspectFieldChange("iban")}
                        maxLength={27}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">SWIFT</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.swift || ""}
                        onChange={handleNewProspectFieldChange("swift")}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Nome Banca</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.nomeBanca || ""}
                        onChange={handleNewProspectFieldChange("nomeBanca")}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Codice Fatturazione SDI
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.codiceFatturazioneSDI || ""}
                        onChange={handleNewProspectFieldChange(
                          "codiceFatturazioneSDI"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label">
                        Indirizzo Sede Operativa
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={newProspect.indirizzoSedeOperativa || ""}
                        onChange={handleNewProspectFieldChange(
                          "indirizzoSedeOperativa"
                        )}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Indirizzo Sede Legale
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={newProspect.indirizzoSedeLegale || ""}
                        onChange={handleNewProspectFieldChange(
                          "indirizzoSedeLegale"
                        )}
                      />
                    </div>
                  </div>

                  {/* RAPPRESENTANTI LEGALI */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="section-title mb-0">
                          <i className="fas fa-users me-2"></i>
                          Rappresentanti Legali
                        </h6>
                        {newProspect.rappresentantiLegali.length < 4 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={addRappresentante}
                          >
                            <i className="fas fa-plus me-1"></i>
                            Aggiungi Rappresentante
                          </button>
                        )}
                      </div>

                      {newProspect.rappresentantiLegali.map(
                        (rappresentante, index) => (
                          <div key={index} className="card mb-3">
                            <div className="card-header d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">
                                Rappresentante Legale {index + 1}
                                {index === 0 && (
                                  <span className="text-danger"> *</span>
                                )}
                              </h6>
                              {index > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeRappresentante(index)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">
                                    Nome e Cognome
                                    {index === 0 && (
                                      <span className="text-danger"> *</span>
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={rappresentante.nome}
                                    onChange={(e) =>
                                      handleRappresentanteChange(
                                        index,
                                        "nome",
                                        e.target.value
                                      )
                                    }
                                    required={index === 0}
                                  />
                                </div>
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">Telefono</label>
                                  <input
                                    type="tel"
                                    className="form-control"
                                    value={rappresentante.telefono || ""}
                                    onChange={(e) =>
                                      handleRappresentanteChange(
                                        index,
                                        "telefono",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">Email</label>
                                  <input
                                    type="email"
                                    className="form-control"
                                    value={rappresentante.email || ""}
                                    onChange={(e) =>
                                      handleRappresentanteChange(
                                        index,
                                        "email",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-md-6 mb-3">
                                  <label className="form-label">
                                    Indirizzo Residenza
                                  </label>
                                  <textarea
                                    className="form-control"
                                    rows={2}
                                    value={
                                      rappresentante.indirizzoResidenza || ""
                                    }
                                    onChange={(e) =>
                                      handleRappresentanteChange(
                                        index,
                                        "indirizzoResidenza",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-md-12 mb-3">
                                  <label className="form-label">
                                    Indirizzo Comunicazioni
                                  </label>
                                  <textarea
                                    className="form-control"
                                    rows={2}
                                    value={
                                      rappresentante.indirizzoComunicazioni ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleRappresentanteChange(
                                        index,
                                        "indirizzoComunicazioni",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* DOCUMENTI */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="section-title">
                        <i className="fas fa-file-alt me-2"></i>
                        Documenti Richiesti
                      </h6>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={newProspect.documenti.documentoIdentita}
                          onChange={handleNewProspectFieldChange(
                            "documenti.documentoIdentita"
                          )}
                        />
                        <label className="form-check-label">
                          Documento Identità
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={newProspect.documenti.codiceFiscale}
                          onChange={handleNewProspectFieldChange(
                            "documenti.codiceFiscale"
                          )}
                        />
                        <label className="form-check-label">
                          Codice Fiscale
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={newProspect.documenti.provaResidenza}
                          onChange={handleNewProspectFieldChange(
                            "documenti.provaResidenza"
                          )}
                        />
                        <label className="form-check-label">
                          Prova Residenza
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* OFFERTA COMMERCIALE */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="section-title">
                        <i className="fas fa-handshake me-2"></i>
                        Offerta Commerciale
                      </h6>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Postpagato</label>
                      <select
                        className="form-select"
                        value={newProspect.offertaCommerciale.postpagato}
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.postpagato"
                        )}
                      >
                        <option value="NO">NO</option>
                        <option value="SI">SI</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">POS Bill Payment</label>
                      <select
                        className="form-select"
                        value={newProspect.offertaCommerciale.posBillPayment}
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.posBillPayment"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        <option value="ETHERNET">ETHERNET</option>
                        <option value="GPRS">GPRS</option>
                        <option value="WIFI">WIFI</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Profilo Commerciale</label>
                      <select
                        className="form-select"
                        value={
                          newProspect.offertaCommerciale.profiloCommerciale ||
                          ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.profiloCommerciale"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        {PROFILO_COMMERCIALE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Offerta SUNMI</label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.offertaCommerciale.offertaSunmi || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.offertaSunmi"
                        )}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Altre Offerte</label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.offertaCommerciale.altreOfferte || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.altreOfferte"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Admiral Sport</label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.offertaCommerciale.admiralSport || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.admiralSport"
                        )}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Scadenza Offerta</label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.offertaCommerciale.scadenzaOfferta || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "offertaCommerciale.scadenzaOfferta"
                        )}
                      />
                    </div>
                  </div>

                  {/* DATI COMMERCIALI */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="section-title">
                        <i className="fas fa-chart-line me-2"></i>
                        Dati Commerciali
                      </h6>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Flag Intercompany</label>
                      <select
                        className="form-select"
                        value={newProspect.datiCommerciali.flagIntercompany}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.flagIntercompany"
                        )}
                      >
                        <option value="no">NO</option>
                        <option value="si">SI</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">
                        Tipologia Punto Vendita
                      </label>
                      <select
                        className="form-select"
                        value={
                          newProspect.datiCommerciali.tipologiaPuntoVendita ||
                          ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.tipologiaPuntoVendita"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        {TIPOLOGIA_PV_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Commerciale BU_AP</label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.datiCommerciali.commercialeBUAP || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.commercialeBUAP"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Canale</label>
                      <select
                        className="form-select"
                        value={newProspect.datiCommerciali.canale || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.canale"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        {CANALE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Sottocategoria Canale
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.datiCommerciali.sottocategoriaCanale || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.sottocategoriaCanale"
                        )}
                        placeholder="Solo per Contratto indiretto"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Intermediario</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.datiCommerciali.intermediario || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.intermediario"
                        )}
                        placeholder="Solo attivazione API"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Segnalatore</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.datiCommerciali.segnalatore || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.segnalatore"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Promoter (AWP)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.datiCommerciali.promoterAWP || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.promoterAWP"
                        )}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Promoter (GAD)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.datiCommerciali.promoterGAD || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.promoterGAD"
                        )}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Sottocategoria Promoter (GAD)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.datiCommerciali
                            .sottocategoriaPromoterGAD || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.sottocategoriaPromoterGAD"
                        )}
                        placeholder="Solo per Quigioco"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">
                        Promoter Diritto Sportivo
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.datiCommerciali.promoterDirittoSportivo ||
                          ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.promoterDirittoSportivo"
                        )}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Promoter (VLT)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.datiCommerciali.promoterVLT || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.promoterVLT"
                        )}
                      />
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Dotazione</label>
                      <select
                        className="form-select"
                        value={newProspect.datiCommerciali.dotazione || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.dotazione"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        {DOTAZIONE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Kit Marketing</label>
                      <select
                        className="form-select"
                        value={newProspect.datiCommerciali.kitMarketing || ""}
                        onChange={handleNewProspectFieldChange(
                          "datiCommerciali.kitMarketing"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        {KIT_MARKETING_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* INFO AGGIUNTIVE */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="section-title">
                        <i className="fas fa-info-circle me-2"></i>
                        Info Aggiuntive per Onboarding
                      </h6>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Connettore WALLET</label>
                      <select
                        className="form-select"
                        value={newProspect.infoAggiuntive.connettoreWallet}
                        onChange={handleNewProspectFieldChange(
                          "infoAggiuntive.connettoreWallet"
                        )}
                      >
                        <option value="">Seleziona...</option>
                        <option value="SI">SI</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Connettore Accredito Vincita
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          newProspect.infoAggiuntive
                            .connettoreAccreditoVincita || ""
                        }
                        onChange={handleNewProspectFieldChange(
                          "infoAggiuntive.connettoreAccreditoVincita"
                        )}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Utenza al Portale</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newProspect.infoAggiuntive.utenzaPortale || ""}
                        onChange={handleNewProspectFieldChange(
                          "infoAggiuntive.utenzaPortale"
                        )}
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewProspectForm(false);
                    setNewProspect(defaultNewProspect);
                    setEditingProspectId(null);
                  }}
                >
                  Annulla
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveProspect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      {editingProspectId ? "Aggiorna" : "Salva"} Prospect
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BACKDROP PER MODALI */}
      {(showNewProspectForm || showProspectDetail) && (
        <div
          className="modal-backdrop fade show"
          onClick={() => {
            if (showNewProspectForm) {
              setShowNewProspectForm(false);
              setNewProspect(defaultNewProspect);
              setEditingProspectId(null);
            }
            if (showProspectDetail) {
              setShowProspectDetail(false);
              setSelectedProspect(null);
            }
          }}
        ></div>
      )}

      {/* MODAL DETTAGLIO PROSPECT */}
      {showProspectDetail && selectedProspect && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-eye me-2"></i>
                  Dettagli Prospect - {selectedProspect.numeroProspect}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowProspectDetail(false);
                    setSelectedProspect(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                {/* DATI AZIENDA */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-building me-2"></i>
                      Dati Azienda/Esercente
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>Denominazione Esercente:</strong>
                        <br />
                        {selectedProspect.denominazioneEsercente}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Denominazione Insegna:</strong>
                        <br />
                        {selectedProspect.denominazioneInsegna ||
                          "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Telefono Cellulare:</strong>
                        <br />
                        {selectedProspect.telefonoCellularePV ? (
                          <a
                            href={`tel:${selectedProspect.telefonoCellularePV}`}
                          >
                            {selectedProspect.telefonoCellularePV}
                          </a>
                        ) : (
                          "Non specificato"
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Telefono Fisso:</strong>
                        <br />
                        {selectedProspect.telefonoFissoPV ? (
                          <a href={`tel:${selectedProspect.telefonoFissoPV}`}>
                            {selectedProspect.telefonoFissoPV}
                          </a>
                        ) : (
                          "Non specificato"
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Email:</strong>
                        <br />
                        {selectedProspect.emailPV ? (
                          <a href={`mailto:${selectedProspect.emailPV}`}>
                            {selectedProspect.emailPV}
                          </a>
                        ) : (
                          "Non specificata"
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Email PEC:</strong>
                        <br />
                        {selectedProspect.emailPECPV ? (
                          <a href={`mailto:${selectedProspect.emailPECPV}`}>
                            {selectedProspect.emailPECPV}
                          </a>
                        ) : (
                          "Non specificata"
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>IBAN:</strong>
                        <br />
                        {selectedProspect.iban || "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Nome Banca:</strong>
                        <br />
                        {selectedProspect.nomeBanca || "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Sede Operativa:</strong>
                        <br />
                        {selectedProspect.indirizzoSedeOperativa ||
                          "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Sede Legale:</strong>
                        <br />
                        {selectedProspect.indirizzoSedeLegale ||
                          "Non specificata"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RAPPRESENTANTI LEGALI */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-users me-2"></i>
                      Rappresentanti Legali
                    </h6>
                  </div>
                  <div className="card-body">
                    {selectedProspect.rappresentantiLegali.map((rap, index) => (
                      <div key={index} className="mb-3 p-3 border rounded">
                        <h6 className="text-primary">
                          Rappresentante {index + 1}
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <strong>Nome:</strong>{" "}
                            {rap.nome || "Non specificato"}
                          </div>
                          <div className="col-md-6">
                            <strong>Telefono:</strong>{" "}
                            {rap.telefono ? (
                              <a href={`tel:${rap.telefono}`}>{rap.telefono}</a>
                            ) : (
                              "Non specificato"
                            )}
                          </div>
                          <div className="col-md-6">
                            <strong>Email:</strong>{" "}
                            {rap.email ? (
                              <a href={`mailto:${rap.email}`}>{rap.email}</a>
                            ) : (
                              "Non specificata"
                            )}
                          </div>
                          <div className="col-md-6">
                            <strong>Residenza:</strong>{" "}
                            {rap.indirizzoResidenza || "Non specificata"}
                          </div>
                          <div className="col-12">
                            <strong>Comunicazioni:</strong>{" "}
                            {rap.indirizzoComunicazioni || "Non specificata"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DOCUMENTI */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-file-alt me-2"></i>
                      Documenti
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedProspect.documenti.visuraCamerale}
                            disabled
                          />
                          <label className="form-check-label">
                            Visura Camerale
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={
                              selectedProspect.documenti.documentoIdentita
                            }
                            disabled
                          />
                          <label className="form-check-label">
                            Documento Identità
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedProspect.documenti.codiceFiscale}
                            disabled
                          />
                          <label className="form-check-label">
                            Codice Fiscale
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedProspect.documenti.provaResidenza}
                            disabled
                          />
                          <label className="form-check-label">
                            Prova Residenza
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OFFERTA COMMERCIALE */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-handshake me-2"></i>
                      Offerta Commerciale
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>Postpagato:</strong>
                        <br />
                        <span
                          className={`badge ${
                            selectedProspect.offertaCommerciale.postpagato ===
                            "SI"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {selectedProspect.offertaCommerciale.postpagato}
                        </span>
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>POS Bill Payment:</strong>
                        <br />
                        {selectedProspect.offertaCommerciale.posBillPayment ||
                          "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Profilo Commerciale:</strong>
                        <br />
                        {selectedProspect.offertaCommerciale
                          .profiloCommerciale || "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Offerta SUNMI:</strong>
                        <br />
                        {selectedProspect.offertaCommerciale.offertaSunmi ||
                          "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Altre Offerte:</strong>
                        <br />
                        {selectedProspect.offertaCommerciale.altreOfferte ||
                          "Nessuna"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Scadenza Offerta:</strong>
                        <br />
                        {selectedProspect.offertaCommerciale.scadenzaOfferta ||
                          "Non specificata"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DATI COMMERCIALI */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-chart-line me-2"></i>
                      Dati Commerciali
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>Flag Intercompany:</strong>
                        <br />
                        <span
                          className={`badge ${
                            selectedProspect.datiCommerciali
                              .flagIntercompany === "si"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {selectedProspect.datiCommerciali.flagIntercompany?.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Tipologia Punto Vendita:</strong>
                        <br />
                        {selectedProspect.datiCommerciali
                          .tipologiaPuntoVendita || "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Commerciale BU_AP:</strong>
                        <br />
                        {selectedProspect.datiCommerciali.commercialeBUAP ||
                          "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Canale:</strong>
                        <br />
                        {selectedProspect.datiCommerciali.canale ||
                          "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Dotazione:</strong>
                        <br />
                        {selectedProspect.datiCommerciali.dotazione ||
                          "Non specificata"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Kit Marketing:</strong>
                        <br />
                        {selectedProspect.datiCommerciali.kitMarketing ||
                          "Non specificato"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* INFO AGGIUNTIVE */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Info Aggiuntive
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>Connettore Wallet:</strong>
                        <br />
                        <span
                          className={`badge ${
                            selectedProspect.infoAggiuntive.connettoreWallet ===
                            "SI"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {selectedProspect.infoAggiuntive.connettoreWallet ||
                            "Non specificato"}
                        </span>
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Connettore Accredito Vincita:</strong>
                        <br />
                        {selectedProspect.infoAggiuntive
                          .connettoreAccreditoVincita || "Non specificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Utenza Portale:</strong>
                        <br />
                        {selectedProspect.infoAggiuntive.utenzaPortale ||
                          "Non specificata"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* METADATI */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-info me-2"></i>
                      Informazioni Sistema
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <strong>Stato:</strong>
                        <br />
                        <span
                          className={getStatusBadgeClass(
                            selectedProspect.stato
                          )}
                        >
                          {selectedProspect.stato}
                        </span>
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Data Creazione:</strong>
                        <br />
                        {formatDate(selectedProspect.dataCreazione)}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Ultima Modifica:</strong>
                        <br />
                        {selectedProspect.dataUltimaModifica
                          ? formatDate(selectedProspect.dataUltimaModifica)
                          : "Mai modificato"}
                      </div>
                      <div className="col-md-6 mb-3">
                        <strong>Creato da:</strong>
                        <br />
                        {selectedProspect.creatoBy}
                      </div>
                      {selectedProspect.modificatoBy && (
                        <div className="col-md-6 mb-3">
                          <strong>Modificato da:</strong>
                          <br />
                          {selectedProspect.modificatoBy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowProspectDetail(false);
                    setSelectedProspect(null);
                  }}
                >
                  Chiudi
                </button>

                {(isAdmin || selectedProspect.creatoBy === currentUserId) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => {
                        setShowProspectDetail(false);
                        handleEditProspect(selectedProspect);
                      }}
                    >
                      <i className="fas fa-edit me-2"></i>
                      Modifica
                    </button>

                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => exportToExcel(selectedProspect)}
                    >
                      <i className="fas fa-file-excel me-2"></i>
                      Esporta Excel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectManagement;
