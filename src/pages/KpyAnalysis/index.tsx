import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./kpi-analysis.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ✅ INTERFACCE
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

interface KpiObjectiveDto {
  id: string;
  agenteId: string;
  nomeAgente: string;
  cognomeAgente: string;
  codiceAgente: string;
  prodottoId: number;
  nomeProdotto: string;
  anno: number;
  mese: number;
  nomeMese: string;
  obiettivoMensile: number;
  dataCreazione: string;
  dataUltimaModifica?: string;
}

interface SaleData {
  id: string;
  taskId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  agentId: string;
  salesDateUtc: string;
}

interface SalesResponse {
  success: boolean;
  filters: {
    agentId: string;
    from: string;
    to: string;
  };
  summary: {
    count: number;
    totalQty: number;
    totalAmount: number;
  };
  data: SaleData[];
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

interface AgentPerformance {
  agente: AgenteDto;
  objectives: KpiObjectiveDto[];
  sales: SaleData[];
  totalObjective: number;
  totalSales: number;
  totalSalesQty: number;
  achievementPercentage: number;
  performanceClass: "A" | "B" | "C" | "D";
  productPerformances: ProductPerformance[];
}

interface ProductPerformance {
  productId: number;
  productName: string;
  objective: number;
  salesQty: number;
  salesAmount: number;
  achievementPercentage: number;
}

const KpiAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ CONTROLLO ACCESSO ADMIN
  const userRole = (localStorage.getItem("userLevel") || "").toLowerCase();
  const isAdmin = userRole === "admin";

