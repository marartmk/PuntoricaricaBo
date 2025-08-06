import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./gestione-agenti.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// Interfacce per i dati degli agenti
interface AttivitaAgente {
  settimana: string;
  giorno: string;
  data: string;
  agente: string;
  tipoAttivita: string;
  cliente: string;
  obiettivo: string;
  esito: string;
  durata: number;
  note: string;
  valorePotenziale: number | null;
  followUp: string;
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

  // Dati iniziali dal file Excel
  const [datiOriginali] = useState<AttivitaAgente[]>([
    {
      settimana: "2025-W32",
      giorno: "Lunedì",
      data: "04/08/2025",
      agente: "Rossi Luca",
      tipoAttivita: "Fuori sede",
      cliente: "ABC Srl",
      obiettivo: "Presentazione",
      esito: "Preventivo inviato",
      durata: 2,
      note: "Interessati al nuovo pacchetto",
      valorePotenziale: 10000,
      followUp: "Da fare",
    },
    {
      settimana: "2025-W32",
      giorno: "Martedì",
      data: "05/08/2025",
      agente: "Bianchi Lea",
      tipoAttivita: "In sede",
      cliente: "-",
      obiettivo: "Follow-up telefonico",
      esito: "Appuntamento fissato",
      durata: 0.5,
      note: "Confermato incontro 08/08",
      valorePotenziale: null,
      followUp: "In corso",
    },
    {
      settimana: "2025-W32",
      giorno: "Mercoledì",
      data: "06/08/2025",
      agente: "Verdi Anna",
      tipoAttivita: "Fuori sede",
      cliente: "XYZ Spa",
      obiettivo: "Chiusura contratto",
      esito: "Contratto chiuso",
      durata: 3,
      note: "Ordine confermato",
      valorePotenziale: 50000,
      followUp: "Completato",
    },
  ]);

  const [dati, setDati] = useState<AttivitaAgente[]>(datiOriginali);
  const [settimanaSelezionata, setSettimanaSelezionata] =
    useState<string>("Tutte");
  const [giornoSelezionato, setGiornoSelezionato] = useState<string>("Tutti");
  const [agenteSelezionato, setAgenteSelezionato] = useState<string>("Tutti");
  const [mostraFormAggiunta, setMostraFormAggiunta] = useState<boolean>(false);

