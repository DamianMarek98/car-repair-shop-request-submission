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

// ── Recent searches (localStorage) ──────────────────────────
const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 50;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function saveRecentSearch(query) {
  const q = query.trim();
  if (!q) return;
  let searches = getRecentSearches().filter(s => s !== q);
  searches.unshift(q);
  if (searches.length > MAX_RECENT_SEARCHES) searches.length = MAX_RECENT_SEARCHES;
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

function removeRecentSearch(query) {
  const searches = getRecentSearches().filter(s => s !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

// ── Price parsing ────────────────────────────────────────────
// Extracts a numeric price from a Polish-format string like "177,12 PLN"
function parsePrice(str) {
  if (!str) return Infinity;
  const match = str.match(/([\d\s]+,\d{2})/);
  if (!match) return Infinity;
  return parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
}

function getInterPartsPrice(product) {
  return parsePrice(product.priceGross);
}

function getApcatPrice(product) {
  if (!product.prices || product.prices.length === 0) return Infinity;
  const gross = product.prices.find(p => /Gross purchase/i.test(p) || /Zakup brutto/i.test(p));
  return gross ? parsePrice(gross) : parsePrice(product.prices[0]);
}

function getAutoPartnerPrice(product) {
  return parsePrice(product.price);
}

// ── Stored data for re-sorting ──────────────────────────────
let storedInterPartsProducts = [];
let storedApcatProducts = [];
let storedAutoPartnerProducts = [];
let storedGroupedItems = [];
let storedSearchQuery = '';

// ── Sort state ──────────────────────────────────────────────
// 'none' | 'asc' | 'desc'
const sortState = {
  grouped: 'none',
  interparts: 'none',
  apcat: 'none',
  autopartner: 'none',
};

function cycleSortState(key) {
  if (sortState[key] === 'none') sortState[key] = 'asc';
  else if (sortState[key] === 'asc') sortState[key] = 'desc';
  else sortState[key] = 'none';
  return sortState[key];
}

function updateSortHeader(thId, state) {
  const th = document.getElementById(thId);
  if (!th) return;
  th.classList.remove('sort-asc', 'sort-desc');
  th.dataset.sort = state;
  const icon = th.querySelector('.sort-icon');
  if (state === 'asc') { th.classList.add('sort-asc'); icon.textContent = '▲'; }
  else if (state === 'desc') { th.classList.add('sort-desc'); icon.textContent = '▼'; }
  else { icon.textContent = '⇅'; }
}

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

// ── Availability detection ────────────────────────────────────
function isInterPartsAvailable(product) {
  return (product.quantities && product.quantities.length > 0)
      || (product.branchAvailability && product.branchAvailability.length > 0);
}

// Entries look like "24h --", "CD 1", "HUB 4". Available if at least one has a numeric value.
function isApcatAvailable(product) {
  if (!product.availability || product.availability.length === 0) return false;
  return product.availability.some(a => {
    const value = a.trim().split(/\s+/).pop();
    return value !== '--' && /\d/.test(value);
  });
}

function isAutoPartnerAvailable(product) {
  const av = (product.availability || '').trim();
  return av !== '' && av !== '0' && av !== '0 [0]';
}

// ── DOM ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing event listeners');

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.querySelector('.search-input');

  if (!searchBtn) { console.error('Search button not found!'); return; }
  if (!searchInput) { console.error('Search input not found!'); return; }

  searchBtn.addEventListener('click', () => { hideRecentDropdown(); handleSearch(); });
  // Note: Enter key is handled in the keydown listener below (with dropdown support)

  // ── Recent searches dropdown ──────────────────────────────
  const recentDropdown = document.getElementById('recent-dropdown');
  let recentActiveIdx = -1;

  function renderRecentDropdown(filter) {
    const all = getRecentSearches();
    const f = (filter || '').trim().toLowerCase();
    const filtered = f ? all.filter(s => s.toLowerCase().includes(f)) : all;
    recentActiveIdx = -1;

    if (filtered.length === 0) {
      recentDropdown.innerHTML = '';
      recentDropdown.classList.remove('visible');
      return;
    }

    recentDropdown.innerHTML = filtered.map((s, i) =>
      `<div class="recent-item" data-index="${i}" data-query="${escapeHtml(s)}">
        <span>${escapeHtml(s)}</span>
        <button class="recent-item-remove" data-query="${escapeHtml(s)}">&times;</button>
      </div>`
    ).join('');
    recentDropdown.classList.add('visible');
  }

  function hideRecentDropdown() {
    recentDropdown.classList.remove('visible');
    recentActiveIdx = -1;
  }

  function selectRecentItem(query) {
    searchInput.value = query;
    hideRecentDropdown();
    handleSearch();
  }

  searchInput.addEventListener('input', () => renderRecentDropdown(searchInput.value));
  searchInput.addEventListener('focus', () => renderRecentDropdown(searchInput.value));

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !recentDropdown.contains(e.target)) {
      hideRecentDropdown();
    }
  });

  recentDropdown.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.recent-item-remove');
    if (removeBtn) {
      e.stopPropagation();
      removeRecentSearch(removeBtn.dataset.query);
      renderRecentDropdown(searchInput.value);
      return;
    }
    const item = e.target.closest('.recent-item');
    if (item) selectRecentItem(item.dataset.query);
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = recentDropdown.querySelectorAll('.recent-item');
    if (!recentDropdown.classList.contains('visible') || items.length === 0) {
      if (e.key === 'Enter') { hideRecentDropdown(); handleSearch(); }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      recentActiveIdx = Math.min(recentActiveIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === recentActiveIdx));
      items[recentActiveIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      recentActiveIdx = Math.max(recentActiveIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === recentActiveIdx));
      items[recentActiveIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (recentActiveIdx >= 0 && items[recentActiveIdx]) {
        selectRecentItem(items[recentActiveIdx].dataset.query);
      } else {
        hideRecentDropdown();
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      hideRecentDropdown();
    }
  });

  function wireFilterCheckbox(checkboxId, tableWrapId) {
    document.getElementById(checkboxId)?.addEventListener('change', function () {
      document.getElementById(tableWrapId).classList.toggle('filter-available', this.checked);
    });
  }
  wireFilterCheckbox('filter-grouped',     'grouped-table-wrap');
  wireFilterCheckbox('filter-interparts',  'interparts-table-wrap');
  wireFilterCheckbox('filter-apcat',       'apcat-table-wrap');
  wireFilterCheckbox('filter-autopartner', 'autopartner-table-wrap');

  // Sort click handlers
  document.getElementById('sort-interparts')?.addEventListener('click', () => {
    const state = cycleSortState('interparts');
    updateSortHeader('sort-interparts', state);
    displayInterPartsResults(storedInterPartsProducts, state);
  });
  document.getElementById('sort-apcat')?.addEventListener('click', () => {
    const state = cycleSortState('apcat');
    updateSortHeader('sort-apcat', state);
    displayApcatResults(storedApcatProducts, state);
  });
  document.getElementById('sort-autopartner')?.addEventListener('click', () => {
    const state = cycleSortState('autopartner');
    updateSortHeader('sort-autopartner', state);
    displayAutoPartnerResults(storedAutoPartnerProducts, state);
  });
  document.getElementById('sort-grouped')?.addEventListener('click', () => {
    const state = cycleSortState('grouped');
    updateSortHeader('sort-grouped', state);
    displayGroupedResults(storedGroupedItems, storedSearchQuery, state);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.table-wrap').forEach(w => w.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  console.log('Event listeners attached successfully');
});

