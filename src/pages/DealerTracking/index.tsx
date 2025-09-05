import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./dealer-tracking.css";
import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";

// Mapping delle province italiane con nomi completi
const PROVINCE_NAMES: { [key: string]: string } = {
  AG: "Agrigento",
  AL: "Alessandria",
  AN: "Ancona",
  AO: "Aosta",
  AR: "Arezzo",
  AP: "Ascoli Piceno",
  AT: "Asti",
  AV: "Avellino",
  BA: "Bari",
  BT: "Barletta-Andria-Trani",
  BL: "Belluno",
  BN: "Benevento",
  BG: "Bergamo",
  BI: "Biella",
  BO: "Bologna",
  BZ: "Bolzano",
  BS: "Brescia",
  BR: "Brindisi",
  CA: "Cagliari",
  CL: "Caltanissetta",
  CB: "Campobasso",
  CI: "Carbonia-Iglesias",
  CE: "Caserta",
  CT: "Catania",
  CZ: "Catanzaro",
  CH: "Chieti",
  CO: "Como",
  CS: "Cosenza",
  CR: "Cremona",
  KR: "Crotone",
  CN: "Cuneo",
  EN: "Enna",
  FM: "Fermo",
  FE: "Ferrara",
  FI: "Firenze",
  FG: "Foggia",
  FC: "Forlì-Cesena",
  FR: "Frosinone",
  GE: "Genova",
  GO: "Gorizia",
  GR: "Grosseto",
  IM: "Imperia",
  IS: "Isernia",
  SP: "La Spezia",
  AQ: "L'Aquila",
  LT: "Latina",
  LE: "Lecce",
  LC: "Lecco",
  LI: "Livorno",
  LO: "Lodi",
  LU: "Lucca",
  MC: "Macerata",
  MN: "Mantova",
  MS: "Massa-Carrara",
  MT: "Matera",
  VS: "Medio Campidano",
  ME: "Messina",
  MI: "Milano",
  MO: "Modena",
  MB: "Monza e Brianza",
  NA: "Napoli",
  NO: "Novara",
  NU: "Nuoro",
  OG: "Ogliastra",
  OT: "Olbia-Tempio",
  OR: "Oristano",
  PD: "Padova",
  PA: "Palermo",
  PR: "Parma",
  PV: "Pavia",
  PG: "Perugia",
  PU: "Pesaro e Urbino",
  PE: "Pescara",
  PC: "Piacenza",
  PI: "Pisa",
  PT: "Pistoia",
  PN: "Pordenone",
  PZ: "Potenza",
  PO: "Prato",
  RG: "Ragusa",
  RA: "Ravenna",
  RC: "Reggio Calabria",
  RE: "Reggio Emilia",
  RI: "Rieti",
  RN: "Rimini",
  RM: "Roma",
  RO: "Rovigo",
  SA: "Salerno",
  SS: "Sassari",
  SV: "Savona",
  SI: "Siena",
  SR: "Siracusa",
  SO: "Sondrio",
  TA: "Taranto",
  TE: "Teramo",
  TR: "Terni",
  TO: "Torino",
  TP: "Trapani",
  TN: "Trento",
  TV: "Treviso",
  TS: "Trieste",
  UD: "Udine",
  VA: "Varese",
  VE: "Venezia",
  VB: "Verbano-Cusio-Ossola",
  VC: "Vercelli",
  VR: "Verona",
  VV: "Vibo Valentia",
  VI: "Vicenza",
  VT: "Viterbo",
};

// --- Regioni canoniche (per la DpList) ---
const CANONICAL_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
] as const;

// Alias comuni -> forma canonica
const REGION_ALIASES: Record<string, string> = {
  "EMILIA ROMAGNA": "Emilia-Romagna",
  "FRIULI VENEZIA GIULIA": "Friuli Venezia Giulia",
  "FRIULI VENEZIA-GIULIA": "Friuli Venezia Giulia",
  "TRENTINO ALTO ADIGE": "Trentino-Alto Adige",
  "TRENTINO ALTO ADIGE SUDTIROL": "Trentino-Alto Adige",
  "VALLE D AOSTA": "Valle d'Aosta",
  "VALLE D OSTA": "Valle d'Aosta",
  "VALLE DA OSTA": "Valle d'Aosta",
  "VALLE D  AOSTA": "Valle d'Aosta",
};