  // Estrae valori unici per i menu a tendina
  const settimaneUniche = useMemo(
    () => [...new Set(dati.map((item) => item.settimana))].sort(),
    [dati]
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

  const agentiUnici = useMemo(
    () => [...new Set(dati.map((item) => item.agente))].sort(),
    [dati]
  );

  // Filtra i dati in base alle selezioni
  const datiFiltrati = useMemo(() => {
    return dati.filter((item) => {
      const matchSettimana =
        settimanaSelezionata === "Tutte" ||
        item.settimana === settimanaSelezionata;
      const matchGiorno =
        giornoSelezionato === "Tutti" || item.giorno === giornoSelezionato;
      const matchAgente =
        agenteSelezionato === "Tutti" || item.agente === agenteSelezionato;
      return matchSettimana && matchGiorno && matchAgente;
    });
  }, [dati, settimanaSelezionata, giornoSelezionato, agenteSelezionato]);

  // Calcola statistiche
  const statistiche = useMemo((): StatisticheAgenti => {
    const totaleDurata = datiFiltrati.reduce(
      (sum, item) => sum + (item.durata || 0),
      0
    );
    const valoreTotal = datiFiltrati.reduce(
      (sum, item) => sum + (item.valorePotenziale || 0),
      0
    );
    const attivitaCompletate = datiFiltrati.filter(
      (item) => item.followUp === "Completato"
    ).length;

    return {
      totaleAttivita: datiFiltrati.length,
      totaleDurata: totaleDurata,
      valoreTotal: valoreTotal,
      attivitaCompletate: attivitaCompletate,
      percentualeCompletate:
        datiFiltrati.length > 0
          ? parseFloat(
              ((attivitaCompletate / datiFiltrati.length) * 100).toFixed(1)
            )
          : 0,
    };
  }, [datiFiltrati]);

  // Form per nuova attività
  const [nuovaAttivita, setNuovaAttivita] = useState<AttivitaAgente>({
    settimana: "",
    giorno: "",
    data: "",
    agente: "",
    tipoAttivita: "",
    cliente: "",
    obiettivo: "",
    esito: "",
    durata: 0,
    note: "",
    valorePotenziale: null,
    followUp: "Da fare",
  });

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  // Gestione del toggle del menu
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  const aggiungiAttivita = () => {
    if (
      nuovaAttivita.settimana &&
      nuovaAttivita.giorno &&
      nuovaAttivita.agente
    ) {
      setDati([
        ...dati,
        {
          ...nuovaAttivita,
          durata: parseFloat(nuovaAttivita.durata.toString()) || 0,
          valorePotenziale: nuovaAttivita.valorePotenziale
            ? parseFloat(nuovaAttivita.valorePotenziale.toString())
            : null,
        },
      ]);
      setNuovaAttivita({
        settimana: "",
        giorno: "",
        data: "",
        agente: "",
        tipoAttivita: "",
        cliente: "",
        obiettivo: "",
        esito: "",
        durata: 0,
        note: "",
        valorePotenziale: null,
        followUp: "Da fare",
      });
      setMostraFormAggiunta(false);
    }
  };

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
                onClick={() => setMostraFormAggiunta(!mostraFormAggiunta)}
              >
                <i className="fa-solid fa-plus me-1"></i>
                Aggiungi Attività
              </button>
              <button className="btn btn-outline-primary-dark">
                <i className="fa-solid fa-download me-1"></i>
                Esporta
              </button>
              <button className="btn btn-primary-dark">
                <i className="fa-solid fa-refresh me-1"></i>
                Aggiorna
              </button>
            </div>
          </div>

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
                        {agentiUnici.map((agente) => (
                          <option key={agente} value={agente}>
                            {agente}
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
                      <div className="col-md-4">
                        <label className="form-label">Settimana *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="es. 2025-W33"
                          value={nuovaAttivita.settimana}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              settimana: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Giorno *</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.giorno}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              giorno: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleziona giorno</option>
                          {giorniUnici.map((giorno) => (
                            <option key={giorno} value={giorno}>
                              {giorno}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Data</label>
                        <input
                          type="date"
                          className="form-control"
                          value={nuovaAttivita.data}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              data: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Agente *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Nome Agente"
                          value={nuovaAttivita.agente}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              agente: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tipo Attività</label>
                        <select
                          className="form-select"
                          value={nuovaAttivita.tipoAttivita}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              tipoAttivita: e.target.value,
                            })
                          }
                        >
                          <option value="">Seleziona tipo</option>
                          <option value="In sede">In sede</option>
                          <option value="Fuori sede">Fuori sede</option>
                          <option value="Telefonico">Telefonico</option>
                          <option value="Online">Online</option>
                        </select>
                      </div>
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
                      <div className="col-md-4">
                        <label className="form-label">Esito</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Esito attività"
                          value={nuovaAttivita.esito}
                          onChange={(e) =>
                            setNuovaAttivita({
                              ...nuovaAttivita,
                              esito: e.target.value,
                            })
                          }
                        />
                      </div>
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
                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={aggiungiAttivita}
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
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiFiltrati.map((item, index) => (
                            <tr key={index}>
                              <td>{item.settimana}</td>
                              <td>{item.giorno}</td>
                              <td>{item.data}</td>
                              <td className="fw-bold">{item.agente}</td>
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
                                <span className={getBadgeClass(item.followUp)}>
                                  {item.followUp}
                                </span>
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
                        Nessuna attività corrisponde ai filtri selezionati.
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
