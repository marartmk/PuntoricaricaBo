import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../pages/Dashboard/dashboard.css";
import "./agn-tracking.css";
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

// Regioni canoniche
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

// Aggiorna solo gli agn passati, mantenendo intatto il dataset completo
const mergeAgnData = (prev: MarkerData[], updates: MarkerData[]) => {
  const map = new Map(prev.map((d) => [d.agnCode, d] as const));
  for (const u of updates) {
    const ex = map.get(u.agnCode) || u;
    map.set(u.agnCode!, { ...ex, ...u }); // merge per agnCode
  }
  return Array.from(map.values());
};

// INTERFACCE CORRETTE BASATE SUL CONTROLLER AGN
interface AgnDto {
  id: string;
  partitaIvaListaAgn?: string;
  partitaIvaAdmiralPay?: string;
  denominazioneEsercizioAp?: string;
  ragioneSociale?: string;
  denominazioneEsercizioAgn?: string;
  indirizzo?: string;
  tipologiaEsercizio?: string;
  provincia?: string;
  comune?: string;
  regione?: string;
  awpEsercizio?: string;
  awpGestorePrincipale?: string;
  buCommercialeAgn?: string;
  buCommercialeNi?: string;
  gestioneCommercialeCongiuntaODisgiunta?: string;
  vltEsercizio?: string;
  concessionarioVlt?: string;
  vltGestoreSala?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted: boolean;
  // Campi calcolati
  agnCode?: string;
  nome?: string;
  email?: string;
  telefonoFisso?: string;
  cap?: string;
  citta?: string;
  // Campi geolocalizzazione
  latitude?: number | null;
  longitude?: number | null;
  hasValidCoordinates: boolean;
  geolocationQuality?: string;
}

interface MarkerData extends AgnDto {
  lat: number;
  lng: number;
  geocoded: boolean;
  fromCache: boolean;
}

// INTERFACCE GEOLOCALIZZAZIONE AGN CORRETTE
interface AgnGeolocationDto {
  agnCode: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  geocodedDate: string;
  quality?: string;
  hasValidCoordinates: boolean;
}

interface AgnBatchGeolocationCheckDto {
  agnCodes: string[];
}

interface AgnBatchGeolocationCheckResultDto {
  totalChecked: number;
  alreadyGeolocated: number;
  needGeolocation: number;
  needUpdate: number;
  agnsStatus: Array<{
    agnCode: string;
    isGeolocated: boolean;
    quality?: string;
    lastGeocodedDate?: string;
    needsUpdate: boolean;
    currentAddress?: string;
    geocodedAddress?: string;
  }>;
  checkedAt: string;
}

interface SaveAgnGeolocationDto {
  agnCode: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  quality?: string;
  notes?: string;
}

interface BatchAgnGeolocationDto {
  agns: SaveAgnGeolocationDto[];
}

interface AgnBatchGeolocationResultDto {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  updatedCount: number;
  createdCount: number;
  errors: string[];
  results?: AgnGeolocationDto[];
  processedAt: string;
}

// Response API wrapper
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

