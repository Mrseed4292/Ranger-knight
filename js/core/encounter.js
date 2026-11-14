/*
 * Ranger Knight — a single encounter: health, enemy pattern, phases, history.
 * Pure logic. The enemy's move is committed by startRound(), which takes no
 * arguments, so enemy behaviour can never see the player's selection.
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};
  var Rules = RK.Rules;

  /** Normalise `pattern` / `phases` into a phases array sorted high → low. */
  function phasesOf(def) {
    var phases = def.phases && def.phases.length
      ? def.phases.slice()
      : [{ maxHearts: def.hearts, pattern: def.pattern }];
    phases.sort(function (a, b) { return b.maxHearts - a.maxHearts; });
    phases.forEach(function (p) {
      if (!p.pattern || !p.pattern.length) throw new Error(def.id + ': empty pattern');
      p.pattern.forEach(function (m) { if (!Rules.isMove(m)) throw new Error(def.id + ': bad move ' + m); });
    });
    return phases;
  }

  function Encounter(def, config) {
    this.def = def;
    this.maxPlayerHp = config.playerHearts;
    this.maxEnemyHp = def.hearts;
    this.phases = phasesOf(def);
    this.reset();
  }

  /** Full reset: health, pattern position, phase and history. Used for retry. */
  Encounter.prototype.reset = function () {
    this.playerHp = this.maxPlayerHp;
    this.enemyHp = this.maxEnemyHp;
    this.phaseIndex = this.phaseIndexFor(this.enemyHp);
    this.seqIndex = 0;
    this.history = [];
    this.roundNo = 0;
    this.current = null;
  };

  /** Deepest phase whose maxHearts still covers `hp`. */
  Encounter.prototype.phaseIndexFor = function (hp) {
    var idx = 0;
    for (var i = 0; i < this.phases.length; i++) {
      if (hp <= this.phases[i].maxHearts) idx = i;
    }
    return idx;
  };

  Encounter.prototype.pattern = function () { return this.phases[this.phaseIndex].pattern; };
  Encounter.prototype.isOver = function () { return this.playerHp <= 0 || this.enemyHp <= 0; };

  /**
   * Commit the enemy's next move. Idempotent while a round is unresolved.
   * Returns a copy of the round, or null if the encounter is over.
   */
  Encounter.prototype.startRound = function () {
    if (this.isOver()) return null;
    if (!this.current || this.current.resolved) {
      var pattern = this.pattern();
      this.roundNo += 1;
      this.current = {
        id: this.roundNo,
        enemyMove: pattern[this.seqIndex % pattern.length],
        phaseIndex: this.phaseIndex,
        seqIndex: this.seqIndex,
        resolved: false
      };
    }
    return { id: this.current.id, enemyMove: this.current.enemyMove, phaseIndex: this.current.phaseIndex, seqIndex: this.current.seqIndex };
  };

  /**
   * Resolve the committed round against the player's move. Damage is applied
   * exactly once: calling again for the same round returns null.
   */
  Encounter.prototype.resolveRound = function (playerMove) {
    if (!Rules.isMove(playerMove)) throw new Error('Invalid player move: ' + playerMove);
    if (!this.current || this.current.resolved || this.isOver()) return null;

    var round = this.current;
    var enemyMove = round.enemyMove;
    var outcome = Rules.resolve(playerMove, enemyMove);
    var prevPlayerHp = this.playerHp, prevEnemyHp = this.enemyHp;

    if (outcome === 'player') this.enemyHp = Math.max(0, this.enemyHp - 1);
    else if (outcome === 'enemy') this.playerHp = Math.max(0, this.playerHp - 1);
    round.resolved = true;

    this.history.push(enemyMove);
    // Advance after every resolved round, draws included.
    this.seqIndex = (this.seqIndex + 1) % this.pattern().length;

    // Phase changes are evaluated between rounds.
    var phaseBefore = this.phaseIndex;
    var phaseChange = null;
    if (this.enemyHp > 0 && this.playerHp > 0) {
      var next = this.phaseIndexFor(this.enemyHp);
      if (next !== this.phaseIndex) {
        this.phaseIndex = next;
        this.seqIndex = 0;
        phaseChange = { index: next, phase: this.phases[next] };
      }
    }

    return {
      roundId: round.id,
      playerMove: playerMove,
      enemyMove: enemyMove,
      outcome: outcome,
      prevPlayerHp: prevPlayerHp,
      prevEnemyHp: prevEnemyHp,
      playerHp: this.playerHp,
      enemyHp: this.enemyHp,
      phaseBefore: phaseBefore,
      phaseAfter: this.phaseIndex,
      phaseChange: phaseChange,
      enemyDefeated: this.enemyHp === 0,
      playerDefeated: this.playerHp === 0,
      explanation: Rules.explain(outcome, playerMove, enemyMove, this.def)
    };
  };

  /** Last N resolved enemy moves, oldest first. */
  Encounter.prototype.recentMoves = function (n) {
    return this.history.slice(-n);
  };

  RK.Encounter = Encounter;
})(typeof globalThis !== 'undefined' ? globalThis : this);
