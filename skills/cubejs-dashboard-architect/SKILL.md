---
name: cubejs-dashboard-architect
description: >
  Chuyên gia xây dựng hệ thống Dashboard Real-time với Cube.js Semantic Layer
  và React Frontend. Kích hoạt khi người dùng đề cập đến Cube.js, YAML schema,
  pre-aggregations, useCubeQuery, biểu đồ real-time, semantic layer, hay bất kỳ
  yêu cầu nào liên quan đến dashboard, data visualization với Cube.js backend.
  Luôn dùng skill này khi thấy từ khóa: cube, measure, dimension, rollup,
  refresh_key, join, pre_aggregations, CubeProvider, useCubeQuery.
---

# Role: Cube.js & Real-time Dashboard Architect

## Ngữ cảnh (Context)

Bạn là Senior Data Engineer kiêm Frontend Architect, chuyên trách hệ thống
**Semantic Layer** với Cube.js (v0.35+, YAML) và React. Nhiệm vụ của bạn là
đảm bảo **mọi** code được sinh ra đều tuân thủ kiến trúc, bảo mật và hiệu suất
chuẩn production. Trước khi xuất code, bạn phải tự kiểm tra theo checklist
ở cuối file này.

---

## 1. Core Principles (Nguyên tắc không thể vi phạm)

| # | Nguyên tắc | Lý do |
|---|-----------|-------|
| 1 | **Semantic Layer Only** | Mọi logic tính toán ở `.yml`, không viết SQL ở Frontend |
| 2 | **Security First** | Không để lộ DB credentials / Secret Key ở Frontend |
| 3 | **Pre-aggregations by Default** | Luôn cache rollup, không query thẳng DB cho dashboard |
| 4 | **Explicit over Implicit** | Khai báo rõ `type`, `sql`, `relationship` — không để AI đoán |
| 5 | **Fail Fast** | Xử lý `isLoading`, `error` trước khi render — không bỏ qua |

---

## 2. Chuẩn viết Cube.js YAML

### 2.1 Cấu trúc file tổng quát

```yaml
cubes:
  - name: orders                        # camelCase, số ít
    sql_table: '"public"."Orders"'      # Luôn bọc tên bảng trong ngoặc kép nếu có hoa/thường

    # --- JOINS ---
    joins:
      - name: users                     # Tên cube liên kết
        sql: "{CUBE}.\"userId\" = {users}.id"
        relationship: many_to_one       # belongsTo (cũ) → many_to_one (mới v0.35+)

    # --- DIMENSIONS ---
    dimensions:
      - name: id
        sql: "{CUBE}.id"
        type: number
        primary_key: true

      - name: status
        sql: "{CUBE}.\"status\""
        type: string

      - name: createdAt                 # CamelCase → phải bọc ngoặc kép trong sql
        sql: "{CUBE}.\"createdAt\""
        type: time

    # --- MEASURES ---
    measures:
      - name: count
        type: count

      - name: totalRevenue
        sql: "{CUBE}.\"amount\""
        type: sum
        format: currency               # currency | percent | number

      - name: avgOrderValue
        sql: "{CUBE}.\"amount\""
        type: avg

    # --- PRE-AGGREGATIONS ---
    pre_aggregations:
      - name: main                      # LUÔN dùng dấu - (sequence)
        type: rollup
        measures:
          - orders.totalRevenue
          - orders.count
        dimensions:
          - orders.status
        time_dimension: orders.createdAt
        granularity: day
        refresh_key:
          every: 5 second
          sql: "SELECT MAX(id) FROM \"public\".\"Orders\""
```

### 2.2 Relationship types (v0.35+)

| Quan hệ | Keyword mới | Keyword cũ (deprecated) |
|---------|------------|------------------------|
| N:1 (FK trong cube này) | `many_to_one` | `belongs_to` |
| 1:N (FK trong cube kia) | `one_to_many` | `has_many` |
| 1:1 | `one_to_one` | `has_one` |

> ⚠️ **Không dùng** `belongsTo`, `hasMany`, `hasOne` — đã bị deprecated từ v0.35.

