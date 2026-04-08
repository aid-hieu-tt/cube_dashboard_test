import React from 'react';
import { CrossFilterProvider, useCrossFilter } from './CrossFilterContext';
import CubeCharts from './CubeCharts';
import CubeTable from './CubeTable';

/**
 * CubeDashboard — Module tự chứa toàn bộ dashboard analytics.
 * Bọc CrossFilterProvider để Charts + Table chia sẻ filter state nội bộ.
 * App.jsx chỉ cần gọi <CubeDashboard /> mà không cần biết logic filter bên trong.
 */
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
      {/* Cross-filter indicator */}
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
