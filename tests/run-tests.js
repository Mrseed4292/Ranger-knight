/*
 * Ranger Knight — logic tests. Run with:  node tests/run-tests.js
 * Covers rules, enemy data, encounters, phases, hints and the state machine.
 */
'use strict';
var path = require('path');
['js/config.js', 'js/data/enemies.js', 'js/core/rules.js', 'js/core/encounter.js', 'js/core/game.js']
  .forEach(function (f) { require(path.join(__dirname, '..', f)); });

var RK = globalThis.RK;
var Rules = RK.Rules, Encounter = RK.Encounter, Game = RK.Game, CONFIG = RK.CONFIG, ENEMIES = RK.ENEMIES;
var S = Game.STATES;

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}
function eq(a, b, msg) {
  var A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg || 'not equal') + ': got ' + A + ', expected ' + B);
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function byId(id) { return ENEMIES.filter(function (e) { return e.id === id; })[0]; }

/** Commit + resolve one round directly on an encounter. */
function play(enc, playerMove) { enc.startRound(); return enc.resolveRound(playerMove); }
/** A player move that loses / wins / draws against `m`. */
function winVs(m) { return Rules.counterTo(m); }
function loseVs(m) { return { G: 'R', R: 'Y', Y: 'G' }[m]; } // the move m beats

console.log('Rules');
test('all nine matchups', function () {
  var expected = {
    GG: 'draw', GR: 'player', GY: 'enemy',
    RG: 'enemy', RR: 'draw', RY: 'player',
    YG: 'player', YR: 'enemy', YY: 'draw'
  };
  Object.keys(expected).forEach(function (k) {
    eq(Rules.resolve(k[0], k[1]), expected[k], 'player ' + k[0] + ' vs enemy ' + k[1]);
  });
});
test('Green beats Red, Red beats Yellow, Yellow beats Green', function () {
  ok(Rules.beats('G', 'R')); ok(Rules.beats('R', 'Y')); ok(Rules.beats('Y', 'G'));
  ok(!Rules.beats('R', 'G')); ok(!Rules.beats('Y', 'R')); ok(!Rules.beats('G', 'Y'));
});
test('invalid moves throw', function () {
  var threw = false; try { Rules.resolve('X', 'G'); } catch (e) { threw = true; } ok(threw);
});
test('explanations mention both abilities', function () {
  var def = byId('orc-recruit');
  var e = Rules.explain('player', 'G', 'R', def);
  ok(/Shield/.test(e.text) && /Cleave/.test(e.text), e.text);
  ok(/No damage/.test(Rules.explain('draw', 'R', 'R', def).text));
  ok(/You lose a heart/.test(Rules.explain('enemy', 'Y', 'R', def).text));
});

console.log('Enemy data');
test('11 enemies, required order, difficulty and hearts', function () {
  eq(ENEMIES.length, 11);
  eq(ENEMIES.map(function (e) { return e.name; }), ['Orc Recruit', 'Goblin Scout', 'Skeleton Guard', 'Orc Berserker',
    'Bandit Captain', 'Stone Troll', 'Dark Ranger', 'Wyvern', 'Warlock', 'Young Dragon', 'Ancient Dragon']);
  eq(ENEMIES.map(function (e) { return e.hearts; }), [2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 6]);
  eq(ENEMIES.map(function (e) { return e.difficulty; }), ['easy', 'easy', 'easy', 'medium', 'medium', 'medium',
    'hard', 'hard', 'hard', 'hard', 'boss']);
});
test('patterns match the design', function () {
  var expect = {
    'orc-recruit': ['R'], 'goblin-scout': ['G', 'R'], 'skeleton-guard': ['G', 'R', 'Y'],
    'orc-berserker': ['R', 'R', 'Y'], 'bandit-captain': ['G', 'Y', 'R'], 'stone-troll': ['G', 'G', 'R', 'Y'],
    'dark-ranger': ['R', 'Y', 'R', 'G'], 'wyvern': ['R', 'R', 'G', 'Y', 'Y', 'G'], 'warlock': ['Y', 'G', 'Y', 'R']
  };
  Object.keys(expect).forEach(function (id) { eq(byId(id).pattern, expect[id], id); });
  eq(byId('young-dragon').phases.map(function (p) { return p.pattern.join(''); }), ['GRY', 'GYR']);
  eq(byId('ancient-dragon').phases.map(function (p) { return p.pattern.join(''); }), ['GRY', 'RRGY', 'YGRG']);
});
test('every enemy names all three abilities with poses', function () {
  ENEMIES.forEach(function (e) {
    Rules.MOVES.forEach(function (m) { ok(e.abilities[m] && e.abilities[m].name && e.abilities[m].pose, e.id + ' ' + m); });
  });
});