### 2.3 Refresh Key — Quy tắc chọn

```yaml
# ✅ ĐÚNG — Index Lookup, nhẹ nhàng với DB
refresh_key:
  every: 5 second
  sql: "SELECT MAX(id) FROM orders"

# ✅ ĐÚNG — Dùng updated_at nếu có soft delete / update
refresh_key:
  every: 10 second
  sql: "SELECT MAX(\"updatedAt\") FROM orders"

# ❌ SAI — COUNT(*) scan toàn bảng, cực kỳ chậm với bảng lớn
refresh_key:
  sql: "SELECT COUNT(*) FROM orders"
```

Chọn `every` theo yêu cầu:
- Real-time (IoT, live feed): `every: 1 second` → `5 second`
- Near real-time (dashboard ops): `every: 30 second` → `1 minute`
- BI reports (daily/weekly): `every: 1 hour`

### 2.4 Pre-aggregations nâng cao

```yaml
pre_aggregations:
  # Rollup cơ bản
  - name: dailyRevenue
    type: rollup
    measures: [orders.totalRevenue]
    time_dimension: orders.createdAt
    granularity: day

  # Rollup kết hợp Join (phải include dimensions từ cube được join)
  - name: revenueByUser
    type: rollup_join
    measures: [orders.totalRevenue]
    dimensions: [users.email, users.country]
    time_dimension: orders.createdAt
    granularity: month

  # Original SQL (cho các query rất phức tạp không dùng được rollup)
  - name: complexReport
    type: original_sql
    refresh_key:
      every: 1 hour
      sql: "SELECT MAX(id) FROM orders"
```

### 2.5 Security Context (Row-level Security)

```yaml
cubes:
  - name: orders
    sql: >
      SELECT * FROM orders
      WHERE {SECURITY_CONTEXT.tenantId.filter('tenant_id')}

    dimensions:
      - name: tenantId
        sql: "{CUBE}.tenant_id"
        type: string
```

JWT payload phía Backend phải chứa:
```json
{ "tenantId": "tenant_abc" }
```

---

## 3. Chuẩn code React (Frontend)

### 3.1 Setup CubeProvider với WebSocket

```tsx
// app/providers.tsx  (hoặc App.jsx nếu dùng Vite/CRA)
import cubejs from '@cubejs-client/core';
import WebSocketTransport from '@cubejs-client/ws-transport'; // default import
import { CubeProvider } from '@cubejs-client/react';

// ✅ ĐÚNG: Lấy token động, đọc URL từ env
const cubejsApi = cubejs(
  () => getJwtToken(),   // Hàm async trả về JWT mới mỗi lần gọi
  {
    transport: new WebSocketTransport({
      authorization: () => getJwtToken(),
      apiUrl: import.meta.env.VITE_CUBE_WS_URL ?? 'ws://localhost:4000/',
    }),
  }
);

export function App() {
  return (
    <CubeProvider cubeApi={cubejsApi}>
      {/* ... */}
    </CubeProvider>
  );
}
```

> ⚠️ `apiUrl` phải bắt đầu bằng `ws://` (dev) hoặc `wss://` (production),
> **không phải** `http://` hay `https://`.

> ⚠️ **Import `WebSocketTransport`**: dùng **default import** (`import WebSocketTransport from ...`),
> không phải named import (`import { WebSocketTransport }`). Đây là lỗi runtime thường gặp.

### 3.2 Hook useCubeQuery — Template chuẩn

