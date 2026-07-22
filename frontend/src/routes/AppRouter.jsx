import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "../layouts/AppLayout.jsx";

import HistoricalMonitoringPage from "../pages/HistoricalMonitoringPage.jsx";
import LiveOperationsDashboardPage from "../pages/LiveOperationsDashboardPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import SocketTestPage from "../pages/SocketTestPage.jsx";
import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";

import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "./ProtectedRoute.jsx";

function AppRouter() {
  return (
    <Routes>
      {/*
       * Public routes.
       *
       * An authenticated user should not return to the
       * login page.
       */}
      <Route
        element={
          <PublicOnlyRoute />
        }
      >
        <Route
          path="/login"
          element={
            <LoginPage />
          }
        />
      </Route>

      {/*
       * Protected health manager routes.
       */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              "health_manager",
            ]}
          />
        }
      >
        {/*
         * AppLayout contains the shared navigation and renders
         * child pages through React Router's Outlet.
         */}
        <Route
          element={
            <AppLayout />
          }
        >
          <Route
            path="/dashboard"
            element={
              <LiveOperationsDashboardPage />
            }
          />

          <Route
            path="/history"
            element={
              <HistoricalMonitoringPage />
            }
          />

          {/*
           * Keep the Socket.IO test page available during
           * development and integration testing.
           */}
          <Route
            path="/socket-test"
            element={
              <SocketTestPage />
            }
          />
        </Route>
      </Route>

      <Route
        path="/unauthorized"
        element={
          <UnauthorizedPage />
        }
      />

      {/*
       * Default application route.
       */}
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />
    </Routes>
  );
}

export default AppRouter;