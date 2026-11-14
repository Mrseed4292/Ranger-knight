/*
 * Ranger Knight — battlefield renderer.
 * Reads the game state each frame and draws it. Every animation is a pure
 * function of game.stateTime, so pausing the game freezes the picture and
 * changing state can never leave a stray animation running.
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};
  var Art = RK.Art, Rules = RK.Rules;
  var S = RK.Game.STATES;

  var W = 384, H = 216, GROUND = 196, KX = 96, EX = 290;
  var ZOOM = 1.3; // characters are drawn 30% larger on the battlefield than in previews
  var lerp = Art.lerp, clamp01 = Art.clamp01;
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  function Renderer(canvas, game, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.settings = settings;
    canvas.width = W; canvas.height = H;
  }

  function enemyMetrics(spec, zoom) {
    var s = (spec.scale || 1) * (zoom || 1);
    if (spec.type === 'dragon') return { reach: 46 * s, mouth: { x: 30 * s, y: -60 * s }, chest: -30 * s, height: 80 * s, width: 40 * s };
    return { reach: 30 * s, mouth: { x: 8 * s, y: -32 * s }, chest: -22 * s, height: 42 * s, width: 14 * s };
  }
  var KNIGHT_M = { reach: 36 * ZOOM, mouth: { x: 8 * ZOOM, y: -40 * ZOOM }, chest: -26 * ZOOM, height: 50 * ZOOM, width: 16 * ZOOM };

  /** Action intensity during the resolve animation. */
  function actCurve(t, impact) {
    if (t < 0.12) return 0;
    if (t < impact) return smooth((t - 0.12) / (impact - 0.12));
    if (t < impact + 0.35) return 1;
    return 1 - smooth((t - impact - 0.35) / 0.45);
  }

  Renderer.prototype.render = function () {
    var g = this.game, ctx = this.ctx;
    if (!g.encounter) return;
    var def = g.encounter.def, spec = def.art, st = g.state, t = g.stateTime;
    var rm = !!this.settings.reducedMotion;
    var tim = g.cfg.timings, impact = tim.impactAt;
    var em = enemyMetrics(spec, ZOOM);
    var es = (spec.scale || 1) * ZOOM;

    var k = { stance: 'idle', act: 0, dx: 0, dy: 0, flash: 0, lying: 0, alpha: 1 };
    var e = { stance: 'idle', act: 0, dx: 0, dy: 0, flash: 0, lying: 0, alpha: 1, accent: null,
      phase: g.encounter.phaseIndex, time: t };
    var fx = [];            // effect draw callbacks (after characters)
    var shake = 0;
    var aura = null;        // colour behind the enemy

    function hop(phase) { return rm ? 0 : -Math.abs(Math.sin(t * Math.PI * 2.2 + phase)) * 3; }

    if (st === S.COUNTDOWN) {
      var hint = g.currentHint();
      k.dy = hop(0); e.dy = hop(1.3);
      e.stance = hint.move; e.act = 0;
      if (hint.aura === 'full') aura = Rules.MOVE_INFO[hint.move].hex;
      if (hint.aura === 'accent') e.accent = Rules.MOVE_INFO[hint.move].hex;
    } else if (st === S.RESOLVING && g.lastResult) {
      var r = g.lastResult;
      e.phase = r.phaseBefore;
      var a = actCurve(t, impact);
      var gap = EX - KX;
      var ranged = def.attackFx === 'arrow' || def.attackFx === 'bolt';
      var kStep = { G: 10, R: 0, Y: -3 }[r.playerMove], eStep = { G: 10, R: 0, Y: -3 }[r.enemyMove];
      var kAdv = kStep, eAdv = eStep;
      if (r.playerMove === 'R' && r.enemyMove === 'R' && !ranged) {
        kAdv = eAdv = (gap - (KNIGHT_M.reach + em.reach) / 2 - em.width / 2) / 2;
      } else {
        if (r.playerMove === 'R') kAdv = gap - (r.enemyMove === 'R' ? 8 : eStep) - KNIGHT_M.reach - em.width;
        if (r.enemyMove === 'R') eAdv = ranged ? 6 : gap - kStep - em.reach - KNIGHT_M.width;
      }
      if (rm) { kAdv *= 0.35; eAdv *= 0.35; }
      var done = t > impact + 0.8;
      k.stance = done ? 'idle' : r.playerMove; k.act = a; k.dx = kAdv * a;
      e.stance = done ? 'idle' : r.enemyMove; e.act = a; e.dx = eAdv * a;

      var hitT = t - impact;
      var contactX = (KX + k.dx + EX - e.dx) / 2;
      if (hitT >= 0) {
        var recoil = (1 - smooth(hitT / 0.6));
        if (r.outcome === 'player' || r.outcome === 'enemy') {
          var loser = r.outcome === 'player' ? e : k;
          if (hitT < 0.45) loser.stance = 'hit';
          loser.flash = Math.max(0, 1 - hitT / 0.25) * (rm ? 0.5 : 1);
          loser.dx -= (rm ? 4 : 14) * recoil;
          shake = rm ? 0 : 3 * Math.max(0, 1 - hitT / 0.25);
          var lx = r.outcome === 'player' ? EX - e.dx : KX + k.dx;
          var lh = r.outcome === 'player' ? em.height : KNIGHT_M.height;
          fx.push(heartPop(lx, GROUND - lh - 10, hitT));
          fx.push(sparks(contactX, GROUND - 30 * ZOOM, hitT, '#fff3b0', 8, rm));
        } else {
          k.dx -= (rm ? 2 : 6) * recoil; e.dx -= (rm ? 2 : 6) * recoil;
          fx.push(clash(contactX, GROUND - 32 * ZOOM, hitT, rm));
        }
      }
      // ability effects
      var kMouth = { x: KX + k.dx + KNIGHT_M.mouth.x, y: GROUND + KNIGHT_M.mouth.y };
      var eMouth = { x: EX - e.dx - em.mouth.x, y: GROUND + em.mouth.y };
      if (r.playerMove === 'Y') fx.push(rings(kMouth.x, kMouth.y, 1, t, impact, '#f2c230', rm, 1));
      if (r.enemyMove === 'Y') fx.push(rings(eMouth.x, eMouth.y, -1, t, impact, '#f2c230', rm, spec.type === 'dragon' ? 1.4 : 1));
      if (r.playerMove === 'R') fx.push(slash(KX + k.dx + 14 * ZOOM, GROUND - 30 * ZOOM, 1, t, impact, 24 * ZOOM));
      if (r.enemyMove === 'R') {
        var fxType = def.attackFx || 'slash';
        if (fxType === 'arrow' || fxType === 'bolt') fx.push(projectile(fxType, EX - 14 * es, KX + k.dx + 10 * ZOOM, GROUND - 28 * es, t, impact));
        else if (fxType === 'claw' || fxType === 'sting') fx.push(claws(KX + k.dx + 6 * ZOOM, GROUND - 34 * ZOOM, t, impact, fxType));
        else fx.push(slash(EX - e.dx - 14 * es, GROUND - 26 * es, -1, t, impact, 22 * es));
      }
      if (r.playerMove === 'G') fx.push(guardFlash(KX + k.dx + 14 * ZOOM, GROUND - 28 * ZOOM, t, impact));
      if (r.enemyMove === 'G') fx.push(guardFlash(EX - e.dx - em.width - 4, GROUND - em.height / 2, t, impact));
    } else if (st === S.PHASE) {
      var pt = t;
      e.stance = pt < 1.4 ? 'phase' : 'idle';
      e.flash = Math.max(0, 1 - pt / 0.3) * (rm ? 0.4 : 1);
      shake = rm ? 0 : 2.5 * Math.max(0, 1 - pt / 0.9);
      var look = spec.phaseLooks ? spec.phaseLooks[g.encounter.phaseIndex] : null;
      var col = (look && look.glow) || '#ffffff';
      fx.push(rings(EX - em.mouth.x, GROUND + em.mouth.y, -1, pt + 0.15, 1.2, col, rm, 1.6, true));
      aura = pt < 1.6 ? col : null;
    } else if (st === S.ENEMY_DEFEATED || st === S.ENCOUNTER_WON || st === S.FINAL_WIN) {
      var dt2 = st === S.ENEMY_DEFEATED ? t : 5;
      e.stance = 'hit';
      e.flash = Math.max(0, 1 - dt2 / 0.25) * (rm ? 0.4 : 1);
      e.lying = smooth((dt2 - 0.2) / 0.55);
      e.alpha = 1 - 0.55 * smooth((dt2 - 0.8) / 0.7);
      k.stance = dt2 > 0.3 ? 'victory' : 'idle';
      k.dy = rm || st !== S.ENEMY_DEFEATED ? 0 : -Math.abs(Math.sin(t * Math.PI * 2)) * 4 * (dt2 > 0.3 ? 1 : 0);
    } else if (st === S.PLAYER_DEFEATED || st === S.LOST) {
      var dt3 = st === S.PLAYER_DEFEATED ? t : 5;
      k.stance = 'hit';
      k.flash = Math.max(0, 1 - dt3 / 0.25) * (rm ? 0.4 : 1);
      k.lying = smooth((dt3 - 0.2) / 0.55);
      e.stance = dt3 > 0.4 ? 'victory' : 'idle';
    }

    // ---- draw ----
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (shake) ctx.translate(Math.round(Math.sin(t * 90) * shake), Math.round(Math.cos(t * 70) * shake * 0.5));
    Art.drawScene(ctx, def.scene, W, H, GROUND);

    // shadows
    shadow(ctx, KX + k.dx, GROUND + 1, 14 * ZOOM, k.lying);
    shadow(ctx, EX - e.dx, GROUND + 1, (spec.type === 'dragon' ? 30 : 12) * es, e.lying);

    if (aura) drawAura(ctx, EX - e.dx, GROUND, em, aura, t, rm);

    Art.drawCharacter(ctx, Art.KNIGHT, k, KX, GROUND, 1, ZOOM);
    Art.drawCharacter(ctx, spec, e, EX, GROUND, -1, ZOOM);

    for (var i = 0; i < fx.length; i++) fx[i](ctx);
    ctx.restore();
  };

  /* ---------- effect helpers (each returns a draw callback) ---------- */

  function shadow(ctx, x, y, rx, lying) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(Math.round(x - lying * rx * 0.6), y, rx * (1 + lying * 0.6), 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawAura(ctx, x, ground, em, colour, t, rm) {
    var cy = ground - em.height / 2;
    var pulse = rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 6);
    var rad = Math.max(em.height, em.width * 2) * 0.75;
    var grad = ctx.createRadialGradient(x, cy, 2, x, cy, rad);
    grad.addColorStop(0, hexA(colour, 0.55 + 0.15 * pulse));
    grad.addColorStop(1, hexA(colour, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - rad, cy - rad, rad * 2, rad * 2);
    ctx.strokeStyle = hexA(colour, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, ground + 1, em.width + 8, 4, 0, 0, Math.PI * 2); ctx.stroke();
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function rings(x, y, dir, t, impact, colour, rm, size, full) {
    return function (ctx) {
      var start = 0.15, end = impact + 0.5;
      if (t < start || t > end) return;
      var p = (t - start) / (end - start);
      ctx.lineWidth = 2;
      var count = rm ? 1 : 3;
      for (var i = 0; i < count; i++) {
        var q = rm ? 0.5 : (p * 1.5 + i * 0.33) % 1;
        var r = (8 + q * 46) * size;
        ctx.strokeStyle = hexA(colour, (1 - q) * 0.95);
        ctx.beginPath();
        if (full) ctx.arc(x, y, r, 0, Math.PI * 2);
        else if (dir > 0) ctx.arc(x, y, r, -0.9, 0.9);
        else ctx.arc(x, y, r, Math.PI - 0.9, Math.PI + 0.9);
        ctx.stroke();
      }
    };
  }

  function slash(x, y, dir, t, impact, radius) {
    return function (ctx) {
      var s = impact - 0.14, e = impact + 0.18;
      if (t < s || t > e) return;
      var p = (t - s) / (e - s);
      ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - p) + ')';
      ctx.beginPath(); ctx.arc(0, 0, radius, -1.4, -1.4 + 2.4 * Math.min(1, p * 1.6)); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(224,74,58,' + (1 - p) + ')';
      ctx.beginPath(); ctx.arc(0, 0, radius + 3, -1.4, -1.4 + 2.4 * Math.min(1, p * 1.6)); ctx.stroke();
      ctx.restore();
    };
  }

  function projectile(kind, fromX, toX, y, t, impact) {
    return function (ctx) {
      var s = 0.2;
      if (t < s || t > impact) return;
      var p = (t - s) / (impact - s), x = lerp(fromX, toX, p);
      if (kind === 'arrow') {
        Art.rect(ctx, x, y, 14, 1, '#c9b48a');
        Art.rect(ctx, x - 2, y - 1, 3, 3, '#cfd5dc');
        Art.rect(ctx, x + 12, y - 2, 3, 2, '#e04a3a'); Art.rect(ctx, x + 12, y + 1, 3, 2, '#e04a3a');
      } else {
        for (var i = 0; i < 4; i++) Art.circle(ctx, x + i * 5, y, 3 - i * 0.6, 'rgba(178,107,255,' + (0.8 - i * 0.18) + ')');
        Art.circle(ctx, x, y, 2, '#f0d0ff');
        Art.rect(ctx, x - 1, y - 4, 2, 2, '#e04a3a');
      }
    };
  }

  function claws(x, y, t, impact, kind) {
    return function (ctx) {
      var s = impact - 0.08, e = impact + 0.3;
      if (t < s || t > e) return;
      var p = (t - s) / (e - s);
      ctx.lineWidth = 2;
      var n = kind === 'sting' ? 1 : 3;
      for (var i = 0; i < n; i++) {
        ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,' + (1 - p) + ')' : 'rgba(224,74,58,' + (1 - p) + ')';
        ctx.beginPath();
        ctx.moveTo(x + 8 + i * 5, y - 14);
        ctx.lineTo(x + 8 + i * 5 - 14 * Math.min(1, p * 2), y - 14 + 24 * Math.min(1, p * 2));
        ctx.stroke();
      }
    };
  }

  function guardFlash(x, y, t, impact) {
    return function (ctx) {
      var s = impact - 0.05, e = impact + 0.25;
      if (t < s || t > e) return;
      var p = (t - s) / (e - s), r = 4 + p * 10;
      ctx.strokeStyle = 'rgba(63,174,74,' + (1 - p) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
    };
  }

  function sparks(x, y, hitT, colour, n, rm) {
    return function (ctx) {
      if (hitT > 0.35 || rm) return;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 + 0.3, d = 4 + hitT * 70;
        Art.rect(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2, 2, i % 2 ? colour : '#ffffff');
      }
    };
  }

  function clash(x, y, hitT, rm) {
    return function (ctx) {
      if (hitT > 0.4) return;
      var p = hitT / 0.4, r = rm ? 6 : 4 + p * 12;
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')';
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2, rr = i % 2 ? r * 0.4 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    };
  }

  var HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  function heartPop(x, y, hitT) {
    return function (ctx) {
      if (hitT > 1.1) return;
      var a = 1 - smooth((hitT - 0.6) / 0.5), yy = y - hitT * 14;
      ctx.save(); ctx.globalAlpha = a;
      for (var r = 0; r < HEART.length; r++) for (var c = 0; c < 7; c++) {
        if (HEART[r][c] === 'X') Art.rect(ctx, x - 7 + c * 2, yy + r * 2, 2, 2, (c === 3 && r > 0) ? '#3a0a0a' : '#e0383a');
      }
      ctx.restore();
    };
  }

  /* ---------- static pictures for panels and menus ---------- */

  /** Enemy in a preparation pose, used by the encounter intro panel. */
  Renderer.drawPreview = function (canvas, def, move, phaseIndex) {
    var spec = def.art, dragon = spec.type === 'dragon';
    canvas.width = dragon ? 150 : 90; canvas.height = dragon ? 120 : 80;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var ground = canvas.height - 6, x = dragon ? 62 : 45;
    var em = enemyMetrics(spec);
    if (def.difficulty === 'easy' || def.difficulty === 'medium') drawAura(ctx, x, ground, em, Rules.MOVE_INFO[move].hex, 0, true);
    var accent = (def.difficulty === 'hard' || def.difficulty === 'boss') ? Rules.MOVE_INFO[move].hex : null;
    Art.drawCharacter(ctx, spec, { stance: move, act: 0, accent: accent, phase: phaseIndex || 0 }, x, ground, -1);
  };

  /** Small scene for the title and final screens. */
  Renderer.drawPortrait = function (canvas, scene, enemyDef, victory) {
    canvas.width = 192; canvas.height = 108;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.scale(0.5, 0.5);
    Art.drawScene(ctx, scene, W, H, GROUND);
    ctx.restore();
    Art.drawCharacter(ctx, Art.KNIGHT, { stance: victory ? 'victory' : 'idle' }, 60, 96, 1);
    if (enemyDef) {
      var lying = victory ? 1 : 0;
      Art.drawCharacter(ctx, enemyDef.art, { stance: victory ? 'hit' : 'idle', lying: lying, alpha: victory ? 0.6 : 1, phase: 0 }, 140, 96, -1);
    }
  };

  RK.Renderer = Renderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
