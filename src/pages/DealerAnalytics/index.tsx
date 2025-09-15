import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./dealer-analytics.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaccia per jsPDF con autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Interfacce per i dati API - AGGIORNATE
interface DealerTransactionTotals {
  conTransazioni: number;
  senzaTransazioni: number;
}

interface DealerDetail {
  accID: number;
  userId: string;
  nome: string;
  isTransaction: boolean;
  email: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  regione: string;
  telefonoFisso: string;
  ultimaTransazione?: string;
  giorniDallUltimaTransazione?: number;
  // ✅ AGGIUNTI CAMPI DISTRIBUTORE
  codiceDistributore?: string;
  distributoreRagSoc?: string;
  distributoreEmail?: string;
  distributoreCitta?: string;
  distributoreProvincia?: string;
}

interface DealerDetailResponse {
  success: boolean;
  message: string;
  data: {
    totali: DealerTransactionTotals;
    dealers: DealerDetail[];
  };
  errors: unknown[];
}

const DealerAnalytics: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // Parametri URL
  const annoFromUrl = parseInt(
    searchParams.get("anno") || new Date().getFullYear().toString()
  );
  const [selectedYear, setSelectedYear] = useState<number>(annoFromUrl);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Stati unificati per dealer (totali + lista insieme)
  const [dealerData, setDealerData] = useState<{
    totali: DealerTransactionTotals;
    dealers: DealerDetail[];
  } | null>(null);
  const [isLoadingDealer, setIsLoadingDealer] = useState<boolean>(false);
  const [errorDealer, setErrorDealer] = useState<string>("");

  // Filtri
  const [activeTab, setActiveTab] = useState<"all" | "transanti" | "inattivi">(
    "all"
  );
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Ordinamento
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Paginazione
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);

  // Modal di esportazione
  const [showExportModal, setShowExportModal] = useState(false);

  // Stati per filtri avanzati (distributore) - AGGIUNTATI
  const [selectedDistributore, setSelectedDistributore] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL;

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // Carica i dati quando cambiano i parametri
  useEffect(() => {
    fetchDealerData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // 3. FUNZIONE PER OTTENERE DISTRIBUTORI UNICI
  const getUniqueDistributors = () => {
    if (!dealerData?.dealers) return [];

    const distributors = dealerData.dealers
      .filter((d) => d.codiceDistributore && d.distributoreRagSoc) // Solo dealer con distributore
      .map((d) => ({
        codice: d.codiceDistributore!,
        ragioneSociale: d.distributoreRagSoc!,
        citta: d.distributoreCitta,
        provincia: d.distributoreProvincia,
      }))
      .filter(
        (dist, index, self) =>
          // Rimuovi duplicati basandosi sul codice
          index === self.findIndex((d) => d.codice === dist.codice)
      )
      .sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale));

    return distributors;
  };

  // Funzione unificata per recuperare tutti i dati dealer
  const fetchDealerData = async (anno: number, mese?: number | null) => {
    setIsLoadingDealer(true);
    setErrorDealer("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token di autenticazione non trovato");
      }

      let url = `${API_URL}/api/Reports/dealer-istransaction-detail?anno=${anno}`;
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
        throw new Error(`Errore nel caricamento: ${response.status}`);
      }

      const data: DealerDetailResponse = await response.json();

      if (data.success && data.data) {
        setDealerData({
          totali: data.data.totali,
          dealers: data.data.dealers,
        });
      } else {
        throw new Error(data.message || "Errore nel recupero dei dati");
      }
    } catch (error) {
      console.error("Errore caricamento dealer:", error);
      if (error instanceof Error) {
        setErrorDealer(error.message);
      } else {
        setErrorDealer("Errore imprevisto");
      }
    } finally {
      setIsLoadingDealer(false);
    }
  };

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // Preparazione dati per grafico a torta
  const preparePieData = () => {
    if (!dealerData?.totali) return [];

    const totali = dealerData.totali;
    const totalDealer = totali.conTransazioni + totali.senzaTransazioni;

    return [
      {
        name: "Transanti",
        value: totali.conTransazioni,
        fill: "#28a745",
        percentage: ((totali.conTransazioni / totalDealer) * 100).toFixed(1),
      },
      {
        name: "Non Transanti",
        value: totali.senzaTransazioni,
        fill: "#ffc107",
        percentage: ((totali.senzaTransazioni / totalDealer) * 100).toFixed(1),
      },
    ];
  };

  // Filtri per la lista - AGGIORNATA CON ORDINAMENTO
  const getFilteredList = () => {
    if (!dealerData?.dealers) return [];

    let filtered = dealerData.dealers;

    // Filtro per tab attivo
    if (activeTab === "transanti") {
      filtered = filtered.filter((d) => d.isTransaction === true);
    } else if (activeTab === "inattivi") {
      filtered = filtered.filter((d) => d.isTransaction === false);
    }

    // ✅ NUOVO FILTRO PER DISTRIBUTORE
    if (selectedDistributore) {
      if (selectedDistributore === "NESSUNO") {
        // Mostra solo dealer senza distributore
        filtered = filtered.filter(
          (d) => !d.codiceDistributore || d.codiceDistributore === ""
        );
      } else {
        // Mostra solo dealer del distributore selezionato
        filtered = filtered.filter(
          (d) => d.codiceDistributore === selectedDistributore
        );
      }
    }

    // Filtro per provincia
    if (selectedProvincia) {
      filtered = filtered.filter((d) => d.provincia === selectedProvincia);
    }

    // Filtro per ricerca
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.distributoreRagSoc?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return getSortedList(filtered);
  };

  // Paginazione
  const paginatedList = () => {
    const filtered = getFilteredList();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(getFilteredList().length / itemsPerPage);

  // Funzione per ottenere tutte le province uniche
  const getUniqueProvinces = () => {
    if (!dealerData?.dealers) return [];
    const provinces = [...new Set(dealerData.dealers.map((d) => d.provincia))];
    return provinces.sort();
  };

  // Gestione ordinamento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Se è la stessa colonna, cambia direzione
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Se è una nuova colonna, imposta ascendente
      setSortColumn(column);
      setSortDirection("asc");
    }
    // Reset della paginazione quando si ordina
    setCurrentPage(1);
  };

  // Funzione per ordinare i dati
  function getSortedList(data: DealerDetail[]): DealerDetail[] {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortColumn) {
        case "userId":
          aValue = a.userId.toLowerCase();
          bValue = b.userId.toLowerCase();
          break;
        case "nome":
          aValue = a.nome.toLowerCase();
          bValue = b.nome.toLowerCase();
          break;
        case "citta":
          aValue = a.citta.toLowerCase();
          bValue = b.citta.toLowerCase();
          break;
        case "provincia":
          aValue = a.provincia.toLowerCase();
          bValue = b.provincia.toLowerCase();
          break;
        case "isTransaction":
          aValue = a.isTransaction ? 1 : 0;
          bValue = b.isTransaction ? 1 : 0;
          break;
        case "ultimaTransazione":
          aValue = a.giorniDallUltimaTransazione ?? 999999;
          bValue = b.giorniDallUltimaTransazione ?? 999999;
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "telefonoFisso":
          aValue = a.telefonoFisso?.toLowerCase() || "";
          bValue = b.telefonoFisso?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Helper per formattare i giorni dall'ultima transazione
  function formatGiorniUltimaTransazione(giorni?: number): {
    text: string;
    badgeClass: string;
  } {
    if (giorni === null || giorni === undefined) {
      return {
        text: "Mai",
        badgeClass: "bg-secondary",
      };
    }

    if (giorni === 0) {
      return {
        text: "Oggi",
        badgeClass: "bg-success",
      };
    }

    if (giorni === 1) {
      return {
        text: "Ieri",
        badgeClass: "bg-success",
      };
    }

    if (giorni <= 7) {
      return {
        text: `${giorni} giorni fa`,
        badgeClass: "bg-success",
      };
    }

    if (giorni <= 30) {
      return {
        text: `${giorni} giorni fa`,
        badgeClass: "bg-warning",
      };
    }

    if (giorni <= 90) {
      return {
        text: `${giorni} giorni fa`,
        badgeClass: "bg-warning",
      };
    }

    // Più di 90 giorni
    if (giorni <= 365) {
      const mesi = Math.floor(giorni / 30);
      return {
        text: `${mesi} ${mesi === 1 ? "mese" : "mesi"} fa`,
        badgeClass: "bg-danger",
      };
    }

    // Più di un anno
    const anni = Math.floor(giorni / 365);
    return {
      text: `${anni} ${anni === 1 ? "anno" : "anni"} fa`,
      badgeClass: "bg-danger",
    };
  }

  // Funzione per esportare in Excel
  const exportToExcel = () => {
    const filteredData = getFilteredList();

    if (filteredData.length === 0) {
      alert("Nessun dato da esportare con i filtri attuali");
      return;
    }

    // Prepara i dati per l'esportazione
    const exportData = filteredData.map((dealer, index) => {
      const giornoInfo = formatGiorniUltimaTransazione(
        dealer.giorniDallUltimaTransazione
      );

      return {
        "#": index + 1,
        "Codice Dealer": dealer.userId,
        "Ragione Sociale": dealer.nome,
        Email: dealer.email,
        Telefono: dealer.telefonoFisso || "N/A",
        Indirizzo: dealer.indirizzo,
        CAP: dealer.cap,
        Città: dealer.citta,
        Provincia: dealer.provincia,
        Regione: dealer.regione,
        Status: dealer.isTransaction ? "Transante" : "Non Transante",
        "Ultima Transazione": dealer.ultimaTransazione
          ? new Date(dealer.ultimaTransazione).toLocaleDateString("it-IT")
          : "Mai",
        "Giorni dall'Ultima Transazione": giornoInfo.text,
        "Account ID": dealer.accID,
      };
    });

    // Crea il foglio di lavoro
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Crea la cartella di lavoro
    const workbook = XLSX.utils.book_new();

    // Aggiungi il foglio principale
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dealer Analytics");

    // Crea un foglio di riepilogo
    const summaryData = [
      ["Riepilogo Dealer Analytics", ""],
      [
        "Periodo",
        selectedMonth
          ? `${getMonthName(selectedMonth)} ${selectedYear}`
          : `Anno ${selectedYear}`,
      ],
      ["Data Esportazione", new Date().toLocaleDateString("it-IT")],
      [
        "Filtro Attivo",
        activeTab === "all"
          ? "Tutti"
          : activeTab === "transanti"
          ? "Transanti"
          : "Non Transanti",
      ],
      ["Provincia Selezionata", selectedProvincia || "Tutte"],
      ["Termine di Ricerca", searchTerm || "Nessuno"],
      ["", ""],
      ["Totale Dealer Esportati", filteredData.length.toString()],
      [
        "Dealer Transanti",
        filteredData.filter((d) => d.isTransaction).length.toString(),
      ],
      [
        "Dealer Non Transanti",
        filteredData.filter((d) => !d.isTransaction).length.toString(),
      ],
      ["", ""],
      ["Statistiche Generali", ""],
      [
        "Totale Dealer (tutti)",
        dealerData?.totali
          ? (
              dealerData.totali.conTransazioni +
              dealerData.totali.senzaTransazioni
            ).toString()
          : "0",
      ],
      [
        "Dealer con Transazioni",
        dealerData?.totali?.conTransazioni?.toString() || "0",
      ],
      [
        "Dealer senza Transazioni",
        dealerData?.totali?.senzaTransazioni?.toString() || "0",
      ],
      [
        "Tasso di Attivazione",
        dealerData?.totali
          ? `${Math.round(
              (dealerData.totali.conTransazioni /
                (dealerData.totali.conTransazioni +
                  dealerData.totali.senzaTransazioni)) *
                100
            )}%`
          : "0%",
      ],
    ];

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Riepilogo");

    // Genera il nome del file
    const fileName = `dealer-analytics-${selectedYear}${
      selectedMonth ? `-${selectedMonth.toString().padStart(2, "0")}` : ""
    }-${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Scarica il file
    XLSX.writeFile(workbook, fileName);
  };

  // Funzione per esportare in PDF
  const exportToPDF = () => {
    const filteredData = getFilteredList();

    if (filteredData.length === 0) {
      alert("Nessun dato da esportare con i filtri attuali");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Header del documento
    doc.setFontSize(20);
    doc.setTextColor(0, 36, 84);
    doc.text("Dealer Analytics Report", 14, 20);

    // Informazioni sul report
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const periodo = selectedMonth
      ? `${getMonthName(selectedMonth)} ${selectedYear}`
      : `Anno ${selectedYear}`;
    doc.text(`Periodo: ${periodo}`, 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString("it-IT")}`, 14, 37);
    doc.text(
      `Filtri: ${
        activeTab === "all"
          ? "Tutti"
          : activeTab === "transanti"
          ? "Transanti"
          : "Non Transanti"
      }`,
      14,
      44
    );

    let currentY = 44;
    if (selectedProvincia) {
      currentY += 7;
      doc.text(`Provincia: ${selectedProvincia}`, 14, currentY);
    }
    if (searchTerm) {
      currentY += 7;
      doc.text(`Ricerca: ${searchTerm}`, 14, currentY);
    }

    // Statistiche di riepilogo
    currentY += 14;
    doc.setFontSize(14);
    doc.setTextColor(0, 36, 84);
    doc.text("Riepilogo", 14, currentY);

    currentY += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Totale Dealer: ${filteredData.length}`, 14, currentY);
    doc.text(
      `Transanti: ${filteredData.filter((d) => d.isTransaction).length}`,
      80,
      currentY
    );
    doc.text(
      `Non Transanti: ${filteredData.filter((d) => !d.isTransaction).length}`,
      140,
      currentY
    );

    if (dealerData?.totali) {
      const tassoAttivazione = Math.round(
        (dealerData.totali.conTransazioni /
          (dealerData.totali.conTransazioni +
            dealerData.totali.senzaTransazioni)) *
          100
      );
      doc.text(
        `Tasso Attivazione Generale: ${tassoAttivazione}%`,
        200,
        currentY
      );
    }

    // Prepara i dati per la tabella
    const tableData = filteredData.map((dealer, index) => {
      const giornoInfo = formatGiorniUltimaTransazione(
        dealer.giorniDallUltimaTransazione
      );

      return [
        (index + 1).toString(),
        dealer.userId,
        dealer.nome.length > 25
          ? dealer.nome.substring(0, 25) + "..."
          : dealer.nome,
        dealer.citta,
        dealer.provincia,
        dealer.isTransaction ? "Sì" : "No",
        giornoInfo.text,
        dealer.email.length > 25
          ? dealer.email.substring(0, 25) + "..."
          : dealer.email,
      ];
    });

    // Usa autoTable con la sintassi corretta
    autoTable(doc, {
      head: [
        [
          "#",
          "Codice",
          "Ragione Sociale",
          "Città",
          "Prov.",
          "Transante",
          "Ultima Trans.",
          "Email",
        ],
      ],
      body: tableData,
      startY: currentY + 10,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 36, 84],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { halign: "center", cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "center", cellWidth: 25 },
        6: { halign: "center", cellWidth: 30 },
        7: { cellWidth: 65 },
      },
    });

    // Footer con numero di pagina
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Pagina ${i} di ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        "Generato da PuntoRicarica BO",
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Genera il nome del file e scarica
    const fileName = `dealer-analytics-${selectedYear}${
      selectedMonth ? `-${selectedMonth.toString().padStart(2, "0")}` : ""
    }-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  // Funzione per gestire il click del bottone Esporta
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Modal di esportazione
  const exportModal = (
    <div
      className={`modal fade ${showExportModal ? "show d-block" : ""}`}
      tabIndex={-1}
      style={{
        backgroundColor: showExportModal ? "rgba(0,0,0,0.5)" : "transparent",
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa-solid fa-download me-2"></i>
              Esporta Dati Dealer
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowExportModal(false)}
            ></button>
          </div>
          <div className="modal-body">
            <p className="mb-3">
              Scegli il formato per esportare{" "}
              <strong>{getFilteredList().length}</strong> dealer filtrati:
            </p>
            <div className="d-grid gap-2">
              <button
                className="btn btn-outline-success btn-lg"
                onClick={() => {
                  exportToExcel();
                  setShowExportModal(false);
                }}
              >
                <i className="fa-solid fa-file-excel me-2"></i>
                Esporta in Excel (.xlsx)
                <small className="d-block text-muted">
                  Include foglio di riepilogo con statistiche
                </small>
              </button>
              <button
                className="btn btn-outline-danger btn-lg"
                onClick={() => {
                  exportToPDF();
                  setShowExportModal(false);
                }}
              >
                <i className="fa-solid fa-file-pdf me-2"></i>
                Esporta in PDF
                <small className="d-block text-muted">
                  Formato stampabile con layout ottimizzato
                </small>
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowExportModal(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } dealer-analytics-page`}
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
                    Dealer Analytics
                  </li>
                </ol>
              </nav>
              <h2 className="dealer-analytics-title">
                <i className="fa-solid fa-users-gear me-2"></i>
                Dealer Analytics - Anno {selectedYear}
                {selectedMonth && ` - ${getMonthName(selectedMonth)}`}
              </h2>
            </div>
            <div className="d-flex gap-2">
              <div className="btn-group">
                <button
                  className="btn btn-outline-primary-dark dropdown-toggle"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fa-solid fa-calendar me-1"></i>
                  {selectedMonth
                    ? `${getMonthName(selectedMonth)} ${selectedYear}`
                    : `Anno ${selectedYear}`}
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <h6 className="dropdown-header">Anno</h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setSelectedYear(2025);
                        setSelectedMonth(null);
                      }}
                    >
                      2025
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setSelectedYear(2024);
                        setSelectedMonth(null);
                      }}
                    >
                      2024
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setSelectedYear(2023);
                        setSelectedMonth(null);
                      }}
                    >
                      2023
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">Mese {selectedYear}</h6>
                  </li>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <li key={month}>
                      <button
                        className="dropdown-item"
                        onClick={() => setSelectedMonth(month)}
                      >
                        {getMonthName(month)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="btn btn-outline-primary-dark"
                onClick={handleExport}
                disabled={isLoadingDealer || !dealerData?.dealers?.length}
              >
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button
                className="btn btn-primary-dark"
                onClick={() => fetchDealerData(selectedYear, selectedMonth)}
                disabled={isLoadingDealer}
              >
                <i
                  className={`fa-solid ${
                    isLoadingDealer ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
            </div>
          </div>

          {/* Prima riga: KPI e Grafico */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione Dealer per Status</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  {isLoadingDealer ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati...</h5>
                      </div>
                    </div>
                  ) : errorDealer ? (
                    <div className="chart-placeholder large">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorDealer}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={() =>
                            fetchDealerData(selectedYear, selectedMonth)
                          }
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : dealerData?.totali ? (
                    <div className="row h-100">
                      <div className="col-md-8">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={preparePieData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={140}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={3}
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
                              {(
                                dealerData.totali.conTransazioni +
                                dealerData.totali.senzaTransazioni
                              ).toLocaleString("it-IT")}
                            </h1>
                            <h5 className="text-muted">Dealer Totali</h5>
                          </div>
                          <div className="d-grid gap-3">
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-success mb-1">
                                {dealerData.totali.conTransazioni.toLocaleString(
                                  "it-IT"
                                )}
                              </h3>
                              <small className="text-muted">
                                Dealer Transanti
                              </small>
                              <div
                                className="progress mt-2"
                                style={{ height: "6px" }}
                              >
                                <div
                                  className="progress-bar bg-success"
                                  style={{
                                    width: `${
                                      (dealerData.totali.conTransazioni /
                                        (dealerData.totali.conTransazioni +
                                          dealerData.totali.senzaTransazioni)) *
                                      100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-center p-3 border rounded bg-light">
                              <h3 className="text-warning mb-1">
                                {dealerData.totali.senzaTransazioni.toLocaleString(
                                  "it-IT"
                                )}
                              </h3>
                              <small className="text-muted">
                                Dealer Non Transanti
                              </small>
                              <div
                                className="progress mt-2"
                                style={{ height: "6px" }}
                              >
                                <div
                                  className="progress-bar bg-warning"
                                  style={{
                                    width: `${
                                      (dealerData.totali.senzaTransazioni /
                                        (dealerData.totali.conTransazioni +
                                          dealerData.totali.senzaTransazioni)) *
                                      100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Statistiche Rapide</span>
                  <i className="fa-solid fa-tachometer-alt"></i>
                </div>
                <div className="card-body">
                  {dealerData?.totali ? (
                    <div className="d-grid gap-3">
                      <div className="card bg-primary text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {Math.round(
                              (dealerData.totali.conTransazioni /
                                (dealerData.totali.conTransazioni +
                                  dealerData.totali.senzaTransazioni)) *
                                100
                            )}
                            %
                          </h4>
                          <small>Tasso di Attivazione</small>
                        </div>
                      </div>
                      <div className="card bg-success text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {dealerData.totali.conTransazioni.toLocaleString(
                              "it-IT"
                            )}
                          </h4>
                          <small>Dealer Attivi</small>
                        </div>
                      </div>
                      <div className="card bg-warning text-white">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {dealerData.totali.senzaTransazioni.toLocaleString(
                              "it-IT"
                            )}
                          </h4>
                          <small>Potenziale Inattivato</small>
                        </div>
                      </div>
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
          </div>

          {/* Seconda riga: Lista Dettagliata */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Lista Dettagliata Dealer</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-filter"></i>
                    </div>
                    <div className="menu-icon">
                      <i className="fa-solid fa-download"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {/* Filtri e Tab */}
                  {/* Filtri e Tab - LAYOUT AGGIORNATO */}
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <ul className="nav nav-pills">
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "all" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("all");
                              setCurrentPage(1);
                            }}
                          >
                            Tutti ({getFilteredList().length})                            
                            {selectedDistributore === "NESSUNO" && (
                              <small className="d-block text-muted">
                                Indipendenti
                              </small>
                            )}
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "transanti" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("transanti");
                              setCurrentPage(1);
                            }}
                          >
                            Transanti (
                            {dealerData?.dealers.filter(
                              (d) => d.isTransaction === true
                            ).length || 0}
                            )
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${
                              activeTab === "inattivi" ? "active" : ""
                            }`}
                            onClick={() => {
                              setActiveTab("inattivi");
                              setCurrentPage(1);
                            }}
                          >
                            Non Transanti (
                            {dealerData?.dealers.filter(
                              (d) => d.isTransaction === false
                            ).length || 0}
                            )
                          </button>
                        </li>
                      </ul>
                    </div>

                    {/* ✅ NUOVO LAYOUT FILTRI */}
                    <div className="col-md-8">
                      <div className="row g-2">
                        {/* FILTRO DISTRIBUTORE - Prima posizione */}
                        <div className="col-md-3">
                          <select
                            className="form-select form-select-sm"
                            value={selectedDistributore}
                            onChange={(e) => {
                              setSelectedDistributore(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <option value="">Tutti i distributori</option>
                            <option value="NESSUNO">
                              🏢 Dealer Indipendenti
                            </option>
                            <optgroup label="Distributori">
                              {getUniqueDistributors().map((distributore) => (
                                <option
                                  key={distributore.codice}
                                  value={distributore.codice}
                                >
                                  {distributore.ragioneSociale}
                                  {distributore.citta &&
                                    ` (${distributore.citta})`}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* CAMPO RICERCA - Seconda posizione, ridotto */}
                        <div className="col-md-3">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Cerca dealer..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                        </div>

                        {/* FILTRO PROVINCE - Terza posizione */}
                        <div className="col-md-3">
                          <select
                            className="form-select form-select-sm"
                            value={selectedProvincia}
                            onChange={(e) => {
                              setSelectedProvincia(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <option value="">Tutte le province</option>
                            {getUniqueProvinces().map((provincia) => (
                              <option key={provincia} value={provincia}>
                                {provincia}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* BOTTONE RESET - Quarta posizione */}
                        <div className="col-md-3">
                          {(selectedDistributore ||
                            selectedProvincia ||
                            searchTerm) && (
                            <button
                              className="btn btn-outline-secondary btn-sm w-100"
                              onClick={() => {
                                setSelectedDistributore("");
                                setSelectedProvincia("");
                                setSearchTerm("");
                                setCurrentPage(1);
                              }}
                              title="Pulisci tutti i filtri"
                            >
                              <i className="fa-solid fa-times me-1"></i>
                              Reset Filtri
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabella */}
                  {isLoadingDealer ? (
                    <div className="chart-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento lista dealer...</h5>
                      </div>
                    </div>
                  ) : errorDealer ? (
                    <div className="chart-placeholder">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorDealer}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={() =>
                            fetchDealerData(selectedYear, selectedMonth)
                          }
                        >
                          <i className="fa-solid fa-refresh me-1"></i>
                          Riprova
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("userId")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Codice</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "userId"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("nome")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Ragione Sociale</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "nome"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("citta")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Città</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "citta"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("provincia")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Provincia</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "provincia"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("isTransaction")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Status</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "isTransaction"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("ultimaTransazione")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Ultima Transazione</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "ultimaTransazione"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("email")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Email</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "email"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSort("telefonoFisso")}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Telefono</span>
                                  <i
                                    className={`fa-solid ${
                                      sortColumn === "telefonoFisso"
                                        ? sortDirection === "asc"
                                          ? "fa-sort-up"
                                          : "fa-sort-down"
                                        : "fa-sort"
                                    } ms-1`}
                                  ></i>
                                </div>
                              </th>
                              <th>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedList().map((dealer) => (
                              <tr key={dealer.accID}>
                                <td>
                                  <strong className="text-primary">
                                    {dealer.userId}
                                  </strong>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div>
                                      <div className="fw-bold">
                                        {dealer.nome}
                                      </div>
                                      <small className="text-muted">
                                        {dealer.indirizzo} - {dealer.cap}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="fw-medium">
                                    {dealer.citta}
                                  </span>
                                  {dealer.regione && (
                                    <>
                                      <br />
                                      <small className="text-muted">
                                        {dealer.regione}
                                      </small>
                                    </>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-secondary">
                                    {dealer.provincia}
                                  </span>
                                </td>
                                <td>
                                  {dealer.isTransaction ? (
                                    <span className="badge bg-success">
                                      Transante
                                    </span>
                                  ) : (
                                    <span className="badge bg-warning">
                                      Non Transante
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {(() => {
                                    const giornoInfo =
                                      formatGiorniUltimaTransazione(
                                        dealer.giorniDallUltimaTransazione
                                      );
                                    return (
                                      <div className="text-center">
                                        <span
                                          className={`badge ${giornoInfo.badgeClass}`}
                                        >
                                          {giornoInfo.text}
                                        </span>
                                        {dealer.ultimaTransazione && (
                                          <div>
                                            <small className="text-muted d-block mt-1">
                                              {new Date(
                                                dealer.ultimaTransazione
                                              ).toLocaleDateString("it-IT")}
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td>
                                  <small>
                                    <a
                                      href={`mailto:${dealer.email}`}
                                      className="text-decoration-none"
                                    >
                                      {dealer.email}
                                    </a>
                                  </small>
                                </td>
                                <td>
                                  <small>
                                    {dealer.telefonoFisso ? (
                                      <a
                                        href={`tel:${dealer.telefonoFisso}`}
                                        className="text-decoration-none"
                                      >
                                        {dealer.telefonoFisso}
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </small>
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      title="Dettagli"
                                    >
                                      <i className="fa-solid fa-eye"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-secondary btn-sm"
                                      title="Invia Email"
                                      onClick={() =>
                                        window.open(`mailto:${dealer.email}`)
                                      }
                                    >
                                      <i className="fa-solid fa-envelope"></i>
                                    </button>
                                    {dealer.telefonoFisso && (
                                      <button
                                        className="btn btn-outline-success btn-sm"
                                        title="Chiama"
                                        onClick={() =>
                                          window.open(
                                            `tel:${dealer.telefonoFisso}`
                                          )
                                        }
                                      >
                                        <i className="fa-solid fa-phone"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Messaggio se nessun risultato */}
                      {getFilteredList().length === 0 && (
                        <div className="text-center py-4">
                          <i className="fa-solid fa-search fa-3x text-muted mb-3"></i>
                          <h5 className="text-muted">Nessun dealer trovato</h5>
                          <p className="text-muted">
                            Prova a modificare i filtri di ricerca o cambiare il
                            periodo selezionato.
                          </p>
                        </div>
                      )}

                      {/* Paginazione */}
                      {totalPages > 1 && (
                        <nav aria-label="Paginazione dealer">
                          <ul className="pagination justify-content-center">
                            <li
                              className={`page-item ${
                                currentPage === 1 ? "disabled" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  setCurrentPage(Math.max(1, currentPage - 1))
                                }
                                disabled={currentPage === 1}
                              >
                                <i className="fa-solid fa-chevron-left"></i>
                              </button>
                            </li>
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                const pageNum =
                                  Math.max(
                                    1,
                                    Math.min(totalPages - 4, currentPage - 2)
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
                                      onClick={() => setCurrentPage(pageNum)}
                                    >
                                      {pageNum}
                                    </button>
                                  </li>
                                );
                              }
                            )}
                            <li
                              className={`page-item ${
                                currentPage === totalPages ? "disabled" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  setCurrentPage(
                                    Math.min(totalPages, currentPage + 1)
                                  )
                                }
                                disabled={currentPage === totalPages}
                              >
                                <i className="fa-solid fa-chevron-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}

                      {/* Info risultati */}
                      {getFilteredList().length > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <small className="text-muted">
                            Mostrando{" "}
                            {Math.min(
                              itemsPerPage,
                              getFilteredList().length -
                                (currentPage - 1) * itemsPerPage
                            )}{" "}
                            di {getFilteredList().length} risultati
                          </small>
                          <small className="text-muted">
                            Pagina {currentPage} di {totalPages}
                          </small>
                        </div>
                      )}
                    </>
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

      {/* Modal di esportazione */}
      {exportModal}
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

export default DealerAnalytics;
