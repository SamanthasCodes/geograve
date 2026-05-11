/* ────────────────────────────────────────────
   Geograve — timeline + animation state (Phase 3)
   Phase 3A: pure helpers (week→month label, scrub fraction, etc.)
   Phase 3C: state machine that drives the play/pause/scrub UI,
   loads weeks, and renders abundance points on the globe.
   ──────────────────────────────────────────── */

Geograve.timeline = (function () {

  const WEEKS_PER_YEAR = 52;
  const YEAR_LABEL     = "2023";
  const EMPTY_LABEL    = "Select a Species";

  // Map a 1-indexed week to a "<month>, 2023" label (lowercase).
  // Computed as ((week-1) * 12) / 52 so the dividend is integer first; this
  // gives exact integers at quarter-points (week 27 → 6.0 exactly) and dodges
  // an FP-precision footgun where (12/52)*26 can round below 6.
  function weekToMonthLabel(week) {
    let idx = Math.floor(((week - 1) * 12) / WEEKS_PER_YEAR);
    if (idx < 0) idx = 0;
    if (idx > 11) idx = 11;
    return Geograve.MONTH_NAMES[idx] + ", " + YEAR_LABEL;
  }

  // Map a 0..1 fraction (e.g., click offsetX / track width) to a 1..52 week.
  // Clamped at both ends.
  function fractionToWeek(frac) {
    let f = frac;
    if (f < 0) f = 0;
    if (f > 1) f = 1;
    return Math.round(f * (WEEKS_PER_YEAR - 1)) + 1;
  }

  // Build the on-disk path to a week JSON. Week is zero-padded to two digits.
  function weekFilePath(slug, week) {
    const ww = String(week).padStart(2, "0");
    return "data/species/" + slug + "/week_" + ww + ".json";
  }

  // Annual-cycle successor: 52 wraps to 1.
  function nextWeek(week) {
    return week === WEEKS_PER_YEAR ? 1 : week + 1;
  }

  // List of `lookahead` upcoming weeks, wrapping through nextWeek.
  // prefetchList(50, 4) === [51, 52, 1, 2]
  function prefetchList(week, lookahead) {
    const out = [];
    let w = week;
    for (let i = 0; i < lookahead; i++) {
      w = nextWeek(w);
      out.push(w);
    }
    return out;
  }

  // ── Phase 3C: state machine ──────────────────────────────────────

  const state = {
    slug:        null,
    week:        1,
    playing:     false,
    intervalId:  null,
    globalMax:   0,
    // Monotonic token; an inflight loadWeek resolution is ignored if its
    // token doesn't match — guards against fast species-swaps where an
    // older fetch resolves after a newer one.
    renderToken: 0
  };

  let playBtnEl    = null;
  let playIconEl   = null;
  let trackEl      = null;
  let progressEl   = null;
  let labelEl      = null;

  function setLabel(text) {
    if (labelEl) labelEl.textContent = text;
  }

  function setProgress(week) {
    if (!progressEl) return;
    const pct = ((week - 1) / (WEEKS_PER_YEAR - 1)) * 100;
    progressEl.style.width = pct + "%";
  }

  function setPlayingIcon(playing) {
    if (!playBtnEl) return;
    playBtnEl.classList.toggle("is-playing", playing);
    playBtnEl.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function stopInterval() {
    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.playing = false;
    setPlayingIcon(false);
  }

  function renderWeek(week) {
    if (!state.slug) return;
    const myToken = ++state.renderToken;
    const slug = state.slug;
    const gm   = state.globalMax;
    Geograve.globe.loadWeek(slug, week).then(function (points) {
      // Drop stale resolutions: a newer renderWeek/onSpeciesSelected has
      // already moved on to a different week or species.
      if (myToken !== state.renderToken) return;
      if (slug !== state.slug) return;
      Geograve.globe.renderAbundancePoints(points, gm);
      // Warm the cache for upcoming weeks.
      const lookahead = Geograve.PREFETCH_WEEKS_AHEAD || 2;
      prefetchList(week, lookahead).forEach(function (w) {
        Geograve.globe.prefetchWeek(slug, w);
      });
    });
  }

  function tick() {
    state.week = nextWeek(state.week);
    setLabel(weekToMonthLabel(state.week));
    setProgress(state.week);
    renderWeek(state.week);
  }

  function togglePlay() {
    if (!state.slug) return;  // no-op until a species is loaded
    if (state.playing) {
      stopInterval();
    } else {
      state.playing = true;
      setPlayingIcon(true);
      const interval = Geograve.ANIMATION_INTERVAL_MS || 300;
      state.intervalId = setInterval(tick, interval);
    }
  }

  function scrubToFraction(frac) {
    if (!state.slug) return;
    state.week = fractionToWeek(frac);
    setLabel(weekToMonthLabel(state.week));
    setProgress(state.week);
    renderWeek(state.week);
    // Scrubbing does NOT toggle play/pause state.
  }

  function onTrackClick(e) {
    if (!state.slug) return;
    const rect = trackEl.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    scrubToFraction(frac);
  }

  function onSpeciesSelected(species) {
    // Resolved decision: re-selecting the same species resets to week 1, paused.
    stopInterval();
    Geograve.globe.clearPoints();

    const slug = Geograve.speciesSlug(species.COMMON_NAME);
    state.slug      = slug;
    state.week      = 1;
    state.globalMax = 0;
    state.renderToken += 1;
    const myToken = state.renderToken;

    setLabel("…");
    setProgress(1);

    // Load weeks_meta to get globalMax (drives the radius scale).
    d3.json("data/species/" + slug + "/weeks_meta.json").then(function (meta) {
      if (myToken !== state.renderToken) return;
      state.globalMax = (meta && meta.globalMax) || 1;
      setLabel(weekToMonthLabel(state.week));
      renderWeek(state.week);
    }).catch(function (err) {
      console.error("Geograve.timeline: weeks_meta load failed —", err);
      setLabel(EMPTY_LABEL);
    });
  }

  function init() {
    playBtnEl  = document.getElementById("timeline-play");
    playIconEl = document.getElementById("timeline-play-icon");
    trackEl    = document.getElementById("timeline-track");
    progressEl = document.getElementById("timeline-progress");
    labelEl    = document.getElementById("timeline-label");

    if (playBtnEl) playBtnEl.addEventListener("click", togglePlay);
    if (trackEl)   trackEl.addEventListener("click", onTrackClick);

    setLabel(EMPTY_LABEL);
    setProgress(1);
    setPlayingIcon(false);
  }

  return {
    weekToMonthLabel:  weekToMonthLabel,
    fractionToWeek:    fractionToWeek,
    weekFilePath:      weekFilePath,
    nextWeek:          nextWeek,
    prefetchList:      prefetchList,
    init:              init,
    onSpeciesSelected: onSpeciesSelected,
    togglePlay:        togglePlay,
    scrubToFraction:   scrubToFraction
  };
})();
