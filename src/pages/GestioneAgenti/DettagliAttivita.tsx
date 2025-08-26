import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import "../../pages/Dashboard/dashboard.css";
import "./gestione-agenti.css";

// ✅ INTERFACCIA DETTAGLI ATTIVITÀ
interface DettaglioAttivita {
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
  statoLead: boolean;
  prodottoSelezionato?: string;
  motivoNonProduzione?: string;
  trasferta?: boolean;
  dataInserimento: string;
  dataUltimaModifica?: string;
  nomeAgente: string;
  cognomeAgente: string;
  emailAgente?: string;
  telefonoAgente?: string;
}

const DettagliAttivita: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // ✅ RUOLO USER/ADMIM
  const userRole = (localStorage.getItem("userLevel") || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const currentUserId = localStorage.getItem("idUser") || "";

  // ✅ STATI
  const [attivita, setAttivita] = useState<DettaglioAttivita | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

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

  // ✅ CARICAMENTO DETTAGLI ATTIVITÀ
  const fetchDettagliAttivita = async () => {
    if (!id) {
      setError("ID attività non specificato");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/AttivitaAgenti/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Attività non trovata");
        }
        throw new Error(`Errore caricamento attività: ${response.status}`);
      }

      const data: DettaglioAttivita = await response.json();
      // 🔐 Access control: se non admin, consenti solo se l'attività è dell'utente
      if (!isAdmin && currentUserId && data.idAgente !== currentUserId) {
        throw new Error("Non sei autorizzato a visualizzare questa attività.");
      }

      setAttivita(data);
    } catch (error) {
      console.error("🚨 Errore caricamento dettagli:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Errore imprevisto nel caricamento");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ELIMINAZIONE ATTIVITÀ
  const eliminaAttivita = async () => {
    if (!attivita) return;

    const conferma = window.confirm(
      `Sei sicuro di voler eliminare l'attività per ${
        attivita.cliente || "cliente sconosciuto"
      }?`
    );

    if (!conferma) return;

    try {
      const response = await fetch(
        `${API_URL}/api/AttivitaAgenti/${attivita.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Errore eliminazione: ${response.status}`);
      }

      alert("Attività eliminata con successo!");
      navigate("/gestione-agenti");
    } catch (error) {
      console.error("🚨 Errore eliminazione:", error);
      alert("Errore nell'eliminazione dell'attività");
    }
  };

  // ✅ CARICAMENTO DATI ALL'AVVIO
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
    fetchDettagliAttivita();
  }, [id]);

  // ✅ GESTIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // ✅ FUNZIONI HELPER PER BADGE
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

  const getStatoProduzioneBadgeClass = (stato: boolean) => {
    return stato ? "badge bg-success" : "badge bg-warning text-dark";
  };

  const formatData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString("it-IT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
                    Dettagli Attività
                  </li>
                </ol>
              </nav>
              <h2 className="gestione-agenti-title">
                <i className="fa-solid fa-clipboard-list me-2"></i>
                Dettagli Attività {attivita?.cliente && `- ${attivita.cliente}`}
              </h2>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate("/gestione-agenti")}
              >
                <i className="fa-solid fa-arrow-left me-1"></i>
                Torna alla Lista
              </button>
              {attivita && (isAdmin || attivita.idAgente === currentUserId) && (
                <>
                  <button
                    className="btn btn-outline-warning"
                    onClick={() => alert("Funzione modifica - Da implementare")}
                  >
                    <i className="fa-solid fa-edit me-1"></i> Modifica
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={eliminaAttivita}
                  >
                    <i className="fa-solid fa-trash me-1"></i> Elimina
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Alert errore */}
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>Errore:</strong> {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-5">
              <i className="fa-solid fa-spinner fa-spin fa-2x text-primary mb-3"></i>
              <p className="text-muted">Caricamento dettagli attività...</p>
            </div>
          )}

          {/* Contenuto principale */}
          {!isLoading && !error && attivita && (
            <>
              {/* Card Informazioni Generali */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="custom-card-header">
                      <span>Informazioni Generali</span>
                      <i className="fa-solid fa-info-circle"></i>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <strong>ID Attività:</strong>
                          <p className="mb-2 text-muted">{attivita.id}</p>
                        </div>
                        <div className="col-md-6">
                          <strong>Data:</strong>
                          <p className="mb-2">{formatData(attivita.data)}</p>
                        </div>
                        <div className="col-md-4">
                          <strong>Settimana:</strong>
                          <p className="mb-2">{attivita.settimana}</p>
                        </div>
                        <div className="col-md-4">
                          <strong>Giorno:</strong>
                          <p className="mb-2">{attivita.giorno}</p>
                        </div>
                        <div className="col-md-4">
                          <strong>Tipo Attività:</strong>
                          <p className="mb-2">
                            <span
                              className={getTipoAttivitaBadgeClass(
                                attivita.tipoAttivita
                              )}
                            >
                              {attivita.tipoAttivita}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Agente */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="custom-card-header">
                      <span>Agente Assegnato</span>
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <div className="card-body">
                      <h5 className="card-title mb-3">
                        {attivita.nomeAgente} {attivita.cognomeAgente}
                      </h5>
                      {attivita.emailAgente && (
                        <p className="mb-2">
                          <i className="fa-solid fa-envelope me-2 text-muted"></i>
                          {attivita.emailAgente}
                        </p>
                      )}
                      {attivita.telefonoAgente && (
                        <p className="mb-2">
                          <i className="fa-solid fa-phone me-2 text-muted"></i>
                          {attivita.telefonoAgente}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Cliente */}
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="custom-card-header">
                      <span>Informazioni Cliente</span>
                      <i className="fa-solid fa-building"></i>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <strong>Cliente/Prospect:</strong>
                        <p className="mb-2 fs-5">
                          {attivita.cliente || "Non specificato"}
                        </p>
                      </div>
                      <div className="mb-3">
                        <strong>Obiettivo:</strong>
                        <p className="mb-2">
                          {attivita.obiettivo || "Non specificato"}
                        </p>
                      </div>
                      <div>
                        <strong>Esito:</strong>
                        <p className="mb-0">
                          {attivita.esito || "Non specificato"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Status e Risultati */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="custom-card-header">
                      <span>Status e Risultati</span>
                      <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div className="card-body">
                      <div className="row g-4">
                        <div className="col-md-3">
                          <div className="text-center p-3 bg-light rounded">
                            <strong>Follow-up</strong>
                            <div className="mt-2">
                              <span
                                className={getBadgeClass(
                                  attivita.followUp || ""
                                )}
                              >
                                {attivita.followUp || "Non specificato"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center p-3 bg-light rounded">
                            <strong>Produzione</strong>
                            <div className="mt-2">
                              <span
                                className={getStatoProduzioneBadgeClass(
                                  attivita.statoProduzione
                                )}
                              >
                                {attivita.statoProduzione ? "SÌ" : "NO"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center p-3 bg-light rounded">
                            <strong>Segnalazione</strong>
                            <div className="mt-2">
                              <span
                                className={getStatoProduzioneBadgeClass(
                                  attivita.statoLead
                                )}
                              >
                                {attivita.statoLead ? "SÌ" : "NO"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-center p-3 bg-light rounded">
                            <strong>Trasferta</strong>
                            <div className="mt-2">
                              {attivita.trasferta ? (
                                <span className="badge bg-info">
                                  <i className="fa-solid fa-plane me-1"></i>SÌ
                                </span>
                              ) : (
                                <span className="badge bg-secondary">
                                  <i className="fa-solid fa-building me-1"></i>
                                  NO
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="row g-3 mt-3">
                        <div className="col-md-4">
                          <strong>Durata:</strong>
                          <p className="mb-0 fs-4 text-success">
                            {attivita.durata || 0} ore
                          </p>
                        </div>
                        <div className="col-md-4">
                          <strong>Valore Potenziale:</strong>
                          <p className="mb-0 fs-4 text-info">
                            {attivita.valorePotenziale
                              ? `€${attivita.valorePotenziale.toLocaleString()}`
                              : "Non specificato"}
                          </p>
                        </div>
                        <div className="col-md-4">
                          <strong>Prodotto/Motivo:</strong>
                          <p className="mb-0">
                            {attivita.statoProduzione
                              ? attivita.prodottoSelezionato ||
                                "Non specificato"
                              : attivita.motivoNonProduzione ||
                                "Non specificato"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Note */}
              {attivita.note && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card">
                      <div className="custom-card-header">
                        <span>Note e Dettagli</span>
                        <i className="fa-solid fa-sticky-note"></i>
                      </div>
                      <div className="card-body">
                        <div className="p-3 bg-light rounded">
                          <pre
                            className="mb-0"
                            style={{
                              whiteSpace: "pre-wrap",
                              fontFamily: "inherit",
                            }}
                          >
                            {attivita.note}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Metadata */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="custom-card-header">
                      <span>Informazioni Sistema</span>
                      <i className="fa-solid fa-database"></i>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <small className="text-muted">
                            Data inserimento:
                          </small>
                          <p className="mb-0">
                            {formatData(attivita.dataInserimento)}
                          </p>
                        </div>
                        {attivita.dataUltimaModifica && (
                          <div className="col-md-6">
                            <small className="text-muted">
                              Ultima modifica:
                            </small>
                            <p className="mb-0">
                              {formatData(attivita.dataUltimaModifica)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
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

export default DettagliAttivita;
