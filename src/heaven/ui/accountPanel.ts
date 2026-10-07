// The account card over the title screen: sign in or make an account, see
// that the wanderer is kept safe in the cloud, sign out, and, when an account
// and this device each keep a wanderer of their own, pick which one to keep.
// Phaser has no text fields, so it's a small HTML card over the canvas (as
// Myths' account form is), dressed in Heaven Lands' parchment, rose and gold;
// phones get their own keyboard and password managers something to fill.

import { CloudError, MIN_PASSWORD, account } from '../../game/cloud';
import { keepCloud, keepDevice, loadNewer, signIn, signOut, sync, type Choice } from '../sync';

const CSS = `
#hl-account { position: fixed; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; padding: 12px; background: radial-gradient(circle at 50% 40%, rgba(255, 236, 214, 0.25), rgba(58, 34, 54, 0.5)); animation: hl-fade 0.18s ease-out; }
#hl-account .card { position: relative; width: min(300px, 100%); max-height: calc(100% - 8px); overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding: 16px 16px 14px; color: #6b4560; background: linear-gradient(#fffaf0 0%, #fbf0dc 55%, #f7e8cd 100%); box-shadow: inset 2px 2px 0 #fff8ea, inset -2px -2px 0 #e2c48a, 0 0 0 2px #e6b95c, 0 0 0 4px #8a5a5e, 0 6px 22px rgba(58, 34, 54, 0.35); animation: hl-rise 0.22s ease-out; }
#hl-account .card::before, #hl-account .card::after { content: ''; position: absolute; top: 6px; width: 4px; height: 4px; background: #e6b95c; box-shadow: inset 1px 1px 0 #fff0b4, inset -1px -1px 0 #bf8c3c; }
#hl-account .card::before { left: 6px; }
#hl-account .card::after { right: 6px; }
#hl-account .crest { align-self: center; width: 60px; height: 30px; margin-bottom: -2px; image-rendering: pixelated; }
#hl-account h2 { margin: 0; font-size: 14px; letter-spacing: 2px; text-align: center; color: #7a4260; text-transform: uppercase; }
#hl-account p { margin: 0; font-size: 12px; line-height: 1.45; text-align: center; color: #8a6278; }
#hl-account p b { color: #7a4260; }
#hl-account .tabs { display: flex; padding: 2px; gap: 2px; background: #e6dbf5; box-shadow: 0 0 0 2px #cdbbe8; }
#hl-account .tabs button { flex: 1; box-shadow: none; background: transparent; color: #8a74ac; }
#hl-account .tabs button.on { background: linear-gradient(#ffffff, #f2ecfb); color: #7a4260; box-shadow: inset 0 -2px 0 #d9c9ef; }
#hl-account button { padding: 7px 10px; border: 0; border-radius: 0; cursor: pointer; font: inherit; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #7d6496; background: linear-gradient(#faf6fe, #e6dbf5); box-shadow: inset 2px 2px 0 #ffffff, inset -2px -2px 0 #c7b4e4, 0 0 0 2px #9c84c2; }
#hl-account button.go { color: #fffaf0; font-weight: bold; text-shadow: 0 1px 0 #a8486c, 1px 0 0 #c4607e; background: linear-gradient(#ffb7c6, #ec809a); box-shadow: inset 2px 2px 0 #fff0b4, inset -2px -2px 0 #bf8c3c, 0 0 0 2px #8a3f5c; }
#hl-account button:active { transform: translateY(1px); filter: brightness(0.95); }
#hl-account button:disabled { opacity: 0.6; cursor: default; transform: none; }
#hl-account label { display: flex; flex-direction: column; gap: 4px; font-size: 10px; letter-spacing: 1px; color: #a5809a; text-transform: uppercase; }
#hl-account input { font: 16px/1.3 ui-monospace, Menlo, monospace; padding: 6px 8px; border: 0; border-radius: 0; outline: none; color: #6b4560; background: linear-gradient(#efdfc0, #f7ebd4); box-shadow: inset 2px 2px 0 #d7bf90, 0 0 0 2px #e0c99c; -webkit-user-select: text; user-select: text; }
#hl-account input:focus { box-shadow: inset 2px 2px 0 #d7bf90, 0 0 0 2px #ef8fa8; }
#hl-account .note { font-size: 11px; line-height: 1.4; text-align: center; color: #a5809a; }
#hl-account .err { min-height: 15px; font-size: 12px; text-align: center; color: #c4506e; }
#hl-account .row { display: flex; gap: 8px; }
#hl-account .row button { flex: 1; }
#hl-account .status { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 7px; font-size: 11px; color: #8a6278; background: rgba(255, 255, 255, 0.55); box-shadow: 0 0 0 2px #eddcbc; }
#hl-account .dot { width: 6px; height: 6px; flex: none; background: #8fd0a0; box-shadow: 0 0 0 1px #5e9c70, 0 0 6px #b8f0c4; }
#hl-account .dot.wait { background: #f4c55a; box-shadow: 0 0 0 1px #c9903c, 0 0 6px #ffe6a0; animation: hl-pulse 1s ease-in-out infinite; }
#hl-account .dot.bad { background: #ef8fa8; box-shadow: 0 0 0 1px #b8587a; }
#hl-account .pick { display: flex; flex-direction: column; align-items: stretch; gap: 3px; padding: 9px 10px; text-align: left; text-transform: none; letter-spacing: 0; }
#hl-account .pick b { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
#hl-account .pick span { font-size: 11px; opacity: 0.85; }
@media (max-height: 470px) { #hl-account .card { gap: 6px; padding: 10px 14px; } #hl-account .crest, #hl-account p.intro { display: none; } }
@keyframes hl-fade { from { opacity: 0; } }
@keyframes hl-rise { from { transform: translateY(6px); opacity: 0; } }
@keyframes hl-pulse { 50% { opacity: 0.45; } }
`;

