// server.js - ORX NÓMINA Backend
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// ============ CONFIGURACIÓN ============
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/orx_nomina'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============ MIDDLEWARE ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ============ MÓDULO: AUTENTICACIÓN ============

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, company_name, name } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear empresa
    const companyResult = await pool.query(
      'INSERT INTO companies (name, created_at) VALUES ($1, NOW()) RETURNING id',
      [company_name]
    );
    const companyId = companyResult.rows[0].id;
    
    // Crear usuario admin
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, role, company_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, role',
      [email, hashedPassword, 'admin', companyId]
    );
    
    const token = jwt.sign({ id: userResult.rows[0].id, role: 'admin', company_id: companyId }, JWT_SECRET);
    
    res.status(201).json({ 
      message: 'Registro exitoso',
      token,
      user: userResult.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) return res.status(400).json({ error: 'Contraseña incorrecta' });
    
    const token = jwt.sign({ id: user.id, role: user.role, company_id: user.company_id }, JWT_SECRET);
    
    res.json({ 
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MÓDULO: GESTIÓN DE EMPLEADOS ============

// Obtener todos los empleados de la empresa
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE company_id = $1 ORDER BY last_name, first_name',
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear empleado
app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, nif, hire_date, position, salary_base, bank_account } = req.body;
    
    const result = await pool.query(
      `INSERT INTO employees 
       (company_id, first_name, last_name, nif, hire_date, position, salary_base, bank_account, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [req.user.company_id, first_name, last_name, nif, hire_date, position, salary_base, bank_account]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar empleado
app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, position, salary_base } = req.body;
    
    const result = await pool.query(
      `UPDATE employees 
       SET first_name = $1, last_name = $2, position = $3, salary_base = $4, updated_at = NOW()
       WHERE id = $5 AND company_id = $6
       RETURNING *`,
      [first_name, last_name, position, salary_base, id, req.user.company_id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar empleado
app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, req.user.company_id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MÓDULO: CÁLCULO DE NÓMINAS ============

// Calcular CASS (Seguridad Social)
const calculateCASSAndorra = (salaryBase) => {
  const CASS_EMPLOYEE_RATE = 0.061;  // 6.1% obrera
  const CASS_EMPLOYER_RATE = 0.085;  // 8.5% patronal
  
  return {
    employee: Math.round(salaryBase * CASS_EMPLOYEE_RATE * 100) / 100,
    employer: Math.round(salaryBase * CASS_EMPLOYER_RATE * 100) / 100
  };
};

// Calcular IRPF (Retención Fiscal)
const calculateIRPFAndorra = (salaryBase, cass_employee) => {
  const taxableBase = salaryBase - cass_employee;
  
  // Tramos IRPF Andorra 2024
  let irpf = 0;
  if (taxableBase <= 28000) irpf = taxableBase * 0.05;
  else if (taxableBase <= 45000) irpf = 1400 + (taxableBase - 28000) * 0.10;
  else if (taxableBase <= 67000) irpf = 2900 + (taxableBase - 45000) * 0.15;
  else if (taxableBase <= 145000) irpf = 5200 + (taxableBase - 67000) * 0.20;
  else irpf = 21800 + (taxableBase - 145000) * 0.24;
  
  return Math.round(irpf * 100) / 100;
};

// Crear nómina
app.post('/api/payrolls/generate', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month, year, complements = 0 } = req.body;
    
    // Obtener datos del empleado
    const employeeResult = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND company_id = $2',
      [employee_id, req.user.company_id]
    );
    
    if (employeeResult.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    
    const employee = employeeResult.rows[0];
    const salaryBase = employee.salary_base;
    
    // Calcular componentes
    const totalBruto = salaryBase + complements;
    const cass = calculateCASSAndorra(totalBruto);
    const irpf = calculateIRPFAndorra(totalBruto, cass.employee);
    const netSalary = totalBruto - cass.employee - irpf;
    
    // Guardar nómina
    const payrollResult = await pool.query(
      `INSERT INTO payrolls 
       (employee_id, month, year, salary_base, complements, cass_employee, cass_employer, irpf, net_salary, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW())
       RETURNING *`,
      [employee_id, month, year, salaryBase, complements, cass.employee, cass.employer, irpf, netSalary]
    );
    
    res.status(201).json({
      payroll: payrollResult.rows[0],
      details: {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        salaryBase,
        complements,
        totalBruto,
        cass,
        irpf,
        netSalary
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener nóminas del mes
app.get('/api/payrolls/:month/:year', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.params;
    
    const result = await pool.query(
      `SELECT p.*, e.first_name, e.last_name, e.nif
       FROM payrolls p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.month = $1 AND p.year = $2 AND e.company_id = $3
       ORDER BY e.last_name`,
      [month, year, req.user.company_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar nóminas
app.put('/api/payrolls/:id/approve', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE payrolls SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['approved', req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MÓDULO: REPORTES ============

app.get('/api/reports/dashboard', authenticateToken, async (req, res) => {
  try {
    const employeesCount = await pool.query(
      'SELECT COUNT(*) FROM employees WHERE company_id = $1',
      [req.user.company_id]
    );
    
    const totalPayroll = await pool.query(
      `SELECT SUM(net_salary) as total FROM payrolls p
       JOIN employees e ON p.employee_id = e.id
       WHERE e.company_id = $1 AND p.status = 'approved'`,
      [req.user.company_id]
    );
    
    res.json({
      totalEmployees: employeesCount.rows[0].count,
      totalMonthlyPayroll: totalPayroll.rows[0].total || 0,
      cass: {
        employee: 'pendiente de cálculo',
        employer: 'pendiente de cálculo'
      },
      irpf: 'pendiente de cálculo'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVIDOR ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ ORX NÓMINA Backend ejecutándose en puerto ${PORT}`);
});

module.exports = app;
