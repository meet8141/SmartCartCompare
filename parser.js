/**
 * parser.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cheerio-based HTML parser for Amazon.in and Flipkart search result pages.
 * Returns up to MAX_RESULTS products per platform as an array.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const cheerio = require('cheerio');

const MAX_RESULTS = 20;

// ─── Utilities ───────────────────────────────────────────────────────────────

function clean(str) {
  const s = (str || '').trim().replace(/\s+/g, ' ');
  return s.length ? s : null;
}

function resolveUrl(href, base) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  if (href.startsWith('//'))   return 'https:' + href;
  return base + href;
}

/** Try each selector in order, return first non-empty text. */
function firstText($, root, selectors) {
  for (const s of selectors) {
    const t = clean(root.find(s).first().text());
    if (t) return t;
  }
  return null;
}

/** Try each selector in order, return first non-empty attribute value. */
function firstAttr($, root, selectors, attr) {
  for (const s of selectors) {
    const v = root.find(s).first().attr(attr);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/** Derive discount % from two price strings, e.g. "₹59,900" and "₹58,900". */
function deriveDiscount(currentPrice, originalPrice) {
  if (!currentPrice || !originalPrice) return null;
  const cur  = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
  const orig = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));
  if (orig > 0 && cur < orig) {
    return `${Math.round(((orig - cur) / orig) * 100)}% off`;
  }
  return null;
}

// ─── Amazon Parser ───────────────────────────────────────────────────────────

/**
 * parseAmazon(rawHtml)
 * Returns { source: 'amazon', products: [...], error? }
 * Handles CAPTCHA pages, multiple card selector variants, and
 * Amazon's frequently-changing class names.
 */
function parseAmazon(rawHtml) {
  const $ = cheerio.load(rawHtml);

  // Detect CAPTCHA / bot-block page
  const title = $('title').text().toLowerCase();
  const bodyText = $('body').text().toLowerCase();
  if (
    title.includes('captcha') ||
    title.includes('robot check') ||
    bodyText.includes('enter the characters you see below') ||
    bodyText.includes('sorry, we just need to make sure')
  ) {
    rawHtml = null;
    return {
      source:   'amazon',
      products: [],
      error:    'Amazon blocked this request (CAPTCHA). Try again in a few seconds.',
    };
  }

  const products = [];

  // Amazon uses [data-component-type="s-search-result"] for organic cards,
  // but fallback to div[data-asin] which covers more layout variants.
  const cardSelector = '[data-component-type="s-search-result"], div[data-asin][data-index]';

  $(cardSelector).each((i, el) => {
    if (products.length >= MAX_RESULTS) return false;

    const card = $(el);
    // Skip cards with no ASIN (ad/banner cards)
    const asin = card.attr('data-asin');
    if (!asin) return;

    const isSponsored =
      card.find('.puis-sponsored-label-text, [data-component-type="sp-sponsored-result"], .s-sponsored-label-info-icon').length > 0;
    if (isSponsored) return; // skip sponsored / ad cards

    // ── Name (multiple fallback selectors)
    const name = firstText($, card, [
      'h2 a span.a-size-medium',
      'h2 a span.a-size-base-plus',
      'h2 a span.a-size-mini',
      'h2[aria-label]',
      'h2 a span',
      'h2 span',
      '[data-cy="title-recipe"] span',
    ]);
    if (!name) return; // skip cards with no name

    // ── Link
    const relLink = card.find('h2 a').first().attr('href')
                 || card.find('a.a-link-normal[href*="/dp/"]').first().attr('href');
    const productLink = resolveUrl(relLink, 'https://www.amazon.in');

    // ── Image
    const imageUrl = firstAttr($, card,
      ['img.s-image', 'img[data-image-index]', 'img[srcset]', 'img'], 'src');

    // ── Current price (try multiple strategies)
    let currentPrice = clean(
      card.find('.a-price[data-a-color="base"] .a-offscreen').first().text()
    );
    if (!currentPrice) {
      // Newer Amazon layout sometimes puts price directly in .a-price-whole
      const whole  = clean(card.find('.a-price-whole').first().text());
      const frac   = clean(card.find('.a-price-fraction').first().text());
      if (whole) currentPrice = '₹' + whole.replace(/[^0-9,]/g, '') + (frac ? '.' + frac : '');
    }

    // ── Original / MRP price
    let originalPrice = clean(
      card.find('.a-price[data-a-color="secondary"] .a-offscreen').first().text()
    );
    if (!originalPrice) {
      originalPrice = clean(
        card.find('.a-text-price .a-offscreen, del .a-offscreen, .a-text-strike').first().text()
      );
    }

    // ── Discount
    let discount = firstText($, card, [
      '.a-badge-text',
      '.a-color-price.a-text-bold',
      '.savingPriceOverride',
      '[data-cy="secondary-offer-recipe"] .a-color-price',
    ]);
    if (!discount) discount = deriveDiscount(currentPrice, originalPrice);

    // ── Rating
    const ratingRaw = clean(card.find('.a-icon-alt').first().text());
    const rating    = ratingRaw ? ratingRaw.replace(' out of 5 stars', '').trim() : null;

    // ── Review count
    const reviewsRaw = firstText($, card, [
      '.a-size-mini.puis-normal-weight-text.s-underline-text',
      '.a-size-base.s-underline-text',
      'span[aria-label*="ratings"]',
      'span[aria-label*="stars"] + span',
      '.a-declarative[data-action="asin-popover"] span',
    ]);
    const reviews = reviewsRaw ? reviewsRaw.replace(/[()]/g, '').trim() : null;

    // ── Delivery
    const delivery = firstText($, card, [
      '.a-color-base.udm-primary-delivery-message',
      '.a-row.a-color-base.udm-primary-delivery-message',
    ]);

    products.push({
      source:        'amazon',
      name,
      currentPrice:  currentPrice  || 'N/A',
      originalPrice: originalPrice || null,
      discount:      discount      || null,
      rating:        rating        || null,
      reviews:       reviews       || null,
      imageUrl:      imageUrl      || null,
      productLink:   productLink   || null,
      delivery:      delivery      || null,
      features:      [],
    });
  });

  rawHtml = null;

  if (!products.length) {
    return { source: 'amazon', products: [], error: 'No product cards found in Amazon response.' };
  }
  return { source: 'amazon', products };
}

