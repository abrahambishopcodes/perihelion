// The start.ng profile card: face, character name and @account, with a sign-in button for guests.
export class PlayerCard {
  constructor(parent) {
    this.root = document.createElement('div');
    this.root.className = 'player-card';
    this.root.hidden = true;
    this.root.innerHTML = `
      <img class="player-face" alt="">
      <div class="player-text">
        <b class="player-name"></b>
        <span class="player-account"></span>
      </div>
      <button type="button" class="player-sign-in" hidden>Sign in</button>`;
    parent.append(this.root);
    this.face = this.root.querySelector('.player-face');
    this.name = this.root.querySelector('.player-name');
    this.account = this.root.querySelector('.player-account');
    this.signIn = this.root.querySelector('.player-sign-in');
    this.onSignIn = null;
    this.signIn.addEventListener('click', () => this.onSignIn?.());
  }

  // who: { user, guest } from start.ng
  show(who) {
    const player = who.user ?? who.guest;
    if (!player) return;
    if (player.face) this.face.src = player.face;
    this.face.hidden = !player.face;
    this.name.textContent = player.name ?? 'Guest';
    this.account.textContent = who.user?.account ? `@${who.user.account}` : 'Not signed in';
    this.signIn.hidden = !!who.user;
    this.root.hidden = false;
  }
}
