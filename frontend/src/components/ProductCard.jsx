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
        onClick={() => setIsExpanded(true)}
        style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '16px' }}>
          <h3 className="card-name" style={{ fontSize: '15px', marginBottom: '6px', WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
             <span style={{marginRight: '8px', fontSize: '14px'}}>{isAmazon ? '📦' : '🛍️'}</span>
             {title}
          </h3>
          <span className="price-current" style={{ fontSize: '20px' }}>{price || 'N/A'}</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
          ▼ Expand
        </div>
      </div>
    );
  }

  return (
    <div className="product-card visible">
      {initialCompact && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
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
          <div className="no-img">📷 No Image Available</div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-name" title={title}>{title}</h3>
        
        <div className="rating-row">
          <div className="stars-wrap">
            <span className="rating-num">★ {rating || 'No rating'}</span>
          </div>
          {reviews && <span className="rating-count">({reviews})</span>}
        </div>

        <div className="card-bottom-row">
          <div className="price-col">
            <span className="price-current">{price || 'N/A'}</span>
            {originalPrice && <span className="price-original">{originalPrice}</span>}
          </div>

          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`card-cta ${platform}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            View
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
