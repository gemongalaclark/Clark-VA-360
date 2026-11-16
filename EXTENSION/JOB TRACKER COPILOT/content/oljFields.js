/* Clark VA 360 Copilot — finds things on OnlineJobs.ph (OLJ) pages: which page this is, the job id,
   the job post's text, and the apply form's boxes. No chrome.* here, so test/harness.html can load it.
   Based on OLJ pages saved 2026-11-16:
     job post  /jobseekers/job/<Title-Slug>-<id>: h1.job__title[data-jobid], p#job-description,
               info card (h3 "TYPE OF WORK" / "WAGE / SALARY" / "HOURS PER WEEK" + <p>)
     apply     /apply (POSTed from the job page): form#appy-form, unlinked <label for="">s,
               SUBJECT → input[name="info[subject]"], Message → textarea[name="info[message]"],
               Contact Info → textarea#contact-info-content, Apply points → input[name=points],
               hidden input#job_id, button "SEND EMAIL". */
(function (root) {
  const JTC = (root.JTC = root.JTC || {});

  const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const blockText = (el) => String(el ? el.innerText || el.textContent || '' : '').replace(/[ \t]+\n/g, '\n').trim();

  function pageKind(loc) {
    const path = loc.pathname.replace(/\/+$/, '');
    if (/^\/jobseekers\/job\/[^/]+$/i.test(path)) return 'job';
    if (/^\/apply$/i.test(path)) return 'apply';
    return null;
  }

  /* The same id on the job post and on its apply page (where the URL has none). */
  function jobIdFrom(rootEl, loc) {
    const fromField = rootEl.querySelector('input#job_id, input[name="job_id"]')?.value;
    const fromData = rootEl.querySelector('[data-jobid]')?.getAttribute('data-jobid');
    const fromUrl = loc.pathname.match(/(\d+)\/?$/)?.[1];
    return squash(fromField || fromData || fromUrl) || null;
  }

  function infoValue(rootEl, heading) {
    const h = [...rootEl.querySelectorAll('h3')].find((el) => squash(el.textContent).toUpperCase() === heading);
    return h ? squash(h.nextElementSibling?.textContent) : '';
  }

  /* { id, title, url, text } — text is the description plus type of work, wage and hours (so the AI can
     compare the pay with the user's rate). null when this doesn't look like a job post. */
  function captureJobPost(rootEl, loc) {
    const id = jobIdFrom(rootEl, loc);
    const description = blockText(rootEl.querySelector('#job-description, .job-description'));
    if (!id || !description) return null;
    const facts = [['TYPE OF WORK', 'Type of work'], ['WAGE / SALARY', 'Wage / salary'], ['HOURS PER WEEK', 'Hours per week']]
      .map(([heading, name]) => [name, infoValue(rootEl, heading)])
      .filter(([, value]) => value)
      .map(([name, value]) => `${name}: ${value}`);
    return {
      id,
      title: squash(rootEl.querySelector('h1.job__title, h1[data-jobid]')?.textContent).slice(0, 120),
      url: loc.href,
      text: facts.length ? `${description}\n\n${facts.join('\n')}` : description,
    };
  }

  /* Boxes the Copilot must never touch (Review Focus 5). */
  const forbidden = (el) => !el || el.id === 'contact-info-content' || el.name === 'points';

  /* The box under a label whose visible text is exactly `word` (ignoring case and "*").
     OLJ's labels are not linked to their boxes (for=""), so look inside the label's form group. */
  function underLabel(rootEl, word, tag) {
    for (const label of rootEl.querySelectorAll('label')) {
      if (squash(label.textContent).replace(/\*/g, '').trim().toLowerCase() !== word) continue;
      const box = label.control || label.parentElement?.querySelector(tag);
      if (box && box.tagName === tag.toUpperCase() && !forbidden(box)) return box;
    }
    return null;
  }

  function findApplyForm(rootEl) {
    const subject = underLabel(rootEl, 'subject', 'input') || rootEl.querySelector('input[name="info[subject]"]');
    const message = underLabel(rootEl, 'message', 'textarea') || rootEl.querySelector('textarea[name="info[message]"]');
    const send = [...rootEl.querySelectorAll('button[type="submit"], input[type="submit"]')]
      .find((b) => /send email/i.test(b.textContent || b.value)) || null;
    return { subject: forbidden(subject) ? null : subject, message: forbidden(message) ? null : message, send };
  }

  /* OLJ's page after a successful send says "Awesome, you have successfully sent the email for your
     job application!" (seen 2026-11-16). Only then is an application logged. Visible text only
     (innerText): the same words inside a <script> must not count. */
  const sentConfirmation = (rootEl) => /successfully sent the email/i.test((rootEl.body || rootEl).innerText || '');

  /* Sets a box's value the way typing would, so the page's own scripts see the change. */
  function fillField(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  JTC.olj = { pageKind, jobIdFrom, captureJobPost, findApplyForm, sentConfirmation, fillField };
})(typeof globalThis !== 'undefined' ? globalThis : window);
