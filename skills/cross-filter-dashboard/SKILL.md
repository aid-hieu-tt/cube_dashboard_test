---
name: cross-filter-dashboard
description: >
  Hệ thống Cross-filtering cho React Dashboard — cho phép click vào bất kỳ
  chart hoặc table nào để filter đồng bộ toàn bộ dashboard (giống Looker Studio).
  Kích hoạt khi người dùng đề cập: cross-filter, lọc liên biểu đồ, click filter,
  interactive filter, drill-down, Looker-style, dashboard filter, hoặc bất kỳ
  yêu cầu nào muốn click vào 1 chart mà các chart khác cũng thay đổi theo.
---

# Cross-filter Dashboard System

## 1. Tổng quan

Cross-filtering là cơ chế cho phép **click vào bất kỳ phần tử nào** (bar, pie
slice, legend, table row) trên dashboard để **filter đồng bộ** tất cả các
component còn lại — y hệt trải nghiệm trên Google Looker Studio hoặc Power BI.

### 1.1 Tính năng

| Tính năng | Mô tả |
|---|---|
| **Click-to-filter** | Click vào bar, pie slice, legend, hoặc table row |
| **Toggle** | Click cùng item lần 2 → xóa filter |
| **Đồng bộ toàn dashboard** | Tất cả charts + tables đều phản ứng cùng lúc |
| **Visual feedback** | Item chọn: full color + white stroke. Còn lại: opacity 20% |
| **Filter badge** | Badge hiển thị item đang lọc + nút xóa |
| **Không cần thêm API call** | Hoạt động 100% client-side trên dữ liệu đã load |
| **Zero props drilling** | Dùng React Context — không truyền props qua App.jsx |

### 1.2 Kiến trúc tổng quát

```
┌─────────────────────────────────────────────┐
│                  App.jsx                     │
│  ┌─────────────────────────────────────────┐ │
│  │          <CubeDashboard />              │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │    <CrossFilterProvider>           │  │ │
│  │  │  ┌─────────────────────────────┐  │  │ │
│  │  │  │    <DashboardContent />     │  │  │ │
│  │  │  │  ┌──────┐  ┌────────────┐  │  │  │ │
│  │  │  │  │Charts│  │   Table    │  │  │  │ │
│  │  │  │  │      │  │            │  │  │  │ │
│  │  │  │  └──┬───┘  └─────┬──────┘  │  │  │ │
│  │  │  │     │             │         │  │  │ │
│  │  │  │     └──────┬──────┘         │  │  │ │
│  │  │  │            │                │  │  │ │
│  │  │  │   useCrossFilter() hook     │  │  │ │
│  │  │  └─────────────────────────────┘  │  │ │
│  │  └───────────────────────────────────┘  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 2. Cấu trúc Files

```
frontend/src/components/
├── CrossFilterContext.jsx   ← Context + Provider + useCrossFilter() hook
├── CubeDashboard.jsx        ← Wrapper: Provider → FilterBadge + Charts + Table
├── CubeCharts.jsx           ← Charts consume useCrossFilter()
└── CubeTable.jsx            ← Table consume useCrossFilter()
```

### 2.1 Nhiệm vụ từng file

| File | Vai trò | Phụ thuộc |
|---|---|---|
| `CrossFilterContext.jsx` | Quản lý state filter (Context + Provider + Hook) | React only |
| `CubeDashboard.jsx` | Bọc Provider, render FilterBadge + children | CrossFilterContext |
| `CubeCharts.jsx` | Render charts, gọi `toggleProduct()` khi click | CrossFilterContext, Recharts |
| `CubeTable.jsx` | Render table, filter rows + click toggle | CrossFilterContext |

---

## 3. Chi tiết Implementation

### 3.1 CrossFilterContext.jsx — Core Module

Đây là **brain** của hệ thống. Cung cấp 3 giá trị qua Context:

```jsx
// CrossFilterContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const CrossFilterContext = createContext(null);