console.log('Encounter');
test('each enemy repeats its sequence regardless of player choice (no-phase enemies)', function () {
  ENEMIES.filter(function (e) { return !e.phases; }).forEach(function (def) {
    // Draw every round so health never changes; compare to a different strategy.
    var a = new Encounter(def, CONFIG), b = new Encounter(def, CONFIG), seqA = [], seqB = [];
    for (var i = 0; i < def.pattern.length * 3; i++) {
      var ra = a.startRound(); seqA.push(ra.enemyMove); a.resolveRound(ra.enemyMove); // draw
      var rb = b.startRound(); seqB.push(rb.enemyMove); b.resolveRound('G');          // always shield
      if (b.isOver()) break;
    }
    var expected = [];
    for (var j = 0; j < seqA.length; j++) expected.push(def.pattern[j % def.pattern.length]);
    eq(seqA, expected, def.id + ' sequence');
    eq(seqB, expected.slice(0, seqB.length), def.id + ' sequence independent of player');
  });
});
test('draws deal no damage and still advance the pattern', function () {
  var enc = new Encounter(byId('skeleton-guard'), CONFIG);
  var r = play(enc, 'G');                 // enemy G -> draw
  eq(r.outcome, 'draw'); eq([enc.playerHp, enc.enemyHp], [5, 2]); eq(enc.seqIndex, 1);
  eq(enc.startRound().enemyMove, 'R');
});
test('a winning move removes exactly one heart', function () {
  var enc = new Encounter(byId('orc-recruit'), CONFIG);
  var r = play(enc, 'G');
  eq(r.outcome, 'player'); eq(enc.enemyHp, 1); eq(enc.playerHp, 5);
  r = play(enc, 'Y'); // Y vs R -> enemy wins
  eq(r.outcome, 'enemy'); eq(enc.playerHp, 4); eq(enc.enemyHp, 1);
});
test('damage applies only once per round', function () {
  var enc = new Encounter(byId('orc-recruit'), CONFIG);
  enc.startRound();
  ok(enc.resolveRound('G'));
  eq(enc.resolveRound('G'), null, 'second resolve ignored');
  eq(enc.resolveRound('Y'), null, 'even with another move');
  eq(enc.enemyHp, 1);
  // startRound is idempotent while unresolved
  var r1 = enc.startRound(), r2 = enc.startRound();
  eq(r1.id, r2.id); eq(enc.roundNo, 2);
});
test('health never drops below zero; no rounds after the end', function () {
  var enc = new Encounter(byId('orc-recruit'), CONFIG);
  for (var i = 0; i < 20; i++) play(enc, 'Y'); // always loses to R
  eq(enc.playerHp, 0); eq(enc.enemyHp, 2);
  eq(enc.startRound(), null); eq(enc.resolveRound('G'), null);
  var enc2 = new Encounter(byId('orc-recruit'), CONFIG);
  for (var k = 0; k < 20; k++) play(enc2, 'G');
  eq(enc2.enemyHp, 0); eq(enc2.playerHp, 5);
});
test('reset restores health, pattern, phase and history', function () {
  var enc = new Encounter(byId('ancient-dragon'), CONFIG);
  for (var i = 0; i < 6; i++) { var r = enc.startRound(); enc.resolveRound(winVs(r.enemyMove)); if (enc.enemyHp <= 3) break; }
  ok(enc.phaseIndex > 0);
  play(enc, 'Y');
  enc.reset();
  eq([enc.playerHp, enc.enemyHp, enc.phaseIndex, enc.seqIndex, enc.history.length], [5, 6, 0, 0, 0]);
  eq(enc.startRound().enemyMove, 'G');
});
test('Young Dragon switches to G,Y,R at two hearts and resets the sequence', function () {
  var enc = new Encounter(byId('young-dragon'), CONFIG), r, moves = [];
  r = enc.startRound(); moves.push(r.enemyMove); enc.resolveRound(r.enemyMove);           // draw (G)
  r = enc.startRound(); moves.push(r.enemyMove); var res = enc.resolveRound(winVs(r.enemyMove)); // R -> 3 hearts
  eq(res.phaseChange, null); eq(enc.enemyHp, 3);
  r = enc.startRound(); moves.push(r.enemyMove); res = enc.resolveRound(winVs(r.enemyMove));      // Y -> 2 hearts
  eq(moves, ['G', 'R', 'Y']);
  ok(res.phaseChange, 'phase change reported'); eq(res.phaseAfter, 1); eq(enc.seqIndex, 0);
  ok(/rhythm/.test(res.phaseChange.phase.announce));
  var next = []; for (var i = 0; i < 6; i++) { r = enc.startRound(); next.push(r.enemyMove); enc.resolveRound(r.enemyMove); }
  eq(next.join(''), 'GYRGYR');
});
test('Ancient Dragon phases: 6-5 GRY, 4-3 RRGY, 2-1 YGRG', function () {
  var enc = new Encounter(byId('ancient-dragon'), CONFIG), log = [], changes = [];
  function step(win) {
    var r = enc.startRound();
    log.push(enc.enemyHp + ':' + r.enemyMove);
    var res = enc.resolveRound(win ? winVs(r.enemyMove) : r.enemyMove);
    if (res.phaseChange) changes.push(enc.enemyHp + '->' + res.phaseAfter);
    return res;
  }
  step(false); step(true);          // 6:G draw, 6:R win -> 5
  step(false); step(false);         // 5:Y, 5:G   (phase 1 continues)
  eq(enc.phaseIndex, 0);
  step(true);                       // 5:R win -> 4  => phase 2
  eq(enc.phaseIndex, 1); eq(enc.seqIndex, 0);
  step(false); step(true);          // 4:R draw, 4:R win -> 3 (still phase 2)
  eq(enc.phaseIndex, 1);
  step(false); step(true);          // 3:G draw, 3:Y win -> 2 => phase 3
  eq(enc.phaseIndex, 2); eq(enc.seqIndex, 0);
  step(false); step(false); step(false); step(true); // 2:Y,2:G,2:R draw, 2:G win -> 1
  step(true);                       // 1:Y win -> 0
  eq(log, ['6:G', '6:R', '5:Y', '5:G', '5:R', '4:R', '4:R', '3:G', '3:Y', '2:Y', '2:G', '2:R', '2:G', '1:Y']);
  eq(changes, ['4->1', '2->2']);
  eq(enc.enemyHp, 0);
});
test('no phase change is reported on the killing blow', function () {
  var enc = new Encounter(byId('young-dragon'), CONFIG);
  enc.enemyHp = 1; enc.phaseIndex = 1; enc.seqIndex = 0;
  var r = enc.startRound(), res = enc.resolveRound(winVs(r.enemyMove));
  eq(res.enemyDefeated, true); eq(res.phaseChange, null);
});

