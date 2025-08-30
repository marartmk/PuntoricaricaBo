import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./mbo-styles.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// ✅ INTERFACCE API
interface AgenteDto {
  id: string;
  codiceAgente: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  attivo: boolean;
  dataInserimento: string;
  dataUltimaModifica?: string;
}

interface Prodotto {
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

// ✅ INTERFACCE MBO/KPI
interface KpiObjective {
  id: string;
  agenteId: string;
  prodottoId: number;
  prodottoNome: string;
  anno: number;
  mese: number;
  obiettivo: number;
  dataCreazione: string;
  dataUltimaModifica?: string;
}

interface KpiFormData {
  agenteId: string;
  anno: number;
  mese: number;
  obiettivi: Array<{
    prodottoId: number;
    prodottoNome: string;
    obiettivo: number;
  }>;
}

// ✅ DTO dal BE
interface KpiObjectiveDto {
  id: string;
  agenteId: string;
  prodottoId: number;
  nomeProdotto: string;
  anno: number;
  mese: number;
  nomeMese: string;
  obiettivoMensile: number;
  dataCreazione: string;
  dataUltimaModifica?: string;
}

interface KpiObjectiveBatchItemDto {
  prodottoId: number;
  obiettivoMensile: number;
}

interface KpiObjectiveBatchCreateDto {
  agenteId: string;
  anno: number;
  mese: number;
  obiettivi: KpiObjectiveBatchItemDto[];
}

interface KpiBatchResultDto {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  results: KpiObjectiveDto[];
}

const MboPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;
  const KPI_BASE = `${API_URL}/api/kpi`;

  // ✅ CONTROLLO ACCESSO ADMIN
  const userRole = (localStorage.getItem("userLevel") || "").toLowerCase();
  const isAdmin = userRole === "admin";

  // ✅ loading/error per il modal KPI
  const [isLoadingKpi, setIsLoadingKpi] = useState<boolean>(false);
  const [errorKpi, setErrorKpi] = useState<string>("");

  // Redirect se non admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [isAdmin, navigate]);

  // ✅ STATI DATI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [kpiData, setKpiData] = useState<KpiObjective[]>([]);

  // ✅ STATI LOADING E ERRORI
  const [isLoadingAgenti, setIsLoadingAgenti] = useState<boolean>(false);
  const [isLoadingProdotti, setIsLoadingProdotti] = useState<boolean>(false);
  const [errorAgenti, setErrorAgenti] = useState<string>("");
  const [errorProdotti, setErrorProdotti] = useState<string>("");

  // ✅ STATI MODAL
  const [showKpiModal, setShowKpiModal] = useState<boolean>(false);
  const [selectedAgente, setSelectedAgente] = useState<AgenteDto | null>(null);
  const [kpiForm, setKpiForm] = useState<KpiFormData>({
    agenteId: "",
    anno: new Date().getFullYear(),
    mese: new Date().getMonth() + 1,
    obiettivi: [],
  });

  // ✅ HELPER PER TOKEN AUTH
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token di autenticazione non trovato.");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // ✅ CARICAMENTO AGENTI
  const fetchAgenti = async () => {
    setIsLoadingAgenti(true);
    setErrorAgenti("");

    try {
      const response = await fetch(`${API_URL}/api/Agenti?pageSize=1000`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Errore caricamento agenti: ${response.status}`);
      }

      const data: ApiResponseDto<PaginatedResponse<AgenteDto>> =
        await response.json();

      if (data.success && data.data && data.data.items) {
        // Filtra solo agenti attivi
        const agentiAttivi = data.data.items.filter((agente) => agente.attivo);
        setAgenti(agentiAttivi);
      } else {
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento agenti:", error);
      setErrorAgenti(
        error instanceof Error ? error.message : "Errore imprevisto"
      );
    } finally {
      setIsLoadingAgenti(false);
    }
  };

  // ✅ CARICAMENTO PRODOTTI
  const fetchProdotti = async () => {
    setIsLoadingProdotti(true);
    setErrorProdotti("");

    try {
      const response = await fetch(`${API_URL}/api/Lookup/prodotti`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Errore caricamento prodotti: ${response.status}`);
      }

      const data: ApiResponseDto<Prodotto[]> = await response.json();

      if (data.success && data.data) {
        setProdotti(data.data);
      } else {
        throw new Error(data.message || "Errore nel recupero prodotti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento prodotti:", error);
      setErrorProdotti(
        error instanceof Error ? error.message : "Errore imprevisto"
      );
    } finally {
      setIsLoadingProdotti(false);
    }
  };

