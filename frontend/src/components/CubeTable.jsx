import React from 'react';
import { useCubeQuery } from '@cubejs-client/react';

export default function CubeTable() {
  const { resultSet, isLoading, error } = useCubeQuery(
    {
      "measures": [
        "product.price",
        "sales_record.totalQuantity",
        "sales_record.totalRevenue"
      ],
      "dimensions": [
        "product.name",
        "sales_record.quantity"
      ],
      "timeDimensions": [
        {
          "dimension": "product.createdat",
          "granularity": "minute"
        }
      ]
    },
    { subscribe: true }
  );

  if (isLoading) return <div className="cube-loading">⏳ Đang khởi tạo đường ống Real-time qua Cube.js...</div>;
  if (error) return <div className="cube-error">Lỗi: {error.toString()}</div>;
  if (!resultSet) return null;

  const tableData = resultSet.tablePivot();

  return (
    <div className="glass-card table-container">
      <h2 style={{ marginBottom: '1.5rem', color: '#f8fafc' }}>
        Danh sách Bán hàng <span style={{fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'4px 8px', borderRadius:'12px', marginLeft:'8px'}}>⚡ Real-time</span>
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
            {tableData.map((row, index) => (
              <tr key={index}>
                <td>{row['product.name']}</td>
                <td style={{ color: '#94a3b8' }}>{row['product.createdat'] ? String(row['product.createdat']).substring(0, 16).replace('T', ' ') : ''}</td>
                <td>{row['sales_record.quantity']}</td>
                <td>{row['product.price']}</td>
                <td>{row['sales_record.totalQuantity']}</td>
                <td style={{ color: '#10b981', fontWeight: 'bold' }}>{row['sales_record.totalRevenue']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