console.log('Hints');
test('easy shows label throughout, medium only in the final 2s, hard/boss never', function () {
  for (var t = 5; t >= 0; t -= 0.25) {
    var e = Rules.hintFor('easy', 'R', t, CONFIG), m = Rules.hintFor('medium', 'R', t, CONFIG);
    var h = Rules.hintFor('hard', 'R', t, CONFIG), b = Rules.hintFor('boss', 'R', t, CONFIG);
    ok(e.label && e.aura === 'full');
    eq(m.label, t <= 2, 'medium label at ' + t); ok(m.pose);
    ok(!h.label && h.aura === 'accent' && h.pose); ok(!b.label && b.aura === 'accent');
    eq([e.move, m.move, h.move, b.move], ['R', 'R', 'R', 'R']);
  }
});
test('game hint always describes the committed move', function () {
  ENEMIES.forEach(function (def, i) {
    var g = new Game(ENEMIES, CONFIG); g.startGame(i); g.startBattle();
    for (var k = 0; k < 6 && g.state === S.COUNTDOWN; k++) {
      var committed = g.round.enemyMove;
      for (var s = 0; s < 50 && g.state === S.COUNTDOWN; s++) { eq(g.currentHint().move, committed); g.update(0.1); }
      while (g.state !== S.COUNTDOWN && g.state !== S.LOST && g.state !== S.ENCOUNTER_WON && g.state !== S.FINAL_WIN) g.update(0.1);
    }
  });
});