// ─── Flipkart Parser ─────────────────────────────────────────────────────────

/**
 * parseFlipkart(rawHtml)
 * Returns { source: 'flipkart', products: [...], error? }
 */
function parseFlipkart(rawHtml) {
  const $ = cheerio.load(rawHtml);

  // ── JSON-LD: extract name + URL list (very reliable)
  const jsonLdItems = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    if (jsonLdItems.length) return false;
    try {
      const parsed = JSON.parse($(el).html());
      const list = Array.isArray(parsed)
        ? parsed.find(p => p['@type'] === 'ItemList')
        : (parsed['@type'] === 'ItemList' ? parsed : null);

      if (list && list.itemListElement) {
        list.itemListElement.forEach(item => {
          jsonLdItems.push({ name: clean(item.name), url: item.url || null });
        });
      }
    } catch (e) { /* skip */ }
  });

  // ── CSS selector extraction from product cards
  const cards = $('div.jIjQ8S, div.slAVV4, div.IIdQZO, div._4ddWXP, div.RGLWAk, div.nZIRY7, div.cPHDOP');

  if (!cards.length && !jsonLdItems.length) {
    rawHtml = null;
    return {
      source:   'flipkart',
      products: [],
      error:    'No product cards found. Flipkart may have changed its HTML structure.',
    };
  }

  const products = [];

  cards.each((i, el) => {
    if (products.length >= MAX_RESULTS) return false;

    const root = $(el);

    // ── Name
    const cssName = firstText($, root, ['div.RG5Slk', 'div.KzDlHZ', 'div._4rR01T', 'a.pIpigb', 'a.wjcEIp', 'a.s1Q9rs', 'a.WKTcLC'])
                 || firstAttr($, root, ['a[title]'], 'title');
    const jsonLdRef = jsonLdItems[i] || null;
    const name      = cssName || (jsonLdRef && jsonLdRef.name) || null;
    if (!name) return;

    // ── Link
    let relHref = root.find('a.k7wcnx').first().attr('href')
               || root.find('a[href*="/p/"]').first().attr('href');
    let productLink = resolveUrl(relHref, 'https://www.flipkart.com');
    if (!productLink && jsonLdRef) {
      productLink = jsonLdRef.url;
    }

    // ── Image
    const imageUrl = firstAttr($, root,
      ['img.UCc1lI', 'img.DByuf4', 'img[loading="eager"]', 'img'], 'src');

    // ── Current price
    const currentPrice = firstText($, root, [
      'div.hZ3P6w.DeU9vF', 'div.hZ3P6w', 'div.oFEPlD div.hZ3P6w', 'div.Nx9bqj', 'div._30jeq3',
    ]);

    // ── Original / MRP price
    const originalPrice = firstText($, root, [
      'div.kRYCnD.gxR4EY', 'div.kRYCnD', 'div.yRaY8j', 'div._3I9_wc',
    ]);

    // ── Discount
    let discount = firstText($, root, ['div.HQe8jr span', 'div.HQe8jr', 'div.UkUFwK', 'div._3Ay6Sb']);
    if (!discount) discount = deriveDiscount(currentPrice, originalPrice);

    // ── Rating
    const rating = firstText($, root, ['div.MKiFS6', 'div.XQDdHH', 'div._3LWZlK']);

    // ── Rating count + review count
    const ratingsAndReviews = firstText($, root, ['span.PvbNMB', 'span._2_KrJI']);
    let ratingsCount = null;
    let reviewsCount = null;
    if (ratingsAndReviews) {
      const ratMatch = ratingsAndReviews.match(/([\d,]+)\s*Ratings?/i);
      const revMatch = ratingsAndReviews.match(/([\d,]+)\s*Reviews?/i);
      if (ratMatch) ratingsCount = ratMatch[1];
      if (revMatch) reviewsCount = revMatch[1];
    }

    // ── Feature highlights
    const features = [];
    root.find('ul.HwRTzP li.DTBslk').each((j, liEl) => {
      const t = clean($(liEl).text());
      if (t) features.push(t);
    });

    products.push({
      source:        'flipkart',
      sponsored:     false,
      name,
      currentPrice:  currentPrice  || 'N/A',
      originalPrice: originalPrice || null,
      discount:      discount      || null,
      rating:        rating        || null,
      ratingsCount:  ratingsCount  || null,
      reviews:       reviewsCount  || null,
      imageUrl:      imageUrl      || null,
      productLink:   productLink   || null,
      delivery:      null,
      features,
    });
  });

  rawHtml = null;

  if (!products.length) {
    return { source: 'flipkart', products: [], error: 'Could not extract product details.' };
  }
  return { source: 'flipkart', products };
}

module.exports = { parseAmazon, parseFlipkart };
