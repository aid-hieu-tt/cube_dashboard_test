import React from 'react';
import { useCubeQuery } from '@cubejs-client/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed'];

export default function CubeCharts() {
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
    if (percent < 0.04) return null; // Ẩn label quá nhỏ (< 4%)
    return (
      <text x={x} y={y} fill="#e2e8f0" textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central" fontSize={12} fontWeight={500}>
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
    <div className="grid-list" style={{ marginBottom: '2rem' }}>

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
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                {chartData.map((_, index) => (
                  <Cell key={`cell-q-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                {chartData.map((_, index) => (
                  <Cell key={`cell-r-${index}`} fill={COLORS[index % COLORS.length]} />
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
              >
                {pieData.map((_, index) => (
                  <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem', paddingTop: '12px' }}
                formatter={(value) => <span style={{ color: '#cbd5e1', marginLeft: 4 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
