---
name: cubestore-env-docker-setup
description: >
  Hướng dẫn thiết lập CubeStore, Docker, biến môi trường (.env), và cấu trúc
  project cho hệ thống Cube.js Dashboard. Kích hoạt khi người dùng đề cập đến:
  CubeStore, Docker Compose, .env, cấu hình database, environment variables,
  cài đặt Cube.js, setup project, hoặc bất kỳ yêu cầu nào liên quan đến
  việc khởi tạo, cấu hình hạ tầng cho Cube.js + PostgreSQL + React.
---

# CubeStore Environment, Docker & Project Setup

## 1. Tổng quan Kiến trúc

```
┌────────────────────────────────────────────────────────────┐
│                    test_cube_dashboard/                      │
│                                                              │
│  ┌──────────┐   ┌─────────────────────┐   ┌──────────────┐ │
│  │ Frontend  │   │   Cube.js API       │   │   Backend    │ │
│  │ (Vite +   │──▶│ (Semantic Layer)    │   │ (Express +   │ │
│  │  React)   │   │                     │   │  Prisma)     │ │
│  │ :5173     │   │ :4000               │   │ :5000        │ │
│  └──────────┘   └─────────┬───────────┘   └──────┬───────┘ │
│                           │                       │         │
│                    ┌──────┴──────┐                │         │
│                    │  CubeStore  │                │         │
│                    │  (Docker)   │                │         │
│                    │  :3030/:3306│                │         │
│                    └──────┬──────┘                │         │
│                           │                       │         │
│                    ┌──────┴───────────────────────┘         │
│                    │                                         │
│                    ▼                                         │
│              ┌───────────┐                                   │
│              │ PostgreSQL│                                   │
│              │  (Docker) │                                   │
│              │  :5433    │                                   │
│              └───────────┘                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu trúc Project

```
test_cube_dashboard/
├── docker-compose.yml              ← PostgreSQL database container
├── backend/
│   ├── .env                        ← Backend environment (DATABASE_URL, PORT)
│   ├── server.js
│   └── prisma/
│       └── schema.prisma
├── cube/
│   └── insurance-cube-api/
│       ├── docker-compose.yml      ← CubeStore container (RIÊNG BIỆT)
│       ├── .env                    ← Cube.js environment variables
│       ├── cube.js                 ← Cube.js config file
│       ├── package.json            ← Cube.js dependencies
│       ├── .cubestore/             ← CubeStore data directory (gitignored)
│       │   └── data/
│       └── model/
│           └── cubes/
│               ├── sales_record.yml
│               └── product.yml
├── frontend/
│   ├── vite.config.js
│   └── src/
│       └── components/
│           ├── CubeDashboard.jsx
│           ├── CubeCharts.jsx
│           ├── CubeTable.jsx
│           └── CrossFilterContext.jsx
└── skills/                          ← Antigravity skill files
    ├── cubejs-dashboard-architect/
    ├── cross-filter-dashboard/
    └── cubestore-env-docker-setup/  ← (file này)
```

> ⚠️ **Lưu ý**: Có **2 file docker-compose.yml** riêng biệt:
> - `test_cube_dashboard/docker-compose.yml` → PostgreSQL
> - `test_cube_dashboard/cube/insurance-cube-api/docker-compose.yml` → CubeStore

---

## 3. Docker Compose — PostgreSQL (Root)

**File**: `test_cube_dashboard/docker-compose.yml`

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: postgres_crud_db
    restart: always
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: crud_db
    ports:
      - "5433:5432"           # Map host:5433 → container:5432
    volumes:
      - crud_pgdata:/var/lib/postgresql/data

volumes:
  crud_pgdata:
```

### Lệnh khởi động PostgreSQL

```bash
# Từ thư mục gốc project
cd C:\Users\Admin\Documents\test_cube_dashboard
docker compose up -d

# Kiểm tra
docker ps | findstr postgres
# → container "postgres_crud_db" trên port 5433
```

### Kết nối

| Param    | Giá trị     |
|----------|-------------|
| Host     | `localhost` |
| Port     | `5433`      |
| Database | `crud_db`   |
| User     | `myuser`    |
| Password | `mypassword`|

> ⚠️ Port là **5433** (không phải 5432 mặc định) để tránh conflict với PostgreSQL local.

---

## 4. Docker Compose — CubeStore

**File**: `cube/insurance-cube-api/docker-compose.yml`

```yaml
services:
  cubestore:
    image: cubejs/cubestore:latest
    container_name: cubestore
    ports:
      - "3030:3030"   # CubeStore HTTP API (Cube.js kết nối port này)
      - "3306:3306"   # CubeStore SQL API (MySQL protocol)
    environment:
      - CUBESTORE_REMOTE_DIR=/cube/data
      - CUBESTORE_SERVER_NAME=cubestore:3306
    volumes:
      - ./.cubestore/data:/cube/data
    restart: unless-stopped
```