interface ListResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Estendi l'interfaccia Window per Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const AgnTracking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [menuState, setMenuState] = useState<"open" | "closed">("open");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Modalità test geolocalizzazione
  const GEO_TEST_MODE = false;
  const GEO_TEST_LIMIT = 300;

  const ENABLE_PROVIDER_SWITCH = false; // Flag per abilitare/disabilitare lo switch provider

  // Stato per avviare/fermare manualmente la geocodifica
  const [isCensusRunning, setIsCensusRunning] = useState(false);
  const censusAbortRef = useRef(false);
  // Filtro regione per il censimento
  const [selectedRegione, setSelectedRegione] = useState<string>("");

  // Provider di geocoding
  const [geocodingProvider, setGeocodingProvider] = useState<
    "google" | "nominatim"
  >("nominatim");

  // Parametri URL
  const annoFromUrl = parseInt(
    searchParams.get("anno") || new Date().getFullYear().toString()
  );
  const [selectedYear, setSelectedYear] = useState<number>(annoFromUrl);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Stati per i dati
  const [agnData, setAgnData] = useState<MarkerData[]>([]);
  const [isLoadingAgn, setIsLoadingAgn] = useState<boolean>(false);
  const [errorAgn, setErrorAgn] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{
    current: number;
    total: number;
    isActive: boolean;
    fromCache: number;
    newGeocoded: number;
  }>({ current: 0, total: 0, isActive: false, fromCache: 0, newGeocoded: 0 });

  // Filtri
  const [activeTab, setActiveTab] = useState<"all" | "attivi" | "inattivi">(
    "all"
  );
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL;
  const GOOGLE_MAPS_API_KEY = "AIzaSyBdIcimFZ-qXj-7YzYX0kbCGGxIpAnOA0I";

  // FLAG PER BLOCCARE GEOCODIFICA IN TEST
  const DISABLE_GEOCODING = false;

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

      (window as any).initMap = () => setMapLoaded(true);

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

  // Carica i dati quando cambiano i parametri (se vuoi auto-load, decommenta)
  useEffect(() => {
    // fetchAgnData();
  }, [selectedYear, selectedMonth]);

  // Aggiorna i marker quando cambiano i dati o i filtri
  useEffect(() => {
    if (mapInstance.current && agnData.length > 0) {
      updateMapMarkers();
    }
  }, [agnData, activeTab, selectedProvincia, selectedRegione]);

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

  // CHIAMATA API CORRETTA PER AGN
  const fetchAgnData = async (
    page = 1,
    pageSize = 8000,
    filters?: {
      provincia?: string;
      regione?: string;
      ragioneSociale?: string;
      partitaIva?: string;
    }
  ) => {
    setIsLoadingAgn(true);
    setErrorAgn("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token di autenticazione non trovato");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filters?.provincia) params.set("provincia", filters.provincia);
      if (filters?.regione) params.set("regione", filters.regione);
      if (filters?.ragioneSociale)
        params.set("ragioneSociale", filters.ragioneSociale);
      if (filters?.partitaIva) params.set("partitaIva", filters.partitaIva);

      // Marart
      //const url = `${API_URL}/api/Agn/with-geolocations?${params.toString()}`;
      const url = `${API_URL}/api/Agn/?${params.toString()}`;

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

      const payload: ApiResponse<ListResult<AgnDto>> = await response.json();
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Errore nel recupero dei dati");
      }

      const agns = payload.data.items;

      const agnsWithGeocode: MarkerData[] = agns.map((a) => ({
        ...a,
        agnCode: a.agnCode || a.partitaIvaListaAgn || a.id, // Fallback per agnCode
        lat: a.latitude ?? 0,
        lng: a.longitude ?? 0,
        geocoded: !!a.hasValidCoordinates,
        fromCache: true,
      }));

      setAgnData(agnsWithGeocode);
    } catch (err: any) {
      console.error("Errore caricamento agn:", err);
      setErrorAgn(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setIsLoadingAgn(false);
    }
  };

  // --- Geocoding Nominatim (OSM) ---
  const geocodeWithNominatim = async (
    address: string
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Tentiamo di separare via e città se l'indirizzo contiene virgole
      const addressParts = address
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const street = addressParts[0] || "";

      // city: prendi la parte dopo CAP se presente, altrimenti la seconda parte
      const cityPart = addressParts.slice(1).join(" ");
      const cityMatch = cityPart.match(/^(?:\d{5})?\s*(.+)$/);
      const city = cityMatch ? cityMatch[1] : cityPart;

      const params = new URLSearchParams();
      if (street) params.set("street", street);
      if (city) params.set("city", city);
      params.set("countrycodes", "it");
      params.set("format", "json");
      params.set("limit", "1");

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "APayGeocoder/1.0 (https://marart.it; info@marart.it)",
          Accept: "application/json",
        },
      });

      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

      const results = await response.json();
      if (Array.isArray(results) && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        };
      }
      return null;
    } catch (err) {
      console.error("Errore geocodifica Nominatim:", err);
      return null;
    }
  };

  const loadAgnsGeolocation = async (agns: MarkerData[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (censusAbortRef.current) {
      setGeocodingProgress((p) => ({ ...p, isActive: false }));
      return;
    }

    const toProcess = GEO_TEST_MODE ? agns.slice(0, GEO_TEST_LIMIT) : agns;

    setGeocodingProgress({
      current: 0,
      total: toProcess.length,
      isActive: true,
      fromCache: 0,
      newGeocoded: 0,
    });

    try {
      if (censusAbortRef.current) {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
        return;
      }

      // 1) Verifica quali agn sono già geolocalizzati
      const agnCodes = toProcess.map((d) => d.agnCode || d.id);
      const checkResponse = await fetch(
        `${API_URL}/api/Agn/geolocation/check`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agnCodes } as AgnBatchGeolocationCheckDto),
        }
      );

      if (!checkResponse.ok)
        throw new Error("Errore nella verifica delle geolocalizzazioni");

      const checkResult: ApiResponse<AgnBatchGeolocationCheckResultDto> =
        await checkResponse.json();
      if (!checkResult.success || !checkResult.data)
        throw new Error("Errore nella risposta di verifica geolocalizzazioni");

      const agnsStatus = checkResult.data.agnsStatus;

      // 2) Mappa già geolocalizzati dal DB
      const updatedAgns: MarkerData[] = [];
      const needGeocodingCodes: string[] = [];

      for (const agn of toProcess) {
        if (censusAbortRef.current) {
          setGeocodingProgress((p) => ({ ...p, isActive: false }));
          break;
        }

        const agnCode = agn.agnCode || agn.id;
        const status = agnsStatus.find((s) => s.agnCode === agnCode);

        if (status?.isGeolocated && !status.needsUpdate) {
          try {
            const geoResponse = await fetch(
              `${API_URL}/api/Agn/${agnCode}/geolocation`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (geoResponse.ok) {
              const geoData: ApiResponse<AgnGeolocationDto> =
                await geoResponse.json();
              if (geoData.success && geoData.data) {
                updatedAgns.push({
                  ...agn,
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
                needGeocodingCodes.push(agnCode);
                updatedAgns.push({ ...agn });
              }
            } else {
              needGeocodingCodes.push(agnCode);
              updatedAgns.push({ ...agn });
            }
          } catch (e) {
            console.error(`Errore recupero cache per ${agnCode}:`, e);
            needGeocodingCodes.push(agnCode);
            updatedAgns.push({ ...agn });
          }
        } else {
          needGeocodingCodes.push(agnCode);
          updatedAgns.push({ ...agn });
        }
      }

      setAgnData((prev) => mergeAgnData(prev, updatedAgns));

      if (censusAbortRef.current) {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
        return;
      }

      // 3) Geocodifica solo mancanti
      if (needGeocodingCodes.length > 0) {
        await geocodeAndSaveMissingAgnsUnified(updatedAgns, needGeocodingCodes);
      } else {
        setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
      }
    } catch (error) {
      console.error("Errore nel caricamento geolocalizzazioni:", error);
      if (!censusAbortRef.current) {
        await geocodeAgnsLegacy(toProcess);
      } else {
        setGeocodingProgress((p) => ({ ...p, isActive: false }));
      }
    }
  };

  // Funzione unificata (Google o Nominatim)
  const geocodeAndSaveMissingAgnsUnified = async (
    agns: MarkerData[],
    needGeocodingCodes: string[]
  ) => {
    const toSave: SaveAgnGeolocationDto[] = [];

    for (const agnCode of needGeocodingCodes) {
      const agn = agns.find((d) => (d.agnCode || d.id) === agnCode);
      if (!agn) continue;

      const address = `${agn.indirizzo || ""}, ${agn.cap || ""} ${
        agn.comune || agn.citta || ""
      }, ${agn.provincia || ""}`.trim();

      let lat: number | null = null;
      let lng: number | null = null;
      let quality = "FAILED" as "FAILED" | "EXACT";

      try {
        if (geocodingProvider === "google") {
          if (window.google) {
            const geocoder = new window.google.maps.Geocoder();
            const result = await new Promise<{
              lat: number;
              lng: number;
            } | null>((resolve) => {
              geocoder.geocode(
                { address },
                (results: any[], status: string) => {
                  if (status === "OK" && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({ lat: location.lat(), lng: location.lng() });
                  } else {
                    resolve(null);
                  }
                }
              );
            });
            if (result) {
              lat = result.lat;
              lng = result.lng;
              quality = "EXACT";
            }
          }
        } else {
          const result = await geocodeWithNominatim(address);
          if (result) {
            lat = result.lat;
            lng = result.lng;
            quality = "EXACT";
          }
        }

        if (lat !== null && lng !== null) {
          // Aggiorna in memoria
          const agnIndex = agns.findIndex(
            (d) => (d.agnCode || d.id) === agnCode
          );
          if (agnIndex !== -1) {
            agns[agnIndex] = {
              ...agns[agnIndex],
              lat,
              lng,
              geocoded: true,
              fromCache: false,
            };
          }

          toSave.push({
            agnCode,
            latitude: lat,
            longitude: lng,
            address,
            quality,
            notes: `Geocoded with ${geocodingProvider}`,
          });

          setGeocodingProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            newGeocoded: prev.newGeocoded + 1,
          }));
        } else {
          // Fallita
          toSave.push({
            agnCode,
            address,
            quality: "FAILED",
            notes: `Geocoding failed with ${geocodingProvider}`,
          });
          setGeocodingProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
          }));
        }

        // Rispetta limiti (Nominatim <= 1 rps; Google ok 100ms throttle)
        const delay = geocodingProvider === "nominatim" ? 1000 : 100;
        await new Promise((r) => setTimeout(r, delay));
      } catch (error: any) {
        console.error(`Errore geocodifica per ${agnCode}:`, error);
        toSave.push({
          agnCode,
          address,
          quality: "FAILED",
          notes: `Error with ${geocodingProvider}: ${String(error)}`,
        });
        setGeocodingProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
        }));
      }

      if (censusAbortRef.current) break;
    }

    if (toSave.length > 0) {
      await saveBatchGeolocation(toSave);
    }

    setAgnData((prev) => mergeAgnData(prev, agns));
    setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
  };

  // SALVATAGGIO BATCH
  const saveBatchGeolocation = async (
    geolocations: SaveAgnGeolocationDto[]
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/Agn/geolocation/batch`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agns: geolocations } as BatchAgnGeolocationDto),
      });

      if (response.ok) {
        const result: ApiResponse<AgnBatchGeolocationResultDto> =
          await response.json();
        if (result.success && result.data) {
          console.log(
            `Geolocalizzazioni salvate: ${result.data.successCount} successi, ${result.data.failedCount} fallimenti`
          );
        }
      } else {
        console.error("Errore nel salvataggio delle geolocalizzazioni");
      }
    } catch (error) {
      console.error("Errore nel salvataggio batch:", error);
    }
  };

  // Metodo legacy (solo Google)
  const geocodeAgnsLegacy = async (agns: MarkerData[]) => {
    if (!window.google) return;

    setGeocodingProgress({
      current: 0,
      total: agns.length,
      isActive: true,
      fromCache: 0,
      newGeocoded: 0,
    });
    const geocoder = new window.google.maps.Geocoder();
    const updatedAgns: MarkerData[] = [];

    for (let i = 0; i < agns.length; i++) {
      const agn = agns[i];
      const address = `${agn.indirizzo || ""}, ${agn.cap || ""} ${
        agn.comune || agn.citta || ""
      }, ${agn.provincia || ""}, Italy`.trim();

      try {
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              const location = results[0].geometry.location;
              updatedAgns.push({
                ...agn,
                lat: location.lat(),
                lng: location.lng(),
                geocoded: true,
                fromCache: false,
              });
            } else {
              updatedAgns.push({
                ...agn,
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
        console.error(`Errore geocodifica per ${agn.agnCode}:`, error);
        updatedAgns.push({
          ...agn,
          lat: 0,
          lng: 0,
          geocoded: false,
          fromCache: false,
        });
      }
    }

    setAgnData((prev) => mergeAgnData(prev, updatedAgns));
    setGeocodingProgress((prev) => ({ ...prev, isActive: false }));
  };

  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.google) return;

    // Rimuovi i marker esistenti
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Filtri
    let filteredAgns = agnData.filter((agn) => agn.geocoded);

    if (activeTab === "attivi") {
      filteredAgns = filteredAgns.filter(
        (d) =>
          d.awpEsercizio === "S" ||
          d.vltEsercizio === "S" ||
          d.buCommercialeAgn === "S" ||
          d.buCommercialeNi === "S"
      );
    } else if (activeTab === "inattivi") {
      filteredAgns = filteredAgns.filter(
        (d) =>
          !(
            d.awpEsercizio === "S" ||
            d.vltEsercizio === "S" ||
            d.buCommercialeAgn === "S" ||
            d.buCommercialeNi === "S"
          )
      );
    }

    if (selectedRegione) {
      filteredAgns = filteredAgns.filter(
        (d) => toCanonicalRegion(d.regione) === selectedRegione
      );
    }

    if (selectedProvincia) {
      filteredAgns = filteredAgns.filter(
        (d) => d.provincia === selectedProvincia
      );
    }

    // Crea i nuovi marker
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    filteredAgns.forEach((agn) => {
      if (agn.lat === 0 && agn.lng === 0) return;

      const isActive = !!(
        agn.awpEsercizio === "S" ||
        agn.vltEsercizio === "S" ||
        agn.buCommercialeAgn === "S" ||
        agn.buCommercialeNi === "S"
      );

      const marker = new window.google.maps.Marker({
        position: { lat: agn.lat, lng: agn.lng },
        map: mapInstance.current,
        title: `${agn.agnCode} - ${
          agn.ragioneSociale || agn.denominazioneEsercizioAgn
        }`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: agn.fromCache ? 10 : 8,
          fillColor: isActive ? "#28a745" : "#ffc107",
          fillOpacity: agn.fromCache ? 0.9 : 0.8,
          strokeColor: agn.fromCache
            ? isActive
              ? "#1e7e34"
              : "#e0a800"
            : isActive
            ? "#155724"
            : "#d39e00",
          strokeWeight: agn.fromCache ? 3 : 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="agn-info-window">
            <h6><strong>${agn.agnCode || agn.id}</strong></h6>
            <p><strong>${
              agn.ragioneSociale || agn.denominazioneEsercizioAgn || "N/A"
            }</strong></p>
            <p><small>${agn.indirizzo || "N/A"}<br>
            ${agn.cap || ""} ${agn.comune || agn.citta || "N/A"} (${
          PROVINCE_NAMES[agn.provincia || ""] || agn.provincia || "N/A"
        })<br>
            ${agn.regione || "N/A"}</small></p>
            <p><span class="badge ${isActive ? "bg-success" : "bg-warning"}">${
          isActive ? "Attivo" : "Non Attivo"
        }</span></p>
            <p><small>Tipologia: ${agn.tipologiaEsercizio || "N/A"}</small></p>
            <p><small class="text-muted">
              <i class="fa-solid fa-${
                agn.fromCache ? "database" : "map-marker-alt"
              }"></i>
              ${agn.fromCache ? "Da cache DB" : "Appena geocodificato"}
            </small></p>
          </div>
        `,
      });

      marker.addListener("click", () =>
        infoWindow.open(mapInstance.current, marker)
      );

      markersRef.current.push(marker);
      bounds.extend({ lat: agn.lat, lng: agn.lng });
      hasValidMarkers = true;
    });

    if (hasValidMarkers) {
      mapInstance.current.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(
        mapInstance.current,
        "bounds_changed",
        () => {
          if (mapInstance.current.getZoom() > 15)
            mapInstance.current.setZoom(15);
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

  const getUniqueProvinces = () => {
    if (!agnData) return [] as { code: string; name: string }[];
    let provinces = agnData.map((d) => d.provincia).filter(Boolean) as string[];

    if (selectedRegione) {
      provinces = agnData
        .filter((d) => toCanonicalRegion(d.regione) === selectedRegione)
        .map((d) => d.provincia!)
        .filter(Boolean);
    }

    const uniqueProvinces = [...new Set(provinces)].sort();
    return uniqueProvinces.map((provincia) => ({
      code: provincia,
      name: PROVINCE_NAMES[provincia] || provincia,
    }));
  };

  const getAgnsForCensus = () => {
    if (!selectedRegione) return [] as MarkerData[];
    return agnData.filter((d) => {
      const canon = toCanonicalRegion(d.regione);
      const byRegion = canon === selectedRegione;
      const byProvince =
        !selectedProvincia || d.provincia === selectedProvincia;
      return byRegion && byProvince;
    });
  };

  const getFilteredCount = (type: "all" | "attivi" | "inattivi") => {
    let filtered = agnData;
    if (type === "attivi") {
      filtered = filtered.filter(
        (d) =>
          d.awpEsercizio === "S" ||
          d.vltEsercizio === "S" ||
          d.buCommercialeAgn === "S" ||
          d.buCommercialeNi === "S"
      );
    } else if (type === "inattivi") {
      filtered = filtered.filter(
        (d) =>
          !(
            d.awpEsercizio === "S" ||
            d.vltEsercizio === "S" ||
            d.buCommercialeAgn === "S" ||
            d.buCommercialeNi === "S"
          )
      );
    }
    if (selectedRegione)
      filtered = filtered.filter(
        (d) => toCanonicalRegion(d.regione) === selectedRegione
      );
    if (selectedProvincia)
      filtered = filtered.filter((d) => d.provincia === selectedProvincia);
    return filtered.length;
  };

  const getTotals = () => {
    const attivi = agnData.filter(
      (d) =>
        d.awpEsercizio === "S" ||
        d.vltEsercizio === "S" ||
        d.buCommercialeAgn === "S" ||
        d.buCommercialeNi === "S"
    ).length;
    const inattivi = agnData.filter(
      (d) =>
        !(
          d.awpEsercizio === "S" ||
          d.vltEsercizio === "S" ||
          d.buCommercialeAgn === "S" ||
          d.buCommercialeNi === "S"
        )
    ).length;
    const geocoded = agnData.filter((d) => d.geocoded).length;
    const fromCache = agnData.filter((d) => d.fromCache).length;
    return { attivi, inattivi, total: agnData.length, geocoded, fromCache };
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

  const startCensus = async () => {
    if (isCensusRunning) return;
    if (!selectedRegione) {
      window.alert("Seleziona prima una Regione per avviare il censimento.");
      return;
    }

    const toCensus = getAgnsForCensus();
    if (toCensus.length === 0) {
      window.alert("Nessun agn da censire per la regione selezionata.");
      return;
    }

    censusAbortRef.current = false;
    setIsCensusRunning(true);
    try {
      await loadAgnsGeolocation(toCensus);
    } finally {
      setIsCensusRunning(false);
    }
  };

  const cancelCensus = () => {
    censusAbortRef.current = true;
  };

  return (
    <div
      className={`d-flex ${
        menuState === "closed" ? "menu-closed" : ""
      } agn-tracking-page`}
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
                    Agn Tracking
                  </li>
                </ol>
              </nav>
              <h2 className="agn-tracking-title">
                <i className="fa-solid fa-map-marker-alt me-2"></i>
                Agn Tracking - Anno {selectedYear}
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
                  {[2025, 2024, 2023].map((y) => (
                    <li key={y}>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setSelectedYear(y);
                          setSelectedMonth(null);
                        }}
                      >
                        {y}
                      </button>
                    </li>
                  ))}
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <h6 className="dropdown-header">Mese {selectedYear}</h6>
                  </li>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <li key={m}>
                      <button
                        className="dropdown-item"
                        onClick={() => setSelectedMonth(m)}
                      >
                        {getMonthName(m)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="btn btn-primary-dark"
                onClick={() => fetchAgnData()}
                disabled={isLoadingAgn}
              >
                <i
                  className={`fa-solid ${
                    isLoadingAgn ? "fa-spinner fa-spin" : "fa-refresh"
                  } me-1`}
                ></i>
                {agnData.length === 0 ? "Carica Dati" : "Aggiorna"}
              </button>
            </div>
          </div>

          {/* Statistiche rapide */}
          <div className="row mb-4">
            <div className="col-xl-12">
              <div className="card">
                <div className="custom-card-header">
                  <span>Statistiche Agn</span>
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-2 mb-2">
                      <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.total}</h4>
                          <small>Agn Totali</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-success text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.attivi}</h4>
                          <small>Attivi</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <div className="card bg-warning text-white h-100">
                        <div className="card-body text-center p-3">
                          <h4 className="mb-1">{totals.inattivi}</h4>
                          <small>Non Attivi</small>
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
                            Geocodifica con{" "}
                            {geocodingProvider === "google"
                              ? "Google Maps"
                              : "OpenStreetMap"}{" "}
                            - Da cache: {geocodingProgress.fromCache}, Nuove:{" "}
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
                  <span>Mappa Agn</span>
                  <div className="menu-right">
                    <div className="me-2">
                      <div className="menu-right">
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
                  {/* Filtri */}
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
                                activeTab === "attivi" ? "active" : ""
                              }`}
                              onClick={() => setActiveTab("attivi")}
                            >
                              <i className="fa-solid fa-circle text-success me-1"></i>
                              Attivi ({getFilteredCount("attivi")})
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
                              Non Attivi ({getFilteredCount("inattivi")})
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
                          <div className="col-md-6 mb-2">
                            <div className="d-flex align-items-center gap-2 flex-nowrap">
                              {/* Toggle Provider Geocoding */}
                              <div className="btn-group" role="group">
                                <input
                                  type="radio"
                                  className="btn-check"
                                  name="geocoding-provider"
                                  id="provider-google"
                                  checked={geocodingProvider === "google"}
                                  onChange={() =>
                                    setGeocodingProvider("google")
                                  }
                                  disabled={!ENABLE_PROVIDER_SWITCH}
                                />
                                <label
                                  className={`btn btn-outline-secondary btn-sm ${
                                    !ENABLE_PROVIDER_SWITCH ? "disabled" : ""
                                  }`}
                                  htmlFor="provider-google"
                                >
                                  <i className="fa-brands fa-google me-1"></i>
                                  Google
                                </label>
                                <input
                                  type="radio"
                                  className="btn-check"
                                  name="geocoding-provider"
                                  id="provider-nominatim"
                                  checked={geocodingProvider === "nominatim"}
                                  onChange={() =>
                                    setGeocodingProvider("nominatim")
                                  }
                                  disabled={!ENABLE_PROVIDER_SWITCH}
                                />
                                <label
                                  className={`btn btn-outline-secondary btn-sm ${
                                    !ENABLE_PROVIDER_SWITCH ? "disabled" : ""
                                  }`}
                                  htmlFor="provider-nominatim"
                                >
                                  <i className="fa-solid fa-map me-1"></i>OSM
                                </label>
                              </div>

                              <button
                                className="btn btn-primary-dark px-3"
                                onClick={startCensus}
                                disabled={
                                  DISABLE_GEOCODING ||
                                  isCensusRunning ||
                                  agnData.length === 0
                                }
                                title={
                                  DISABLE_GEOCODING
                                    ? "Geocodifica disabilitata in modalità test"
                                    : agnData.length === 0
                                    ? "Carica prima i dati AGN"
                                    : selectedRegione
                                    ? `Avvia geocodifica con ${
                                        geocodingProvider === "google"
                                          ? "Google Maps"
                                          : "OpenStreetMap"
                                      }`
                                    : "Seleziona una Regione per abilitare il censimento"
                                }
                              >
                                <i
                                  className={`fa-solid ${
                                    DISABLE_GEOCODING
                                      ? "fa-ban"
                                      : isCensusRunning
                                      ? "fa-spinner fa-spin"
                                      : "fa-location-crosshairs"
                                  } me-2`}
                                />
                                {DISABLE_GEOCODING
                                  ? "Geocodifica disabilitata"
                                  : isCensusRunning
                                  ? "Censimento..."
                                  : `Geocodifica (${
                                      geocodingProvider === "google"
                                        ? "Google"
                                        : "OSM"
                                    })`}
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

                  {/* Contenuto mappa / stati */}
                  {isLoadingAgn ? (
                    <div className="map-placeholder">
                      <div className="text-center text-muted">
                        <i className="fa-solid fa-spinner fa-spin fa-3x mb-3"></i>
                        <h5>Caricamento dati agn...</h5>
                      </div>
                    </div>
                  ) : errorAgn ? (
                    <div className="map-placeholder">
                      <div className="text-center text-danger">
                        <i className="fa-solid fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Errore nel caricamento</h5>
                        <p>{errorAgn}</p>
                        <button
                          className="btn btn-primary-dark btn-sm mt-2"
                          onClick={() => fetchAgnData()}
                        >
                          <i className="fa-solid fa-refresh me-1"></i> Riprova
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
                      className="agn-map"
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

export default AgnTracking;