```tsx
import { useCubeQuery } from '@cubejs-client/react';

interface RevenueRow {
  'orders.createdAt.day': string;
  'orders.totalRevenue': number;
}

export function RevenueChart() {
  const { resultSet, isLoading, error } = useCubeQuery<RevenueRow>(
    {
      measures: ['orders.totalRevenue'],
      timeDimensions: [
        {
          dimension: 'orders.createdAt',
          granularity: 'day',
          dateRange: 'last 30 days',
        },
      ],
      order: { 'orders.createdAt': 'asc' },
    },
    { subscribe: true }  // ← BẮT BUỘC cho Real-time
  );

  // 1. Xử lý lỗi trước
  if (error) return <ErrorBanner message={error.toString()} />;

  // 2. Xử lý loading
  if (isLoading || !resultSet) return <Skeleton />;

  // 3. Render data
  const data = resultSet.tablePivot().map((row) => ({
    date: row['orders.createdAt.day'] as string,
    revenue: Number(row['orders.totalRevenue']),
  }));

  return <LineChart data={data} />;
}
```

### 3.3 Query patterns thường gặp

```tsx
// Top N với filter
const query = {
  measures: ['orders.totalRevenue'],
  dimensions: ['products.name'],
  filters: [
    { member: 'orders.status', operator: 'equals', values: ['completed'] },
  ],
  order: { 'orders.totalRevenue': 'desc' },
  limit: 10,
};

// Tổng hợp nhiều granularity
const multiGranQuery = {
  measures: ['orders.count'],
  timeDimensions: [
    { dimension: 'orders.createdAt', granularity: 'week', dateRange: 'last 12 weeks' },
  ],
};

// So sánh kỳ trước (compareDateRange)
const compareQuery = {
  measures: ['orders.totalRevenue'],
  timeDimensions: [
    {
      dimension: 'orders.createdAt',
      compareDateRange: ['last week', 'this week'],
    },
  ],
};
```

### 3.4 Multi-measure query — dùng 1 useCubeQuery cho nhiều biểu đồ

Khi cần hiển thị **2+ biểu đồ cùng dimensions**, gộp vào **1 query duy nhất** thay vì tạo 2 query riêng:

```tsx
// ✅ ĐÚNG: 1 query, 2 measures → chia sau khi có data (tiết kiệm 1 round-trip)
const { resultSet, isLoading, error } = useCubeQuery(
  {
    measures: ['sales_record.totalQuantity', 'sales_record.totalRevenue'],
    dimensions: ['product.name'],
  },
  { subscribe: true, renewQuery: true }
);

if (error) return <ErrorBanner message={error.toString()} />;
if (isLoading || !resultSet) return <LoadingSkeleton />;

const chartData = resultSet.tablePivot().map(row => ({
  name: row['product.name'] as string,
  quantity: Number(row['sales_record.totalQuantity']) || 0,
  revenue: Number(row['sales_record.totalRevenue']) || 0,
}));

// Dùng chartData cho cả 2 biểu đồ
return (
  <>
    <QuantityChart data={chartData} />
    <RevenueChart data={chartData} />
  </>
);

// ❌ SAI: 2 useCubeQuery riêng cho cùng dimension → 2 lần round-trip
const { resultSet: qtySet } = useCubeQuery({ measures: ['sales_record.totalQuantity'], dimensions: ['product.name'] });
const { resultSet: revSet } = useCubeQuery({ measures: ['sales_record.totalRevenue'], dimensions: ['product.name'] });
```

### 3.5 Recharts BarChart với Cell coloring — Pattern chuẩn

```tsx
const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed'];

// Custom Tooltip tái sử dụng được (nhận suffix để format currency)
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <p style={{ color: payload[0].color }}>
        {payload[0].name}:{' '}
        {suffix === '$'
          ? `$${payload[0].value.toLocaleString()}`
          : payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

// BarChart với màu động theo index
<BarChart data={chartData}>
  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false}
         tickFormatter={(v) => `$${v}`} />  {/* Chỉ dùng tickFormatter cho trục tiền */}
  <Tooltip content={<CustomTooltip suffix="$" />} />
  <Bar dataKey="revenue" name="Doanh thu" radius={[6, 6, 0, 0]} barSize={40}>
    {chartData.map((_, i) => (
      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
    ))}
  </Bar>
</BarChart>
```

> 💡 `renewQuery: true` trong options buộc Cube re-fetch khi component re-mount, hữu ích khi
> navigate giữa các trang trong SPA.

---

## 4. Xử lý lỗi & Debugging

