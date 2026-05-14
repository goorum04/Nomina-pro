// App.jsx - ORX NÓMINA Frontend
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

// ============ COMPONENTE PRINCIPAL ============
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setCurrentUser(JSON.parse(localStorage.getItem('user')));
      setCurrentPage('dashboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {currentUser ? (
        <Dashboard 
          user={currentUser} 
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            setCurrentPage('login');
          }}
        />
      ) : (
        <AuthPage onLogin={setCurrentUser} onSwitchPage={setCurrentPage} currentPage={currentPage} />
      )}
    </div>
  );
}

// ============ PÁGINA DE AUTENTICACIÓN ============
function AuthPage({ onLogin, onSwitchPage, currentPage }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    name: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (error) {
      alert('Error: ' + error.response?.data?.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: formData.email,
        password: formData.password,
        company_name: formData.company_name,
        name: formData.name
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (error) {
      alert('Error: ' + error.response?.data?.error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">ORX</h1>
        <h2 className="text-center text-gray-600 mb-8">Gestión Integral de Nóminas</h2>

        {currentPage === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Iniciar Sesión
            </button>
            <p className="text-center text-gray-600">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => onSwitchPage('register')}
                className="text-blue-600 hover:underline"
              >
                Regístrate aquí
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre de empresa"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Tu nombre"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Crear Cuenta
            </button>
            <p className="text-center text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => onSwitchPage('login')}
                className="text-blue-600 hover:underline"
              >
                Inicia sesión aquí
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ============ DASHBOARD PRINCIPAL ============
function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (activePage === 'employees') {
      loadEmployees();
    }
  }, [activePage]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      alert('Error al cargar empleados');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">ORX Nómina</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Bienvenido, {user.email}</span>
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg">
          <div className="p-6 space-y-4">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activePage === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActivePage('employees')}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activePage === 'employees'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              👥 Empleados
            </button>
            <button
              onClick={() => setActivePage('payroll')}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activePage === 'payroll'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              💰 Nóminas
            </button>
            <button
              onClick={() => setActivePage('reports')}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activePage === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              📈 Reportes
            </button>
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 p-8">
          {activePage === 'dashboard' && <DashboardView token={token} />}
          {activePage === 'employees' && (
            <EmployeesView employees={employees} loading={loading} onRefresh={loadEmployees} token={token} />
          )}
          {activePage === 'payroll' && <PayrollView token={token} />}
          {activePage === 'reports' && <ReportsView token={token} />}
        </main>
      </div>
    </div>
  );
}

// ============ VISTA: DASHBOARD ============
function DashboardView({ token }) {
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setDashData(res.data));
  }, [token]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Total Empleados</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">{dashData?.totalEmployees || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Nómina Mensual</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">€{dashData?.totalMonthlyPayroll?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Estado CASS</h3>
          <p className="text-lg font-semibold text-yellow-600 mt-2">Configurando...</p>
        </div>
      </div>
    </div>
  );
}

// ============ VISTA: EMPLEADOS ============
function EmployeesView({ employees, loading, onRefresh, token }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nif: '',
    hire_date: '',
    position: '',
    salary_base: '',
    bank_account: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/employees`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({
        first_name: '', last_name: '', nif: '', hire_date: '',
        position: '', salary_base: '', bank_account: ''
      });
      onRefresh();
    } catch (error) {
      alert('Error al crear empleado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Gestión de Empleados</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nuevo Empleado
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">NIF</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Posición</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Salario</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{emp.first_name} {emp.last_name}</td>
                  <td className="px-6 py-3">{emp.nif}</td>
                  <td className="px-6 py-3">{emp.position}</td>
                  <td className="px-6 py-3">€{emp.salary_base}</td>
                  <td className="px-6 py-3">
                    <button className="text-blue-600 hover:underline mr-4">Editar</button>
                    <button className="text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-xl font-bold mb-4">Nuevo Empleado</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Apellido"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="NIF"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.nif}
              onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
              required
            />
            <input
              type="date"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Posición"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Salario Base"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.salary_base}
              onChange={(e) => setFormData({ ...formData, salary_base: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Cuenta Bancaria"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Empleado
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============ VISTA: NÓMINAS ============
function PayrollView({ token }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrolls, setPayrolls] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/payrolls/${month}/${year}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setPayrolls(res.data));
  }, [month, year, token]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Nóminas</h2>
        <div className="flex gap-4">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>Mes {m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Empleado</th>
              <th className="px-6 py-3 text-left">Bruto</th>
              <th className="px-6 py-3 text-left">CASS</th>
              <th className="px-6 py-3 text-left">IRPF</th>
              <th className="px-6 py-3 text-left">Neto</th>
              <th className="px-6 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{p.first_name} {p.last_name}</td>
                <td className="px-6 py-3">€{(p.salary_base + p.complements).toFixed(2)}</td>
                <td className="px-6 py-3">€{p.cass_employee.toFixed(2)}</td>
                <td className="px-6 py-3">€{p.irpf.toFixed(2)}</td>
                <td className="px-6 py-3 font-bold text-green-600">€{p.net_salary.toFixed(2)}</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ VISTA: REPORTES ============
function ReportsView({ token }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Reportes</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Los reportes avanzados estarán disponibles próximamente.</p>
      </div>
    </div>
  );
}

// ============ COMPONENTE: MODAL ============
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <button
          onClick={onClose}
          className="float-right text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
