/**
 * ============================================================
 *  Kites Mountain — Dynamic Pricing & Currency Converter
 * ============================================================
 *  Sheet prices are in LKR (Sri Lankan Rupees).
 *  Flow:
 *    1. Fetch room prices from Google Sheets (CSV, always live, in LKR)
 *    2. Detect visitor country via ipapi.co (free, no key needed)
 *    3. Fetch live USD rates via open.er-api.com to compute LKR→target
 *    4. Update every .price-big, .price, and .price-col element on the page
 *    5. Show animated currency badge for non-LKR visitors
 * ============================================================
 */

(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────── */
  var SHEET_ID = '17cvSVqR0WvnZvUOZX0qYOXowQbsr7A3PqZ9C6Ht0KBA';
  var SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
    '/export?format=csv&cachebust=' + Date.now();

  // Sheet prices are in LKR. We fetch USD-based rates and compute:
  //   LKR_to_Target = rates[target] / rates['LKR']
  var RATES_URL = 'https://open.er-api.com/v6/latest/USD';
  var GEO_URL   = 'https://ipapi.co/json/';

  /* ── COUNTRY → CURRENCY MAP ──────────────────────────────── */
  var COUNTRY_CURRENCY_MAP = {
    // South Asia
    LK: { code: 'LKR', symbol: 'LKR',  locale: 'en-LK' },
    IN: { code: 'INR', symbol: '\u20B9',    locale: 'en-IN' },
    PK: { code: 'PKR', symbol: 'Rs',    locale: 'en-PK' },
    BD: { code: 'BDT', symbol: 'Tk',    locale: 'en-BD' },
    NP: { code: 'NPR', symbol: 'Rs',    locale: 'ne-NP' },
    MV: { code: 'MVR', symbol: 'Rf',    locale: 'en-MV' },
    // East / SE Asia
    JP: { code: 'JPY', symbol: '\u00A5',    locale: 'ja-JP' },
    CN: { code: 'CNY', symbol: '\u00A5',    locale: 'zh-CN' },
    KR: { code: 'KRW', symbol: '\u20A9',    locale: 'ko-KR' },
    SG: { code: 'SGD', symbol: 'S$',    locale: 'en-SG' },
    MY: { code: 'MYR', symbol: 'RM',    locale: 'ms-MY' },
    TH: { code: 'THB', symbol: '\u0E3F',    locale: 'th-TH' },
    ID: { code: 'IDR', symbol: 'Rp',    locale: 'id-ID' },
    PH: { code: 'PHP', symbol: '\u20B1',    locale: 'en-PH' },
    // Oceania
    AU: { code: 'AUD', symbol: 'A$',    locale: 'en-AU' },
    NZ: { code: 'NZD', symbol: 'NZ$',   locale: 'en-NZ' },
    // Europe
    GB: { code: 'GBP', symbol: '\u00A3',    locale: 'en-GB' },
    DE: { code: 'EUR', symbol: '\u20AC',    locale: 'de-DE' },
    FR: { code: 'EUR', symbol: '\u20AC',    locale: 'fr-FR' },
    IT: { code: 'EUR', symbol: '\u20AC',    locale: 'it-IT' },
    ES: { code: 'EUR', symbol: '\u20AC',    locale: 'es-ES' },
    NL: { code: 'EUR', symbol: '\u20AC',    locale: 'nl-NL' },
    PT: { code: 'EUR', symbol: '\u20AC',    locale: 'pt-PT' },
    BE: { code: 'EUR', symbol: '\u20AC',    locale: 'fr-BE' },
    AT: { code: 'EUR', symbol: '\u20AC',    locale: 'de-AT' },
    CH: { code: 'CHF', symbol: 'CHF',   locale: 'de-CH' },
    SE: { code: 'SEK', symbol: 'kr',    locale: 'sv-SE' },
    NO: { code: 'NOK', symbol: 'kr',    locale: 'nb-NO' },
    DK: { code: 'DKK', symbol: 'kr',    locale: 'da-DK' },
    PL: { code: 'PLN', symbol: 'zl',    locale: 'pl-PL' },
    RU: { code: 'RUB', symbol: '\u20BD',    locale: 'ru-RU' },
    // Middle East
    AE: { code: 'AED', symbol: 'AED',   locale: 'ar-AE' },
    SA: { code: 'SAR', symbol: 'SAR',   locale: 'ar-SA' },
    QA: { code: 'QAR', symbol: 'QAR',   locale: 'ar-QA' },
    KW: { code: 'KWD', symbol: 'KD',    locale: 'ar-KW' },
    // Africa
    ZA: { code: 'ZAR', symbol: 'R',     locale: 'en-ZA' },
    EG: { code: 'EGP', symbol: 'E\u00A3',   locale: 'ar-EG' },
    NG: { code: 'NGN', symbol: '\u20A6',    locale: 'en-NG' },
    // Americas
    US: { code: 'USD', symbol: '$',     locale: 'en-US' },
    CA: { code: 'CAD', symbol: 'CA$',   locale: 'en-CA' },
    MX: { code: 'MXN', symbol: 'MX$',   locale: 'es-MX' },
    BR: { code: 'BRL', symbol: 'R$',    locale: 'pt-BR' },
    AR: { code: 'ARS', symbol: '$',     locale: 'es-AR' },
  };

  /* ── HELPERS ─────────────────────────────────────────────── */

  /** Parse Google Sheets CSV. Column header: "Room Name, Price(LKR)" */
  function parseSheetCSV(csv) {
    var lines = csv.trim().split('\n');
    var prices = {};
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].replace(/\r/g, '');
      var commaIdx = line.lastIndexOf(',');
      if (commaIdx < 0) continue;
      var name = line.substring(0, commaIdx).trim().replace(/^"|"$/g, '');
      var priceStr = line.substring(commaIdx + 1).trim().replace(/,/g, '');
      var price = parseFloat(priceStr);
      if (name && !isNaN(price) && price > 0) {
        prices[name] = price;
        prices[name.toLowerCase()] = price;
      }
    }
    return prices;
  }

  /** Format amount using Intl.NumberFormat. Falls back to symbol+number. */
  function formatCurrency(lkrAmount, rate, currencyInfo) {
    var amount = lkrAmount * rate;
    var noDecimals = (amount >= 500) ||
      currencyInfo.code === 'JPY' ||
      currencyInfo.code === 'KRW' ||
      currencyInfo.code === 'IDR' ||
      currencyInfo.code === 'LKR';
    try {
      return new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency',
        currency: currencyInfo.code,
        maximumFractionDigits: noDecimals ? 0 : 2,
        minimumFractionDigits: noDecimals ? 0 : 2,
      }).format(amount);
    } catch (e) {
      var n = noDecimals ? Math.round(amount).toLocaleString() : amount.toFixed(2);
      return currencyInfo.symbol + ' ' + n;
    }
  }

  /** fetch() with abort timeout */
  function fetchWithTimeout(url, ms) {
    ms = ms || 5000;
    if (typeof AbortController !== 'undefined') {
      var ctrl = new AbortController();
      var id   = setTimeout(function () { ctrl.abort(); }, ms);
      return fetch(url, { signal: ctrl.signal }).finally(function () { clearTimeout(id); });
    }
    return fetch(url);
  }

  /* ── BADGE UI ────────────────────────────────────────────── */
  function injectBadgeStyles() {
    if (document.getElementById('km-badge-style')) return;
    var s = document.createElement('style');
    s.id  = 'km-badge-style';
    s.textContent = [
      '#km-currency-badge{',
        'position:fixed;top:80px;right:16px;z-index:9990;',
        'background:linear-gradient(135deg,#1a1a2e,#16213e);',
        'color:#c9a96e;border:1px solid rgba(201,169,110,.35);',
        'border-radius:50px;padding:7px 15px 7px 11px;',
        'display:flex;align-items:center;gap:7px;',
        'font-family:Inter,sans-serif;font-size:12px;font-weight:500;',
        'box-shadow:0 4px 20px rgba(0,0,0,.35);letter-spacing:.02em;',
        'opacity:0;transform:translateY(-8px);',
        'transition:opacity .4s ease,transform .4s ease;',
        'user-select:none;cursor:default;',
      '}',
      '#km-currency-badge.km-vis{opacity:1;transform:translateY(0)}',
      '#km-currency-badge .km-dot{',
        'width:7px;height:7px;border-radius:50%;background:#4ade80;',
        'animation:km-pulse 2s infinite;flex-shrink:0;',
      '}',
      '@keyframes km-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.75)}}',
      '.price-converting{opacity:.35!important;transition:opacity .3s ease!important}',
    ].join('');
    document.head.appendChild(s);
  }

  function showBadge(countryCode, currencyInfo) {
    injectBadgeStyles();
    var old = document.getElementById('km-currency-badge');
    if (old) old.remove();
    var b = document.createElement('div');
    b.id = 'km-currency-badge';
    b.innerHTML =
      '<span class="km-dot"></span>' +
      '<span>\uD83C\uDF0D Prices in <strong>' + currencyInfo.code + '</strong>' +
      '&nbsp;&middot;&nbsp;' + countryCode + '</span>';
    document.body.appendChild(b);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { b.classList.add('km-vis'); });
    });
    setTimeout(function () {
      b.style.opacity = '0';
      b.style.transform = 'translateY(-8px)';
      setTimeout(function () { b.remove(); }, 450);
    }, 7000);
  }

  /* ── DOM PRICE UPDATERS ──────────────────────────────────── */

  /** .price-big  →  "LKR 19,000 <small>/ night</small>" */
  function updatePriceBig(el, lkrPrice, rate, currencyInfo) {
    var small = el.querySelector('small');
    var formatted = formatCurrency(lkrPrice, rate, currencyInfo);
    el.setAttribute('data-lkr', lkrPrice);
    el.setAttribute('data-converted', 'true');
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode(formatted + ' '));
    if (small) {
      el.appendChild(small);
    } else {
      var sm = document.createElement('small');
      sm.textContent = '/ night';
      el.appendChild(sm);
    }
    el.classList.remove('price-converting');
  }

  /** .price  (home page cards)  →  "From LKR 19,000<small>/night</small>" */
  function updatePriceSpan(el, lkrPrice, rate, currencyInfo) {
    var small = el.querySelector('small');
    var formatted = formatCurrency(lkrPrice, rate, currencyInfo);
    el.setAttribute('data-lkr', lkrPrice);
    el.setAttribute('data-converted', 'true');
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode('From ' + formatted));
    if (small) {
      el.appendChild(small);
    } else {
      var sm2 = document.createElement('small');
      sm2.textContent = '/night';
      el.appendChild(sm2);
    }
    el.classList.remove('price-converting');
  }

  /** .price-col  (comparison table)  →  "LKR 19,000" */
  function updatePriceCol(el, lkrPrice, rate, currencyInfo) {
    el.setAttribute('data-lkr', lkrPrice);
    el.setAttribute('data-converted', 'true');
    el.textContent = formatCurrency(lkrPrice, rate, currencyInfo);
  }

  /* ── EXTRACT FALLBACK LKR FROM HTML TEXT ─────────────────── */
  function extractNumbers(text) {
    var clean = text.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }

  /* ── APPLY PRICES ────────────────────────────────────────── */
  function applyPrices(sheetPrices, rate, currencyInfo) {
    var hasSheet = Object.keys(sheetPrices).length > 0;
    var delay    = 320;

    /* 1. rooms.html — .room-detail-card cards */
    var detailCards = document.querySelectorAll('.room-detail-card');
    detailCards.forEach(function (card) {
      var h3 = card.querySelector('h3');
      if (!h3) return;
      var name     = h3.textContent.trim();
      var lkrPrice = hasSheet ? (sheetPrices[name] || sheetPrices[name.toLowerCase()]) : 0;
      var priceBig = card.querySelector('.price-big');
      if (!priceBig) return;
      if (!lkrPrice) lkrPrice = extractNumbers(priceBig.textContent);
      if (!lkrPrice) return;
      priceBig.classList.add('price-converting');
      (function (el, p) {
        setTimeout(function () { updatePriceBig(el, p, rate, currencyInfo); }, delay);
      })(priceBig, lkrPrice);
    });

    /* 2. index.html — .room-card preview cards */
    var previewCards = document.querySelectorAll('.room-card');
    previewCards.forEach(function (card) {
      var h3 = card.querySelector('h3');
      if (!h3) return;
      var name      = h3.textContent.trim();
      var lkrPrice  = hasSheet ? (sheetPrices[name] || sheetPrices[name.toLowerCase()]) : 0;
      var priceSpan = card.querySelector('.price');
      if (!priceSpan) return;
      if (!lkrPrice) lkrPrice = extractNumbers(priceSpan.textContent);
      if (!lkrPrice) return;
      priceSpan.classList.add('price-converting');
      (function (el, p) {
        setTimeout(function () { updatePriceSpan(el, p, rate, currencyInfo); }, delay);
      })(priceSpan, lkrPrice);
    });

    /* 3. rooms.html — .compare-table tbody */
    var tableRows = document.querySelectorAll('.compare-table tbody tr');
    tableRows.forEach(function (row) {
      var nameCell = row.querySelector('td:first-child strong');
      if (!nameCell) return;
      var name      = nameCell.textContent.trim();
      var lkrPrice  = hasSheet ? (sheetPrices[name] || sheetPrices[name.toLowerCase()]) : 0;
      var priceCell = row.querySelector('.price-col');
      if (!priceCell) return;
      if (!lkrPrice) lkrPrice = extractNumbers(priceCell.textContent);
      if (!lkrPrice) return;
      (function (el, p) {
        setTimeout(function () { updatePriceCol(el, p, rate, currencyInfo); }, delay + 150);
      })(priceCell, lkrPrice);
    });
  }

  /* ── MAIN ────────────────────────────────────────────────── */
  function init() {
    var sheetPrices  = {};
    var countryCode  = 'LK';   // default to Sri Lanka (home country)
    var currencyInfo = COUNTRY_CURRENCY_MAP['LK'];
    var usdRates     = null;

    /* Step 1 — Google Sheet prices (LKR) */
    fetchWithTimeout(SHEET_CSV_URL, 7000)
      .then(function (r) {
        if (!r.ok) throw new Error('Sheet ' + r.status);
        return r.text();
      })
      .then(function (csv) {
        sheetPrices = parseSheetCSV(csv);
        console.log('[KM] Sheet prices (LKR):', sheetPrices);
      })
      .catch(function (e) {
        console.warn('[KM] Sheet fallback to HTML prices:', e.message);
      })

      /* Step 2 — Detect Country (with sessionStorage cache) */
      .then(function () {
        var cachedGeo = sessionStorage.getItem('km_geo_code');
        if (cachedGeo) {
          countryCode = cachedGeo;
          currencyInfo = COUNTRY_CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY;
          return null;
        }
        return fetchWithTimeout(GEO_URL, 3500)
          .then(function (r) {
            if (!r.ok) throw new Error('Geo ' + r.status);
            return r.json();
          })
          .then(function (data) {
            if (data && data.country_code) {
              countryCode = data.country_code.toUpperCase();
              currencyInfo = COUNTRY_CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY;
              sessionStorage.setItem('km_geo_code', countryCode);
            }
          });
      })
      .catch(function (e) {
        console.warn('[KM] Geo failed (defaulting to LKR):', e.message);
      })

      /* Step 3 — Fetch USD Exchange Rates (with sessionStorage cache) */
      .then(function () {
        if (currencyInfo.code === 'LKR') return null;

        var cachedRates = sessionStorage.getItem('km_usd_rates');
        if (cachedRates) {
          try {
            usdRates = JSON.parse(cachedRates);
            return null;
          } catch(e) {}
        }

        return fetchWithTimeout(RATES_URL, 5000)
          .then(function (r) {
            if (!r) return null;
            if (!r.ok) throw new Error('Rates ' + r.status);
            return r.json();
          })
          .then(function (data) {
            if (data && data.rates) {
              usdRates = data.rates;
              sessionStorage.setItem('km_usd_rates', JSON.stringify(usdRates));
            }
          });
      })
      .catch(function (e) {
        console.warn('[KM] Rates failed (will use LKR):', e.message);
      })

      /* Step 4 — Compute rate and apply */
      .then(function () {
        var rate = 1; // LKR → LKR

        if (currencyInfo.code !== 'LKR' && usdRates) {
          var lkrPerUsd    = usdRates['LKR'] || 300;
          var targetPerUsd = usdRates[currencyInfo.code] || 1;
          // LKR → target:  price_lkr * (targetPerUsd / lkrPerUsd)
          rate = targetPerUsd / lkrPerUsd;
          console.log('[KM] Rate LKR->' + currencyInfo.code + ': ' + rate.toFixed(6));
        }

        applyPrices(sheetPrices, rate, currencyInfo);

        // Show badge only for non-LKR visitors
        if (currencyInfo.code !== 'LKR') {
          showBadge(countryCode, currencyInfo);
        }
      })
      .catch(function (e) {
        console.error('[KM] Fatal:', e);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
