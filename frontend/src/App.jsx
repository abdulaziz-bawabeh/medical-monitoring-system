import { useEffect } from "react";

import AppRouter from "./routes/AppRouter.jsx";

import {
  useSocketLifecycle,
} from "./hooks/useSocketLifecycle.js";

import {
  useAuthStore,
} from "./stores/authStore.js";

function App() {
  const initializeSession =
    useAuthStore(
      (state) =>
        state.initializeSession,
    );

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  /*
   * The Hook decides whether Socket.IO should
   * connect based on Authentication status.
   */
  useSocketLifecycle();

  return <AppRouter />;
}

export default App;