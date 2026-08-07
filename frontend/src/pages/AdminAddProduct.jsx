import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function AdminAddProduct() {
  const { token } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Sports',
    subCategory: 'General',
    imageUrl: '',
    stock: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = ['Sports', 'Clothes', 'Shoes', 'Electronics', 'Groceries', 'Home', 'Bags', 'Headphones'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('stock', formData.stock ? formData.stock : 50);
      data.append('category', formData.category);
      data.append('subCategory', formData.subCategory);

      if (imageFile) {
        data.append('image', imageFile);
      } else if (formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }

      const response = await fetch('http://localhost:3000/api/store/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      const responseData = await response.json();
      if (response.ok) {
        setMessage('Product added successfully!');
        setFormData({
          name: '', description: '', price: '', category: 'Sports', subCategory: 'General', imageUrl: '', stock: ''
        });
        setImageFile(null);
        document.getElementById('imageFileInput').value = '';
      } else {
        setError(responseData.error || 'Failed to add product');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* ── NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="/">
            <span className="brand-main">SMART</span>
            <span className="brand-accent">CART</span>
          </a>
          <div className="nav-right">
            <Link to="/admin" className="nav-login">Dashboard</Link>
            <Link to="/admin/users" className="nav-login">User Management</Link>
          </div>
        </div>
      </header>

      <div className="admin-content" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '100px' }}>
        <h1 className="admin-title" style={{ fontSize: '32px' }}>
          ADD <span style={{ color: 'var(--acid)' }}>PRODUCT.</span>
        </h1>


        {message && <div className="statusBar success">{message}</div>}
        {error && <div className="statusBar err">{error}</div>}

        <form onSubmit={handleSubmit} className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          <div>
            <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="auth-input" style={{ width: '100%' }} />
          </div>

          <div>
            <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required className="auth-input" style={{ width: '100%', minHeight: '80px', padding: '12px' }} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required className="auth-input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Stock</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="50" className="auth-input" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="auth-input" style={{ width: '100%', appearance: 'auto' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Sub Category</label>
              <input type="text" name="subCategory" value={formData.subCategory} onChange={handleChange} placeholder="General / Men / Women / Kids" className="auth-input" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Upload Image (Optional)</label>
              <input type="file" accept="image/*" id="imageFileInput" onChange={handleFileChange} className="auth-input" style={{ width: '100%', padding: '10px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="auth-label" style={{ marginBottom: '8px', display: 'block' }}>Or Image URL</label>
              <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." className="auth-input" style={{ width: '100%' }} disabled={!!imageFile} />
            </div>
          </div>

          <button type="submit" className="pill-primary" disabled={loading} style={{ marginTop: '16px', justifyContent: 'center' }}>
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default AdminAddProduct;