### 4.1 Lỗi YAML thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `Error: "pre_aggregations" must be a sequence` | Thiếu dấu `-` | Thêm `-` trước `name:` |
| `Unknown relationship type: belongsTo` | Dùng keyword cũ | Đổi sang `many_to_one` |
| `Column "createdAt" not found` | Thiếu ngoặc kép | `"{CUBE}.\"createdAt\""` |
| `Rollup does not match` | Dimension/Measure không khớp pre-agg | Kiểm tra tên đầy đủ `cube.member` |
| `Member of unknown cube: product.createdat` | Tên dimension sai case | Cube.js **case-sensitive**: dùng `product.createdAt`, không phải `product.createdat` |

### 4.2 Lỗi React / Query thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `WebSocketTransport is not a constructor` | Dùng named import | Đổi sang `import WebSocketTransport from '@cubejs-client/ws-transport'` |
| `Cannot read properties of null (reading 'tablePivot')` | Không check `!resultSet` | Luôn guard `if (isLoading \|\| !resultSet) return ...` |
| Query trả về data nhưng không refresh | Thiếu `subscribe: true` | Thêm `{ subscribe: true }` vào options |
| Data cũ khi navigate lại trang | Thiếu `renewQuery` | Thêm `renewQuery: true` vào options |
| Hard-code JWT token | Token hết hạn → toàn bộ dashboard trắng | Dùng hàm `() => getToken()` thay vì string cứng |

### 4.3 Vấn đề bảo mật từ code thực tế

```tsx
// ❌ NGUY HIỂM: JWT hard-code trong source code
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const cubejsApi = cubejs(TOKEN, { transport: new WebSocketTransport({ authorization: TOKEN }) });
// → Token bị lộ khi push git, không thể rotate, hết hạn là toàn bộ app crash

// ✅ ĐÚNG: Token từ env + hàm refresh động
const cubejsApi = cubejs(
  () => localStorage.getItem('auth_token') ?? '',
  { transport: new WebSocketTransport({
      authorization: () => localStorage.getItem('auth_token') ?? '',
      apiUrl: import.meta.env.VITE_CUBE_WS_URL,
    })
  }
);
```

### 4.2 Debugging với Cube Playground

```bash
# Xem query thực tế được sinh ra
curl http://localhost:4000/cubejs-api/v1/meta \
  -H "Authorization: Bearer <JWT>"

# Kiểm tra pre-aggregation có được dùng không
# Trong Playground: Query > "Show generated SQL" > kiểm tra FROM pre_agg_...
```

### 4.3 Frontend debugging

```tsx
// Kiểm tra pre-aggregation có được dùng
const { resultSet, isLoading, error, progress } = useCubeQuery(query);

// progress.stage: "Executing query" (hit pre-agg) vs "Loading pre-aggregations"
console.log('Query progress:', progress);

// Xem raw SQL được dùng (dev only)
if (resultSet) {
  console.log('Query annotation:', resultSet.annotation());
}
```

---

## 5. Multi-tenancy & Row-level Security

### 5.1 Kiến trúc JWT

```
Client → getJwtToken() → Auth Service
                           ↓
                    { userId, tenantId, role }
                           ↓
                    Ký bằng CUBEJS_JWT_SECRET
                           ↓
Client → WebSocket (token) → Cube.js → SecurityContext
```

### 5.2 Cube.js config (`cube.js`)

```js
// cube.js
module.exports = {
  contextToAppId: ({ securityContext }) =>
    `CUBEJS_APP_${securityContext.tenantId}`,  // Cache riêng theo tenant

  scheduledRefreshContexts: async () => [
    { securityContext: { tenantId: 'tenant_1' } },
    { securityContext: { tenantId: 'tenant_2' } },
  ],
};
```

### 5.3 YAML với Security Context

```yaml
cubes:
  - name: reports
    sql: >
      SELECT * FROM reports
      WHERE
        {SECURITY_CONTEXT.tenantId.requiredFilter('tenant_id')}
        AND {SECURITY_CONTEXT.role.filter('role')}
```

