// The Friends card: everything about playing together in one place. In a
// world it says whose world this is and who may build, invites friends into
// it there and then (a room opens where the wanderer stands, with a code to
// send), lets its owner allow friends to build, and takes a guest home. From
// the title screen and the Atlas it opens a room in a place. Everywhere it
// joins a friend by their code and lists the friends' worlds this player has
// been to, which can be opened any time, even while their owner is away (see
// net/worlds.ts and travel.ts). An HTML card like the account card
// (accountPanel.ts), in the same parchment and rose, so phones get their own
// keyboard for the code.

import type Phaser from 'phaser';
import { session } from '../../net/session';
import { myId, worlds, type WorldRef } from '../../net/worlds';
import type { WorldScene } from '../../scenes/WorldScene';
import { placeById } from '../places';
import { openWorld, playTogether } from '../travel';

/** How often the card looks again at the room (who's here, the code once it's open), ms. */
const REFRESH_MS = 600;
const MAX_PLAYERS = 4;

const CSS = `
#hl-friends { position: fixed; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; padding: 12px; background: radial-gradient(circle at 50% 40%, rgba(255, 236, 214, 0.25), rgba(58, 34, 54, 0.5)); animation: hlf-fade 0.18s ease-out; }
#hl-friends .card { position: relative; width: min(310px, 100%); max-height: calc(100% - 8px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 15px 16px 14px; color: #6b4560; background: linear-gradient(#fffaf0 0%, #fbf0dc 55%, #f7e8cd 100%); box-shadow: inset 2px 2px 0 #fff8ea, inset -2px -2px 0 #e2c48a, 0 0 0 2px #e6b95c, 0 0 0 4px #8a5a5e, 0 6px 22px rgba(58, 34, 54, 0.35); animation: hlf-rise 0.22s ease-out; }
#hl-friends .card::before, #hl-friends .card::after { content: ''; position: absolute; top: 6px; width: 4px; height: 4px; background: #e6b95c; box-shadow: inset 1px 1px 0 #fff0b4, inset -1px -1px 0 #bf8c3c; }
#hl-friends .card::before { left: 6px; }
#hl-friends .card::after { right: 6px; }
#hl-friends h2 { margin: 0; font-size: 14px; letter-spacing: 2px; text-align: center; color: #7a4260; text-transform: uppercase; }
#hl-friends h3 { margin: 4px 0 -2px; font-size: 10px; letter-spacing: 1px; color: #a5809a; text-transform: uppercase; font-weight: normal; }
#hl-friends p { margin: 0; font-size: 12px; line-height: 1.45; text-align: center; color: #8a6278; }
#hl-friends p b { color: #7a4260; }
#hl-friends .note { font-size: 11px; line-height: 1.4; color: #a5809a; }
#hl-friends button { padding: 7px 10px; border: 0; border-radius: 0; cursor: pointer; font: inherit; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #7d6496; background: linear-gradient(#faf6fe, #e6dbf5); box-shadow: inset 2px 2px 0 #ffffff, inset -2px -2px 0 #c7b4e4, 0 0 0 2px #9c84c2; }
#hl-friends button.go { color: #fffaf0; font-weight: bold; text-shadow: 0 1px 0 #a8486c, 1px 0 0 #c4607e; background: linear-gradient(#ffb7c6, #ec809a); box-shadow: inset 2px 2px 0 #fff0b4, inset -2px -2px 0 #bf8c3c, 0 0 0 2px #8a3f5c; }
#hl-friends button.soft { padding: 4px 8px; font-size: 10px; }
#hl-friends button:active { transform: translateY(1px); filter: brightness(0.95); }
#hl-friends button:disabled { opacity: 0.6; cursor: default; transform: none; }
#hl-friends input { flex: 1; min-width: 0; font: 17px/1.3 ui-monospace, Menlo, monospace; letter-spacing: 5px; text-transform: uppercase; padding: 5px 8px; border: 0; border-radius: 0; outline: none; color: #6b4560; background: linear-gradient(#efdfc0, #f7ebd4); box-shadow: inset 2px 2px 0 #d7bf90, 0 0 0 2px #e0c99c; -webkit-user-select: text; user-select: text; }
#hl-friends input::placeholder { color: #c9a98a; }
#hl-friends input:focus { box-shadow: inset 2px 2px 0 #d7bf90, 0 0 0 2px #ef8fa8; }
#hl-friends .row { display: flex; gap: 8px; align-items: center; }
#hl-friends .here { display: flex; flex-direction: column; gap: 7px; padding: 9px 10px; background: rgba(255, 255, 255, 0.55); box-shadow: 0 0 0 2px #eddcbc; }
#hl-friends .code { display: flex; align-items: center; justify-content: center; gap: 10px; }
#hl-friends .code span { font: 26px/1.1 ui-monospace, Menlo, monospace; letter-spacing: 7px; margin-right: -7px; color: #7a4260; text-shadow: 0 2px 0 #f0d6a8; }
#hl-friends .who { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 6px; }
#hl-friends .who span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 11px; color: #7a4260; background: #fff7e6; box-shadow: 0 0 0 1px #e6cfa4; }
#hl-friends .who span::before { content: ''; width: 5px; height: 5px; background: #8fd0a0; box-shadow: 0 0 0 1px #5e9c70; }
#hl-friends .who span.wait::before { background: #e6dbf5; box-shadow: 0 0 0 1px #c7b4e4; }
#hl-friends .switch { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 2px 0; font-size: 12px; color: #7a4260; }
#hl-friends .switch small { display: block; font-size: 10px; color: #a5809a; }
#hl-friends .toggle { flex: none; position: relative; width: 38px; height: 20px; padding: 0; background: #e6dbf5; box-shadow: inset 2px 2px 0 #c7b4e4, 0 0 0 2px #9c84c2; }
#hl-friends .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: linear-gradient(#ffffff, #efe7fb); box-shadow: inset -1px -1px 0 #c7b4e4, 0 0 0 1px #9c84c2; transition: left 0.12s ease-out; }
#hl-friends .toggle.on { background: linear-gradient(#ffb7c6, #ec809a); box-shadow: inset 2px 2px 0 #c4607e, 0 0 0 2px #8a3f5c; }
#hl-friends .toggle.on::after { left: 21px; box-shadow: inset -1px -1px 0 #e2c48a, 0 0 0 1px #8a3f5c; }
#hl-friends .worlds { display: flex; flex-direction: column; gap: 6px; }
#hl-friends .world { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; text-align: left; text-transform: none; letter-spacing: 0; }
#hl-friends .world b { display: block; font-size: 12px; color: #7a4260; }
#hl-friends .world small { display: block; font-size: 10px; color: #a5809a; }
#hl-friends .world i { font-style: normal; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #c4607e; }
#hl-friends .sep { height: 2px; margin: 2px 0; background: linear-gradient(90deg, transparent, #e6cfa4 20%, #e6cfa4 80%, transparent); }
#hl-friends .msg { min-height: 15px; font-size: 12px; text-align: center; color: #b07a3c; }
#hl-friends .msg.err { color: #c4506e; }
@media (max-height: 470px) { #hl-friends .card { gap: 6px; padding: 10px 14px; } }
@keyframes hlf-fade { from { opacity: 0; } }
@keyframes hlf-rise { from { transform: translateY(6px); opacity: 0; } }
`;

