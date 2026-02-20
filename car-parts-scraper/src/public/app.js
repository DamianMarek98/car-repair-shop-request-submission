// Client-side JavaScript for RENOCAR Wyszukiwarka Części

console.log('App.js loaded successfully');

// ── Shop enum ────────────────────────────────────────────────
const Shop = {
  INTER_PARTS: 'inter-parts',
  APCAT: 'apcat',
  AUTO_PARTNER: 'auto-partner',
};

const SHOP_LABELS = {
  [Shop.INTER_PARTS]: 'Inter Cars',
  [Shop.APCAT]: 'APCAT',
  [Shop.AUTO_PARTNER]: 'Auto Partner',
};

const SHOP_BADGE_CLASS = {
  [Shop.INTER_PARTS]: 'shop-intercars',
  [Shop.APCAT]: 'shop-apcat',
  [Shop.AUTO_PARTNER]: 'shop-autopartner',
};

// ── DOM ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing event listeners');

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.querySelector('.search-input');

  if (!searchBtn) { console.error('Search button not found!'); return; }
  if (!searchInput) { console.error('Search input not found!'); return; }

  searchBtn.addEventListener('click', () => handleSearch());
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  console.log('Event listeners attached successfully');
});

// ── Main search handler ───────────────────────────────────────
async function handleSearch() {
  const query = document.querySelector('.search-input').value.trim();
  if (!query) { showError('Proszę wprowadzić numer części'); return; }

  clearError();
  showSpinner();

  // Reset all tables to loading state — all start searching immediately
  setTableStatus('interparts-status', 'Wyszukiwanie…');
  setTableStatus('apcat-status', 'Wyszukiwanie…');
  setTableStatus('autopartner-status', 'Wyszukiwanie…');
  setTbodyLoading('interparts-tbody', 9);
  setTbodyLoading('apcat-tbody', 5);
  setTbodyLoading('autopartner-tbody', 5);

  // Fire all three searches in parallel — each renders results as soon as it completes
  const interPartsPromise = searchInterParts(query)
    .catch(err => {
      console.error('[InterParts] API error:', err);
      return { success: false, error: err.message };
    })
    .then(result => {
      if (result.success) {
        displayInterPartsResults(result.data);
        setTableStatus('interparts-status', `${result.data.length} wynik(ów)`);
      } else {
        displayTbodyError('interparts-tbody', 9, result.error || 'Błąd wyszukiwania');
        setTableStatus('interparts-status', 'Błąd');
      }
    });

  const apcatPromise = searchApcat(query)
    .catch(err => {
      console.error('[APCAT] API error:', err);
      return { success: false, error: err.message };
    })
    .then(result => {
      if (result.success) {
        displayApcatResults(result.data);
        setTableStatus('apcat-status', `${result.data ? result.data.length : 0} wynik(ów)`);
      } else {
        displayTbodyError('apcat-tbody', 5, result.error || 'Błąd wyszukiwania');
        setTableStatus('apcat-status', 'Błąd');
      }
    });

  const autoPartnerPromise = searchAutoPartner(query)
    .catch(err => {
      console.error('[AutoPartner] API error:', err);
      return { success: false, error: err.message };
    })
    .then(result => {
      if (result.success) {
        displayAutoPartnerResults(result.data);
        setTableStatus('autopartner-status', `${result.data ? result.data.length : 0} wynik(ów)`);
      } else {
        displayTbodyError('autopartner-tbody', 5, result.error || 'Błąd wyszukiwania');
        setTableStatus('autopartner-status', 'Błąd');
      }
    });

  // Hide spinner only after all searches complete (regardless of success/failure)
  await Promise.allSettled([interPartsPromise, apcatPromise, autoPartnerPromise]);
  hideSpinner();
}