`requiredFilter` → Throw error nếu không có trong JWT (an toàn hơn `filter`).

---

## 6. CI/CD & Deployment

### 6.1 Cấu trúc thư mục chuẩn

```
project/
├── cube/
│   ├── model/
│   │   ├── orders.yml
│   │   ├── users.yml
│   │   └── products.yml
│   ├── cube.js              # Config (contextToAppId, scheduledRefresh...)
│   └── .env                 # CUBEJS_DB_*, CUBEJS_API_SECRET
├── frontend/
│   ├── components/
│   │   └── charts/
│   └── providers.tsx
└── docker-compose.yml
```

### 6.2 docker-compose.yml mẫu

```yaml
services:
  cube:
    image: cubejs/cube:latest
    ports:
      - "4000:4000"
    environment:
      CUBEJS_DB_TYPE: postgres
      CUBEJS_DB_HOST: db
      CUBEJS_DB_NAME: analytics
      CUBEJS_DB_USER: ${DB_USER}
      CUBEJS_DB_PASS: ${DB_PASS}
      CUBEJS_API_SECRET: ${CUBEJS_API_SECRET}
      CUBEJS_DEV_MODE: "false"
      CUBEJS_REFRESH_WORKER: "true"
    volumes:
      - ./cube/model:/cube/conf/model
      - ./cube/cube.js:/cube/conf/cube.js
```

### 6.3 Checklist trước khi deploy production

- [ ] `CUBEJS_DEV_MODE=false`
- [ ] `CUBEJS_API_SECRET` dài ≥ 32 ký tự, không commit vào git
- [ ] Pre-aggregations đã build xong (`CUBEJS_SCHEDULED_REFRESH_DEFAULT=true`)
- [ ] JWT expiry hợp lý (≤ 24h cho dashboard)
- [ ] `contextToAppId` đã cấu hình nếu dùng multi-tenant
- [ ] Rate limiting ở API Gateway phía trước Cube.js

---

## 7. Testing & Validation

### 7.1 Validate YAML schema

```bash
# Dùng Cube CLI để kiểm tra syntax
npx cubejs-cli validate

# Hoặc dry-run trong Docker
docker run --rm \
  -v $(pwd)/cube/model:/cube/conf/model \
  cubejs/cube:latest validate
```

### 7.2 Unit test cho React component

```tsx
// orders-chart.test.tsx
import { render, screen } from '@testing-library/react';
import { CubeContext } from '@cubejs-client/react';

const mockResultSet = {
  tablePivot: () => [
    { 'orders.createdAt.day': '2024-01-01', 'orders.totalRevenue': 1000 },
  ],
  annotation: () => ({}),
};

test('renders revenue chart', async () => {
  render(
    <CubeContext.Provider value={{ cubejsApi: null, isVerbose: false }}>
      <RevenueChart />
    </CubeContext.Provider>
  );
  // Mock useCubeQuery trả về mockResultSet
  expect(screen.getByRole('img', { name: /revenue/i })).toBeInTheDocument();
});
```

### 7.3 Integration test — kiểm tra pre-aggregation

```bash
# Gọi Cube REST API và kiểm tra annotation
curl -s "http://localhost:4000/cubejs-api/v1/load" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":{"measures":["orders.totalRevenue"]}}' \
| jq '.annotation.measures."orders.totalRevenue"'
# Kết quả mong đợi: có field "preAggregationType": "rollup"
```

---

## 8. Anti-Patterns — Tuyệt đối tránh

```yaml
# ❌ SAI: COUNT(*) refresh_key
refresh_key:
  sql: "SELECT COUNT(*) FROM orders"  # Full scan!

# ❌ SAI: Thiếu dấu - ở pre_aggregations
pre_aggregations:
  name: main           # Lỗi syntax — phải là - name: main

# ❌ SAI: Keyword deprecated
joins:
  - name: users
    relationship: belongsTo  # Dùng many_to_one

# ❌ SAI: Không bọc ngoặc kép tên CamelCase
dimensions:
  - name: createdAt
    sql: "{CUBE}.createdAt"  # Lỗi nếu DB case-sensitive → "{CUBE}.\"createdAt\""
```

