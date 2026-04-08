import React, { useState, useEffect } from 'react';

const ProductForm = ({ onSave, currentProduct, onCancel }) => {
  const [formData, setFormData] = useState({ name: '', description: '', price: '' });

  useEffect(() => {
    if (currentProduct) {
      setFormData({
        name: currentProduct.name,
        description: currentProduct.description || '',
        price: currentProduct.price.toString()
      });
    } else {
      setFormData({ name: '', description: '', price: '' });
    }
  }, [currentProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    onSave(formData);
    setFormData({ name: '', description: '', price: '' });
  };

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#f8fafc' }}>
        {currentProduct ? 'Edit Product' : 'Add New Product'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter product name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            placeholder="Product details"
            rows="3"
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">Price ($)</label>
          <input
            type="number"
            id="price"
            name="price"
            className="form-control"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary">
            {currentProduct ? 'Update Product' : 'Add Product'}
          </button>
          {currentProduct && (
            <button type="button" className="btn btn-danger" onClick={onCancel}>
              Cancel Form
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
