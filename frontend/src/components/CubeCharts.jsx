import React, { useState, useCallback } from 'react';
import { useCubeQuery } from '@cubejs-client/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed'];
const DIM_OPACITY = 0.2; // Độ mờ cho các phần tử không được chọn

export default function CubeCharts() {
  // Cross-filter state: null = chưa chọn, string = tên product đang chọn
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { resultSet, isLoading, error } = useCubeQuery(
    {
      "measures": [
        "sales_record.totalQuantity",
        "sales_record.totalRevenue"
      ],
      "dimensions": [
        "product.name"
      ]
    },
    { subscribe: true, renewQuery: true }
  );

  // Toggle chọn/bỏ chọn product — dùng useCallback tránh re-create mỗi render
  const handleProductClick = useCallback((productName) => {
    setSelectedProduct(prev => prev === productName ? null : productName);
  }, []);

  // Click handler cho BarChart
  const handleBarClick = useCallback((data) => {
    if (data?.activePayload?.[0]) {
      handleProductClick(data.activePayload[0].payload.name);
    }
  }, [handleProductClick]);

  // Click handler cho PieChart slice
  const handlePieClick = useCallback((_, index, pieData) => {
    if (pieData[index]) {
      handleProductClick(pieData[index].name);
    }
  }, [handleProductClick]);

  if (isLoading) {
    return (
      <div className="grid-list" style={{ marginBottom: '2rem' }}>
        <div className="glass-card chart-placeholder">
          <div className="chart-header">
            <h3>📊 Số lượng bán được từng Sản phẩm</h3>
            <p>Quantity by Product</p>
          </div>
          <div className="chart-body empty-chart">
            <span>⏳ Đang tải dữ liệu biểu đồ...</span>
          </div>
        </div>
        <div className="glass-card chart-placeholder">
          <div className="chart-header">
            <h3>📈 Tổng doanh thu từng Sản phẩm</h3>
            <p>Revenue by Product</p>
          </div>
          <div className="chart-body empty-chart">
            <span>⏳ Đang tải dữ liệu biểu đồ...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid-list" style={{ marginBottom: '2rem' }}>
        <div className="glass-card chart-placeholder">
          <div className="chart-body empty-chart">
            <span style={{ color: '#ef4444' }}>Lỗi: {error.toString()}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!resultSet) return null;

  const rawData = resultSet.tablePivot();

  const chartData = rawData.map(row => ({
    name: row['product.name'],
    quantity: Number(row['sales_record.totalQuantity']) || 0,
    revenue: Number(row['sales_record.totalRevenue']) || 0,
  }));

  // Tính tổng doanh thu & tỉ lệ % cho PieChart
  const totalRevenueSum = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const pieData = chartData
    .filter(item => item.revenue > 0)
    .map(item => ({
      name: item.name,
      value: item.revenue,
      pct: totalRevenueSum > 0 ? ((item.revenue / totalRevenueSum) * 100).toFixed(1) : 0,
    }));

  // Helper: tính fill color với opacity dựa theo selection
  const getCellFill = (name, index) => {
    const baseColor = COLORS[index % COLORS.length];
    if (!selectedProduct) return baseColor; // Không có selection → full color
    return name === selectedProduct ? baseColor : `${baseColor}${Math.round(DIM_OPACITY * 255).toString(16).padStart(2, '0')}`;
  };

  // Helper: tính stroke cho selected item
  const getCellStroke = (name) => {
    if (!selectedProduct) return 'none';
    return name === selectedProduct ? '#fff' : 'none';
  };

  const CustomTooltip = ({ active, payload, label, suffix }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#f8fafc',
          fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          <p style={{ color: payload[0].color }}>
            {payload[0].name}: {suffix === '$' ? `$${payload[0].value.toLocaleString()}` : payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label cho PieChart: hiển thị tên + %
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 28;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pctValue = (percent * 100).toFixed(1);
    if (percent < 0.04) return null;

    // Mờ label nếu đang filter và không phải item được chọn
    const labelOpacity = selectedProduct && name !== selectedProduct ? DIM_OPACITY : 1;
    return (
      <text x={x} y={y} fill="#e2e8f0" textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central" fontSize={12} fontWeight={500}
            opacity={labelOpacity}>
        {name} ({pctValue}%)
      </text>
    );
  };

  // Custom Tooltip cho PieChart
  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#f8fafc',
        fontSize: '0.85rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
      }}>
        <p style={{ fontWeight: 600, marginBottom: 4, color: item.payload.fill }}>{item.name}</p>
        <p>Doanh thu: <strong>${item.value.toLocaleString()}</strong></p>
        <p>Tỉ lệ: <strong>{item.payload.pct}%</strong></p>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '2rem' }}>

      {/* Cross-filter indicator */}
      {selectedProduct && (
        <div className="filter-badge" onClick={() => setSelectedProduct(null)}>
          <span>🔍 Đang lọc: <strong>{selectedProduct}</strong></span>
          <span className="filter-clear">✕ Xóa bộ lọc</span>
        </div>
      )}

      <div className="grid-list" style={{ marginBottom: 0 }}>

        {/* Chart 1: Số lượng bán */}
        <div className="glass-card chart-placeholder">
          <div className="chart-header">
            <h3>📊 Số lượng bán được từng Sản phẩm</h3>
            <p>Quantity by Product <span style={{fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:'8px', marginLeft:'6px'}}>⚡ Real-time</span></p>
          </div>
          {chartData.length === 0 ? (
            <div className="chart-body empty-chart">
              <span>Chưa có dữ liệu bán hàng</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip suffix="" />} />
                <Bar dataKey="quantity" name="Số lượng" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-q-${index}`}
                      fill={getCellFill(entry.name, index)}
                      stroke={getCellStroke(entry.name)}
                      strokeWidth={getCellStroke(entry.name) !== 'none' ? 2 : 0}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Tổng doanh thu */}
        <div className="glass-card chart-placeholder">
          <div className="chart-header">
            <h3>📈 Tổng doanh thu từng Sản phẩm</h3>
            <p>Revenue by Product <span style={{fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:'8px', marginLeft:'6px'}}>⚡ Real-time</span></p>
          </div>
          {chartData.length === 0 ? (
            <div className="chart-body empty-chart">
              <span>Chưa có dữ liệu bán hàng</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip suffix="$" />} />
                <Bar dataKey="revenue" name="Doanh thu" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-r-${index}`}
                      fill={getCellFill(entry.name, index)}
                      stroke={getCellStroke(entry.name)}
                      strokeWidth={getCellStroke(entry.name) !== 'none' ? 2 : 0}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Pie Chart — Tỉ lệ doanh thu */}
        <div className="glass-card chart-placeholder" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <h3>🥧 Tỉ lệ doanh thu theo Sản phẩm</h3>
            <p>Revenue Share by Product <span style={{fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:'8px', marginLeft:'6px'}}>⚡ Real-time</span></p>
          </div>
          {pieData.length === 0 ? (
            <div className="chart-body empty-chart">
              <span>Chưa có dữ liệu doanh thu</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={renderCustomLabel}
                  animationBegin={0}
                  animationDuration={800}
                  stroke="rgba(15, 23, 42, 0.8)"
                  strokeWidth={2}
                  onClick={(_, index) => handlePieClick(_, index, pieData)}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={getCellFill(entry.name, index)}
                      stroke={getCellStroke(entry.name)}
                      strokeWidth={getCellStroke(entry.name) !== 'none' ? 3 : 2}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem', paddingTop: '12px' }}
                  formatter={(value) => (
                    <span
                      style={{
                        color: selectedProduct && value !== selectedProduct ? '#475569' : '#cbd5e1',
                        marginLeft: 4,
                        cursor: 'pointer',
                        fontWeight: value === selectedProduct ? 700 : 400,
                        textDecoration: value === selectedProduct ? 'underline' : 'none',
                      }}
                      onClick={() => handleProductClick(value)}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