/** A little cloud with a gold star, drawn once as a data URL for the card's crest. */
const CREST = [
  '.......ww.....................',
  '......wYw.....................',
  '.....wYYYw........wwwwww......',
  '......wYw......wwwCCCCCCwww...',
  '.......w......wCCCCCCCCCCCCw..',
  '.........wwwwwCCCCCCCCCCCCCCw.',
  '.......wwCCCCCCCCCCCCCCCCCCCw.',
  '......wCCCCCCCCCCCCCCCCCCCCCCw',
  '.....wCCCCCCCCCCCCCCCCCCCCCCCw',
  '....wCCCCCCCCCCCCCCCCCCCCCCCLw',
  '...wCCCCCCCCCCCCCCCCCCCCCCLLw.',
  '..wLCCCCCCCCCCCCCCCCCCCCLLLw..',
  '..wLLLCCCCCCCCCCCCCCCLLLLLw...',
  '...wLLLLLLLLLLLLLLLLLLLLww....',
  '....wwwwwwwwwwwwwwwwwwww......',
];
const CREST_PAL: Record<string, string> = { w: '#9c84c2', C: '#fffcf6', L: '#e6dbf5', Y: '#f4c55a' };

function crestUrl(): string {
  const c = document.createElement('canvas');
  c.width = CREST[0].length;
  c.height = CREST.length;
  const g = c.getContext('2d')!;
  CREST.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = CREST_PAL[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  });
  return c.toDataURL();
}

