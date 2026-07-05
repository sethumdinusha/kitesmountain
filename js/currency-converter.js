/**
 * ============================================================
 *  Kites Mountain — Dynamic Pricing & Currency Converter
 * ============================================================
 *  Flow:
 *    1. Fetch room prices from Google Sheets (CSV, always live)
 *    2. Detect visitor's country via ipapi.co (free, no key needed)
 *    3. Fetch live USD exchange rates via open.er-api.com (free)
 *    4. Update every .price-big and .price-col element on the page
 *    5. Show a subtle currency-info badge so the visitor knows their currency
 * ============================================================
 */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  var SHEET_ID = '17cvSVqR0WvnZvUOZX0qYOXowQbsr7A3PqZ9C6Ht0KBA';
  var SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
    '/export?format=csv&cachebust=' + Date.now();

  // Free exchange-rate API — no API key required (USD base, 1500 req/mo free)
  var RATES_URL = 'https://open.er-api.com/v6/latest/USD';

  // Geolocation: ipapi.co — free, 1000 req/day, no key needed
  var GEO_URL = 'https://ipapi.co/json/';

  // Map country code -> { currency code, symbol, locale }
  var COUNTRY_CURRENCY_MAP = {
    // Asia-Pacific
    LK: { code: 'LKR', symbol: 'LKR ', locale: 'en-LK' },
    IN: { code: 'INR', symbol: '\u20B9',   locale: 'en-IN' },
    JP: { code: 'JPY', symbol: '\u00A5',   locale: 'ja-JP' },
    CN: { code: 'CNY', symbol: '\u00A5',   locale: 'zh-CN' },
    AU: { code: 'AUD', symbol: 'A$',  locale: 'en-AU' },
    NZ: { code: 'NZD', symbol: 'NZ$', locale: 'en-NZ' },
    SG: { code: 'SGD', symbol: 'S$',  locale: 'en-SG' },
    MY: { code: 'MYR', symbol: 'RM',  locale: 'ms-MY' },
    TH: { code: 'THB', symbol: '\u0E3F',   locale: 'th-TH' },
    ID: { code: 'IDR', symbol: 'Rp',  locale: 'id-ID' },
    PH: { code: 'PHP', symbol: '\u20B1',   locale: 'fil-PH' },
    KR: { code: 'KRW', symbol: '\u20A9',   locale: 'ko-KR' },
    PK: { code: 'PKR', symbol: '\u20A8',   locale: 'ur-PK' },
    BD: { code: 'BDT', symbol: '\u09F3',   locale: 'bn-BD' },
    NP: { code: 'NPR', symbol: 'Rs', locale: 'ne-NP' },
    MV: { code: 'MVR', symbol: 'Rf',  locale: 'dv-MV' },
    // Europe
    GB: { code: 'GBP', symbol: '\u00A3',   locale: 'en-GB' },
    DE: { code: 'EUR', symbol: '\u20AC',   locale: 'de-DE' },
    FR: { code: 'EUR', symbol: '\u20AC',   locale: 'fr-FR' },
    IT: { code: 'EUR', symbol: '\u20AC',   locale: 'it-IT' },
    ES: { code: 'EUR', symbol: '\u20AC',   locale: 'es-ES' },
    NL: { code: 'EUR', symbol: '\u20AC',   locale: 'nl-NL' },
    PT: { code: 'EUR', symbol: '\u20AC',   locale: 'pt-PT' },
    BE: { code: 'EUR', symbol: '\u20AC',   locale: 'fr-BE' },
    AT: { code: 'EUR', symbol: '\u20AC',   locale: 'de-AT' },
    CH: { code: 'CHF', symbol: 'CHF', locale: 'de-CH' },
    SE: { code: 'SEK', symbol: 'kr',  locale: 'sv-SE' },
    NO: { code: 'NOK', symbol: 'kr',  locale: 'nb-NO' },
    DK: { code: 'DKK', symbol: 'kr',  locale: 'da-DK' },
    PL: { code: 'PLN', symbol: 'zl',  locale: 'pl-PL' },
    RU: { code: 'RUB', symbol: '\u20BD',   locale: 'ru-RU' },
    // Middle East & Africa
    AE: { code: 'AED', symbol: 'AED', locale: 'ar-AE' },
    SA: { code: 'SAR', symbol: 'SAR', locale: 'ar-SA' },
    QA: { code: 'QAR', symbol: 'QAR', locale: 'ar-QA' },
    KW: { code: 'KWD', symbol: 'KD',  locale: 'ar-KW' },
    ZA: { code: 'ZAR', symbol: 'R',   locale: 'en-ZA' },
    EG: { code: 'EGP', symbol: 'E',  locale: 'ar-EG' },
    NG: { code: 'NGN', symbol: '\u20A6',   locale: 'en-NG' },
    // Americas
    US: { code: 'USD', symbol: '$',   locale: 'en-US' },
    CA: { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
    MX: { code: 'MXN', symbol: 'MX$', locale: 'es-MX' },
    BR: { code: 'BRL', symbol: 'R$',  locale: 'pt-BR' },
    AR: { code: 'ARS', symbol: '$',   locale: 'es-AR' },
  };

  /* ── HELPERS ─────────────────────────────────────────────── */

  function parseSheetCSV(csv) {
    var lines = csv.trim().split('\n');
    var prices = {};
    for (var i = 1; i < lines.length; i++) {
      var parts = lines[i].split(',');
      if (parts.length >= 2) {
        var name  = parts[0].trim().replace(/\r/g, '');
        var price = parseFloat(parts[1].trim().replace(/\r/g, ''));
        if (name && !isNaN(price)) {
          prices[name] = price;
        }
      }
    }
    return prices;
  }

  function formatCurrency(amount, currencyInfo) {
    try {
      var decimals = (amount >= 1000 || currencyInfo.code === 'JPY' || currencyInfo.code === 'KRW' || currencyInfo.code === 'IDR') ? 0 : 2;
      return new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency',
        currency: currencyInfo.code,
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(amount);
    } catch (e) {
      var decimals2 = (amount >= 1000) ? 0 : 2;
      var rounded = amount >= 1000
        ? Math.round(amount).toLocaleString()
        : amount.toFixed(decimals2);
      return currencyInfo.symbol + rounded;
    }
  }

  function fetchWithTimeout(url, ms) {
    ms = ms || 5000;
    if (typeof AbortController !== 'undefined') {
      var controller = new AbortController();
      var id = setTimeout(function() { controller.abort(); }, ms);
      return fetch(url, { signal: controller.signal })
        .finally(function() { clearTimeout(id); });
    }
    return fetch(url);
  }

  /* ── CURRENCY BADGE UI ───────────────────────────────────── */
  function injectBadgeStyles() {
    if (document.getElementById('km-badge-styles')) return;
    var style = document.createElement('style');
    style.id = 'km-badge-styles';
    style.textContent = [
      '#km-currency-badge {',
      '  position: fixed;',
      '  top: 80px;',
      '  right: 16px;',
      '  z-index: 9990;',
      '  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);',
      '  color: #c9a96e;',
      '  border: 1px solid rgba(201,169,110,0.35);',
      '  border-radius: 50px;',
      '  padding: 7px 15px 7px 11px;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 7px;',
      '  font-family: Inter, sans-serif;',
      '  font-size: 12px;',
      '  font-weight: 500;',
      '  box-shadow: 0 4px 20px rgba(0,0,0,0.35);',
      '  opacity: 0;',
      '  transform: translateY(-8px);',
      '  transition: opacity 0.4s ease, transform 0.4s ease;',
      '  cursor: default;',
      '  user-select: none;',
      '  letter-spacing: 0.02em;',
      '}',
      '#km-currency-badge.km-visible {',
      '  opacity: 1;',
      '  transform: translateY(0);',
      '}',
      '#km-currency-badge .km-dot {',
      '  width: 7px;',
      '  height: 7px;',
      '  border-radius: 50%;',
      '  background: #4ade80;',
      '  animation: km-pulse 2s infinite;',
      '  flex-shrink: 0;',
      '}',
      '@keyframes km-pulse {',
      '  0%,100% { opacity:1; transform:scale(1); }',
      '  50%      { opacity:0.5; transform:scale(0.75); }',
      '}',
      '.price-converting { opacity: 0.4 !important; transition: opacity 0.3s ease !important; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function showCurrencyBadge(countryCode, currencyInfo) {
    injectBadgeStyles();
    var old = document.getElementById('km-currency-badge');
    if (old) old.remove();
    var badge = document.createElement('div');
    badge.id = 'km-currency-badge';
    badge.innerHTML =
      '<span class="km-dot"></span>' +
      '<span>\uD83C\uDF0D Prices in <strong>' + currencyInfo.code + '</strong> &nbsp;&middot;&nbsp; ' + countryCode + '</span>';
    document.body.appendChild(badge);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        badge.classList.add('km-visible');
      });
    });
    setTimeout(function() {
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(-8px)';
      setTimeout(function() { badge.remove(); }, 450);
    }, 7000);
  }

  /* ── PRICE UPDATE ────────────────────────────────────────── */

  function updatePriceBig(el, usdPrice, rate, currencyInfo) {
    var converted = usdPrice * rate;
    var formatted = formatCurrency(converted, currencyInfo);
    var small = el.querySelector('small');
    el.setAttribute('data-usd', usdPrice);
    el.setAttribute('data-converted', 'true');
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode(formatted + ' '));
    if (small) {
      el.appendChild(small);
    } else {
      var s = document.createElement('small');
      s.textContent = '/ night';
      el.appendChild(s);
    }
    el.classList.remove('price-converting');
  }

  function updatePriceCol(el, usdPrice, rate, currencyInfo) {
    var converted = usdPrice * rate;
    el.setAttribute('data-usd', usdPrice);
    el.setAttribute('data-converted', 'true');
    el.textContent = formatCurrency(converted, currencyInfo);
  }

  function applyPrices(sheetPrices, rate, currencyInfo) {
    var hasSheetData = Object.keys(sheetPrices).length > 0;

    // ── Room detail cards ──
    var cards = document.querySelectorAll('.room-detail-card');
    cards.forEach(function(card) {
      var h3 = card.querySelector('h3');
      if (!h3) return;
      var roomName = h3.textContent.trim();
      var usdPrice = hasSheetData ? sheetPrices[roomName] : null;

      var priceBig = card.querySelector('.price-big');
      if (!priceBig) return;

      // If no sheet price for this room, still convert the existing HTML price
      if (!usdPrice) {
        var rawText = priceBig.textContent.replace(/[^0-9.]/g, '');
        usdPrice = parseFloat(rawText);
      }
      if (!usdPrice || isNaN(usdPrice)) return;

      priceBig.classList.add('price-converting');
      (function(el, price) {
        setTimeout(function() {
          updatePriceBig(el, price, rate, currencyInfo);
        }, 350);
      })(priceBig, usdPrice);
    });

    // ── Comparison table ──
    var tableRows = document.querySelectorAll('.compare-table tbody tr');
    tableRows.forEach(function(row) {
      var nameCell = row.querySelector('td:first-child strong');
      if (!nameCell) return;
      var roomName = nameCell.textContent.trim();
      var usdPrice = hasSheetData ? sheetPrices[roomName] : null;

      var priceCell = row.querySelector('.price-col');
      if (!priceCell) return;

      if (!usdPrice) {
        var rawText2 = priceCell.textContent.replace(/[^0-9.]/g, '');
        usdPrice = parseFloat(rawText2);
      }
      if (!usdPrice || isNaN(usdPrice)) return;

      (function(el, price) {
        setTimeout(function() {
          updatePriceCol(el, price, rate, currencyInfo);
        }, 500);
      })(priceCell, usdPrice);
    });
  }

  /* ── MAIN INIT ───────────────────────────────────────────── */
  function init() {
    var sheetPrices = {};
    var countryCode = 'US';
    var currencyInfo = COUNTRY_CURRENCY_MAP['US'];
    var rate = 1;

    // Step 1: Fetch sheet prices
    fetchWithTimeout(SHEET_CSV_URL, 6000)
      .then(function(resp) {
        if (!resp.ok) throw new Error('Sheet fetch failed: ' + resp.status);
        return resp.text();
      })
      .then(function(csv) {
        sheetPrices = parseSheetCSV(csv);
        console.log('[KM Pricing] Sheet prices loaded:', sheetPrices);
      })
      .catch(function(err) {
        console.warn('[KM Pricing] Sheet fetch error (using HTML fallback):', err.message);
      })
      // Step 2: Detect country
      .then(function() {
        return fetchWithTimeout(GEO_URL, 5000);
      })
      .then(function(resp) {
        if (!resp.ok) throw new Error('Geo fetch failed: ' + resp.status);
        return resp.json();
      })
      .then(function(geo) {
        countryCode = (geo.country_code || 'US').toUpperCase();
        currencyInfo = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP['US'];
        console.log('[KM Pricing] Country:', countryCode, '| Currency:', currencyInfo.code);
      })
      .catch(function(err) {
        console.warn('[KM Pricing] Geo detection failed (defaulting to USD):', err.message);
      })
      // Step 3: Fetch exchange rates (skip if already USD)
      .then(function() {
        if (currencyInfo.code === 'USD') return null;
        return fetchWithTimeout(RATES_URL, 5000);
      })
      .then(function(resp) {
        if (!resp) return null;
        if (!resp.ok) throw new Error('Rates fetch failed: ' + resp.status);
        return resp.json();
      })
      .then(function(data) {
        if (data && data.rates && data.rates[currencyInfo.code]) {
          rate = data.rates[currencyInfo.code];
          console.log('[KM Pricing] Rate USD->' + currencyInfo.code + ': ' + rate);
        }
      })
      .catch(function(err) {
        console.warn('[KM Pricing] Exchange rate fetch failed (rate=1):', err.message);
      })
      // Step 4: Apply everything
      .then(function() {
        applyPrices(sheetPrices, rate, currencyInfo);
        if (currencyInfo.code !== 'USD') {
          showCurrencyBadge(countryCode, currencyInfo);
        }
      })
      .catch(function(err) {
        console.error('[KM Pricing] Fatal error in init:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
