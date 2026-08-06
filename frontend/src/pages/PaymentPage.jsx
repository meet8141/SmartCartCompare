import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const productId = searchParams.get('productId');
  const fromCart = searchParams.get('fromCart') === 'true';

  const [product, setProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment flow
  const [step, setStep] = useState('choose'); // 'choose' | 'details' | 'processing' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (fromCart) {
      fetchCart();
    } else if (productId) {
      fetchProduct();
    }
  }, [productId, fromCart]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/store/products/${productId}`);
      const data = await res.json();
      setProduct(data.product);
      setTotalAmount(data.product.price);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/store/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const items = data.cart?.items || [];
      setCartItems(items);
      const total = items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
      setTotalAmount(total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const selectMethod = (method) => {
    setPaymentMethod(method);
    setPaymentDetails({});
    setStep('details');
  };

  const isExpiryBefore2027 = (expiry) => {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month < 1 || month > 12) return false;

    return year < 27;
  };

  const validatePaymentDetails = () => {
    if (paymentMethod === 'GPay') {
      const upiId = (paymentDetails.upiId || '').trim();
      if (!upiId.endsWith('@paytm')) {
        alert('UPI ID must end with @paytm');
        return false;
      }
    }

    if (paymentMethod === 'NetBanking') {
      const accountNumber = (paymentDetails.accountNumber || '').trim();
      if (!/^\d{8,18}$/.test(accountNumber)) {
        alert('Enter a valid account number with 8 to 18 digits');
        return false;
      }
    }

    if (paymentMethod === 'DebitCard') {
      const cardNumber = (paymentDetails.cardNumber || '').trim();
      const expiry = (paymentDetails.expiry || '').trim();

      if (!/^\d{16}$/.test(cardNumber)) {
        alert('Card number must be exactly 16 digits');
        return false;
      }

      if (!isExpiryBefore2027(expiry)) {
        alert('Card expiry must be before 2027');
        return false;
      }
    }

    return true;
  };

  const escapePdfText = (text) => String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const buildReceiptLines = () => {
    const orderId = orderData?._id || 'ORD-' + Date.now();
    const lines = [];

    lines.push('SMARTCART COMPARE');
    lines.push('ORDER RECEIPT');
    lines.push('');
    lines.push(`Order ID       : ${orderId}`);
    lines.push(`Date           : ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    lines.push(`Time           : ${new Date().toLocaleTimeString('en-IN')}`);
    lines.push(`Customer       : ${user?.username || 'Guest'}`);
    lines.push(`Payment Method : ${paymentMethod === 'GPay' ? 'Google Pay (UPI)' : paymentMethod === 'NetBanking' ? 'Net Banking' : 'Debit Card'}`);

    if (paymentMethod === 'GPay' && paymentDetails.upiId) {
      lines.push(`UPI ID         : ${paymentDetails.upiId}`);
    }
    if (paymentMethod === 'NetBanking' && paymentDetails.bank) {
      lines.push(`Bank           : ${paymentDetails.bank}`);
      if (paymentDetails.accountNumber) {
        lines.push(`Account No.    : ${paymentDetails.accountNumber}`);
      }
    }
    if (paymentMethod === 'DebitCard' && paymentDetails.cardNumber) {
      lines.push(`Card           : XXXX-XXXX-XXXX-${paymentDetails.cardNumber.slice(-4)}`);
      lines.push(`Holder         : ${paymentDetails.holderName || 'N/A'}`);
    }

    lines.push('');
    lines.push('ITEMS ORDERED');
    lines.push('');

    if (product && !fromCart) {
      lines.push(`1. ${product.name}`);
      lines.push(`   Qty: 1 | Price: Rs. ${product.price.toLocaleString('en-IN')}`);
    } else {
      cartItems.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.product.name}`);
        lines.push(`   Qty: ${item.quantity} | Price: Rs. ${(item.product.price * item.quantity).toLocaleString('en-IN')}`);
      });
    }

    lines.push('');
    lines.push(`TOTAL AMOUNT : Rs. ${totalAmount.toLocaleString('en-IN')}`);
    lines.push('STATUS       : PAYMENT SUCCESSFUL');
    lines.push('');
    lines.push('Thank you for your order booking!');
    lines.push('We appreciate your trust in SmartCart Compare.');
    lines.push('Your order will be delivered soon.');

    return lines;
  };

  const buildReceiptPdf = (lines) => {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const leftMargin = 50;
    const topPosition = 790;
    const lineHeight = 16;

    let content = 'BT\n/F1 12 Tf\n';
    content += `${leftMargin} ${topPosition} Td\n`;
    lines.forEach((line, index) => {
      if (index > 0) {
        content += `0 -${lineHeight} Td\n`;
      }
      content += `(${escapePdfText(line)}) Tj\n`;
    });
    content += 'ET';

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = ['0000000000 65535 f \n'];

    objects.forEach((object, index) => {
      offsets.push(String(pdf.length).padStart(10, '0') + ' 00000 n \n');
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefPosition = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += offsets.join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

    return pdf;
  };

  const downloadReceipt = () => {
    const orderId = orderData?._id || 'ORD-' + Date.now();
    const receiptLines = buildReceiptLines();
    const pdfContent = buildReceiptPdf(receiptLines);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCart_Order_${orderId.slice(-8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePay = async (e) => {
    e.preventDefault();

    if (!validatePaymentDetails()) {
      return;
    }

    setStep('processing');

    try {
      // If buying single product, add to cart first
      if (productId && !fromCart) {
        await fetch('http://localhost:3000/api/store/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId, quantity: 1 })
        });
      }

      // Simulate processing delay
      await new Promise(r => setTimeout(r, 2000));

      const res = await fetch('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentMethod, paymentDetails })
      });

      const data = await res.json();
      if (res.ok) {
        setOrderData(data.order);
        setStep('success');
      } else {
        alert(data.error || 'Payment failed');
        setStep('details');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing payment');
      setStep('details');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <StoreNavbar />
        <div style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div className="loader on"><div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <StoreNavbar />

      <div className="section" style={{ paddingTop: '100px', maxWidth: '650px', margin: '0 auto' }}>

        {/* ── STEP: CHOOSE PAYMENT METHOD ── */}
        {step === 'choose' && (
          <>
            <h2 className="section-title" style={{ marginBottom: '24px' }}>
              SELECT <span style={{ color: 'var(--hot)' }}>PAYMENT</span>
            </h2>

            {/* Order Summary */}
            <div className="hot-deal-card" style={{ padding: '20px', marginBottom: '24px', cursor: 'default' }}>
              <h3 style={{ color: 'var(--bone-55)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Order Summary</h3>
              {product && !fromCart && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <img src={product.imageUrl} alt={product.name} style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', background: '#fff' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--bone)', fontSize: '15px' }}>{product.name}</div>
                  </div>
                  <div style={{ color: 'var(--acid)', fontWeight: 'bold', fontSize: '18px' }}>₹{product.price.toLocaleString('en-IN')}</div>
                </div>
              )}
              {fromCart && cartItems.map(item => (
                <div key={item._id} style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px' }}>
                  <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '6px', background: '#fff' }} />
                  <div style={{ flex: 1, color: 'var(--bone)', fontSize: '14px' }}>{item.product.name} <span style={{ color: 'var(--bone-55)' }}>× {item.quantity}</span></div>
                  <div style={{ color: 'var(--acid)', fontWeight: 'bold' }}>₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(244,241,234,0.1)', marginTop: '14px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--bone)', fontWeight: '700', fontSize: '16px' }}>Total</span>
                <span style={{ color: 'var(--acid)', fontWeight: '800', fontSize: '22px' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'GPay', icon: '📱', title: 'Google Pay (UPI)', desc: 'Pay using your UPI ID ending with @paytm', color: '#4285f4' },
                { key: 'NetBanking', icon: '🏦', title: 'Net Banking', desc: 'Pay through your bank account directly', color: '#22d3a4' },
                { key: 'DebitCard', icon: '💳', title: 'Debit Card', desc: 'Enter your 16-digit card number, CVV & expiry', color: '#ffbb40' },
              ].map(m => (
                <div
                  key={m.key}
                  onClick={() => selectMethod(m.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '20px',
                    borderRadius: '14px', border: `2px solid ${m.color}30`, background: `${m.color}08`,
                    cursor: 'pointer', transition: 'all 0.25s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateX(6px)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = `${m.color}30`; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <div style={{ fontSize: '36px', width: '50px', textAlign: 'center' }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: m.color, fontWeight: '800', fontSize: '17px', fontFamily: "'Archivo', sans-serif" }}>{m.title}</div>
                    <div style={{ color: 'var(--bone-55)', fontSize: '13px', marginTop: '2px' }}>{m.desc}</div>
                  </div>
                  <div style={{ color: m.color, fontSize: '22px' }}>→</div>
                </div>
              ))}
            </div>

            <button className="pill-secondary" style={{ marginTop: '24px' }} onClick={() => navigate(-1)}>← Go Back</button>
          </>
        )}

        {/* ── STEP: PAYMENT DETAILS FORM ── */}
        {step === 'details' && (
          <>
            <button onClick={() => setStep('choose')} style={{
              background: 'none', border: 'none', color: 'var(--bone-55)', cursor: 'pointer', fontSize: '14px',
              fontFamily: "'Archivo', sans-serif", marginBottom: '16px', padding: 0
            }}>← Change Payment Method</button>

            <h2 className="section-title" style={{ marginBottom: '24px' }}>
              {paymentMethod === 'GPay' && <><span style={{ color: '#4285f4' }}>GOOGLE PAY</span> DETAILS</>}
              {paymentMethod === 'NetBanking' && <><span style={{ color: '#22d3a4' }}>NET BANKING</span> DETAILS</>}
              {paymentMethod === 'DebitCard' && <><span style={{ color: '#ffbb40' }}>DEBIT CARD</span> DETAILS</>}
            </h2>

            <form onSubmit={handlePay} className="hot-deal-card" style={{ padding: '24px', cursor: 'default', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {paymentMethod === 'GPay' && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '48px', margin: '8px 0' }}>📱</div>
                  <div>
                    <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>UPI ID (must end with @paytm)</label>
                    <input type="text" required pattern=".*@paytm$" title="UPI ID must end with @paytm"
                      placeholder="yourname@paytm" className="productInput" style={{ width: '100%' }}
                      value={paymentDetails.upiId || ''}
                      onChange={e => setPaymentDetails({ upiId: e.target.value })}
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'NetBanking' && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '48px', margin: '8px 0' }}>🏦</div>
                  <div>
                    <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Select Your Bank</label>
                    <select required className="productInput" style={{ width: '100%', appearance: 'auto' }}
                      value={paymentDetails.bank || ''}
                      onChange={e => setPaymentDetails({ bank: e.target.value })}
                    >
                      <option value="">-- Choose Bank --</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Account Number</label>
                    <input type="text" required pattern="\d{8,18}" title="Enter 8 to 18 digit account number" maxLength={18}
                      placeholder="123456789012" className="productInput" style={{ width: '100%' }}
                      value={paymentDetails.accountNumber || ''}
                      onChange={e => setPaymentDetails(d => ({ ...d, accountNumber: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </>
              )}

              {paymentMethod === 'DebitCard' && (
                <>
                  <div style={{ textAlign: 'center', fontSize: '48px', margin: '8px 0' }}>💳</div>
                  <div>
                    <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '4px', display: 'block' }}>Card Number (16 digits)</label>
                    <input type="text" required pattern="\d{16}" title="Enter 16 digit card number" maxLength={16}
                      placeholder="1234567891011121" className="productInput" style={{ width: '100%', letterSpacing: '2px' }}
                      value={paymentDetails.cardNumber || ''}
                      onChange={e => setPaymentDetails(d => ({ ...d, cardNumber: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '4px', display: 'block' }}>Expiry (MM/YY)</label>
                      <input type="text" required pattern="\d{2}/\d{2}" title="Use MM/YY and keep the year before 2027" placeholder="12/26" maxLength={5}
                        className="productInput" style={{ width: '100%' }}
                        value={paymentDetails.expiry || ''}
                        onChange={e => setPaymentDetails(d => ({ ...d, expiry: e.target.value }))}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '4px', display: 'block' }}>CVV (3 digits)</label>
                      <input type="password" required pattern="\d{3}" title="3 digit CVV" maxLength={3}
                        placeholder="•••" className="productInput" style={{ width: '100%' }}
                        value={paymentDetails.cvv || ''}
                        onChange={e => setPaymentDetails(d => ({ ...d, cvv: e.target.value.replace(/\D/g, '') }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '4px', display: 'block' }}>Card Holder Name</label>
                    <input type="text" required placeholder="MEET PATEL" className="productInput" style={{ width: '100%', textTransform: 'uppercase' }}
                      value={paymentDetails.holderName || ''}
                      onChange={e => setPaymentDetails(d => ({ ...d, holderName: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div style={{ borderTop: '1px solid rgba(244,241,234,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--bone)', fontSize: '16px' }}>Total:</span>
                <span style={{ color: 'var(--acid)', fontWeight: '800', fontSize: '24px' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>

              <button type="submit"
                style={{
                  width: '100%', padding: '14px', borderRadius: '999px', border: 'none',
                  background: 'linear-gradient(135deg, var(--hot), #ff6b3d)', color: '#fff',
                  fontWeight: '800', fontSize: '16px', cursor: 'pointer', fontFamily: "'Archivo', sans-serif",
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(255,45,120,0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Pay ₹{totalAmount.toLocaleString('en-IN')} →
              </button>
            </form>
          </>
        )}

        {/* ── STEP: PROCESSING ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <div className="loader on" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
            </div>
            <h2 style={{ color: 'var(--bone)', marginBottom: '8px' }}>Processing Payment...</h2>
            <p style={{ color: 'var(--bone-55)' }}>Please do not close this page.</p>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px', animation: 'pulse 1s ease-in-out' }}>🎉</div>
            <h2 style={{ color: 'var(--acid)', fontSize: '28px', marginBottom: '8px' }}>Payment Successful!</h2>
            <p style={{ color: 'var(--bone-55)', fontSize: '16px', marginBottom: '24px' }}>Thank you for your order booking!</p>

            <div className="hot-deal-card" style={{ padding: '24px', cursor: 'default', textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--bone)', marginBottom: '16px', fontSize: '16px' }}>📋 Order Details</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--bone-55)' }}>Order ID</span>
                  <span style={{ color: 'var(--bone)', fontFamily: 'monospace' }}>{orderData?._id?.slice(-8) || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--bone-55)' }}>Payment</span>
                  <span style={{ color: 'var(--bone)' }}>{paymentMethod === 'GPay' ? 'Google Pay' : paymentMethod === 'NetBanking' ? 'Net Banking' : 'Debit Card'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--bone-55)' }}>Status</span>
                  <span style={{ color: '#22d3a4', fontWeight: '700' }}>✓ Success</span>
                </div>

                <div style={{ borderTop: '1px solid rgba(244,241,234,0.1)', margin: '8px 0' }} />

                {product && !fromCart && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img src={product.imageUrl} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '6px', background: '#fff' }} />
                    <div style={{ flex: 1, color: 'var(--bone)', fontSize: '14px' }}>{product.name}</div>
                    <div style={{ color: 'var(--acid)', fontWeight: 'bold' }}>₹{product.price.toLocaleString('en-IN')}</div>
                  </div>
                )}
                {fromCart && cartItems.map(item => (
                  <div key={item._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                    <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: '#fff' }} />
                    <div style={{ flex: 1, color: 'var(--bone)', fontSize: '13px' }}>{item.product.name} × {item.quantity}</div>
                    <div style={{ color: 'var(--acid)', fontWeight: 'bold', fontSize: '13px' }}>₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</div>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid rgba(244,241,234,0.1)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--bone)', fontWeight: '700', fontSize: '16px' }}>Total Paid</span>
                  <span style={{ color: 'var(--acid)', fontWeight: '800', fontSize: '20px' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button onClick={downloadReceipt}
                style={{
                  width: '100%', padding: '14px', borderRadius: '999px', border: '2px solid var(--acid)',
                  background: 'transparent', color: 'var(--acid)', fontWeight: '800', fontSize: '15px',
                  cursor: 'pointer', fontFamily: "'Archivo', sans-serif", transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--acid)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--acid)'; }}
              >
                📥 Download Order PDF
              </button>
              <button className="pill-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/store')}>
                Continue Shopping →
              </button>
            </div>

            <p style={{ color: 'var(--bone-55)', marginTop: '24px', fontSize: '14px', lineHeight: 1.6 }}>
              Thank you for your order booking! 🙏<br/>
              Your order has been placed successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentPage;