  // ✅ CARICAMENTO DATI ALL'AVVIO
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }

    if (!API_URL) {
      setErrorAgenti("VITE_API_URL non configurato nel file .env");
      setErrorProdotti("VITE_API_URL non configurato nel file .env");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorAgenti("Token di autenticazione non trovato.");
      setErrorProdotti("Token di autenticazione non trovato.");
      return;
    }

    fetchAgenti();
    fetchProdotti();
  }, [API_URL]);

  // ✅ GESTIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // ✅ APERTURA MODAL KPI
  const openKpiModal = (agente: AgenteDto) => {
    setSelectedAgente(agente);

    // base: tutti i prodotti con obiettivo 0
    const baseObiettivi = prodotti.map((prodotto) => ({
      prodottoId: prodotto.id,
      prodottoNome: prodotto.nome,
      obiettivo: 0,
    }));

    const now = new Date();
    const anno = now.getFullYear();
    const mese = now.getMonth() + 1;

    setKpiForm({
      agenteId: agente.id,
      anno,
      mese,
      obiettivi: baseObiettivi,
    });

    setShowKpiModal(true);

    // carica KPI esistenti e aggiorna i valori
    fetchKpiForAgentePeriodo(agente.id, anno, mese);
  };

  // ✅ CHIUSURA MODAL
  const closeKpiModal = () => {
    setShowKpiModal(false);
    setSelectedAgente(null);
    setKpiForm({
      agenteId: "",
      anno: new Date().getFullYear(),
      mese: new Date().getMonth() + 1,
      obiettivi: [],
    });
  };

  // ✅ AGGIORNAMENTO OBIETTIVO PRODOTTO
  const updateProdottoObiettivo = (prodottoId: number, obiettivo: number) => {
    setKpiForm((prev) => ({
      ...prev,
      obiettivi: prev.obiettivi.map((obj) =>
        obj.prodottoId === prodottoId
          ? { ...obj, obiettivo: Math.max(0, obiettivo) }
          : obj
      ),
    }));
  };

  // ✅ SALVATAGGIO KPI (per ora solo in memoria)
  const salvaKpi = async () => {
    try {
      if (!kpiForm.agenteId) {
        alert("Agente non selezionato");
        return;
      }

      // Prepara payload per /api/kpi/batch
      const payload: KpiObjectiveBatchCreateDto = {
        agenteId: kpiForm.agenteId,
        anno: kpiForm.anno,
        mese: kpiForm.mese,
        obiettivi: kpiForm.obiettivi
          .filter((o) => Number(o.obiettivo) > 0)
          .map((o) => ({
            prodottoId: o.prodottoId,
            obiettivoMensile: Number(o.obiettivo),
          })),
      };

      if (payload.obiettivi.length === 0) {
        alert("Inserisci almeno un obiettivo > 0");
        return;
      }

      const resp = await fetch(`${KPI_BASE}/batch`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Errore salvataggio KPI: ${resp.status} - ${text}`);
      }

      const result: KpiBatchResultDto = await resp.json();

      // Aggiorna stato locale con i risultati “veri” dal BE
      const nuovi: KpiObjective[] = result.results.map((k) => ({
        id: k.id,
        agenteId: k.agenteId,
        prodottoId: k.prodottoId,
        prodottoNome: k.nomeProdotto,
        anno: k.anno,
        mese: k.mese,
        obiettivo: Number(k.obiettivoMensile),
        dataCreazione: k.dataCreazione,
        dataUltimaModifica: k.dataUltimaModifica,
      }));

      setKpiData((prev) => {
        const filtered = prev.filter(
          (x) =>
            !(
              x.agenteId === kpiForm.agenteId &&
              x.anno === kpiForm.anno &&
              x.mese === kpiForm.mese
            )
        );
        return [...filtered, ...nuovi];
      });

      // feedback
      const msgDettaglio = [
        result.created ? `${result.created} creati` : null,
        result.updated ? `${result.updated} aggiornati` : null,
        result.skipped ? `${result.skipped} saltati` : null,
      ]
        .filter(Boolean)
        .join(", ");

      alert(
        `KPI salvati con successo! ${msgDettaglio}${
          result.errors.length ? `\nErrori: ${result.errors.join("; ")}` : ""
        }`
      );

      closeKpiModal();
    } catch (err) {
      console.error("🚨 Errore salvataggio KPI:", err);
      alert(err instanceof Error ? err.message : "Errore imprevisto");
    }
  };

  // ✅ HELPER FUNCTIONS
  const getMeseNome = (mese: number): string => {
    const mesi = [
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
    return mesi[mese - 1] || "";
  };

  const getKpiAgente = (agenteId: string): KpiObjective[] => {
    return kpiData.filter((kpi) => kpi.agenteId === agenteId);
  };

  // ✅ RENDER NON AUTORIZZATO
  if (!isAdmin) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <i className="fa-solid fa-lock fa-3x text-warning mb-3"></i>
          <h3>Accesso Negato</h3>
          <p>Solo gli amministratori possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  // ✅ Carica i KPI per agente/periodo e precompila il form
  const fetchKpiForAgentePeriodo = async (
    agenteId: string,
    anno: number,
    mese: number
  ) => {
    if (!agenteId) return;

    setIsLoadingKpi(true);
    setErrorKpi("");

    try {
      const url = `${KPI_BASE}/agente/${agenteId}?anno=${anno}&mese=${mese}`;
      const resp = await fetch(url, { headers: getAuthHeaders() });

      if (!resp.ok) {
        throw new Error(`Errore caricamento KPI: ${resp.status}`);
      }

      const list: KpiObjectiveDto[] = await resp.json();

      // Mappa per prodottoId → obiettivoMensile
      const map = new Map<number, number>();
      list.forEach((k) => map.set(k.prodottoId, Number(k.obiettivoMensile)));

      // Aggiorna form: preserva i prodotti, imposta obiettivi esistenti
      setKpiForm((prev) => ({
        ...prev,
        obiettivi: prev.obiettivi.map((o) => ({
          ...o,
          obiettivo: map.get(o.prodottoId) ?? 0,
        })),
      }));

      // (opzionale) aggiorna lo stato kpiData per il badge “KPI attivi”
      const nuovi: KpiObjective[] = list.map((k) => ({
        id: k.id,
        agenteId: k.agenteId,
        prodottoId: k.prodottoId,
        prodottoNome: k.nomeProdotto,
        anno: k.anno,
        mese: k.mese,
        obiettivo: Number(k.obiettivoMensile),
        dataCreazione: k.dataCreazione,
        dataUltimaModifica: k.dataUltimaModifica,
      }));
      setKpiData((prev) => {
        // rimpiazza solo i KPI dello stesso agente/periodo
        const filtered = prev.filter(
          (x) =>
            !(x.agenteId === agenteId && x.anno === anno && x.mese === mese)
        );
        return [...filtered, ...nuovi];
      });
    } catch (err) {
      console.error("🚨 Errore KPI:", err);
      setErrorKpi(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setIsLoadingKpi(false);
    }
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } mbo-page`}
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
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate("/gestione-agenti")}
                    >
                      Gestione Agenti
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    KPI/MBO
                  </li>
                </ol>
              </nav>
              <h2 className="mbo-title">
                <i className="fa-solid fa-chart-bar me-2"></i>
                Gestione KPI e Obiettivi (MBO)
              </h2>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={() => {
                  fetchAgenti();
                  fetchProdotti();
                }}
                disabled={isLoadingAgenti || isLoadingProdotti}
              >
                <i
                  className={`fa-solid ${
                    isLoadingAgenti || isLoadingProdotti
                      ? "fa-spinner fa-spin"
                      : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
              <button className="btn btn-outline-success">
                <i className="fa-solid fa-download me-1"></i>
                Esporta KPI
              </button>
            </div>
          </div>

          {/* Alert errori */}
          {(errorAgenti || errorProdotti) && (
            <div className="alert alert-danger mb-4" role="alert">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>Errori di caricamento:</strong>
              <ul className="mb-0 mt-2">
                {errorAgenti && <li>Agenti: {errorAgenti}</li>}
                {errorProdotti && <li>Prodotti: {errorProdotti}</li>}
              </ul>
            </div>
          )}

          {/* Alert caricamento */}
          {(isLoadingAgenti || isLoadingProdotti) && (
            <div className="alert alert-info mb-4" role="alert">
              <i className="fa-solid fa-spinner fa-spin me-2"></i>
              Caricamento dati in corso...
              {isLoadingAgenti && " [Agenti]"}
              {isLoadingProdotti && " [Prodotti]"}
            </div>
          )}

          {/* Lista Agenti */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Agenti Attivi ({agenti.length})</span>
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="card-body">
                  {agenti.length === 0 && !isLoadingAgenti ? (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-users fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessun agente attivo</h5>
                      <p className="text-muted">
                        Non ci sono agenti attivi nel sistema.
                      </p>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => navigate("/agenti")}
                      >
                        <i className="fa-solid fa-user-plus me-1"></i>
                        Vai alla gestione agenti
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {agenti.map((agente) => {
                        const kpiAgente = getKpiAgente(agente.id);
                        return (
                          <div key={agente.id} className="col-md-6 col-lg-4">
                            <div className="card h-100 agente-card">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div>
                                    <h5 className="card-title mb-1">
                                      {agente.nome} {agente.cognome}
                                    </h5>
                                    <small className="text-muted">
                                      {agente.codiceAgente}
                                    </small>
                                  </div>
                                  <span className="badge bg-success">
                                    Attivo
                                  </span>
                                </div>

                                {agente.email && (
                                  <p className="card-text small">
                                    <i className="fa-solid fa-envelope me-2 text-muted"></i>
                                    {agente.email}
                                  </p>
                                )}

                                {agente.telefono && (
                                  <p className="card-text small">
                                    <i className="fa-solid fa-phone me-2 text-muted"></i>
                                    {agente.telefono}
                                  </p>
                                )}

                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <small className="text-muted">
                                    KPI attivi:{" "}
                                    <strong>{kpiAgente.length}</strong>
                                  </small>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => openKpiModal(agente)}
                                    disabled={prodotti.length === 0}
                                  >
                                    <i className="fa-solid fa-chart-bar me-1"></i>
                                    Gestisci KPI
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

      {/* MODAL KPI */}
      {showKpiModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fa-solid fa-chart-bar me-2"></i>
                  Gestione KPI - {selectedAgente?.nome}{" "}
                  {selectedAgente?.cognome}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeKpiModal}
                ></button>
              </div>
              <div className="modal-body">
                {/* Selettore Periodo */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Anno</label>
                    <select
                      className="form-select"
                      value={kpiForm.anno}
                      onChange={(e) => {
                        const nuovoAnno = parseInt(e.target.value);
                        setKpiForm((prev) => ({ ...prev, anno: nuovoAnno }));
                        if (selectedAgente) {
                          // ricarica KPI per il nuovo periodo
                          fetchKpiForAgentePeriodo(
                            selectedAgente.id,
                            nuovoAnno,
                            kpiForm.mese
                          );
                        }
                      }}
                    >
                      {[2024, 2025, 2026].map((anno) => (
                        <option key={anno} value={anno}>
                          {anno}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Mese</label>
                    <select
                      className="form-select"
                      value={kpiForm.mese}
                      onChange={(e) => {
                        const nuovoMese = parseInt(e.target.value);
                        setKpiForm((prev) => ({ ...prev, mese: nuovoMese }));
                        if (selectedAgente) {
                          fetchKpiForAgentePeriodo(
                            selectedAgente.id,
                            kpiForm.anno,
                            nuovoMese
                          );
                        }
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (mese) => (
                          <option key={mese} value={mese}>
                            {getMeseNome(mese)}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* QUI INCOLLA I DUE BLOCCHI */}
                {isLoadingKpi && (
                  <div className="alert alert-info mb-3">
                    <i className="fa-solid fa-spinner fa-spin me-2"></i>
                    Caricamento KPI esistenti...
                  </div>
                )}
                {errorKpi && (
                  <div className="alert alert-warning mb-3">
                    <i className="fa-solid fa-triangle-exclamation me-2"></i>
                    {errorKpi}
                  </div>
                )}

                {/* Griglia Prodotti e Obiettivi */}
                <div className="card">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="fa-solid fa-target me-2"></i>
                      Obiettivi di Vendita - {getMeseNome(kpiForm.mese)}{" "}
                      {kpiForm.anno}
                    </h6>
                  </div>
                  <div className="card-body">
                    {kpiForm.obiettivi.length === 0 ? (
                      <div className="text-center py-3 text-muted">
                        <i className="fa-solid fa-spinner fa-spin me-2"></i>
                        Caricamento prodotti...
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-primary">
                            <tr>
                              <th style={{ width: "50%" }}>
                                <i className="fa-solid fa-box me-2"></i>
                                Prodotto
                              </th>
                              <th style={{ width: "30%" }}>
                                <i className="fa-solid fa-target me-2"></i>
                                Obiettivo Mensile
                              </th>
                              <th style={{ width: "20%" }}>
                                <i className="fa-solid fa-info-circle me-2"></i>
                                Azioni
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {kpiForm.obiettivi.map((obiettivo) => (
                              <tr key={obiettivo.prodottoId}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <span className="badge bg-info me-2">
                                      #{obiettivo.prodottoId}
                                    </span>
                                    <strong>{obiettivo.prodottoNome}</strong>
                                  </div>
                                </td>
                                <td>
                                  <div className="input-group">
                                    <input
                                      type="number"
                                      className="form-control"
                                      min="0"
                                      value={obiettivo.obiettivo}
                                      onChange={(e) =>
                                        updateProdottoObiettivo(
                                          obiettivo.prodottoId,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      placeholder="0"
                                    />
                                    <span className="input-group-text">
                                      unità
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() =>
                                      updateProdottoObiettivo(
                                        obiettivo.prodottoId,
                                        0
                                      )
                                    }
                                    title="Azzera obiettivo"
                                  >
                                    <i className="fa-solid fa-eraser"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeKpiModal}
                >
                  <i className="fa-solid fa-times me-1"></i>
                  Annulla
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={salvaKpi}
                  disabled={kpiForm.obiettivi.every(
                    (obj) => obj.obiettivo === 0
                  )}
                >
                  <i className="fa-solid fa-save me-1"></i>
                  Salva Obiettivi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MboPage;
