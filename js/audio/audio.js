/*
 * Ranger Knight — placeholder 8-bit audio, synthesised with Web Audio.
 * No audio files. The AudioContext is only created after a user gesture.
 *
 * Music: two original looping tracks ('main', 'boss') described as note
 * lists below. Only one track can play at a time; asking for the track that
 * is already playing does nothing, so loops never overlap.
 *
 * To use real audio files later, replace sfx() and playMusic() with
 * HTMLAudioElement / AudioBuffer playback keeping the same names.
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  var ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  var settings = { volume: 0.6, muted: false };
  var music = { name: null, timer: null, gain: null, track: null, step: 0, nextTime: 0 };
  var wantedMusic = null;

  /* ---------- notes ---------- */
  var SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function freq(note) {
    var m = /^([A-G])(#|b)?(\d)$/.exec(note);
    if (!m) return 0;
    var n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }
  function seq(str) { return str.trim().split(/\s+/); }

  /* ---------- original placeholder tracks ---------- */
  // '-' holds the previous note, '.' is a rest. One token per step.
  var TRACKS = {
    // Main theme: a jaunty 6/8 tune in D dorian.
    main: {
      step: 0.19,
      lead: seq(
        'A4 - D5 E5 - F5  G5 - F5 E5 - D5  C5 - E5 G5 - E5  D5 - - A4 - - ' +
        'A4 - D5 E5 - F5  G5 - A5 C6 - A5  G5 - E5 C5 - E5  D5 - - - - . ' +
        'F5 - E5 D5 - C5  D5 - E5 F5 - G5  A5 - G5 F5 - E5  D5 - - E5 - - ' +
        'F5 - G5 A5 - C6  A5 - G5 F5 - E5  D5 - C5 E5 - C5  D5 - - - - .'),
      bass: seq(
        'D3 - - A2 - -  G2 - - D3 - -  C3 - - G2 - -  D3 - - A2 - - ' +
        'D3 - - A2 - -  F3 - - C3 - -  C3 - - G2 - -  D3 - - D3 - - ' +
        'F3 - - C3 - -  D3 - - A2 - -  F3 - - C3 - -  D3 - - A2 - - ' +
        'F3 - - C3 - -  D3 - - A2 - -  C3 - - G2 - -  D3 - - D3 - -'),
      drums: 'k.hs.h',
      leadType: 'square', leadVol: 0.07, bassType: 'triangle', bassVol: 0.16
    },
    // Final boss: a driving 4/4 riff in E minor with a pounding bass ostinato.
    boss: {
      step: 0.15,
      lead: seq(
        'E5 - - B4 - - E5 F5  G5 - F5 E5 - D#5 E5 -  C5 - - E5 - - G5 -  F5 - E5 D5 - C5 B4 - ' +
        'E5 - - B4 - - E5 F5  G5 - A5 B5 - A5 G5 -  A5 - G5 F5 - E5 C5 -  B4 - - D#5 - - B4 -'),
      bass: seq(
        'E2 E2 E3 E2 E2 E3 F2 E2  E2 E2 E3 E2 E2 E3 F2 E2  C2 C2 C3 C2 C2 C3 D2 C2  D2 D2 D3 D2 B1 B1 B2 B1 ' +
        'E2 E2 E3 E2 E2 E3 F2 E2  E2 E2 E3 E2 E2 E3 F2 E2  A1 A1 A2 A1 C2 C2 C3 C2  B1 B1 B2 B1 B1 B1 D#2 B1'),
      drums: 'khskkhsh',
      leadType: 'square', leadVol: 0.07, bassType: 'sawtooth', bassVol: 0.07
    }
  };

  /* ---------- setup ---------- */
  function init() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    master = ctx.createGain();
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.7; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    if (wantedMusic) startMusic(wantedMusic.name, wantedMusic.delay);
    return true;
  }

  function applyVolume() {
    if (!master) return;
    var v = settings.muted ? 0 : settings.volume * 0.55;
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }

  /* ---------- voices ---------- */
  function tone(f, start, dur, type, vol, bus, slideTo) {
    if (!ctx || !f) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(start); o.stop(start + dur + 0.02);
  }

  function noise(start, dur, vol, bus, filterType, filterFreq, filterTo) {
    if (!ctx) return;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = filterType || 'lowpass'; f.frequency.setValueAtTime(filterFreq || 2000, start);
    if (filterTo) f.frequency.exponentialRampToValueAtTime(filterTo, start + dur);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(start, Math.random() * 0.5); src.stop(start + dur + 0.02);
  }

  /* ---------- music ---------- */
  function noteLength(list, i) {
    var n = 1;
    while (list[(i + n) % list.length] === '-' && n < list.length) n++;
    return n;
  }

  function scheduleStep(tr, i, time, bus) {
    var L = tr.lead[i % tr.lead.length], B = tr.bass[i % tr.bass.length];
    if (L !== '-' && L !== '.') tone(freq(L), time, noteLength(tr.lead, i % tr.lead.length) * tr.step * 0.92, tr.leadType, tr.leadVol, bus);
    if (B !== '-' && B !== '.') tone(freq(B), time, noteLength(tr.bass, i % tr.bass.length) * tr.step * 0.9, tr.bassType, tr.bassVol, bus);
    var D = tr.drums[i % tr.drums.length];
    if (D === 'k') tone(150, time, 0.12, 'sine', 0.25, bus, 45);
    else if (D === 's') noise(time, 0.1, 0.12, bus, 'bandpass', 1800);
    else if (D === 'h') noise(time, 0.03, 0.05, bus, 'highpass', 7000);
  }

  function scheduler() {
    if (!ctx || !music.track) return;
    if (music.nextTime < ctx.currentTime - 0.25) music.nextTime = ctx.currentTime + 0.05; // recover after a stall
    while (music.nextTime < ctx.currentTime + 0.15) {
      scheduleStep(music.track, music.step, music.nextTime, music.gain);
      music.nextTime += music.track.step;
      music.step = (music.step + 1) % music.track.lead.length;
    }
  }

  function startMusic(name, delay) {
    stopMusic();
    if (!TRACKS[name]) return;
    music.name = name;
    music.track = TRACKS[name];
    music.gain = ctx.createGain();
    music.gain.gain.value = 1;
    music.gain.connect(musicBus);
    music.step = 0;
    music.nextTime = ctx.currentTime + 0.08 + (delay || 0);
    music.timer = setInterval(scheduler, 40);
    scheduler();
  }

  function stopMusic() {
    if (music.timer) clearInterval(music.timer);
    music.timer = null;
    if (music.gain && ctx) {
      // Fade the old track's bus out; notes already scheduled on it go silent.
      music.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    }
    music.gain = null; music.track = null; music.name = null;
  }

  /** Play a looping track (or null for silence). Same track → no restart. */
  function playMusic(name, delay) {
    wantedMusic = name ? { name: name, delay: delay } : null;
    if (!ctx) return;
    if (!name) { stopMusic(); return; }
    if (music.name === name && music.timer) return;
    startMusic(name, delay);
  }

  /* ---------- sound effects ---------- */
  var SFX = {
    select: function (t) { tone(660, t, 0.05, 'square', 0.12); tone(990, t + 0.045, 0.06, 'square', 0.1); },
    tick: function (t, n) { tone(n === 1 ? 880 : 520, t, 0.09, 'triangle', 0.28); },
    swing: function (t) { noise(t, 0.18, 0.3, sfxBus, 'bandpass', 3000, 600); },
    cry: function (t) { tone(220, t, 0.38, 'square', 0.1, sfxBus, 440); tone(330, t, 0.38, 'square', 0.07, sfxBus, 660); },
    guard: function (t) { tone(160, t, 0.12, 'triangle', 0.3, sfxBus, 110); },
    block: function (t) { tone(1250, t, 0.14, 'square', 0.08); tone(1870, t, 0.1, 'square', 0.06); noise(t, 0.05, 0.25, sfxBus, 'highpass', 4000); },
    hit: function (t) { noise(t, 0.2, 0.45, sfxBus, 'lowpass', 1400, 200); tone(140, t, 0.2, 'sine', 0.35, sfxBus, 55); },
    hurt: function (t) { noise(t, 0.22, 0.45, sfxBus, 'lowpass', 900, 150); tone(220, t, 0.25, 'square', 0.12, sfxBus, 90); },
    clash: function (t) { tone(900, t, 0.12, 'square', 0.08); tone(1350, t, 0.12, 'square', 0.06); noise(t, 0.08, 0.2, sfxBus, 'bandpass', 3000); },
    victory: function (t) {
      ['C5', 'E5', 'G5', 'C6'].forEach(function (n, i) { tone(freq(n), t + i * 0.11, 0.16, 'square', 0.12); });
      tone(freq('G5'), t + 0.44, 0.5, 'square', 0.1); tone(freq('C6'), t + 0.44, 0.5, 'triangle', 0.15);
    },
    defeat: function (t) {
      ['G4', 'F4', 'D#4', 'C4'].forEach(function (n, i) { tone(freq(n), t + i * 0.22, 0.3, 'triangle', 0.22); });
    },
    phase: function (t) { noise(t, 0.9, 0.35, sfxBus, 'lowpass', 600, 80); tone(90, t, 0.9, 'sawtooth', 0.08, sfxBus, 45); },
    fanfare: function (t) {
      [['C5', 0], ['C5', 0.15], ['C5', 0.3], ['G5', 0.45], ['E5', 0.75], ['G5', 0.9], ['C6', 1.05]].forEach(function (n) {
        tone(freq(n[0]), t + n[1], 0.25, 'square', 0.11);
      });
      tone(freq('C4'), t + 1.05, 0.8, 'triangle', 0.2);
    }
  };

  function sfx(name, arg) {
    if (!ctx || !SFX[name] || ctx.state !== 'running') return;
    SFX[name](ctx.currentTime + 0.01, arg);
  }

  RK.Sound = {
    /** Call from a user gesture (click / key / touch). Safe to call repeatedly. */
    unlock: function () {
      if (!init()) return;
      if (ctx.state === 'suspended' && !RK.Sound._held) ctx.resume();
    },
    playMusic: playMusic,
    stopMusic: function () { playMusic(null); },
    sfx: sfx,
    /** Freeze all audio (pause menu / hidden tab). */
    suspend: function () { RK.Sound._held = true; if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { RK.Sound._held = false; if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setVolume: function (v) { settings.volume = Math.max(0, Math.min(1, v)); applyVolume(); },
    setMuted: function (m) { settings.muted = !!m; applyVolume(); },
    isReady: function () { return !!ctx; },
    /** Diagnostics used by tests: the track data and which track is looping. */
    TRACKS: TRACKS,
    freq: freq,
    currentMusic: function () { return music.timer ? music.name : null; },
    _held: false
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
