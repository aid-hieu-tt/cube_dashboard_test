import React from 'react';
import { useCubeQuery } from '@cubejs-client/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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

    </div>
  );
}