console.log('Game state machine');
function newGame(i) { var g = new Game(ENEMIES, CONFIG); g.startGame(i || 0); return g; }
function runUntil(g, pred, dt, max) { for (var n = 0; n < (max || 5000) && !pred(); n++) g.update(dt || 0.05); ok(pred(), 'condition not reached, state=' + g.state); }

test('round start: enemy move committed, Shield selected, 5 second countdown', function () {
  var g = newGame(0); eq(g.state, S.INTRO); ok(!g.select('R'), 'no input in intro');
  var committed = null; g.on('roundStart', function (r) { committed = r.enemyMove; });
  g.startBattle();
  eq(g.state, S.COUNTDOWN); eq(committed, 'R'); eq(g.selected, 'G'); eq(g.timeLeft, 5);
});
test('selection can change during countdown, is locked afterwards', function () {
  var g = newGame(0); g.startBattle();
  ok(g.select('R')); ok(g.select('Y')); ok(g.select('G')); eq(g.selected, 'G');
  runUntil(g, function () { return g.state === S.RESOLVING; });
  ok(!g.select('Y')); eq(g.lastResult.playerMove, 'G');
});
test('no input at all resolves with Shield', function () {
  var g = newGame(0); g.startBattle();
  runUntil(g, function () { return g.state === S.RESOLVING; });
  eq(g.lastResult.playerMove, 'G'); eq(g.lastResult.outcome, 'player'); // Shield beats Cleave
});
test('countdown takes 5 seconds and emits 5..1 ticks', function () {
  var g = newGame(0), ticks = []; g.on('tick', function (s) { ticks.push(s); }); g.startBattle();
  var t = 0; while (g.state === S.COUNTDOWN) { g.update(0.01); t += 0.01; }
  eq(ticks, [5, 4, 3, 2, 1]); ok(Math.abs(t - 5) < 0.02, 'took ' + t);
});
test('each round applies damage exactly once, even with huge frame steps', function () {
  var g = newGame(3), resolves = 0, impacts = 0, hpChanges = 0, last = null;
  g.on('resolve', function () { resolves++; }); g.on('impact', function () { impacts++; });
  g.startBattle();
  last = [g.encounter.playerHp, g.encounter.enemyHp];
  for (var n = 0; n < 400 && g.state !== S.ENCOUNTER_WON && g.state !== S.LOST; n++) {
    if (g.state === S.PHASE) g.skipPhaseBanner();
    g.update(n % 2 ? 7 : 0.3);                   // deliberately enormous steps
    var now = [g.encounter.playerHp, g.encounter.enemyHp];
    var diff = (last[0] - now[0]) + (last[1] - now[1]);
    ok(diff === 0 || diff === 1, 'at most one heart per update, got ' + diff);
    if (diff) hpChanges++;
    last = now;
  }
  eq(resolves, impacts, 'one impact per resolve');
  ok(hpChanges <= resolves);
});
test('pause freezes the clock and blocks input until resume', function () {
  var g = newGame(0); g.startBattle(); g.update(1);
  var left = g.timeLeft;
  ok(g.pause()); ok(!g.pause(), 'already paused');
  g.update(10); eq(g.timeLeft, left); ok(!g.select('R'));
  ok(!g.startBattle()); ok(g.resume()); g.update(0.5); ok(g.timeLeft < left);
});
test('cannot pause outside battle', function () {
  var g = new Game(ENEMIES, CONFIG); ok(!g.pause()); g.showTutorial(); ok(!g.pause());
});
test('losing leads to LOST; retry resets encounter, pattern and both health values', function () {
  var g = newGame(4); g.startBattle(); // Bandit Captain G,Y,R
  // lose every round
  runUntil(g, function () {
    if (g.state === S.COUNTDOWN) g.select(loseVs(g.round.enemyMove));
    if (g.state === S.PHASE) g.skipPhaseBanner();
    return g.state === S.LOST;
  }, 0.1);
  eq(g.encounter.playerHp, 0);
  ok(g.retry());
  eq(g.state, S.COUNTDOWN); eq(g.encounter.playerHp, 5); eq(g.encounter.enemyHp, 3);
  eq(g.encounter.seqIndex, 0); eq(g.round.enemyMove, 'G'); eq(g.encounter.history, []);
});
test('retry from the pause menu also resets', function () {
  var g = newGame(1); g.startBattle();
  runUntil(g, function () { return g.state === S.RESOLVING; }); g.update(3);
  g.pause(); ok(g.retry()); ok(!g.paused);
  eq([g.encounter.playerHp, g.encounter.enemyHp, g.encounter.seqIndex], [5, 2, 0]);
});
test('full playthrough with perfect counters reaches the final victory; health restored each encounter', function () {
  var g = new Game(ENEMIES, CONFIG), states = [], phases = 0, introHp = [];
  g.on('phase', function () { phases++; });
  g.on('state', function (s) { states.push(s); if (s === S.INTRO) introHp.push(g.encounter.playerHp); });
  g.startGame(0);
  runUntil(g, function () {
    if (g.state === S.INTRO) g.startBattle();
    if (g.state === S.COUNTDOWN) {
      // Make the player lose some rounds early in each encounter so health varies.
      var move = g.encounter.roundNo % 3 === 1 && g.encounter.playerHp > 2 ? loseVs(g.round.enemyMove) : winVs(g.round.enemyMove);
      g.select(move);
    }
    if (g.state === S.ENCOUNTER_WON) g.continueToNext();
    return g.state === S.FINAL_WIN;
  }, 0.1, 100000);
  eq(g.defeated, 11);
  eq(introHp.length, 11); introHp.forEach(function (hp) { eq(hp, 5); });
  eq(phases, 3, 'young dragon once + ancient dragon twice');
});
test('phase banner is shown between rounds and the next countdown uses the new pattern', function () {
  var g = newGame(10); g.startBattle(); var seen = [];
  runUntil(g, function () {
    if (g.state === S.COUNTDOWN && g.round.id !== (seen[seen.length - 1] || {}).id) {
      seen.push({ id: g.round.id, hp: g.encounter.enemyHp, move: g.round.enemyMove, phase: g.round.phaseIndex });
      g.select(winVs(g.round.enemyMove));
    }
    return g.state === S.FINAL_WIN;
  }, 0.1);
  eq(seen.map(function (s) { return s.hp + s.move; }), ['6G', '5R', '4R', '3R', '2Y', '1G']);
  eq(seen.map(function (s) { return s.phase; }), [0, 0, 1, 1, 2, 2]);
});

console.log('Audio data');
require(path.join(__dirname, '..', 'js/audio/audio.js'));
test('music tracks: lead and bass loop together and every note parses', function () {
  var T = RK.Sound.TRACKS;
  ['main', 'boss'].forEach(function (name) {
    var tr = T[name];
    eq(tr.lead.length, tr.bass.length, name + ' lead/bass length');
    eq(tr.lead.length % tr.drums.length, 0, name + ' drum pattern fits');
    tr.lead.concat(tr.bass).forEach(function (n) { ok(n === '-' || n === '.' || RK.Sound.freq(n) > 20, name + ' bad note ' + n); });
  });
  ok(T.boss.step < T.main.step, 'boss theme is faster');
});
test('audio does nothing before a user gesture', function () {
  eq(RK.Sound.isReady(), false);
  RK.Sound.playMusic('main'); RK.Sound.sfx('hit');   // must not throw or create a context
  eq(RK.Sound.isReady(), false); eq(RK.Sound.currentMusic(), null);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