export interface FriendsPanelOptions {
  /** From a menu: the place a room would be opened in ('home' on the title screen). */
  place?: string;
  /** The card was closed. `left`: the player is on their way somewhere. */
  onClose?(left: boolean): void;
}

function styles(): void {
  if (document.getElementById('hl-friends-css')) return;
  const style = document.createElement('style');
  style.id = 'hl-friends-css';
  style.textContent = CSS;
  document.head.append(style);
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const placeName = (arena: string): string => placeById(arena).name;

/** The card, over `scene` (the world while playing, or a menu). */
export function openFriendsPanel(scene: Phaser.Scene, o: FriendsPanelOptions = {}): void {
  if (document.getElementById('hl-friends')) return;
  styles();
  const world = scene.scene.key === 'world' ? (scene as WorldScene) : null;
  const root = document.createElement('div');
  root.id = 'hl-friends';
  root.className = 'chrome';
  root.innerHTML = `
    <div class="card">
      <h2 data-title>Friends</h2>
      <div data-here></div>
      <h3>Join a friend</h3>
      <div class="row"><input maxlength="4" placeholder="CODE" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false"><button type="button" class="go" data-join>Join</button></div>
      <div data-worlds></div>
      <div class="msg"></div>
      <button type="button" data-close>Back</button>
    </div>`;
  document.body.append(root);

  const title = root.querySelector('[data-title]') as HTMLElement;
  const here = root.querySelector('[data-here]') as HTMLElement;
  const list = root.querySelector('[data-worlds]') as HTMLElement;
  const msg = root.querySelector('.msg') as HTMLElement;
  const input = root.querySelector('input') as HTMLInputElement;
  let busy = false;
  let left = false;
  let shown = '';

  // Typing mustn't reach the game's own keys (and Escape closes the card).
  for (const t of ['keydown', 'keyup', 'keypress'])
    root.addEventListener(t, (e) => {
      e.stopPropagation();
      if (t === 'keydown' && (e as KeyboardEvent).key === 'Escape' && !busy) close();
    });

  const say = (text: string, err = false) => {
    msg.textContent = text;
    msg.classList.toggle('err', err);
  };
  const setBusy = (b: boolean) => {
    busy = b;
    for (const btn of root.querySelectorAll<HTMLButtonElement>('button:not([data-close])')) btn.disabled = b;
    render();
  };

  const timer = window.setInterval(() => render(), REFRESH_MS);
  const close = () => {
    window.clearInterval(timer);
    root.remove();
    o.onClose?.(left);
  };
  root.querySelector('[data-close]')!.addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root && !busy) close();
  });

  /** Run something that connects, saying so meanwhile; on the way somewhere, the card goes. */
  const attempt = async (wait: string, run: () => Promise<unknown>, leaves = true) => {
    if (busy) return;
    setBusy(true);
    say(wait);
    try {
      await run();
      if (leaves) {
        left = true;
        close();
        return;
      }
      say('');
    } catch (ex) {
      say(ex instanceof Error ? ex.message : 'Something went wrong. Try again.', true);
    }
    setBusy(false);
  };
  const waking = 'Connecting... the server may take a moment to wake up.';

  // ------------------------------------------------------------ Whose world

  /** The top of the card: where this player is and what they can do about it. Redrawn only when something it shows changes. */
  function render(): void {
    const link = world?.worldLink ?? null;
    const active = session.active;
    const host = active && session.isHost;
    const code = active ? (session.room?.code ?? '') : '';
    const names = [...session.peers.values()].map((p) => p.name);
    const key = JSON.stringify([busy, active, host, code, names, link?.known, link?.mine, link?.open, link?.isShared, link?.ref.name, myId()]);
    if (key === shown) return;
    shown = key;
    let html = '';
    let head = 'Friends';
    if (world && link) {
      const place = placeName(link.arena);
      const who = `<div class="who"><span>You</span>${names.map((n) => `<span>${esc(n)}</span>`).join('')}${active ? Array.from({ length: Math.max(0, MAX_PLAYERS - 1 - names.length) }, () => '<span class="wait">...</span>').join('') : ''}</div>`;
      const codeRow = code ? `<div class="code"><span>${code}</span><button type="button" class="soft" data-copy>Copy</button></div>` : '';
      if (!link.known) {
        head = place;
        html = `<div class="here"><p>Joining your friend...</p></div>`;
      } else if (link.mine) {
        head = `Your ${place}`;
        if (active) {
          html = `<div class="here"><p>Friends join with this code:</p>${codeRow}${who}</div>`;
        } else {
          html = `<div class="here"><p>Wander and build here with up to ${MAX_PLAYERS - 1} friends. You'll get a code to send them.</p><button type="button" class="go" data-invite>Invite friends</button></div>`;
        }
        if (link.keeper) html += `<div class="switch"><span>Friends can build<small>${link.open ? 'They build, plant and tidy like you.' : 'They look round, sit and play along.'}</small></span><button type="button" class="toggle${link.open ? ' on' : ''}" data-open aria-label="Friends can build"></button></div>`;
        if (!link.ref.id) html += `<p class="note">Sign in on the title screen to keep your world open, so friends can come back while you're away.</p>`;
        else if (link.isShared) html += `<p class="note">Friends you've invited can come back any time, even while you're away.</p>`;
        if (host) html += `<button type="button" data-closeroom>Close to friends</button>`;
        else if (!active && link.isShared) html += `<button type="button" class="soft" data-unshare>Stop sharing this world</button>`;
      } else {
        const owner = esc(link.ref.name || 'your friend');
        head = `${owner}'s ${place}`;
        html = `<div class="here"><p>${link.canBuild ? 'You can build here too.' : `Only ${owner} can build here.`}</p>${codeRow}${active ? who : ''}</div><button type="button" class="go" data-home>Go home</button>`;
      }
    } else if (world) {
      // A place with nothing to build in: a room all the same.
      head = placeName(world.arenaId);
      html = active ? `<div class="here"><p>Friends join with this code:</p><div class="code"><span>${code}</span><button type="button" class="soft" data-copy>Copy</button></div></div>` : `<div class="here"><button type="button" class="go" data-invite>Invite friends</button></div>`;
    } else if (o.place) {
      const place = placeById(o.place);
      html = `<div class="here"><p>${place.id === 'home' ? 'Have friends over: you get a code to send them.' : `Wander ${esc(place.name)} with up to ${MAX_PLAYERS - 1} friends. You get a code to send them.`}</p><button type="button" class="go" data-create>${place.id === 'home' ? 'Invite friends home' : 'Go together'}</button></div>`;
    }
    title.textContent = head;
    here.innerHTML = html;
    for (const b of here.querySelectorAll<HTMLButtonElement>('button')) b.disabled = busy;
    here.querySelector('[data-invite]')?.addEventListener('click', () => invite());
    here.querySelector('[data-create]')?.addEventListener('click', () => {
      const arena = placeById(o.place).arena;
      void attempt(waking, () => playTogether(scene, { t: 'create', arena }));
    });
    here.querySelector('[data-copy]')?.addEventListener('click', () => {
      void navigator.clipboard?.writeText(code).then(
        () => say('Code copied.'),
        () => say(''),
      );
    });
    here.querySelector('[data-open]')?.addEventListener('click', () => {
      if (!link) return;
      link.setOpen(!link.open);
      render();
    });
    here.querySelector('[data-closeroom]')?.addEventListener('click', () => {
      world?.leaveRoom();
      say('Back to wandering alone.');
      render();
    });
    here.querySelector('[data-unshare]')?.addEventListener('click', () => {
      link?.unshare();
      say("Friends can't open this world any more. Invite them again to share it.");
      render();
    });
    here.querySelector('[data-home]')?.addEventListener('click', () => {
      left = true;
      close();
      world?.leaveRoom();
      world?.moveTo('home');
    });
  }

  /** A room here, where the wanderer stands: friends who join come to them. */
  function invite(): void {
    if (!world) return;
    void attempt(
      waking,
      async () => {
        if (!session.configured) throw new Error('Playing together needs the game server, which is resting right now.');
        await session.open({ t: 'create', mode: 'coop', arena: world.arenaId }, world.roomMe());
        if (!world.scene.isActive()) {
          session.close();
          return;
        }
        world.goOnline();
      },
      false,
    );
  }

  // ------------------------------------------------------- Friends' worlds

  function renderWorlds(): void {
    const mine = myId();
    const refs = mine ? worlds.friends() : [];
    if (!refs.length) {
      list.innerHTML = mine ? '' : `<p class="note">Sign in on the title screen to keep the worlds friends share with you.</p>`;
      return;
    }
    list.innerHTML = `<h3>Friends' worlds</h3><div class="worlds">${refs
      .map((r, i) => `<button type="button" class="world" data-world="${i}"><span><b>${esc(r.name)}'s ${esc(placeName(r.place))}</b><small>Open any time, even while they're away</small></span><i>Visit</i></button>`)
      .join('')}</div>`;
    for (const b of list.querySelectorAll<HTMLButtonElement>('[data-world]')) {
      const ref = refs[Number(b.dataset.world)];
      b.addEventListener('click', () => visit(ref));
    }
  }

  function visit(ref: WorldRef): void {
    void attempt(`Off to ${ref.name}'s ${placeName(ref.place)}...`, async () => {
      try {
        await openWorld(scene, ref);
      } finally {
        renderWorlds();
      }
    });
  }

  // ------------------------------------------------------------- By code

  const join = () => {
    const code = input.value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) {
      say('Room codes are 4 letters.', true);
      return;
    }
    if (code === session.room?.code) {
      say("You're in that room already.");
      return;
    }
    void attempt(waking, () => playTogether(scene, { t: 'join', code }));
  };
  root.querySelector('[data-join]')!.addEventListener('click', join);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') join();
  });

  render();
  renderWorlds();
  if (!session.configured) say('Playing together needs the game server, which is resting right now.', true);
}
