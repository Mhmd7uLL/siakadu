import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Dashboard</h1>

      <Link to="/">
        <button style={{ marginTop: "20px" }}>Keluar</button>
      </Link>
    </div>
  );
}

export default Dashboard;