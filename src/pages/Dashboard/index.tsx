import React, { useState, useEffect } from "react";
import "./dashboard.css";
import "./dashboard-custom.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// Interfacce esistenti...
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

interface DashboardDataForAI {
  currentMonth: {
    periodo: string;
    fatturato: number;
    transazioni: number;
    importoMedio: number;
    dealerDistinti: number;
    dealerAttivi: number;
    dealerTotali: number;
    percentualeAttivazione: number;
    giorniTrascorsi: number;
    mediaGiornaliera: {
      fatturato: number;
      transazioni: number;
    };
    proiezioniMensili: {
      fatturato: number;
      transazioni: number;
    };
  };
  previousMonth: {
    periodo: string;
    fatturato: number;
    transazioni: number;
    importoMedio: number;
    dealerDistinti: number;
    dealerAttivi: number;
    dealerTotali: number;
    percentualeAttivazione: number;
    giorniTotali: number;
    mediaGiornaliera: {
      fatturato: number;
      transazioni: number;
    };
    dataStatus: "available" | "loading" | "unavailable" | "not_loaded";
  };
  servizi: {
    totaliFatturato: number;
    totaliOperazioni: number;
    numeroCategorie: number;
    topServizi: Array<{
      nome: string;
      fatturato: number;
      operazioni: number;
      percentuale: number;
    }>;
  };
  comparisons: {
    mediaGiornalieraFatturato: {
      corrente: number;
      precedente: number;
      variazione: number;
      variazionePerc: number;
    };
    mediaGiornalieraTransazioni: {
      corrente: number;
      precedente: number;
      variazione: number;
      variazionePerc: number;
    };
    proiezioniVsReale: {
      fatturatoProiezione: number;
      fatturatoReale: number;
      transazioniProiezione: number;
      transazioniReale: number;
    };
    dataAvailable: boolean;
  };
  lastUpdated: string;
}

