/*
  Progressive enhancement only: every page reads correctly, and every link works,
  with this file absent. What it adds is the theme switch, ⌘ instead of Ctrl on a
  Mac, the guide's contents highlight and generator filter, and direct download
  links for the visitor's system.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var REPO = 'lucasdias1707/carom-client-api';

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      /* Private windows and blocked storage: the page just does not remember. */
    }
    return null;
  }

  var isMac = /mac|iphone|ipad/i.test(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent,
  );
  var isWindows = /win/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');

  /* ── theme ── */
  function effectiveTheme() {
    return (
      root.dataset.theme ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    );
  }
  var themeButton = document.querySelector('[data-theme-toggle]');
  if (themeButton) {
    themeButton.addEventListener('click', function () {
      var next = effectiveTheme() === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      store('carom-site-theme', next);
    });
  }

  /* ── ⌘ or Ctrl ── */
  var os = store('carom-site-os') || (isMac ? 'mac' : 'other');
  function applyOs() {
    document.querySelectorAll('kbd[data-mod]').forEach(function (key) {
      key.textContent = os === 'mac' ? '⌘' : 'Ctrl';
    });
    document.querySelectorAll('[data-os]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.os === os));
    });
  }
  document.querySelectorAll('.os-switch').forEach(function (group) {
    group.classList.add('ready');
    group.addEventListener('click', function (event) {
      var button = event.target.closest('[data-os]');
      if (!button) return;
      os = button.dataset.os;
      store('carom-site-os', os);
      applyOs();
    });
  });
  applyOs();

  /* ── language menu closes when you click away ── */
  var lang = document.querySelector('.lang');
  if (lang) {
    document.addEventListener('click', function (event) {
      if (!lang.contains(event.target)) lang.removeAttribute('open');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') lang.removeAttribute('open');
    });
  }

  /* ── guide: contents highlight, collapsed on small screens ── */
  var toc = document.querySelector('.toc-fold');
  if (toc && window.matchMedia && matchMedia('(max-width: 900px)').matches) toc.removeAttribute('open');

  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute('href').slice(1)] = link;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.remove('on');
          });
          var link = byId[entry.target.id];
          if (link) link.classList.add('on');
        });
      },
      { rootMargin: '-84px 0px -70% 0px' },
    );
    document.querySelectorAll('.doc').forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ── guide: generators ── */
  var filter = document.querySelector('[data-gen-filter]');
  if (filter) {
    var tools = filter.closest('.gen-tools');
    tools.classList.add('ready');
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-gen-group]'));
    var counter = document.querySelector('[data-gen-count]');
    var none = document.querySelector('[data-gen-none]');
    var run = function () {
      var needle = filter.value.trim().toLowerCase().replace(/[{}$]/g, '');
      var shown = 0;
      groups.forEach(function (group) {
        var any = 0;
        group.querySelectorAll('li').forEach(function (item) {
          var match = !needle || item.textContent.toLowerCase().replace(/[{}$]/g, '').indexOf(needle) !== -1;
          item.hidden = !match;
          if (match) any++;
        });
        group.hidden = any === 0;
        shown += any;
      });
      if (none) none.hidden = shown !== 0;
      if (counter) counter.textContent = needle ? String(shown) : '';
    };
    filter.addEventListener('input', run);

    document.querySelectorAll('[data-gen]').forEach(function (code) {
      code.tabIndex = 0;
      code.setAttribute('role', 'button');
      var copy = function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(code.textContent).then(function () {
          code.classList.add('copied');
          setTimeout(function () {
            code.classList.remove('copied');
          }, 900);
        });
      };
      code.addEventListener('click', copy);
      code.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          copy();
        }
      });
    });
  }

  /* ── download: mark the visitor's system, and link straight to the files ── */
  var platforms = document.querySelectorAll('.platform');
  if (platforms.length) {
    var mine = isMac ? 'mac' : isWindows ? 'win' : /linux|x11|cros/i.test(navigator.platform || navigator.userAgent) ? 'linux' : '';
    platforms.forEach(function (card) {
      if (card.dataset.platform === mine) card.classList.add('mine');
    });

    if (window.fetch) {
      fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
        .then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then(function (release) {
          var assets = release.assets || [];
          document.querySelectorAll('[data-asset]').forEach(function (anchor) {
            var pattern = new RegExp(anchor.dataset.asset);
            var found = assets.filter(function (asset) {
              return pattern.test(asset.name);
            })[0];
            if (found) anchor.href = found.browser_download_url;
          });
          var version = document.querySelector('[data-version]');
          if (version && release.tag_name) {
            version.textContent = 'Carom ' + String(release.tag_name).replace(/^[^0-9]*/, '');
            version.hidden = false;
          }
        })
        .catch(function () {
          /* Rate-limited or offline: the buttons keep pointing at the releases page. */
        });
    }
  }
})();
