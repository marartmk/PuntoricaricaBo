import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ArrowLeft,
  Search,
  Calendar,
  ShoppingCart,
  Users,
  BarChart,
  MonitorSmartphone,
  Store,
  UsersRound,
  LineChart,
  TrendingUp,
  Activity,
} from "lucide-react";

import "./sidebar.css";

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
          onClick={() => navigate("/task-management")}
        >
          <Calendar className="icon" />
          <span className="item-text">Task Management</span>
        </button>
        <button
          className="list-group-item"
          onClick={() => navigate("/gestione-agenti")}
        >
          <UsersRound className="icon" />
          <span className="item-text">Gestione Agenti</span>
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
          onClick={() => navigate("/anagrafica-agenti")}
        >
          <MonitorSmartphone className="icon" />
          <span className="item-text">Anagrafica Agenti</span>
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
        <button
          className="list-group-item"
          onClick={() => navigate("/dealer-analytics")}
        >
          <LineChart className="icon" />
          <span className="item-text">Dealer Analytics</span>
        </button>
         <button
          className="list-group-item"
          onClick={() => navigate("/services-analytics")}
        >
          <TrendingUp className="icon" />
          <span className="item-text">Services Analytics</span>
        </button>
         <button
          className="list-group-item"
          onClick={() => navigate("/elwallet-analytics")}
        >
          <Activity className="icon" />
          <span className="item-text">e-Wallet Analytics</span>
        </button>
          <button
          className="list-group-item"
          onClick={() => navigate("/elwallet-onboarding")}
        >
          <Activity className="icon" />
          <span className="item-text">e-Wallet On Boarding</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
