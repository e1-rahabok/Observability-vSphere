const CSV_URL = 'https://raw.githubusercontent.com/e1-rahabok/Observability-vSphere/main/vsphere-metrics.csv';

const state = {
  rows: [],
  headers: [],
  visibleColumns: [],
  sortColumn: null,
  sortDirection: 'asc',
  globalSearch: '',
  filterColumn: '',
  filterValue: '',
};

const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const rowCount = document.getElementById('rowCount');
const globalSearchInput = document.getElementById('globalSearch');
const columnFilterSelect = document.getElementById('columnFilter');
const filterValueInput = document.getElementById('filterValue');
const columnToggles = document.getElementById('columnToggles');
const resetButton = document.getElementById('resetButton');

initialize();

async function initialize() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const csvText = await response.text();
    const parsed = parseCsv(csvText);

    if (!parsed.length) {
      throw new Error('CSV file is empty.');
    }

    state.headers = parsed[0].map((header) => header.trim());
    state.rows = parsed.slice(1).map((row) => {
      const record = {};
      state.headers.forEach((header, index) => {
        record[header] = (row[index] ?? '').trim();
      });
      return record;
    });

    state.visibleColumns = [...state.headers];
    state.filterColumn = state.headers[0] || '';
    populateColumnSelector();
    renderColumnToggles();
    bindEvents();
    renderTable();
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="100%" class="empty-state">Unable to load CSV data. Check the repo or the raw URL.</td></tr>`;
  }
}

function bindEvents() {
  globalSearchInput.addEventListener('input', (event) => {
    state.globalSearch = event.target.value.trim();
    renderTable();
  });

  columnFilterSelect.addEventListener('change', (event) => {
    state.filterColumn = event.target.value;
    renderTable();
  });

  filterValueInput.addEventListener('input', (event) => {
    state.filterValue = event.target.value.trim();
    renderTable();
  });

  resetButton.addEventListener('click', () => {
    state.globalSearch = '';
    state.filterColumn = state.headers[0] || '';
    state.filterValue = '';
    state.sortColumn = null;
    state.sortDirection = 'asc';
    state.visibleColumns = [...state.headers];

    globalSearchInput.value = '';
    filterValueInput.value = '';
    columnFilterSelect.value = state.filterColumn;
    renderColumnToggles();
    renderTable();
  });
}

function populateColumnSelector() {
  columnFilterSelect.innerHTML = state.headers
    .map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`)
    .join('');
  columnFilterSelect.value = state.filterColumn;
}

function renderColumnToggles() {
  columnToggles.innerHTML = state.headers
    .map((header) => {
      const checked = state.visibleColumns.includes(header) ? 'checked' : '';
      return `
        <label>
          <input type="checkbox" data-column="${escapeAttribute(header)}" ${checked} />
          ${escapeHtml(header)}
        </label>
      `;
    })
    .join('');

  columnToggles.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const column = event.target.getAttribute('data-column');
      if (event.target.checked) {
        if (!state.visibleColumns.includes(column)) {
          state.visibleColumns.push(column);
        }
      } else {
        state.visibleColumns = state.visibleColumns.filter((item) => item !== column);
      }
      renderTable();
    });
  });
}

function renderTable() {
  const visible = state.visibleColumns.filter((column) => state.headers.includes(column));

  if (!visible.length) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="100%" class="empty-state">No columns selected.</td></tr>';
    rowCount.textContent = '0 rows';
    return;
  }

  const sortedRows = getFilteredRows();

  tableHead.innerHTML = `
    <tr>
      ${visible
        .map((header) => {
          const isActive = state.sortColumn === header;
          const indicator = isActive ? (state.sortDirection === 'asc' ? '↑' : '↓') : '↕';
          return `
            <th data-column="${escapeAttribute(header)}">
              ${escapeHtml(header)}
              <span class="sort-indicator">${indicator}</span>
            </th>
          `;
        })
        .join('')}
    </tr>
  `;

  tableHead.querySelectorAll('th').forEach((headerCell) => {
    headerCell.addEventListener('click', () => {
      const column = headerCell.getAttribute('data-column');
      if (!column) return;

      if (state.sortColumn === column) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortColumn = column;
        state.sortDirection = 'asc';
      }

      renderTable();
    });
  });

  if (!sortedRows.length) {
    tableBody.innerHTML = '<tr><td colspan="100%" class="empty-state">No rows match the current filter.</td></tr>';
    rowCount.textContent = '0 rows';
    return;
  }

  tableBody.innerHTML = sortedRows
    .map((row) => {
      return `
        <tr>
          ${visible
            .map((header) => `<td>${escapeHtml(row[header] ?? '')}</td>`)
            .join('')}
        </tr>
      `;
    })
    .join('');

  rowCount.textContent = `${sortedRows.length} row${sortedRows.length === 1 ? '' : 's'}`;
}

function getFilteredRows() {
  let filteredRows = [...state.rows];

  if (state.globalSearch) {
    const search = state.globalSearch.toLowerCase();
    filteredRows = filteredRows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(search))
    );
  }

  if (state.filterColumn && state.filterValue) {
    const filterText = state.filterValue.toLowerCase();
    filteredRows = filteredRows.filter((row) => {
      const value = String(row[state.filterColumn] ?? '').toLowerCase();
      return value.includes(filterText);
    });
  }

  if (state.sortColumn) {
    filteredRows.sort((a, b) => {
      const aValue = a[state.sortColumn] ?? '';
      const bValue = b[state.sortColumn] ?? '';

      const numericA = Number(aValue);
      const numericB = Number(bValue);

      if (!Number.isNaN(numericA) && !Number.isNaN(numericB)) {
        return state.sortDirection === 'asc' ? numericA - numericB : numericB - numericA;
      }

      const left = String(aValue).toLowerCase();
      const right = String(bValue).toLowerCase();
      return state.sortDirection === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  }

  return filteredRows;
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        i++; 
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