export function CrossFilterProvider({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Toggle: click lần 1 → chọn, click lần 2 → bỏ chọn
  const toggleProduct = useCallback((productName) => {
    setSelectedProduct(prev => prev === productName ? null : productName);
  }, []);

  // Xóa filter hoàn toàn
  const clearFilter = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  return (
    <CrossFilterContext.Provider value={{ selectedProduct, toggleProduct, clearFilter }}>
      {children}
    </CrossFilterContext.Provider>
  );
}

export function useCrossFilter() {
  const context = useContext(CrossFilterContext);
  if (!context) {
    throw new Error('useCrossFilter must be used within a <CrossFilterProvider>');
  }
  return context;
}
```

#### API Reference

| Giá trị | Type | Mô tả |
|---|---|---|
| `selectedProduct` | `string \| null` | Tên product đang filter. `null` = không filter |
| `toggleProduct(name)` | `(string) => void` | Toggle chọn/bỏ chọn product |
| `clearFilter()` | `() => void` | Xóa filter, hiển thị tất cả |

### 3.2 CubeDashboard.jsx — Wrapper Module

```jsx
// CubeDashboard.jsx
import React from 'react';
import { CrossFilterProvider, useCrossFilter } from './CrossFilterContext';
import CubeCharts from './CubeCharts';
import CubeTable from './CubeTable';

export default function CubeDashboard() {
  return (
    <CrossFilterProvider>
      <DashboardContent />
    </CrossFilterProvider>
  );
}

function DashboardContent() {
  const { selectedProduct, clearFilter } = useCrossFilter();
  return (
    <div>
      {/* Filter Badge — hiển thị khi đang lọc */}
      {selectedProduct && (
        <div className="filter-badge" onClick={clearFilter}>
          <span>🔍 Đang lọc: <strong>{selectedProduct}</strong></span>
          <span className="filter-clear">✕ Xóa bộ lọc</span>
        </div>
      )}
      <CubeCharts />
      <CubeTable />
    </div>
  );
}
```

**Trong App.jsx** chỉ cần 1 dòng:

```jsx
import CubeDashboard from './components/CubeDashboard';

// Trong JSX:
<CubeDashboard />
```

> ⚠️ **Nguyên tắc**: App.jsx KHÔNG biết gì về cross-filter logic. Mọi thứ nằm gọn trong module.

### 3.3 Tích hợp với Chart (Recharts)

#### Quy tắc QUAN TRỌNG cho onClick

| ❌ SAI | ✅ ĐÚNG | Lý do |
|---|---|---|
| `<BarChart onClick={handler}>` | `<Bar onClick={handler}>` | Recharts không fire click event đáng tin cậy trên wrapper |
| `<PieChart onClick={handler}>` | `<Pie onClick={handler}>` | Tương tự — phải đặt trên component con |

#### Click handler cho Bar Chart:

```jsx
import { useCrossFilter } from './CrossFilterContext';

function MyBarChart() {
  const { selectedProduct, toggleProduct } = useCrossFilter();

  const handleBarItemClick = useCallback((data) => {
    if (data?.name) toggleProduct(data.name);
  }, [toggleProduct]);

  return (
    <BarChart data={chartData}>
      {/* onClick đặt trên <Bar>, KHÔNG phải <BarChart> */}
      <Bar dataKey="quantity" onClick={handleBarItemClick} style={{ cursor: 'pointer' }}>
        {chartData.map((entry, index) => (
          <Cell
            key={index}
            fill={getCellFill(entry.name, index)}    // Highlight/dim
            stroke={getCellStroke(entry.name)}         // White border
            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
          />
        ))}
      </Bar>
    </BarChart>
  );
}
```

#### Click handler cho Pie Chart:

```jsx
const handlePieSliceClick = useCallback((data) => {
  if (data?.name) toggleProduct(data.name);
}, [toggleProduct]);

<Pie data={pieData} onClick={handlePieSliceClick} style={{ cursor: 'pointer' }}>
  {pieData.map((entry, index) => (
    <Cell key={index} fill={getCellFill(entry.name, index)} />
  ))}
</Pie>

{/* Legend cũng có thể click */}
<Legend formatter={(value) => (
  <span onClick={() => toggleProduct(value)} style={{ cursor: 'pointer' }}>
    {value}
  </span>
)} />
```

### 3.4 Visual Feedback — Highlight & Dim

```jsx
const DIM_OPACITY = 0.2;
const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed'];

// Trả về fill color: full nếu đang chọn hoặc chưa filter, mờ nếu không phải item chọn
const getCellFill = (name, index) => {
  const baseColor = COLORS[index % COLORS.length];
  if (!selectedProduct) return baseColor;           // Chưa filter → full color
  return name === selectedProduct
    ? baseColor                                      // Đúng item → full color
    : `${baseColor}${Math.round(DIM_OPACITY * 255)  // Khác item → hex alpha 33 (20%)
        .toString(16).padStart(2, '0')}`;
};

// Trả về stroke: white nếu đang chọn, none nếu không
const getCellStroke = (name) => {
  if (!selectedProduct) return 'none';
  return name === selectedProduct ? '#fff' : 'none';
};
```

**Trạng thái visual:**

| Trạng thái | Fill | Stroke | Opacity Label |
|---|---|---|---|
| Chưa filter | Full color | none | 1.0 |
| Đang filter — item được chọn | Full color | #fff (2-3px) | 1.0 |
| Đang filter — item khác | Color + alpha 33 | none | 0.2 |

### 3.5 Tích hợp với Table

```jsx
import { useCrossFilter } from './CrossFilterContext';

function MyTable() {
  const { selectedProduct, toggleProduct } = useCrossFilter();

  const tableData = resultSet.tablePivot();

  // Lọc rows — chỉ hiển thị product đang chọn
  const filteredData = selectedProduct
    ? tableData.filter(row => row['product.name'] === selectedProduct)
    : tableData;

  return (
    <table>
      <tbody>
        {filteredData.map((row, index) => {
          const isSelected = selectedProduct === row['product.name'];
          return (
            <tr
              key={index}
              onClick={() => toggleProduct(row['product.name'])}
              style={{
                cursor: 'pointer',
                background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <td style={{ fontWeight: isSelected ? 700 : 400 }}>
                {row['product.name']}
              </td>
              {/* ... other columns */}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

### 3.6 CSS cần thiết

```css
/* Cross-filter Badge */
.filter-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  padding: 0.65rem 1.2rem;
  margin-bottom: 1rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.filter-badge:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25));
  border-color: rgba(99, 102, 241, 0.5);
}

.filter-clear {
  color: #94a3b8;
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.filter-badge:hover .filter-clear {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 4. Quy tắc bắt buộc (PHẢI tuân thủ)

### 4.1 onClick Placement

```
❌ TUYỆT ĐỐI KHÔNG: <BarChart onClick={handler}>
✅ BẮT BUỘC:          <Bar onClick={handler}>

❌ TUYỆT ĐỐI KHÔNG: <PieChart onClick={handler}>
✅ BẮT BUỘC:          <Pie onClick={handler}>
```

**Lý do**: Recharts v2.x không fire click event đáng tin cậy trên wrapper
components (`BarChart`, `PieChart`). Click event chỉ đáng tin cậy khi đặt
trực tiếp trên `<Bar>`, `<Pie>`, `<Area>`, `<Line>`, v.v.

### 4.2 State Management

| Quy tắc | Lý do |
|---|---|
| Dùng **Context**, không dùng props drilling | Tránh phụ thuộc App.jsx |
| State nằm trong **CrossFilterProvider** | Single source of truth |
| Toggle behavior (click 2 lần = bỏ chọn) | UX giống Looker Studio |
| `useCallback` cho tất cả click handlers | Tránh re-render không cần thiết |

### 4.3 Data Flow

```
User click → toggleProduct(name) → setSelectedProduct(name)
                                          ↓
                              Context re-renders consumers
                                          ↓
                        ┌─────────────────┼─────────────────┐
                        ↓                 ↓                 ↓
                   CubeCharts         CubeTable         FilterBadge
                   (dim/highlight)    (filter rows)     (show/hide)
```

### 4.4 Performance

| Tối ưu | Cách làm |
|---|---|
| Không tạo thêm API call | Filter data đã load sẵn ở client-side |
| `useCallback` | Memoize handlers, tránh re-create mỗi render |
| CSS `transition` | Dùng CSS transition thay vì JS animation |
| Chỉ re-render consumers | Context chỉ trigger re-render component dùng `useCrossFilter()` |

---

## 5. Mở rộng (Extension Guide)

### 5.1 Thêm chart mới có cross-filter

Chỉ cần 3 bước:

```jsx
// 1. Import hook
import { useCrossFilter } from './CrossFilterContext';

// 2. Trong component
const { selectedProduct, toggleProduct } = useCrossFilter();

// 3. Đặt onClick trên element
<Bar onClick={(data) => { if (data?.name) toggleProduct(data.name); }}>
  <Cell fill={getCellFill(entry.name, index)} />
</Bar>
```

### 5.2 Mở rộng sang multi-dimension filter

Nếu cần filter theo nhiều dimension (product + region + time):

```jsx
// Mở rộng CrossFilterContext:
const [filters, setFilters] = useState({});
// filters = { product: 'prod1', region: 'HCM', time: null }

const toggleFilter = (dimension, value) => {
  setFilters(prev => ({
    ...prev,
    [dimension]: prev[dimension] === value ? null : value,
  }));
};

const clearAllFilters = () => setFilters({});
```

### 5.3 Thêm Line Chart / Area Chart

```jsx
// Line Chart — onClick đặt trên <Line>, dùng activeDot
<Line
  dataKey="revenue"
  activeDot={{
    onClick: (_, payload) => toggleProduct(payload.payload.name),
    style: { cursor: 'pointer' }
  }}
/>
```

---

## 6. Checklist trước khi commit

- [ ] `CrossFilterContext.jsx` export cả `CrossFilterProvider` và `useCrossFilter`
- [ ] `CubeDashboard.jsx` bọc `<CrossFilterProvider>` ngoài cùng
- [ ] Mỗi chart gọi `useCrossFilter()` — KHÔNG truyền props
- [ ] `onClick` đặt trên `<Bar>`, `<Pie>`, `<Line>` — KHÔNG trên `<BarChart>`
- [ ] Visual feedback: `getCellFill()` + `getCellStroke()` trên mỗi `<Cell>`
- [ ] Table filter rows bằng `selectedProduct`
- [ ] Filter badge hiển thị đúng + clear được
- [ ] CSS `.filter-badge` + `.filter-clear` + `@keyframes slideDown` đã thêm
- [ ] `useCallback` trên mọi click handler
- [ ] App.jsx chỉ import `<CubeDashboard />` — không biết cross-filter logic
