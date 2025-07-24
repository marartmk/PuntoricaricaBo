import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ArrowLeft,
  FilePlus,
  Search,
  Calendar,  
  Warehouse,
  ShoppingCart,  
  Users,
  BarChart,
  Settings,  
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
          data-tooltip="Accettazione Smart"
          onClick={() => navigate("/master-company")}
        >
          <FilePlus className="icon" />
          <span className="item-text">Anagrafica Azienda</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/affiliate-management")}
        >
          <Search className="icon" />
          <span className="item-text">Gestione Rete</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/calendario-operatori")}
        >
          <Calendar className="icon" />
          <span className="item-text">Calendario Operatori</span>
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
