import {
    Navigate,
    Outlet,
    useLocation,
  } from "react-router-dom";
  
  import { useAuthStore } from "../stores/authStore";
  
  function AuthenticationLoadingScreen() {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f8fb",
          color: "#17384a",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              margin: "0 auto 16px",
              border: "4px solid #d7e8e7",
              borderTopColor: "#158c83",
              borderRadius: "50%",
              animation:
                "auth-loading-spin 800ms linear infinite",
            }}
          />
  
          <strong>
            Verifying secure session...
          </strong>
  
          <style>
            {`
              @keyframes auth-loading-spin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          </style>
        </div>
      </main>
    );
  }
  
  export function ProtectedRoute({
    allowedRoles = [],
  }) {
    const location = useLocation();
  
    const user = useAuthStore(
      (state) => state.user,
    );
  
    const status = useAuthStore(
      (state) => state.status,
    );
  
    const hasCheckedSession =
      useAuthStore(
        (state) =>
          state.hasCheckedSession,
      );
  
    if (
      !hasCheckedSession ||
      status === "checking"
    ) {
      return (
        <AuthenticationLoadingScreen />
      );
    }
  
    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
          state={{
            from: location,
          }}
        />
      );
    }
  
    if (
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
    ) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }
  
    return <Outlet />;
  }
  
  export function PublicOnlyRoute() {
    const user = useAuthStore(
      (state) => state.user,
    );
  
    const status = useAuthStore(
      (state) => state.status,
    );
  
    const hasCheckedSession =
      useAuthStore(
        (state) =>
          state.hasCheckedSession,
      );
  
    if (
      !hasCheckedSession ||
      status === "checking"
    ) {
      return (
        <AuthenticationLoadingScreen />
      );
    }
  
    if (user) {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }
  
    return <Outlet />;
  }
  
  export default ProtectedRoute;