// ── Main search handler ───────────────────────────────────────
async function handleSearch() {
  const query = document.querySelector('.search-input').value.trim();
  if (!query) { showError('Proszę wprowadzić numer części'); return; }

  saveRecentSearch(query);
  clearError();
  showSpinner();

  // Reset sort state
  for (const key of Object.keys(sortState)) {
    sortState[key] = 'none';
  }
  updateSortHeader('sort-grouped', 'none');
  updateSortHeader('sort-interparts', 'none');
  updateSortHeader('sort-apcat', 'none');
  updateSortHeader('sort-autopartner', 'none');
  storedInterPartsProducts = [];
  storedApcatProducts = [];
  storedAutoPartnerProducts = [];
  storedGroupedItems = [];
  storedSearchQuery = query;

  // Reset all tables to loading state — all start searching immediately
  setTableStatus('grouped-status', 'Wyszukiwanie…');
  setTableStatus('interparts-status', 'Wyszukiwanie…');
  setTableStatus('apcat-status', 'Wyszukiwanie…');
  setTableStatus('autopartner-status', 'Wyszukiwanie…');
  setTabBadge('tab-badge-grouped', '…');
  setTabBadge('tab-badge-interparts', '…');
  setTabBadge('tab-badge-apcat', '…');
  setTabBadge('tab-badge-autopartner', '…');
  setTbodyLoading('grouped-tbody', 6);
  setTbodyLoading('interparts-tbody', 7);
  setTbodyLoading('apcat-tbody', 7);
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
        storedInterPartsProducts = result.data;
        displayInterPartsResults(result.data);
        setTableStatus('interparts-status', `${result.data.length} wynik(ów)`);
        setTabBadge('tab-badge-interparts', result.data.length);
        // Collect for grouped table
        result.data.forEach(p => groupedItems.push(normalizeForGrouping(Shop.INTER_PARTS, p)));
      } else {
        displayTbodyError('interparts-tbody', 7, result.error || 'Błąd wyszukiwania');
        setTableStatus('interparts-status', 'Błąd');
        setTabBadge('tab-badge-interparts', '!');
      }
    });

  const apcatPromise = searchApcat(query)
    .catch(err => {
      console.error('[APCAT] API error:', err);
      return { success: false, error: err.message };
    })
    .then(result => {
      if (result.success) {
        storedApcatProducts = result.data || [];
        displayApcatResults(storedApcatProducts);
        setTableStatus('apcat-status', `${storedApcatProducts.length} wynik(ów)`);
        setTabBadge('tab-badge-apcat', storedApcatProducts.length);
        // Collect for grouped table
        storedApcatProducts.forEach(p => groupedItems.push(normalizeForGrouping(Shop.APCAT, p)));
      } else {
        displayTbodyError('apcat-tbody', 7, result.error || 'Błąd wyszukiwania');
        setTableStatus('apcat-status', 'Błąd');
        setTabBadge('tab-badge-apcat', '!');
      }
    });

  const autoPartnerPromise = searchAutoPartner(query)
    .catch(err => {
      console.error('[AutoPartner] API error:', err);
      return { success: false, error: err.message };
    })
    .then(result => {
      if (result.success) {
        storedAutoPartnerProducts = result.data || [];
        displayAutoPartnerResults(storedAutoPartnerProducts);
        setTableStatus('autopartner-status', `${storedAutoPartnerProducts.length} wynik(ów)`);
        setTabBadge('tab-badge-autopartner', storedAutoPartnerProducts.length);
        // Collect for grouped table
        storedAutoPartnerProducts.forEach(p => groupedItems.push(normalizeForGrouping(Shop.AUTO_PARTNER, p)));
      } else {
        displayTbodyError('autopartner-tbody', 7, result.error || 'Błąd wyszukiwania');
        setTableStatus('autopartner-status', 'Błąd');
        setTabBadge('tab-badge-autopartner', '!');
      }
    });

  // Wait for all searches, then build grouped table
  await Promise.allSettled([interPartsPromise, apcatPromise, autoPartnerPromise]);
  storedGroupedItems = groupedItems;
  displayGroupedResults(groupedItems, query);
  setTabBadge('tab-badge-grouped', groupedItems.length);
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
function displayInterPartsResults(products, sortDir) {
  const tbody = document.getElementById('interparts-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(7, 'Nie znaleziono wyników');
    return;
  }

  let sorted = [...products];
  if (sortDir === 'asc') sorted.sort((a, b) => getInterPartsPrice(a) - getInterPartsPrice(b));
  else if (sortDir === 'desc') sorted.sort((a, b) => getInterPartsPrice(b) - getInterPartsPrice(a));

  sorted.forEach((product, index) => {
    tbody.appendChild(createInterPartsRow(product, index + 1));
  });
}

