import React, { useState } from 'react';

const ProductList = ({ products, onEdit, onDelete, onAddSale }) => {
  const [addingFor, setAddingFor] = useState(null);
  const [saleData, setSaleData] = useState({ quantity: 1, unitPrice: '' });

  const handleSaleSubmit = (e, productId) => {
    e.preventDefault();
    onAddSale(productId, saleData.quantity, saleData.unitPrice);
    setAddingFor(null);
    setSaleData({ quantity: 1, unitPrice: '' });
  };

  return (
    <div className="grid-list">
      {products.length === 0 ? (
        <div className="empty-state">
          No products found. Create one above!
        </div>
      ) : (
        products.map(product => (
          <div key={product.id} className="glass-card product-info">
            <h3>{product.name}</h3>
            <div className="product-price">${parseFloat(product.price).toFixed(2)}</div>
            <p>{product.description || 'No description provided.'}</p>
            
            {/* RAW Sales Records Table embedded */}
            {product.salesRecords && product.salesRecords.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <strong style={{ color: '#cbd5e1' }}>Raw Sales History:</strong>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                  {product.salesRecords.map(record => (
                    <li key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 0', color: '#94a3b8' }}>
                      <span style={{ color: '#10b981' }}>+{record.quantity} units</span> @ ${record.unitPrice} <strong>= ${(record.quantity * record.unitPrice).toFixed(2)}</strong>
                      <span style={{ fontSize: '0.75rem', marginLeft: '8px' }}>({new Date(record.saleDate).toLocaleDateString()})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="product-actions" style={{ marginBottom: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#ec4899' }}
                onClick={() => {
                  setAddingFor(product.id);
                  setSaleData({ quantity: 1, unitPrice: product.price });
                }}
              >
                + Raw Sale
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => onEdit(product)}
              >
                Edit
              </button>
              <button 
                className="btn btn-danger"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => onDelete(product.id)}
              >
                Delete
              </button>
            </div>

            {/* Inline Add Sale Form */}
            {addingFor === product.id && (
              <form onSubmit={(e) => handleSaleSubmit(e, product.id)} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-control" 
                    placeholder="Qty" 
                    style={{ padding: '0.5rem' }}
                    value={saleData.quantity}
                    onChange={e => setSaleData({...saleData, quantity: e.target.value})}
                    required
                  />
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    placeholder="Price" 
                    style={{ padding: '0.5rem' }}
                    value={saleData.unitPrice}
                    onChange={e => setSaleData({...saleData, unitPrice: e.target.value})}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem', flex: 1, fontSize: '0.8rem' }}>Save Raw Data</button>
                  <button type="button" className="btn btn-danger" style={{ padding: '0.4rem', fontSize: '0.8rem' }} onClick={() => setAddingFor(null)}>Cancel</button>
                </div>
              </form>
            )}

          </div>
        ))
      )}
    </div>
  );
};

export default ProductList;
