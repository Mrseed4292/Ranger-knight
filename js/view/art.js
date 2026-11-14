/*
 * Ranger Knight — placeholder artwork, drawn with chunky canvas shapes.
 *
 * Everything is drawn facing RIGHT around the character's feet (0,0); enemies
 * are mirrored by drawCharacter(). A "rig" describes the pose:
 *   stance      'idle' | 'G' | 'R' | 'Y' | 'hit' | 'victory' | 'phase'
 *   act         0..1  preparation (0) → full action (1)
 *   dx, dy      offset in world pixels (dx > 0 means toward the opponent)
 *   flash       0..1  white hit flash
 *   lying       0..1  defeat fall
 *   alpha       opacity
 *   accent      colour of the small hard-mode glint (or null)
 *   phase       boss phase index
 *
 * To switch to sprites later, replace drawCharacter() with a drawImage() call
 * that picks a frame from the rig's stance/act (see README).
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function rect(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function poly(ctx, pts, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  function circle(ctx, x, y, r, c) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function glint(ctx, x, y, c, size) {
    var s = size || 2;
    rect(ctx, x - s, y - s, s * 2 + 1, s * 2 + 1, c);
    rect(ctx, x - s - 1, y, s * 2 + 3, 1, '#ffffff');
    rect(ctx, x, y - s - 1, 1, s * 2 + 3, '#ffffff');
  }

  /* ================= HUMANOIDS (knight + humanoid enemies) ================= */

  /** Pose numbers for a humanoid. act: 0 = preparation, 1 = full action. */
  function humanoidPose(stance, act) {
    var p = { weaponAng: 2.3, shieldAng: 0.45, shieldRaise: 0, crouch: 0, lean: 0, headTilt: 0, mouth: 0, weaponFront: false, offhandUp: 0 };
    switch (stance) {
      case 'G':
        p.crouch = 2; p.shieldAng = lerp(1.25, 1.55, act); p.shieldRaise = lerp(3, 5, act);
        p.weaponAng = 1.7; p.lean = lerp(0.05, 0.16, act); p.offhandUp = 1;
        break;
      case 'R':
        p.weaponAng = lerp(3.75, 1.25, act); p.lean = lerp(-0.06, 0.25, act); p.crouch = lerp(1, 2, act);
        p.weaponFront = act > 0.35; p.shieldAng = 0.3;
        break;
      case 'Y':
        p.lean = lerp(-0.1, -0.18, act); p.headTilt = lerp(-0.25, -0.45, act); p.mouth = lerp(0.45, 1, act);
        p.weaponAng = lerp(2.7, 3.0, act); p.shieldAng = lerp(0.9, 1.1, act);
        break;
      case 'hit':
        p.lean = -0.25; p.headTilt = -0.3; p.weaponAng = 1.6; p.shieldAng = 0.2; p.mouth = 0.4;
        break;
      case 'victory':
        p.weaponAng = Math.PI; p.headTilt = -0.15; p.mouth = 0.5; p.shieldAng = 0.6;
        break;
      case 'phase':
        p.lean = -0.18; p.headTilt = -0.45; p.mouth = 1; p.weaponAng = 3.1; p.shieldAng = 1.2;
        break;
    }
    return p;
  }

  /** Arm hanging from (sx,sy). ang: 0 = down, PI/2 = forward, PI = up. */
  function handPos(sx, sy, ang, len) {
    return { x: sx + Math.sin(ang) * len, y: sy + Math.cos(ang) * len };
  }

  function drawWeapon(ctx, s, len, rig) {
    var w = s.weapon, steel = s.blade || '#d8dde6';
    switch (w) {
      case 'sword':
        rect(ctx, -1, len - 1, 2, 4, '#6b4423');
        rect(ctx, -3.5, len + 3, 7, 2, s.guard || '#d9a826');
        rect(ctx, -1.5, len + 5, 3, 16, steel);
        rect(ctx, 0.5, len + 5, 1, 16, '#ffffff');
        rect(ctx, -1, len + 21, 2, 2, steel);
        if (s.gem) rect(ctx, -1, len + 3, 2, 2, s.gem);
        break;
      case 'axe':
        rect(ctx, -1, len - 3, 2, 20, '#7a5230');
        poly(ctx, [-1, len + 9, -8, len + 7, -9, len + 17, -1, len + 15], '#9aa3ad');
        rect(ctx, -9, len + 8, 2, 8, '#e0e6ee');
        break;
      case 'dagger':
        rect(ctx, -1, len - 1, 2, 4, '#5a3a20');
        rect(ctx, -2.5, len + 3, 5, 1, '#c9a227');
        rect(ctx, -1, len + 4, 2, 8, '#dfe4ea');
        break;
      case 'club':
        rect(ctx, -1.5, len - 2, 3, 7, '#6b4a2a');
        rect(ctx, -3.5, len + 5, 7, 15, '#8a6440');
        rect(ctx, -3.5, len + 5, 2, 15, '#6b4a2a');
        rect(ctx, 2, len + 9, 2, 2, '#c9c9c9'); rect(ctx, -4, len + 14, 2, 2, '#c9c9c9');
        break;
      case 'sabre':
        rect(ctx, -1, len - 1, 2, 4, '#3a2416');
        rect(ctx, -3, len + 3, 6, 2, '#d9a826');
        rect(ctx, -1, len + 5, 2, 9, '#e6ebf0');
        rect(ctx, -2, len + 13, 2, 6, '#e6ebf0');
        rect(ctx, -3, len + 18, 2, 3, '#e6ebf0');
        break;
      case 'staff':
        rect(ctx, -1, len - 10, 2, 28, '#4a2d5e');
        circle(ctx, 0, len + 20, 5, 'rgba(178,107,255,0.35)');
        circle(ctx, 0, len + 20, 3, s.orb || '#b26bff');
        rect(ctx, -1, len + 18, 1, 1, '#ffffff');
        break;
      case 'bow':
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, len - 3, 11, 0.35, Math.PI - 0.35); ctx.stroke();
        ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1;
        var ex = Math.cos(0.35) * 11, ey = len - 3 + Math.sin(0.35) * 11;
        var pull = rig.stance === 'R' ? lerp(-6, -2, rig.act) : 0;
        ctx.beginPath(); ctx.moveTo(-ex, ey); ctx.lineTo(0, ey + pull); ctx.lineTo(ex, ey); ctx.stroke();
        if (rig.stance === 'R' && rig.act < 0.4) { rect(ctx, -0.5, ey + pull - 2, 1, 16, '#c9b48a'); rect(ctx, -1.5, ey + pull + 13, 3, 3, '#9aa3ad'); }
        break;
    }
  }

  function drawShield(ctx, s, x, y) {
    switch (s.shield) {
      case 'kite':
        poly(ctx, [x - 6, y - 9, x + 6, y - 9, x + 6, y + 2, x, y + 10, x - 6, y + 2], '#d9a826');
        poly(ctx, [x - 4.5, y - 7.5, x + 4.5, y - 7.5, x + 4.5, y + 1.5, x, y + 7.5, x - 4.5, y + 1.5], '#2f8a3c');
        rect(ctx, x - 0.5, y - 6, 2, 11, '#f3e7a6'); rect(ctx, x - 3, y - 3, 7, 2, '#f3e7a6');
        rect(ctx, x - 4, y - 7, 2, 2, '#7fd18a');
        break;
      case 'round':
        circle(ctx, x, y, 7.5, '#3a2a1a');
        circle(ctx, x, y, 6.5, s.shieldColor || '#8a5a32');
        rect(ctx, x - 6, y - 0.5, 12, 1, '#5a3a20');
        circle(ctx, x, y, 2, '#b8bec6');
        break;
      case 'buckler':
        circle(ctx, x, y, 4.5, '#3a3a3a');
        circle(ctx, x, y, 3.5, '#a8afb8');
        rect(ctx, x - 1, y - 1, 2, 2, '#e8ecf0');
        break;
    }
  }

  function drawHead(ctx, s, rig, pose) {
    var m = pose.mouth, eye = rig.accent || s.eyes || '#222';
    switch (s.head) {
      case 'helm':
        rect(ctx, -6, -11, 12, 11, '#b8c0cc');
        rect(ctx, -6, -11, 12, 2, '#e3e8ef');
        rect(ctx, -6, -2, 12, 2, '#8a929e');
        rect(ctx, 0, -7, 6, 3, '#3a3f4a');
        rect(ctx, 1, -6, 5, 1, '#0e1016');
        if (m > 0) rect(ctx, 1, -3, 5, 1 + Math.round(m * 2), '#0e1016');
        else { rect(ctx, 3, -3, 1, 1, '#6a7280'); rect(ctx, 5, -3, 1, 1, '#6a7280'); }
        rect(ctx, -2, -13, 4, 2, '#d9a826');
        rect(ctx, -8, -15, 8, 4, '#c0392b');
        rect(ctx, -11, -13, 5, 6, '#c0392b');
        rect(ctx, -11, -9, 3, 3, '#962d22');
        break;
      case 'orc':
        poly(ctx, [-5, -8, -10, -11, -5, -4], s.skinDark);
        rect(ctx, -5, -11, 11, 11, s.skin);
        rect(ctx, -1, -8, 7, 2, s.skinDark);
        rect(ctx, 3, -6, 2, 2, eye);
        rect(ctx, 1, -3 + m * 3, 6, 3, s.skinDark);
        if (m > 0) rect(ctx, 2, -3, 5, Math.round(m * 3), '#3a1010');
        rect(ctx, 2, -4, 1, 2, '#f3ead2'); rect(ctx, 5, -4, 1, 2, '#f3ead2');
        if (s.headgear === 'cap') { rect(ctx, -6, -13, 12, 4, '#6b4a2a'); rect(ctx, -6, -10, 13, 1, '#4a321c'); }
        if (s.headgear === 'horns') {
          rect(ctx, -6, -13, 12, 4, '#5a5a62');
          poly(ctx, [-5, -12, -10, -20, -7, -12], '#e8dcc0');
          poly(ctx, [3, -12, 7, -21, 6, -12], '#e8dcc0');
        }
        break;
      case 'goblin':
        poly(ctx, [-3, -7, -14, -12, -3, -3], s.skin);
        poly(ctx, [-4, -7, -11, -10, -4, -5], s.skinDark);
        rect(ctx, -4, -9, 9, 9, s.skin);
        rect(ctx, 5, -6, 3, 2, s.skin);
        rect(ctx, 2, -6, 2, 2, eye);
        rect(ctx, 1, -2, 4, 1 + Math.round(m * 3), m > 0 ? '#3a1010' : s.skinDark);
        rect(ctx, -5, -10, 9, 2, '#4f6b3a');
        break;
      case 'skull':
        rect(ctx, -5, -11, 11, 9, s.skin);
        rect(ctx, -5, -11, 11, 2, '#7b6a55');
        rect(ctx, -6, -12, 10, 2, '#6a5a48');
        rect(ctx, 1, -8, 4, 3, '#1a1414');
        rect(ctx, 2, -7, 2, 1, eye);
        rect(ctx, 5, -5, 1, 2, '#1a1414');
        rect(ctx, -2, -2 + m * 3, 8, 3, s.skinDark);
        rect(ctx, 0, -2 + m * 3, 1, 1, '#1a1414'); rect(ctx, 2, -2 + m * 3, 1, 1, '#1a1414'); rect(ctx, 4, -2 + m * 3, 1, 1, '#1a1414');
        if (m > 0) rect(ctx, -1, -2, 7, Math.round(m * 3), '#1a1414');
        break;
      case 'hat':
        rect(ctx, -4, -10, 9, 10, s.skin);
        rect(ctx, -2, -3, 7, 3, s.skinDark);
        if (m > 0) rect(ctx, 2, -3, 3, 1 + Math.round(m * 2), '#3a1010');
        rect(ctx, 2, -7, 2, 2, rig.accent || '#2a1a10');
        rect(ctx, -9, -12, 18, 2, '#3a2d4a');
        rect(ctx, -5, -17, 10, 5, '#3a2d4a');
        rect(ctx, -5, -13, 10, 1, '#c9a227');
        poly(ctx, [-5, -16, -14, -22, -10, -15], '#c0392b');
        break;
      case 'hood':
        poly(ctx, [-6, 0, -6, -10, -2, -13, 5, -12, 7, -6, 7, 0], s.cloth);
        poly(ctx, [-6, -9, -11, -4, -6, -2], s.cloth);
        rect(ctx, 0, -9, 6, 7, s.skinDark);
        rect(ctx, 3, -7, 2, 1, eye);
        if (m > 0) rect(ctx, 2, -4, 3, Math.round(m * 2), '#000000');
        rect(ctx, 1, -3, 5, 3, '#1a2a1a');
        break;
      case 'warlock':
        poly(ctx, [-6, 0, -6, -10, -4, -19, -9, -22, 0, -18, 6, -10, 6, 0], s.cloth);
        rect(ctx, 0, -9, 5, 7, s.skinDark);
        rect(ctx, 1, -7, 1, 1, eye); rect(ctx, 3, -7, 1, 1, eye);
        if (m > 0) rect(ctx, 1, -4, 3, Math.round(m * 2), '#5a1a6a');
        rect(ctx, -6, -1, 12, 2, '#3d2752');
        break;
      case 'troll':
        rect(ctx, -7, -12, 14, 12, s.skin);
        rect(ctx, -7, -12, 14, 3, s.skinDark);
        rect(ctx, 0, -9, 8, 2, s.skinDark);
        rect(ctx, 4, -7, 2, 2, eye);
        rect(ctx, 6, -6, 3, 3, s.skin);
        rect(ctx, -1, -3 + m * 3, 9, 4, s.skinDark);
        if (m > 0) rect(ctx, 0, -3, 8, Math.round(m * 3), '#2a1a10');
        rect(ctx, 1, -4 + m * 3, 1, 2, '#f0e8d0'); rect(ctx, 5, -4 + m * 3, 1, 2, '#f0e8d0');
        rect(ctx, -5, -12, 3, 2, '#5f8a3a'); rect(ctx, 2, -13, 4, 1, '#5f8a3a');
        break;
    }
  }

  function drawHumanoid(ctx, s, rig) {
    var pose = humanoidPose(rig.stance, rig.act || 0);
    var tw = s.wide ? 18 : 14, hw = tw / 2;
    var crouch = pose.crouch;
    var legH = 12 - crouch;

    // legs (stay planted)
    rect(ctx, -6, -legH, 5, legH, s.pants);
    rect(ctx, 1, -legH, 5, legH, s.pants);
    rect(ctx, -7, -3, 6, 3, s.boots);
    rect(ctx, 1, -3, 7, 3, s.boots);
    if (s.body === 'bones') { rect(ctx, -5, -legH, 3, legH, s.pants); rect(ctx, 2, -legH, 3, legH, s.pants); }

    ctx.save();
    ctx.translate(0, -legH);
    ctx.rotate(pose.lean);

    var shoulderBack = { x: -hw + 4, y: -12 }, shoulderFront = { x: hw - 3, y: -12 };

    // back equipment: crossbow (knight)
    if (s.backItem === 'crossbow') {
      ctx.save();
      ctx.translate(-hw + 1, -4);
      ctx.rotate(-0.55);
      rect(ctx, -1.5, -20, 3, 20, '#7a5230');
      rect(ctx, -1.5, -20, 1, 20, '#9a6a40');
      ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -11, 9, Math.PI + 0.5, TAU - 0.5); ctx.stroke();
      ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -15); ctx.lineTo(0, -12); ctx.lineTo(8, -15); ctx.stroke();
      rect(ctx, -1, -3, 2, 3, '#4a4f58');
      ctx.restore();
      // strap across the chest
      ctx.save(); ctx.translate(0, -7); ctx.rotate(-0.7); rect(ctx, -9, -1, 18, 2, '#5a3a20'); ctx.restore();
    }
    if (s.backItem === 'cape' || s.cape) rect(ctx, -hw - 2, -13, 4, 13, s.capeColor || s.cloth);

    function weaponArm() {
      ctx.save();
      ctx.translate(shoulderBack.x, shoulderBack.y);
      ctx.rotate(-pose.weaponAng);
      rect(ctx, -2, 0, 4, 9, s.body === 'bones' ? s.skin : s.armor);
      rect(ctx, -2, 8, 4, 3, s.hand || s.skin);
      drawWeapon(ctx, s, 9, rig);
      if (rig.accent && rig.stance === 'R') glint(ctx, 0, s.weapon === 'staff' ? 29 : 24, rig.accent, 2);
      ctx.restore();
    }

    if (!pose.weaponFront) weaponArm();

    // torso
    if (s.body === 'bones') {
      rect(ctx, -2, -14, 4, 14, s.skin);
      for (var r = 0; r < 4; r++) rect(ctx, -hw + 1, -13 + r * 3, tw - 2, 2, s.skin);
      rect(ctx, -hw, -14, tw, 3, s.armor);
    } else {
      rect(ctx, -hw, -14, tw, 14, s.armor);
      rect(ctx, -hw + 3, -13, tw - 5, 12, s.cloth);
      rect(ctx, -hw, -3, tw, 2, '#3a2a1a');
      rect(ctx, -1, -3, 3, 2, '#d9a826');
      if (s.emblem) { rect(ctx, -0.5, -11, 2, 7, s.emblem); rect(ctx, -2.5, -9, 6, 2, s.emblem); }
    }

    // head
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(pose.headTilt);
    drawHead(ctx, s, rig, pose);
    if (rig.accent && rig.stance === 'Y') glint(ctx, 8, -3, rig.accent, 2);
    ctx.restore();

    // shield / off-hand arm
    var hand = handPos(shoulderFront.x, shoulderFront.y, pose.shieldAng, 9);
    ctx.save();
    ctx.translate(shoulderFront.x, shoulderFront.y);
    ctx.rotate(-pose.shieldAng);
    rect(ctx, -2, 0, 4, 9, s.body === 'bones' ? s.skin : s.armor);
    rect(ctx, -2, 8, 4, 3, s.hand || s.skin);
    ctx.restore();
    var shy = hand.y - pose.shieldRaise;
    if (s.shield && s.shield !== 'none') drawShield(ctx, s, hand.x + 1, shy);
    if (rig.stance === 'G' && s.guardFx === 'cloak') {
      poly(ctx, [-hw - 1, -15, hw + 5, -16, hw + 7, -1, -hw + 2, 0], s.cloth);
      rect(ctx, hw + 3, -15, 2, 14, '#3a4a3a');
    }
    if (rig.stance === 'G' && s.guardFx === 'barrier') {
      ctx.strokeStyle = 'rgba(214,150,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hand.x + 5, shy, 8 + (rig.act || 0) * 3, 0, TAU); ctx.stroke();
      rect(ctx, hand.x + 4, shy - 3, 2, 6, '#e3b8ff'); rect(ctx, hand.x + 2, shy - 1, 6, 2, '#e3b8ff');
    }
    if (rig.accent && rig.stance === 'G') glint(ctx, hand.x + 2, shy - 1, rig.accent, 2);

    if (pose.weaponFront) weaponArm();
    ctx.restore();
  }

  /* ================= DRAGONS / WYVERN ================= */

  function dragonPose(stance, act) {
    var p = { neck: 0, mouth: 0, wingAng: 0, wrap: 0, claw: 0, tail: 0, lean: 0, crouch: 0 };
    switch (stance) {
      case 'G': p.wrap = 1; p.neck = -0.7; p.crouch = 3; p.lean = lerp(0, 0.1, act); break;
      case 'R': p.claw = 1; p.tail = lerp(0.8, 1, act); p.neck = lerp(-0.75, -0.5, act); p.lean = lerp(-0.1, 0.24, act); break; // head low, claw high
      case 'Y': p.neck = lerp(0.8, 1, act); p.mouth = lerp(0.5, 1, act); p.wingAng = -0.35; p.lean = -0.08; break;
      case 'hit': p.neck = 0.4; p.mouth = 0.5; p.lean = -0.2; p.wingAng = 0.25; break;
      case 'victory': case 'phase': p.neck = 1; p.mouth = 1; p.wingAng = -0.5; p.lean = -0.1; break;
    }
    return p;
  }

  function drawWing(ctx, look, ang, torn) {
    ctx.save();
    ctx.rotate(ang);
    var pts = torn
      ? [0, 0, -8, -30, -18, -44, -22, -36, -30, -34, -27, -24, -38, -16, -28, -12, -30, -4, -16, -4]
      : [0, 0, -8, -30, -20, -46, -26, -34, -36, -30, -30, -20, -42, -12, -28, -8, -22, 0];
    poly(ctx, pts, look.wing);
    ctx.strokeStyle = look.wingDark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-20, -46);
    ctx.moveTo(-8, -28); ctx.lineTo(-36, -30);
    ctx.moveTo(-8, -28); ctx.lineTo(-42, -12);
    ctx.stroke();
    rect(ctx, -21, -48, 3, 3, look.horn || '#e8e0c8');
    ctx.restore();
  }

  function drawDragon(ctx, s, rig) {
    var look = s.phaseLooks ? s.phaseLooks[Math.min(rig.phase || 0, s.phaseLooks.length - 1)] : s;
    look = Object.assign({ horn: s.horn }, look);
    var p = dragonPose(rig.stance, rig.act || 0);
    var wyvern = s.kind === 'wyvern';
    var eye = rig.accent || look.eyes;

    ctx.save();
    ctx.translate(0, p.crouch);

    function drawTail() {
      // tail (curls up over the back for the wyvern sting)
      var tail0 = [[-14, -20], [-30, -16], [-44, -10], [-56, -12]];
      var tail1 = [[-14, -24], [-28, -36], [-26, -56], [-12, -66]];
      ctx.strokeStyle = look.bodyDark; ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var a = tail0[i], b = tail0[i + 1], c = tail1[i], d = tail1[i + 1];
        ctx.lineWidth = 9 - i * 2.5;
        ctx.beginPath();
        ctx.moveTo(lerp(a[0], c[0], curl), lerp(a[1], c[1], curl));
        ctx.lineTo(lerp(b[0], d[0], curl), lerp(b[1], d[1], curl));
        ctx.stroke();
      }
      var tip = [lerp(tail0[3][0], tail1[3][0], curl), lerp(tail0[3][1], tail1[3][1], curl)];
      poly(ctx, [tip[0] - 4, tip[1], tip[0] + 2, tip[1] - 5, tip[0] + 5 + curl * 3, tip[1] + 2 + curl * 4, tip[0] + 1, tip[1] + 4], wyvern ? '#d8d0b8' : look.bodyDark);
      if (wyvern && rig.accent && rig.stance === 'R') glint(ctx, tip[0] + 2, tip[1], rig.accent, 2);

    }
    var curl = wyvern ? p.tail : 0;
    if (curl < 0.5) drawTail();
    // far wing
    ctx.save(); ctx.translate(-6, -34); drawWing(ctx, { wing: look.wingDark, wingDark: look.bodyDark, horn: look.horn }, p.wingAng * 0.6 - 0.15, look.torn); ctx.restore();

    // back leg
    rect(ctx, -18, -16, 9, 16, look.bodyDark);
    rect(ctx, -20, -3, 12, 3, look.bodyDark);
    rect(ctx, -9, -2, 2, 2, '#f0ead8');

    ctx.save();
    ctx.translate(-2, -14);
    ctx.rotate(p.lean);
    // body
    ctx.fillStyle = look.body;
    ctx.beginPath(); ctx.ellipse(-2, -8, 19, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = look.belly;
    ctx.beginPath(); ctx.ellipse(5, -3, 12, 7, -0.2, 0, TAU); ctx.fill();
    for (var b2 = 0; b2 < 4; b2++) rect(ctx, 0 + b2 * 3, -6 + b2 * 2, 2, 1, look.bodyDark);
    // spine spikes
    for (var k = 0; k < 5; k++) {
      var sx = -16 + k * 6;
      poly(ctx, [sx, -17 + Math.abs(k - 2), sx + 3, -24 + Math.abs(k - 2), sx + 6, -17 + Math.abs(k - 2)], look.glow || look.bodyDark);
    }
    if (look.glow) {
      ctx.fillStyle = look.glow; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(6, -6, 6, 4, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      rect(ctx, -10, -10, 4, 1, look.glow); rect(ctx, -4, -4, 3, 1, look.glow);
    }

    // front leg
    rect(ctx, 6, -2, 7, 16, look.body);
    rect(ctx, 5, 11, 11, 3, look.bodyDark);
    rect(ctx, 14, 12, 2, 2, '#f0ead8');

    // neck + head
    var nx = lerp(28, 22, (p.neck + 1) / 2), ny = lerp(-14, -48, (p.neck + 1) / 2);
    if (p.neck < 0) { nx = lerp(24, 30, -p.neck); ny = lerp(-32, -16, -p.neck); }
    else { nx = lerp(24, 18, p.neck); ny = lerp(-32, -46, p.neck); }
    ctx.strokeStyle = look.body; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.quadraticCurveTo(nx - 6, ny + 14, nx, ny); ctx.stroke();
    ctx.strokeStyle = look.belly; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, -8); ctx.quadraticCurveTo(nx - 1, ny + 14, nx + 3, ny + 3); ctx.stroke();

    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(p.neck > 0 ? -0.35 * p.neck : -0.25 * p.neck);
    // horns
    poly(ctx, [-4, -4, -14, -10, -3, -1], look.horn);
    if (s.kind === 'ancient') poly(ctx, [-2, -6, -10, -16, 0, -4], look.horn);
    // skull + snout
    rect(ctx, -5, -6, 11, 9, look.body);
    rect(ctx, 5, -4, 9, 5, look.body);
    rect(ctx, 12, -4, 2, 1, look.bodyDark);
    rect(ctx, 1, -4, 3, 2, eye);
    // jaw
    ctx.save();
    ctx.translate(4, 1);
    ctx.rotate(p.mouth * 0.55);
    rect(ctx, 0, 0, 10, 3, look.bodyDark);
    rect(ctx, 3, -1, 1, 1, '#f0ead8'); rect(ctx, 7, -1, 1, 1, '#f0ead8');
    ctx.restore();
    if (p.mouth > 0.2) rect(ctx, 6, 1, 7, Math.round(p.mouth * 3), '#3a0a0a');
    if (rig.accent && rig.stance === 'Y') glint(ctx, 15, 2, rig.accent, 2);
    ctx.restore();

    // raised front claw
    if (!wyvern && (p.claw > 0 || rig.stance === 'idle' || rig.stance === 'Y' || rig.stance === 'hit')) {
      var clawAng = 0.6;
      if (rig.stance === 'R') clawAng = lerp(3.0, 0.9, rig.act || 0);
      var big = rig.stance === 'R' ? 1 : 0;
      ctx.save(); ctx.translate(14, -10); ctx.rotate(-clawAng);
      rect(ctx, -3, 0, 6, 12 + big * 4, look.body);
      rect(ctx, -3, 0, 2, 12 + big * 4, look.bodyDark);
      var cy = 11 + big * 4;
      rect(ctx, -4, cy, 2, 4 + big * 2, '#f0ead8'); rect(ctx, -1, cy, 2, 5 + big * 2, '#f0ead8'); rect(ctx, 2, cy, 2, 4 + big * 2, '#f0ead8');
      if (rig.accent && rig.stance === 'R') glint(ctx, 0, cy + 6, rig.accent, 2);
      ctx.restore();
    }
    ctx.restore(); // body frame

    // near wing — wraps forward over the body for the guard pose
    ctx.save();
    ctx.translate(-2, -36 + p.crouch);
    var wingAng = p.wrap ? lerp(0, 2.25, p.wrap) : p.wingAng;
    drawWing(ctx, look, wingAng, look.torn);
    if (rig.accent && rig.stance === 'G') { ctx.rotate(wingAng); glint(ctx, -18, -24, rig.accent, 2); }
    ctx.restore();

    if (curl >= 0.5) drawTail();

    if (look.embers) {
      var t = rig.time || 0;
      for (var e = 0; e < 6; e++) {
        var ex = -30 + ((e * 17 + t * 20) % 60), ey = -10 - ((t * 25 + e * 13) % 60);
        rect(ctx, ex, ey, 1, 1, e % 2 ? '#ffb347' : '#ff6a2a');
      }
    }
    ctx.restore();
  }

  /* ================= compositing ================= */

  var sprite = null, sctx = null;
  var SW = 340, SH = 250, OX = 170, OY = 228;
  function spriteCanvas() {
    if (!sprite) {
      sprite = document.createElement('canvas');
      sprite.width = SW; sprite.height = SH;
      sctx = sprite.getContext('2d');
    }
    return sctx;
  }

  /**
   * Draw a character at world position (x, groundY). facing: 1 = right, -1 = left.
 * zoom: optional extra scale on top of spec.scale (the battlefield uses ZOOM).
   * Drawn to an off-screen canvas first so the white hit flash only covers the character.
   */
  function drawCharacter(ctx, spec, rig, x, groundY, facing, zoom) {
    var sc = (spec.scale || 1) * (zoom || 1);
    var c = spriteCanvas();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, SW, SH);
    c.save();
    c.translate(OX, OY);
    c.scale(sc, sc);
    if (rig.lying) { c.translate(0, -rig.lying * 7); c.rotate(-rig.lying * Math.PI / 2 * 0.95); }
    if (spec.type === 'dragon') drawDragon(c, spec, rig); else drawHumanoid(c, spec, rig);
    c.restore();
    if (rig.flash > 0) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255,255,255,' + clamp01(rig.flash) + ')';
      c.fillRect(0, 0, SW, SH);
      c.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.globalAlpha = rig.alpha == null ? 1 : rig.alpha;
    ctx.translate(Math.round(x + (rig.dx || 0) * facing), Math.round(groundY + (rig.dy || 0)));
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -OX, -OY);
    ctx.restore();
  }

  /* ================= scenes ================= */

  var SCENES = {
    meadow:   { sky: ['#6fbfe0', '#93d0e8', '#bfe3ee', '#e2f2f0'], far: '#7fb07a', mid: '#5c9a50', ground: '#5d9b3c', groundDark: '#467a2c', path: '#b08a58' },
    forest:   { sky: ['#4b7a78', '#6f9c90', '#9cc0aa', '#c4dcc0'], far: '#355f4a', mid: '#2a4d3a', ground: '#3e6d33', groundDark: '#2c5226', path: '#7a6040' },
    crypt:    { sky: ['#17142a', '#221e3c', '#2f2a50', '#433b66'], far: '#2a2840', mid: '#33304a', ground: '#4a4a3e', groundDark: '#38382e', path: '#5a5648' },
    camp:     { sky: ['#d9785a', '#eb9a62', '#f4bd78', '#f8dca2'], far: '#a86a5a', mid: '#7a5a48', ground: '#8a7a4a', groundDark: '#6a5c36', path: '#a8925e' },
    mountain: { sky: ['#86aed2', '#a4c2dc', '#c4d6e6', '#e0e8ee'], far: '#8a92a0', mid: '#6a7280', ground: '#7a7468', groundDark: '#5e5a50', path: '#958c7a' },
    lair:     { sky: ['#2a1012', '#3e1814', '#5a2416', '#7e3418'], far: '#3a1a18', mid: '#2a1414', ground: '#3b2a26', groundDark: '#2a1c1a', path: '#4a3430' }
  };
  var sceneCache = {};

  function drawSceneTo(ctx, name, W, H, groundY) {
    var p = SCENES[name] || SCENES.meadow;
    var bands = p.sky, bh = Math.ceil(groundY / bands.length);
    for (var i = 0; i < bands.length; i++) {
      rect(ctx, 0, i * bh, W, bh + 1, bands[i]);
      if (i > 0) for (var x = 0; x < W; x += 2) rect(ctx, x + (i % 2), i * bh - 1, 1, 1, bands[i]); // dither seam
    }

    // far silhouettes
    function ridge(color, base, amp, period, seed) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, groundY);
      for (var x = 0; x <= W; x += 4) {
        var y = base - Math.abs(Math.sin((x + seed) / period)) * amp - Math.sin((x + seed * 3) / (period * 0.37)) * amp * 0.25;
        ctx.lineTo(x, Math.round(y));
      }
      ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
    }

    if (name === 'meadow') {
      rect(ctx, 40, 28, 18, 4, '#ffffff'); rect(ctx, 46, 24, 12, 4, '#ffffff'); rect(ctx, 270, 40, 22, 4, '#ffffff'); rect(ctx, 276, 36, 10, 4, '#ffffff');
      ridge(p.far, groundY - 30, 26, 60, 10);
      // castle on a hill
      var cx = 200, cy = groundY - 62;
      rect(ctx, cx, cy, 34, 22, '#9aa0aa'); rect(ctx, cx - 6, cy - 10, 10, 32, '#8a909a'); rect(ctx, cx + 30, cy - 10, 10, 32, '#8a909a');
      for (var c1 = 0; c1 < 3; c1++) { rect(ctx, cx - 6 + c1 * 4, cy - 13, 2, 3, '#8a909a'); rect(ctx, cx + 30 + c1 * 4, cy - 13, 2, 3, '#8a909a'); }
      rect(ctx, cx + 14, cy + 10, 6, 12, '#4a4038'); rect(ctx, cx - 2, cy - 20, 1, 8, '#4a4038'); rect(ctx, cx - 1, cy - 20, 6, 4, '#c0392b');
      ridge(p.mid, groundY - 8, 12, 40, 50);
    } else if (name === 'forest') {
      ridge(p.far, groundY - 34, 10, 30, 0);
      for (var t = 0; t < 14; t++) {
        var tx = t * 29 + (t % 3) * 5, th = 40 + (t * 13) % 22;
        poly(ctx, [tx, groundY - 6, tx + 10, groundY - 6 - th, tx + 20, groundY - 6], t % 2 ? p.mid : '#244232');
        rect(ctx, tx + 9, groundY - 8, 3, 6, '#3a2a1a');
      }
    } else if (name === 'crypt') {
      circle(ctx, 300, 34, 14, '#e8e4c8'); circle(ctx, 306, 30, 12, bands[0]);
      for (var s = 0; s < 30; s++) rect(ctx, (s * 53) % W, (s * 29) % (groundY - 70), 1, 1, '#d8d8f0');
      ridge(p.far, groundY - 20, 14, 50, 30);
      for (var g = 0; g < 6; g++) {
        var gx = 20 + g * 64 + (g % 2) * 12;
        rect(ctx, gx, groundY - 18, 12, 18, '#6a6a74'); rect(ctx, gx + 2, groundY - 21, 8, 3, '#6a6a74');
        rect(ctx, gx + 5, groundY - 15, 2, 8, '#4a4a54'); rect(ctx, gx + 3, groundY - 13, 6, 2, '#4a4a54');
      }
      rect(ctx, 170, groundY - 50, 4, 50, '#2a2420'); rect(ctx, 160, groundY - 44, 12, 3, '#2a2420'); rect(ctx, 172, groundY - 36, 12, 3, '#2a2420');
    } else if (name === 'camp') {
      circle(ctx, 70, 58, 16, '#ffe0a0');
      ridge(p.far, groundY - 24, 18, 50, 20);
      function tent(x, col) {
        poly(ctx, [x, groundY - 2, x + 22, groundY - 34, x + 44, groundY - 2], col);
        poly(ctx, [x + 17, groundY - 2, x + 22, groundY - 18, x + 27, groundY - 2], '#3a2a1a');
        rect(ctx, x + 21, groundY - 40, 2, 7, '#3a2a1a'); rect(ctx, x + 23, groundY - 40, 7, 4, '#c0392b');
      }
      tent(150, '#c4a070'); tent(330, '#a07a50');
      rect(ctx, 214, groundY - 6, 14, 3, '#5a3a20');
      poly(ctx, [215, groundY - 6, 221, groundY - 18, 227, groundY - 6], '#f08a2a');
      poly(ctx, [218, groundY - 6, 221, groundY - 13, 224, groundY - 6], '#ffd84a');
    } else if (name === 'mountain') {
      ridge(p.far, groundY - 50, 50, 70, 0);
      for (var m = 0; m < 4; m++) {
        var mx = m * 110 + 30;
        poly(ctx, [mx - 34, groundY - 40, mx, groundY - 104 + (m % 2) * 20, mx + 34, groundY - 40], '#7a8290');
        poly(ctx, [mx - 10, groundY - 80 + (m % 2) * 20, mx, groundY - 104 + (m % 2) * 20, mx + 10, groundY - 80 + (m % 2) * 20], '#f0f4f8');
      }
      ridge(p.mid, groundY - 14, 18, 36, 70);
      for (var r2 = 0; r2 < 5; r2++) { rect(ctx, 30 + r2 * 80, groundY - 6, 10, 6, '#5e5a50'); rect(ctx, 32 + r2 * 80, groundY - 8, 6, 2, '#6e6a60'); }
    } else if (name === 'lair') {
      poly(ctx, [80, groundY - 20, 150, groundY - 110, 180, groundY - 110, 260, groundY - 20], '#2a1210');
      rect(ctx, 150, groundY - 112, 30, 4, '#ff6a2a');
      poly(ctx, [158, groundY - 108, 166, groundY - 70, 172, groundY - 108], '#ff8a2a');
      for (var e = 0; e < 18; e++) rect(ctx, (e * 47) % W, (e * 31) % (groundY - 40), 1, 1, e % 2 ? '#ff8a3a' : '#ffcf5a');
      ridge(p.far, groundY - 14, 20, 40, 40);
    }

    // ground
    rect(ctx, 0, groundY - 4, W, H - groundY + 4, p.ground);
    for (var gx2 = 0; gx2 < W; gx2 += 6) rect(ctx, gx2 + ((gx2 / 6) % 2) * 2, groundY - 6, 2, 2, p.ground);
    rect(ctx, 0, groundY + 10, W, H, p.groundDark);
    for (var d = 0; d < 40; d++) rect(ctx, (d * 37) % W, groundY + 2 + (d * 7) % 28, 2, 1, d % 3 ? p.groundDark : p.path);
    if (name === 'lair') for (var l = 0; l < 7; l++) rect(ctx, 20 + l * 55, groundY + 6 + (l % 3) * 6, 14, 1, '#e8501a');
    if (name === 'meadow') for (var f = 0; f < 16; f++) rect(ctx, (f * 61) % W, groundY + (f * 5) % 10, 2, 2, f % 2 ? '#f5e663' : '#f0f0f0');
  }

  function drawScene(ctx, name, W, H, groundY) {
    var key = name + W + 'x' + H;
    if (!sceneCache[key]) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var cx = c.getContext('2d');
      drawSceneTo(cx, name, W, H, groundY);
      sceneCache[key] = c;
    }
    ctx.drawImage(sceneCache[key], 0, 0);
  }

  RK.Art = {
    drawCharacter: drawCharacter,
    drawScene: drawScene,
    rect: rect,
    circle: circle,
    lerp: lerp,
    clamp01: clamp01,
    KNIGHT: {
      type: 'humanoid', scale: 1.25, head: 'helm', skin: '#e0b08a', hand: '#6a7280',
      armor: '#9aa3b0', cloth: '#2f5d9a', emblem: '#f3d36a', pants: '#5a6272', boots: '#3a3030',
      weapon: 'sword', gem: '#e04a3a', shield: 'kite', backItem: 'crossbow', eyes: '#222'
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
