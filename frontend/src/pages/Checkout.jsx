import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState('GPay');
  const [details, setDetails] = useState({});
  const [processing, setProcessing] = useState(false);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCheckout = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod,
          paymentDetails: details
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert('🎉 Payment Successful! Order Placed.');
        navigate('/store');
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during checkout');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page">
      <StoreNavbar />
      
      <div className="section" style={{ paddingTop: '100px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="section-title">CHECKOUT <span style={{ color: 'var(--hot)' }}>PAYMENT</span></h2>
        
        <form onSubmit={handleCheckout} className="hot-deal-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'default' }}>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {['GPay', 'NetBanking', 'DebitCard'].map(method => (
              <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value={method} 
                  checked={paymentMethod === method} 
                  onChange={() => { setPaymentMethod(method); setDetails({}); }}
                />
                <span style={{ color: 'var(--bone)' }}>{method === 'DebitCard' ? 'Debit Card' : method === 'NetBanking' ? 'Net Banking' : 'Google Pay'}</span>
              </label>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--bone-20)', paddingTop: '16px' }}>
            {paymentMethod === 'GPay' && (
              <div>
                <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>UPI ID (e.g. yourname@paytm)</label>
                <input 
                  type="text" 
                  required 
                  pattern=".*@paytm$"
                  title="Must end with @paytm as requested"
                  placeholder="number@paytm" 
                  className="productInput"
                  style={{ width: '100%' }}
                  onChange={(e) => setDetails({ upiId: e.target.value })}
                />
              </div>
            )}

            {paymentMethod === 'NetBanking' && (
              <div>
                <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Select Bank</label>
                <select 
                  required 
                  className="productInput" 
                  style={{ width: '100%', appearance: 'auto' }}
                  onChange={(e) => setDetails({ bank: e.target.value })}
                >
                  <option value="">-- Choose Bank --</option>
                  <option value="HDFC">HDFC Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="Axis">Axis Bank</option>
                </select>
              </div>
            )}

            {paymentMethod === 'DebitCard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Card Number</label>
                  <input type="text" required pattern="\d{16}" title="16 digit card number" placeholder="1234 5678 9101 1121" className="productInput" style={{ width: '100%' }} onChange={(e) => setDetails({...details, cardNumber: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Expiry (MM/YY)</label>
                    <input type="text" required pattern="\d{2}/\d{2}" placeholder="12/26" className="productInput" style={{ width: '100%' }} onChange={(e) => setDetails({...details, expiry: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '4px', display: 'block' }}>CVV</label>
                    <input type="text" required pattern="\d{3}" title="3 digit CVV" placeholder="123" className="productInput" style={{ width: '100%' }} onChange={(e) => setDetails({...details, cvv: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '4px', display: 'block' }}>Card Holder Name</label>
                  <input type="text" required placeholder="John Doe" className="productInput" style={{ width: '100%' }} onChange={(e) => setDetails({...details, holderName: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="pill-primary" disabled={processing} style={{ marginTop: '16px', justifyContent: 'center' }}>
            {processing ? 'Processing Payment...' : 'Pay Now'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Checkout;