// ── API calls ─────────────────────────────────────────────────
async function searchInterParts(query) {
  const response = await fetch('/api/scrape/inter-parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchQuery: query, headless: false }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function searchApcat(query) {
  const response = await fetch('/api/scrape/apcat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchQuery: query, headless: false }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function searchAutoPartner(query) {
  const response = await fetch('/api/scrape/auto-partner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchQuery: query, headless: false }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Inter Parts rendering ─────────────────────────────────────
function displayInterPartsResults(products) {
  const tbody = document.getElementById('interparts-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(9, 'Nie znaleziono wyników');
    return;
  }

  products.forEach((product, index) => {
    tbody.appendChild(createInterPartsRow(product, index + 1));
  });
}

function createInterPartsRow(product, index) {
  const tr = document.createElement('tr');

  const quantities = formatArray(product.quantities);
  const branchAvail = formatArray(product.branchAvailability);
  const routeDept = formatArray(product.routeDeparture);

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.sku)}</td>
    <td>${shopBadge(Shop.INTER_PARTS)}</td>
    <td class="part-name">${escapeHtml(product.manufacturer)}</td>
    <td class="qty">${quantities}</td>
    <td class="delivery">${branchAvail}</td>
    <td class="delivery">${routeDept}</td>
    <td class="qty">${escapeHtml(product.stock)}</td>
    <td>
      <div style="line-height:1.5">
        <div class="price">${escapeHtml(product.priceGross)}</div>
        <div class="price" style="font-size:13px;color:var(--text-muted)">${escapeHtml(product.priceRetail)}</div>
      </div>
    </td>
  `;

  return tr;
}

// ── APCAT rendering ───────────────────────────────────────────
function displayApcatResults(products) {
  const tbody = document.getElementById('apcat-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(5, 'Nie znaleziono wyników');
    return;
  }

  products.forEach((product, index) => {
    tbody.appendChild(createApcatRow(product, index + 1));
  });
}

function createApcatRow(product, index) {
  const tr = document.createElement('tr');

  const availability = product.availability.length > 0
    ? product.availability.map(a => `<div>${escapeHtml(a)}</div>`).join('')
    : '—';

  const prices = product.prices.length > 0
    ? product.prices.map(p => `<div class="price" style="font-size:13px">${escapeHtml(p)}</div>`).join('')
    : '—';

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.dealerPartNumber)}</td>
    <td>${shopBadge(Shop.APCAT)}</td>
    <td class="delivery" style="line-height:1.8">${availability}</td>
    <td><div style="line-height:1.8">${prices}</div></td>
  `;

  return tr;
}

// ── Auto Partner rendering ────────────────────────────────────
function displayAutoPartnerResults(products) {
  const tbody = document.getElementById('autopartner-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(5, 'Nie znaleziono wyników');
    return;
  }

  products.forEach((product, index) => {
    tbody.appendChild(createAutoPartnerRow(product, index + 1));
  });
}

function createAutoPartnerRow(product, index) {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.name)}</td>
    <td>${shopBadge(Shop.AUTO_PARTNER)}</td>
    <td class="delivery">${escapeHtml(product.availability)}</td>
    <td class="price" style="font-size:13px">${escapeHtml(product.price)}</td>
  `;

  return tr;
}

// ── Shared helpers ────────────────────────────────────────────
function shopBadge(shop) {
  return `<span class="shop-badge ${SHOP_BADGE_CLASS[shop]}">${SHOP_LABELS[shop]}</span>`;
}

function formatArray(arr) {
  if (!arr || arr.length === 0) return '—';
  if (arr.length === 1) return escapeHtml(arr[0]);
  return `<div style="line-height:1.5">${arr.map(escapeHtml).join('<br>')}</div>`;
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--text-muted)">${escapeHtml(message)}</td></tr>`;
}

function setTbodyLoading(tbodyId, colspan) {
  document.getElementById(tbodyId).innerHTML = `
    <tr>
      <td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--text-muted)">
        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:8px">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2 A10 10 0 0 1 22 12" stroke-opacity="1"/>
        </svg>
        Wyszukiwanie…
      </td>
    </tr>
  `;
}

function displayTbodyError(tbodyId, colspan, message) {
  document.getElementById(tbodyId).innerHTML = `
    <tr>
      <td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--red)">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function setTableStatus(statusId, text) {
  document.getElementById(statusId).textContent = text;
}

// ── Spinner ───────────────────────────────────────────────────
function showSpinner() {
  const btn = document.getElementById('search-btn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2 A10 10 0 0 1 22 12" stroke-opacity="1"/>
    </svg>
    Wyszukiwanie...
  `;
}

function hideSpinner() {
  const btn = document.getElementById('search-btn');
  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
    Wyszukaj
  `;
}

// ── Error banner ──────────────────────────────────────────────
function showError(message) {
  clearError();
  const searchArea = document.querySelector('.search-area');
  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.style.cssText = `
    width: 100%;
    padding: 12px 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 8px;
    color: var(--red);
    font-size: 14px;
  `;
  errorDiv.textContent = message;
  searchArea.appendChild(errorDiv);
}

function clearError() {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) errorDiv.remove();
}
