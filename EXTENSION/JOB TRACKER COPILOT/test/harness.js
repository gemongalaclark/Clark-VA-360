/* Field-finder tests for content/oljFields.js, run in a real browser (see harness.html). */
(function () {
  const out = document.getElementById('result');
  const stage = document.getElementById('stage');
  let passed = 0;

  const mount = (id) => {
    stage.replaceChildren(document.getElementById(id).content.cloneNode(true));
    return stage;
  };
  const check = (name, cond) => {
    if (!cond) throw new Error(name);
    passed += 1;
  };

  const JOB_URL = new URL('https://www.onlinejobs.ph/jobseekers/job/Clip-Finder-Researcher-1767109');
  const APPLY_URL = new URL('https://www.onlinejobs.ph/apply');

  try {
    const O = window.JTC && window.JTC.olj;
    check('JTC.olj is loaded', Boolean(O));

    // Review Focus 5: find the right boxes, never Contact Info or Apply Points.
    let root = mount('apply');
    let f = O.findApplyForm(root);
    check('apply: subject is the SUBJECT input', f.subject && f.subject.tagName === 'INPUT' && f.subject.id === 'subject');
    check('apply: message is the Message textarea', f.message && f.message.tagName === 'TEXTAREA' && f.message.id === 'message');
    check('apply: send button found', f.send && /send email/i.test(f.send.textContent));
    check('apply: message is not Contact Info', f.message !== root.querySelector('#contact-info-content'));
    const points = root.querySelector('input[name="points"]');
    check('apply: no field is Apply Points', f.subject !== points && f.message !== points);

    root = mount('apply-nolabels');
    f = O.findApplyForm(root);
    check('changed markup: subject not found', f.subject === null);
    check('changed markup: message not found', f.message === null);

    root = mount('apply');
    f = O.findApplyForm(root);
    let inputs = 0;
    f.message.addEventListener('input', () => { inputs += 1; });
    O.fillField(f.message, 'Hello');
    check('fillField sets the value', f.message.value === 'Hello');
    check('fillField fires one input event', inputs === 1);

    check('jobIdFrom apply page', O.jobIdFrom(root, APPLY_URL) === '1767109');

    root = mount('job');
    const job = O.captureJobPost(root, JOB_URL);
    check('captureJobPost: title', job && job.title === 'Clip Finder/ Researcher');
    check('captureJobPost: id', job.id === '1767109');
    check('captureJobPost: url', job.url === JOB_URL.href);
    check('captureJobPost: description text', job.text.length >= 80 && job.text.includes('Clip Finder'));
    check('captureJobPost: wage included', /Wage \/ salary: 15\$\/ 10 clips/i.test(job.text));
    check('jobIdFrom job page', O.jobIdFrom(root, JOB_URL) === '1767109');

    check('sentConfirmation: success page', O.sentConfirmation(mount('sent')) === true);
    check('sentConfirmation: apply form is not a confirmation', O.sentConfirmation(mount('apply')) === false);

    check('pageKind job', O.pageKind(JOB_URL) === 'job');
    check('pageKind apply', O.pageKind(APPLY_URL) === 'apply');
    check('pageKind home', O.pageKind(new URL('https://www.onlinejobs.ph/')) === null);
    check('pageKind job search', O.pageKind(new URL('https://www.onlinejobs.ph/jobseekers/jobsearch')) === null);

    out.textContent = `ALL PASS (${passed})`;
  } catch (err) {
    out.textContent = `FAIL: ${err.message}`;
  }
})();
