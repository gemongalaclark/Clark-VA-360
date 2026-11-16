/* Clark VA 360 Copilot — runs on every OnlineJobs.ph page.
   Job post  → remembers the post's text for this browser session (background: saveJob).
   Apply page → panel: "Write my application" fills Subject + Message only. It never touches
                Contact Info or Apply Points and never sends; the user clicks SEND EMAIL.
   Sending reloads the page (a normal form POST). The Send click only remembers the job (this tab's
   sessionStorage); the next page logs it if, and only if, OLJ says it was sent ("successfully sent
   the email"), then shows "Logged to Job Tracker." with Undo. */
(function () {
  const { olj, panel } = JTC;
  const PENDING = 'jtc_pending_send';
  const PENDING_MAX_AGE = 2 * 60 * 1000;

  /* Never throws: after the extension is reloaded, sendMessage throws right away in tabs opened
     before ("Extension context invalidated"), and that must not block sending the application. */
  async function send(msg) {
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (err) {
      return { ok: false, code: 'error', error: String(err?.message || err) };
    }
  }
  const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve({ ok: false, code: 'error', error: 'timeout' }), ms))]);

  let ui = null;
  let form = null;
  let current = null;       // { job, result } after a write on this page
  let selection = '';       // last highlighted text (a click on the panel can clear the live selection)
  let sending = false;      // set on the Send click that submits; blocks double clicks

  const getUi = (handlers = {}) =>
    (ui = ui || panel.mount({ jobTrackerUrl: self.JTC_CONFIG?.JOB_TRACKER_URL, ...handlers }));

  async function write() {
    ui.set('working');
    const id = olj.jobIdFrom(document, location);
    const got = id ? await send({ type: 'getJob', id }) : null;
    const captured = got?.ok ? got.job : null;
    const text = JTC.pickJobText(captured, selection);
    if (!text) return ui.set('needText');

    const job = {
      title: captured?.title || '',
      url: captured?.url || `https://www.onlinejobs.ph/jobseekers/job/${id}`,
      site: 'onlinejobs.ph',
      text,
    };
    const r = await send({ type: 'write', job });
    if (!r.ok) return ui.set('error', r);

    current = { job, result: r.result };
    if (form.subject && form.message) {
      olj.fillField(form.subject, r.result.subject);
      olj.fillField(form.message, r.result.message);
      ui.set('filled', { result: r.result });
    } else {
      ui.set('copy', { result: r.result });
    }
  }

  function onSend(e) {
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (sending) return stop();   // this application is already on its way
    const message = form.message?.value ?? '';
    if (JTC.hasPlaceholder(message) && !window.confirm("There's still a [placeholder] in your message. Send anyway?")) {
      return stop();
    }
    if (!form.send.form?.checkValidity()) return;   // OLJ asks for the missing box; nothing is sent yet
    sending = true;                                  // this click sends; later clicks are blocked
    if (current && ui.logOn) {
      const pending = { title: current.job.title || current.result.job_title, url: current.job.url, source: 'onlinejobsph', at: Date.now() };
      try { sessionStorage.setItem(PENDING, JSON.stringify(pending)); } catch { /* storage blocked: not logged */ }
      ui.set('sending');
    }
  }

  function setUpApply() {
    form = olj.findApplyForm(document);
    getUi({ onWrite: write }).set('idle');
    document.addEventListener('selectionchange', () => {
      const s = String(window.getSelection() || '').trim();
      if (s) selection = s;
    });
    form.send?.addEventListener('click', onSend, true);
  }

  /* On the page after Send: log the remembered job only if OLJ confirms it was sent. */
  async function finishPending() {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING) || 'null');
      sessionStorage.removeItem(PENDING);
    } catch { return; }
    if (!pending || Date.now() - pending.at > PENDING_MAX_AGE) return;

    const u = getUi();
    if (!olj.sentConfirmation(document)) {
      return u.set('toast', { text: 'OnlineJobs.ph didn’t confirm this application, so it wasn’t logged.' });
    }
    u.set('logging');
    const r = await withTimeout(send({ type: 'log', title: pending.title, url: pending.url, source: pending.source }), 8000);
    if (!r.ok) return u.set('toast', { text: 'Couldn’t log this one. Add it in the Job Tracker.' });
    if (r.duplicate) return u.set('toast', { text: 'Already in your Job Tracker.' });
    u.set('toast', {
      text: 'Logged to Job Tracker.',
      undo: async () => {
        const undone = await send({ type: 'unlog', id: r.id });
        u.set('toast', { text: undone.ok ? 'Removed from your Job Tracker.' : 'Couldn’t undo. Remove it in the Job Tracker.' });
      },
    });
  }

  const kind = olj.pageKind(location);
  if (kind === 'job') {
    const job = olj.captureJobPost(document, location);
    if (job) send({ type: 'saveJob', job });
  } else if (kind === 'apply' && document.querySelector('#job_id, form#appy-form')) {
    setUpApply();
  }
  finishPending();
})();
