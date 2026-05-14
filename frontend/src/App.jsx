import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Cálculos CASS e IRPF Andorra 2026
const calcCASS = (base) => ({
  employee: Math.round(base * 0.061 * 100) / 100,
  employer: Math.round(base * 0.085 * 100) / 100,
})

// IRPF Andorra 2026: 0% hasta 24.000€/año | 5% de 24.001€ a 40.000€ | 10% desde 40.001€
// Se calcula sobre base anual (mensual × 12) y se retiene 1/12 cada mes
const calcIRPF = (monthlyBase, cassEmployee) => {
  const monthlyTaxable = monthlyBase - cassEmployee
  const annualTaxable = monthlyTaxable * 12
  let annualIRPF = 0
  if (annualTaxable <= 24000) {
    annualIRPF = 0
  } else if (annualTaxable <= 40000) {
    annualIRPF = (annualTaxable - 24000) * 0.05
  } else {
    annualIRPF = (40000 - 24000) * 0.05 + (annualTaxable - 40000) * 0.10
  }
  return Math.round((annualIRPF / 12) * 100) / 100
}

export default function App() {
  const [session, setSession] = useState(null)
  const [company, setCompany] = useState(null)
  const [page, setPage] = useState('login')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadCompany(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadCompany(session.user.id)
      else { setCompany(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadCompany = async (userId) => {
    const { data } = await supabase
      .from('orx_companies')
      .select('*')
      .eq('owner_id', userId)
      .single()
    setCompany(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-gray-500 text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {session && company ? (
        <Dashboard
          user={session.user}
          company={company}
          onLogout={async () => {
            await supabase.auth.signOut()
            setSession(null)
            setCompany(null)
          }}
        />
      ) : (
        <AuthPage onCompany={setCompany} page={page} setPage={setPage} />
      )}
    </div>
  )
}

// ============ AUTENTICACIÓN ============
function AuthPage({ onCompany, page, setPage }) {
  const [form, setForm] = useState({ email: '', password: '', company_name: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) setError(error.message)
    setSubmitting(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { setError(error.message); setSubmitting(false); return }
    const { data: company, error: compErr } = await supabase
      .from('orx_companies')
      .insert({ name: form.company_name, owner_id: data.user.id })
      .select()
      .single()
    if (compErr) { setError(compErr.message); setSubmitting(false); return }
    onCompany(company)
    setSubmitting(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">ORX</h1>
        <h2 className="text-center text-gray-600 mb-8">Gestión Integral de Nóminas</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {page === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Contraseña" required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50">
              {submitting ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
            <p className="text-center text-gray-600 text-sm">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => setPage('register')} className="text-blue-600 hover:underline">
                Regístrate aquí
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input type="text" placeholder="Nombre de empresa" required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
            <input type="email" placeholder="Email" required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50">
              {submitting ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
            <p className="text-center text-gray-600 text-sm">
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => setPage('login')} className="text-blue-600 hover:underline">
                Inicia sesión aquí
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

// ============ DASHBOARD PRINCIPAL ============
function Dashboard({ user, company, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')

  const navItems = [
    ['dashboard', '📊 Dashboard'],
    ['employees', '👥 Empleados'],
    ['payroll', '💰 Nóminas'],
    ['reports', '📈 Reportes'],
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">ORX Nómina</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">{company.name} · {user.email}</span>
            <button onClick={onLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-60 bg-white shadow-lg min-h-screen">
          <div className="p-4 space-y-1 pt-6">
            {navItems.map(([key, label]) => (
              <button key={key} onClick={() => setActivePage(key)}
                className={`w-full text-left px-4 py-2 rounded-lg transition text-sm font-medium ${
                  activePage === key ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-8">
          {activePage === 'dashboard' && <DashboardView company={company} />}
          {activePage === 'employees' && <EmployeesView company={company} />}
          {activePage === 'payroll' && <PayrollView company={company} />}
          {activePage === 'reports' && <ReportsView />}
        </main>
      </div>
    </div>
  )
}

// ============ VISTA DASHBOARD ============
function DashboardView({ company }) {
  const [stats, setStats] = useState({ employees: 0, payroll: 0, cass: 0 })

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from('orx_employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active')

      const { data: payrolls } = await supabase
        .from('orx_payrolls')
        .select('net_salary, cass_employer, orx_employees!inner(company_id)')
        .eq('orx_employees.company_id', company.id)
        .eq('status', 'approved')

      const totalPayroll = payrolls?.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0) || 0
      const totalCass = payrolls?.reduce((s, p) => s + parseFloat(p.cass_employer || 0), 0) || 0

      setStats({ employees: count || 0, payroll: totalPayroll, cass: totalCass })
    }
    load()
  }, [company.id])

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Empleados" value={stats.employees} color="text-blue-600" />
        <StatCard label="Nómina Neta Aprobada" value={`€${stats.payroll.toFixed(2)}`} color="text-green-600" />
        <StatCard label="CASS Patronal Aprobada" value={`€${stats.cass.toFixed(2)}`} color="text-yellow-600" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Tasas CASS Andorra 2024</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 rounded p-3">
            <p className="text-gray-500">Cotización Obrera</p>
            <p className="text-2xl font-bold text-blue-600">6.1%</p>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="text-gray-500">Cotización Patronal</p>
            <p className="text-2xl font-bold text-orange-600">8.5%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-gray-500 text-sm font-semibold">{label}</h3>
      <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  )
}

// ============ VISTA EMPLEADOS ============
function EmployeesView({ company }) {
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', nif: '', hire_date: '', position: '', salary_base: '', bank_account: '' })
  const [error, setError] = useState('')

  useEffect(() => { loadEmployees() }, [])

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('orx_employees')
      .select('*')
      .eq('company_id', company.id)
      .order('last_name')
    setEmployees(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('orx_employees').insert({
      ...form,
      company_id: company.id,
      salary_base: parseFloat(form.salary_base),
    })
    if (error) { setError(error.message); return }
    setShowModal(false)
    setForm({ first_name: '', last_name: '', nif: '', hire_date: '', position: '', salary_base: '', bank_account: '' })
    loadEmployees()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este empleado?')) return
    await supabase.from('orx_employees').delete().eq('id', id)
    loadEmployees()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Empleados</h2>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
          + Nuevo Empleado
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              {['Nombre', 'NIF', 'Posición', 'Salario Base', 'Acciones'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{emp.first_name} {emp.last_name}</td>
                <td className="px-6 py-3 text-gray-500">{emp.nif}</td>
                <td className="px-6 py-3">{emp.position}</td>
                <td className="px-6 py-3 font-semibold">€{Number(emp.salary_base).toLocaleString('es')}</td>
                <td className="px-6 py-3">
                  <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:underline text-sm">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No hay empleados. Añade el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setError('') }}>
          <h3 className="text-xl font-bold mb-4">Nuevo Empleado</h3>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Nombre" required
                className="px-4 py-2 border rounded-lg w-full"
                value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              <input type="text" placeholder="Apellido" required
                className="px-4 py-2 border rounded-lg w-full"
                value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <input type="text" placeholder="NIF" required
              className="w-full px-4 py-2 border rounded-lg"
              value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} />
            <input type="date" required
              className="w-full px-4 py-2 border rounded-lg"
              value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
            <input type="text" placeholder="Posición" required
              className="w-full px-4 py-2 border rounded-lg"
              value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            <input type="number" placeholder="Salario Base (€)" required min="0" step="0.01"
              className="w-full px-4 py-2 border rounded-lg"
              value={form.salary_base} onChange={e => setForm({ ...form, salary_base: e.target.value })} />
            <input type="text" placeholder="IBAN (opcional)"
              className="w-full px-4 py-2 border rounded-lg"
              value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} />
            <button type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold">
              Crear Empleado
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ============ VISTA NÓMINAS ============
function PayrollView({ company }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [payrolls, setPayrolls] = useState([])
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [genForm, setGenForm] = useState({ employee_id: '', complements: '' })
  const [preview, setPreview] = useState(null)

  useEffect(() => { loadPayrolls() }, [month, year])
  useEffect(() => {
    supabase.from('orx_employees').select('id,first_name,last_name,salary_base')
      .eq('company_id', company.id).eq('status', 'active')
      .then(({ data }) => setEmployees(data || []))
  }, [])

  const loadPayrolls = async () => {
    const { data } = await supabase
      .from('orx_payrolls')
      .select('*, orx_employees(first_name, last_name)')
      .eq('month', month)
      .eq('year', year)
      .order('created_at')
    setPayrolls(data || [])
  }

  const handleEmployeeChange = (empId) => {
    setGenForm({ ...genForm, employee_id: empId, complements: '' })
    setPreview(null)
  }

  const calcPreview = () => {
    const emp = employees.find(e => e.id === genForm.employee_id)
    if (!emp) return
    const total = parseFloat(emp.salary_base) + parseFloat(genForm.complements || 0)
    const cass = calcCASS(total)
    const irpf = calcIRPF(total, cass.employee)
    const net = total - cass.employee - irpf
    setPreview({ total, cass, irpf, net, emp })
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!preview) return
    await supabase.from('orx_payrolls').upsert({
      employee_id: genForm.employee_id, month, year,
      salary_base: preview.emp.salary_base,
      complements: parseFloat(genForm.complements || 0),
      cass_employee: preview.cass.employee,
      cass_employer: preview.cass.employer,
      irpf: preview.irpf,
      net_salary: preview.net,
      status: 'draft',
    })
    setShowModal(false)
    setPreview(null)
    setGenForm({ employee_id: '', complements: '' })
    loadPayrolls()
  }

  const handleApprove = async (id) => {
    await supabase.from('orx_payrolls').update({ status: 'approved' }).eq('id', id)
    loadPayrolls()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Nóminas</h2>
        <div className="flex gap-3 flex-wrap">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg">
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
              .map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Generar Nómina
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              {['Empleado', 'Bruto', 'CASS (6.1%)', 'IRPF', 'Neto', 'Estado', ''].map(h => (
                <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payrolls.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{p.orx_employees?.first_name} {p.orx_employees?.last_name}</td>
                <td className="px-6 py-3">€{(parseFloat(p.salary_base) + parseFloat(p.complements)).toFixed(2)}</td>
                <td className="px-6 py-3">€{parseFloat(p.cass_employee).toFixed(2)}</td>
                <td className="px-6 py-3">€{parseFloat(p.irpf).toFixed(2)}</td>
                <td className="px-6 py-3 font-bold text-green-600">€{parseFloat(p.net_salary).toFixed(2)}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>{p.status === 'approved' ? 'Aprobada' : 'Borrador'}</span>
                </td>
                <td className="px-6 py-3">
                  {p.status === 'draft' && (
                    <button onClick={() => handleApprove(p.id)}
                      className="text-blue-600 hover:underline text-sm">Aprobar</button>
                  )}
                </td>
              </tr>
            ))}
            {payrolls.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  No hay nóminas para este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setPreview(null) }}>
          <h3 className="text-xl font-bold mb-4">Generar Nómina</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <select required value={genForm.employee_id}
              onChange={e => handleEmployeeChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg">
              <option value="">Seleccionar empleado...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} — €{Number(emp.salary_base).toLocaleString('es')}
                </option>
              ))}
            </select>
            <input type="number" placeholder="Complementos €" min="0" step="0.01"
              className="w-full px-4 py-2 border rounded-lg"
              value={genForm.complements} onChange={e => { setGenForm({ ...genForm, complements: e.target.value }); setPreview(null) }} />
            <button type="button" onClick={calcPreview}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Calcular Preview
            </button>
            {preview && (
              <div className="bg-blue-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between"><span>Salario Bruto</span><span className="font-semibold">€{preview.total.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-600"><span>CASS obrera (6.1%)</span><span>-€{preview.cass.employee.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-600"><span>IRPF</span><span>-€{preview.irpf.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-green-700 border-t pt-1 mt-1"><span>Salario Neto</span><span>€{preview.net.toFixed(2)}</span></div>
                <div className="flex justify-between text-orange-600 text-xs pt-1"><span>CASS patronal (8.5%)</span><span>€{preview.cass.employer.toFixed(2)}</span></div>
              </div>
            )}
            <button type="submit" disabled={!preview}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-40">
              Guardar Nómina
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ============ VISTA REPORTES ============
function ReportsView() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Reportes</h2>
      <div className="bg-white rounded-lg shadow p-6 text-gray-500">
        Reportes avanzados disponibles próximamente.
      </div>
    </div>
  )
}

// ============ MODAL ============
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
