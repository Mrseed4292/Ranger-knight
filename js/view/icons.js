/*
 * Ranger Knight — small pixel-style SVG icons.
 * Each colour has its own shape so colour is never the only cue:
 *   G = shield, R = blade, Y = shout (horn with sound waves).
 */
(function (root) {
  'use strict';
  var RK = root.RK = root.RK || {};

  function svg(body, label) {
    return '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" ' +
      (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"') + '>' + body + '</svg>';
  }

  var BODIES = {
    G: '<path fill="#1b2a1b" d="M2 1h12v8h-1v2h-1v1h-1v1h-1v1H9v1H7v-1H6v-1H5v-1H4v-1H3V9H2z"/>' +
       '<path fill="currentColor" d="M3 2h10v7h-1v2h-1v1h-1v1H9v1H7v-1H6v-1H5v-1H4V9H3z"/>' +
       '<path fill="#ffffff" fill-opacity=".85" d="M7 4h2v2h2v2H9v4H7V8H5V6h2z"/>',
    R: '<path fill="#2a1414" d="M12 0h4v4l-7 7 1 1-2 2-1-1-3 3-3-3 3-3-1-1 2-2 1 1z"/>' +
       '<path fill="currentColor" d="M13 1h2v2l-7 7-2-2z"/>' +
       '<path fill="#ffffff" fill-opacity=".85" d="M13 1h2v1l-7 7-1-1z"/>' +
       '<path fill="#d9a826" d="M3 9h1v1h1v1h1v1h1v1H6v1H5v-1H4v-1H3v-1H2v-1h1z"/>' +
       '<path fill="#6b4423" d="M2 13h1v1h1v1H2v-1H1v-1z"/>',
    Y: '<path fill="#2a2208" d="M0 5h4l5-4h2v14H9l-5-4H0z"/>' +
       '<path fill="currentColor" d="M1 6h3l5-4h1v12H9L4 10H1z"/>' +
       '<path fill="#2a2208" d="M12 6h1v4h-1zM14 4h1v8h-1z"/>' +
       '<path fill="currentColor" d="M12 7h1v2h-1zM14 5h1v6h-1z"/>'
  };

  var HEART_FULL = '<svg viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#3a0a0a" d="M1 0h3v1h1V0h3v1h1v4H8v1H7v1H6v1H3V7H2V6H1V5H0V1h1z"/>' +
    '<path fill="#e0383a" d="M1 1h2v1h3V1h2v4H7v1H6v1H3V6H2V5H1z"/>' +
    '<path fill="#ff9a9a" d="M2 2h1v1H2z"/></svg>';
  var HEART_EMPTY = '<svg viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#3a0a0a" d="M1 0h3v1h1V0h3v1h1v4H8v1H7v1H6v1H3V7H2V6H1V5H0V1h1z"/>' +
    '<path fill="#5a4a4a" d="M1 1h2v1h3V1h2v4H7v1H6v1H3V6H2V5H1z"/>' +
    '<path fill="#3a0a0a" d="M4 2h1v1H4zM5 3h1v1H5zM4 4h1v1H4z"/></svg>';

  RK.Icons = {
    move: function (m, label) { return svg(BODIES[m], label); },
    heart: function (full) { return full ? HEART_FULL : HEART_EMPTY; },
    /** Fill every element carrying data-icon="G|R|Y" inside `scope`. */
    hydrate: function (scope) {
      var els = (scope || document).querySelectorAll('[data-icon]');
      for (var i = 0; i < els.length; i++) els[i].innerHTML = svg(BODIES[els[i].getAttribute('data-icon')]);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
