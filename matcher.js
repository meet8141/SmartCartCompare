function normalizeProductName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
}

function areProductsSame(p1, p2) {
  const norm1 = normalizeProductName(p1.name);
  const norm2 = normalizeProductName(p2.name);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}

/**
 * Mutates the amazonProducts and flipkartProducts arrays in-place
 * by adding matched products from the other site.
 */
function matchAllProducts(amazonProducts, flipkartProducts) {
  // Initialize matchedProducts arrays
  amazonProducts.forEach(p => { p.matchedProducts = []; p.normalizedName = normalizeProductName(p.name); });
  flipkartProducts.forEach(p => { p.matchedProducts = []; p.normalizedName = normalizeProductName(p.name); });

  for (const amazon of amazonProducts) {
    for (const flipkart of flipkartProducts) {
      if (areProductsSame(amazon, flipkart)) {
        // Add flipkart to amazon's matches
        amazon.matchedProducts.push({
          site: 'flipkart',
          name: flipkart.name,
          price: flipkart.currentPrice,
          rating: flipkart.rating,
          url: flipkart.productLink
        });
        
        // Add amazon to flipkart's matches
        flipkart.matchedProducts.push({
          site: 'amazon',
          name: amazon.name,
          price: amazon.currentPrice,
          rating: amazon.rating,
          url: amazon.productLink
        });
      }
    }
  }
}

function rankProducts(products, query) {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const isAccessoryQuery = qWords.some(w => ['case', 'cover', 'glass', 'protector', 'cable', 'charger', 'adapter'].includes(w));
  
  return products.sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    
    let aScore = 0;
    let bScore = 0;
    
    qWords.forEach(w => {
      if (aName.includes(w)) aScore++;
      if (bName.includes(w)) bScore++;
    });

    if (!isAccessoryQuery) {
      const accessoryTerms = ['case', 'cover', 'glass', 'protector', 'screen guard', 'cable', 'charger'];
      accessoryTerms.forEach(term => {
        if (aName.includes(term)) aScore -= 5;
        if (bName.includes(term)) bScore -= 5;
      });
    }
    
    return bScore - aScore;
  });
}

module.exports = {
  normalizeProductName,
  areProductsSame,
  matchAllProducts,
  rankProducts
};
