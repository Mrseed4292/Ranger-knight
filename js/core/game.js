/*
 * Ranger Knight — game state machine (no DOM, no rendering, no audio).
 *
 * All timing runs on the game clock advanced by update(dt). There are no
 * setTimeout calls: changing state discards every pending step, and pausing
 * simply stops the clock. The view layer reads state and listens to events.
 *
 * Events: change, roundStart, tick, select, resolve, impact, phase,
 *         enemyDefeated, playerDefeated, pause, resume
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};
  var Rules = RK.Rules;

  var S = {
    MENU: 'menu',
    TUTORIAL: 'tutorial',
    INTRO: 'intro',                    // encounter introduction panel
    COUNTDOWN: 'countdown',            // player may choose; only state that accepts input
    RESOLVING: 'resolving',            // input locked, attack animation + explanation
    PHASE: 'phase',                    // tactic / boss phase announcement
    ENEMY_DEFEATED: 'enemyDefeated',   // victory animation
    PLAYER_DEFEATED: 'playerDefeated', // defeat animation
    ENCOUNTER_WON: 'encounterWon',     // Continue panel
    LOST: 'lost',                      // Retry / Main Menu panel
    FINAL_WIN: 'finalWin'
  };

  var PAUSABLE = [S.INTRO, S.COUNTDOWN, S.RESOLVING, S.PHASE, S.ENEMY_DEFEATED, S.PLAYER_DEFEATED];
  var BATTLE = PAUSABLE.concat([S.ENCOUNTER_WON, S.LOST]);

  function Game(enemies, config) {
    this.enemies = enemies;
    this.cfg = config;
    this.listeners = {};
    this.state = S.MENU;
    this.stateTime = 0;
    this.paused = false;
    this.encounterIndex = 0;
    this.encounter = null;
    this.defeated = 0;
    this.selected = 'G';
    this.round = null;
    this.timeLeft = 0;
    this.lastResult = null;
    this._impactFired = false;
    this._lastTick = null;
  }

  Game.STATES = S;

  Game.prototype.on = function (evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
    return this;
  };
  Game.prototype.emit = function (evt, data) {
    var list = this.listeners[evt];
    if (list) list.slice().forEach(function (fn) { fn(data); });
    if (evt !== 'change') {
      var all = this.listeners.change;
      if (all) all.slice().forEach(function (fn) { fn({ event: evt, data: data }); });
    }
  };

  Game.prototype._setState = function (s) {
    this.state = s;
    this.stateTime = 0;
    this._impactFired = false;
  };

  Game.prototype.isBattleState = function () { return BATTLE.indexOf(this.state) !== -1; };
  Game.prototype.canPause = function () { return !this.paused && PAUSABLE.indexOf(this.state) !== -1; };
  Game.prototype.currentDef = function () { return this.encounter ? this.encounter.def : null; };
  Game.prototype.isFinalEncounter = function () { return this.encounterIndex === this.enemies.length - 1; };

  /* ---------- commands (each validates the current state) ---------- */

  Game.prototype.goToMenu = function () {
    this.paused = false;
    this.encounter = null;
    this.round = null;
    this.lastResult = null;
    this._setState(S.MENU);
    this.emit('state', S.MENU);
    return true;
  };

  Game.prototype.showTutorial = function () {
    if (this.isBattleState()) return false;
    this.paused = false;
    this._setState(S.TUTORIAL);
    this.emit('state', S.TUTORIAL);
    return true;
  };

  Game.prototype.startGame = function (startIndex) {
    var i = Math.max(0, Math.min(this.enemies.length - 1, startIndex | 0));
    this.defeated = i;
    this._beginEncounter(i);
    return true;
  };

  Game.prototype._beginEncounter = function (i) {
    this.paused = false;
    this.encounterIndex = i;
    this.encounter = new RK.Encounter(this.enemies[i], this.cfg); // full player health
    this.round = null;
    this.lastResult = null;
    this.selected = 'G';
    this._setState(S.INTRO);
    this.emit('state', S.INTRO);
  };

  /** From the intro panel into the first countdown. */
  Game.prototype.startBattle = function () {
    if (this.state !== S.INTRO || this.paused) return false;
    this._startRound();
    return true;
  };

  Game.prototype._startRound = function () {
    this.round = this.encounter.startRound();  // enemy move committed BEFORE the countdown
    this.selected = 'G';                       // Shield is selected by default
    this.timeLeft = this.cfg.countdownSeconds;
    this._lastTick = Math.ceil(this.timeLeft);
    this._setState(S.COUNTDOWN);
    this.emit('roundStart', this.round);
    this.emit('tick', this._lastTick);
  };

  Game.prototype.select = function (move) {
    if (this.state !== S.COUNTDOWN || this.paused || !Rules.isMove(move)) return false;
    if (this.selected !== move) {
      this.selected = move;
      this.emit('select', move);
    }
    return true;
  };

  Game.prototype.skipPhaseBanner = function () {
    if (this.state !== S.PHASE || this.paused) return false;
    this._startRound();
    return true;
  };

  Game.prototype.continueToNext = function () {
    if (this.state !== S.ENCOUNTER_WON || this.paused) return false;
    this._beginEncounter(this.encounterIndex + 1);
    return true;
  };

  /** Reset this encounter (pattern, phase, both health values) and start over. */
  Game.prototype.retry = function () {
    if (!this.encounter) return false;
    if (!(this.state === S.LOST || (this.paused && this.isBattleState()))) return false;
    this.paused = false;
    this.encounter.reset();
    this.lastResult = null;
    this.emit('retry');
    this._startRound();
    return true;
  };

  Game.prototype.pause = function () {
    if (!this.canPause()) return false;
    this.paused = true;
    this.emit('pause');
    return true;
  };

  Game.prototype.resume = function () {
    if (!this.paused) return false;
    this.paused = false;
    this.emit('resume');
    return true;
  };

  /** Hint for the committed move at the current moment of the countdown. */
  Game.prototype.currentHint = function () {
    if (this.state !== S.COUNTDOWN || !this.round) return null;
    var phase = this.encounter.phases[this.round.phaseIndex];
    return Rules.hintFor(this.encounter.def.difficulty, this.round.enemyMove, this.timeLeft, this.cfg, phase);
  };

  /* ---------- clock ---------- */

  Game.prototype.update = function (dt) {
    if (this.paused || !(dt > 0)) return;
    var t = this.cfg.timings;
    this.stateTime += dt;

    switch (this.state) {
      case S.COUNTDOWN:
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        var sec = Math.ceil(this.timeLeft);
        if (sec !== this._lastTick) {
          this._lastTick = sec;
          if (sec > 0) this.emit('tick', sec);
        }
        if (this.timeLeft <= 0) this._resolve();
        break;

      case S.RESOLVING:
        if (!this._impactFired && this.stateTime >= t.impactAt) {
          this._impactFired = true;
          this.emit('impact', this.lastResult);
        }
        if (this.stateTime >= t.resolve) this._afterResolve();
        break;

      case S.PHASE:
        if (this.stateTime >= t.phaseAnnounce) this._startRound();
        break;

      case S.ENEMY_DEFEATED:
        if (this.stateTime >= t.enemyDefeated) {
          this._setState(this.isFinalEncounter() ? S.FINAL_WIN : S.ENCOUNTER_WON);
          this.emit('state', this.state);
        }
        break;

      case S.PLAYER_DEFEATED:
        if (this.stateTime >= t.playerDefeated) {
          this._setState(S.LOST);
          this.emit('state', S.LOST);
        }
        break;
    }
  };

  /** Countdown reached zero: lock input and resolve both moves together. */
  Game.prototype._resolve = function () {
    if (this.state !== S.COUNTDOWN) return;
    var result = this.encounter.resolveRound(this.selected);
    if (!result) return;
    this.lastResult = result;
    this._setState(S.RESOLVING);
    this.emit('resolve', result);
  };

  Game.prototype._afterResolve = function () {
    var r = this.lastResult;
    if (!this._impactFired) { this._impactFired = true; this.emit('impact', r); }
    if (r.playerDefeated) {
      this._setState(S.PLAYER_DEFEATED);
      this.emit('playerDefeated', r);
    } else if (r.enemyDefeated) {
      this.defeated = Math.max(this.defeated, this.encounterIndex + 1);
      this._setState(S.ENEMY_DEFEATED);
      this.emit('enemyDefeated', r);
    } else if (r.phaseChange) {
      this._setState(S.PHASE);
      this.emit('phase', r.phaseChange);
    } else {
      this._startRound();
    }
  };

  RK.Game = Game;
})(typeof globalThis !== 'undefined' ? globalThis : this);
