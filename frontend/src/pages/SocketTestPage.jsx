import { useEffect } from "react";

import { useMedicalStreamStore } from "../stores/medicalStreamStore.js";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#f4f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  card: {
    padding: "24px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)",
  },

  button: {
    padding: "12px 20px",
    marginRight: "10px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
  },

  code: {
    padding: "16px",
    overflowX: "auto",
    borderRadius: "8px",
    background: "#111827",
    color: "#f9fafb",
  },

  error: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#991b1b",
  },
};

function SocketTestPage() {
  const connectionStatus = useMedicalStreamStore(
    (state) => state.connectionStatus,
  );

  const socketId = useMedicalStreamStore(
    (state) => state.socketId,
  );

  const connectionMessage = useMedicalStreamStore(
    (state) => state.connectionMessage,
  );

  const lastReading = useMedicalStreamStore(
    (state) => state.lastReading,
  );

  const lastAcknowledgement = useMedicalStreamStore(
    (state) => state.lastAcknowledgement,
  );

  const error = useMedicalStreamStore(
    (state) => state.error,
  );

  const connect = useMedicalStreamStore(
    (state) => state.connect,
  );

  const disconnect = useMedicalStreamStore(
    (state) => state.disconnect,
  );

  const sendTestReading = useMedicalStreamStore(
    (state) => state.sendTestReading,
  );

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const isConnected = connectionStatus === "connected";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1>Medical Stream Socket.IO Test</h1>

        {error && <div style={styles.error}>{error}</div>}

        <section style={styles.card}>
          <h2>Connection status</h2>

          <p>
            Status: <strong>{connectionStatus}</strong>
          </p>

          <p>
            Socket ID: <strong>{socketId || "Not connected"}</strong>
          </p>

          <p>
            Message:{" "}
            <strong>
              {connectionMessage || "Waiting for server"}
            </strong>
          </p>

          <button
            type="button"
            style={{
              ...styles.button,
              background: "#2563eb",
              color: "#ffffff",
            }}
            onClick={connect}
          >
            Connect
          </button>

          <button
            type="button"
            style={{
              ...styles.button,
              background: "#64748b",
              color: "#ffffff",
            }}
            onClick={disconnect}
          >
            Disconnect
          </button>
        </section>

        <section style={styles.card}>
          <h2>Send test medical reading</h2>

          <button
            type="button"
            style={{
              ...styles.button,
              background: isConnected ? "#059669" : "#9ca3af",
              color: "#ffffff",
              cursor: isConnected ? "pointer" : "not-allowed",
            }}
            onClick={sendTestReading}
            disabled={!isConnected}
          >
            Send Reading
          </button>
        </section>

        <section style={styles.card}>
          <h2>Server acknowledgement</h2>

          <pre style={styles.code}>
            {lastAcknowledgement
              ? JSON.stringify(lastAcknowledgement, null, 2)
              : "No acknowledgement received yet."}
          </pre>
        </section>

        <section style={styles.card}>
          <h2>Confirmed medical reading</h2>

          <pre style={styles.code}>
            {lastReading
              ? JSON.stringify(lastReading, null, 2)
              : "No confirmed reading received yet."}
          </pre>
        </section>
      </div>
    </main>
  );
}

export default SocketTestPage;