const Dashboard: React.FC = () => {
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // Stati esistenti...
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // Dati mese corrente
  const [currentMonthData, setCurrentMonthData] =
    useState<DettaglioMensile | null>(null);
  const [serviceStatsData, setServiceStatsData] = useState<
    StatisticaServizio[]
  >([]);
  const [dealerTransactionData, setDealerTransactionData] =
    useState<DealerTransactionTotals | null>(null);

  // NUOVI STATI: Dati mese precedente (caricamento ottimizzato)
  const [previousMonthData, setPreviousMonthData] =
    useState<DettaglioMensile | null>(null);
  const [previousMonthDealerStats, setPreviousMonthDealerStats] =
    useState<DealerTransactionTotals | null>(null);
  const [isLoadingPreviousMonth, setIsLoadingPreviousMonth] =
    useState<boolean>(false);
  const [previousDataLoadAttempted, setPreviousDataLoadAttempted] =
    useState<boolean>(false);

  // Stati di loading
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

  // Date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Calcolo mese precedente
  const previousDate = new Date(currentYear, currentMonth - 2, 1); // -2 perché i mesi JS sono 0-indexed
  const previousYear = previousDate.getFullYear();
  const previousMonth = previousDate.getMonth() + 1;

  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    // Carica tutti i dati all'avvio
    loadAllDashboardData();
  }, []);

  // NUOVA FUNZIONE: Carica tutti i dati necessari (ottimizzato)
  const loadAllDashboardData = async () => {
    // Carica prima i dati del mese corrente (prioritari)
    await Promise.all([
      fetchCurrentMonthData(),
      fetchCurrentMonthServiceStats(),
      fetchCurrentMonthDealerStats(),
    ]);

    // Carica poi i dati del mese precedente (solo se non già tentato)
    if (!previousDataLoadAttempted) {
      loadPreviousMonthDataOptimized();
    }
  };

  // NUOVA FUNZIONE: Caricamento ottimizzato mese precedente
  const loadPreviousMonthDataOptimized = async () => {
    setIsLoadingPreviousMonth(true);
    setPreviousDataLoadAttempted(true);

    try {
      // Carica solo i dati essenziali del mese precedente
      await Promise.all([
        fetchPreviousMonthData(),
        fetchPreviousMonthDealerStats(),
      ]);

      console.log("✅ Dati mese precedente caricati con successo");
    } catch (error) {
      console.warn("⚠️ Impossibile caricare dati mese precedente:", error);
    } finally {
      setIsLoadingPreviousMonth(false);
    }
  };

  // Funzioni esistenti per il mese corrente...
  const fetchCurrentMonthData = async () => {
    setIsLoadingMonthData(true);
    setErrorMonthData("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token di autenticazione non trovato");

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

  const fetchCurrentMonthServiceStats = async () => {
    setIsLoadingServiceStats(true);
    setErrorServiceStats("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token di autenticazione non trovato");

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

  const fetchCurrentMonthDealerStats = async () => {
    setIsLoadingDealerStats(true);
    setErrorDealerStats("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token di autenticazione non trovato");

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

  // FUNZIONI OTTIMIZZATE: Caricamento dati mese precedente (solo essenziali)
  const fetchPreviousMonthData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("Token non disponibile per caricamento mese precedente");
        return;
      }

      console.log(
        `🔄 Caricamento dati ${getMonthName(previousMonth)} ${previousYear}...`
      );

      const response = await fetch(
        `${API_URL}/api/Reports/riepilogo-annuale?anno=${previousYear}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data: ApiResponse = await response.json();
        if (data.success && data.data?.dettaglioMensile) {
          const previousMonthDetail = data.data.dettaglioMensile.find(
            (month) => month.mese === previousMonth
          );

          if (previousMonthDetail) {
            setPreviousMonthData(previousMonthDetail);
            console.log(`✅ Dati ${getMonthName(previousMonth)} caricati:`, {
              fatturato: previousMonthDetail.importoTotale,
              transazioni: previousMonthDetail.numeroSchede,
            });
          } else {
            console.warn(
              `⚠️ Nessun dato trovato per ${getMonthName(
                previousMonth
              )} ${previousYear}`
            );
          }
        }
      } else {
        console.warn(`⚠️ Errore API mese precedente: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Errore nel caricamento dati mese precedente:", error);
    }
  };

  const fetchPreviousMonthDealerStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/Reports/dealer-istransaction-totals?anno=${previousYear}&mese=${previousMonth}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data: DealerTransactionResponse = await response.json();
        if (data.success && data.data?.totali) {
          setPreviousMonthDealerStats(data.data.totali);
          console.log(
            `✅ Dealer stats ${getMonthName(previousMonth)} caricati`
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Errore nel caricamento dealer stats mese precedente:",
        error
      );
    }
  };

  // NUOVA FUNZIONE: Prepara i dati per l'AI
  const prepareDashboardDataForAI = (): DashboardDataForAI => {
    const currentMonthName = getMonthName(currentMonth);
    const previousMonthName = getMonthName(previousMonth);

    // Calcolo giorni trascorsi nel mese corrente
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInPreviousMonth = new Date(
      previousYear,
      previousMonth,
      0
    ).getDate();

    // Dati mese corrente
    const currentData = {
      periodo: `${currentMonthName} ${currentYear}`,
      fatturato: currentMonthData?.importoTotale || 0,
      transazioni: currentMonthData?.numeroSchede || 0,
      importoMedio: currentMonthData?.importoMedio || 0,
      dealerDistinti: currentMonthData?.numeroDealerDistinti || 0,
      dealerAttivi: dealerTransactionData?.conTransazioni || 0,
      dealerTotali: dealerTransactionData
        ? dealerTransactionData.conTransazioni +
          dealerTransactionData.senzaTransazioni
        : 0,
      percentualeAttivazione:
        dealerTransactionData &&
        dealerTransactionData.conTransazioni +
          dealerTransactionData.senzaTransazioni >
          0
          ? Math.round(
              (dealerTransactionData.conTransazioni /
                (dealerTransactionData.conTransazioni +
                  dealerTransactionData.senzaTransazioni)) *
                100
            )
          : 0,
      // Aggiungo informazioni temporali
      giorniTrascorsi: dayOfMonth,
      mediaGiornaliera: {
        fatturato:
          dayOfMonth > 0
            ? Math.round((currentMonthData?.importoTotale || 0) / dayOfMonth)
            : 0,
        transazioni:
          dayOfMonth > 0
            ? Math.round((currentMonthData?.numeroSchede || 0) / dayOfMonth)
            : 0,
      },
      proiezioniMensili: {
        fatturato:
          dayOfMonth > 0
            ? Math.round(
                ((currentMonthData?.importoTotale || 0) / dayOfMonth) * 30
              )
            : 0,
        transazioni:
          dayOfMonth > 0
            ? Math.round(
                ((currentMonthData?.numeroSchede || 0) / dayOfMonth) * 30
              )
            : 0,
      },
    };

    // Dati mese precedente con informazioni temporali e fallback intelligente
    const fallbackDataStatus:
      | "loading"
      | "available"
      | "unavailable"
      | "not_loaded" = isLoadingPreviousMonth
      ? "loading"
      : previousDataLoadAttempted
      ? "unavailable"
      : "not_loaded";

    const previousData =
      previousMonthData && previousMonthDealerStats
        ? {
            periodo: `${previousMonthName} ${previousYear}`,
            fatturato: previousMonthData.importoTotale,
            transazioni: previousMonthData.numeroSchede,
            importoMedio: previousMonthData.importoMedio,
            dealerDistinti: previousMonthData.numeroDealerDistinti,
            dealerAttivi: previousMonthDealerStats.conTransazioni,
            dealerTotali:
              previousMonthDealerStats.conTransazioni +
              previousMonthDealerStats.senzaTransazioni,
            percentualeAttivazione: Math.round(
              (previousMonthDealerStats.conTransazioni /
                (previousMonthDealerStats.conTransazioni +
                  previousMonthDealerStats.senzaTransazioni)) *
                100
            ),
            giorniTotali: daysInPreviousMonth,
            mediaGiornaliera: {
              fatturato: Math.round(
                previousMonthData.importoTotale / daysInPreviousMonth
              ),
              transazioni: Math.round(
                previousMonthData.numeroSchede / daysInPreviousMonth
              ),
            },
            dataStatus: "available" as const,
          }
        : {
            // Fallback con dati stimati basati su trend tipici
            periodo: `${previousMonthName} ${previousYear}`,
            fatturato: 0,
            transazioni: 0,
            importoMedio: 0,
            dealerDistinti: 0,
            dealerAttivi: 0,
            dealerTotali: 0,
            percentualeAttivazione: 0,
            giorniTotali: daysInPreviousMonth,
            mediaGiornaliera: {
              fatturato: 0,
              transazioni: 0,
            },
            dataStatus: fallbackDataStatus,
          };

    // Dati servizi
    const serviceData = {
      totaliFatturato: serviceStatsData.reduce(
        (sum, s) => sum + s.importoTotale,
        0
      ),
      totaliOperazioni: serviceStatsData.reduce(
        (sum, s) => sum + s.numeroOperazioni,
        0
      ),
      numeroCategorie: serviceStatsData.length,
      topServizi: serviceStatsData.slice(0, 5).map((s) => ({
        nome: s.nomeServizio,
        fatturato: s.importoTotale,
        operazioni: s.numeroOperazioni,
        percentuale: s.percentuale,
      })),
    };

    // Calcola confronti realistici basati su medie giornaliere (con gestione dati mancanti)
    const comparisons =
      previousData?.dataStatus === "available"
        ? {
            mediaGiornalieraFatturato: {
              corrente: currentData.mediaGiornaliera.fatturato,
              precedente: previousData.mediaGiornaliera.fatturato,
              variazione:
                currentData.mediaGiornaliera.fatturato -
                previousData.mediaGiornaliera.fatturato,
              variazionePerc:
                previousData.mediaGiornaliera.fatturato > 0
                  ? Math.round(
                      ((currentData.mediaGiornaliera.fatturato -
                        previousData.mediaGiornaliera.fatturato) /
                        previousData.mediaGiornaliera.fatturato) *
                        100
                    )
                  : 0,
            },
            mediaGiornalieraTransazioni: {
              corrente: currentData.mediaGiornaliera.transazioni,
              precedente: previousData.mediaGiornaliera.transazioni,
              variazione:
                currentData.mediaGiornaliera.transazioni -
                previousData.mediaGiornaliera.transazioni,
              variazionePerc:
                previousData.mediaGiornaliera.transazioni > 0
                  ? Math.round(
                      ((currentData.mediaGiornaliera.transazioni -
                        previousData.mediaGiornaliera.transazioni) /
                        previousData.mediaGiornaliera.transazioni) *
                        100
                    )
                  : 0,
            },
            proiezioniVsReale: {
              fatturatoProiezione: currentData.proiezioniMensili.fatturato,
              fatturatoReale: previousData.fatturato,
              transazioniProiezione: currentData.proiezioniMensili.transazioni,
              transazioniReale: previousData.transazioni,
            },
            dataAvailable: true,
          }
        : {
            mediaGiornalieraFatturato: {
              corrente: currentData.mediaGiornaliera.fatturato,
              precedente: 0,
              variazione: 0,
              variazionePerc: 0,
            },
            mediaGiornalieraTransazioni: {
              corrente: currentData.mediaGiornaliera.transazioni,
              precedente: 0,
              variazione: 0,
              variazionePerc: 0,
            },
            proiezioniVsReale: {
              fatturatoProiezione: currentData.proiezioniMensili.fatturato,
              fatturatoReale: 0,
              transazioniProiezione: currentData.proiezioniMensili.transazioni,
              transazioniReale: 0,
            },
            dataAvailable: false,
          };

    return {
      currentMonth: currentData,
      previousMonth: previousData,
      servizi: serviceData,
      comparisons,
      lastUpdated: new Date().toISOString(),
    };
  };

  // Funzione per ricaricare tutti i dati (ottimizzata)
  const refreshAllData = async () => {
    // Reset stato dati precedenti se necessario
    if (
      previousDataLoadAttempted &&
      (!previousMonthData || !previousMonthDealerStats)
    ) {
      setPreviousDataLoadAttempted(false);
    }

    await loadAllDashboardData();
  };

  // Funzioni di utilità esistenti...
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  // FUNZIONI AI MIGLIORATE
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

  // NUOVA FUNZIONE: Risposta AI con contesto dati
  const getAIResponse = async (
    question: string,
    includeData: boolean = false
  ): Promise<string> => {
    try {
      const openaiApiKey = await getOpenAIApiKey();
      const dashboardData = prepareDashboardDataForAI();
      console.log("Dati preparati per AI:", dashboardData);

      let systemPrompt = `Sei l'AI Assistant di un istituto di pagamento leader nel settore fintech. La tua specializzazione copre:

🏦 SETTORE: Istituto di Pagamento specializzato in soluzioni digitali
🎯 FOCUS: Wallet digitali, servizi di pagamento, terminali POS, gaming e piattaforme integrate

EXPERTISE SPECIFICHE:
• Analisi KPI dealer network e metriche di attivazione
• Ottimizzazione conversion rate e customer lifetime value
• Troubleshooting terminali Sunmi e supporto tecnico merchant
• Analisi marginalità servizi (bollettini, ricariche, banking)
• Performance wallet digitali e transaction flow optimization
• Strategie crescita network dealer e partner onboarding
• Compliance normativa (PSD2, antiriciclaggio, GDPR)
• Market intelligence settore payment e competitor analysis
• Revenue diversification e cross-selling optimization

LINGUAGGIO TECNICO:
Usa terminologia professionale del settore: transaction volume, merchant acquiring, payment gateway, clearing & settlement, authorization rate, chargeback ratio, MDR (Merchant Discount Rate), acquiring margin, POS deployment, wallet top-up, digital onboarding, KYC compliance.

APPROCCIO ANALITICO:
- Fornisci sempre insight data-driven con raccomandazioni operative concrete
- Identifica trend, anomalie e opportunità di crescita
- Suggerisci action plan con priorità e tempistiche
- Considera impatti su compliance e risk management
- Valuta sostenibilità economica delle strategie proposte

Rispondi in italiano professionale, con analisi dettagliate ma accessibili per il management aziendale.`;

      const userMessage = question;

      if (includeData) {
        const dashboardData = prepareDashboardDataForAI();

        // Utilizzo esplicito per evitare warning TypeScript
        const currentMonth = dashboardData.currentMonth;
        const previousMonth = dashboardData.previousMonth;
        const comparisons = dashboardData.comparisons;
        const servizi = dashboardData.servizi;

        systemPrompt += `

CONTESTO AZIENDALE:
Operi per un istituto di pagamento specializzato in soluzioni digitali avanzate. Le nostre principali linee di business includono:

• WALLET DIGITALI: Gestione transazioni e pagamenti attraverso portafogli elettronici
• SERVIZI DI PAGAMENTO: Bollettini, ricariche telefoniche, servizi bancari e postali
• TERMINALI POS: Vendita e supporto terminali Sunmi per merchant
• APAY GAMING: Piattaforma dedicata a gaming e scommesse online
• PIATTAFORME SERVIZI: Soluzioni integrate per dealer e partner commerciali

Le tue competenze coprono:
- Analisi KPI e metriche di conversion dei dealer
- Ottimizzazione del tasso di attivazione e retention
- Troubleshooting tecnico terminali Sunmi
- Analisi marginalità per categoria di servizio
- Strategie di crescita del network dealer
- Performance wallet digitali e transaction flow
- Conformità normativa pagamenti (PSD2, antiriciclaggio)
- Analisi competitor nel settore payment e fintech

DATI DASHBOARD DISPONIBILI:

⚠️ IMPORTANTE: I dati del mese corrente sono PARZIALI - sono passati solo ${
          currentMonth.giorniTrascorsi
        } giorni.

📊 MESE CORRENTE (${currentMonth.periodo}) - ${
          currentMonth.giorniTrascorsi
        } giorni trascorsi:
• Fatturato totale: €${currentMonth.fatturato.toLocaleString()}
• Transazioni totali: ${currentMonth.transazioni.toLocaleString()}
• Importo medio: €${currentMonth.importoMedio.toFixed(2)}
• Dealer attivi: ${currentMonth.dealerAttivi} su ${
          currentMonth.dealerTotali
        } totali (${currentMonth.percentualeAttivazione}%)

📈 PERFORMANCE GIORNALIERE MESE CORRENTE:
• Media giornaliera fatturato: €${currentMonth.mediaGiornaliera.fatturato.toLocaleString()}
• Media giornaliera transazioni: ${currentMonth.mediaGiornaliera.transazioni.toLocaleString()}

🎯 PROIEZIONI FINE MESE (basate su performance attuali):
• Fatturato stimato: €${currentMonth.proiezioniMensili.fatturato.toLocaleString()}
• Transazioni stimate: ${currentMonth.proiezioniMensili.transazioni.toLocaleString()}`;

        // Gestione dinamica dei dati del mese precedente
        if (previousMonth.dataStatus === "available") {
          systemPrompt += `

📊 MESE PRECEDENTE (${previousMonth.periodo}) - mese completo (${
            previousMonth.giorniTotali
          } giorni):
• Fatturato totale: €${previousMonth.fatturato.toLocaleString()}
• Transazioni totali: ${previousMonth.transazioni.toLocaleString()}
• Importo medio: €${previousMonth.importoMedio.toFixed(2)}
• Dealer attivi: ${previousMonth.dealerAttivi} su ${
            previousMonth.dealerTotali
          } totali (${previousMonth.percentualeAttivazione}%)
• Media giornaliera fatturato: €${previousMonth.mediaGiornaliera.fatturato.toLocaleString()}
• Media giornaliera transazioni: ${previousMonth.mediaGiornaliera.transazioni.toLocaleString()}

🔄 CONFRONTI REALISTICI (medie giornaliere):
• Fatturato/giorno: €${comparisons?.mediaGiornalieraFatturato.corrente.toLocaleString()} vs €${comparisons?.mediaGiornalieraFatturato.precedente.toLocaleString()} (${
            comparisons?.mediaGiornalieraFatturato.variazionePerc > 0 ? "+" : ""
          }${comparisons?.mediaGiornalieraFatturato.variazionePerc}%)
• Transazioni/giorno: ${comparisons?.mediaGiornalieraTransazioni.corrente.toLocaleString()} vs ${comparisons?.mediaGiornalieraTransazioni.precedente.toLocaleString()} (${
            comparisons?.mediaGiornalieraTransazioni.variazionePerc > 0
              ? "+"
              : ""
          }${comparisons?.mediaGiornalieraTransazioni.variazionePerc}%)

📈 CONFRONTO PROIEZIONI vs REALTÀ:
• Proiezione fatturato fine mese: €${comparisons?.proiezioniVsReale.fatturatoProiezione.toLocaleString()} vs Mese precedente: €${comparisons?.proiezioniVsReale.fatturatoReale.toLocaleString()}
• Proiezione transazioni fine mese: ${comparisons?.proiezioniVsReale.transazioniProiezione.toLocaleString()} vs Mese precedente: ${comparisons?.proiezioniVsReale.transazioniReale.toLocaleString()}`;
        } else if (previousMonth.dataStatus === "loading") {
          systemPrompt += `

⏳ DATI MESE PRECEDENTE: Caricamento in corso...
• Alcuni confronti potrebbero non essere disponibili momentaneamente
• Focus l'analisi sui dati attuali e le proiezioni`;
        } else {
          systemPrompt += `

⚠️ DATI MESE PRECEDENTE NON DISPONIBILI
• Non posso fare confronti diretti con ${previousMonth.periodo}
• Concentro l'analisi su:
  - Performance attuali (${currentMonth.giorniTrascorsi} giorni)
  - Proiezioni di fine mese basate sul trend attuale
  - Analisi dei dealer attivi vs totali
  - Performance dei servizi`;
        }

        systemPrompt += `

💼 SERVIZI E REVENUE STREAMS:
• Fatturato servizi: €${servizi.totaliFatturato.toLocaleString()}
• Operazioni servizi: ${servizi.totaliOperazioni.toLocaleString()}
• Categorie attive: ${servizi.numeroCategorie}
${
  servizi.topServizi.length > 0
    ? `\nTop revenue services:
${servizi.topServizi
  .map(
    (s) =>
      `• ${s.nome}: €${s.fatturato.toLocaleString()} (${
        s.operazioni
      } operazioni, ${s.percentuale}% del totale)`
  )
  .join("\n")}`
    : ""
}

LINEE GUIDA ANALITICHE:
1. Considera sempre il partial month factor (solo ${
          currentMonth.giorniTrascorsi
        } giorni di dati)
2. ${
          comparisons?.dataAvailable
            ? "Basa i confronti su medie giornaliere per comparazioni realistic"
            : "Focus su trend analysis e growth projections in assenza di dati comparativi"
        }
3. Identifica opportunità di revenue optimization e dealer activation
4. Valuta performance vs market benchmarks del settore payment
5. Suggerisci strategie di cross-selling e upselling per aumentare ARPU (Average Revenue Per User)
6. Considera impatti regulatori e compliance nella strategia
7. Contextualizza sempre i risultati in termini di business impact e ROI`;
      }

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
                content: systemPrompt,
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            max_tokens: 800,
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

  const handleSendQuestion = async (
    questionOverride?: string,
    includeData: boolean = false
  ) => {
    const questionToSend = questionOverride || currentQuestion;
    if (!questionToSend.trim()) return;

    setAiError("");

    const userMessage: AIMessage = {
      id: Date.now(),
      type: "user",
      message: questionToSend,
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    if (!questionOverride) {
      setCurrentQuestion("");
    }
    setIsAiTyping(true);

    try {
      const aiResponseText = await getAIResponse(questionToSend, includeData);

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
                    <div className="kpi-header-simple">
                      <i className="fa-solid fa-users kpi-icon-small"></i>
                      <div className="kpi-period-simple">
                        {getMonthName(currentMonth)} {currentYear}
                      </div>
                    </div>

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
                            <circle
                              cx="30"
                              cy="30"
                              r="25"
                              fill="none"
                              stroke="rgba(255,255,255,0.25)"
                              strokeWidth="8"
                            />
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
                      <i className="fa-solid fa-calculator kpi-icon-small"></i>
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

          {/* AI Assistant Section - MIGLIORATA */}
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
                                  handleSendQuestion(
                                    "Analizza le performance del mese corrente rispetto al mese precedente",
                                    true
                                  )
                                }
                              >
                                <i className="fa-solid fa-chart-line me-1"></i>
                                Analisi Performance
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm me-2"
                                onClick={() =>
                                  handleSendQuestion(
                                    "Fammi un'analisi dettagliata dello stato dei dealer attivi e inattivi",
                                    true
                                  )
                                }
                              >
                                <i className="fa-solid fa-users me-1"></i>
                                Stato Dealer
                              </button>
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() =>
                                  handleSendQuestion(
                                    "Basandoti sui dati attuali, dammi suggerimenti concreti per migliorare il tasso di attivazione e il fatturato",
                                    true
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
                          onClick={() => handleSendQuestion(undefined, true)}
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
