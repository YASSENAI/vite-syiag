import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import { LogOut, User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useApp();

  if (!currentUser) return null;

  return (
    <nav className="glass-panel" style={{
      margin: '1rem',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '16px',
      position: 'sticky',
      top: '1rem',
      zIndex: 100
    }}>
      <div className="flex-center" style={{ gap: '1rem' }}>
        <h3 className="text-gold" style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Siyaj Perfumes</h3>
        <span className="badge badge-gold" style={{ marginLeft: '1rem' }}>
          {currentUser.role.toUpperCase()}
        </span>
      </div>

      <div className="flex-center" style={{ gap: '1.5rem' }}>
        <div className="flex-center text-muted" style={{ gap: '0.5rem' }}>
          <UserIcon size={18} />
          <span>{currentUser.name}</span>
        </div>
        <button onClick={logout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  const { currentUser } = useApp();

  return (
    <>
      {currentUser && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={!currentUser ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            !currentUser ? <Navigate to="/login" /> :
              currentUser.role === 'manager' ? <ManagerDashboard /> :
                <EmployeeDashboard />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

useEffect(() => {
  addDoc(collection(db, "test_connection"), {
    status: "connected",
    time: new Date()
  });
}, []);
export default App;