function createInterPartsRow(product, index) {
  const tr = document.createElement('tr');
  tr.dataset.available = String(isInterPartsAvailable(product));

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
function displayApcatResults(products, sortDir) {
  const tbody = document.getElementById('apcat-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(7, 'Nie znaleziono wyników');
    return;
  }

  let sorted = [...products];
  if (sortDir === 'asc') sorted.sort((a, b) => getApcatPrice(a) - getApcatPrice(b));
  else if (sortDir === 'desc') sorted.sort((a, b) => getApcatPrice(b) - getApcatPrice(a));

  sorted.forEach((product, index) => {
    tbody.appendChild(createApcatRow(product, index + 1));
  });
}

function createApcatRow(product, index) {
  const tr = document.createElement('tr');
  tr.dataset.available = String(isApcatAvailable(product));

  const availability = product.availability.length > 0
    ? product.availability.map(a => `<div>${escapeHtml(a)}</div>`).join('')
    : '—';

  const prices = product.prices.length > 0
    ? product.prices.map(p => `<div class="price" style="font-size:13px">${escapeHtml(p)}</div>`).join('')
    : '—';

  const bonusHtml = product.bonus
    ? `<span style="color:var(--green);font-weight:600">${escapeHtml(product.bonus)}</span>`
    : '<span style="color:var(--text-muted)">—</span>';

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.dealerPartNumber)}</td>
    <td>${shopBadge(Shop.APCAT)}</td>
    <td>${escapeHtml(product.producer)}</td>
    <td class="delivery" style="line-height:1.8">${availability}</td>
    <td><div style="line-height:1.8">${prices}</div></td>
    <td>${bonusHtml}</td>
  `;

  return tr;
}

// ── Auto Partner rendering ────────────────────────────────────
function displayAutoPartnerResults(products, sortDir) {
  const tbody = document.getElementById('autopartner-tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = emptyRow(7, 'Nie znaleziono wyników');
    return;
  }

  let sorted = [...products];
  if (sortDir === 'asc') sorted.sort((a, b) => getAutoPartnerPrice(a) - getAutoPartnerPrice(b));
  else if (sortDir === 'desc') sorted.sort((a, b) => getAutoPartnerPrice(b) - getAutoPartnerPrice(a));

  sorted.forEach((product, index) => {
    tbody.appendChild(createAutoPartnerRow(product, index + 1));
  });
}

function createAutoPartnerRow(product, index) {
  const tr = document.createElement('tr');
  tr.dataset.available = String(isAutoPartnerAvailable(product));

  const linkCell = product.link
    ? `<td><a href="${escapeHtml(product.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding:6px 14px;font-size:13px">Kup</a></td>`
    : `<td style="color:var(--text-muted)">—</td>`;

  tr.innerHTML = `
    <td style="text-align:center;color:var(--text-muted)">${index}</td>
    <td class="part-number">${escapeHtml(product.name)}</td>
    <td>${shopBadge(Shop.AUTO_PARTNER)}</td>
    <td>${escapeHtml(product.producer)}</td>
    <td class="delivery">${escapeHtml(product.availability)}</td>
    <td>
      <div style="line-height:1.5">
        <div class="price" style="font-size:13px">${escapeHtml(product.price)}</div>
        <div class="price" style="font-size:13px;color:var(--text-muted)">${escapeHtml(product.priceNetto || '')}</div>
      </div>
    </td>
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

  let isAvailable;
  if (shop === Shop.INTER_PARTS)   isAvailable = isInterPartsAvailable(product);
  else if (shop === Shop.APCAT)    isAvailable = isApcatAvailable(product);
  else                             isAvailable = isAutoPartnerAvailable(product);

  let link = null;
  if (shop === Shop.INTER_PARTS || shop === Shop.AUTO_PARTNER) {
    link = product.link ?? null;
  }

  // Extract numeric price for sorting
  let sortPrice;
  if (shop === Shop.INTER_PARTS) sortPrice = getInterPartsPrice(product);
  else if (shop === Shop.APCAT) sortPrice = getApcatPrice(product);
  else sortPrice = getAutoPartnerPrice(product);

  return {
    shop,
    number: number || '',
    producer: producer || '',
    availabilityHtml,
    priceHtml,
    hasAvailability,
    normalizedKey: normalizePartNumber(number || ''),
    isAvailable,
    link,
    sortPrice,
  };
}

