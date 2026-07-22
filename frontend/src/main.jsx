import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

/*
 * Leaflet base styles.
 * Without this file, map tiles and controls will not render correctly.
 */
import "leaflet/dist/leaflet.css";

/*
 * Marker clustering styles.
 * Version 4 requires these imports to be added manually.
 */
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import App from "./App.jsx";
import "./index.css";

createRoot(
  document.getElementById("root"),
).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);