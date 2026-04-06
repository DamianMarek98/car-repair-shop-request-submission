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

// ── Part number normalization (for grouping across shops) ────
function normalizePartNumber(str) {
  const upper = str.toUpperCase().trim();
  const tokens = upper.split(/\s+/);

  const cores = tokens
    .filter(t => /\d/.test(t))          // keep only tokens that contain digits
    .map(t => t.replace(/^[A-Z]+/, '')) // strip leading-only alpha prefix
    .filter(Boolean);                    // drop empty results

  if (cores.length === 0) return upper;  // fallback: return original

  // Pick the longest core as the canonical key
  cores.sort((a, b) => b.length - a.length);
  return cores[0];
}

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
  setTableStatus('grouped-status', 'Wyszukiwanie…');
  setTableStatus('interparts-status', 'Wyszukiwanie…');
  setTableStatus('apcat-status', 'Wyszukiwanie…');
  setTableStatus('autopartner-status', 'Wyszukiwanie…');
  setTbodyLoading('grouped-tbody', 5);
  setTbodyLoading('interparts-tbody', 7);
  setTbodyLoading('apcat-tbody', 6);
  setTbodyLoading('autopartner-tbody', 7);

  // Collect items from all shops for the grouped table
  const groupedItems = [];

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
        // Collect for grouped table
        result.data.forEach(p => groupedItems.push(normalizeForGrouping(Shop.INTER_PARTS, p)));
      } else {
        displayTbodyError('interparts-tbody', 7, result.error || 'Błąd wyszukiwania');
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
        // Collect for grouped table
        (result.data || []).forEach(p => groupedItems.push(normalizeForGrouping(Shop.APCAT, p)));
      } else {
        displayTbodyError('apcat-tbody', 6, result.error || 'Błąd wyszukiwania');
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
        // Collect for grouped table
        (result.data || []).forEach(p => groupedItems.push(normalizeForGrouping(Shop.AUTO_PARTNER, p)));
      } else {
        displayTbodyError('autopartner-tbody', 7, result.error || 'Błąd wyszukiwania');
        setTableStatus('autopartner-status', 'Błąd');
      }
    });

  // Wait for all searches, then build grouped table
  await Promise.allSettled([interPartsPromise, apcatPromise, autoPartnerPromise]);
  displayGroupedResults(groupedItems, query);
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
    tbody.innerHTML = emptyRow(7, 'Nie znaleziono wyników');
    return;
  }

  products.forEach((product, index) => {
    tbody.appendChild(createInterPartsRow(product, index + 1));
  });
}