/**
 * Render the grouped results table from all collected items.
 * @param {Array} items - normalized items from all shops
 * @param {string} searchQuery - the original search query (for prioritizing matching groups)
 * @param priceSortDir direction of sorting
 */
function displayGroupedResults(items, searchQuery, priceSortDir) {
  const tbody = document.getElementById('grouped-tbody');
  tbody.innerHTML = '';

  if (!items || items.length === 0) {
    tbody.innerHTML = emptyRow(6, 'Nie znaleziono wyników');
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

  // Compute min price per group for sorting
  const groupMinPrice = new Map();
  groups.forEach((groupItems, key) => {
    const min = Math.min(...groupItems.map(i => i.sortPrice));
    groupMinPrice.set(key, min);
  });

  const normalizedQuery = normalizePartNumber(searchQuery || '');
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    // When price sort is active, it takes priority
    if (priceSortDir === 'asc') return groupMinPrice.get(a) - groupMinPrice.get(b);
    if (priceSortDir === 'desc') return groupMinPrice.get(b) - groupMinPrice.get(a);

    // Default: exact match first, then availability, then alphabetical
    const aMatch = a === normalizedQuery;
    const bMatch = b === normalizedQuery;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;

    const aHasAvail = groups.get(a).some(i => i.hasAvailability);
    const bHasAvail = groups.get(b).some(i => i.hasAvailability);
    if (aHasAvail !== bHasAvail) return aHasAvail ? -1 : 1;

    return a.localeCompare(b);
  });

  let totalItems = 0;
  sortedKeys.forEach(key => {
    const groupItems = groups.get(key);

    // Sort items within group by price when price sort is active, otherwise by availability
    if (priceSortDir === 'asc') {
      groupItems.sort((a, b) => a.sortPrice - b.sortPrice);
    } else if (priceSortDir === 'desc') {
      groupItems.sort((a, b) => b.sortPrice - a.sortPrice);
    } else {
      groupItems.sort((a, b) => {
        if (a.hasAvailability !== b.hasAvailability) return a.hasAvailability ? -1 : 1;
        return 0;
      });
    }

    totalItems += groupItems.length;

    // Group header row
    const headerTr = document.createElement('tr');
    headerTr.className = 'group-header';
    headerTr.dataset.available = String(groupItems.some(i => i.isAvailable));
    headerTr.innerHTML = `
      <td colspan="6">
        <div class="gh-flex">
          <span class="gh-number">${escapeHtml(key)}</span>
        </div>
      </td>`;
    tbody.appendChild(headerTr);

    // Item rows within the group
    groupItems.forEach((item, idx) => {
      const tr = document.createElement('tr');
      if (idx === 0) tr.className = 'group-start';
      tr.dataset.available = String(item.isAvailable);
      const kupCell = item.link
        ? `<td><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding:6px 14px;font-size:13px">Kup</a></td>`
        : `<td style="color:var(--text-muted)">—</td>`;
      tr.innerHTML = `
        <td class="part-number">${escapeHtml(item.number)}</td>
        <td>${shopBadge(item.shop)}</td>
        <td>${escapeHtml(item.producer)}</td>
        <td class="delivery">${item.availabilityHtml}</td>
        <td>${item.priceHtml}</td>
        ${kupCell}
      `;
      tbody.appendChild(tr);
    });
  });

  setTableStatus('grouped-status', `${totalItems} wynik(ów)`);
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

function setTabBadge(badgeId, value) {
  const el = document.getElementById(badgeId);
  if (el) el.textContent = value;
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
