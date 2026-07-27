import React, { useState } from 'react';

const ProductCard = ({ product, platform, initialCompact = false }) => {
  const [isExpanded, setIsExpanded] = useState(!initialCompact);
  const isAmazon = platform === 'amazon';
  const {
    name: title,
    imageUrl: image,
    currentPrice: price,
    originalPrice,
    rating,
    reviews,
    productLink: link,
    isBestDeal,
    isSponsored
  } = product;

  if (!isExpanded) {
    return (
      <div
        className="product-card compact"
        id={`product-compact-${title?.slice(0, 10).replace(/\s/g, '-')}`}
        onClick={() => setIsExpanded(true)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '16px', gap: '6px' }}>
          <h3 className="card-name" style={{ fontSize: '14px', WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <span style={{ marginRight: '6px', fontSize: '13px' }}>{isAmazon ? '📦' : '🛍️'}</span>
            {title}
          </h3>
          <span className={`price-current${!isAmazon ? ' flipkart-price' : ''}`} style={{ fontSize: '18px' }}>
            {price || 'N/A'}
          </span>
        </div>
        <span className="expand-btn">▼ Expand</span>
      </div>
    );
  }

  return (
    <div
      className="product-card visible"
      id={`product-${platform}-${title?.slice(0, 10).replace(/\s/g, '-')}`}
    >
      {initialCompact && (
        <button
          className="collapse-btn"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
        >
          ▲ Collapse
        </button>
      )}

      {isSponsored && !initialCompact && <div className="sponsored-tag">Sponsored</div>}
      {isBestDeal && !initialCompact && <div className="best-deal-tag">🏆 Best Deal</div>}

      <div className="card-img-area">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
        ) : (
          <div className="no-img">📷 No Image</div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-name" title={title}>{title}</h3>

        <div className="rating-row">
          <span className="rating-num">★ {rating || 'No rating'}</span>
          {reviews && <span className="rating-count">({reviews})</span>}
        </div>

        <div className="card-bottom-row">
          <div className="price-col">
            <span className={`price-current${!isAmazon ? ' flipkart-price' : ''}`}>
              {price || 'N/A'}
            </span>
            {originalPrice && <span className="price-original">{originalPrice}</span>}
          </div>

          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`card-cta ${platform}`}
            id={`cta-${platform}-${title?.slice(0, 10).replace(/\s/g, '-')}`}
            onClick={async (e) => {
              e.preventDefault();
              try {
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                }
                
                await fetch('http://localhost:3000/api/history/view', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    title,
                    link,
                    platform,
                    price,
                    originalPrice,
                    image: image
                  })
                });
              } catch (err) {
                console.error('Failed to log view:', err);
              }
              window.open(link, '_blank');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            View
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