function createInterPartsRow(product, index) {
  const tr = document.createElement('tr');

  // Build a mini availability table from parallel arrays (Ilość, W filii, Wyjazd trasy)
  const qtys = product.quantities || [];
  const branches = product.branchAvailability || [];
  const routes = product.routeDeparture || [];
  const rowCount = Math.max(qtys.length, branches.length, routes.length);

  let availabilityHtml = '—';
  if (rowCount > 0) {
    const thStyle = 'padding:2px 6px;font-size:11px;color:var(--text-muted);font-weight:600;text-align:left;border-bottom:1px solid var(--border)';
    const tdStyle = 'padding:2px 6px;font-size:12px;white-space:nowrap';
    let rows = '';
    for (let i = 0; i < rowCount; i++) {
      rows += `<tr>
        <td style="${tdStyle}">${escapeHtml(qtys[i] || '')}</td>
        <td style="${tdStyle}">${escapeHtml(branches[i] || '')}</td>
        <td style="${tdStyle}">${escapeHtml(routes[i] || '')}</td>
      </tr>`;
    }
    availabilityHtml = `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${thStyle}">Ilość</th>
          <th style="${thStyle}">W filii (GDP)</th>
          <th style="${thStyle}">Wyjazd trasy</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const linkCell = product.link
    ? `<td><a href="${escapeHtml(product.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding:6px 14px;font-size:13px">Kup</a></td>`
    : `<td style="color:var(--text-muted)">—</td>`;

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.sku)}</td>
    <td>${shopBadge(Shop.INTER_PARTS)}</td>
    <td class="part-name">${escapeHtml(product.manufacturer)}</td>
    <td class="delivery" style="padding:4px">${availabilityHtml}</td>
    <td>
      <div style="line-height:1.5">
        <div class="price">${escapeHtml(product.priceGross)}</div>
        <div class="price" style="font-size:13px;color:var(--text-muted)">${escapeHtml(product.priceRetail)}</div>
      </div>
    </td>
    ${linkCell}
  `;

  return tr;
}

// ── APCAT rendering ───────────────────────────────────────────
function displayApcatResults(products) {
  const tbody = document.getElementById('apcat-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(6, 'Nie znaleziono wyników');
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
    <td>${escapeHtml(product.producer)}</td>
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
    tbody.innerHTML = emptyRow(7, 'Nie znaleziono wyników');
    return;
  }

  products.forEach((product, index) => {
    tbody.appendChild(createAutoPartnerRow(product, index + 1));
  });
}

function createAutoPartnerRow(product, index) {
  const tr = document.createElement('tr');

  const linkCell = product.link
    ? `<td><a href="${escapeHtml(product.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding:6px 14px;font-size:13px">Kup</a></td>`
    : `<td style="color:var(--text-muted)">—</td>`;

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.name)}</td>
    <td>${shopBadge(Shop.AUTO_PARTNER)}</td>
    <td>${escapeHtml(product.producer)}</td>
    <td class="delivery">${escapeHtml(product.availability)}</td>
    <td class="price" style="font-size:13px">${escapeHtml(product.price)}</td>
    ${linkCell}
  `;

  return tr;
}

// ── Grouped results (Zgrupowany wynik) ──────────────────────

/**
 * Map a product from any shop into a uniform shape for grouping.
 */
function normalizeForGrouping(shop, product) {
  let number, producer, availabilityHtml, priceHtml;

  if (shop === Shop.INTER_PARTS) {
    number = product.sku;
    producer = product.manufacturer;
    priceHtml = `
      <div style="line-height:1.5">
        <div class="price" style="font-size:13px">${escapeHtml(product.priceGross)}</div>
        <div class="price" style="font-size:11px;color:var(--text-muted)">${escapeHtml(product.priceRetail)}</div>
      </div>`;
    // Build mini availability table (same logic as createInterPartsRow)
    const qtys = product.quantities || [];
    const branches = product.branchAvailability || [];
    const routes = product.routeDeparture || [];
    const rowCount = Math.max(qtys.length, branches.length, routes.length);
    if (rowCount > 0) {
      const thS = 'padding:2px 4px;font-size:10px;color:var(--text-muted);font-weight:600;text-align:left;border-bottom:1px solid var(--border)';
      const tdS = 'padding:2px 4px;font-size:11px;white-space:nowrap';
      let rows = '';
      for (let i = 0; i < rowCount; i++) {
        rows += `<tr><td style="${tdS}">${escapeHtml(qtys[i] || '')}</td><td style="${tdS}">${escapeHtml(branches[i] || '')}</td><td style="${tdS}">${escapeHtml(routes[i] || '')}</td></tr>`;
      }
      availabilityHtml = `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="${thS}">Ilość</th><th style="${thS}">W filii</th><th style="${thS}">Wyjazd</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      availabilityHtml = '—';
    }
  } else if (shop === Shop.APCAT) {
    number = product.dealerPartNumber;
    producer = product.producer;
    availabilityHtml = (product.availability && product.availability.length > 0)
      ? product.availability.map(a => `<div>${escapeHtml(a)}</div>`).join('')
      : '—';
    priceHtml = (product.prices && product.prices.length > 0)
      ? product.prices.map(p => `<div class="price" style="font-size:11px">${escapeHtml(p)}</div>`).join('')
      : '—';
  } else {
    // Auto Partner
    number = product.name;
    producer = product.producer;
    availabilityHtml = escapeHtml(product.availability);
    priceHtml = `<span class="price" style="font-size:13px">${escapeHtml(product.price)}</span>`;
  }

  // Determine if this item has meaningful availability data
  let hasAvailability;
  if (shop === Shop.INTER_PARTS) {
    hasAvailability = (product.quantities && product.quantities.length > 0)
      || (product.branchAvailability && product.branchAvailability.length > 0);
  } else if (shop === Shop.APCAT) {
    hasAvailability = product.availability && product.availability.length > 0
      && product.availability.some(a => !/^.*--$/.test(a.trim()));
  } else {
    hasAvailability = !!product.availability && product.availability.trim() !== ''
      && product.availability.trim() !== '0' && product.availability.trim() !== '0 [0]';
  }

  return {
    shop,
    number: number || '',
    producer: producer || '',
    availabilityHtml,
    priceHtml,
    hasAvailability,
    normalizedKey: normalizePartNumber(number || ''),
  };
}

