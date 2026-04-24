/**
 * BFHL Frontend — Application Logic
 * 
 * Handles user input, API communication, and result rendering.
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const edgeInput = document.getElementById('edgeInput');
  const submitBtn = document.getElementById('submitBtn');
  const loadExampleBtn = document.getElementById('loadExampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusBadge = document.getElementById('statusBadge');
  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');
  const resultsSection = document.getElementById('resultsSection');
  const identityGrid = document.getElementById('identityGrid');
  const summaryMetrics = document.getElementById('summaryMetrics');
  const hierarchiesList = document.getElementById('hierarchiesList');
  const invalidList = document.getElementById('invalidList');
  const duplicateList = document.getElementById('duplicateList');
  const rawJsonOutput = document.getElementById('rawJsonOutput');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const responseInfoBar = document.getElementById('responseInfoBar');
  const responseTimeValue = document.getElementById('responseTimeValue');
  const edgeCountValue = document.getElementById('edgeCountValue');

  const API_ENDPOINT = '/bfhl';

  // Store last response for copy
  let lastResponseJson = '';

  // --- Example Data (including the full spec example) ---
  const EXAMPLES = [
    '["A->B", "A->C", "B->D", "C->E", "E->F", "X->Y", "Y->Z", "Z->X", "P->Q", "Q->R", "G->H", "G->H", "G->I", "hello", "1->2", "A->"]',
    '["A->B", "A->C", "B->D", "C->E"]',
    '["A->B", "B->C", "C->A"]',
    '["X->Y", "X->Z", "Y->W", "a->b", "A->B", "A->B"]',
    '["A->B", "C->D", "E->F", "B->G"]',
    '["M->N", "N->O", "O->P", "P->Q", "Q->R", "R->S"]',
  ];
  let exampleIndex = 0;

  // --- Event Listeners ---
  submitBtn.addEventListener('click', handleSubmit);
  loadExampleBtn.addEventListener('click', loadExample);
  clearBtn.addEventListener('click', clearAll);

  copyJsonBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(lastResponseJson);
  });

  edgeInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  });

  // --- Core Functions ---

  async function handleSubmit() {
    const rawValue = edgeInput.value.trim();

    if (!rawValue) {
      showError('Please enter an array of edges.');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawValue);
    } catch {
      showError('Invalid JSON. Please enter a valid JSON array, e.g. ["A->B", "A->C"]');
      return;
    }

    if (!Array.isArray(parsedData)) {
      showError('Input must be a JSON array, e.g. ["A->B", "A->C"]');
      return;
    }

    setLoading(true);
    hideError();
    hideResults();

    const startTime = performance.now();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsedData }),
      });

      const elapsedMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      lastResponseJson = JSON.stringify(result, null, 2);
      renderResults(result, parsedData.length, elapsedMs);
      setStatus('success', `${elapsedMs}ms`);
    } catch (err) {
      showError(err.message || 'Failed to reach the server.');
      setStatus('error', 'Error');
    } finally {
      setLoading(false);
    }
  }

  function loadExample() {
    edgeInput.value = EXAMPLES[exampleIndex % EXAMPLES.length];
    exampleIndex++;
    edgeInput.focus();
  }

  function clearAll() {
    edgeInput.value = '';
    hideError();
    hideResults();
    setStatus('ready', 'Ready');
    edgeInput.focus();
  }

  // --- UI State Helpers ---

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('loading', isLoading);
    if (isLoading) setStatus('loading', 'Processing…');
  }

  function setStatus(type, text) {
    statusBadge.className = 'status-badge';
    if (type === 'loading') statusBadge.classList.add('loading');
    if (type === 'error') statusBadge.classList.add('error');
    statusBadge.innerHTML = `<span class="status-dot"></span>${text}`;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorSection.style.display = 'block';
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorSection.style.display = 'none';
  }

  function hideResults() {
    resultsSection.style.display = 'none';
    responseInfoBar.style.display = 'none';
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      copyJsonBtn.classList.add('copied');
      copyJsonBtn.title = 'Copied!';
      setTimeout(() => {
        copyJsonBtn.classList.remove('copied');
        copyJsonBtn.title = 'Copy JSON to clipboard';
      }, 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // --- Rendering ---

  function renderResults(data, inputEdgeCount, elapsedMs) {
    // Response info bar
    responseTimeValue.textContent = `${elapsedMs}ms`;
    edgeCountValue.textContent = `${inputEdgeCount} edge${inputEdgeCount !== 1 ? 's' : ''} processed`;
    responseInfoBar.style.display = 'block';

    // Color-code response time
    const responseTimeChip = document.getElementById('responseTimeChip');
    responseTimeChip.className = 'info-chip';
    if (elapsedMs < 100) responseTimeChip.classList.add('fast');
    else if (elapsedMs < 500) responseTimeChip.classList.add('normal');
    else responseTimeChip.classList.add('slow');

    // Identity
    identityGrid.innerHTML = renderIdentity(data);

    // Summary
    summaryMetrics.innerHTML = renderSummary(data.summary);

    // Hierarchies
    hierarchiesList.innerHTML = renderHierarchies(data.hierarchies);

    // Invalid entries
    invalidList.innerHTML = renderTags(data.invalid_entries, 'invalid');

    // Duplicate edges
    duplicateList.innerHTML = renderTags(data.duplicate_edges, 'duplicate');

    // Raw JSON
    rawJsonOutput.textContent = lastResponseJson;

    // Show results
    resultsSection.style.display = 'flex';
    resultsSection.style.flexDirection = 'column';
    resultsSection.style.gap = 'var(--space-lg)';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderIdentity(data) {
    const fields = [
      { label: 'User ID', value: data.user_id },
      { label: 'Email', value: data.email_id },
      { label: 'Roll Number', value: data.college_roll_number },
    ];

    return fields.map(f => `
      <div class="identity-item">
        <span class="identity-label">${f.label}</span>
        <span class="identity-value">${escapeHtml(f.value || '—')}</span>
      </div>
    `).join('');
  }

  function renderSummary(summary) {
    if (!summary) return '<p class="empty-message">No summary available</p>';

    return `
      <div class="metric-card trees">
        <div class="metric-value">${summary.total_trees}</div>
        <div class="metric-label">Trees</div>
      </div>
      <div class="metric-card cycles">
        <div class="metric-value">${summary.total_cycles}</div>
        <div class="metric-label">Cycles</div>
      </div>
      <div class="metric-card largest">
        <div class="metric-value">${escapeHtml(summary.largest_tree_root || '—')}</div>
        <div class="metric-label">Largest Root</div>
      </div>
    `;
  }

  function renderHierarchies(hierarchies) {
    if (!hierarchies || hierarchies.length === 0) {
      return '<p class="empty-message">No hierarchies to display</p>';
    }

    return hierarchies.map((h, idx) => {
      const isCycle = h.has_cycle === true;
      const badges = isCycle
        ? '<span class="badge badge-cycle">Cycle Detected</span>'
        : `<span class="badge badge-depth">Depth: ${h.depth}</span>`;

      const treeContent = isCycle
        ? '<p class="empty-tree">⚠ Cycle detected — tree cannot be constructed</p>'
        : renderTreeVisual(h.tree, 0);

      return `
        <div class="hierarchy-item" style="animation-delay: ${idx * 0.06}s">
          <div class="hierarchy-header">
            <div class="hierarchy-root">
              <span class="root-badge">${escapeHtml(h.root)}</span>
              <span class="root-label">Root Node</span>
            </div>
            <div class="hierarchy-badges">${badges}</div>
          </div>
          <div class="hierarchy-tree">
            <div class="tree-visualization">${treeContent}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Recursively renders a tree object as a text-based visual tree.
   * Example:
   *   A
   *   ├── B
   *   │   └── D
   *   └── C
   */
  function renderTreeVisual(tree, indentLevel) {
    if (!tree || typeof tree !== 'object') return '';

    const keys = Object.keys(tree);
    if (keys.length === 0) return '';

    let result = '';

    keys.forEach((key, i) => {
      const isRoot = indentLevel === 0;
      const isLast = i === keys.length - 1;
      const children = tree[key];
      const childKeys = Object.keys(children || {});

      if (isRoot) {
        result += `<span class="tree-node">${escapeHtml(key)}</span>\n`;
      } else {
        const connector = isLast ? '└── ' : '├── ';
        const prefix = getPrefix(indentLevel);
        result += `<span class="tree-branch">${prefix}${connector}</span><span class="tree-node">${escapeHtml(key)}</span>\n`;
      }

      if (childKeys.length > 0) {
        const childTree = children;
        const childEntries = Object.entries(childTree);
        childEntries.forEach(([childKey, childVal], ci) => {
          const childIsLast = ci === childEntries.length - 1;
          result += renderSubtree(childKey, childVal, indentLevel + (isRoot ? 0 : 1), isRoot ? false : !isLast, childIsLast);
        });
      }
    });

    return result;
  }

  function renderSubtree(key, children, depth, parentContinues, isLast) {
    let result = '';
    const prefix = getTreePrefix(depth, parentContinues);
    const connector = isLast ? '└── ' : '├── ';

    result += `<span class="tree-branch">${prefix}${connector}</span><span class="tree-node">${escapeHtml(key)}</span>\n`;

    const childEntries = Object.entries(children || {});
    childEntries.forEach(([childKey, childVal], ci) => {
      const childIsLast = ci === childEntries.length - 1;
      result += renderSubtree(childKey, childVal, depth + 1, !isLast, childIsLast);
    });

    return result;
  }

  function getPrefix(depth) {
    let prefix = '';
    for (let i = 0; i < depth - 1; i++) {
      prefix += '│   ';
    }
    return prefix;
  }

  function getTreePrefix(depth, parentContinues) {
    let prefix = '';
    for (let i = 0; i < depth; i++) {
      prefix += parentContinues && i === depth - 1 ? '│   ' : '    ';
    }
    return prefix;
  }

  function renderTags(items, type) {
    if (!items || items.length === 0) {
      return '<p class="empty-message">None</p>';
    }

    return items.map((item, i) => `
      <span class="tag tag-${type}" style="animation-delay: ${i * 0.05}s">
        ${escapeHtml(item)}
      </span>
    `).join('');
  }

  // --- Utilities ---

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
