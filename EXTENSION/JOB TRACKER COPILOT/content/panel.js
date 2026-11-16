/* Clark VA 360 Copilot — the panel on OnlineJobs.ph pages. Inside a Shadow DOM so OLJ's CSS can't
   reach it; every piece of text goes in as text (never HTML).
   JTC.panel.mount({ onWrite, onLogToggle, jobTrackerUrl }) → { set(state, data), logOn } */
(function (root) {
  const JTC = (root.JTC = root.JTC || {});
  let instance = null;

  function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else if (key === 'checked') node.checked = Boolean(value);
      else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value === true ? '' : value);
    }
    for (const kid of kids.flat()) {
      if (kid !== null && kid !== undefined && kid !== false) node.append(kid instanceof Node ? kid : String(kid));
    }
    return node;
  }

  const ERRORS = {
    signed_out: () => 'Sign in to the Copilot first (click the extension icon).',
    no_profile: () => 'Set up your Copilot profile in the Job Tracker first.',
    daily_cap: (e) => e.error,
    ai_busy: (e) => `AI limit reached. Try again in ${JTC.retryText(e.retryAfterSec)}.`,
  };

  const fitLabel = (score) => (score >= 75 ? ['Strong match', 'strong'] : score >= 50 ? ['Possible match', 'maybe'] : ['Weak match', 'weak']);

  function mount({ onWrite, onLogToggle, jobTrackerUrl } = {}) {
    if (instance) return instance;

    const host = el('div', { id: 'jtc-copilot-host' });
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.append(el('link', { rel: 'stylesheet', href: chrome.runtime.getURL('content/panel.css') }));

    const body = el('div', { class: 'body' });
    const toggle = el('button', { class: 'collapse', type: 'button', 'aria-label': 'Hide the Copilot' }, '–');
    const setCollapsed = (collapsed) => {
      body.hidden = collapsed;
      toggle.textContent = collapsed ? '+' : '–';
      toggle.setAttribute('aria-label', collapsed ? 'Show the Copilot' : 'Hide the Copilot');
    };
    toggle.addEventListener('click', () => setCollapsed(!body.hidden));

    shadow.append(el('section', { class: 'panel', 'aria-label': 'Clark VA 360 Copilot' },
      el('header', {}, el('strong', {}, 'Clark VA 360 Copilot'), toggle),
      body));
    document.documentElement.append(host);

    let logOn = true;
    const writeButton = (label = 'Write my application') =>
      el('button', { class: 'primary', type: 'button', onclick: () => onWrite?.() }, label);

    const summary = (r) => {
      const [label, tone] = fitLabel(r.fit_score);
      return [
        el('p', { class: 'fit' }, el('b', {}, `Fit: ${r.fit_score}/100`), ' ', el('span', { class: `dot ${tone}` }, `● ${label}`)),
        r.fit_reason ? el('p', { class: 'muted small' }, r.fit_reason) : null,
        r.attention_check ? el('p', { class: 'warn' }, `⚠ Code word: ${r.attention_check}`) : null,
        ...(r.red_flags || []).map((flag) => el('p', { class: 'warn' }, `⚠ Red flag: ${flag}`)),
      ];
    };

    const copyBlock = (label, text) => {
      const button = el('button', { class: 'ghost small', type: 'button' }, 'Copy');
      button.addEventListener('click', () => navigator.clipboard.writeText(text).then(() => { button.textContent = 'Copied'; }));
      return el('div', { class: 'copy' }, el('div', { class: 'copyHead' }, el('b', {}, label), button), el('pre', {}, text));
    };

    const views = {
      idle: () => [el('p', { class: 'muted' }, 'Writes this application from your Copilot profile. You read it and click Send.'), writeButton()],
      working: () => [el('p', { class: 'muted' }, 'Writing…')],
      logging: () => [el('p', { class: 'muted' }, 'Logging to Job Tracker…')],
      sending: () => [el('p', { class: 'muted' }, 'Sending… It’s logged once OnlineJobs.ph confirms.')],
      needText: () => [el('p', {}, 'Open the job post first, or highlight the job description and click again.'), writeButton()],
      filled: ({ result }) => [
        ...summary(result),
        el('p', { class: 'ok' }, '✓ Subject and Message filled'),
        el('p', { class: 'muted' }, 'You choose points, you click Send'),
        el('label', { class: 'check' },
          el('input', { type: 'checkbox', checked: logOn, onchange: (e) => { logOn = e.target.checked; onLogToggle?.(logOn); } }),
          'Log to Job Tracker'),
        writeButton('Write again'),
      ],
      copy: ({ result }) => [
        ...summary(result),
        el('p', {}, 'Couldn’t find the Subject/Message boxes. Copy the text below instead.'),
        copyBlock('Subject', result.subject),
        copyBlock('Message', result.message),
      ],
      error: (e) => [
        el('p', { class: 'error' }, (ERRORS[e.code] || (() => 'Something went wrong. Try again.'))(e)),
        e.code === 'no_profile' && jobTrackerUrl ? el('a', { href: jobTrackerUrl, target: '_blank', rel: 'noopener' }, 'Open the Job Tracker') : null,
        writeButton('Try again'),
      ],
      toast: ({ text, undo }) => [el('p', {}, text), undo ? el('button', { class: 'ghost', type: 'button', onclick: undo }, 'Undo') : null],
    };

    instance = {
      set(state, data = {}) {
        body.replaceChildren(...views[state](data).filter(Boolean));
        setCollapsed(false);
      },
      get logOn() { return logOn; },
    };
    return instance;
  }

  JTC.panel = { mount };
})(typeof globalThis !== 'undefined' ? globalThis : window);
