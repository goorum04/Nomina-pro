# ORX Nómina

Plataforma SaaS de gestión integral de nóminas diseñada para empresas en Andorra. Automatiza cálculos CASS e IRPF, gestión de empleados y generación de reportes.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 14+ |
| Auth | JWT + bcrypt |

## Estructura del proyecto

```
Nomina-pro/
├── backend/          # API REST Express
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/         # App React
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── database/
    └── schema.sql    # Schema PostgreSQL
```

## Inicio rápido

### Requisitos

- Node.js 16+
- PostgreSQL 14+

### Base de datos

```bash
psql -U postgres -f database/schema.sql
```

### Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales
npm install
npm start          # producción
npm run dev        # desarrollo (nodemon)
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

El frontend en desarrollo hace proxy de `/api` al backend en `localhost:3001`.

## Funcionalidades

- Autenticación JWT con registro por empresa
- CRUD completo de empleados
- Cálculo automático de CASS (6.1% obrera + 8.5% patronal)
- Cálculo de IRPF según tramos 2024 de Andorra
- Generación y aprobación de nóminas
- Dashboard con métricas clave
- Auditoría completa de acciones

## API endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro empresa + admin |
| POST | `/api/auth/login` | Login |
| GET | `/api/employees` | Listar empleados |
| POST | `/api/employees` | Crear empleado |
| PUT | `/api/employees/:id` | Actualizar empleado |
| DELETE | `/api/employees/:id` | Eliminar empleado |
| POST | `/api/payrolls/generate` | Generar nómina |
| GET | `/api/payrolls/:month/:year` | Nóminas del período |
| PUT | `/api/payrolls/:id/approve` | Aprobar nómina |
| GET | `/api/reports/dashboard` | Métricas dashboard |

Ver `06_API_DOCUMENTATION.md` para documentación completa.

## Precios SaaS

| Plan | Precio | Empleados |
|------|--------|-----------|
| Starter | 299€/mes | hasta 50 |
| Professional | 599€/mes | hasta 200 |
| Enterprise | Custom | 200+ |
