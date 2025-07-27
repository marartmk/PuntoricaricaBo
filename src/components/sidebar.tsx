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
          onClick={() => navigate("/ricerca-schede")}
        >
          <Search className="icon" />
          <span className="item-text">Ricerca Clienti</span>
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
          <span className="item-text">Gestione Sales</span>
        </button>               
        <button
          className="list-group-item"
          onClick={() => navigate("/ordini-ricambi")}
        >
          <ShoppingCart className="icon" />
          <span className="item-text">Listini Servizi</span>
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
          <span className="item-text">Anagrafica Fornitori</span>
        </button>       
        <button
          className="list-group-item"
          onClick={() => navigate("/vendite")}
        >
          <Store className="icon" />
          <span className="item-text">Vendite</span>
        </button>                     
        <button className="list-group-item" onClick={() => navigate("/report")}>
          <BarChart className="icon" />
          <span className="item-text">Report</span>
        </button>       
      </div>
    </div>
  );
};

export default Sidebar;
