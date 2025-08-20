import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../pages/Dashboard/dashboard.css';
import './tasks-custom.css';
import Sidebar from '../../components/sidebar';
import Topbar from '../../components/topbar';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ✅ INTERFACCE PER TASK MANAGEMENT
interface Cliente {
  id: string;
  nome: string;
  cognome?: string;
  email: string;
  telefono?: string;
  citta?: string;
  provincia?: string;
  tipoAttivita?: string;
  azienda?: string;
  indirizzo?: string;
  cap?: string;
}

interface Agente {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  reparto: string;
  attivo: boolean;
}

interface TaskIntervento {
  id: string;
  taskId: string;
  operatoreId: string;
  nomeOperatore: string;
  cognomeOperatore: string;
  tipoIntervento: 'Chiamata' | 'Email' | 'Note' | 'Assegnazione' | 'Cambio Stato' | 'Altro';
  descrizione: string;
  dataIntervento: string;
  durata?: number; // in minuti
  esitoIntervento?: 'Positivo' | 'Negativo' | 'Neutrale' | 'Da Ricontattare';
  prossimaAzione?: string;
  dataProximoContatto?: string;
}

interface Task {
  id: string;
  numeroTask: string;
  titolo: string;
  descrizione: string;
  stato: 'Aperto' | 'In Corso' | 'In Attesa' | 'Completato' | 'Chiuso' | 'Sospeso';
  priorita: 'Bassa' | 'Media' | 'Alta' | 'Urgente';
  cliente: Cliente;
  agenteAssegnato?: Agente;
  dataCreazione: string;
  dataUltimaModifica?: string;
  dataScadenza?: string;
  dataChiusura?: string;
  origine: 'Email' | 'Telefono' | 'Sito Web' | 'Manuale' | 'Chat' | 'Social';
  categoria: 'Vendita' | 'Supporto' | 'Tecnico' | 'Amministrativo' | 'Reclamo' | 'Informazioni';
  valorePotenziale?: number;
  note?: string;
  interventI: TaskIntervento[];
  tags?: string[];
}

interface TaskStats {
  totaleTask: number;
  aperti: number;
  inCorso: number;
  completati: number;
  scaduti: number;
  mediaRisoluzione: number; // giorni
  valoreTotalePotenziale: number;
}

interface NuovoTaskForm {
  titolo: string;
  descrizione: string;
  priorita: 'Bassa' | 'Media' | 'Alta' | 'Urgente';
  categoria: 'Vendita' | 'Supporto' | 'Tecnico' | 'Amministrativo' | 'Reclamo' | 'Informazioni';
  agenteAssegnatoId: string;
  dataScadenza: string;
  valorePotenziale?: number;
  note: string;
  // Dati cliente
  clienteNome: string;
  clienteCognome: string;
  clienteEmail: string;
  clienteTelefono: string;
  clienteCitta: string;
  clienteProvincia: string;
  clienteAzienda: string;
  clienteTipoAttivita: string;
}

