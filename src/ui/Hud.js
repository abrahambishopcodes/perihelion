// DOM overlay for score, prompts and the game-over card.

const el = (tag, className, parent, text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  parent.append(node);
  return node;
};

const ICON_SOUND = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const ICON_MUTED = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

export class Hud {
  constructor() {
    this.root = el('div', 'hud', document.body);

    this.score = el('div', 'hud-score', this.root, '0');
    this.multiplier = el('div', 'hud-mult', this.root);
    this.best = el('div', 'hud-best', this.root);

    this.prompt = el('div', 'hud-prompt', this.root);
    this.title = el('div', 'hud-title', this.prompt, 'PERIHELION');
    this.subtitle = el('div', 'hud-subtitle', this.prompt, 'Orbit Dodger');
    this.tap = el('div', 'hud-tap', this.prompt, 'TAP TO START');

    this.over = el('div', 'hud-over', this.root);
    this.overLabel = el('div', 'hud-over-label', this.over, 'SCORE');
    this.overScore = el('div', 'hud-over-score', this.over);
    this.overBadge = el('div', 'hud-over-badge', this.over, 'NEW BEST');
    this.overNote = el('div', 'hud-over-note', this.over);
    this.overRank = el('div', 'hud-over-rank', this.over);
    this.overTap = el('div', 'hud-tap', this.over, 'TAP TO RETRY');

    // Top-right controls. These are real buttons, so taps on them don't steer the ship.
    this.controls = el('div', 'hud-controls', this.root);
    this.mute = el('button', 'hud-btn hud-mute', this.controls);
    this.mute.type = 'button';
    this.mute.addEventListener('click', () => this.onMute?.());
    this.quality = el('button', 'hud-btn hud-quality', this.controls);
    this.quality.type = 'button';
    this.quality.addEventListener('click', () => this.onQuality?.());
    this.onMute = null;
    this.onQuality = null;

    this.pause = el('div', 'hud-pause', this.root);
    el('div', 'hud-pause-title', this.pause, 'PAUSED');
    el('div', 'hud-tap', this.pause, 'TAP TO RESUME');

    this.shownScore = -1;
    this.shownMult = -1;
  }

  setMuted(muted) {
    this.mute.innerHTML = muted ? ICON_MUTED : ICON_SOUND;
    this.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  setQuality(low) {
    this.quality.textContent = low ? 'FX LOW' : 'FX HIGH';
    this.quality.setAttribute('aria-label', low ? 'Switch to high quality effects' : 'Switch to low quality effects');
  }

  setState(state) {
    this.root.dataset.state = state;
  }

  setPaused(paused) {
    this.root.classList.toggle('paused', paused);
  }

  setScore(score) {
    const s = Math.floor(score);
    if (s === this.shownScore) return;
    this.shownScore = s;
    this.score.textContent = s.toLocaleString('en-US');
  }

  pop(node = this.score) {
    node.classList.remove('pop');
    void node.offsetWidth; // restart the animation
    node.classList.add('pop');
  }

  setMultiplier(m) {
    if (m === this.shownMult) return;
    const up = m > this.shownMult;
    this.shownMult = m;
    this.multiplier.textContent = `×${m}`;
    this.multiplier.classList.toggle('visible', m > 1);
    if (up && m > 1) this.pop(this.multiplier);
  }

  setBest(best) {
    this.best.textContent = best > 0 ? `BEST ${Math.floor(best).toLocaleString('en-US')}` : '';
  }

  showGameOver(score, best, isNewBest, missedBy) {
    this.overScore.textContent = Math.floor(score).toLocaleString('en-US');
    this.overBadge.classList.toggle('visible', isNewBest);
    this.overNote.textContent = missedBy > 0 ? `You missed your best by ${Math.ceil(missedBy).toLocaleString('en-US')}` : '';
    this.overRank.textContent = '';
  }

  setRank(text) {
    this.overRank.textContent = text;
  }
}
