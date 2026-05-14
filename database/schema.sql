-- ============================================
-- ORX NÓMINA - Schema de Base de Datos
-- PostgreSQL 14+
-- ============================================

-- Crear base de datos
CREATE DATABASE orx_nomina;

-- Conectar a la base de datos
\c orx_nomina;

-- ============ TABLA: EMPRESAS ============
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nif VARCHAR(20) UNIQUE,
  address VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(100),
  employees_count INT DEFAULT 0,
  subscription_type VARCHAR(50) DEFAULT 'starter',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ TABLA: USUARIOS ============
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, hr, user
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, company_id)
);

-- ============ TABLA: EMPLEADOS ============
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Datos personales
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nif VARCHAR(20) NOT NULL,
  birth_date DATE,
  email VARCHAR(100),
  phone VARCHAR(20),
  address VARCHAR(255),

  -- Datos laborales
  hire_date DATE NOT NULL,
  end_date DATE,
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  contract_type VARCHAR(50) DEFAULT 'indefinido',

  -- Datos salariales
  salary_base DECIMAL(10, 2) NOT NULL,
  cass_affiliation_number VARCHAR(50),

  -- Datos bancarios
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  bank_bic VARCHAR(11),

  -- Estado
  status VARCHAR(50) DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(company_id, nif)
);

-- ============ TABLA: MOVIMIENTOS DE EMPLEADO ============
CREATE TABLE employee_movements (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  days_count INT,
  description TEXT,

  old_salary DECIMAL(10, 2),
  new_salary DECIMAL(10, 2),

  status VARCHAR(50) DEFAULT 'pending',
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ TABLA: NÓMINAS ============
CREATE TABLE payrolls (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Período
  month INT NOT NULL,
  year INT NOT NULL,

  -- Componentes salariales
  salary_base DECIMAL(10, 2) NOT NULL,
  complements DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,

  -- Total bruto generado
  total_bruto DECIMAL(10, 2) GENERATED ALWAYS AS (salary_base + complements) STORED,

  -- Seguridad Social (CASS)
  cass_employee DECIMAL(10, 2) NOT NULL,
  cass_employer DECIMAL(10, 2) NOT NULL,

  -- Impuesto sobre la Renta (IRPF)
  irpf DECIMAL(10, 2) NOT NULL,

  -- Neto
  net_salary DECIMAL(10, 2) NOT NULL,

  -- Estado
  status VARCHAR(50) DEFAULT 'draft',
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,

  payment_method VARCHAR(50) DEFAULT 'bank_transfer',
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(employee_id, month, year)
);

-- ============ TABLA: FICHAJE / CONTROL DE ASISTENCIA ============
CREATE TABLE time_tracking (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  hours_worked DECIMAL(5, 2),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(employee_id, date)
);

-- ============ TABLA: CONFIGURACIÓN FISCAL ============
CREATE TABLE tax_config (
  id SERIAL PRIMARY KEY,

  year INT NOT NULL,
  country VARCHAR(50) DEFAULT 'ANDORRA',

  irpf_tramos JSONB,

  cass_employee_rate DECIMAL(5, 4) DEFAULT 0.061,
  cass_employer_rate DECIMAL(5, 4) DEFAULT 0.085,

  minimum_interpersonal_salary DECIMAL(10, 2),

  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(year, country)
);

-- ============ TABLA: AUDITORÍA ============
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT,

  old_values JSONB,
  new_values JSONB,

  ip_address VARCHAR(45),
  user_agent TEXT,

  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ TABLA: EXPORTACIONES CASS ============
CREATE TABLE cass_exports (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  month INT NOT NULL,
  year INT NOT NULL,

  file_name VARCHAR(255),
  file_path VARCHAR(255),
  file_size INT,

  total_employees INT,
  total_employer_contribution DECIMAL(12, 2),
  total_employee_contribution DECIMAL(12, 2),

  status VARCHAR(50) DEFAULT 'generated',
  sent_at TIMESTAMP,
  confirmation_code VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(company_id, month, year)
);

-- ============ ÍNDICES DE RENDIMIENTO ============
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX idx_payrolls_status ON payrolls(status);
CREATE INDEX idx_payrolls_period ON payrolls(year, month);
CREATE INDEX idx_payrolls_company_period ON payrolls(employee_id, year, month);
CREATE INDEX idx_time_tracking_employee ON time_tracking(employee_id);
CREATE INDEX idx_time_tracking_employee_date ON time_tracking(employee_id, date);
CREATE INDEX idx_movements_employee ON employee_movements(employee_id);
CREATE INDEX idx_audit_log_user_ts ON audit_log(user_id, timestamp);
CREATE INDEX idx_audit_log_company_ts ON audit_log(company_id, timestamp);
CREATE INDEX idx_audit_log_table_action ON audit_log(table_name, action);

-- ============ VISTAS ÚTILES ============

-- Vista: Resumen mensual de nóminas
CREATE VIEW payroll_summary AS
SELECT
  p.year,
  p.month,
  c.id AS company_id,
  c.name AS company_name,
  COUNT(p.id) AS total_employees,
  SUM(p.total_bruto) AS total_bruto,
  SUM(p.cass_employee) AS total_cass_employee,
  SUM(p.cass_employer) AS total_cass_employer,
  SUM(p.irpf) AS total_irpf,
  SUM(p.net_salary) AS total_net_salary
FROM payrolls p
JOIN employees e ON p.employee_id = e.id
JOIN companies c ON e.company_id = c.id
GROUP BY p.year, p.month, c.id, c.name;

-- Vista: Costo total de empleados (salario + cargas patronales)
CREATE VIEW employee_total_cost AS
SELECT
  e.id,
  e.company_id,
  CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
  e.salary_base,
  ROUND(e.salary_base * 0.085, 2) AS employer_cass,
  ROUND(e.salary_base * 1.085, 2) AS total_cost_per_month
FROM employees e
WHERE e.status = 'active';

-- ============ DATOS INICIALES ============

-- Configuración IRPF 2024 Andorra
INSERT INTO tax_config (year, country, cass_employee_rate, cass_employer_rate, irpf_tramos) VALUES
(2024, 'ANDORRA', 0.061, 0.085,
'[
  {"min": 0,      "max": 28000,   "rate": 0.05},
  {"min": 28000,  "max": 45000,   "rate": 0.10},
  {"min": 45000,  "max": 67000,   "rate": 0.15},
  {"min": 67000,  "max": 145000,  "rate": 0.20},
  {"min": 145000, "max": 9999999, "rate": 0.24}
]'::jsonb);

-- ============ TRIGGERS ============

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_timestamp BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_employees_timestamp BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_payrolls_timestamp BEFORE UPDATE ON payrolls
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============ PERMISOS ============
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- ============ FIN DEL SCRIPT ============