/** "just now", "5 minutes ago", "on 3 Oct": when a save was made, said softly. */
function when(t: number): string {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `on ${new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Show the card; `onClose` once it's gone. */
export function openAccountPanel(onClose: () => void = () => {}): void {
  if (document.getElementById('hl-account')) return;
  if (!document.getElementById('hl-account-css')) {
    const style = document.createElement('style');
    style.id = 'hl-account-css';
    style.textContent = CSS;
    document.head.append(style);
  }
  const root = document.createElement('div');
  root.id = 'hl-account';
  root.className = 'chrome';
  const card = document.createElement('div');
  card.className = 'card';
  root.append(card);
  document.body.append(root);
  const crest = crestUrl();
  let busy = false;
  let unwatch = () => {};

  // Typing mustn't reach the game's own keys (Enter goes home from the title).
  for (const t of ['keydown', 'keyup', 'keypress']) root.addEventListener(t, (e) => e.stopPropagation());
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') leave();
  });
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) leave();
  });

  const close = () => {
    unwatch();
    root.remove();
    onClose();
  };
  /** Backing out: from the choice, that means not signing in after all (nothing is written either way). */
  const leave = () => {
    if (busy) return;
    if (sync.status === 'choose') void signOut().then(close);
    else close();
  };
  /** The crest, title and a line; `intro` lines give way on short screens (a phone on its side). */
  const head = (title: string, text: string, intro = false) => `<img class="crest" src="${crest}" alt=""><h2>${title}</h2><p${intro ? ' class="intro"' : ''}>${text}</p>`;

  const showForm = (create = false) => {
    unwatch();
    card.innerHTML = `
      ${head('Your account', 'Keep your wanderer, your Home and all you’ve gathered safe in the clouds, and find them on any device.', true)}
      <form novalidate autocomplete="on" style="display: contents">
        <div class="tabs"><button type="button" data-mode="in">Sign in</button><button type="button" data-mode="new">New account</button></div>
        <label>Username<input name="username" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="16" required></label>
        <label>Password<input name="password" type="password" maxlength="64" required></label>
        <div class="note" hidden>3 to 16 letters, numbers or _, and a password of at least ${MIN_PASSWORD}. There’s no email, so keep your password somewhere safe.</div>
        <div class="err"></div>
        <div class="row"><button type="button" data-close>Back</button><button type="submit" class="go"></button></div>
      </form>`;
    const form = card.querySelector('form')!;
    const [name, pass] = [...form.querySelectorAll('input')] as HTMLInputElement[];
    const err = form.querySelector('.err') as HTMLElement;
    const note = form.querySelector('.note') as HTMLElement;
    const go = form.querySelector('.go') as HTMLButtonElement;
    const tabs = [...form.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    const label = () => (create ? 'Make account' : 'Sign in');
    const setMode = (c: boolean) => {
      create = c;
      tabs.forEach((t) => t.classList.toggle('on', (t.dataset.mode === 'new') === c));
      go.textContent = label();
      pass.autocomplete = c ? 'new-password' : 'current-password';
      note.hidden = !c;
      err.textContent = '';
    };
    setMode(create);
    tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode === 'new')));
    form.querySelector('[data-close]')!.addEventListener('click', leave);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      go.disabled = true;
      err.textContent = '';
      go.textContent = '…';
      try {
        const choice = await signIn(name.value.trim(), pass.value, create);
        busy = false;
        if (choice) showChoice(choice);
        else showSignedIn();
      } catch (ex) {
        err.textContent = ex instanceof CloudError ? ex.message : 'Something went wrong. Try again.';
        busy = false;
        go.disabled = false;
        go.textContent = label();
      }
    });
    name.focus();
  };

  const showSignedIn = () => {
    unwatch();
    const a = account();
    if (!a) return showForm();
    card.innerHTML = `
      ${head('Your account', `Signed in as <b>${esc(a.username)}</b>. Everything you make is kept in the clouds as you play.`)}
      <div class="status"><span class="dot"></span><span class="say"></span></div>
      <button type="button" class="go" data-newer hidden>Load it now</button>
      <div class="err"></div>
      <div class="row"><button type="button" data-out>Sign out</button><button type="button" class="go" data-close>Done</button></div>`;
    const dot = card.querySelector('.dot') as HTMLElement;
    const say = card.querySelector('.say') as HTMLElement;
    const newer = card.querySelector('[data-newer]') as HTMLButtonElement;
    const err = card.querySelector('.err') as HTMLElement;
    const paint = () => {
      const s = sync.status;
      dot.className = `dot${s === 'saving' || s === 'loading' ? ' wait' : s === 'error' || s === 'newer' ? ' bad' : ''}`;
      say.textContent =
        s === 'saving' || s === 'loading'
          ? 'Saving to the clouds…'
          : s === 'error'
            ? 'Can’t reach the clouds. Your save is safe here, and goes up once they’re back.'
            : s === 'newer'
              ? 'A newer save from another device is waiting.'
              : sync.savedAt
                ? `Safe in the clouds, saved ${when(sync.savedAt)}.`
                : 'Safe in the clouds.';
      newer.hidden = s !== 'newer';
    };
    paint();
    unwatch = sync.watch(paint);
    const timer = setInterval(paint, 20_000);
    const stop = unwatch;
    unwatch = () => {
      stop();
      clearInterval(timer);
    };
    newer.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      newer.disabled = true;
      newer.textContent = 'Bringing it home…';
      loadNewer().catch(() => {
        busy = false;
        newer.disabled = false;
        newer.textContent = 'Load it now';
        err.textContent = 'Couldn’t reach the clouds. Try again.';
      });
    });
    card.querySelector('[data-out]')!.addEventListener('click', async (e) => {
      if (busy) return;
      busy = true;
      (e.currentTarget as HTMLButtonElement).textContent = '…';
      await signOut();
      busy = false;
      showForm();
    });
    card.querySelector('[data-close]')!.addEventListener('click', leave);
  };

  const showChoice = (c: Choice) => {
    unwatch();
    card.innerHTML = `
      ${head('Two wanderers', 'This account already keeps a wanderer, and this device has its own. Which one would you like to keep? The other is let go.')}
      <button type="button" class="pick go" data-cloud><b>${esc(c.cloudName)}</b><span>From your account, saved ${when(c.cloudT)}</span></button>
      <button type="button" class="pick" data-device><b>${esc(c.localName)}</b><span>On this device, sent up to your account</span></button>
      <div class="err"></div>
      <button type="button" data-close>Don’t sign in</button>`;
    const err = card.querySelector('.err') as HTMLElement;
    const picks = [...card.querySelectorAll<HTMLButtonElement>('.pick')];
    card.querySelector('[data-cloud]')!.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      picks.forEach((b) => (b.disabled = true));
      err.textContent = '';
      (picks[0].querySelector('span') as HTMLElement).textContent = 'Bringing them home…';
      keepCloud().catch((ex) => {
        busy = false;
        picks.forEach((b) => (b.disabled = false));
        err.textContent = ex instanceof CloudError ? ex.message : 'Something went wrong. Try again.';
      });
    });
    card.querySelector('[data-device]')!.addEventListener('click', () => {
      if (busy) return;
      keepDevice();
      showSignedIn();
    });
    card.querySelector('[data-close]')!.addEventListener('click', leave);
  };

  const choice = sync.status === 'choose' ? sync.choice : null;
  if (choice) showChoice(choice);
  else if (account()) showSignedIn();
  else showForm();
}