// Normalizza stringhe: toglie accenti/punteggiatura e porta a UPPER
const normalizeRegionKey = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove diacritici
    .replace(/[^A-Za-z]+/g, " ") // solo lettere
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

// Converte qualunque input BE in una regione canonica (o null se sconosciuta)
const toCanonicalRegion = (input?: string | null): string | null => {
  const key = normalizeRegionKey(input ?? "");
  if (!key) return null;
  if (REGION_ALIASES[key]) return REGION_ALIASES[key];
  const hit = CANONICAL_REGIONS.find((r) => normalizeRegionKey(r) === key);
  return hit ?? null;
};

// Aggiorna solo i dealer passati, mantenendo intatto il dataset completo
const mergeDealerData = (prev: MarkerData[], updates: MarkerData[]) => {
  const map = new Map(prev.map((d) => [d.userId, d]));
  for (const u of updates) {
    const ex = map.get(u.userId) || u;
    map.set(u.userId, { ...ex, ...u }); // merge per userId
  }
  return Array.from(map.values());
};

// Interfacce per i dati API - AGGIORNATE
interface DealerDetail {
  accID: number;
  userId: string; // Codice dealer
  nome: string; // Ragione sociale
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
}

interface DealerDetailResponse {
  success: boolean;
  message: string;
  data: {
    totali: {
      conTransazioni: number;
      senzaTransazioni: number;
    };
    dealers: DealerDetail[];
  };
  errors: unknown[];
}

interface MarkerData extends DealerDetail {
  lat: number;
  lng: number;
  geocoded: boolean;
  fromCache: boolean; // NUOVO: indica se viene dal cache DB
}

// Nuove interfacce per le API di geolocalizzazione
interface DealerGeolocationDto {
  id: number;
  dealerCode: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  geocodedDate: string;
  quality: string;
  hasValidCoordinates: boolean;
}

interface BatchGeolocationCheckResultDto {
  totalChecked: number;
  alreadyGeolocated: number;
  needGeolocation: number;
  dealersStatus: Array<{
    dealerCode: string;
    isGeolocated: boolean;
    quality: string;
    needsUpdate: boolean;
  }>;
}

interface BatchGeolocationResultDto {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: string[];
}

