import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ArrowLeft,
  FilePlus,
  Search,
  Calendar,
  Truck,
  FlaskConical,
  Warehouse,
  ShoppingCart,
  FileText,
  Users,
  BarChart,
  Settings,
  Lock,
  MonitorSmartphone,
  Store,
} from "lucide-react";

import "./Sidebar.css";

interface SidebarProps {
  menuState: "open" | "closed";
  toggleMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ menuState, toggleMenu }) => {
  const navigate = useNavigate();

  return (
    <div className={`sidebar ${menuState}`}>
      <div className="sidebar-heading">
        <button
          onClick={toggleMenu}
          className="btn-close-sidebar"
          aria-label="Toggle Menu"
        >
          {menuState === "open" ? (
            <ChevronLeft size={24} />
          ) : (
            <ChevronRight size={24} />
          )}
        </button>
      </div>
      <div className="list-group list-group-mine">
        <button className="list-group-item" onClick={() => navigate(-1)}>
          <ArrowLeft className="icon" />
          <span className="item-text">Indietro</span>
        </button>
        <button
          className="list-group-item"
          data-tooltip="Accettazione"
          onClick={() => navigate("/accettazione")}
        >
          <FilePlus className="icon" />
          <span className="item-text">Accettazione</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/ricerca-schede")}
        >
          <Search className="icon" />
          <span className="item-text">Ricerca Schede</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/testpage")}
        >
          <Calendar className="icon" />
          <span className="item-text">Calendario Operatori</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/gestione-logistica")}
        >
          <Truck className="icon" />
          <span className="item-text">Gestione Logistica</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/laboratorio")}
        >
          <FlaskConical className="icon" />
          <span className="item-text">Laboratorio</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/magazzino-ricambi")}
        >
          <Warehouse className="icon" />
          <span className="item-text">Magazzino Ricambi</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/ordini-ricambi")}
        >
          <ShoppingCart className="icon" />
          <span className="item-text">Ordini Ricambi</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => window.open("https://whr.dea40.it", "_blank")}
        >
          <Settings className="icon" />
          <span className="item-text">Amministrazione</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/anagrafica-clienti")}
        >
          <Users className="icon" />
          <span className="item-text">Anagrafica Clienti</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/device-registry")}
        >
          <MonitorSmartphone className="icon" />
          <span className="item-text">Anagrafica Apparati</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/documenti-trasporto")}
        >
          <FileText className="icon" />
          <span className="item-text">Documenti Trasporto</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/vendite")}
        >
          <Store className="icon" />
          <span className="item-text">Vendite</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/estensioni")}
        >
          <Lock className="icon" />
          <span className="item-text">Estensioni</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => window.open("https://vendolo.dea40.it", "_blank")}
        >
          <ShoppingCart className="icon" />
          <span className="item-text">Shop</span>
        </button>
        <button
          className="list-group-item"
          onClick={() =>
            window.open(
              "https://vendolo.dea40.it/smarttv3.aspx?code=KL-QTXEN",
              "_blank"
            )
          }
        >
          <MonitorSmartphone className="icon" />
          <span className="item-text">Smart Tv</span>
        </button>
        <button className="list-group-item" onClick={() => navigate("/report")}>
          <BarChart className="icon" />
          <span className="item-text">Report</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/lavorazioni-esterne")}
        >
          <Truck className="icon" />
          <span className="item-text">Lavorazioni Esterne</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/login-local-admin")}
        >
          <Lock className="icon" />
          <span className="item-text">Area Riservata</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
