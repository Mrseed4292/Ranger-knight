/*
 * Ranger Knight — wiring: settings, input, main loop, audio cues.
 * Optional: add ?encounter=N to the URL to start at encounter N (1-11) for testing.
 */
(function (root) {
  'use strict';
  var RK = root.RK;
  var S = RK.Game.STATES, Sound = RK.Sound;

  /* ---------- settings (saved per browser; storage failures are ignored) ---------- */
  var KEY = 'rangerKnight.settings.v1';
  var prefersReduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var settings = { volume: 0.6, muted: false, reducedMotion: !!prefersReduced };
  try {
    var saved = JSON.parse(root.localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.volume === 'number') settings.volume = Math.max(0, Math.min(1, saved.volume));
      if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
      if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;
    }
  } catch (e) { /* private mode etc. */ }

  function saveSettings() { try { root.localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }

  function applySettings() {
    Sound.setVolume(settings.volume);
    Sound.setMuted(settings.muted);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    var inputs = document.querySelectorAll('[data-setting]');
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i], k = inp.getAttribute('data-setting');
      if (inp.type === 'checkbox') inp.checked = !!settings[k];
      else inp.value = Math.round(settings[k] * 100);
    }
  }

  document.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-setting');
    if (!k) return;
    settings[k] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value) / 100;
    if (k === 'volume' && settings.volume > 0 && settings.muted) settings.muted = false;
    applySettings(); saveSettings();
  });
  document.addEventListener('change', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-setting') === 'volume') Sound.sfx('select');
  });

  /* ---------- game objects ---------- */
  var game = new RK.Game(RK.ENEMIES, RK.CONFIG);
  var ui = new RK.UI(game);
  var renderer = new RK.Renderer(document.getElementById('battle-canvas'), game, settings);
  RK.game = game; // handy for debugging in the console

  var params = new URLSearchParams(root.location.search);
  var startAt = Math.max(1, Math.min(RK.ENEMIES.length, parseInt(params.get('encounter'), 10) || 1)) - 1;

  RK.Renderer.drawPortrait(document.getElementById('menu-art'), 'meadow', RK.ENEMIES[0], false);

  /* ---------- music per state (playMusic ignores repeats, so loops never stack) ---------- */
  function musicFor() {
    switch (game.state) {
      case S.MENU: case S.TUTORIAL: case S.FINAL_WIN: case S.ENCOUNTER_WON: return 'main';
      case S.ENEMY_DEFEATED: case S.PLAYER_DEFEATED: case S.LOST: return null;
      default: return game.isFinalEncounter() ? 'boss' : 'main';
    }
  }

  game.on('change', function (ev) {
    if (ev.event === 'state' || ev.event === 'retry') ui.reset();
    ui.sync();
    Sound.playMusic(musicFor());
  });

  /* ---------- sound cues ---------- */
  game.on('select', function () { Sound.sfx('select'); });
  game.on('tick', function (n) { Sound.sfx('tick', n); });
  game.on('roundStart', function (r) {
    var def = game.currentDef(), ab = def.abilities[r.enemyMove];
    ui.announce(def.difficulty === 'easy'
      ? 'New round. ' + def.name + ' prepares ' + ab.name + ', ' + RK.Rules.MOVE_INFO[r.enemyMove].colorName + '.'
      : 'New round. Watch ' + def.name + '’s stance.');
  });
  game.on('resolve', function (r) {
    var cue = { G: 'guard', R: 'swing', Y: 'cry' };
    Sound.sfx(cue[r.playerMove]);
    if (r.enemyMove !== r.playerMove) Sound.sfx(cue[r.enemyMove]);
  });
  game.on('impact', function (r) {
    if (r.outcome === 'draw') Sound.sfx('clash');
    else if (r.outcome === 'player') Sound.sfx(r.playerMove === 'G' ? 'block' : 'hit');
    else Sound.sfx(r.enemyMove === 'G' ? 'block' : 'hurt');
  });
  game.on('phase', function () { Sound.sfx('phase'); });
  game.on('enemyDefeated', function () { Sound.sfx(game.isFinalEncounter() ? 'fanfare' : 'victory'); });
  game.on('playerDefeated', function () { Sound.sfx('defeat'); });
  game.on('pause', function () { Sound.suspend(); });
  game.on('resume', function () { Sound.resume(); });

  /* ---------- buttons ---------- */
  function on(id, fn) { document.getElementById(id).addEventListener('click', fn); }
  on('btn-start', function () { game.startGame(startAt); });
  on('btn-howto', function () { game.showTutorial(); });
  on('btn-tutorial-back', function () { game.goToMenu(); });
  on('btn-tutorial-start', function () { game.startGame(startAt); });
  on('btn-pause', function () { game.pause(); });
  on('btn-resume', function () { game.resume(); });
  on('btn-pause-retry', function () { game.retry(); });
  on('btn-pause-menu', function () { game.goToMenu(); });
  on('btn-fight', function () { game.startBattle(); });
  on('btn-continue', function () { game.continueToNext(); });
  on('btn-retry', function () { game.retry(); });
  on('btn-lost-menu', function () { game.goToMenu(); });
  on('btn-final-again', function () { game.startGame(0); });
  on('btn-final-menu', function () { game.goToMenu(); });

  var abilityButtons = document.querySelectorAll('.ability');
  for (var i = 0; i < abilityButtons.length; i++) {
    abilityButtons[i].addEventListener('click', function (e) { game.select(e.currentTarget.getAttribute('data-move')); });
  }
  document.getElementById('banner').addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-action="skip-phase"]')) game.skipPhaseBanner();
  });

  /* ---------- keyboard ---------- */
  var KEYMAP = { '1': 'G', '2': 'R', '3': 'Y', Numpad1: 'G', Numpad2: 'R', Numpad3: 'Y' };
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var move = KEYMAP[e.key] || KEYMAP[e.code];
    if (move) { if (game.select(move)) e.preventDefault(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (game.paused) game.resume(); else game.pause();
      e.preventDefault();
    }
  });

  /* ---------- audio unlock (only after a user gesture) ---------- */
  function unlock() {
    Sound.unlock();
    applySettings();
    Sound.playMusic(musicFor());
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);

  /* ---------- pause when the tab is hidden; resuming is always deliberate ---------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      game.pause();
      Sound.suspend();
    } else if (!game.paused) {
      Sound.resume();
    }
  });

  /* ---------- main loop ---------- */
  var last = null;
  function frame(now) {
    var dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    game.update(dt);
    if (!document.getElementById('screen-battle').hidden) {
      renderer.render();
      ui.frame();
    }
    root.requestAnimationFrame(frame);
  }

  applySettings();
  ui.sync();
  root.requestAnimationFrame(frame);
})(typeof globalThis !== 'undefined' ? globalThis : this);
