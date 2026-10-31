/**
 * BFF UI Kit & Controller Library
 * Standard client-side utilities for Brainfuck web microservices.
 * Supports theme switching: OS 9 & OS X.
 * Version: 1.0.0
 */

const BffUI = {
  currentTheme: 'os9',

  // Brainfuck Virtual Machine instance
  vm: null,

  // Backend API state
  api: {
    detected: false,
    checked: false,
    docsUrl: '/docs',
    healthUrl: '/health',
  },

  // Active Brainfuck inspector state
  _bfState: {
    data: null,
    activeView: null,
    isWrapped: true,
    endpoint: '/bf',
  },

  /**
   * Returns a ready BrainfuckVM instance.
   */
  getVM() {
    if (!this.vm) {
      if (typeof BrainfuckVM !== 'undefined') {
        this.vm = new BrainfuckVM();
      } else {
        throw new Error('BrainfuckVM class is not loaded. Include bff-interpreter.js in your document.');
      }
    }
    return this.vm;
  },

  /**
   * Clears the virtual machine tape memory and resets pointer to 0.
   */
  resetVM() {
    if (this.vm && typeof this.vm.reset === 'function') {
      this.vm.reset();
    }
  },

  /**
   * Executes Brainfuck code using the pure JS virtual machine.
   * Resets the tape and pointer by default so repeated executions produce clean, deterministic output.
   * @param {string} code - Brainfuck source code
   * @param {string|Uint8Array} [input=""] - Standard input
   * @param {Object} [options={}] - VM execution options
   * @returns {string} Standard output as UTF-8 string
   */
  runBrainfuck(code, input = '', options = {}) {
    const vm = this.getVM();
    if (typeof vm.reset === 'function') {
      vm.reset();
    }
    return vm.executeToString(code, input, { resetTape: true, ...options });
  },

  /**
   * Probes for a running FastAPI/Python backend service.
   * If detected, surfaces the Swagger /docs interactive API documentation link.
   * If not detected (e.g. static hosting on GitHub Pages), surfaces the JS client VM status.
   */
  async detectApi(options = {}) {
    // Check for explicit query string override or GitHub Pages static hosting
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search || '');
      const isGhPages = window.location.hostname && window.location.hostname.endsWith('.github.io');
      if (
        isGhPages ||
        params.get('static') === '1' ||
        params.get('offline') === '1' ||
        params.get('client_only') === '1'
      ) {
        this.api.detected = false;
        this.api.checked = true;
        this.updateApiUi();
        return false;
      }
    }

    this.api.healthUrl = options.healthUrl || this.api.healthUrl || '/health';
    this.api.docsUrl = options.docsUrl || this.api.docsUrl || '/docs';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(this.api.healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (
          !data ||
          data.backend_enabled === false ||
          data.backend === 'disabled' ||
          !(data.status === 'UP' || data.status === 'ok' || data.status === 'healthy')
        ) {
          this.api.detected = false;
        } else {
          this.api.detected = true;
        }
      } else {
        this.api.detected = false;
      }
    } catch (e) {
      this.api.detected = false;
    }
    this.api.checked = true;
    this.updateApiUi();
    return this.api.detected;
  },

  /**
   * Renders the Swagger API Docs link or Client VM badge in the top bar.
   */
  updateApiUi() {
    let topBar = document.querySelector('.bff-top-bar');
    if (!topBar) {
      const existingPicker = document.querySelector('.bff-theme-picker');
      if (existingPicker && existingPicker.parentElement) {
        topBar = document.createElement('div');
        topBar.className = 'bff-top-bar';
        existingPicker.parentElement.insertBefore(topBar, existingPicker);
        topBar.appendChild(existingPicker);
      }
    }

    let statusEl = document.getElementById('bffApiStatusSlot');
    if (!statusEl && topBar) {
      statusEl = document.createElement('div');
      statusEl.id = 'bffApiStatusSlot';
      topBar.insertBefore(statusEl, topBar.firstChild);
    }

    if (this.api.detected) {
      if (statusEl) {
        statusEl.innerHTML = `
          <a class="bff-swagger-link" id="bffSwaggerBtn" href="${this.api.docsUrl}" target="_blank" title="FastAPI backend active: Explore interactive Swagger OpenAPI docs">
            <span class="bff-swagger-dot"></span>
            <span>Swagger API</span>
          </a>
        `;
      }
    } else {
      if (statusEl) {
        statusEl.innerHTML = `
          <div class="bff-static-badge" id="bffStaticBadge" title="No backend server detected. Running client-side via pure JavaScript Brainfuck VM." onclick="BffUI.showToast('Running on standalone JavaScript Brainfuck VM with zero backend dependencies!')">
            <span class="pulse-dot" style="background:#00bcd4; box-shadow:0 0 6px #00bcd4; width:6px; height:6px;"></span>
            <span>Client JS VM</span>
          </div>
        `;
      }
    }
  },

  /**
   * Switches the active UI theme and persists preference in localStorage.
   * @param {string} theme - 'os9' | 'osx'
   */
  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('bff-theme', theme);
    } catch (e) {}

    document.querySelectorAll('.bff-theme-select').forEach((sel) => {
      sel.value = theme;
    });

    const label = theme === 'osx' ? 'OS X' : 'OS 9';
    this.showToast(`Theme changed to: ${label}`);
  },

  /**
   * Retrieves saved theme from localStorage or returns default 'os9'.
   */
  getSavedTheme() {
    try {
      const saved = localStorage.getItem('bff-theme');
      return saved === 'osx' ? 'osx' : 'os9';
    } catch (e) {
      return 'os9';
    }
  },

  /**
   * Initializes theme on page load and mounts theme picker widget if absent.
   */
  initThemeSwitcher() {
    const saved = this.getSavedTheme();
    this.currentTheme = saved;
    document.documentElement.setAttribute('data-theme', saved);

    let topBar = document.querySelector('.bff-top-bar');

    // If no .bff-theme-select element exists on page, inject a discrete floating widget
    if (!document.querySelector('.bff-theme-select') && document.body) {
      topBar = document.createElement('div');
      topBar.className = 'bff-top-bar';
      topBar.style.position = 'fixed';
      topBar.style.top = '8px';
      topBar.style.right = '12px';
      topBar.style.zIndex = '9999';
      topBar.innerHTML = `
        <div id="bffApiStatusSlot"></div>
        <div class="bff-theme-picker">
          <span style="font-weight:bold; font-size:11px; margin-right:4px;">Appearance:</span>
          <select class="bff-theme-select" onchange="BffUI.setTheme(this.value)">
            <option value="os9"${saved === 'os9' ? ' selected' : ''}>OS 9</option>
            <option value="osx"${saved === 'osx' ? ' selected' : ''}>OS X</option>
          </select>
        </div>
      `;
      document.body.appendChild(topBar);
    } else if (topBar && !document.getElementById('bffApiStatusSlot')) {
      const slot = document.createElement('div');
      slot.id = 'bffApiStatusSlot';
      topBar.insertBefore(slot, topBar.firstChild);
    }
  },

  /**
   * Opens a modal by element ID.
   * @param {string} modalId - The DOM ID of the modal backdrop.
   */
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  /**
   * Closes a modal by element ID.
   * @param {string} modalId - The DOM ID of the modal backdrop.
   */
  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
  },

  /**
   * Initializes Brainfuck inspector modal with auto-fetching.
   * @param {Object} options
   * @param {string} options.modalId - ID of modal container
   * @param {string} [options.endpoint='/bf'] - API endpoint returning BF metadata
   * @param {string} [options.defaultView] - Initial view key (e.g. 'xml_to_json' or 'url_encode')
   */
  async initBfInspector(options = {}) {
    const modalId = options.modalId || 'bfModal';
    this._bfState.endpoint = options.endpoint || '/bf';
    this.openModal(modalId);

    if (!this._bfState.data) {
      const codeDisplay = document.getElementById('bfCodeDisplay');
      if (codeDisplay) codeDisplay.innerText = 'Loading Brainfuck code from server...';
      try {
        const res = await fetch(this._bfState.endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this._bfState.data = await res.json();
      } catch (err) {
        console.error('Failed to load BF data:', err);
        if (codeDisplay) codeDisplay.innerText = `Error loading Brainfuck source: ${err.message}`;
        return;
      }
    }

    const initialView = options.defaultView || Object.keys(this._bfState.data)[0] || 'tape';
    this.setBfView(initialView);
  },

  /**
   * Sets the active tab inside the Brainfuck inspector modal.
   * @param {string} viewKey - e.g. 'url_encode', 'url_decode', 'tape'
   */
  setBfView(viewKey) {
    this._bfState.activeView = viewKey;

    // Update tab classes
    document.querySelectorAll('.modal-subtabs .modal-tab').forEach((tab) => {
      const tabTarget = tab.getAttribute('data-view') || tab.id.replace('modalTab', '').toLowerCase();
      if (tabTarget === viewKey.toLowerCase() || tab.getAttribute('data-view') === viewKey) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const codeSec = document.getElementById('bfCodeSection');
    const tapeSec = document.getElementById('bfTapeSection');

    if (viewKey === 'tape') {
      if (codeSec) codeSec.style.display = 'none';
      if (tapeSec) tapeSec.style.display = 'block';
    } else {
      if (codeSec) codeSec.style.display = 'block';
      if (tapeSec) tapeSec.style.display = 'none';

      if (this._bfState.data && this._bfState.data[viewKey]) {
        const info = this._bfState.data[viewKey];
        const display = document.getElementById('bfCodeDisplay');
        if (display) display.innerText = info.code || 'Code not available.';
        this.renderOpStats(info);
      }
    }
  },

  /**
   * Renders instruction count chips for a Brainfuck program.
   * @param {Object} info - Metadata object with op_counts and length
   */
  renderOpStats(info) {
    const container = document.getElementById('bfOpStats');
    if (!container) return;

    const counts = info.op_counts || {};
    const total = info.length || (info.code ? info.code.length : 0);

    container.innerHTML = `
      <div class="op-chip">Ops: <strong>${total.toLocaleString()}</strong></div>
      <div class="op-chip">&gt; &lt;: <strong>${((counts['>'] || 0) + (counts['<'] || 0)).toLocaleString()}</strong></div>
      <div class="op-chip">+ -: <strong>${((counts['+'] || 0) + (counts['-'] || 0)).toLocaleString()}</strong></div>
      <div class="op-chip">[ ]: <strong>${((counts['['] || 0) + (counts[']'] || 0)).toLocaleString()}</strong></div>
      <div class="op-chip">. ,: <strong>${((counts['.'] || 0) + (counts[','] || 0)).toLocaleString()}</strong></div>
    `;
  },

  /**
   * Toggles line wrapping in code inspector.
   */
  toggleWrap() {
    this._bfState.isWrapped = !this._bfState.isWrapped;
    const box = document.getElementById('bfCodeDisplay');
    const btn = document.getElementById('wrapToggleBtn');
    if (!box) return;

    if (this._bfState.isWrapped) {
      box.classList.remove('nowrap');
      if (btn) btn.innerText = 'Unwrap Lines';
    } else {
      box.classList.add('nowrap');
      if (btn) btn.innerText = 'Wrap Lines';
    }
  },

  /**
   * Copies current Brainfuck code to clipboard.
   */
  copyBfCode() {
    const box = document.getElementById('bfCodeDisplay');
    if (!box) return;
    this.copyText(box.innerText, 'Brainfuck code copied to clipboard!');
  },

  /**
   * Triggers download of the current .bf file.
   */
  downloadBfFile() {
    const view = this._bfState.activeView;
    if (!this._bfState.data || !this._bfState.data[view]) return;

    const info = this._bfState.data[view];
    const blob = new Blob([info.code || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = info.name || `${view}.bf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Downloading ${a.download}`);
  },

  /**
   * Displays an on-demand modal showing Brainfuck code.
   */
  showBfModal(title, code, description = '') {
    let modal = document.getElementById('bffDynamicModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'bffDynamicModal';
      modal.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <div class="close-box" onclick="BffUI.closeModal('bffDynamicModal')" style="cursor:pointer;"></div>
            <div class="modal-title" id="bffDynamicTitle">Brainfuck Program</div>
          </div>
          <div class="modal-body">
            <div id="bffDynamicDesc" style="font-size:11px; color:var(--text-muted); font-weight:bold;"></div>
            <div class="modal-actions">
              <span id="bffDynamicLength" style="font-family:var(--font-mono); font-size:11px;"></span>
              <div class="modal-actions-left">
                <button class="preset-btn" onclick="BffUI.copyText(document.getElementById('bffDynamicCode').innerText, 'Code copied!')">Copy Code</button>
                <button class="preset-btn" onclick="BffUI.closeModal('bffDynamicModal')">OK</button>
              </div>
            </div>
            <pre class="bf-code-box" id="bffDynamicCode"></pre>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('bffDynamicTitle').innerText = title || 'Brainfuck Inspector';
    document.getElementById('bffDynamicDesc').innerText = description || '';
    document.getElementById('bffDynamicCode').innerText = code || '';
    document.getElementById('bffDynamicLength').innerText = `${(code || '').length.toLocaleString()} instructions`;

    this.openModal('bffDynamicModal');
  },

  copyToClipboard(text, label = 'Text') {
    this.copyText(text, `${label} copied to clipboard!`);
  },

  /**
   * Copies text to clipboard with modern navigator.clipboard or fallback.
   * @param {string} text - String to copy
   * @param {string} [toastMsg='Copied to clipboard!']
   */
  copyText(text, toastMsg = 'Copied to clipboard!') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(toastMsg);
      }).catch(() => {
        this._fallbackCopy(text, toastMsg);
      });
    } else {
      this._fallbackCopy(text, toastMsg);
    }
  },

  _fallbackCopy(text, toastMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast(toastMsg);
    } catch (e) {
      alert(toastMsg);
    }
    document.body.removeChild(ta);
  },

  /**
   * Displays a temporary floating toast notification.
   * @param {string} message - Message text
   * @param {number} [duration=2500] - Duration in ms
   */
  showToast(message, duration = 2500) {
    const existing = document.querySelector('.bff-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'bff-toast';
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Sets up global event listeners (Escape key, backdrop click).
   */
  setupGlobalEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach((modal) => {
          this.closeModal(modal.id);
        });
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('modal-backdrop')) {
        this.closeModal(e.target.id);
      }
    });
  }
};

// Auto-initialize global listeners & theme switcher on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    BffUI.initThemeSwitcher();
    BffUI.setupGlobalEvents();
    BffUI.detectApi();
  });
}

// Export for module systems or window global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BffUI;
} else if (typeof window !== 'undefined') {
  window.BffUI = BffUI;
}
