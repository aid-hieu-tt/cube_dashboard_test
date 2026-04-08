import { useState, useEffect } from 'react';
import axios from 'axios';
import cubejs from '@cubejs-client/core';
import { CubeProvider } from '@cubejs-client/react';
import WebSocketTransport from '@cubejs-client/ws-transport';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import CubeDashboard from './components/CubeDashboard';

const API_URL = 'http://localhost:5000/api/products';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzU1ODUwMDd9.eNWC0R14EVB3UnEwXe7_IRv0uyj_cOyNxcONuZeIMDs';

const cubejsApi = cubejs(TOKEN, {
  transport: new WebSocketTransport({
    authorization: TOKEN,
    apiUrl: 'ws://localhost:4000/'
  })
});

function App() {
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_URL);
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = async (product) => {
    try {
      if (currentProduct) {
        await axios.put(`${API_URL}/${currentProduct.id}`, product);
      } else {
        await axios.post(API_URL, product);
      }
      setCurrentProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
  };

  const handleCancel = () => {
    setCurrentProduct(null);
  };

  const handleAddSale = async (productId, quantity, unitPrice) => {
    try {
      await axios.post('http://localhost:5000/api/sales-records', {
        productId,
        quantity,
        unitPrice
      });
      fetchProducts();
    } catch (error) {
      console.error('Error logging sale:', error);
    }
  };

  return (
    <CubeProvider cubeApi={cubejsApi}>
      <div className="container">
        <div className="header">
          <h1>Product Inventory</h1>
          <p>Premium CRUD Dashboard</p>
        </div>

        {/* Dashboard module — tự quản lý cross-filter nội bộ */}
        <CubeDashboard />

        <ProductForm 
          onSave={handleSave} 
          currentProduct={currentProduct} 
          onCancel={handleCancel}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading products...</div>
        ) : (
          <ProductList 
            products={products} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onAddSale={handleAddSale}
          />
        )}
      </div>
    </CubeProvider>
  );
}

export default App;
