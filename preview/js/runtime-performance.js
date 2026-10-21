/* Keep the simulation clock moving without rebuilding unchanged vehicle cards. */
(function () {
  'use strict';
  if (typeof frame !== 'function' || typeof render !== 'function') return;

  const previousFrame = frame;
  const previousRender = render;
  let insideFrame = false;
  let lastState;
  let clockSuffix = '';

  // Include the complete campaign, including nested finance/industry data. Only the
  // clock is excluded: actions, day changes and incoming offers still refresh UI.
  function stateWithoutClock() {
    return JSON.stringify({ ...s, minute: undefined });
  }

  function rememberClockSuffix() {
    const clock = document.getElementById('time');
    if (clock) clockSuffix = clock.textContent.replace(/^\d{2}:\d{2}/, '');
  }

  function updateClock() {
    const clock = document.getElementById('time');
    if (!clock) return;
    const hours = String(Math.floor(s.minute / 60)).padStart(2, '0');
    const minutes = String(Math.floor(s.minute % 60)).padStart(2, '0');
    const next = hours + ':' + minutes + clockSuffix;
    if (clock.textContent !== next) clock.textContent = next;
  }

  render = function () {
    if (insideFrame && stateWithoutClock() === lastState) {
      updateClock();
      return;
    }
    // Explicit renders from user actions must always run, even if their UI state
    // (active tab, filters, pause/speed controls) is not part of the saved campaign.
    const result = previousRender.apply(this, arguments);
    lastState = stateWithoutClock();
    rememberClockSuffix();
    return result;
  };

  // Reuse the actual simulation loop: timing, speed, modal pause, day progression
  // and requestAnimationFrame scheduling retain the existing game rules.
  frame = function () {
    insideFrame = true;
    try {
      return previousFrame.apply(this, arguments);
    } finally {
      insideFrame = false;
    }
  };

  lastState = stateWithoutClock();
  rememberClockSuffix();
})();
