/*
 * Ranger Knight — tunable configuration.
 * Change countdown length, player health and animation timings here.
 * Enemy health and patterns live in js/data/enemies.js.
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  RK.CONFIG = {
    playerHearts: 5,          // player health, restored at the start of every encounter
    countdownSeconds: 5,      // length of every round's countdown (also used by the boss)
    mediumRevealSeconds: 2,   // Medium enemies reveal their move in the final N seconds
    historyLength: 3,         // how many resolved enemy moves the HUD shows

    // Durations (seconds) of the non-interactive states. All timing runs on the
    // game clock, so pausing freezes everything.
    timings: {
      resolve: 2.3,           // attack animation + result explanation
      impactAt: 0.55,         // moment inside "resolve" when hits land (hearts update)
      phaseAnnounce: 3.4,     // boss phase / tactic change banner
      enemyDefeated: 1.8,     // victory animation before the Continue panel
      playerDefeated: 1.8     // defeat animation before the lose panel
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