### Giải thích các config quan trọng

| Config | Giá trị | Mô tả |
|--------|---------|-------|
| `CUBESTORE_REMOTE_DIR` | `/cube/data` | Thư mục trong container chứa pre-aggregation data |
| `CUBESTORE_SERVER_NAME` | `cubestore:3306` | Tên server + port cho SQL API |
| Volume mount | `./.cubestore/data:/cube/data` | Map thư mục local → container |
| Port 3030 | HTTP API | Cube.js dùng port này để giao tiếp với CubeStore |
| Port 3306 | MySQL protocol | CubeStore SQL API (query trực tiếp nếu cần) |

### Lệnh khởi động CubeStore

```bash
# Từ thư mục cube/insurance-cube-api
cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
docker compose up -d

# Kiểm tra CubeStore đang chạy
docker ps | findstr cubestore
# → container "cubestore" trên ports 3030, 3306

# Xem logs
docker logs cubestore --tail 50

# Kiểm tra kết nối HTTP
curl http://localhost:3030/
```

### Thứ tự khởi động đúng

```
1. PostgreSQL   → docker compose up -d     (từ root project)
2. CubeStore    → docker compose up -d     (từ cube/insurance-cube-api/)
3. Cube.js API  → npm run dev              (từ cube/insurance-cube-api/)
4. Backend      → npm run dev              (từ backend/)
5. Frontend     → npm run dev              (từ frontend/)
```

---

## 5. Biến môi trường (.env)

### 5.1 Cube.js .env

**File**: `cube/insurance-cube-api/.env`

```env
# Cube environment variables: https://cube.dev/docs/reference/environment-variables
CUBEJS_DEV_MODE=true
CUBEJS_DB_TYPE=postgres
CUBEJS_API_SECRET=8573e402362594caa4980de6a777310a73cf648bf7113cfaaf495cd4ecd8c9ce3afb442c452adaa9725ed9c82f404494e6d92d5166c807bc7e7fc4a0643c648d
CUBEJS_EXTERNAL_DEFAULT=true
CUBEJS_SCHEDULED_REFRESH_DEFAULT=true
CUBEJS_SCHEMA_PATH=model
CUBEJS_WEB_SOCKETS=true

CUBEJS_DB_HOST=localhost
CUBEJS_DB_PORT=5433
CUBEJS_DB_NAME=crud_db
CUBEJS_DB_USER=myuser
CUBEJS_DB_PASS=mypassword

# CubeStore for pre-aggregation cache
CUBEJS_CUBESTORE_HOST=localhost
CUBEJS_CUBESTORE_PORT=3030
```

#### Giải thích từng biến

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `CUBEJS_DEV_MODE` | `true` | Bật Playground UI tại `http://localhost:4000` |
| `CUBEJS_DB_TYPE` | `postgres` | Loại database nguồn |
| `CUBEJS_API_SECRET` | (JWT secret dài) | Secret ký JWT token, **≥ 32 ký tự** |
| `CUBEJS_EXTERNAL_DEFAULT` | `true` | Pre-aggregations mặc định lưu ra CubeStore (external) |
| `CUBEJS_SCHEDULED_REFRESH_DEFAULT` | `true` | Tự động refresh pre-aggregations theo lịch |
| `CUBEJS_SCHEMA_PATH` | `model` | Thư mục chứa YAML schema (relative to project root) |
| `CUBEJS_WEB_SOCKETS` | `true` | Bật WebSocket cho real-time subscribe |
| `CUBEJS_DB_HOST` | `localhost` | Host PostgreSQL |
| `CUBEJS_DB_PORT` | `5433` | Port PostgreSQL (mapped từ Docker) |
| `CUBEJS_DB_NAME` | `crud_db` | Tên database |
| `CUBEJS_DB_USER` | `myuser` | DB user |
| `CUBEJS_DB_PASS` | `mypassword` | DB password |
| `CUBEJS_CUBESTORE_HOST` | `localhost` | CubeStore host |
| `CUBEJS_CUBESTORE_PORT` | `3030` | CubeStore HTTP API port |

> ⚠️ **QUAN TRỌNG**: `CUBEJS_EXTERNAL_DEFAULT=true` + `CUBEJS_CUBESTORE_HOST/PORT` là cặp
> config bắt buộc để pre-aggregations lưu vào CubeStore thay vì source database.

### 5.2 Backend .env

