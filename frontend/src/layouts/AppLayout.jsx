import {
    useEffect,
    useState,
  } from "react";
  
  import {
    Activity,
    FlaskConical,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    Radio,
    Wifi,
    WifiOff,
    X,
  } from "lucide-react";
  
  import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
  } from "react-router-dom";
  
  import {
    useAuthStore,
  } from "../stores/authStore.js";
  
  import {
    useLiveOperationsStore,
  } from "../stores/liveOperationsStore.js";
  
  import "../styles/app-layout.css";
  
  const navigationItems = [
    {
      to: "/dashboard",
      label: "Live Operations",
      icon: LayoutDashboard,
    },
    {
      to: "/history",
      label: "Historical Monitoring",
      icon: History,
    },
    {
      to: "/socket-test",
      label: "Connection Test",
      icon: FlaskConical,
    },
  ];
  
  function AppLayout() {
    const navigate =
      useNavigate();
  
    const location =
      useLocation();
  
    const [
      isSidebarOpen,
      setIsSidebarOpen,
    ] = useState(false);
  
    const user =
      useAuthStore(
        (state) => state.user,
      );
  
    const logout =
      useAuthStore(
        (state) => state.logout,
      );
  
    const authenticationStatus =
      useAuthStore(
        (state) => state.status,
      );
  
    const connectionStatus =
      useLiveOperationsStore(
        (state) =>
          state.connectionStatus,
      );
  
    useEffect(() => {
      setIsSidebarOpen(false);
    }, [location.pathname]);
  
    async function handleLogout() {
      await logout();
  
      navigate("/login", {
        replace: true,
      });
    }
  
    const isConnected =
      connectionStatus ===
      "connected";
  
    const isConnecting =
      connectionStatus ===
        "connecting" ||
      connectionStatus ===
        "reconnecting";
  
    const ConnectionIcon =
      isConnected
        ? Wifi
        : isConnecting
          ? Radio
          : WifiOff;
  
    return (
      <div className="app-shell">
        <aside
          className={`app-sidebar ${
            isSidebarOpen
              ? "app-sidebar--open"
              : ""
          }`}
        >
          <div className="app-sidebar__brand">
            <div className="app-sidebar__brand-icon">
              <Activity size={25} />
            </div>
  
            <div>
              <strong>MedResponse</strong>
              <span>
                Medical Operations
              </span>
            </div>
  
            <button
              type="button"
              className="app-sidebar__close"
              onClick={() =>
                setIsSidebarOpen(false)
              }
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>
  
          <nav className="app-sidebar__navigation">
            <span className="app-sidebar__section-label">
              Operations
            </span>
  
            {navigationItems.map(
              ({
                to,
                label,
                icon: Icon,
              }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/dashboard"}
                  className={({
                    isActive,
                  }) =>
                    `app-sidebar__link ${
                      isActive
                        ? "app-sidebar__link--active"
                        : ""
                    }`
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              ),
            )}
          </nav>
  
          <div className="app-sidebar__connection">
            <div
              className={`app-sidebar__connection-icon ${
                isConnected
                  ? "app-sidebar__connection-icon--connected"
                  : ""
              }`}
            >
              <ConnectionIcon size={18} />
            </div>
  
            <div>
              <span>Live connection</span>
  
              <strong>
                {isConnected
                  ? "Connected"
                  : isConnecting
                    ? "Connecting"
                    : "Disconnected"}
              </strong>
            </div>
          </div>
  
          <div className="app-sidebar__user">
            <div className="app-sidebar__avatar">
              {user?.fullName
                ?.charAt(0)
                ?.toUpperCase() ??
                "H"}
            </div>
  
            <div className="app-sidebar__user-info">
              <strong>
                {user?.fullName}
              </strong>
  
              <span>
                Health Manager
              </span>
            </div>
  
            <button
              type="button"
              className="app-sidebar__logout"
              onClick={handleLogout}
              disabled={
                authenticationStatus ===
                "signing_out"
              }
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>
  
        {isSidebarOpen && (
          <button
            type="button"
            className="app-sidebar-overlay"
            onClick={() =>
              setIsSidebarOpen(false)
            }
            aria-label="Close sidebar"
          />
        )}
  
        <div className="app-main">
          <header className="app-header">
            <button
              type="button"
              className="app-header__menu"
              onClick={() =>
                setIsSidebarOpen(true)
              }
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
  
            <div>
              <strong>
                Interactive Medical Monitoring
              </strong>
  
              <span>
                Secure Operations Environment
              </span>
            </div>
  
            <div
              className={`app-header__connection ${
                isConnected
                  ? "app-header__connection--connected"
                  : ""
              }`}
            >
              <span />
              {isConnected
                ? "Live"
                : isConnecting
                  ? "Connecting"
                  : "Offline"}
            </div>
          </header>
  
          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }
  
  export default AppLayout;