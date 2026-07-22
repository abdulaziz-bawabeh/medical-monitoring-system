import { Link } from "react-router-dom";

function UnauthorizedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f4f8fb",
        color: "#17384a",
      }}
    >
      <section style={{ textAlign: "center" }}>
        <h1>Access denied</h1>

        <p>You do not have permission to access this page.</p>

        <Link to="/dashboard">Return to dashboard</Link>
      </section>
    </main>
  );
}

export default UnauthorizedPage;