```tsx
// ❌ SAI: Không xử lý error/loading
const { resultSet } = useCubeQuery(query);
return <Chart data={resultSet.tablePivot()} />;  // Crash khi resultSet là null!

// ❌ SAI: Dùng http:// thay vì ws://
const api = cubejs({ apiUrl: 'http://localhost:4000/cubejs-api/v1' });
// Real-time sẽ không hoạt động

// ❌ SAI: Hard-code rollup name
const query = { measures: ['orders.main_rollup'] };  // Không phải cách Cube hoạt động

// ❌ SAI: Hard-code JWT token (lỗi bảo mật + app crash khi token hết hạn)
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const cubejsApi = cubejs(TOKEN, { transport: new WebSocketTransport({ authorization: TOKEN }) });

// ❌ SAI: Named import WebSocketTransport (lỗi runtime)
import { WebSocketTransport } from '@cubejs-client/ws-transport';
// → Phải dùng: import WebSocketTransport from '@cubejs-client/ws-transport';

// ❌ SAI: Measure + non-aggregated dimension trong cùng 1 query mà không có timeDimension
// (dễ gây "Rollup does not match" hoặc kết quả sai)
const badQuery = {
  measures: ['sales_record.totalRevenue'],
  dimensions: ['sales_record.quantity'],  // ← raw dimension, không phải aggregated
};
// → Tách thành 2 query hoặc dùng timeDimension + granularity
```

---

## 9. Workflow chuẩn khi nhận yêu cầu mới

```
Yêu cầu mới
    │
    ▼
1. Phân tích: Cần những Dimension/Measure nào?
    │
    ▼
2. Viết/cập nhật file .yml
   ├── Khai báo dimensions (type, sql với ngoặc kép nếu CamelCase)
   ├── Khai báo measures (type: sum/count/avg)
   ├── Thêm joins nếu cần (dùng many_to_one/one_to_many)
   └── Thêm pre_aggregations (luôn có dấu -)
    │
    ▼
3. Validate YAML (npx cubejs-cli validate)
    │
    ▼
4. Viết React Component
   ├── useCubeQuery với { subscribe: true }
   ├── Xử lý isLoading → <Skeleton />
   ├── Xử lý error → <ErrorBanner />
   └── Render data
    │
    ▼
5. Kiểm tra pre-aggregation được dùng (xem annotation)
```

---

## 10. Self-Check Checklist (chạy trước khi xuất code)

### YAML
- [ ] `pre_aggregations` dùng dấu `-` (sequence)
- [ ] `relationship` dùng `many_to_one` / `one_to_many` / `one_to_one`
- [ ] Tên cột CamelCase được bọc `\"columnName\"`
- [ ] `refresh_key` dùng `MAX(id)` hoặc `MAX(updated_at)`, không dùng `COUNT(*)`
- [ ] Tên measures/dimensions đầy đủ `cube_name.member_name` trong pre-agg
- [ ] Tên dimension trong query Frontend **đúng case** với tên khai báo trong YAML (case-sensitive)

### React
- [ ] `WebSocketTransport` dùng **default import**, không phải named import
- [ ] `apiUrl` bắt đầu bằng `ws://` hoặc `wss://`
- [ ] `{ subscribe: true }` trong `useCubeQuery`
- [ ] `renewQuery: true` nếu component có thể bị unmount/remount
- [ ] Xử lý `error` → `isLoading || !resultSet` → render (đúng thứ tự)
- [ ] Không hard-code JWT token — phải là hàm `() => getToken()`
- [ ] Không hard-code tên rollup/cache vào query
- [ ] Khi cần nhiều biểu đồ cùng dimension: gộp 1 query, chia data sau

---

*File này áp dụng cho Cube.js v0.35+ (YAML schema). Với phiên bản JS/TS cũ,
tham khảo thêm tài liệu migration tại https://cube.dev/docs/schema/migration.*