  // ✅ STATI
  const [agenti, setAgenti] = useState<AgenteDto[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [performances, setPerformances] = useState<AgentPerformance[]>([]);

  // Filtri temporali
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

  // Loading states
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false);
  const [isLoadingPerformances, setIsLoadingPerformances] =
    useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Redirect se non admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [isAdmin, navigate]);

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
  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    setError("");

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

      if (data.success && data.data?.items) {
        const agentiAttivi = data.data.items.filter((agente) => agente.attivo);
        setAgenti(agentiAttivi);
      } else {
        throw new Error(data.message || "Errore nel recupero agenti");
      }
    } catch (error) {
      console.error("🚨 Errore caricamento agenti:", error);
      setError(error instanceof Error ? error.message : "Errore imprevisto");
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // ✅ CARICAMENTO KPI
  const fetchKpiObjectives = async (
    agentIds: string[]
  ): Promise<KpiObjectiveDto[]> => {
    const allKpis: KpiObjectiveDto[] = [];

    for (const agentId of agentIds) {
      try {
        const url = `${API_URL}/api/kpi/agente/${agentId}?anno=${year}&mese=${month}`;
        const response = await fetch(url, { headers: getAuthHeaders() });

        if (response.ok) {
          const kpis: KpiObjectiveDto[] = await response.json();
          allKpis.push(...kpis);
        }
      } catch (error) {
        console.warn(`Errore caricamento KPI per agente ${agentId}:`, error);
      }
    }

    return allKpis;
  };

  // ✅ CARICAMENTO VENDITE
  const fetchSales = async (agentIds: string[]): Promise<SaleData[]> => {
    const allSales: SaleData[] = [];

    // Calcola date del mese selezionato
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const fromDate = startDate.toISOString().split("T")[0];
    const toDate = endDate.toISOString().split("T")[0];

    for (const agentId of agentIds) {
      try {
        const url = `${API_URL}/api/Tasks/proposals/sales?agentId=${agentId}&from=${fromDate}&to=${toDate}`;
        const response = await fetch(url, { headers: getAuthHeaders() });

        if (response.ok) {
          const salesResponse: SalesResponse = await response.json();
          if (salesResponse.success && salesResponse.data) {
            allSales.push(...salesResponse.data);
          }
        }
      } catch (error) {
        console.warn(
          `Errore caricamento vendite per agente ${agentId}:`,
          error
        );
      }
    }

    return allSales;
  };

  // ✅ CALCOLO PERFORMANCE CLASS
  const getPerformanceClass = (percentage: number): "A" | "B" | "C" | "D" => {
    if (percentage >= 90) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 50) return "C";
    return "D";
  };

  // ✅ CALCOLO PRESTAZIONI
  const calculatePerformances = async () => {
    setIsLoadingPerformances(true);
    setError("");

    try {
      // Determina quali agenti analizzare
      const targetAgents =
        selectedAgentId === "all"
          ? agenti
          : agenti.filter((a) => a.id === selectedAgentId);

      if (targetAgents.length === 0) {
        setPerformances([]);
        return;
      }

      const agentIds = targetAgents.map((a) => a.id);

      // Carica KPI e vendite in parallelo
      const [kpis, sales] = await Promise.all([
        fetchKpiObjectives(agentIds),
        fetchSales(agentIds),
      ]);

      // Calcola prestazioni per ogni agente
      const performances: AgentPerformance[] = targetAgents.map((agente) => {
        // KPI dell'agente
        const agentKpis = kpis.filter((k) => k.agenteId === agente.id);

        // Vendite dell'agente
        const agentSales = sales.filter((s) => s.agentId === agente.id);

        // Calcola performance per prodotto
        const productPerformances: ProductPerformance[] = [];
        const productMap = new Map<
          number,
          {
            objective: number;
            salesQty: number;
            salesAmount: number;
            name: string;
          }
        >();

        // Inizializza con obiettivi
        agentKpis.forEach((kpi) => {
          productMap.set(kpi.prodottoId, {
            objective: kpi.obiettivoMensile,
            salesQty: 0,
            salesAmount: 0,
            name: kpi.nomeProdotto,
          });
        });

        // Aggiungi vendite
        agentSales.forEach((sale) => {
          const productId = parseInt(sale.productCode);
          const existing = productMap.get(productId);
          if (existing) {
            existing.salesQty += sale.quantity;
            existing.salesAmount += sale.lineTotal;
          } else {
            // Prodotto venduto ma senza obiettivo
            productMap.set(productId, {
              objective: 0,
              salesQty: sale.quantity,
              salesAmount: sale.lineTotal,
              name: sale.productName,
            });
          }
        });

        // Converte in array di performance
        productMap.forEach((data, productId) => {
          const achievementPercentage =
            data.objective > 0
              ? (data.salesQty / data.objective) * 100
              : data.salesQty > 0
              ? 100
              : 0;

          productPerformances.push({
            productId,
            productName: data.name,
            objective: data.objective,
            salesQty: data.salesQty,
            salesAmount: data.salesAmount,
            achievementPercentage,
          });
        });

        // Totali
        const totalObjective = agentKpis.reduce(
          (sum, kpi) => sum + kpi.obiettivoMensile,
          0
        );
        const totalSalesQty = agentSales.reduce(
          (sum, sale) => sum + sale.quantity,
          0
        );
        const totalSales = agentSales.reduce(
          (sum, sale) => sum + sale.lineTotal,
          0
        );

        // Percentuale di raggiungimento complessiva
        const achievementPercentage =
          totalObjective > 0 ? (totalSalesQty / totalObjective) * 100 : 0;

        return {
          agente,
          objectives: agentKpis,
          sales: agentSales,
          totalObjective,
          totalSales,
          totalSalesQty,
          achievementPercentage,
          performanceClass: getPerformanceClass(achievementPercentage),
          productPerformances,
        };
      });

      setPerformances(performances);
    } catch (error) {
      console.error("🚨 Errore calcolo prestazioni:", error);
      setError(error instanceof Error ? error.message : "Errore imprevisto");
    } finally {
      setIsLoadingPerformances(false);
    }
  };

  // ✅ CARICAMENTO INIZIALE
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
      setError("Token di autenticazione non trovato.");
      return;
    }

    fetchAgents();
  }, [API_URL]);

  // ✅ RICALCOLA QUANDO CAMBIANO I FILTRI
  useEffect(() => {
    if (agenti.length > 0) {
      calculatePerformances();
    }
  }, [selectedAgentId, year, month, agenti]);

  // ✅ GESTIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
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

  const getClassColor = (performanceClass: string): string => {
    switch (performanceClass) {
      case "A":
        return "#28a745"; // Verde
      case "B":
        return "#17a2b8"; // Blu
      case "C":
        return "#ffc107"; // Giallo
      case "D":
        return "#dc3545"; // Rosso
      default:
        return "#6c757d"; // Grigio
    }
  };

  const getClassBadgeClass = (performanceClass: string): string => {
    switch (performanceClass) {
      case "A":
        return "bg-success";
      case "B":
        return "bg-info";
      case "C":
        return "bg-warning";
      case "D":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
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

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } kpi-analysis-page`}
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
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate("/mbo")}
                    >
                      KPI/MBO
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Analisi KPI
                  </li>
                </ol>
              </nav>
              <h2 className="analysis-title">
                <i className="fa-solid fa-chart-line me-2"></i>
                Analisi Prestazioni KPI Agenti
              </h2>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={calculatePerformances}
                disabled={isLoadingPerformances}
              >
                <i
                  className={`fa-solid ${
                    isLoadingPerformances ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                Aggiorna
              </button>
              <button
                className="btn btn-outline-success"
                onClick={() => {
                  // TODO: Implementare export
                  alert("Funzionalità in sviluppo");
                }}
              >
                <i className="fa-solid fa-download me-1"></i>
                Esporta Report
              </button>
            </div>
          </div>

          {/* Filtri */}
          <div className="card mb-4">
            <div className="custom-card-header">
              <span>Filtri Analisi</span>
              <i className="fa-solid fa-filter"></i>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Agente</label>
                  <select
                    className="form-select"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    disabled={isLoadingAgents}
                  >
                    <option value="all">Tutti gli Agenti</option>
                    {agenti.map((agente) => (
                      <option key={agente.id} value={agente.id}>
                        {agente.nome} {agente.cognome} ({agente.codiceAgente})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Anno</label>
                  <select
                    className="form-select"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  >
                    {[2024, 2025, 2026].map((anno) => (
                      <option key={anno} value={anno}>
                        {anno}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Mese</label>
                  <select
                    className="form-select"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mese) => (
                      <option key={mese} value={mese}>
                        {getMeseNome(mese)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Alert errori */}
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>Errore:</strong> {error}
            </div>
          )}

          {/* Loading */}
          {isLoadingPerformances && (
            <div className="alert alert-info mb-4" role="alert">
              <i className="fa-solid fa-spinner fa-spin me-2"></i>
              Caricamento analisi prestazioni...
            </div>
          )}

          {/* Risultati */}
          {performances.length > 0 && !isLoadingPerformances && (
            <>
              {/* Summary Cards */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card summary-card">
                    <div className="card-body text-center">
                      <i className="fa-solid fa-users fa-2x text-primary mb-2"></i>
                      <h3 className="card-title">{performances.length}</h3>
                      <p className="card-text">Agenti Analizzati</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card summary-card">
                    <div className="card-body text-center">
                      <i className="fa-solid fa-trophy fa-2x text-success mb-2"></i>
                      <h3 className="card-title">
                        {
                          performances.filter((p) => p.performanceClass === "A")
                            .length
                        }
                      </h3>
                      <p className="card-text">Classe A</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card summary-card">
                    <div className="card-body text-center">
                      <i className="fa-solid fa-target fa-2x text-info mb-2"></i>
                      <h3 className="card-title">
                        {performances.reduce(
                          (sum, p) => sum + p.totalObjective,
                          0
                        )}
                      </h3>
                      <p className="card-text">Obiettivi Totali</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card summary-card">
                    <div className="card-body text-center">
                      <i className="fa-solid fa-chart-line fa-2x text-warning mb-2"></i>
                      <h3 className="card-title">
                        {performances.reduce(
                          (sum, p) => sum + p.totalSalesQty,
                          0
                        )}
                      </h3>
                      <p className="card-text">Vendite Totali</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Cards per ogni agente */}
              <div className="row">
                {performances.map((performance) => (
                  <div key={performance.agente.id} className="col-lg-6 mb-4">
                    <div
                      className={`card performance-card performance-${performance.performanceClass.toLowerCase()}`}
                    >
                      <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="card-title mb-1">
                              {performance.agente.nome}{" "}
                              {performance.agente.cognome}
                            </h5>
                            <small className="text-muted">
                              {performance.agente.codiceAgente}
                            </small>
                          </div>
                          <div className="text-end">
                            <span
                              className={`badge ${getClassBadgeClass(
                                performance.performanceClass
                              )} badge-lg`}
                            >
                              Classe {performance.performanceClass}
                            </span>
                            <div className="mt-1">
                              <small className="text-muted">
                                {performance.achievementPercentage.toFixed(1)}%
                                raggiungimento
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Obiettivi vs Vendite</span>
                            <span>
                              {performance.totalSalesQty} /{" "}
                              {performance.totalObjective}
                            </span>
                          </div>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${Math.min(
                                  performance.achievementPercentage,
                                  100
                                )}%`,
                                backgroundColor: getClassColor(
                                  performance.performanceClass
                                ),
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Statistiche */}
                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="stat-item">
                              <i className="fa-solid fa-bullseye text-primary"></i>
                              <div className="stat-value">
                                {performance.totalObjective}
                              </div>
                              <div className="stat-label">Obiettivi</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="stat-item">
                              <i className="fa-solid fa-shopping-cart text-success"></i>
                              <div className="stat-value">
                                {performance.totalSalesQty}
                              </div>
                              <div className="stat-label">Vendite</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="stat-item">
                              <i className="fa-solid fa-euro-sign text-warning"></i>
                              <div className="stat-value">
                                €{performance.totalSales.toFixed(0)}
                              </div>
                              <div className="stat-label">Ricavo</div>
                            </div>
                          </div>
                        </div>

                        {/* Grafico prodotti (se ha performance per prodotto) */}
                        {performance.productPerformances.length > 0 && (
                          <div className="product-chart">
                            <h6 className="text-muted mb-2">
                              Performance per Prodotto
                            </h6>
                            <div style={{ height: "200px" }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={performance.productPerformances.map(
                                    (product) => ({
                                      name:
                                        product.productName.length > 15
                                          ? product.productName.substring(
                                              0,
                                              15
                                            ) + "..."
                                          : product.productName,
                                      objective: product.objective,
                                      sales: product.salesQty,
                                      achievement:
                                        product.achievementPercentage.toFixed(
                                          1
                                        ),
                                    })
                                  )}
                                  margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0f0f0"
                                  />
                                  <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    tick={{ fill: "#666" }}
                                  />
                                  <YAxis
                                    fontSize={12}
                                    tick={{ fill: "#666" }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.95)",
                                      border: "1px solid #ddd",
                                      borderRadius: "8px",
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                    }}
                                    formatter={(value, name) => {
                                      if (name === "objective")
                                        return [value, "Obiettivo"];
                                      if (name === "sales")
                                        return [value, "Vendite"];
                                      return [value, name];
                                    }}
                                    // 👇 NUOVO: percentuale in etichetta
                                    labelFormatter={(label, payload) => {
                                      const p = payload && payload[0]?.payload;
                                      const objective = Number(
                                        p?.objective || 0
                                      );
                                      const sales = Number(p?.sales || 0);
                                      const perc =
                                        objective > 0
                                          ? (sales / objective) * 100
                                          : 0;

                                      return (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                          }}
                                        >
                                          <span style={{ fontWeight: 700 }}>
                                            {label}
                                          </span>
                                          <span
                                            style={{
                                              color: "#dc3545",
                                              fontWeight: 600,
                                            }}
                                          >
                                            Raggiungimento: {perc.toFixed(1)}%
                                          </span>
                                        </div>
                                      );
                                    }}
                                  />

                                  <Legend
                                    wrapperStyle={{ fontSize: "12px" }}
                                    formatter={(value) => {
                                      if (value === "objective")
                                        return "Obiettivo";
                                      if (value === "sales") return "Vendite";
                                      return value;
                                    }}
                                  />
                                  <Bar
                                    dataKey="objective"
                                    fill="rgba(108, 117, 125, 0.7)"
                                    name="objective"
                                    radius={[2, 2, 0, 0]}
                                  />
                                  <Bar
                                    dataKey="sales"
                                    fill={getClassColor(
                                      performance.performanceClass
                                    )}
                                    name="sales"
                                    radius={[2, 2, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* No Data */}
          {performances.length === 0 && !isLoadingPerformances && !error && (
            <div className="text-center py-5">
              <i className="fa-solid fa-chart-line fa-4x text-muted mb-3"></i>
              <h4 className="text-muted">Nessun dato disponibile</h4>
              <p className="text-muted">
                Seleziona un periodo e un agente per visualizzare l'analisi
                delle prestazioni.
                <br />
                Assicurati che ci siano obiettivi KPI impostati per il periodo
                selezionato.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/mbo")}
              >
                <i className="fa-solid fa-chart-bar me-1"></i>
                Vai a Gestione KPI
              </button>
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

export default KpiAnalysisPage;
