/*
 * Ranger Knight — combat rules (no DOM, no rendering).
 *   G (green)  = Shield    = Rock
 *   R (red)    = Sword     = Scissors
 *   Y (yellow) = Battlecry = Paper
 * Green beats Red, Red beats Yellow, Yellow beats Green, matching colours draw.
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  var MOVES = ['G', 'R', 'Y'];
  var BEATS = { G: 'R', R: 'Y', Y: 'G' };          // key beats value
  var VERBS = { G: 'blocks', R: 'cuts through', Y: 'shatters' };

  var MOVE_INFO = {
    G: { colorName: 'Green', rps: 'Rock', playerName: 'Shield', key: '1', hex: '#3fae4a' },
    R: { colorName: 'Red', rps: 'Scissors', playerName: 'Sword', key: '2', hex: '#e04a3a' },
    Y: { colorName: 'Yellow', rps: 'Paper', playerName: 'Battlecry', key: '3', hex: '#f2c230' }
  };

  function isMove(m) { return MOVES.indexOf(m) !== -1; }

  function beats(a, b) { return BEATS[a] === b; }

  /** Returns 'player', 'enemy' or 'draw'. */
  function resolve(playerMove, enemyMove) {
    if (!isMove(playerMove) || !isMove(enemyMove)) {
      throw new Error('Invalid move: ' + playerMove + ' vs ' + enemyMove);
    }
    if (playerMove === enemyMove) return 'draw';
    return beats(playerMove, enemyMove) ? 'player' : 'enemy';
  }

  /** The move that beats `m` (used by tests and the tutorial). */
  function counterTo(m) {
    for (var k in BEATS) if (BEATS[k] === m) return k;
    return null;
  }

  /** Short, readable explanation of a resolved round. */
  function explain(outcome, playerMove, enemyMove, enemyDef) {
    var pName = MOVE_INFO[playerMove].playerName;
    var eName = enemyDef.abilities[enemyMove].name;
    var who = enemyDef.name;
    if (outcome === 'player') {
      return { headline: 'Hit!', text: 'Your ' + pName + ' ' + VERBS[playerMove] + ' ' + who + "'s " + eName + '. ' + who + ' loses a heart.' };
    }
    if (outcome === 'enemy') {
      return { headline: 'Ouch!', text: who + "'s " + eName + ' ' + VERBS[enemyMove] + ' your ' + pName + '. You lose a heart.' };
    }
    return { headline: 'Draw', text: pName + ' meets ' + eName + ' — both ' + MOVE_INFO[playerMove].colorName.toLowerCase() + '. No damage.' };
  }

  /**
   * What the player may see about the committed enemy move.
   * Every field describes the real committed move; nothing here can mislead.
   *   pose  — enemy shows the preparation pose for `move`
   *   aura  — 'full' (strong colour glow), 'accent' (small coloured glint) or 'none'
   *   label — show icon + ability name + colour above the enemy
   */
  function hintFor(difficulty, move, timeLeft, cfg) {
    var hint = { move: move, pose: true, aura: 'none', label: false };
    if (difficulty === 'easy') {
      hint.aura = 'full'; hint.label = true;
    } else if (difficulty === 'medium') {
      if (timeLeft <= cfg.mediumRevealSeconds) { hint.aura = 'full'; hint.label = true; }
    } else {
      hint.aura = 'accent';
    }
    return hint;
  }

  RK.Rules = {
    MOVES: MOVES,
    MOVE_INFO: MOVE_INFO,
    isMove: isMove,
    beats: beats,
    resolve: resolve,
    counterTo: counterTo,
    explain: explain,
    hintFor: hintFor
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
