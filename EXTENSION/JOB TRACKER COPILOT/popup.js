/* Popup: sign in / out with the Job Tracker account, and today's AI-write count. */
const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

$('settings').href = self.JTC_CONFIG.JOB_TRACKER_URL;

async function show() {
  const { jtc_token, jtc_user } = await chrome.storage.local.get(['jtc_token', 'jtc_user']);
  $('signedOut').hidden = Boolean(jtc_token);
  $('signedIn').hidden = !jtc_token;
  if (!jtc_token) return;

  $('user').textContent = jtc_user;
  $('usage').textContent = 'Checking today’s count…';
  const r = await send({ type: 'status' });
  if (r.ok) {
    $('usage').textContent = `${r.used_today} of ${r.daily_cap} AI writes used today`;
  } else if (r.code === 'signed_out') {
    $('error').textContent = 'Your session ended. Please sign in again.';
    show();
  } else {
    $('usage').textContent = 'Couldn’t load today’s count.';
  }
}

$('signedOut').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formEl = e.currentTarget;   // e.currentTarget is null after the await below
  const form = new FormData(formEl);
  $('signInBtn').disabled = true;
  $('error').textContent = '';
  const r = await send({ type: 'signIn', username: String(form.get('username')).trim(), password: String(form.get('password')) });
  $('signInBtn').disabled = false;
  if (r.ok) { formEl.reset(); show(); } else { $('error').textContent = r.error; }
});

$('signOutBtn').addEventListener('click', async () => {
  await send({ type: 'signOut' });
  show();
});

show();