/**
 * Render the grouped results table from all collected items.
 * @param {Array} items - normalized items from all shops
 * @param {string} searchQuery - the original search query (for prioritizing matching groups)
 */
function displayGroupedResults(items, searchQuery) {
  const tbody = document.getElementById('grouped-tbody');
  tbody.innerHTML = '';

  if (!items || items.length === 0) {
    tbody.innerHTML = emptyRow(5, 'Nie znaleziono wyników');
    setTableStatus('grouped-status', '0 wynik(ów)');
    return;
  }

  // Group by normalized key
  const groups = new Map();
  items.forEach(item => {
    const key = item.normalizedKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  // Sort groups: exact match to search query first, then groups with availability, then the rest
  const normalizedQuery = normalizePartNumber(searchQuery || '');
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const aMatch = a === normalizedQuery;
    const bMatch = b === normalizedQuery;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;

    // Then: groups that have at least one item with availability come first
    const aHasAvail = groups.get(a).some(i => i.hasAvailability);
    const bHasAvail = groups.get(b).some(i => i.hasAvailability);
    if (aHasAvail !== bHasAvail) return aHasAvail ? -1 : 1;

    // Fallback: alphabetical
    return a.localeCompare(b);
  });

  let totalItems = 0;
  sortedKeys.forEach(key => {
    const groupItems = groups.get(key);

    // Sort items within group: items with availability first
    groupItems.sort((a, b) => {
      if (a.hasAvailability !== b.hasAvailability) return a.hasAvailability ? -1 : 1;
      return 0;
    });

    totalItems += groupItems.length;

    // Group header row
    const headerTr = document.createElement('tr');
    headerTr.className = 'group-header';
    headerTr.innerHTML = `
      <td colspan="5">
        <div class="gh-flex">
          <span class="gh-number">${escapeHtml(key)}</span>
          <span style="font-size:12px;color:var(--text-muted);font-weight:400">${groupItems.length} wynik(ów) z ${countUniqueShops(groupItems)} sklep(ów)</span>
        </div>
      </td>`;
    tbody.appendChild(headerTr);

    // Item rows within the group
    groupItems.forEach((item, idx) => {
      const tr = document.createElement('tr');
      if (idx === 0) tr.className = 'group-start';
      tr.innerHTML = `
        <td class="part-number">${escapeHtml(item.number)}</td>
        <td>${shopBadge(item.shop)}</td>
        <td>${escapeHtml(item.producer)}</td>
        <td class="delivery">${item.availabilityHtml}</td>
        <td>${item.priceHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  });

  setTableStatus('grouped-status', `${totalItems} wynik(ów) w ${sortedKeys.length} grup(ach)`);
}

function countUniqueShops(items) {
  return new Set(items.map(i => i.shop)).size;
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
