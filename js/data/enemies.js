/*
 * Ranger Knight — enemy roster (pure data).
 *
 * Every enemy uses the same combat rules. To change an enemy edit its entry:
 *   hearts     enemy health for that encounter
 *   pattern    repeating move sequence (G = green, R = red, Y = yellow)
 *   phases     optional: replaces `pattern` for enemies that change tactics.
 *              Each phase applies while enemy hearts <= maxHearts. List them from
 *              highest maxHearts to lowest. Changing phase resets the sequence.
 *              On Hard/boss enemies a phase can set `glint: false` to hide the
 *              small coloured glint, leaving only the preparation pose as the hint.
 *   abilities  display names + pose descriptions for G / R / Y
 *   art        parameters for the placeholder drawings in js/view/art.js
 *   scene      background used by js/view/art.js (meadow, forest, crypt, camp, mountain, lair)
 *   attackFx   optional red-attack effect: slash (default), arrow, bolt, claw, sting
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  RK.ENEMIES = [
    {
      id: 'orc-recruit', name: 'Orc Recruit', difficulty: 'easy', hearts: 2, scene: 'meadow',
      blurb: 'A young orc on its very first raid. It only knows one trick.',
      abilities: {
        G: { name: 'Guard', pose: 'Hunches behind its round shield' },
        R: { name: 'Cleave', pose: 'Hoists its axe high overhead' },
        Y: { name: 'War Cry', pose: 'Throws its head back, jaw open' }
      },
      pattern: ['R'],
      art: { type: 'humanoid', scale: 1.15, head: 'orc', headgear: 'cap', skin: '#79a94a', skinDark: '#4e7a2c',
        armor: '#7b5a3a', cloth: '#a5482c', pants: '#4a3a2a', boots: '#2c2118', weapon: 'axe', shield: 'round', eyes: '#f4e04d' }
    },
    {
      id: 'goblin-scout', name: 'Goblin Scout', difficulty: 'easy', hearts: 2, scene: 'forest',
      blurb: 'Quick and twitchy. It alternates between hiding and stabbing.',
      abilities: {
        G: { name: 'Duck & Cover', pose: 'Crouches low behind a tiny buckler' },
        R: { name: 'Dagger Jab', pose: 'Draws its dagger back to stab' },
        Y: { name: 'Shriek', pose: 'Leans back with mouth wide' }
      },
      pattern: ['G', 'R'],
      art: { type: 'humanoid', scale: 0.95, head: 'goblin', skin: '#9aa83e', skinDark: '#6a7826',
        armor: '#5d4a35', cloth: '#4f6b3a', pants: '#3c3326', boots: '#231b14', weapon: 'dagger', shield: 'buckler', eyes: '#f7e03c' }
    },
    {
      id: 'skeleton-guard', name: 'Skeleton Guard', difficulty: 'easy', hearts: 2, scene: 'crypt',
      blurb: 'It drills the same three moves it learned centuries ago.',
      abilities: {
        G: { name: 'Bone Shield', pose: 'Raises its battered shield' },
        R: { name: 'Rusty Slash', pose: 'Lifts its notched sword high' },
        Y: { name: 'Death Rattle', pose: 'Tilts its skull back, jaw hanging' }
      },
      pattern: ['G', 'R', 'Y'],
      art: { type: 'humanoid', scale: 1.15, head: 'skull', body: 'bones', skin: '#e8e2cc', skinDark: '#b9b197',
        armor: '#6f6455', cloth: '#5a5246', pants: '#d6cfb5', boots: '#7b6a55', weapon: 'sword', blade: '#9a8a6a', shield: 'round', shieldColor: '#6b5b45', eyes: '#7fe0ff' }
    },
    {
      id: 'orc-berserker', name: 'Orc Berserker', difficulty: 'medium', hearts: 3, scene: 'meadow',
      blurb: 'Loves to swing twice before it remembers to howl.',
      abilities: {
        G: { name: 'Iron Hide', pose: 'Crosses its arms and braces' },
        R: { name: 'Frenzy Chop', pose: 'Winds its great axe back' },
        Y: { name: 'Blood Howl', pose: 'Puffs its chest and rears its head' }
      },
      pattern: ['R', 'R', 'Y'],
      art: { type: 'humanoid', scale: 1.3, head: 'orc', headgear: 'horns', skin: '#5f9a3e', skinDark: '#3c6a24',
        armor: '#55473a', cloth: '#7a1f1f', pants: '#3a2c22', boots: '#1f1712', weapon: 'axe', shield: 'none', eyes: '#ff5a3a' }
    },
    {
      id: 'bandit-captain', name: 'Bandit Captain', difficulty: 'medium', hearts: 3, scene: 'camp',
      blurb: 'A showy duellist: parry, rally, then lunge.',
      abilities: {
        G: { name: 'Parry', pose: 'Holds its sabre crosswise in guard' },
        R: { name: 'Sabre Lunge', pose: 'Pulls its sabre back, weight forward' },
        Y: { name: 'Rally Cry', pose: 'Raises its chin and shouts' }
      },
      pattern: ['G', 'Y', 'R'],
      art: { type: 'humanoid', scale: 1.15, head: 'hat', skin: '#d9a37a', skinDark: '#4a2a18',
        armor: '#6b3b2a', cloth: '#2f5d8a', pants: '#3a3340', boots: '#20181c', weapon: 'sabre', shield: 'buckler', eyes: '#2a1a10' }
    },
    {
      id: 'stone-troll', name: 'Stone Troll', difficulty: 'medium', hearts: 3, scene: 'mountain',
      blurb: 'Slow and stubborn. It likes to turtle up twice.',
      abilities: {
        G: { name: 'Boulder Guard', pose: 'Curls behind its stone forearms' },
        R: { name: 'Club Smash', pose: 'Heaves its club over its shoulder' },
        Y: { name: 'Rumble Roar', pose: 'Juts its jaw out and inhales' }
      },
      pattern: ['G', 'G', 'R', 'Y'],
      art: { type: 'humanoid', scale: 1.55, head: 'troll', wide: true, skin: '#8a9488', skinDark: '#5c665a',
        armor: '#6f7a6c', cloth: '#6b5a3a', pants: '#4e5a4c', boots: '#3a443a', weapon: 'club', shield: 'none', eyes: '#ffcf4a' }
    },
    {
      id: 'dark-ranger', name: 'Dark Ranger', difficulty: 'hard', hearts: 4, scene: 'forest',
      blurb: 'A rival archer. Its rhythm is subtle — watch the bow.',
      abilities: {
        G: { name: 'Shadow Cloak', pose: 'Pulls its cloak across its body' },
        R: { name: 'Piercing Shot', pose: 'Draws the bowstring to its cheek' },
        Y: { name: "Hunter's Call", pose: 'Lifts its head to call out' }
      },
      pattern: ['R', 'Y', 'R', 'G'],
      attackFx: 'arrow',
      art: { type: 'humanoid', scale: 1.15, head: 'hood', skin: '#c79a78', skinDark: '#1a1522',
        armor: '#2e3b2e', cloth: '#243024', pants: '#2a2a2a', boots: '#161616', weapon: 'bow', shield: 'none', guardFx: 'cloak', eyes: '#c8ff6a' }
    },
    {
      id: 'wyvern', name: 'Wyvern', difficulty: 'hard', hearts: 4, scene: 'mountain',
      blurb: 'A long, winding pattern. Count carefully.',
      abilities: {
        G: { name: 'Wing Shield', pose: 'Folds its wings across its chest' },
        R: { name: 'Tail Sting', pose: 'Arches its barbed tail over its back' },
        Y: { name: 'Screech', pose: 'Stretches its neck up high' }
      },
      pattern: ['R', 'R', 'G', 'Y', 'Y', 'G'],
      attackFx: 'sting',
      art: { type: 'dragon', kind: 'wyvern', scale: 1.0, body: '#4f7f6a', bodyDark: '#355a4a', belly: '#c9c08a',
        wing: '#6f9a5a', wingDark: '#3f6a4a', horn: '#e8e0c8', eyes: '#ffe14a' }
    },
    {
      id: 'warlock', name: 'Warlock', difficulty: 'hard', hearts: 4, scene: 'crypt',
      blurb: 'Chants twice as often as it casts. Listen for the rhythm.',
      abilities: {
        G: { name: 'Hex Barrier', pose: 'Thrusts an open palm forward' },
        R: { name: 'Shadow Bolt', pose: 'Levels its staff at you' },
        Y: { name: 'Dread Chant', pose: 'Raises its staff skyward and chants' }
      },
      pattern: ['Y', 'G', 'Y', 'R'],
      attackFx: 'bolt',
      art: { type: 'humanoid', scale: 1.2, head: 'warlock', skin: '#b7a3c9', skinDark: '#140d1c',
        armor: '#3d2752', cloth: '#5a2f7a', pants: '#2a1a3a', boots: '#150d1d', weapon: 'staff', orb: '#b26bff', shield: 'none', guardFx: 'barrier', eyes: '#e07bff' }
    },
    {
      id: 'young-dragon', name: 'Young Dragon', difficulty: 'hard', hearts: 4, scene: 'lair',
      blurb: 'Fierce but predictable — until it gets desperate.',
      abilities: {
        G: { name: 'Scale Guard', pose: 'Wraps its wings around itself' },
        R: { name: 'Claw Strike', pose: 'Drops its head low, one claw raised high' },
        Y: { name: 'Roar', pose: 'Lifts its head, chest swelling' }
      },
      phases: [
        { maxHearts: 4, pattern: ['G', 'R', 'Y'] },
        { maxHearts: 2, pattern: ['G', 'Y', 'R'], title: 'Change of Tactics!',
          announce: 'The Young Dragon is desperate — it has switched to a new rhythm!' }
      ],
      attackFx: 'claw',
      art: { type: 'dragon', kind: 'dragon', scale: 1.05, body: '#3f6fb0', bodyDark: '#2a4a80', belly: '#e0c98a',
        wing: '#5a86c8', wingDark: '#2f4f86', horn: '#f0e6c8', eyes: '#ffe14a' }
    },
    {
      id: 'ancient-dragon', name: 'Ancient Dragon', difficulty: 'boss', hearts: 6, scene: 'lair',
      blurb: 'The final foe. It changes tactics twice as it weakens.',
      abilities: {
        G: { name: 'Ancient Scales', pose: 'Wraps its vast wings around itself' },
        R: { name: 'Rending Claws', pose: 'Drops its head low, one claw raised high' },
        Y: { name: 'Thunder Roar', pose: 'Rears its head high, jaws wide open' }
      },
      phases: [
        { maxHearts: 6, pattern: ['G', 'R', 'Y'], title: 'Phase 1 — The Ancient Wakes' },
        { maxHearts: 4, pattern: ['R', 'R', 'G', 'Y'], title: 'Phase 2 — Molten Fury',
          announce: 'Its scales glow like embers. A new rhythm begins!' },
        { maxHearts: 2, pattern: ['Y', 'G', 'R', 'G'], title: 'Phase 3 — Last Inferno',
          announce: 'Wings torn and blazing, it fights with everything left!',
          glint: false }  // last phase: no coloured glint, read the poses alone
      ],
      attackFx: 'claw',
      art: { type: 'dragon', kind: 'ancient', scale: 1.3, horn: '#f3e7c4',
        phaseLooks: [
          { body: '#8a2f2a', bodyDark: '#5e1c1a', belly: '#d9b06a', wing: '#a5463a', wingDark: '#6a2420', eyes: '#ffd84a', glow: null },
          { body: '#9a3a1e', bodyDark: '#621f12', belly: '#f0b050', wing: '#c0552a', wingDark: '#7a2a14', eyes: '#ff9a2a', glow: '#ff9a2a' },
          // Phase 3 eyes are white-hot, not a move colour, so they never read as a hint.
          { body: '#4a1a22', bodyDark: '#2a0c12', belly: '#ff7a3a', wing: '#6a2028', wingDark: '#38101a', eyes: '#fff4e0', glow: '#ff5a1a', torn: true, embers: true }
        ] }
    }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