**File**: `backend/.env`

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5433/crud_db?schema=public"
PORT=5000
```

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Prisma connection string (cùng DB với Cube.js) |
| `PORT` | Express server port |

---

## 6. CubeStore — Pre-aggregation Cache

### 6.1 CubeStore là gì?

CubeStore là một **columnar storage engine** chuyên dụng cho Cube.js, dùng để:
- **Cache pre-aggregation data** (rollup results)
- **Tăng tốc query** — thay vì query trực tiếp PostgreSQL mỗi lần
- **Giảm tải cho source database**

### 6.2 Cách hoạt động

```
Cube.js Query → Kiểm tra pre-aggregation tồn tại?
                    │
              ┌─────┴─────┐
              │ CÓ         │ KHÔNG
              ▼             ▼
        CubeStore      PostgreSQL
        (nhanh)        (chậm hơn)
              │             │
              └─────┬───────┘
                    ▼
              Trả kết quả
```

### 6.3 Cấu hình Pre-aggregation với CubeStore

Trong YAML schema, khai báo `external: true` để lưu vào CubeStore:

```yaml
pre_aggregations:
  - name: main_rollup
    type: rollup
    external: true          # ← Lưu vào CubeStore thay vì source DB
    measures:
      - totalQuantity
      - totalRevenue
      - product.price
    dimensions:
      - product.name
      - quantity
    time_dimension: saledate
    granularity: minute
```

> Khi `CUBEJS_EXTERNAL_DEFAULT=true` trong .env, tất cả pre-aggregations sẽ
> mặc định dùng CubeStore mà không cần ghi `external: true` trong từng entry.
> Tuy nhiên, ghi tường minh vẫn là best practice.

### 6.4 Data Storage

CubeStore data được lưu tại:
```
cube/insurance-cube-api/.cubestore/data/
```

Thư mục này:
- Được mount vào Docker container tại `/cube/data`
- Đã được thêm vào `.gitignore` (không commit lên git)
- Tự động tạo khi CubeStore container khởi động
- Có thể xóa để force rebuild tất cả pre-aggregations

### 6.5 Kiểm tra CubeStore hoạt động

```bash
# 1. Kiểm tra container chạy
docker ps | findstr cubestore

# 2. Kiểm tra logs — không có lỗi
docker logs cubestore --tail 20

# 3. Kiểm tra pre-aggregation được dùng
# Mở Cube Playground: http://localhost:4000
# → Build → chọn measures/dimensions → xem "Pre-aggregation" badge

# 4. Kiểm tra data đã cache
dir "C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api\.cubestore\data"
```

---

## 7. Cube.js Config

**File**: `cube/insurance-cube-api/cube.js`

```js
// Cube configuration options: https://cube.dev/docs/config
/** @type{ import('@cubejs-backend/server-core').CreateOptions } */
module.exports = {
};
```

Config hiện tại là minimal (chỉ dùng env vars). Nếu cần mở rộng:

```js
module.exports = {
  // Cache riêng theo tenant (multi-tenancy)
  contextToAppId: ({ securityContext }) =>
    `CUBEJS_APP_${securityContext?.tenantId ?? 'default'}`,

  // Scheduled refresh cho nhiều tenant
  scheduledRefreshContexts: async () => [
    { securityContext: { tenantId: 'default' } },
  ],
};
```

---

## 8. Package Dependencies

**File**: `cube/insurance-cube-api/package.json`

```json
{
  "name": "insurance-cube-api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "cubejs-server"
  },
  "template": "docker",
  "templateVersion": "1.6.32",
  "devDependencies": {
    "@cubejs-backend/postgres-driver": "^1.6.32",
    "@cubejs-backend/server": "^1.6.32"
  }
}
```

| Package | Mô tả |
|---------|-------|
| `@cubejs-backend/server` | Cube.js server core |
| `@cubejs-backend/postgres-driver` | PostgreSQL driver cho Cube.js |

### Cài đặt dependencies

```bash
cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
npm install
```

---

## 9. Troubleshooting — Lỗi thường gặp

### 9.1 CubeStore không kết nối được

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:3030` | CubeStore chưa chạy | `docker compose up -d` trong `cube/insurance-cube-api/` |
| `Error: CUBESTORE_REMOTE_DIR is not set` | Thiếu env var trong Docker | Kiểm tra `docker-compose.yml` có `CUBESTORE_REMOTE_DIR` |
| Pre-aggregation không build | `CUBEJS_EXTERNAL_DEFAULT` = false hoặc thiếu | Set `CUBEJS_EXTERNAL_DEFAULT=true` trong `.env` |
| `Table name too long` | Tên pre-aggregation quá dài | Thêm `sql_alias` vào cube: `sql_alias: sr` |

### 9.2 PostgreSQL không kết nối

| Triệu chứng | Fix |
|---|---|
| `ECONNREFUSED :5433` | `docker compose up -d` tại root project |
| `password authentication failed` | Kiểm tra `POSTGRES_USER/PASSWORD` trong docker-compose khớp với `.env` |
| `database "crud_db" does not exist` | Container chưa init xong, đợi 5-10 giây |

