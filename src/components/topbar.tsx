// src/components/Topbar.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./topbar.css";
import logo from "../assets/admiralpay_logo_top.png";

interface TopbarProps {
  toggleMenu: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleMenu }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL as string | undefined;

  function getAuthHeaders() {
    const token = localStorage.getItem("token") || "";
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const idUser = localStorage.getItem("idUser") || "";
    const cachedFullName = localStorage.getItem("fullName") || "";

    // Mostra subito il nome cached se presente
    if (cachedFullName) setUserName(cachedFullName);

    if (!API_URL || !idUser) return;

    const ac = new AbortController();
    (async () => {
      try {
        // 🔁 Adatta l’endpoint se il tuo BE espone un path diverso
        const res = await fetch(`${API_URL}/api/Auth/users/${idUser}`, {
          method: "GET",
          headers: getAuthHeaders(),
          signal: ac.signal,
        });
        if (!res.ok) return; // fallback resta cachedFullName

        const u = (await res.json()) as {
          id?: string;
          fullName?: string;
          nome?: string;
          cognome?: string;
          firstName?: string;
          lastName?: string;
          username?: string;
        };

        const resolved =
          u.fullName ||
          [u.nome ?? u.firstName ?? "", u.cognome ?? u.lastName ?? ""]
            .join(" ")
            .trim() ||
          u.username ||
          cachedFullName;

        if (resolved) setUserName(resolved);
      } catch {
        // ignora errori → resta il fallback
      }
    })();

    return () => ac.abort();
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark border-bottom">
      <div className="container-fluid">
        {/* Logo */}
        <div className="logo-container">
          <img src={logo} alt="Medialab Logo" />
          <span className="ms-2">Medialab (Admin)</span>
        </div>

        {/* User display (tra logo e menu) */}
        <div className="user-display ms-3 me-3" title={userName || "Utente"}>
          <i className="fa-solid fa-user-circle me-2" aria-hidden="true"></i>
          <span className="user-name">{userName || "Utente"}</span>
        </div>

        {/* Mobile menu toggle button */}
        <button
          id="menu-toggle"
          className="navbar-toggler"
          type="button"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Collapse */}
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          {/* Main Navigation */}
          <ul className="navbar-nav me-auto">
            {/* 👈 Aggiungi navigazione solo qui */}
            <li className="nav-item">
              <button
                className="nav-link"
                onClick={() => navigate("/dashboard")}
              >
                Home
              </button>
            </li>

            {/* Gestionale Dropdown */}
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle"
                id="navbarGestionale"
                data-bs-toggle="dropdown"
              >
                Gestionale
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/dashboard")}
                  >
                    <i className="fa fa-home me-2"></i> Home
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/resoconto")}
                  >
                    <i className="fa fa-cog me-2"></i> Resoconto
                  </button>
                </li>
              </ul>
            </li>

            {/* Riparazione Dropdown */}
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle"
                id="navbarRiparazione"
                data-bs-toggle="dropdown"
              >
                Listini
              </button>
              <ul className="dropdown-menu">
                <li className="dropdown-submenu">
                  <button className="dropdown-item dropdown-toggle">
                    Sunmi
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/iphone/display")}
                      >
                        Configurazione
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/iphone/batteria")}
                      >
                        POS
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/iphone/altri-danni")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/iphone/chip-livello2")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/iphone/danni-liquido")
                        }
                      >
                        Danni Da Liquido
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/iphone/software")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-attive")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-archivio")}
                      >
                        ...
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="dropdown-submenu">
                  <button className="dropdown-item dropdown-toggle">
                    Piattaforme
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/imac/display")}
                      >
                        Servizi al Cittadino
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/imac/batteria")}
                      >
                        B2B
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/imac/altri-danni")
                        }
                      >
                        Altri ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/imac/chip-livello2")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/imac/danni-liquido")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/imac/software")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-attive")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-archivio")}
                      >
                        ...
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="dropdown-submenu">
                  <button className="dropdown-item dropdown-toggle">
                    Novo Cash
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/macbook/air")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/macbook/pro")}
                      >
                        ...
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="dropdown-submenu">
                  <button className="dropdown-item dropdown-toggle">
                    Novo Cash VLT
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/ipad/display")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/ipad/batteria")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/ipad/altri-danni")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/ipad/chip-livello2")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/ipad/danni-liquido")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni/ipad/software")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-attive")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-archivio")}
                      >
                        ...
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="dropdown-submenu">
                  <button className="dropdown-item dropdown-toggle">
                    Terminale POS
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/apple-watch/display")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() =>
                          navigate("/riparazioni/apple-watch/batteria")
                        }
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-attive")}
                      >
                        ...
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate("/riparazioni-archivio")}
                      >
                        ...
                      </button>
                    </li>
                  </ul>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item custom-bg-green"
                    onClick={() => navigate("/riparazioni-attive")}
                  >
                    ...
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item custom-bg-red"
                    onClick={() => navigate("/riparazioni-archivio")}
                  >
                    Tutte le Piattaforme
                  </button>
                </li>
              </ul>
            </li>

            {/* Vendite Dropdown */}
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                Vendite
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/accessorio-rapido")}
                  >
                    B2C
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/accessorio-garanzia")}
                  >
                    B2B
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/software")}
                  >
                    ...
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/dispositivo-usato")}
                  >
                    ...
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/dispositivo-nuovo")}
                  >
                    ...
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/vendite/spesa")}
                  >
                    ...
                  </button>
                </li>
              </ul>
            </li>

            {/* Registro Dropdown */}
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                Registro
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate("/registro")}
                  >
                    Sub...
                  </button>
                </li>
              </ul>
            </li>

            {/* Clienti */}
            <li className="nav-item">
              <button
                className="nav-link"
                onClick={() => navigate("/anagrafica-clienti")}
              >
                Clienti
              </button>
            </li>

            {/* Fatture */}
            <li className="nav-item">
              <button className="nav-link" onClick={() => navigate("/fatture")}>
                Analisi KPI
              </button>
            </li>
          </ul>

          {/* Right Side Icons */}
          <div className="d-flex align-items-center">
            <button
              className="topbar-icon-button"
              onClick={() => navigate("/notifiche")}
            >
              <i className="fa-solid fa-bell"></i>
            </button>
            <button
              className="topbar-icon-button"
              onClick={() => navigate("/profilo")}
            >
              <i className="fa-solid fa-user"></i>
            </button>
            <button
              className="topbar-icon-button"
              onClick={() => navigate("/report-lavorazioni")}
            >
              <i className="fa-solid fa-chart-bar"></i>
            </button>
            <button
              className="topbar-icon-button"
              onClick={() => navigate("/impostazioni")}
            >
              <i className="fa-solid fa-cog"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Topbar;
