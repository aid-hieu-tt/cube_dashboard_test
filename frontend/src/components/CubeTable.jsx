import React from 'react';
import { useCubeQuery } from '@cubejs-client/react';
import { useCrossFilter } from './CrossFilterContext';

export default function CubeTable() {
  const { selectedProduct, toggleProduct } = useCrossFilter();

  const { resultSet, isLoading, error } = useCubeQuery(
    {
      measures: ['product.price', 'sales_record.totalQuantity', 'sales_record.totalRevenue'],
      dimensions: ['product.name', 'sales_record.quantity'],
      timeDimensions: [
        { dimension: 'product.createdat', granularity: 'minute' },
      ],
    },
    { subscribe: true }
  );

  if (isLoading) return <div className="cube-loading">⏳ Đang khởi tạo đường ống Real-time qua Cube.js...</div>;
  if (error) return <div className="cube-error">Lỗi: {error.toString()}</div>;
  if (!resultSet) return null;

  const tableData = resultSet.tablePivot();

  // Lọc data theo selectedProduct nếu có
  const filteredData = selectedProduct
    ? tableData.filter(row => row['product.name'] === selectedProduct)
    : tableData;

  return (
    <div className="glass-card table-container">
      <h2 style={{ marginBottom: '1.5rem', color: '#f8fafc' }}>
        Danh sách Bán hàng{' '}
        <span style={{fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'4px 8px', borderRadius:'12px', marginLeft:'8px'}}>⚡ Real-time</span>
        {selectedProduct && (
          <span style={{
            fontSize: '0.75rem', color: '#a78bfa',
            background: 'rgba(167, 139, 250, 0.1)', padding: '4px 10px',
            borderRadius: '12px', marginLeft: '8px',
            border: '1px solid rgba(167, 139, 250, 0.3)',
          }}>
            🔍 {selectedProduct} ({filteredData.length} bản ghi)
          </span>
        )}
      </h2>
      <div className="table-responsive">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Tên Sản phẩm</th>
              <th>Thời gian (createdAt)</th>
              <th>Raw Quantity</th>
              <th>Price (AVG)</th>
              <th>∑ Total Quantity</th>
              <th>∑ Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  {selectedProduct ? `Không có dữ liệu cho "${selectedProduct}"` : 'Chưa có dữ liệu bán hàng'}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => {
                const productName = row['product.name'];
                const isSelected = selectedProduct === productName;

                return (
                  <tr key={index}
                      onClick={() => toggleProduct(productName)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                        transition: 'all 0.3s ease',
                      }}>
                    <td style={{ fontWeight: isSelected ? 700 : 400 }}>{productName}</td>
                    <td style={{ color: '#94a3b8' }}>
                      {row['product.createdat'] ? String(row['product.createdat']).substring(0, 16).replace('T', ' ') : ''}
                    </td>
                    <td>{row['sales_record.quantity']}</td>
                    <td>{row['product.price']}</td>
                    <td>{row['sales_record.totalQuantity']}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>{row['sales_record.totalRevenue']}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
