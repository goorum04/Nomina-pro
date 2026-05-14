import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ─── Cálculos fiscales Andorra 2026 ───────────────────────────────────────────
const calcCASS = (base) => ({
  employee: Math.round(base * 0.061 * 100) / 100,
  employer: Math.round(base * 0.085 * 100) / 100,
})

const calcIRPF = (monthlyBase, cassEmployee) => {
  const monthlyTaxable = monthlyBase - cassEmployee
  const annual = monthlyTaxable * 12
  let annualIRPF = 0
  if (annual <= 24000) annualIRPF = 0
  else if (annual <= 40000) annualIRPF = (annual - 24000) * 0.05
  else annualIRPF = (40000 - 24000) * 0.05 + (annual - 40000) * 0.10
  return Math.round((annualIRPF / 12) * 100) / 100
}

const fmt = (n) => Number(n).toLocaleString('es-AD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Iconos SVG ───────────────────────────────────────────────────────────────
const Icon = {
  dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>,
  employees: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  payroll: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  reports: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  logout: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  plus: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  euro: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  users: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  shield: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  check: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  building: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  trash: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── App Root ─────────────────────────────────────────────────────────────────
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) loadCompany(session.user.id)
      else { setCompany(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadCompany = async (userId) => {
    const { data } = await supabase.from('orx_companies').select('*').eq('owner_id', userId).single()
    setCompany(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  )

  return session && company
    ? <Dashboard user={session.user} company={company} onLogout={async () => { await supabase.auth.signOut() }} />
    : <AuthPage onCompany={setCompany} page={page} setPage={setPage} />
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({ onCompany, page, setPage }) {
  const [form, setForm] = useState({ email: '', password: '', company_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: company, error: cErr } = await supabase.from('orx_companies').insert({ name: form.company_name, owner_id: data.user.id }).select().single()
    if (cErr) { setError(cErr.message); setLoading(false); return }
    onCompany(company)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            {Icon.building}
          </div>
          <span className="text-white font-bold text-xl tracking-wide">ORX Nómina</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestión de nóminas<br />para Andorra.
          </h1>
          <p className="text-indigo-200 text-lg mb-8">CASS e IRPF calculados automáticamente según la normativa andorrana 2026.</p>
          <div className="space-y-3">
            {['Cálculo automático CASS 6.1% / 8.5%', 'IRPF Andorra 2026 actualizado', 'Dashboard con métricas en tiempo real'].map(f => (
              <div key={f} className="flex items-center gap-3 text-indigo-100">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">{Icon.check}</div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-sm">© 2026 ORX Nómina · Andorra</p>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">{Icon.building}</div>
            <span className="text-white font-bold text-lg">ORX Nómina</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {page === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
          </h2>
          <p className="text-slate-400 mb-8 text-sm">
            {page === 'login' ? 'Accede a tu panel de gestión' : 'Empieza a gestionar tus nóminas'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={page === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {page === 'register' && (
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre de empresa</label>
                <input type="text" required placeholder="Empresa SL"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" required placeholder="tu@empresa.ad"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input type="password" required placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 mt-2">
              {loading ? 'Cargando...' : page === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            {page === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button onClick={() => { setPage(page === 'login' ? 'register' : 'login'); setError('') }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition">
              {page === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
function Dashboard({ user, company, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
    { key: 'employees', label: 'Empleados', icon: Icon.employees },
    { key: 'payroll', label: 'Nóminas', icon: Icon.payroll },
    { key: 'reports', label: 'Reportes', icon: Icon.reports },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{company.name}</p>
              <p className="text-slate-500 text-xs">ORX Nómina 2026</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActivePage(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activePage === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {icon}
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition">
            {Icon.logout}
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        {activePage === 'dashboard' && <DashboardView company={company} />}
        {activePage === 'employees' && <EmployeesView company={company} />}
        {activePage === 'payroll' && <PayrollView company={company} />}
        {activePage === 'reports' && <ReportsView company={company} />}
      </main>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ company }) {
  const [stats, setStats] = useState({ employees: 0, payroll: 0, cass: 0, irpf: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from('orx_employees').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active')
      const { data } = await supabase.from('orx_payrolls').select('net_salary, cass_employer, irpf, orx_employees!inner(company_id)').eq('orx_employees.company_id', company.id).eq('status', 'approved')
      const totalPayroll = data?.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0) || 0
      const totalCass = data?.reduce((s, p) => s + parseFloat(p.cass_employer || 0), 0) || 0
      const totalIRPF = data?.reduce((s, p) => s + parseFloat(p.irpf || 0), 0) || 0
      setStats({ employees: count || 0, payroll: totalPayroll, cass: totalCass, irpf: totalIRPF })

      const { data: emp } = await supabase.from('orx_employees').select('first_name,last_name,position,salary_base').eq('company_id', company.id).eq('status', 'active').order('salary_base', { ascending: false }).limit(5)
      setRecent(emp || [])
    }
    load()
  }, [company.id])

  const cards = [
    { label: 'Empleados activos', value: stats.employees, icon: Icon.users, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-600' },
    { label: 'Masa salarial neta', value: `€${fmt(stats.payroll)}`, icon: Icon.euro, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'CASS patronal', value: `€${fmt(stats.cass)}`, icon: Icon.shield, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-600' },
    { label: 'IRPF retenido', value: `€${fmt(stats.irpf)}`, icon: Icon.reports, color: 'bg-rose-500', light: 'bg-rose-50 text-rose-600' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen acumulado de nóminas aprobadas</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map(({ label, value, icon, light }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${light}`}>{icon}</div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Top salarios */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Empleados por salario</h2>
          </div>
          <table className="w-full">
            <thead><tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empleado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Salario</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {recent.map((e, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {e.first_name[0]}{e.last_name[0]}
                      </div>
                      <span className="font-medium text-slate-700 text-sm">{e.first_name} {e.last_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-sm">{e.position}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-700 text-sm">€{fmt(e.salary_base)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info fiscal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Tasas fiscales 2026</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">CASS</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-violet-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-violet-700">Obrera</span>
                  <span className="font-bold text-violet-700">6,1%</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-amber-700">Patronal</span>
                  <span className="font-bold text-amber-700">8,5%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">IRPF (base anual)</p>
              <div className="space-y-2">
                {[['Hasta €24.000', '0%', 'bg-slate-50 text-slate-600'], ['€24.001 – €40.000', '5%', 'bg-blue-50 text-blue-700'], ['Más de €40.000', '10%', 'bg-indigo-50 text-indigo-700']].map(([label, rate, cls]) => (
                  <div key={label} className={`flex justify-between items-center rounded-xl px-4 py-2.5 ${cls}`}>
                    <span className="text-xs">{label}</span>
                    <span className="font-bold text-sm">{rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empleados ────────────────────────────────────────────────────────────────
function EmployeesView({ company }) {
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', nif: '', hire_date: '', position: '', salary_base: '', bank_account: '' })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('orx_employees').select('*').eq('company_id', company.id).order('last_name')
    setEmployees(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    const { error } = await supabase.from('orx_employees').insert({ ...form, company_id: company.id, salary_base: parseFloat(form.salary_base) })
    if (error) { setError(error.message); return }
    setShowModal(false)
    setForm({ first_name: '', last_name: '', nif: '', hire_date: '', position: '', salary_base: '', bank_account: '' })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este empleado? Se eliminarán también sus nóminas.')) return
    await supabase.from('orx_employees').delete().eq('id', id)
    load()
  }

  const colors = ['bg-violet-100 text-violet-700', 'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700']

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empleados</h1>
          <p className="text-slate-500 text-sm mt-1">{employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
          {Icon.plus} Nuevo empleado
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            {['Empleado', 'NIF', 'Cargo', 'Fecha alta', 'Salario bruto', 'Coste empresa', ''].map(h => (
              <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {employees.map((emp, i) => {
              const cass = calcCASS(parseFloat(emp.salary_base))
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-slate-400 text-xs">{emp.bank_account || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm font-mono">{emp.nif}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">{emp.position}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{emp.hire_date}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 text-sm">€{fmt(emp.salary_base)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">€{fmt(parseFloat(emp.salary_base) + cass.employer)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(emp.id)} className="text-slate-300 hover:text-rose-500 transition">{Icon.trash}</button>
                  </td>
                </tr>
              )
            })}
            {employees.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">No hay empleados. Añade el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setError('') }} title="Nuevo empleado">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" required><input type="text" placeholder="Marc" required className={input} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></Field>
              <Field label="Apellido" required><input type="text" placeholder="Vilarrubla" required className={input} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></Field>
            </div>
            <Field label="NIF"><input type="text" placeholder="F-123456-A" required className={input} value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de alta"><input type="date" required className={input} value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></Field>
              <Field label="Salario base (€)"><input type="number" placeholder="2500" required min="0" step="0.01" className={input} value={form.salary_base} onChange={e => setForm({ ...form, salary_base: e.target.value })} /></Field>
            </div>
            <Field label="Cargo"><input type="text" placeholder="Desarrollador" required className={input} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="IBAN (opcional)"><input type="text" placeholder="AD12 0001 2030..." className={input} value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} /></Field>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition mt-2">Crear empleado</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Nóminas ──────────────────────────────────────────────────────────────────
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
    supabase.from('orx_employees').select('id,first_name,last_name,salary_base').eq('company_id', company.id).eq('status', 'active').then(({ data }) => setEmployees(data || []))
  }, [])

  const loadPayrolls = async () => {
    const { data } = await supabase.from('orx_payrolls').select('*, orx_employees(first_name, last_name)').eq('month', month).eq('year', year).order('created_at')
    setPayrolls(data || [])
  }

  const calcPreview = () => {
    const emp = employees.find(e => e.id === genForm.employee_id)
    if (!emp) return
    const total = parseFloat(emp.salary_base) + parseFloat(genForm.complements || 0)
    const cass = calcCASS(total)
    const irpf = calcIRPF(total, cass.employee)
    setPreview({ total, cass, irpf, net: total - cass.employee - irpf, emp })
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!preview) return
    await supabase.from('orx_payrolls').upsert({
      employee_id: genForm.employee_id, month, year,
      salary_base: preview.emp.salary_base,
      complements: parseFloat(genForm.complements || 0),
      cass_employee: preview.cass.employee, cass_employer: preview.cass.employer,
      irpf: preview.irpf, net_salary: preview.net, status: 'draft',
    })
    setShowModal(false); setPreview(null); setGenForm({ employee_id: '', complements: '' })
    loadPayrolls()
  }

  const handleApprove = async (id) => {
    await supabase.from('orx_payrolls').update({ status: 'approved' }).eq('id', id)
    loadPayrolls()
  }

  const totals = payrolls.reduce((acc, p) => ({
    bruto: acc.bruto + parseFloat(p.salary_base) + parseFloat(p.complements),
    cass: acc.cass + parseFloat(p.cass_employee),
    irpf: acc.irpf + parseFloat(p.irpf),
    neto: acc.neto + parseFloat(p.net_salary),
  }), { bruto: 0, cass: 0, irpf: 0, neto: 0 })

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nóminas</h1>
          <p className="text-slate-500 text-sm mt-1">{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 shadow-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 shadow-sm">
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            {Icon.plus} Generar nómina
          </button>
        </div>
      </div>

      {/* Resumen mes */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[['Bruto total', totals.bruto, 'slate'], ['CASS obrera', totals.cass, 'violet'], ['IRPF', totals.irpf, 'rose'], ['Neto total', totals.neto, 'emerald']].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{l}</p>
              <p className={`text-xl font-bold mt-1 text-${c}-600`}>€{fmt(v)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            {['Empleado', 'Bruto', 'CASS 6,1%', 'IRPF', 'Neto', 'Estado', ''].map(h => (
              <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {payrolls.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-slate-700 text-sm">{p.orx_employees?.first_name} {p.orx_employees?.last_name}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">€{fmt(parseFloat(p.salary_base) + parseFloat(p.complements))}</td>
                <td className="px-6 py-4 text-rose-500 text-sm">−€{fmt(p.cass_employee)}</td>
                <td className="px-6 py-4 text-rose-500 text-sm">−€{fmt(p.irpf)}</td>
                <td className="px-6 py-4 font-bold text-emerald-600 text-sm">€{fmt(p.net_salary)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {p.status === 'approved' ? 'Aprobada' : 'Borrador'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {p.status === 'draft' && (
                    <button onClick={() => handleApprove(p.id)}
                      className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium px-3 py-1.5 rounded-lg transition">
                      Aprobar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payrolls.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">No hay nóminas para este período.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setPreview(null) }} title={`Generar nómina — ${MONTHS[month - 1]} ${year}`}>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Field label="Empleado">
              <select required value={genForm.employee_id} onChange={e => { setGenForm({ ...genForm, employee_id: e.target.value }); setPreview(null) }} className={input}>
                <option value="">Seleccionar...</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — €{fmt(emp.salary_base)}</option>)}
              </select>
            </Field>
            <Field label="Complementos (€)">
              <input type="number" placeholder="0,00" min="0" step="0.01" className={input}
                value={genForm.complements} onChange={e => { setGenForm({ ...genForm, complements: e.target.value }); setPreview(null) }} />
            </Field>
            <button type="button" onClick={calcPreview}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition text-sm">
              Calcular preview
            </button>
            {preview && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-200">
                <div className="flex justify-between text-slate-600"><span>Salario bruto</span><span className="font-semibold">€{fmt(preview.total)}</span></div>
                <div className="flex justify-between text-rose-500"><span>CASS obrera (6,1%)</span><span>−€{fmt(preview.cass.employee)}</span></div>
                <div className="flex justify-between text-rose-500"><span>IRPF 2026</span><span>−€{fmt(preview.irpf)}</span></div>
                <div className="flex justify-between font-bold text-emerald-600 pt-2 border-t border-slate-200"><span>Salario neto</span><span>€{fmt(preview.net)}</span></div>
                <div className="flex justify-between text-amber-500 text-xs pt-1"><span>CASS patronal (8,5%)</span><span>€{fmt(preview.cass.employer)}</span></div>
              </div>
            )}
            <button type="submit" disabled={!preview}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-40 text-sm">
              Guardar nómina
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
function ReportsView({ company }) {
  const [data, setData] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('orx_payrolls')
        .select('month, year, salary_base, complements, cass_employee, cass_employer, irpf, net_salary, status, orx_employees!inner(company_id)')
        .eq('orx_employees.company_id', company.id)
        .eq('year', 2026)
        .order('month')
      setData(data || [])
    }
    load()
  }, [])

  const byMonth = MONTHS.map((name, i) => {
    const rows = data.filter(p => p.month === i + 1)
    return {
      name: name.slice(0, 3),
      bruto: rows.reduce((s, p) => s + parseFloat(p.salary_base) + parseFloat(p.complements), 0),
      neto: rows.reduce((s, p) => s + parseFloat(p.net_salary), 0),
      cass: rows.reduce((s, p) => s + parseFloat(p.cass_employer), 0),
      count: rows.length,
    }
  }).filter(m => m.count > 0)

  const maxVal = Math.max(...byMonth.map(m => m.bruto), 1)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reportes 2026</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen por mes</p>
      </div>

      {/* Gráfico de barras manual */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-6">Masa salarial bruta vs neta (€)</h2>
        <div className="flex items-end gap-4 h-48">
          {byMonth.map((m) => (
            <div key={m.name} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end" style={{ height: '160px' }}>
                <div className="flex-1 bg-indigo-200 rounded-t-lg transition-all" style={{ height: `${(m.bruto / maxVal) * 100}%` }} title={`Bruto: €${fmt(m.bruto)}`}></div>
                <div className="flex-1 bg-emerald-400 rounded-t-lg transition-all" style={{ height: `${(m.neto / maxVal) * 100}%` }} title={`Neto: €${fmt(m.neto)}`}></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">{m.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-200 rounded"></div><span className="text-xs text-slate-500">Bruto</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded"></div><span className="text-xs text-slate-500">Neto</span></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            {['Mes', 'Empleados', 'Masa bruta', 'CASS obrera', 'CASS patronal', 'IRPF', 'Masa neta'].map(h => (
              <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {byMonth.map((m, i) => {
              const rows = data.filter(p => p.month === i + 1)
              const cassEmp = rows.reduce((s, p) => s + parseFloat(p.cass_employee), 0)
              const cassPat = rows.reduce((s, p) => s + parseFloat(p.cass_employer), 0)
              const irpf = rows.reduce((s, p) => s + parseFloat(p.irpf), 0)
              return (
                <tr key={m.name} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5 font-medium text-slate-700 text-sm">{MONTHS[data.find(p => p.month === byMonth.indexOf(m) + 1)?.month - 1] || m.name}</td>
                  <td className="px-6 py-3.5 text-slate-500 text-sm">{m.count}</td>
                  <td className="px-6 py-3.5 text-slate-700 text-sm font-medium">€{fmt(m.bruto)}</td>
                  <td className="px-6 py-3.5 text-rose-500 text-sm">€{fmt(cassEmp)}</td>
                  <td className="px-6 py-3.5 text-amber-500 text-sm">€{fmt(cassPat)}</td>
                  <td className="px-6 py-3.5 text-rose-500 text-sm">€{fmt(irpf)}</td>
                  <td className="px-6 py-3.5 font-bold text-emerald-600 text-sm">€{fmt(m.neto)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const input = "w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none transition">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
