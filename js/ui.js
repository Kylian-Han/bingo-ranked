// Shared UI helpers. All DOM construction goes through these to keep XSS off
// the table — we never use innerHTML on user-controlled values.

(function () {
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') throw new Error('html attr forbidden — use children');
      else if (k.startsWith('on') && typeof v === 'function')
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'href' || k === 'src') node.setAttribute(k, String(v));
      else node.setAttribute(k, String(v));
    }
    const arr = Array.isArray(children) ? children : [children];
    for (const c of arr) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function showAlert(targetSelector, message, type = 'error') {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    clear(target);
    target.appendChild(el('div', { class: `alert ${type}`, text: message }));
  }

  function hideAlert(targetSelector) {
    const target = document.querySelector(targetSelector);
    if (target) clear(target);
  }

  function teamBadge(team) {
    if (!team) return el('span', { class: 'badge', text: '—' });
    return el('span', { class: `team-badge team-${team}`, text: team });
  }

  function formatDuration(seconds) {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  function formatRelative(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return date.toLocaleDateString();
  }

  function playerLink(p) {
    const name = p.site_username || p.mc_username || p.username || '?';
    const linked = !!p.site_username;
    const link = el('a', {
      class: 'player-link',
      href: `player.html?id=${encodeURIComponent(name)}`,
      text: name,
    });
    if (linked) link.appendChild(el('span', { class: 'linked-tag', text: 'linked' }));
    return link;
  }

  // Friendly names for known mode keys; falls through to the raw key otherwise.
  const MODE_LABELS = {
    normal: 'Normal',
    nether: 'Nether',
    speed: 'Speed',
    lockout: 'Lockout',
    manhunt: 'Manhunt',
    standard: 'Standard',
  };
  function modeLabel(mode) {
    if (!mode) return '—';
    return MODE_LABELS[mode] ?? mode;
  }

  function navHighlight(activePath) {
    document.querySelectorAll('.nav-links a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === activePath) a.classList.add('active');
    });
  }

  function renderHeader(activePath) {
    const isLogged = window.api.isLoggedIn();
    const user = window.api.user();
    const right = el('nav', { class: 'nav-links' }, [
      el('a', { href: 'index.html', text: 'Leaderboard' }),
      isLogged
        ? el('a', { href: 'dashboard.html', text: 'Dashboard' })
        : null,
      isLogged
        ? el('a', {
            href: '#',
            text: `Logout (${user?.username ?? ''})`,
            onClick: async (e) => {
              e.preventDefault();
              await window.api.logout();
              location.href = 'index.html';
            },
          })
        : el('a', { href: 'login.html', text: 'Login' }),
      !isLogged ? el('a', { href: 'register.html', text: 'Sign up' }) : null,
    ]);
    const brand = el('a', { class: 'nav-brand', href: 'index.html', text: 'Bingo Ranked' });
    const nav = el('div', { class: 'container nav' }, [brand, right]);
    const header = document.querySelector('header.site-header');
    if (header) {
      clear(header);
      header.appendChild(nav);
    }
    navHighlight(activePath);
  }

  function requireLogin() {
    if (!window.api.isLoggedIn()) {
      const next = encodeURIComponent(location.pathname.split('/').pop() || '');
      location.href = `login.html?next=${next}`;
      return false;
    }
    return true;
  }

  window.ui = {
    el,
    clear,
    showAlert,
    hideAlert,
    teamBadge,
    formatDuration,
    formatRelative,
    playerLink,
    modeLabel,
    renderHeader,
    requireLogin,
  };
})();
