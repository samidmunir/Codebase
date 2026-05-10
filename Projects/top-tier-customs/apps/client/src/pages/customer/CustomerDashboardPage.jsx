import { useAuth } from "../../context/AuthContext";

const CustomerDashboardPage = () => {
  const { user } = useAuth();
  return (
    <main>
      <header>
        <h1>Welcome to your protected dashboard</h1>
      </header>
      <section>
        <h2>
          {user?.firstName} {user?.lastName}
        </h2>
      </section>
    </main>
  );
};

export default CustomerDashboardPage;
