import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Compare() {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('name');

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    const fetchComparisons = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:3000/api/products/compare?name=${encodeURIComponent(query)}`);
        setComparisons(res.data.comparisons || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching comparisons:', err);
        setError(err.response?.data?.error || 'Failed to load comparisons');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisons();
  }, [query, navigate]);

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── STICKY NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a className="nav-brand" href="/">
              <span className="brand-main" style={{ color: 'var(--bone)' }}>SMART</span>
              <span className="brand-accent" style={{ color: 'var(--acid)' }}>CART</span>
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 mt-16 text-white">
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center mb-4"
          >
            &larr; Back to Results
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Top Matches for "{query}"
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Side-by-side comparison of the best matched products across platforms.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && comparisons.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">No exact matches found</h3>
            <p className="mt-1 text-gray-500">We couldn't confidently match products between Amazon and Flipkart for this search.</p>
          </div>
        )}

        {!loading && comparisons.length > 0 && (
          <div className="space-y-8">
            {comparisons.map((comp, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-lg">Match #{idx + 1}</h3>
                  {comp.priceDiff !== 0 ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      comp.cheaperSite === 'amazon' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Save ₹{Math.abs(comp.priceDiff).toLocaleString('en-IN')} on {comp.cheaperSite === 'amazon' ? 'Amazon' : 'Flipkart'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                      Same Price
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {/* Base Product (Amazon) */}
                  <div className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                          Amazon
                        </span>
                        {comp.cheaperSite === 'amazon' && (
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Best Price</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {comp.baseProduct.imageUrl && (
                          <div className="h-40 flex items-center justify-center mb-4">
                            <img src={comp.baseProduct.imageUrl} alt={comp.baseProduct.name} className="max-h-full object-contain mix-blend-multiply" />
                          </div>
                        )}
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-3 mb-2" title={comp.baseProduct.name}>
                          {comp.baseProduct.name}
                        </h4>
                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Current Price</p>
                            <p className="text-2xl font-bold text-gray-900">{comp.baseProduct.price}</p>
                          </div>
                          {comp.baseProduct.rating && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Rating</p>
                              <p className="font-medium text-yellow-600 flex items-center">
                                ★ {comp.baseProduct.rating}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <a 
                        href={comp.baseProduct.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-6 w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f90] hover:bg-[#e08500] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f90]"
                      >
                        Buy on Amazon
                      </a>
                    </div>
                  </div>

                  {/* Matched Product (Flipkart) */}
                  <div className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          Flipkart
                        </span>
                        {comp.cheaperSite === 'flipkart' && (
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Best Price</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {comp.baseProduct.imageUrl && (
                          <div className="h-40 flex items-center justify-center mb-4">
                            <img src={comp.baseProduct.imageUrl} alt={comp.matchProduct.name} className="max-h-full object-contain mix-blend-multiply opacity-80" />
                          </div>
                        )}
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-3 mb-2" title={comp.matchProduct.name}>
                          {comp.matchProduct.name}
                        </h4>
                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Current Price</p>
                            <p className="text-2xl font-bold text-gray-900">{comp.matchProduct.price}</p>
                          </div>
                          {comp.matchProduct.rating && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Rating</p>
                              <p className="font-medium text-yellow-600 flex items-center">
                                ★ {comp.matchProduct.rating}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <a 
                        href={comp.matchProduct.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-6 w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2874f0] hover:bg-[#1a5cbd] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2874f0]"
                      >
                        Buy on Flipkart
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Compare;
