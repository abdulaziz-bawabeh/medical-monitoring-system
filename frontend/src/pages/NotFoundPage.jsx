import { Link } from "react-router-dom";

function NotFoundPage() {
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
        <h1>Page not found</h1>

        <p>The requested page does not exist.</p>

        <Link to="/dashboard">Return to dashboard</Link>
      </section>
    </main>
  );
}

export default NotFoundPage;