### 9.3 Port conflicts

| Port | Service | Fix nếu conflict |
|---|---|---|
| 5433 | PostgreSQL | Đổi `"5433:5432"` thành `"5434:5432"` + cập nhật tất cả `.env` |
| 3030 | CubeStore HTTP | Đổi `"3030:3030"` + cập nhật `CUBEJS_CUBESTORE_PORT` |
| 3306 | CubeStore SQL | Đổi `"3307:3306"` + cập nhật `CUBESTORE_SERVER_NAME` |
| 4000 | Cube.js API | Mặc định, đổi bằng `CUBEJS_PORT` trong `.env` |
| 5000 | Backend Express | Đổi `PORT` trong `backend/.env` |
| 5173 | Vite dev server | Đổi trong `vite.config.js` |

### 9.4 Rebuild lại tất cả pre-aggregations

```bash
# 1. Dừng Cube.js server (Ctrl+C)
# 2. Xóa CubeStore data
rmdir /s /q "C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api\.cubestore\data"

# 3. Restart CubeStore container
cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
docker compose restart cubestore

# 4. Khởi động lại Cube.js
npm run dev
# Pre-aggregations sẽ tự động rebuild
```

---

## 10. Gitignore

**File**: `cube/insurance-cube-api/.gitignore`

```gitignore
.env             # Không commit credentials
node_modules     # Dependencies — cài lại bằng npm install
.cubestore       # CubeStore cache data — tự rebuild
upstream         # Cube.js upstream files
```

---

## 11. Quick Start — Chạy toàn bộ hệ thống

```bash
# === BƯỚC 1: PostgreSQL ===
cd C:\Users\Admin\Documents\test_cube_dashboard
docker compose up -d

# === BƯỚC 2: CubeStore ===
cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
docker compose up -d

# === BƯỚC 3: Cube.js API ===
cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
npm install   # (lần đầu)
npm run dev
# → Cube Playground: http://localhost:4000

# === BƯỚC 4: Backend ===
cd C:\Users\Admin\Documents\test_cube_dashboard\backend
npm install   # (lần đầu)
npm run dev
# → API: http://localhost:5000

# === BƯỚC 5: Frontend ===
cd C:\Users\Admin\Documents\test_cube_dashboard\frontend
npm install   # (lần đầu)
npm run dev
# → App: http://localhost:5173
```

### Kiểm tra tất cả services

```bash
# Kiểm tra Docker containers
docker ps

# Kết quả mong đợi:
# CONTAINER ID   IMAGE                     PORTS                              NAMES
# xxxx           postgres:15               0.0.0.0:5433->5432/tcp             postgres_crud_db
# xxxx           cubejs/cubestore:latest    0.0.0.0:3030->3030/tcp, ...        cubestore
```

### Dừng tất cả

```bash
# Dừng Cube.js, Backend, Frontend: Ctrl+C trong terminal

# Dừng Docker containers
cd C:\Users\Admin\Documents\test_cube_dashboard
docker compose down

cd C:\Users\Admin\Documents\test_cube_dashboard\cube\insurance-cube-api
docker compose down
```

---

## 12. Checklist khi setup lần đầu

- [ ] Docker Desktop đã cài và đang chạy
- [ ] `docker compose up -d` thành công cho PostgreSQL (root)
- [ ] `docker compose up -d` thành công cho CubeStore (cube/insurance-cube-api/)
- [ ] `docker ps` thấy cả 2 containers: `postgres_crud_db` + `cubestore`
- [ ] File `.env` trong `cube/insurance-cube-api/` có đầy đủ biến (xem section 5.1)
- [ ] File `.env` trong `backend/` có `DATABASE_URL` đúng port 5433
- [ ] `npm install` thành công trong cả 3 thư mục (cube, backend, frontend)
- [ ] `npm run dev` cho Cube.js → Playground mở được tại `:4000`
- [ ] Pre-aggregation build thành công (xem badge trong Playground)
- [ ] Frontend kết nối được Cube.js qua WebSocket (`:4000`)

---

## 13. Lưu ý quan trọng cho Windows

| Vấn đề | Giải pháp |
|--------|-----------|
| Volume mount path Windows | Docker Desktop tự xử lý `./` path trong docker-compose |
| Đường dẫn dài (>260 chars) | Bật Long Path trong Windows nếu gặp lỗi |
| Port 3306 bị MySQL chiếm | Dừng MySQL local hoặc đổi port CubeStore |
| Permission denied `.cubestore/data` | Chạy terminal với quyền Administrator |
| Line endings (CRLF vs LF) | Thêm `.gitattributes` nếu cần |

---

*Cập nhật lần cuối: 2026-04-09. Áp dụng cho project `test_cube_dashboard`
với Cube.js v1.6.32, CubeStore latest, PostgreSQL 15.*