const TaskManagement: React.FC = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<'open' | 'closed'>('open');

  // ✅ CONFIGURAZIONE API
  const API_URL = import.meta.env.VITE_API_URL;

  // ✅ STATI PRINCIPALI
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agenti, setAgenti] = useState<Agente[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // ✅ STATI FILTRI E VISUALIZZAZIONE
  const [activeTab, setActiveTab] = useState<'aperti' | 'tutti' | 'completati' | 'scaduti'>('aperti');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('tutte');
  const [selectedAgent, setSelectedAgent] = useState<string>('tutti');
  const [selectedCategory, setSelectedCategory] = useState<string>('tutte');
  const [selectedStatus, setSelectedStatus] = useState<string>('tutti');

  // ✅ STATI FORM E MODALI
  const [showNewTaskForm, setShowNewTaskForm] = useState<boolean>(false);
  const [showTaskDetail, setShowTaskDetail] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [showAddInterventionModal, setShowAddInterventionModal] = useState<boolean>(false);

  // ✅ STATI PER RIASSEGNAZIONE
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  // ✅ STATI PER NUOVO INTERVENTO
  const defaultNewIntervention: Omit<TaskIntervento, 'id' | 'taskId'> = {
    operatoreId: '',
    nomeOperatore: '',
    cognomeOperatore: '',
    tipoIntervento: 'Note',
    descrizione: '',
    dataIntervento: new Date().toISOString(),
    durata: undefined,
    esitoIntervento: undefined,
    prossimaAzione: undefined,
    dataProximoContatto: undefined,
  };

  const [newIntervention, setNewIntervention] = useState<Omit<TaskIntervento, 'id' | 'taskId'>>(defaultNewIntervention);

  // ✅ PAGINAZIONE
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // ✅ FORM NUOVO TASK
  const defaultNewTask: NuovoTaskForm = {
    titolo: '',
    descrizione: '',
    priorita: 'Media',
    categoria: 'Vendita',
    agenteAssegnatoId: '',
    dataScadenza: '',
    valorePotenziale: undefined,
    note: '',
    clienteNome: '',
    clienteCognome: '',
    clienteEmail: '',
    clienteTelefono: '',
    clienteCitta: '',
    clienteProvincia: '',
    clienteAzienda: '',
    clienteTipoAttivita: '',
  };

  const [newTask, setNewTask] = useState<NuovoTaskForm>(defaultNewTask);

  // ✅ CARICAMENTO MENU STATE
  useEffect(() => {
    const savedMenuState = localStorage.getItem('menuState');
    if (savedMenuState === 'closed') {
      setMenuState('closed');
    }
  }, []);

  // ✅ DATI FAKE - AGENTI
  const agentiFake: Agente[] = [
    {
      id: 'agent-1',
      nome: 'Marco',
      cognome: 'Rossi',
      email: 'm.rossi@company.com',
      telefono: '+39 339 1234567',
      reparto: 'Commerciale',
      attivo: true,
    },
    {
      id: 'agent-2',
      nome: 'Anna',
      cognome: 'Verdi',
      email: 'a.verdi@company.com',
      telefono: '+39 338 7654321',
      reparto: 'Supporto',
      attivo: true,
    },
    {
      id: 'agent-3',
      nome: 'Luigi',
      cognome: 'Bianchi',
      email: 'l.bianchi@company.com',
      telefono: '+39 347 9876543',
      reparto: 'Tecnico',
      attivo: true,
    },
    {
      id: 'agent-4',
      nome: 'Sofia',
      cognome: 'Neri',
      email: 's.neri@company.com',
      telefono: '+39 345 5551234',
      reparto: 'Commerciale',
      attivo: true,
    },
  ];

  // ✅ DATI FAKE - TASK
  const tasksFake: Task[] = [
    {
      id: 'task-1',
      numeroTask: 'TSK-001',
      titolo: 'Richiesta informazioni POS',
      descrizione: 'Cliente interessato a soluzioni POS per la sua attività',
      stato: 'Aperto',
      priorita: 'Alta',
      cliente: {
        id: 'client-1',
        nome: 'Marco',
        cognome: 'Amicone',
        email: 'aaaamiconeasssicurazioni@gmail.com',
        telefono: '3389105515',
        citta: 'San Valentino in abruzzo citeriore',
        provincia: 'PE',
        tipoAttivita: 'Assicurazioni',
        azienda: 'Amicone Assicurazioni',
      },
      agenteAssegnato: agentiFake[0],
      dataCreazione: '2025-08-20T10:30:00Z',
      dataScadenza: '2025-08-25T17:00:00Z',
      origine: 'Email',
      categoria: 'Vendita',
      valorePotenziale: 2500,
      interventI: [
        {
          id: 'int-1',
          taskId: 'task-1',
          operatoreId: 'agent-1',
          nomeOperatore: 'Marco',
          cognomeOperatore: 'Rossi',
          tipoIntervento: 'Email',
          descrizione: 'Inviata email di risposta con documentazione POS',
          dataIntervento: '2025-08-20T11:00:00Z',
          esitoIntervento: 'Positivo',
          prossimaAzione: 'Chiamata di follow-up',
          dataProximoContatto: '2025-08-21T09:00:00Z',
        }
      ],
      tags: ['pos', 'vendita', 'assicurazioni'],
    },
    {
      id: 'task-2',
      numeroTask: 'TSK-002',
      titolo: 'Supporto tecnico dispositivo',
      descrizione: 'Problema con lettore carte cliente esistente',
      stato: 'In Corso',
      priorita: 'Media',
      cliente: {
        id: 'client-2',
        nome: 'Giulia',
        cognome: 'Ferrari',
        email: 'g.ferrari@ristorante.it',
        telefono: '+39 334 9876543',
        citta: 'Milano',
        provincia: 'MI',
        tipoAttivita: 'Ristorazione',
        azienda: 'Ristorante Da Giulia',
      },
      agenteAssegnato: agentiFake[2],
      dataCreazione: '2025-08-19T14:20:00Z',
      dataScadenza: '2025-08-22T18:00:00Z',
      origine: 'Telefono',
      categoria: 'Tecnico',
      interventI: [
        {
          id: 'int-2',
          taskId: 'task-2',
          operatoreId: 'agent-2',
          nomeOperatore: 'Anna',
          cognomeOperatore: 'Verdi',
          tipoIntervento: 'Chiamata',
          descrizione: 'Ricevuta chiamata cliente, diagnosticato problema hardware',
          dataIntervento: '2025-08-19T14:30:00Z',
          durata: 15,
          esitoIntervento: 'Neutrale',
        },
        {
          id: 'int-3',
          taskId: 'task-2',
          operatoreId: 'agent-3',
          nomeOperatore: 'Luigi',
          cognomeOperatore: 'Bianchi',
          tipoIntervento: 'Assegnazione',
          descrizione: 'Task riassegnato al reparto tecnico',
          dataIntervento: '2025-08-19T15:00:00Z',
        }
      ],
      tags: ['supporto', 'hardware', 'lettore'],
    },
    {
      id: 'task-3',
      numeroTask: 'TSK-003',
      titolo: 'Preventivo personalizzato',
      descrizione: 'Richiesta preventivo per soluzione multi-sede',
      stato: 'Completato',
      priorita: 'Alta',
      cliente: {
        id: 'client-3',
        nome: 'Roberto',
        cognome: 'Viola',
        email: 'r.viola@catenastore.com',
        telefono: '+39 320 1122334',
        citta: 'Roma',
        provincia: 'RM',
        tipoAttivita: 'Retail',
        azienda: 'Catena Store Roma',
      },
      agenteAssegnato: agentiFake[3],
      dataCreazione: '2025-08-15T09:00:00Z',
      dataScadenza: '2025-08-20T17:00:00Z',
      dataChiusura: '2025-08-19T16:30:00Z',
      origine: 'Sito Web',
      categoria: 'Vendita',
      valorePotenziale: 15000,
      interventI: [
        {
          id: 'int-4',
          taskId: 'task-3',
          operatoreId: 'agent-4',
          nomeOperatore: 'Sofia',
          cognomeOperatore: 'Neri',
          tipoIntervento: 'Chiamata',
          descrizione: 'Chiamata per raccolta requisiti dettagliati',
          dataIntervento: '2025-08-15T10:00:00Z',
          durata: 45,
          esitoIntervento: 'Positivo',
        },
        {
          id: 'int-5',
          taskId: 'task-3',
          operatoreId: 'agent-4',
          nomeOperatore: 'Sofia',
          cognomeOperatore: 'Neri',
          tipoIntervento: 'Email',
          descrizione: 'Inviato preventivo personalizzato',
          dataIntervento: '2025-08-18T11:00:00Z',
          esitoIntervento: 'Positivo',
        },
        {
          id: 'int-6',
          taskId: 'task-3',
          operatoreId: 'agent-4',
          nomeOperatore: 'Sofia',
          cognomeOperatore: 'Neri',
          tipoIntervento: 'Cambio Stato',
          descrizione: 'Task completato - preventivo accettato dal cliente',
          dataIntervento: '2025-08-19T16:30:00Z',
          esitoIntervento: 'Positivo',
        }
      ],
      tags: ['preventivo', 'multi-sede', 'retail'],
    },
    {
      id: 'task-4',
      numeroTask: 'TSK-004',
      titolo: 'Reclamo fatturazione',
      descrizione: 'Cliente segnala errore su fattura del mese scorso',
      stato: 'In Attesa',
      priorita: 'Urgente',
      cliente: {
        id: 'client-4',
        nome: 'Maria',
        cognome: 'Russo',
        email: 'm.russo@farmacia.it',
        telefono: '+39 366 7788990',
        citta: 'Napoli',
        provincia: 'NA',
        tipoAttivita: 'Farmacia',
        azienda: 'Farmacia San Giuseppe',
      },
      agenteAssegnato: agentiFake[1],
      dataCreazione: '2025-08-20T08:15:00Z',
      dataScadenza: '2025-08-21T17:00:00Z',
      origine: 'Email',
      categoria: 'Reclamo',
      interventI: [
        {
          id: 'int-7',
          taskId: 'task-4',
          operatoreId: 'agent-2',
          nomeOperatore: 'Anna',
          cognomeOperatore: 'Verdi',
          tipoIntervento: 'Note',
          descrizione: 'Analisi fattura - identificato errore importo servizi aggiuntivi',
          dataIntervento: '2025-08-20T09:00:00Z',
          prossimaAzione: 'Contattare amministrazione per correzione',
        }
      ],
      tags: ['reclamo', 'fatturazione', 'urgente'],
    },
    {
      id: 'task-5',
      numeroTask: 'TSK-005',
      titolo: 'Demo prodotto online',
      descrizione: 'Schedulare demo per nuovo cliente potenziale',
      stato: 'Sospeso',
      priorita: 'Bassa',
      cliente: {
        id: 'client-5',
        nome: 'Francesco',
        cognome: 'Gialli',
        email: 'f.gialli@officina.it',
        telefono: '+39 333 4455667',
        citta: 'Torino',
        provincia: 'TO',
        tipoAttivita: 'Officina meccanica',
        azienda: 'Officina Gialli & Figli',
      },
      dataCreazione: '2025-08-18T16:45:00Z',
      dataScadenza: '2025-08-30T17:00:00Z',
      origine: 'Chat',
      categoria: 'Vendita',
      valorePotenziale: 800,
      interventI: [
        {
          id: 'int-8',
          taskId: 'task-5',
          operatoreId: 'agent-1',
          nomeOperatore: 'Marco',
          cognomeOperatore: 'Rossi',
          tipoIntervento: 'Note',
          descrizione: 'Cliente al momento non disponibile per demo - da ricontattare a settembre',
          dataIntervento: '2025-08-18T17:00:00Z',
          dataProximoContatto: '2025-09-01T09:00:00Z',
        }
      ],
      tags: ['demo', 'prospect', 'settembre'],
    },
  ];

  // ✅ INIZIALIZZAZIONE DATI
  useEffect(() => {
    setAgenti(agentiFake);
    setTasks(tasksFake);
  }, []);

  // ✅ FUNZIONE TOGGLE MENU
  const toggleMenu = () => {
    const newState = menuState === 'open' ? 'closed' : 'open';
    setMenuState(newState);
    localStorage.setItem('menuState', newState);
  };

  // ✅ STATISTICHE TASKS
  const stats = useMemo((): TaskStats => {
    const oggi = new Date();
    const scaduti = tasks.filter(task => {
      if (!task.dataScadenza || task.stato === 'Completato' || task.stato === 'Chiuso') return false;
      return new Date(task.dataScadenza) < oggi;
    }).length;

    const completati = tasks.filter(task => task.stato === 'Completato' || task.stato === 'Chiuso');
    
    // Calcola media giorni risoluzione (solo per task completati)
    const mediaRisoluzione = completati.length > 0 
      ? completati.reduce((acc, task) => {
          if (task.dataChiusura) {
            const giorni = Math.ceil((new Date(task.dataChiusura).getTime() - new Date(task.dataCreazione).getTime()) / (1000 * 60 * 60 * 24));
            return acc + giorni;
          }
          return acc;
        }, 0) / completati.length
      : 0;

    return {
      totaleTask: tasks.length,
      aperti: tasks.filter(t => t.stato === 'Aperto').length,
      inCorso: tasks.filter(t => t.stato === 'In Corso' || t.stato === 'In Attesa').length,
      completati: completati.length,
      scaduti,
      mediaRisoluzione: Math.round(mediaRisoluzione * 10) / 10,
      valoreTotalePotenziale: tasks.reduce((acc, t) => acc + (t.valorePotenziale || 0), 0),
    };
  }, [tasks]);

  // ✅ DATI PER GRAFICO STATI
  const chartData = useMemo(() => {
    const statiCount = tasks.reduce((acc, task) => {
      acc[task.stato] = (acc[task.stato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      'Aperto': '#ffc107',
      'In Corso': '#17a2b8', 
      'In Attesa': '#fd7e14',
      'Completato': '#28a745',
      'Chiuso': '#6c757d',
      'Sospeso': '#dc3545',
    };

    return Object.entries(statiCount).map(([stato, count]) => ({
      name: stato,
      value: count,
      fill: colors[stato as keyof typeof colors] || '#6c757d',
    }));
  }, [tasks]);

  // ✅ FILTRI
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro tab attivo
      if (activeTab === 'aperti' && task.stato !== 'Aperto') return false;
      if (activeTab === 'completati' && !['Completato', 'Chiuso'].includes(task.stato)) return false;
      if (activeTab === 'scaduti') {
        if (['Completato', 'Chiuso'].includes(task.stato)) return false;
        if (!task.dataScadenza) return false;
        if (new Date(task.dataScadenza) >= new Date()) return false;
      }

      // Filtro ricerca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!task.numeroTask.toLowerCase().includes(term) &&
            !task.titolo.toLowerCase().includes(term) &&
            !task.cliente.nome.toLowerCase().includes(term) &&
            !task.cliente.email.toLowerCase().includes(term)) return false;
      }

      // Altri filtri
      if (selectedPriority !== 'tutte' && task.priorita !== selectedPriority) return false;
      if (selectedAgent !== 'tutti' && task.agenteAssegnato?.id !== selectedAgent) return false;
      if (selectedCategory !== 'tutte' && task.categoria !== selectedCategory) return false;
      if (selectedStatus !== 'tutti' && task.stato !== selectedStatus) return false;

      return true;
    });
  }, [tasks, activeTab, searchTerm, selectedPriority, selectedAgent, selectedCategory, selectedStatus]);

  // ✅ PAGINAZIONE
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // ✅ BADGE FUNCTIONS
  const getPriorityBadgeClass = (priorita: string) => {
    switch (priorita) {
      case 'Urgente': return 'badge bg-danger';
      case 'Alta': return 'badge bg-warning text-dark';
      case 'Media': return 'badge bg-info';
      case 'Bassa': return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
    }
  };

  const getStatusBadgeClass = (stato: string) => {
    switch (stato) {
      case 'Aperto': return 'badge bg-warning text-dark';
      case 'In Corso': return 'badge bg-info';
      case 'In Attesa': return 'badge bg-primary';
      case 'Completato': return 'badge bg-success';
      case 'Chiuso': return 'badge bg-secondary';
      case 'Sospeso': return 'badge bg-danger';
      default: return 'badge bg-light text-dark';
    }
  };

  const getCategoryBadgeClass = (categoria: string) => {
    switch (categoria) {
      case 'Vendita': return 'badge bg-success';
      case 'Supporto': return 'badge bg-info';
      case 'Tecnico': return 'badge bg-primary';
      case 'Amministrativo': return 'badge bg-secondary';
      case 'Reclamo': return 'badge bg-danger';
      case 'Informazioni': return 'badge bg-light text-dark';
      default: return 'badge bg-light text-dark';
    }
  };

  // ✅ HELPER FUNCTIONS
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dataScadenza || ['Completato', 'Chiuso'].includes(task.stato)) return false;
    return new Date(task.dataScadenza) < new Date();
  };

  // ✅ AZIONI TASK
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleReassignTask = (task: Task) => {
    setTaskToReassign(task);
    setShowReassignModal(true);
  };

  const saveNewTask = () => {
    // Qui andrà la chiamata API
    console.log('Salvataggio nuovo task:', newTask);
    
    // Per ora aggiungiamo fake data
    const nuovoCliente: Cliente = {
      id: `client-${Date.now()}`,
      nome: newTask.clienteNome,
      cognome: newTask.clienteCognome,
      email: newTask.clienteEmail,
      telefono: newTask.clienteTelefono,
      citta: newTask.clienteCitta,
      provincia: newTask.clienteProvincia,
      azienda: newTask.clienteAzienda,
      tipoAttivita: newTask.clienteTipoAttivita,
    };

    const nuovoTask: Task = {
      id: `task-${Date.now()}`,
      numeroTask: `TSK-${String(tasks.length + 1).padStart(3, '0')}`,
      titolo: newTask.titolo,
      descrizione: newTask.descrizione,
      stato: 'Aperto',
      priorita: newTask.priorita,
      cliente: nuovoCliente,
      agenteAssegnato: agenti.find(a => a.id === newTask.agenteAssegnatoId),
      dataCreazione: new Date().toISOString(),
      dataScadenza: newTask.dataScadenza,
      origine: 'Manuale',
      categoria: newTask.categoria,
      valorePotenziale: newTask.valorePotenziale,
      note: newTask.note,
      interventI: [],
      tags: [],
    };

    setTasks([nuovoTask, ...tasks]);
    setNewTask(defaultNewTask);
    setShowNewTaskForm(false);
    alert('Task creato con successo!');
  };

  // ✅ FUNZIONE PER RIASSEGNARE TASK
  const confirmReassignTask = () => {
    if (!taskToReassign || !newAssigneeId) return;

    const nuovoAgente = agenti.find(a => a.id === newAssigneeId);
    if (!nuovoAgente) return;

    // Aggiorna il task
    const taskAggiornato = {
      ...taskToReassign,
      agenteAssegnato: nuovoAgente,
      dataUltimaModifica: new Date().toISOString(),
    };

    // Aggiungi intervento di riassegnazione
    const interventoRiassegnazione: TaskIntervento = {
      id: `int-${Date.now()}`,
      taskId: taskToReassign.id,
      operatoreId: 'current-user', // Da sostituire con l'utente corrente
      nomeOperatore: 'Sistema',
      cognomeOperatore: 'Admin',
      tipoIntervento: 'Assegnazione',
      descrizione: `Task riassegnato da ${taskToReassign.agenteAssegnato?.nome || 'Non assegnato'} a ${nuovoAgente.nome} ${nuovoAgente.cognome}. Motivo: ${reassignReason}`,
      dataIntervento: new Date().toISOString(),
    };

    taskAggiornato.interventI = [...taskAggiornato.interventI, interventoRiassegnazione];

    // Aggiorna la lista dei task
    setTasks(tasks.map(task => 
      task.id === taskToReassign.id ? taskAggiornato : task
    ));

    // Reset stati
    setShowReassignModal(false);
    setTaskToReassign(null);
    setNewAssigneeId('');
    setReassignReason('');

    // Se il dettaglio è aperto, aggiorna il task selezionato
    if (selectedTask?.id === taskToReassign.id) {
      setSelectedTask(taskAggiornato);
    }

    alert('Task riassegnato con successo!');
  };

  // ✅ FUNZIONE PER CAMBIARE STATO TASK
  const changeTaskStatus = (taskId: string, nuovoStato: Task['stato']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskAggiornato = {
      ...task,
      stato: nuovoStato,
      dataUltimaModifica: new Date().toISOString(),
      ...(nuovoStato === 'Completato' || nuovoStato === 'Chiuso' ? { dataChiusura: new Date().toISOString() } : {}),
    };

    // Aggiungi intervento di cambio stato
    const interventoCambioStato: TaskIntervento = {
      id: `int-${Date.now()}`,
      taskId: taskId,
      operatoreId: 'current-user', // Da sostituire con l'utente corrente
      nomeOperatore: 'Sistema',
      cognomeOperatore: 'Admin',
      tipoIntervento: 'Cambio Stato',
      descrizione: `Stato cambiato da ${task.stato} a ${nuovoStato}`,
      dataIntervento: new Date().toISOString(),
    };

    taskAggiornato.interventI = [...taskAggiornato.interventI, interventoCambioStato];

    // Aggiorna la lista dei task
    setTasks(tasks.map(t => t.id === taskId ? taskAggiornato : t));

    // Se il dettaglio è aperto, aggiorna il task selezionato
    if (selectedTask?.id === taskId) {
      setSelectedTask(taskAggiornato);
    }

    alert(`Stato del task cambiato in: ${nuovoStato}`);
  };

  // ✅ FUNZIONE PER SALVARE NUOVO INTERVENTO
  const saveIntervention = () => {
    if (!newIntervention.descrizione.trim()) {
      alert('La descrizione dell\'intervento è obbligatoria');
      return;
    }

    if (!selectedTask) {
      alert('Nessun task selezionato');
      return;
    }

    // Crea il nuovo intervento
    const nuovoIntervento: TaskIntervento = {
      ...newIntervention,
      id: `int-${Date.now()}`,
      taskId: selectedTask.id,
      dataIntervento: new Date().toISOString(),
    };

    // Aggiorna il task con il nuovo intervento
    const taskAggiornato = {
      ...selectedTask,
      interventI: [...selectedTask.interventI, nuovoIntervento],
      dataUltimaModifica: new Date().toISOString(),
    };

    // Aggiorna la lista dei task
    setTasks(tasks.map(task => 
      task.id === selectedTask.id ? taskAggiornato : task
    ));

    // Aggiorna il task selezionato
    setSelectedTask(taskAggiornato);

    // Reset form
    setNewIntervention(defaultNewIntervention);
    setShowAddInterventionModal(false);

    alert('Intervento aggiunto con successo!');
  };

  const addTaskIntervention = (taskId: string, intervention: Omit<TaskIntervento, 'id' | 'taskId'>) => {
    const nuovoIntervento: TaskIntervento = {
      ...intervention,
      id: `int-${Date.now()}`,
      taskId,
    };

    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, interventI: [...task.interventI, nuovoIntervento] }
        : task
    ));
  };

  return (
    <div className={`d-flex ${menuState === 'closed' ? 'menu-closed' : ''} task-management-page`} id="wrapper">
      <Sidebar menuState={menuState} toggleMenu={toggleMenu} />

      <div id="page-content-wrapper">
        <Topbar toggleMenu={toggleMenu} />

        <div className="container-fluid">
          <div><p /><p /></div>

          {/* ✅ HEADER CON BREADCRUMB */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <button
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => navigate('/dashboard')}
                    >
                      <i className="fa-solid fa-home me-1"></i>
                      Dashboard
                    </button>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Gestione Task
                  </li>
                </ol>
              </nav>
              <h2 className="task-management-title">
                <i className="fa-solid fa-tasks me-2"></i>
                Gestione Task - Centro Assistenza
              </h2>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary-dark"
                onClick={() => {
                  setNewTask(defaultNewTask);
                  setShowNewTaskForm(true);
                  
                  // ✅ SCROLL AUTOMATICO E FOCUS CON EVIDENZIAZIONE
                  setTimeout(() => {
                    const formElement = document.getElementById('form-nuovo-task') as HTMLElement;
                    const firstInput = document.getElementById('titolo-task') as HTMLInputElement;
                    
                    if (formElement) {
                      // Scroll smooth al form
                      formElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });

                      // Evidenziazione temporanea con alone giallo
                      formElement.classList.add('border-warning');
                      formElement.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
                      formElement.style.borderWidth = '2px';

                      // Focus sul primo campo dopo lo scroll
                      setTimeout(() => {
                        if (firstInput) {
                          firstInput.focus();
                        }
                      }, 500);

                      // Rimuove l'evidenziazione dopo 3 secondi
                      setTimeout(() => {
                        formElement.classList.remove('border-warning');
                        formElement.style.boxShadow = '';
                        formElement.style.borderWidth = '';
                      }, 3000);
                    }
                  }, 100);
                }}
              >
                <i className="fa-solid fa-plus me-1"></i>
                Nuovo Task
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

          {/* ✅ STATISTICHE E GRAFICO */}
          <div className="row mb-4">
            <div className="col-xl-8 mb-3">
              <div className="card h-100">
                <div className="custom-card-header">
                  <span>Distribuzione Task per Stato</span>
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="card-body">
                  <div className="row h-100">
                    <div className="col-md-8">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={140}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="#fff"
                            strokeWidth={3}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="col-md-4">
                      <div className="h-100 d-flex flex-column justify-content-center">
                        <div className="text-center mb-4">
                          <h1 className="display-4 text-primary mb-2">
                            {stats.totaleTask}
                          </h1>
                          <h5 className="text-muted">Task Totali</h5>
                        </div>
                        <div className="d-grid gap-2">
                          {chartData.map((item, index) => (
                            <div key={index} className="d-flex justify-content-between align-items-center p-2 border rounded">
                              <span style={{ color: item.fill }} className="fw-bold">
                                <i className="fa-solid fa-circle me-2" style={{ fontSize: '0.6rem' }}></i>
                                {item.name}
                              </span>
                              <span className="badge" style={{ backgroundColor: item.fill, color: 'white' }}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4 mb-3">
              <div className="row h-100">
                <div className="col-6 mb-3">
                  <div className="card bg-warning text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.aperti}</h3>
                      <small>Aperti</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-info text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.inCorso}</h3>
                      <small>In Lavorazione</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-success text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.completati}</h3>
                      <small>Completati</small>
                    </div>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="card bg-danger text-white h-100">
                    <div className="card-body text-center p-3">
                      <h3 className="mb-1">{stats.scaduti}</h3>
                      <small>Scaduti</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ FILTRI E RICERCA */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Filtri e Ricerca</span>
                  <i className="fa-solid fa-filter"></i>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <ul className="nav nav-pills">
                        <li className="nav-item">
                          <button
                            className={`nav-link ${activeTab === 'tutti' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('tutti'); setCurrentPage(1); }}
                          >
                            Tutti ({tasks.length})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${activeTab === 'aperti' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('aperti'); setCurrentPage(1); }}
                          >
                            Aperti ({stats.aperti})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${activeTab === 'completati' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('completati'); setCurrentPage(1); }}
                          >
                            Completati ({stats.completati})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link ${activeTab === 'scaduti' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('scaduti'); setCurrentPage(1); }}
                          >
                            Scaduti ({stats.scaduti})
                          </button>
                        </li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cerca per numero task, titolo, cliente..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedPriority}
                        onChange={(e) => { setSelectedPriority(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="tutte">Tutte le priorità</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Bassa">Bassa</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedAgent}
                        onChange={(e) => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="tutti">Tutti gli agenti</option>
                        {agenti.map(agente => (
                          <option key={agente.id} value={agente.id}>
                            {agente.nome} {agente.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedCategory}
                        onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="tutte">Tutte le categorie</option>
                        <option value="Vendita">Vendita</option>
                        <option value="Supporto">Supporto</option>
                        <option value="Tecnico">Tecnico</option>
                        <option value="Amministrativo">Amministrativo</option>
                        <option value="Reclamo">Reclamo</option>
                        <option value="Informazioni">Informazioni</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="tutti">Tutti gli stati</option>
                        <option value="Aperto">Aperto</option>
                        <option value="In Corso">In Corso</option>
                        <option value="In Attesa">In Attesa</option>
                        <option value="Completato">Completato</option>
                        <option value="Chiuso">Chiuso</option>
                        <option value="Sospeso">Sospeso</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ LISTA TASK */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Task ({filteredTasks.length} risultati)</span>
                  <div className="menu-right">
                    <div className="menu-icon">
                      <i className="fa-solid fa-list"></i>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {paginatedTasks.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Cliente</th>
                              <th>Priorità</th>
                              <th>Stato</th>
                              <th>Categoria</th>
                              <th>Assegnato a</th>
                              <th>Scadenza</th>
                              <th>Valore</th>
                              <th>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTasks.map(task => (
                              <tr key={task.id} className={isTaskOverdue(task) ? 'table-danger' : ''}>
                                <td>
                                  <div>
                                    <div className="fw-bold text-primary">
                                      {task.numeroTask}
                                    </div>
                                    <div className="small text-truncate" style={{ maxWidth: '200px' }}>
                                      {task.titolo}
                                    </div>
                                    <div className="small text-muted">
                                      {formatDate(task.dataCreazione)}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div className="fw-bold">
                                      {task.cliente.nome} {task.cliente.cognome}
                                    </div>
                                    <div className="small text-muted">
                                      {task.cliente.email}
                                    </div>
                                    <div className="small text-muted">
                                      {task.cliente.telefono}
                                    </div>
                                    {task.cliente.azienda && (
                                      <div className="small text-primary">
                                        {task.cliente.azienda}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={getPriorityBadgeClass(task.priorita)}>
                                    {task.priorita}
                                  </span>
                                </td>
                                <td>
                                  <span className={getStatusBadgeClass(task.stato)}>
                                    {task.stato}
                                  </span>
                                </td>
                                <td>
                                  <span className={getCategoryBadgeClass(task.categoria)}>
                                    {task.categoria}
                                  </span>
                                </td>
                                <td>
                                  {task.agenteAssegnato ? (
                                    <div>
                                      <div className="fw-bold">
                                        {task.agenteAssegnato.nome} {task.agenteAssegnato.cognome}
                                      </div>
                                      <div className="small text-muted">
                                        {task.agenteAssegnato.reparto}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted">Non assegnato</span>
                                  )}
                                </td>
                                <td>
                                  {task.dataScadenza ? (
                                    <div className={isTaskOverdue(task) ? 'text-danger fw-bold' : ''}>
                                      {formatDate(task.dataScadenza)}
                                      {isTaskOverdue(task) && (
                                        <div className="small">
                                          <i className="fa-solid fa-exclamation-triangle me-1"></i>
                                          SCADUTO
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">Nessuna</span>
                                  )}
                                </td>
                                <td>
                                  {task.valorePotenziale ? (
                                    <span className="fw-bold text-success">
                                      €{task.valorePotenziale.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => handleTaskClick(task)}
                                      title="Visualizza dettagli"
                                    >
                                      <i className="fa-solid fa-eye"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-secondary btn-sm"
                                      onClick={() => handleReassignTask(task)}
                                      title="Riassegna task"
                                    >
                                      <i className="fa-solid fa-user-check"></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-info btn-sm"
                                      title="Aggiungi intervento"
                                    >
                                      <i className="fa-solid fa-plus"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* ✅ PAGINAZIONE */}
                      {totalPages > 1 && (
                        <nav className="mt-3">
                          <ul className="pagination justify-content-center">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                <i className="fa-solid fa-chevron-left"></i>
                              </button>
                            </li>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                              return (
                                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setCurrentPage(pageNum)}
                                  >
                                    {pageNum}
                                  </button>
                                </li>
                              );
                            })}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                              >
                                <i className="fa-solid fa-chevron-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-search fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">Nessun task trovato</h5>
                      <p className="text-muted">
                        Nessun task corrisponde ai filtri selezionati.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ FORM NUOVO TASK */}
          {showNewTaskForm && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card" id="form-nuovo-task">
                  <div className="custom-card-header">
                    <span>Nuovo Task</span>
                    <i className="fa-solid fa-plus"></i>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Titolo *</label>
                        <input
                          id="titolo-task"
                          type="text"
                          className="form-control"
                          value={newTask.titolo}
                          onChange={(e) => setNewTask({...newTask, titolo: e.target.value})}
                          placeholder="Inserisci il titolo del task..."
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Priorità</label>
                        <select
                          className="form-select"
                          value={newTask.priorita}
                          onChange={(e) => setNewTask({...newTask, priorita: e.target.value as any})}
                        >
                          <option value="Bassa">Bassa</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Categoria</label>
                        <select
                          className="form-select"
                          value={newTask.categoria}
                          onChange={(e) => setNewTask({...newTask, categoria: e.target.value as any})}
                        >
                          <option value="Vendita">Vendita</option>
                          <option value="Supporto">Supporto</option>
                          <option value="Tecnico">Tecnico</option>
                          <option value="Amministrativo">Amministrativo</option>
                          <option value="Reclamo">Reclamo</option>
                          <option value="Informazioni">Informazioni</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descrizione</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={newTask.descrizione}
                          onChange={(e) => setNewTask({...newTask, descrizione: e.target.value})}
                        ></textarea>
                      </div>
                      
                      <div className="col-12"><hr /></div>
                      <div className="col-12"><h6>Dati Cliente</h6></div>
                      
                      <div className="col-md-4">
                        <label className="form-label">Nome *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteNome}
                          onChange={(e) => setNewTask({...newTask, clienteNome: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Cognome</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteCognome}
                          onChange={(e) => setNewTask({...newTask, clienteCognome: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newTask.clienteEmail}
                          onChange={(e) => setNewTask({...newTask, clienteEmail: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Telefono</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={newTask.clienteTelefono}
                          onChange={(e) => setNewTask({...newTask, clienteTelefono: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Azienda</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteAzienda}
                          onChange={(e) => setNewTask({...newTask, clienteAzienda: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Tipo Attività</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newTask.clienteTipoAttivita}
                          onChange={(e) => setNewTask({...newTask, clienteTipoAttivita: e.target.value})}
                        />
                      </div>
                      
                      <div className="col-12"><hr /></div>
                      
                      <div className="col-md-4">
                        <label className="form-label">Assegna a</label>
                        <select
                          className="form-select"
                          value={newTask.agenteAssegnatoId}
                          onChange={(e) => setNewTask({...newTask, agenteAssegnatoId: e.target.value})}
                        >
                          <option value="">Non assegnato</option>
                          {agenti.map(agente => (
                            <option key={agente.id} value={agente.id}>
                              {agente.nome} {agente.cognome} - {agente.reparto}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Data Scadenza</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={newTask.dataScadenza}
                          onChange={(e) => setNewTask({...newTask, dataScadenza: e.target.value})}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Valore Potenziale (€)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newTask.valorePotenziale || ''}
                          onChange={(e) => setNewTask({...newTask, valorePotenziale: e.target.value ? parseFloat(e.target.value) : undefined})}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Note</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={newTask.note}
                          onChange={(e) => setNewTask({...newTask, note: e.target.value})}
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <button
                        className="btn btn-success me-2"
                        onClick={saveNewTask}
                      >
                        <i className="fa-solid fa-save me-1"></i>
                        Salva Task
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowNewTaskForm(false);
                          setNewTask(defaultNewTask);
                        }}
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

          {/* ✅ DETTAGLIO TASK MODAL */}
          {showTaskDetail && selectedTask && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-tasks me-2"></i>
                      {selectedTask.numeroTask} - {selectedTask.titolo}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowTaskDetail(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6>Informazioni Task</h6>
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Stato:</strong></td>
                              <td><span className={getStatusBadgeClass(selectedTask.stato)}>{selectedTask.stato}</span></td>
                            </tr>
                            <tr>
                              <td><strong>Priorità:</strong></td>
                              <td><span className={getPriorityBadgeClass(selectedTask.priorita)}>{selectedTask.priorita}</span></td>
                            </tr>
                            <tr>
                              <td><strong>Categoria:</strong></td>
                              <td><span className={getCategoryBadgeClass(selectedTask.categoria)}>{selectedTask.categoria}</span></td>
                            </tr>
                            <tr>
                              <td><strong>Origine:</strong></td>
                              <td>{selectedTask.origine}</td>
                            </tr>
                            <tr>
                              <td><strong>Creato:</strong></td>
                              <td>{formatDate(selectedTask.dataCreazione)}</td>
                            </tr>
                            <tr>
                              <td><strong>Scadenza:</strong></td>
                              <td>{selectedTask.dataScadenza ? formatDate(selectedTask.dataScadenza) : 'Nessuna'}</td>
                            </tr>
                            <tr>
                              <td><strong>Valore:</strong></td>
                              <td>{selectedTask.valorePotenziale ? `€${selectedTask.valorePotenziale.toLocaleString()}` : '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-md-6">
                        <h6>Dati Cliente</h6>
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Nome:</strong></td>
                              <td>{selectedTask.cliente.nome} {selectedTask.cliente.cognome}</td>
                            </tr>
                            <tr>
                              <td><strong>Email:</strong></td>
                              <td><a href={`mailto:${selectedTask.cliente.email}`}>{selectedTask.cliente.email}</a></td>
                            </tr>
                            <tr>
                              <td><strong>Telefono:</strong></td>
                              <td>{selectedTask.cliente.telefono ? <a href={`tel:${selectedTask.cliente.telefono}`}>{selectedTask.cliente.telefono}</a> : '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Azienda:</strong></td>
                              <td>{selectedTask.cliente.azienda || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Attività:</strong></td>
                              <td>{selectedTask.cliente.tipoAttivita || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Città:</strong></td>
                              <td>{selectedTask.cliente.citta} ({selectedTask.cliente.provincia})</td>
                            </tr>
                            <tr>
                              <td><strong>Assegnato a:</strong></td>
                              <td>{selectedTask.agenteAssegnato ? `${selectedTask.agenteAssegnato.nome} ${selectedTask.agenteAssegnato.cognome}` : 'Non assegnato'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="row mt-3">
                      <div className="col-12">
                        <h6>Descrizione</h6>
                        <p>{selectedTask.descrizione}</p>
                        {selectedTask.note && (
                          <>
                            <h6>Note</h6>
                            <p>{selectedTask.note}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="row mt-3">
                      <div className="col-12">
                        <h6>Cronologia Interventi ({selectedTask.interventI.length})</h6>
                        {selectedTask.interventI.length > 0 ? (
                          <div className="timeline">
                            {selectedTask.interventI.map((intervento, index) => (
                              <div key={intervento.id} className="timeline-item mb-3">
                                <div className="card">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <strong>{intervento.nomeOperatore} {intervento.cognomeOperatore}</strong>
                                        <span className="badge bg-info ms-2">{intervento.tipoIntervento}</span>
                                        {intervento.esitoIntervento && (
                                          <span className={`badge ms-1 ${
                                            intervento.esitoIntervento === 'Positivo' ? 'bg-success' :
                                            intervento.esitoIntervento === 'Negativo' ? 'bg-danger' :
                                            intervento.esitoIntervento === 'Da Ricontattare' ? 'bg-warning' : 'bg-secondary'
                                          }`}>
                                            {intervento.esitoIntervento}
                                          </span>
                                        )}
                                      </div>
                                      <small className="text-muted">{formatDate(intervento.dataIntervento)}</small>
                                    </div>
                                    <p className="mt-2 mb-1">{intervento.descrizione}</p>
                                    {intervento.durata && (
                                      <small className="text-muted">Durata: {intervento.durata} minuti</small>
                                    )}
                                    {intervento.prossimaAzione && (
                                      <div className="mt-2">
                                        <strong>Prossima azione:</strong> {intervento.prossimaAzione}
                                        {intervento.dataProximoContatto && (
                                          <span className="text-primary"> - {formatDate(intervento.dataProximoContatto)}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted">Nessun intervento registrato.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      className="btn btn-success" 
                      onClick={() => {
                        setShowAddInterventionModal(true);
                        setNewIntervention({
                          ...defaultNewIntervention,
                          taskId: selectedTask.id,
                          operatoreId: 'agent-1', // Operatore corrente - da sostituire con user attuale
                          nomeOperatore: 'Marco',
                          cognomeOperatore: 'Rossi',
                        });
                      }}
                      title="Aggiungi intervento"
                    >
                      <i className="fa-solid fa-plus me-1"></i>
                      Aggiungi Intervento
                    </button>
                    <button 
                      className="btn btn-warning me-2"
                      onClick={() => changeTaskStatus(selectedTask.id, 'In Corso')}
                      disabled={selectedTask.stato === 'In Corso'}
                    >
                      <i className="fa-solid fa-play me-1"></i>
                      Prendi in Carico
                    </button>
                    <button 
                      className="btn btn-info" 
                      onClick={() => {
                        setShowTaskDetail(false);
                        handleReassignTask(selectedTask);
                      }}
                    >
                      <i className="fa-solid fa-user-check me-1"></i>
                      Riassegna
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowTaskDetail(false)}
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ MODAL RIASSEGNAZIONE TASK */}
          {showReassignModal && taskToReassign && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-user-check me-2"></i>
                      Riassegna Task
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowReassignModal(false);
                        setTaskToReassign(null);
                        setNewAssigneeId('');
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p><strong>Task:</strong> {taskToReassign.numeroTask} - {taskToReassign.titolo}</p>
                    <p><strong>Attualmente assegnato a:</strong> {
                      taskToReassign.agenteAssegnato 
                        ? `${taskToReassign.agenteAssegnato.nome} ${taskToReassign.agenteAssegnato.cognome}`
                        : 'Non assegnato'
                    }</p>
                    
                    <div className="mb-3">
                      <label className="form-label">Nuovo assegnatario</label>
                      <select
                        className="form-select"
                        value={newAssigneeId}
                        onChange={(e) => setNewAssigneeId(e.target.value)}
                      >
                        <option value="">Non assegnato</option>
                        {agenti.filter(a => a.id !== taskToReassign.agenteAssegnato?.id).map(agente => (
                          <option key={agente.id} value={agente.id}>
                            {agente.nome} {agente.cognome} - {agente.reparto}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Motivo riassegnazione</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                        placeholder="Descrivi il motivo della riassegnazione..."
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      className="btn btn-primary" 
                      onClick={confirmReassignTask}
                      disabled={!newAssigneeId}
                    >
                      <i className="fa-solid fa-check me-1"></i>
                      Conferma Riassegnazione
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowReassignModal(false);
                        setTaskToReassign(null);
                        setNewAssigneeId('');
                        setReassignReason('');
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ MODAL AGGIUNGI INTERVENTO */}
          {showAddInterventionModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fa-solid fa-plus me-2"></i>
                      Aggiungi Intervento
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowAddInterventionModal(false);
                        setNewIntervention(defaultNewIntervention);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Tipo Intervento</label>
                        <select
                          className="form-select"
                          value={newIntervention.tipoIntervento}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            tipoIntervento: e.target.value as any
                          })}
                        >
                          <option value="Chiamata">Chiamata</option>
                          <option value="Email">Email</option>
                          <option value="Note">Note</option>
                          <option value="Assegnazione">Assegnazione</option>
                          <option value="Cambio Stato">Cambio Stato</option>
                          <option value="Altro">Altro</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Esito</label>
                        <select
                          className="form-select"
                          value={newIntervention.esitoIntervento || ''}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            esitoIntervento: e.target.value as any || undefined
                          })}
                        >
                          <option value="">Seleziona esito</option>
                          <option value="Positivo">Positivo</option>
                          <option value="Negativo">Negativo</option>
                          <option value="Neutrale">Neutrale</option>
                          <option value="Da Ricontattare">Da Ricontattare</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Durata (minuti)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newIntervention.durata || ''}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            durata: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Data Prossimo Contatto</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={newIntervention.dataProximoContatto || ''}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            dataProximoContatto: e.target.value || undefined
                          })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descrizione Intervento *</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={newIntervention.descrizione}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            descrizione: e.target.value
                          })}
                          placeholder="Descrivi cosa è stato fatto durante l'intervento..."
                        ></textarea>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Prossima Azione</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newIntervention.prossimaAzione || ''}
                          onChange={(e) => setNewIntervention({
                            ...newIntervention,
                            prossimaAzione: e.target.value || undefined
                          })}
                          placeholder="Cosa va fatto successivamente..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      className="btn btn-success" 
                      onClick={saveIntervention}
                      disabled={!newIntervention.descrizione.trim()}
                    >
                      <i className="fa-solid fa-save me-1"></i>
                      Salva Intervento
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowAddInterventionModal(false);
                        setNewIntervention(defaultNewIntervention);
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div><p /><p /></div>
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;