/*
 * Ranger Knight — DOM interface: screens, HUD, overlays and panels.
 * Reads game state; never changes it directly (buttons are wired in main.js).
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};
  var S = RK.Game.STATES, Rules = RK.Rules, Icons = RK.Icons;

  var DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', boss: 'Final Boss' };
  var HINT_TEXT = {
    easy: 'Easy: its next move is shown above its head for the whole countdown.',
    medium: 'Medium: watch its stance. The move’s icon and colour appear in the last 2 seconds.',
    hard: 'Hard: no labels during the countdown. Learn these three poses and watch for a small coloured glint.',
    boss: 'Final boss: no labels. Learn the poses. It changes tactics twice as it weakens, and each new phase is announced.'
  };

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el.hidden === !!on) el.hidden = !on; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function UI(game) {
    this.game = game;
    this.el = {
      screens: { menu: $('screen-menu'), tutorial: $('screen-tutorial'), battle: $('screen-battle'), final: $('screen-final') },
      modals: { intro: $('modal-intro'), won: $('modal-won'), lost: $('modal-lost'), pause: $('modal-pause') },
      encounter: $('hud-encounter'), enemyName: $('hud-enemy-name'), difficulty: $('hud-difficulty'),
      progress: $('progress'), progressFill: $('progress-fill'), progressLabel: $('progress-label'),
      playerHearts: $('player-hearts'), enemyHearts: $('enemy-hearts'), enemyHeartsName: $('enemy-hearts-name'),
      countdown: $('countdown'), countNum: $('count-num'), timerFill: $('timer-fill'),
      hint: $('hint'), result: $('result'), banner: $('banner'), poseTip: $('pose-tip'),
      history: $('history-list'), abilities: document.querySelectorAll('.ability'),
      sr: $('sr-status')
    };
    this.cache = {};
    this.openModal = null;
    Icons.hydrate(document);
  }

  /* ---------- state-driven layout (called on every game event) ---------- */

  UI.prototype.sync = function () {
    var g = this.game, st = g.state;
    var screen = st === S.MENU ? 'menu' : st === S.TUTORIAL ? 'tutorial' : st === S.FINAL_WIN ? 'final' : 'battle';
    for (var k in this.el.screens) show(this.el.screens[k], k === screen);

    var modal = null;
    if (screen === 'battle') {
      if (g.paused) modal = 'pause';
      else if (st === S.INTRO) modal = 'intro';
      else if (st === S.ENCOUNTER_WON) modal = 'won';
      else if (st === S.LOST) modal = 'lost';
    }
    if (modal !== this.openModal) {
      var prev = this.openModal;
      this.openModal = modal;
      for (var m in this.el.modals) show(this.el.modals[m], m === modal);
      if (modal) this.fillModal(modal, prev);
      document.body.classList.toggle('modal-open', !!modal);
      this.el.screens.battle.inert = !!modal; // keep keyboard focus inside the open panel
    }
    if (screen === 'battle' && g.encounter) this.syncHud();
    if (screen === 'final' && this.cache.final !== true) {
      this.cache.final = true;
      RK.Renderer.drawPortrait($('final-art'), 'lair', g.enemies[g.enemies.length - 1], true);
      $('final-stats').textContent = g.defeated + ' / ' + g.enemies.length + ' foes defeated.';
      $('btn-final-again').focus({ preventScroll: true });
    }
    if (screen !== 'final') this.cache.final = false;
    if (screen === 'menu' && this.cache.screen !== 'menu') $('btn-start').focus({ preventScroll: true });
    if (screen === 'tutorial' && this.cache.screen !== 'tutorial') $('btn-tutorial-start').focus({ preventScroll: true });
    this.cache.screen = screen;
  };

  UI.prototype.syncHud = function () {
    var g = this.game, def = g.encounter.def, n = g.enemies.length;
    this.el.encounter.textContent = 'Encounter ' + (g.encounterIndex + 1) + ' / ' + n;
    this.el.enemyName.textContent = def.name;
    this.el.enemyHeartsName.textContent = def.name;
    this.el.difficulty.textContent = DIFF_LABEL[def.difficulty];
    this.el.difficulty.className = 'badge badge-' + def.difficulty;
    this.el.progressFill.style.width = (g.defeated / n * 100) + '%';
    this.el.progressLabel.textContent = g.defeated + ' / ' + n + ' defeated';
    this.el.progress.setAttribute('aria-valuenow', g.defeated);
    this.el.progress.setAttribute('aria-valuemax', n);
  };

  UI.prototype.fillModal = function (name, prev) {
    var g = this.game, def = g.currentDef();
    if (name === 'intro') {
      $('intro-eyebrow').textContent = 'Encounter ' + (g.encounterIndex + 1) + ' / ' + g.enemies.length + ' · ' + DIFF_LABEL[def.difficulty];
      $('intro-title').textContent = def.name;
      $('intro-meta').innerHTML = '<span class="mini-hearts">' + new Array(def.hearts + 1).join(Icons.heart(true)) + '</span> ' +
        def.hearts + ' hearts · You have ' + g.cfg.playerHearts + ' hearts';
      $('intro-blurb').textContent = def.blurb;
      var grid = $('intro-poses');
      grid.innerHTML = '';
      Rules.MOVES.forEach(function (m) {
        var ab = def.abilities[m], info = Rules.MOVE_INFO[m];
        var card = document.createElement('div');
        card.className = 'pose-card pose-' + m;
        card.innerHTML = '<canvas class="pixel pose-canvas" aria-hidden="true"></canvas>' +
          '<div class="pose-label"><span class="chip chip-' + m + '">' + Icons.move(m) + '</span> <strong>' + esc(ab.name) + '</strong></div>' +
          '<div class="pose-colour">' + info.colorName + ' · countered by ' + Rules.MOVE_INFO[Rules.counterTo(m)].playerName + '</div>' +
          '<div class="pose-desc">' + esc(ab.pose) + '</div>';
        grid.appendChild(card);
        RK.Renderer.drawPreview(card.querySelector('canvas'), def, m, 0);
      });
      var hint = HINT_TEXT[def.difficulty];
      if (def.phases && def.difficulty !== 'boss') hint += ' Careful: it may change its rhythm when badly wounded.';
      $('intro-hint').textContent = hint;
      $('btn-fight').focus({ preventScroll: true });
    } else if (name === 'won') {
      var next = g.enemies[g.encounterIndex + 1];
      $('won-title').textContent = def.name + ' defeated!';
      $('won-text').textContent = g.defeated + ' / ' + g.enemies.length + ' foes defeated.' + (next ? ' Next up: ' + next.name + '.' : '');
      $('btn-continue').focus({ preventScroll: true });
    } else if (name === 'lost') {
      $('lost-text').textContent = 'The ' + def.name + ' won this time. Tip: every foe repeats a pattern. Watch the “Last enemy moves” list.';
      $('btn-retry').focus({ preventScroll: true });
    } else if (name === 'pause') {
      $('btn-resume').focus({ preventScroll: true });
    }
  };

  /* ---------- per-frame details ---------- */

  UI.prototype.frame = function () {
    var g = this.game;
    if (!g.encounter || this.el.screens.battle.hidden) return;
    var st = g.state, t = g.stateTime, tim = g.cfg.timings, r = g.lastResult, def = g.encounter.def;

    // countdown
    var counting = st === S.COUNTDOWN;
    show(this.el.countdown, counting);
    if (counting) {
      var num = String(Math.max(1, Math.ceil(g.timeLeft)));
      if (this.cache.num !== num) {
        this.cache.num = num;
        this.el.countNum.textContent = num;
        this.el.countNum.classList.remove('pop'); void this.el.countNum.offsetWidth; this.el.countNum.classList.add('pop');
      }
      this.el.timerFill.style.transform = 'scaleX(' + (g.timeLeft / g.cfg.countdownSeconds).toFixed(4) + ')';
      this.el.countdown.classList.toggle('urgent', g.timeLeft <= 2);
    } else this.cache.num = null;

    // hint bubble
    var hint = g.currentHint(), hintKey = 'none';
    if (hint && hint.label) hintKey = 'label' + hint.move;
    else if (hint && def.difficulty === 'medium') hintKey = 'stance';
    if (this.cache.hint !== hintKey) {
      this.cache.hint = hintKey;
      if (hintKey === 'none') show(this.el.hint, false);
      else {
        show(this.el.hint, true);
        if (hintKey === 'stance') {
          this.el.hint.className = 'hint hint-unknown';
          this.el.hint.innerHTML = '<span class="hint-q">?</span> Watch its stance…';
        } else {
          var ab = def.abilities[hint.move], info = Rules.MOVE_INFO[hint.move];
          this.el.hint.className = 'hint hint-' + hint.move;
          this.el.hint.innerHTML = '<span class="chip chip-' + hint.move + '">' + Icons.move(hint.move) + '</span>' +
            '<span><small>Next move</small><strong>' + esc(ab.name) + '</strong> <em>' + info.colorName + '</em></span>';
        }
      }
    }

    // result explanation (after the hit lands)
    var resKey = (st === S.RESOLVING && r && t >= tim.impactAt) ? 'r' + r.roundId : '';
    if (this.cache.res !== resKey) {
      this.cache.res = resKey;
      if (!resKey) show(this.el.result, false);
      else {
        show(this.el.result, true);
        var cls = r.outcome === 'player' ? 'win' : r.outcome === 'enemy' ? 'lose' : 'draw';
        this.el.result.className = 'result result-' + cls;
        this.el.result.innerHTML = '<div class="result-moves">' +
          '<span class="chip chip-' + r.playerMove + '">' + Icons.move(r.playerMove) + '</span> ' + Rules.MOVE_INFO[r.playerMove].playerName +
          ' <span class="vs">vs</span> ' +
          '<span class="chip chip-' + r.enemyMove + '">' + Icons.move(r.enemyMove) + '</span> ' + esc(def.abilities[r.enemyMove].name) +
          '</div><strong class="result-head">' + r.explanation.headline + '</strong> <span class="result-text">' + esc(r.explanation.text) + '</span>';
      }
    }

    // banners: phase change, victory, defeat
    var banKey = '';
    if (st === S.PHASE && r && r.phaseChange) banKey = 'phase' + r.roundId;
    else if (st === S.ENEMY_DEFEATED) banKey = 'victory';
    else if (st === S.PLAYER_DEFEATED) banKey = 'defeat';
    if (this.cache.banner !== banKey) {
      this.cache.banner = banKey;
      if (!banKey) show(this.el.banner, false);
      else {
        show(this.el.banner, true);
        if (banKey === 'victory') {
          this.el.banner.className = 'banner banner-victory';
          this.el.banner.innerHTML = '<strong>Victory!</strong><span>' + esc(def.name) + ' is defeated.</span>';
        } else if (banKey === 'defeat') {
          this.el.banner.className = 'banner banner-defeat';
          this.el.banner.innerHTML = '<strong>Defeated…</strong><span>The knight falls.</span>';
        } else {
          var ph = r.phaseChange.phase;
          this.el.banner.className = 'banner banner-phase';
          this.el.banner.innerHTML = '<strong>' + esc(ph.title || 'New tactics!') + '</strong><span>' + esc(ph.announce || '') +
            '</span><span class="banner-note">Its pattern starts over.</span><button class="btn btn-small" data-action="skip-phase">Ready!</button>';
        }
      }
    }

    // hearts (hold the old value until the hit lands)
    var php = g.encounter.playerHp, ehp = g.encounter.enemyHp;
    if (st === S.RESOLVING && r && t < tim.impactAt) { php = r.prevPlayerHp; ehp = r.prevEnemyHp; }
    this.renderHearts(this.el.playerHearts, php, g.encounter.maxPlayerHp, 'Knight', 'p');
    this.renderHearts(this.el.enemyHearts, ehp, g.encounter.maxEnemyHp, def.name, 'e');

    // ability buttons
    var selKey = g.selected + (counting ? '1' : '0');
    if (this.cache.sel !== selKey) {
      this.cache.sel = selKey;
      for (var i = 0; i < this.el.abilities.length; i++) {
        var b = this.el.abilities[i], on = b.getAttribute('data-move') === g.selected;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('selected', on);
        b.classList.toggle('locked', !counting);
        b.setAttribute('aria-disabled', counting ? 'false' : 'true');
      }
    }

    // history (last 3 resolved enemy moves; revealed after the hit lands)
    var hist = g.encounter.recentMoves(g.cfg.historyLength + 1);
    if (st === S.RESOLVING && t < tim.impactAt) hist = hist.slice(0, -1);
    hist = hist.slice(-g.cfg.historyLength);
    var histKey = hist.join('') + def.id;
    if (this.cache.hist !== histKey) {
      this.cache.hist = histKey;
      var html = '';
      if (!hist.length) html = '<li class="history-empty">none yet</li>';
      hist.forEach(function (m, idx) {
        html += '<li class="history-item chip-' + m + (idx === hist.length - 1 ? ' newest' : '') + '">' + Icons.move(m) +
          '<span>' + esc(def.abilities[m].name) + '</span></li>';
      });
      this.el.history.innerHTML = html;
    }
  };

  UI.prototype.renderHearts = function (el, hp, max, who, key) {
    var k = hp + '/' + max;
    if (this.cache['h' + key] === k) return;
    var old = this.cache['hv' + key];
    this.cache['h' + key] = k; this.cache['hv' + key] = hp;
    var html = '';
    for (var i = 0; i < max; i++) {
      var lost = old != null && i >= hp && i < old;
      html += '<span class="heart' + (i < hp ? '' : ' empty') + (lost ? ' just-lost' : '') + '">' + Icons.heart(i < hp) + '</span>';
    }
    el.innerHTML = html;
    el.setAttribute('aria-label', who + ' health: ' + hp + ' of ' + max + ' hearts');
  };

  /** Forget cached DOM so the next frame redraws everything (used on retry / new encounter). */
  UI.prototype.reset = function () {
    var keepScreen = this.cache.screen, keepFinal = this.cache.final;
    this.cache = { screen: keepScreen, final: keepFinal };
  };

  UI.prototype.announce = function (text) { this.el.sr.textContent = text; };

  RK.UI = UI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
