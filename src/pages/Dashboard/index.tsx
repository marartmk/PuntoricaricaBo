import React, { useState, useEffect } from "react";
//import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import Sidebar from "../../components/sidebar"; // Assicurati che il percorso sia corretto
import Topbar from "../../components/topbar"; // Assicurati che il percorso sia corretto

interface News {
  id: number;
  title: string;
  date: Date;
  content: string;
}

interface AIMessage {
  id: number;
  type: "user" | "ai";
  message: string;
  timestamp: Date;
}

const Dashboard: React.FC = () => {
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [newsData, setNewsData] = useState<News[]>([]);

  // Stati per AI Assistant
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  //const navigate = useNavigate();

  // Verifica configurazione API all'avvio
  useEffect(() => {
    console.log("API Key presente:", !!OPENAI_API_KEY);
    console.log("Tutte le variabili env:", import.meta.env);
  }, []);

  // Simula il caricamento delle notizie
  useEffect(() => {
    const loadNews = () => {
      const mockNews = [
        {
          id: 1,
          title: "Nuove normative PSD3: cambiamenti nei pagamenti digitali ...",
          date: new Date(Date.now() - 259200000),
          content:
            "La Commissione Europea ha annunciato la bozza preliminare della direttiva PSD3 (Payment Services Directive 3), che introdurrà regole più severe sulla sicurezza delle transazioni digitali e sulla gestione delle API bancarie. Le nuove linee guida, che entreranno in vigore dal 2026, prevedono un rafforzamento della Strong Customer Authentication (SCA) e una maggiore trasparenza sulle commissioni applicate ai pagamenti elettronici. I terminali Sunmi e le piattaforme di pagamento dovranno adeguarsi entro 18 mesi dall’entrata in vigore della direttiva per garantire la conformità ai nuovi standard.",
        },
        {
          id: 2,
          title: "Aggiornamento servizi Sunmi: ...",
          date: new Date(Date.now() - 172800000),
          content:
            "Nella nuova release del Sunmi abbiamo introdotto un nuovo modulo per la gestione delle transazioni multi-valuta e un sistema di riconciliazione automatica. Questa novità permette agli esercenti di controllare in tempo reale i flussi di pagamento tramite un’interfaccia web migliorata. L’aggiornamento è stato rilasciato su tutti i terminali Sunmi T2 con Android 11, migliorando anche la compatibilità con i sistemi di pagamento del wallet.",
        },
        {
          id: 3,
          title:
            "Pagamenti bollettini: dal 2025 nuovi standard di tracciabilità ...",
          date: new Date(Date.now() - 259200000),
          content:
            "L’Autorità Europea dei Pagamenti ha approvato una serie di modifiche normative che interesseranno tutti i sistemi di pagamento dei bollettini postali e MAV. Dal gennaio 2026, ogni operazione dovrà includere un codice univoco di tracciamento conforme agli standard PSD3, garantendo una maggiore sicurezza e trasparenza per i cittadini. I terminali Sunmi, così come le piattaforme online, dovranno aggiornare i propri sistemi di riconciliazione e logistica dei pagamenti per rispettare i nuovi requisiti. Le istituzioni di pagamento avranno 12 mesi di tempo per adeguarsi alla normativa, con incentivi per chi adotterà le soluzioni di tracciamento in anticipo.",
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
    const newsItem = newsData.find((item) => item.id === newsId) || null;
    setSelectedNews(newsItem);
  };

  // Chiamata vera alle API OpenAI
  const getAIResponse = async (question: string): Promise<string> => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "Sei un assistente specializzato in analisi di Kpi Prestazioni nelle vendite. Rispondi in italiano in modo professionale e utile.",
              },
              {
                role: "user",
                content: question,
              },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Errore chiamata OpenAI:", error);
      return "Scusa, c'è stato un problema nella connessione. Riprova tra poco.";
    }
  };

  // Gestione invio domanda all'AI
  const handleSendQuestion = async () => {
    if (!currentQuestion.trim()) return;

    // Salva la domanda per la chiamata API
    const questionToSend = currentQuestion;

    // Aggiungi la domanda dell'utente
    const userMessage: AIMessage = {
      id: Date.now(),
      type: "user",
      message: currentQuestion,
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setCurrentQuestion("");
    setIsAiTyping(true);

    try {
      // Chiamata vera all'API OpenAI
      const aiResponseText = await getAIResponse(questionToSend);

      const aiResponse: AIMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: aiResponseText,
        timestamp: new Date(),
      };

      setAiMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Errore durante la risposta AI:", error);
      const errorMessage: AIMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: "Scusa, c'è stato un errore. Riprova tra poco.",
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Gestione del tasto Enter nella textbox
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  // Navigazione alle varie pagine
  // const navigateTo = (path: string) => {
  //   navigate(path);
  // };

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
      {/* 👈 RIMUOVI IL WRAPPER - Sidebar si gestisce da sola */}
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
              <i className="fa-solid fa-hand-holding-dollar icon"></i>
              <div className="text">
                <span>Operazioni</span>
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
                <span>Vendite Servizi</span>
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
                <i className="fa-solid fa-hand-holding-dollar icon-large"></i>
              </div>
              <span>
                <strong>2950</strong> Operazioni
              </span>
            </div>

            <div className="stats-box">
              <span className="success-rate">
                <strong className="big-number">98%</strong>
                <span className="small-text">Op. concluse con successo</span>
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
                  placeholder="Trova clienti, procedure, commissioni, listini ed altro"
                />
              </div>
            </div>
          </div>

          <div className="main-container">
            {/* Sinistra: News e Comunicazioni */}
            <div className="left-panel">
              <div className="card bg-light text-black">
                <div className="custom-card-header-news">
                  <span className="header-title">News e Comunicazioni</span>
                  <div className="search-container-news">
                    <span className="search-icon-news">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                      type="text"
                      className="search-input-news"
                      placeholder="Cerca Nelle News"
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

            {/* Destra: AI Assistant */}
            <div className="right-panel">
              <div className="card bg-light text-black">
                <div className="custom-card-header">
                  <span>AI Assistant</span>
                  <i
                    className="fa-solid fa-robot"
                    style={{ fontSize: "18px" }}
                  ></i>
                </div>
                <div className="card-body">
                  {/* Area conversazione */}
                  <div className="ai-chat-container">
                    {aiMessages.length === 0 ? (
                      <div className="ai-welcome">
                        <p className="text-muted">
                          <i className="fa-solid fa-robot"></i> Ciao! Sono il
                          tuo assistente AI per il backoffice. Puoi chiedermi
                          informazioni su transazioni, terminali di pagamento o
                          procedure operative.
                        </p>
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
                              <div className="message-text">{msg.message}</div>
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

                  {/* Input area */}
                  <div className="ai-input-container">
                    <div className="ai-input-wrapper">
                      <textarea
                        className="ai-input"
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Scrivi la tua domanda qui..."
                        rows={2}
                        disabled={isAiTyping}
                      />
                      <button
                        className="ai-send-btn"
                        onClick={handleSendQuestion}
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