// Estendi l'interfaccia Window per Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const DealerTracking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Modalità test geolocalizzazione
  const GEO_TEST_MODE = false;
  const GEO_TEST_LIMIT = 300;

  // Stato per avviare/fermare manualmente la geocodifica
  const [isCensusRunning, setIsCensusRunning] = useState(false);
  const censusAbortRef = useRef(false);
  // Filtro regione per il censimento
  const [selectedRegione, setSelectedRegione] = useState<string>("");

  // Parametri URL
  const annoFromUrl = parseInt(
    searchParams.get("anno") || new Date().getFullYear().toString()
  );
  const [selectedYear, setSelectedYear] = useState<number>(annoFromUrl);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Stati per i dati
  const [dealerData, setDealerData] = useState<MarkerData[]>([]);
  const [isLoadingDealer, setIsLoadingDealer] = useState<boolean>(false);
  const [errorDealer, setErrorDealer] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{
    current: number;
    total: number;
    isActive: boolean;
    fromCache: number;
    newGeocoded: number;
  }>({ current: 0, total: 0, isActive: false, fromCache: 0, newGeocoded: 0 });

  // Filtri - AGGIORNATI
  const [activeTab, setActiveTab] = useState<"all" | "transanti" | "inattivi">(
    "all"
  );
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL;
  const GOOGLE_MAPS_API_KEY = "AIzaSyBdIcimFZ-qXj-7YzYX0kbCGGxIpAnOA0I";

  // Carica lo stato del menu dal localStorage
  useEffect(() => {
    const savedMenuState = localStorage.getItem("menuState");
    if (savedMenuState === "closed") {
      setMenuState("closed");
    }
  }, []);

  useEffect(() => {
    const ready = () => !!window.google && !!window.google.maps;

    if (ready()) {
      setMapLoaded(true);
      return;
    }

    const scriptId = "gmaps-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly&callback=initMap`;
      script.async = true;
      script.defer = true;

      window.initMap = () => setMapLoaded(true);

      script.onerror = () => {
        console.error("Google Maps JS API non caricata (API key/referer?)");
      };

      document.head.appendChild(script);
    } else {
      const int = setInterval(() => {
        if (ready()) {
          clearInterval(int);
          setMapLoaded(true);
        }
      }, 100);
      setTimeout(() => clearInterval(int), 10000);
    }
  }, []);

  // Inizializza la mappa quando è caricata
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      initializeMap();
    }
  }, [mapLoaded]);

  // Carica i dati quando cambiano i parametri
  useEffect(() => {
    //fetchDealerData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Aggiorna i marker quando cambiano i dati o i filtri - AGGIORNATO
  useEffect(() => {
    if (mapInstance.current && dealerData.length > 0) {
      updateMapMarkers();
    }
  }, [dealerData, activeTab, selectedProvincia, selectedRegione]);

  const startCensus = async () => {
    if (isCensusRunning) return;

    // Regione obbligatoria
    if (!selectedRegione) {
      // Button sarà disabilitato, ma metto anche una guardia per invocazioni programmatiche
      window.alert("Seleziona prima una Regione per avviare il censimento.");
      return;
    }

    const toCensus = getDealersForCensus();
    if (toCensus.length === 0) {
      window.alert("Nessun dealer da censire per la regione selezionata.");
      return;
    }

    censusAbortRef.current = false;
    setIsCensusRunning(true);
    try {
      await loadDealersGeolocation(toCensus);
    } finally {
      setIsCensusRunning(false);
    }
  };

  const cancelCensus = () => {
    censusAbortRef.current = true;
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const mapOptions = {
      zoom: 6,
      center: { lat: 41.9028, lng: 12.4964 }, // Centro Italia
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "all",
          elementType: "geometry.fill",
          stylers: [{ weight: "2.00" }],
        },
        {
          featureType: "all",
          elementType: "geometry.stroke",
          stylers: [{ color: "#9c9c9c" }],
        },
        {
          featureType: "all",
          elementType: "labels.text",
          stylers: [{ visibility: "on" }],
        },
      ],
    };

    mapInstance.current = new window.google.maps.Map(
      mapRef.current,
      mapOptions
    );
  };

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
        const dealersWithGeocode: MarkerData[] = data.data.dealers.map(
          (dealer) => ({
            ...dealer,
            lat: 0,
            lng: 0,
            geocoded: false,
            fromCache: false,
          })
        );

        setDealerData(dealersWithGeocode);

        if (dealersWithGeocode.length > 0) {
          // await loadDealersGeolocation(dealersWithGeocode);
        }
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

  const loadDealersGeolocation = async (dealers: MarkerData[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Abort rapido se annullato prima di partire
    if (censusAbortRef.current) {
      setGeocodingProgress((p) => ({ ...p, isActive: false }));
      return;
    }

    // In test prendo solo i primi N
    const toProcess = GEO_TEST_MODE
      ? dealers.slice(0, GEO_TEST_LIMIT)
      : dealers;

    setGeocodingProgress({
      current: 0,
      total: toProcess.length,
      isActive: true,
      fromCache: 0,
      newGeocoded: 0,
    });

    try {
      // Guardia: se annullato prima della chiamata di check
      if (censusAbortRef.current) {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
        return;
      }

      // 1) Verifica quali dealer sono già geolocalizzati
      const dealerCodes = toProcess.map((d) => d.userId);
      const checkResponse = await fetch(
        `${API_URL}/api/Dealer/geolocation/check`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ dealerCodes }),
        }
      );

      if (!checkResponse.ok) {
        throw new Error("Errore nella verifica delle geolocalizzazioni");
      }

      const checkResult: {
        success: boolean;
        data: BatchGeolocationCheckResultDto;
      } = await checkResponse.json();
      const dealersStatus = checkResult.data.dealersStatus;

      // 2) Mappa i dealer già geolocalizzati dal cache
      const updatedDealers: MarkerData[] = [];
      const needGeocodingCodes: string[] = [];

      for (const dealer of toProcess) {
        // ⬅️ Guardia nel ciclo: se annullato, fermo il flusso
        if (censusAbortRef.current) {
          setGeocodingProgress((p) => ({ ...p, isActive: false }));
          break;
        }

        const status = dealersStatus.find(
          (s) => s.dealerCode === dealer.userId
        );

        if (status?.isGeolocated && !status.needsUpdate) {
          // Recupera le coordinate dal cache
          try {
            const geoResponse = await fetch(
              `${API_URL}/api/Dealer/${dealer.userId}/geolocation`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (geoResponse.ok) {
              const geoData: { success: boolean; data: DealerGeolocationDto } =
                await geoResponse.json();

              updatedDealers.push({
                ...dealer,
                lat: geoData.data.latitude ?? 0,
                lng: geoData.data.longitude ?? 0,
                geocoded: geoData.data.hasValidCoordinates,
                fromCache: true,
              });

              setGeocodingProgress((prev) => ({
                ...prev,
                current: prev.current + 1,
                fromCache: prev.fromCache + 1,
              }));
            } else {
              needGeocodingCodes.push(dealer.userId);
              updatedDealers.push({ ...dealer });
            }
          } catch (error) {
            console.error(`Errore recupero cache per ${dealer.userId}:`, error);
            needGeocodingCodes.push(dealer.userId);
            updatedDealers.push({ ...dealer });
          }
        } else {
          // Needs geocoding
          needGeocodingCodes.push(dealer.userId);
          updatedDealers.push({ ...dealer });
        }
      }

      // Aggiorna lo stato con i dealer dal cache/placeholder
      setDealerData((prev) => mergeDealerData(prev, updatedDealers));

      // ⬅️ Guardia prima della geocodifica dei mancanti
      if (censusAbortRef.current) {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
        return;
      }

      // 3) Geocodifica solo quelli che mancano
      if (needGeocodingCodes.length > 0) {
        await geocodeAndSaveMissingDealers(updatedDealers, needGeocodingCodes);
      } else {
        setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
      }
    } catch (error) {
      console.error("Errore nel caricamento geolocalizzazioni:", error);
      if (!censusAbortRef.current) {
        // Fallback: geocodifica tutto come prima (rispetta il test limit)
        await geocodeDealersLegacy(toProcess);
      } else {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
      }
    }
  };

  // NUOVO: Geocodifica solo i dealer mancanti e salva nel DB
  const geocodeAndSaveMissingDealers = async (
    dealers: MarkerData[],
    needGeocodingCodes: string[]
  ) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    const toSave: Array<{
      dealerCode: string;
      latitude?: number;
      longitude?: number;
      address: string;
      quality: string;
      notes?: string;
    }> = [];

    for (const dealerCode of needGeocodingCodes) {
      const dealer = dealers.find((d) => d.userId === dealerCode);
      if (!dealer) continue;

      const address = `${dealer.indirizzo}, ${dealer.cap} ${dealer.citta}, ${dealer.provincia}, Italy`;

      try {
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              const location = results[0].geometry.location;
              const lat = location.lat();
              const lng = location.lng();

              // Aggiorna il dealer in memoria
              const dealerIndex = dealers.findIndex(
                (d) => d.userId === dealerCode
              );
              if (dealerIndex !== -1) {
                dealers[dealerIndex] = {
                  ...dealers[dealerIndex],
                  lat,
                  lng,
                  geocoded: true,
                  fromCache: false,
                };
              }

              // Aggiungi ai dati da salvare
              toSave.push({
                dealerCode,
                latitude: lat,
                longitude: lng,
                address,
                quality: "EXACT",
              });

              setGeocodingProgress((prev) => ({
                ...prev,
                current: prev.current + 1,
                newGeocoded: prev.newGeocoded + 1,
              }));
            } else {
              // Geocodifica fallita
              toSave.push({
                dealerCode,
                address,
                quality: "FAILED",
                notes: `Geocoding failed: ${status}`,
              });

              setGeocodingProgress((prev) => ({
                ...prev,
                current: prev.current + 1,
              }));
            }
            resolve();
          });
        });

        // Delay per rispettare i limiti API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Errore geocodifica per ${dealerCode}:`, error);
        toSave.push({
          dealerCode,
          address,
          quality: "FAILED",
          notes: `Error: ${error}`,
        });
      }
    }

    // Salva tutti i risultati nel database
    if (toSave.length > 0) {
      await saveBatchGeolocation(toSave);
    }

    // Aggiorna lo stato finale
    setDealerData((prev) => mergeDealerData(prev, dealers));
    setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
  };

  // NUOVO: Salva batch geolocalizzazioni nel DB
  const saveBatchGeolocation = async (geolocations: Array<any>) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/Dealer/geolocation/batch`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dealers: geolocations }),
      });

      if (response.ok) {
        const result: { success: boolean; data: BatchGeolocationResultDto } =
          await response.json();
        console.log(
          `Geolocalizzazioni salvate: ${result.data.successCount} successi, ${result.data.failedCount} fallimenti`
        );
      } else {
        console.error("Errore nel salvataggio delle geolocalizzazioni");
      }
    } catch (error) {
      console.error("Errore nel salvataggio batch:", error);
    }
  };

  // Metodo legacy per fallback
  const geocodeDealersLegacy = async (dealers: MarkerData[]) => {
    if (!window.google) return;

    setGeocodingProgress({
      current: 0,
      total: dealers.length,
      isActive: true,
      fromCache: 0,
      newGeocoded: 0,
    });
    const geocoder = new window.google.maps.Geocoder();
    const updatedDealers: MarkerData[] = [];

    for (let i = 0; i < dealers.length; i++) {
      const dealer = dealers[i];
      const address = `${dealer.indirizzo}, ${dealer.cap} ${dealer.citta}, ${dealer.provincia}, Italy`;

      try {
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              const location = results[0].geometry.location;
              updatedDealers.push({
                ...dealer,
                lat: location.lat(),
                lng: location.lng(),
                geocoded: true,
                fromCache: false,
              });
            } else {
              updatedDealers.push({
                ...dealer,
                lat: 0,
                lng: 0,
                geocoded: false,
                fromCache: false,
              });
            }
            setGeocodingProgress((prev) => ({
              ...prev,
              current: i + 1,
              newGeocoded: prev.newGeocoded + (status === "OK" ? 1 : 0),
            }));
            resolve();
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Errore geocodifica per ${dealer.nome}:`, error);
        updatedDealers.push({
          ...dealer,
          lat: 0,
          lng: 0,
          geocoded: false,
          fromCache: false,
        });
      }
    }

    setDealerData((prev) => mergeDealerData(prev, updatedDealers));
    setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
  };

  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.google) return;

    // Rimuovi i marker esistenti
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Filtra i dealer - AGGIORNATO
    let filteredDealers = dealerData.filter((dealer) => dealer.geocoded);

    if (activeTab === "transanti") {
      filteredDealers = filteredDealers.filter((d) => d.isTransaction === true);
    } else if (activeTab === "inattivi") {
      filteredDealers = filteredDealers.filter(
        (d) => d.isTransaction === false
      );
    }

    if (selectedRegione) {
      filteredDealers = filteredDealers.filter(
        (d) => toCanonicalRegion(d.regione) === selectedRegione
      );
    }

    if (selectedProvincia) {
      filteredDealers = filteredDealers.filter(
        (d) => d.provincia === selectedProvincia
      );
    }

    // Crea i nuovi marker
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    filteredDealers.forEach((dealer) => {
      if (dealer.lat === 0 && dealer.lng === 0) return;

      const marker = new window.google.maps.Marker({
        position: { lat: dealer.lat, lng: dealer.lng },
        map: mapInstance.current,
        title: `${dealer.userId} - ${dealer.nome}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: dealer.fromCache ? 10 : 8,
          fillColor: dealer.isTransaction ? "#28a745" : "#ffc107",
          fillOpacity: dealer.fromCache ? 0.9 : 0.8,
          strokeColor: dealer.fromCache
            ? dealer.isTransaction
              ? "#1e7e34"
              : "#e0a800"
            : dealer.isTransaction
            ? "#155724"
            : "#d39e00",
          strokeWeight: dealer.fromCache ? 3 : 2,
        },
      });

      // Info Window con indicazione se da cache
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="dealer-info-window">
            <h6><strong>${dealer.userId}</strong></h6>
            <p><strong>${dealer.nome}</strong></p>
            <p><small>${dealer.indirizzo}<br>
            ${dealer.cap} ${dealer.citta} (${
          PROVINCE_NAMES[dealer.provincia] || dealer.provincia
        })<br>
            ${dealer.regione}</small></p>
            <p><span class="badge ${
              dealer.isTransaction ? "bg-success" : "bg-warning"
            }">
              ${dealer.isTransaction ? "Transante" : "Non Transante"}
            </span></p>
            ${
              dealer.ultimaTransazione
                ? `<p><small>Ultima transazione: ${new Date(
                    dealer.ultimaTransazione
                  ).toLocaleDateString("it-IT")}</small></p>`
                : ""
            }
            <p><small class="text-muted">
              <i class="fa-solid fa-${
                dealer.fromCache ? "database" : "map-marker-alt"
              }"></i>
              ${dealer.fromCache ? "Da cache DB" : "Appena geocodificato"}
            </small></p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: dealer.lat, lng: dealer.lng });
      hasValidMarkers = true;
    });

    // Adatta la vista se ci sono marker validi
    if (hasValidMarkers) {
      mapInstance.current.fitBounds(bounds);

      const listener = window.google.maps.event.addListener(
        mapInstance.current,
        "bounds_changed",
        () => {
          if (mapInstance.current.getZoom() > 15) {
            mapInstance.current.setZoom(15);
          }
          window.google.maps.event.removeListener(listener);
        }
      );
    }
  };

  const toggleMenu = () => {
    const newState = menuState === "open" ? "closed" : "open";
    setMenuState(newState);
    localStorage.setItem("menuState", newState);
  };

  // NUOVE funzioni per gestire regioni e province
  const getUniqueRegions = () => {
    if (!dealerData) return [];
    const regions = [
      ...new Set(dealerData.map((d) => (d.regione || "").trim())),
    ]
      .filter((r) => r.length > 0)
      .sort();
    return regions;
  };

  const getUniqueProvinces = () => {
    if (!dealerData) return [];

    let provinces = dealerData.map((d) => d.provincia);

    // Se è selezionata una regione, filtra le province per quella regione
    if (selectedRegione) {
      provinces = dealerData
        .filter((d) => toCanonicalRegion(d.regione) === selectedRegione)
        .map((d) => d.provincia);
    }

    const uniqueProvinces = [...new Set(provinces)].sort();

    // Mappa le province con i nomi completi
    return uniqueProvinces.map((provincia) => ({
      code: provincia,
      name: PROVINCE_NAMES[provincia] || provincia,
    }));
  };

  // Dealer da processare nel censimento: regione obbligatoria, provincia opzionale
  const getDealersForCensus = () => {
    if (!selectedRegione) return [];
    return dealerData.filter((d) => {
      const canon = toCanonicalRegion(d.regione);
      const byRegion = canon === selectedRegione;
      const byProvince =
        !selectedProvincia || d.provincia === selectedProvincia;
      return byRegion && byProvince;
    });
  };

  const getFilteredCount = (type: "all" | "transanti" | "inattivi") => {
    let filtered = dealerData;

    if (type === "transanti") {
      filtered = filtered.filter((d) => d.isTransaction === true);
    } else if (type === "inattivi") {
      filtered = filtered.filter((d) => d.isTransaction === false);
    }

    if (selectedRegione) {
      filtered = filtered.filter(
        (d) => toCanonicalRegion(d.regione) === selectedRegione
      );
    }

    if (selectedProvincia) {
      filtered = filtered.filter((d) => d.provincia === selectedProvincia);
    }

    return filtered.length;
  };

  // Reset provincia quando cambia regione
  const handleRegionChange = (regione: string) => {
    setSelectedRegione(regione);
    setSelectedProvincia(""); // Reset provincia quando cambia regione
  };

  const getTotals = () => {
    const transanti = dealerData.filter((d) => d.isTransaction === true).length;
    const nonTransanti = dealerData.filter(
      (d) => d.isTransaction === false
    ).length;
    const geocoded = dealerData.filter((d) => d.geocoded).length;
    const fromCache = dealerData.filter((d) => d.fromCache).length;

    return {
      transanti,
      nonTransanti,
      total: transanti + nonTransanti,
      geocoded,
      fromCache,
    };
  };

  const getMonthName = (monthNumber: number): string => {
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

  const totals = getTotals();

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } dealer-tracking-page`}
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
                    Dealer Tracking
                  </li>
                </ol>
              </nav>
              <h2 className="dealer-tracking-title">
                <i className="fa-solid fa-map-marker-alt me-2"></i>
                Dealer Tracking - Anno {selectedYear}
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

          {/* Statistiche rapide */}
          <div className="row mb-4">
            <div className="col-xl-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Statistiche Dealer</span>
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-2 mb-2">
                      <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.total}</h4>
                          <small>Dealer Totali</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-success text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.transanti}</h4>
                          <small>Transanti</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-warning text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.nonTransanti}</h4>
                          <small>Non Transanti</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-info text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.geocoded}</h4>
                          <small>Geocodificati</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-secondary text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.fromCache}</h4>
                          <small>Da Cache DB</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-dark text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">
                            {geocodingProgress.newGeocoded}
                          </h4>
                          <small>Nuovi</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress geocodifica */}
          {geocodingProgress.isActive && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <i className="fa-solid fa-map-marker-alt fa-spin text-primary"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between mb-1">
                          <small>
                            Caricamento geolocalizzazioni - Da cache:{" "}
                            {geocodingProgress.fromCache}, Nuove:{" "}
                            {geocodingProgress.newGeocoded}
                          </small>
                          <small>
                            {geocodingProgress.current} /{" "}
                            {geocodingProgress.total}
                          </small>
                        </div>
                        <div className="progress">
                          <div
                            className="progress-bar bg-success"
                            style={{
                              width: `${
                                (geocodingProgress.fromCache /
                                  geocodingProgress.total) *
                                100
                              }%`,
                            }}
                          ></div>
                          <div
                            className="progress-bar bg-primary"
                            style={{
                              width: `${
                                (geocodingProgress.newGeocoded /
                                  geocodingProgress.total) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                          <small className="text-success">Cache DB</small>
                          <small className="text-primary">
                            Nuove geocodifiche
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mappa */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Mappa Dealer</span>
                  <div className="menu-right">
                    <div className="me-2">
                      <div className="menu-right">
                        {/* <button
                          className="btn btn-primary-dark"
                          onClick={startCensus}
                          disabled={
                            isCensusRunning ||
                            dealerData.length === 0 ||
                            !selectedRegione
                          }
                          title={
                            selectedRegione
                              ? "Avvia il censimento geolocalizzazione"
                              : "Seleziona una Regione per abilitare il censimento"
                          }
                        >
                          <i
                            className={`fa-solid ${
                              isCensusRunning
                                ? "fa-spinner fa-spin"
                                : "fa-location-crosshairs"
                            } me-1`}
                          />
                          {isCensusRunning
                            ? "Censimento..."
                            : "Aggiorna mappa"}
                        </button>

                        {isCensusRunning && (
                          <button
                            className="btn btn-outline-primary-dark"
                            onClick={cancelCensus}
                            title="Annulla censimento in corso"
                          >
                            <i className="fa-solid fa-ban me-1" />
                            Annulla
                          </button>
                        )} */}

                        <div className="menu-icon">
                          <i className="fa-solid fa-filter" />
                        </div>
                        <div className="menu-icon">
                          <i className="fa-solid fa-expand" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-body p-0">
                  {/* Filtri - AGGIORNATI */}
                  <div className="p-3 border-bottom">
                    <div className="row">
                      <div className="col-md-6">
                        <ul className="nav nav-pills">
                          <li className="nav-item">
                            <button
                              className={`nav-link ${
                                activeTab === "all" ? "active" : ""
                              }`}
                              onClick={() => setActiveTab("all")}
                            >
                              Tutti ({getFilteredCount("all")})
                            </button>
                          </li>
                          <li className="nav-item">
                            <button
                              className={`nav-link ${
                                activeTab === "transanti" ? "active" : ""
                              }`}
                              onClick={() => setActiveTab("transanti")}
                            >
                              <i className="fa-solid fa-circle text-success me-1"></i>
                              Transanti ({getFilteredCount("transanti")})
                            </button>
                          </li>
                          <li className="nav-item">
                            <button
                              className={`nav-link ${
                                activeTab === "inattivi" ? "active" : ""
                              }`}
                              onClick={() => setActiveTab("inattivi")}
                            >
                              <i className="fa-solid fa-circle text-warning me-1"></i>
                              Non Transanti ({getFilteredCount("inattivi")})
                            </button>
                          </li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <div className="row">
                          <div className="col-md-3 mb-2">
                            <select
                              className="form-select"
                              value={selectedRegione}
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) => setSelectedRegione(e.target.value)}
                            >
                              <option value="">Seleziona Regione...</option>
                              {CANONICAL_REGIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3 mb-2">
                            <select
                              className="form-select"
                              value={selectedProvincia}
                              onChange={(e) =>
                                setSelectedProvincia(e.target.value)
                              }
                            >
                              <option value="">Tutte le province</option>
                              {getUniqueProvinces().map((provincia) => (
                                <option
                                  key={provincia.code}
                                  value={provincia.code}
                                >
                                  {provincia.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-4 mb-2">
                            <div className="d-flex align-items-center gap-3 flex-nowrap">
                              <button
                                className="btn btn-primary-dark px-3"
                                onClick={startCensus}
                                disabled={
                                  isCensusRunning ||
                                  dealerData.length === 0                              
                                }
                                title={
                                  selectedRegione
                                    ? "Avvia il censimento geolocalizzazione"
                                    : "Seleziona una Regione per abilitare il censimento"
                                }
                              >
                                <i
                                  className={`fa-solid ${
                                    isCensusRunning
                                      ? "fa-spinner fa-spin"
                                      : "fa-location-crosshairs"
                                  } me-2`}
                                />
                                {isCensusRunning
                                  ? "Censimento..."
                                  : "Aggiorna mappa"}
                              </button>

                              {isCensusRunning && (
                                <button
                                  className="btn btn-outline-primary-dark px-3"
                                  onClick={cancelCensus}
                                  title="Annulla censimento in corso"
                                >
                                  <i className="fa-solid fa-ban me-2" />
                                  Annulla
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mappa */}
                  {isLoadingDealer ? (
                    <div className="map-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati dealer...</h5>
                      </div>
                    </div>
                  ) : errorDealer ? (
                    <div className="map-placeholder">
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
                  ) : !mapLoaded ? (
                    <div className="map-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-map fa-3x mb-3"></i>
                        <h5>Caricamento mappa...</h5>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={mapRef}
                      className="dealer-map"
                      style={{ height: "600px", width: "100%" }}
                    ></div>
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

export default DealerTracking;
