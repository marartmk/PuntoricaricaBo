import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import Sidebar from "../../components/sidebar"; // Assicurati che il percorso sia corretto
import Topbar from "../../components/topbar"; // Assicurati che il percorso sia corretto

const Dashboard: React.FC = () => {
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [newsData, setNewsData] = useState<any[]>([]);
  const navigate = useNavigate();

  // Simula il caricamento delle notizie
  useEffect(() => {
    const loadNews = () => {
      const mockNews = [
        {
          id: 1,
          title: "Alcuni computer Mac con l'aggiornamento....",
          date: new Date(Date.now() - 86400000),
          content:
            "Alcuni modelli di Mac potrebbero riscontrare ritardi nel caricamento di Diagnosi Apple o delle diagnostiche EFI di AST 2 dopo i seguenti aggiornamenti: Aggiornamento a macOS Big Sur 11.3 Aggiornamento del firmware del chip di sicurezza Apple T2 alla versione più recente dopo aver eseguito correttamente le suite Configurazione di sistema, Riattiva dispositivo o un ripristino con Apple Configurator 2 I modelli di Mac interessati si collegheranno alla Console di diagnostica di AST 2 e possono visualizzare il messaggio 'Attendo il supporto...' per diversi minuti.",
        },
        {
          id: 2,
          title: "Trasformazione di GSX - Fase 2: ...",
          date: new Date(Date.now() - 172800000),
          content: "Informazioni sulla fase 2......",
        },
        {
          id: 3,
          title: "Suggerimenti per ridurre l'impatto ambiantale ...",
          date: new Date(Date.now() - 259200000),
          content: "Suggerimenti per ridurre l'impatto ambientale...",
        },
      ];
      setNewsData(mockNews);
    };

    loadNews();

    // Carica lo stato del menu dal localStorage
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

  // Gestione della selezione di una notizia
  const handleSelectNews = (newsId: number) => {
    const newsItem = newsData.find((item) => item.id === newsId);
    setSelectedNews(newsItem);
  };

  // Navigazione alle varie pagine
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Gestione data e ora
  const [currentDate, setCurrentDate] = useState({
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

    setCurrentDate({
      day: days[now.getDay()].toUpperCase(),
      date: now.getDate().toString(),
      month: now.toLocaleString("it-IT", { month: "long" }),
    });

    // Disegna l'orologio
    const drawClock = () => {
      const canvas = document.getElementById(
        "clockCanvas"
      ) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 100;
      const now = new Date();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Disegna le tacche dei secondi
      for (let i = 0; i < 60; i++) {
        const angle = (i * Math.PI) / 30;
        const x1 = centerX + Math.cos(angle) * (radius - 5);
        const y1 = centerY + Math.sin(angle) * (radius - 5);
        const x2 =
          centerX + Math.cos(angle) * (radius - (i % 5 === 0 ? 15 : 10));
        const y2 =
          centerY + Math.sin(angle) * (radius - (i % 5 === 0 ? 15 : 10));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i % 5 === 0 ? "black" : "gray";
        ctx.lineWidth = i % 5 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Disegna i numeri delle ore
      ctx.font = "16px Arial";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 1; i <= 12; i++) {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius - 25);
        const y = centerY + Math.sin(angle) * (radius - 25);
        ctx.fillText(i.toString(), x, y);
      }

      // Ottenere ore, minuti e secondi
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Calcolo degli angoli
      const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
      const minuteAngle =
        ((minutes + seconds / 60) * Math.PI) / 30 - Math.PI / 2;
      const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2;

      // Disegna la lancetta delle ore
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(hourAngle) * (radius * 0.5),
        centerY + Math.sin(hourAngle) * (radius * 0.5)
      );
      ctx.strokeStyle = "black";
      ctx.lineWidth = 5;
      ctx.stroke();

      // Disegna la lancetta dei minuti
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(minuteAngle) * (radius * 0.7),
        centerY + Math.sin(minuteAngle) * (radius * 0.7)
      );
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Disegna la lancetta dei secondi (arancione)
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(secondAngle) * (radius * 0.9),
        centerY + Math.sin(secondAngle) * (radius * 0.9)
      );
      ctx.strokeStyle = "orange";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Disegna il punto centrale
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "black";
      ctx.fill();
    };

    drawClock();
    const clockInterval = setInterval(drawClock, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  return (
    <div
      className={`d-flex ${menuState === "closed" ? "menu-closed" : ""}`}
      id="wrapper"
    >
      {/* Nuova Sidebar */}
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      {/* Main Content */}
      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        {/* Page content */}
        <div className="container-fluid">
          <div>
            <p />
            <p />
            <p />
          </div>

          {/* Box Top Riepilogo */}
          <div className="container">
            <div className="box purple">
              <i className="fa-solid fa-sack-dollar icon"></i>
              <div className="text">
                <span>Totale</span>
                <span>Mese</span>
                <span>Oggi</span>
              </div>
            </div>
            <div className="box dark">
              <i className="fa-solid fa-screwdriver icon"></i>
              <div className="text">
                <span>Riparazioni</span>
              </div>
            </div>
            <div className="box dark">
              <i className="fa-solid fa-mobile-screen-button icon"></i>
              <div className="text">
                <span>Vendite Dispositivi</span>
                <span>Usato</span>
                <span>Nuovo</span>
              </div>
            </div>
            <div className="box grey">
              <i className="fa fa-wallet icon"></i>
              <div className="text">
                <span>Vendite Accessori</span>
              </div>
            </div>
            <div className="box grey">
              <i className="fa fa-heartbeat icon"></i>
              <div className="text">
                <span>Interventi Software</span>
              </div>
            </div>
            <div className="box light-grey">
              <i className="fa fa-arrow-down icon"></i>
              <div className="text">
                <span>Spese</span>
              </div>
            </div>
          </div>

          {/* Seconda Riga con Informazioni */}
          <div className="info-container">
            <div className="date-box improved">
              <span className="day-label">{currentDate.day}</span>
              <span className="number">{currentDate.date}</span>
              <span className="event">Nessun evento oggi</span>
            </div>

            <div className="clock-container">
              <canvas id="clockCanvas" width="250" height="250"></canvas>
            </div>

            <div className="stats-box">
              <div className="icon-container">
                <i className="fa-solid fa-user"></i>
              </div>
              <span>
                <strong>1240</strong> Clienti
              </span>
            </div>

            <div className="stats-box">
              <div className="icon-container">
                <i className="fa-solid fa-screwdriver-wrench icon-large"></i>
              </div>
              <span>
                <strong>2950</strong> Riparazioni
              </span>
            </div>

            <div className="stats-box">
              <span className="success-rate">
                <strong className="big-number">98%</strong>
                <span className="small-text">Rip. svolte con successo</span>
              </span>
            </div>

            <div className="search-box">
              <span className="greeting">Salve</span>
              <div className="search-container">
                <span className="search-icon">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Trova imei, riparazioni, garanzie, clienti ed altro"
                />
              </div>
            </div>
          </div>

          <div className="main-container">
            {/* Sinistra: News e Comunicazioni */}
            <div className="left-panel">
              <div className="card bg-light text-black">
                <div className="custom-card-header-news">
                  <span className="header-title">Service News</span>
                  <div className="search-container-news">
                    <span className="search-icon-news">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                      type="text"
                      className="search-input-news"
                      placeholder="Cerca Service News"
                    />
                  </div>
                </div>
                <div className="card-body">
                  <div className="service-news-box">
                    <div className="news-list">
                      {newsData.map((news) => (
                        <div key={news.id} className="news-item">
                          <button
                            className="news-link"
                            onClick={() => handleSelectNews(news.id)}
                          >
                            <strong>{news.title}</strong>
                            <br />
                            <small className="text-muted">
                              {news.date.toLocaleDateString("it-IT")}
                            </small>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="news-detail">
                      {selectedNews && (
                        <div className="news-content">
                          <h4 className="fw-bold">{selectedNews.title}</h4>
                          <small className="text-muted">
                            {selectedNews.date.toLocaleDateString("it-IT")}
                          </small>
                          <hr />
                          <p>{selectedNews.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Destra: Impegni */}
            <div className="right-panel">
              <div className="card bg-light text-black">
                <div className="custom-card-header">Impegni</div>
                <div className="card-body">
                  <div className="service-news-box-right">
                    <h5 className="card-title">
                      Nessuna Comunicazione Disponibile
                    </h5>
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
