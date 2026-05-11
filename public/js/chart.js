/* ────────────────────────────────────────────
   Geograve — regional distribution bar chart (Phase 4)
   Phase 4A: pure aggregation helpers only.
   Phase 4B will extend with the renderer + state machine + DOM wiring.
   ──────────────────────────────────────────── */

Geograve.chart = (function () {

  // The four standard eBird Status & Trends seasons. Resident-only
  // species (Andean Condor) use `resident` instead. We defensively
  // filter out any other season values that might appear in future
  // data drops — the current 16 species' CSVs only use these five.
  const STANDARD_SEASONS = [
    "breeding",
    "nonbreeding",
    "prebreeding_migration",
    "postbreeding_migration",
  ];

  const TOP_N = 3;

  // ── filterCountryRows ────────────────────────────────────────────────
  // Keep only country rows whose season is one of the four standard
  // seasons or "resident". Drops state/province rows and non-standard
  // season values (Africa, EU, etc.) so the aggregation layer never sees
  // them.

  function filterCountryRows(rows) {
    return rows.filter(function (r) {
      if (r.region_type !== "country") return false;
      if (r.season === "resident") return true;
      return STANDARD_SEASONS.indexOf(r.season) !== -1;
    });
  }

  // ── isResidentOnly ───────────────────────────────────────────────────
  // True iff every country row has season === "resident". Used by the UI
  // to gray-out the non-applicable season tabs (e.g., Andean Condor).

  function isResidentOnly(rows) {
    const countryRows = rows.filter(function (r) {
      return r.region_type === "country";
    });
    if (countryRows.length === 0) return false;
    return countryRows.every(function (r) {
      return r.season === "resident";
    });
  }

  // ── aggregateForSeason ───────────────────────────────────────────────
  // Returns [{region_name, value}] sorted descending by value. `value` is
  // the mean of `total_pop_percent` over the wanted-season set, treating
  // missing-row regions as 0 for that season (so global totals still sum
  // to ~100 % per season).
  //
  // For resident-only species:
  //   - "all" returns the resident rows as-is.
  //   - all other season keys return [] (the chart disables those tabs).

  function aggregateForSeason(rows, seasonKey) {
    const cleaned = filterCountryRows(rows);
    const residentOnly = isResidentOnly(rows);

    if (residentOnly) {
      if (seasonKey !== "all") return [];
      // Use resident rows directly; total_pop_percent already reflects
      // year-round population share.
      const byRegionRes = {};
      cleaned.forEach(function (r) {
        const v = parseFloat(r.total_pop_percent) || 0;
        const p = parseFloat(r.max_week_percent_pop) || 0;
        if (!byRegionRes[r.region_name]) {
          byRegionRes[r.region_name] = { sum: 0, peakPercent: 0, peakWeek: null };
        }
        const rec = byRegionRes[r.region_name];
        rec.sum += v;
        if (p > rec.peakPercent) {
          rec.peakPercent = p;
          rec.peakWeek = r.max_week;
        }
      });
      return recordsToSortedArray(byRegionRes, 1);
    }

    let wantedSeasons;
    if (seasonKey === "all") {
      wantedSeasons = STANDARD_SEASONS;
    } else if (seasonKey === "breeding") {
      wantedSeasons = ["breeding"];
    } else if (seasonKey === "wintering") {
      wantedSeasons = ["nonbreeding"];
    } else if (seasonKey === "migration") {
      wantedSeasons = ["prebreeding_migration", "postbreeding_migration"];
    } else {
      return [];
    }

    // Sum values per region across the wanted seasons, then divide by the
    // wanted-season count to get the mean (treating missing rows as 0 —
    // this keeps the "% of pop in this country during this period"
    // semantics consistent across tabs). Also track the maximum peak-week
    // share across the wanted seasons (for the tooltip's "Peak: …" line).
    const byRegion = {};
    cleaned.forEach(function (r) {
      if (wantedSeasons.indexOf(r.season) === -1) return;
      const v = parseFloat(r.total_pop_percent) || 0;
      const p = parseFloat(r.max_week_percent_pop) || 0;
      if (!byRegion[r.region_name]) {
        byRegion[r.region_name] = { sum: 0, peakPercent: 0, peakWeek: null };
      }
      const rec = byRegion[r.region_name];
      rec.sum += v;
      if (p > rec.peakPercent) {
        rec.peakPercent = p;
        rec.peakWeek = r.max_week;
      }
    });

    return recordsToSortedArray(byRegion, wantedSeasons.length);
  }

  // ── topNWithOther ────────────────────────────────────────────────────
  // [top1, top2, top3, {region_name: "Other", value: sumOfRest, isOther}]
  // If the input has fewer than n rows, the Other row has value 0.

  function topNWithOther(aggregated, n) {
    const N = (typeof n === "number") ? n : TOP_N;
    const top = aggregated.slice(0, N);
    const rest = aggregated.slice(N);
    const otherSum = rest.reduce(function (s, r) { return s + r.value; }, 0);
    return top.concat([{
      region_name: "Other",
      value: otherSum,
      isOther: true,
    }]);
  }

  // ── helper ───────────────────────────────────────────────────────────

  // obj keyed by region_name → { sum, peakPercent, peakWeek }.
  // divisor: number of seasons being averaged (1 for resident or
  // single-season tabs, 2 for migration, 4 for All Year).
  function recordsToSortedArray(obj, divisor) {
    const arr = Object.keys(obj).map(function (k) {
      const rec = obj[k];
      return {
        region_name: k,
        value:       rec.sum / divisor,
        peakWeek:    rec.peakWeek,
        peakPercent: rec.peakPercent,
      };
    });
    arr.sort(function (a, b) { return b.value - a.value; });
    return arr;
  }

  // ── Phase 4B: state machine + renderer ───────────────────────────────

  const SEASON_LABEL = {
    all:       "All Year",
    breeding:  "Breeding",
    migration: "Migration",
    wintering: "Wintering",
  };

  const state = {
    rows:        null,
    cache:       new Map(),
    slug:        null,
    seasonKey:   "all",
    isResident:  false,
    renderToken: 0,
  };

  // DOM refs cached on init.
  let containerEl   = null;
  let svgEl         = null;
  let headingModEl  = null;
  let tabEls        = [];
  let tooltipEl     = null;

  function init(container) {
    containerEl  = container;
    svgEl        = container.querySelector(".bar-chart");
    headingModEl = container.querySelector(".section-heading .modifier");
    tabEls       = Array.prototype.slice.call(
                     container.querySelectorAll(".season-tab"));

    tabEls.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-disabled")) return;
        setSeason(btn.dataset.season);
      });
    });

    // Tooltip overlay (Phase 4C). Lives inside the chart container so its
    // absolute positioning is relative to the chart, not the document.
    tooltipEl = document.createElement("div");
    tooltipEl.className = "bar-tooltip";
    container.appendChild(tooltipEl);
  }

  // ── Tooltip helpers (Phase 4C) ───────────────────────────────────────

  const MONTH_NAMES_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatPeakWeek(dateStr) {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return dateStr;
    return MONTH_NAMES_SHORT[parseInt(m[2], 10)] + " " + parseInt(m[3], 10);
  }

  function tooltipHTML(d) {
    if (d.isOther) {
      return '<div class="tt-region">Other countries</div>' +
             '<div class="tt-value">' + (d.value * 100).toFixed(1) + '% combined</div>';
    }
    let html = '<div class="tt-region">' + d.region_name + '</div>' +
               '<div class="tt-value">' + (d.value * 100).toFixed(1) + '% of population</div>';
    const peakWeek = formatPeakWeek(d.peakWeek);
    if (peakWeek && d.peakPercent) {
      html += '<div class="tt-peak">Peak: ' + peakWeek +
              ' (' + (d.peakPercent * 100).toFixed(1) + '%)</div>';
    }
    return html;
  }

  function showTooltip(e, d) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = tooltipHTML(d);
    positionTooltip(e);
    tooltipEl.classList.add("is-visible");
  }

  function moveTooltip(e) {
    if (!tooltipEl || !tooltipEl.classList.contains("is-visible")) return;
    positionTooltip(e);
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-visible");
  }

  function positionTooltip(e) {
    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left + 12;
    const y = e.clientY - rect.top + 12;
    // Keep within container bounds (clamp right edge).
    const ttW = tooltipEl.offsetWidth || 180;
    const maxX = rect.width - ttW - 4;
    tooltipEl.style.left = Math.min(x, maxX) + "px";
    tooltipEl.style.top  = y + "px";
  }

  function loadRegionalStats(slug) {
    if (state.cache.has(slug)) return state.cache.get(slug);
    const url = "data/species/" + slug + "/regional_stats.csv";
    const p = d3.csv(url);
    state.cache.set(slug, p);
    return p;
  }

  function onSpeciesSelected(species) {
    const myToken = ++state.renderToken;
    const slug = Geograve.speciesSlug(species.COMMON_NAME);
    state.slug = slug;
    state.seasonKey = "all";
    hideTooltip();

    loadRegionalStats(slug).then(function (rows) {
      if (myToken !== state.renderToken) return;
      state.rows = rows;
      state.isResident = isResidentOnly(rows);

      // Tab enable / disable + active reset to "all"
      tabEls.forEach(function (btn) {
        const key = btn.dataset.season;
        const disable = state.isResident && key !== "all";
        btn.classList.toggle("is-disabled", disable);
        btn.classList.toggle("is-active", key === "all");
      });

      containerEl.style.display = "flex";
      renderForSeason("all");
    }).catch(function (err) {
      console.error("Geograve.chart: regional_stats load failed —", err);
    });
  }

  function setSeason(seasonKey) {
    if (seasonKey === state.seasonKey) return;
    state.seasonKey = seasonKey;
    tabEls.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.season === seasonKey);
    });
    hideTooltip();   // bars about to rebuild — avoid a stale tooltip
    renderForSeason(seasonKey);
  }

  function renderForSeason(seasonKey) {
    if (!state.rows) return;
    if (headingModEl) {
      headingModEl.textContent = "• " + SEASON_LABEL[seasonKey];
    }
    const agg = aggregateForSeason(state.rows, seasonKey);
    const top = topNWithOther(agg, TOP_N);
    renderBars(top);
  }

  // Bar-chart geometry (constant 4-row layout: top-3 + Other).
  const ROW_HEIGHT  = 28;
  const LABEL_WIDTH = 78;
  const PCT_WIDTH   = 56;
  const GAP         = 10;

  const MAX_LABEL_CHARS = 11;

  function labelFor(d) {
    if (d.isOther) return "Other";
    if (window.countryEmojiMap && countryEmojiMap[d.region_name]) {
      const e = countryEmojiMap[d.region_name];
      return e.emoji + " " + e.abbrev;
    }
    // Defensive fallback for region names not in the emoji map (e.g.,
    // "Saint Pierre and Miquelon", "United Republic of Tanzania",
    // "Canada EEZ"). Truncate so the label doesn't overflow into the bar.
    const name = d.region_name;
    if (name.length <= MAX_LABEL_CHARS) return name;
    return name.slice(0, MAX_LABEL_CHARS) + "…";
  }

  function renderBars(rows) {
    if (!svgEl) return;
    const svg = d3.select(svgEl);

    // Width from layout (container is visible at this point).
    const totalW = svgEl.clientWidth || 460;
    const totalH = rows.length * ROW_HEIGHT;
    const trackW = Math.max(40, totalW - LABEL_WIDTH - PCT_WIDTH - GAP * 2);

    svg.attr("viewBox", "0 0 " + totalW + " " + totalH)
       .style("height", totalH + "px");

    // Bars represent ABSOLUTE percentage of the species' population (0..1).
    // Normalizing against the max value in the displayed set would always
    // saturate the top bar regardless of its absolute share — misleading
    // when USA has 63 % or Other has 49.8 %.
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, trackW]);

    const rowsSel = svg.selectAll("g.bar-row")
      .data(rows, function (d) { return d.region_name; })
      .join(
        function (enter) {
          const g = enter.append("g")
            .attr("class", "bar-row")
            .attr("opacity", 0);
          g.append("text").attr("class", "bar-label");
          g.append("rect").attr("class", "bar-track").attr("rx", 3).attr("ry", 3);
          g.append("rect").attr("class", "bar-fill").attr("rx", 3).attr("ry", 3)
            .attr("width", 0);
          g.append("text").attr("class", "bar-percent");
          // Capture a transparent hit-rect over the whole row so the
          // tooltip handlers fire reliably even when the cursor isn't on
          // a colored element.
          g.append("rect").attr("class", "bar-hit")
            .attr("fill", "transparent")
            .attr("y", 0)
            .attr("height", ROW_HEIGHT);
          g.on("mouseenter", function (e, d) { showTooltip(e, d); })
           .on("mousemove",  function (e)    { moveTooltip(e);    })
           .on("mouseleave", function ()     { hideTooltip();     });
          g.transition().duration(250).attr("opacity", 1);
          return g;
        },
        function (update) { return update; },
        function (exit)   {
          return exit.transition().duration(200).attr("opacity", 0).remove();
        }
      );

    rowsSel
      .attr("transform", function (d, i) {
        return "translate(0," + (i * ROW_HEIGHT) + ")";
      });

    const midY = ROW_HEIGHT / 2;

    rowsSel.select("text.bar-label")
      .attr("x", 0)
      .attr("y", midY)
      .classed("is-other", function (d) { return !!d.isOther; })
      .text(labelFor);

    rowsSel.select("rect.bar-track")
      .attr("x", LABEL_WIDTH + GAP)
      .attr("y", midY - Geograve.BAR_HEIGHT / 2)
      .attr("width", trackW)
      .attr("height", Geograve.BAR_HEIGHT)
      .attr("fill", Geograve.BAR_TRACK_COLOR);

    rowsSel.select("rect.bar-fill")
      .attr("x", LABEL_WIDTH + GAP)
      .attr("y", midY - Geograve.BAR_HEIGHT / 2)
      .attr("height", Geograve.BAR_HEIGHT)
      .attr("fill", Geograve.BAR_FILL_COLOR)
      .transition().duration(350)
      .attr("width", function (d) { return xScale(d.value); });

    rowsSel.select("text.bar-percent")
      .attr("x", totalW)
      .attr("y", midY)
      .text(function (d) { return (d.value * 100).toFixed(1) + "%"; });

    // Hit-rect that lets the tooltip handlers fire reliably across the
    // whole row, not just on the colored bar.
    rowsSel.select("rect.bar-hit")
      .attr("x", 0)
      .attr("width", totalW)
      .attr("height", ROW_HEIGHT);
  }

  return {
    filterCountryRows:  filterCountryRows,
    isResidentOnly:     isResidentOnly,
    aggregateForSeason: aggregateForSeason,
    topNWithOther:      topNWithOther,
    init:               init,
    onSpeciesSelected:  onSpeciesSelected,
    setSeason:          setSeason,
  };
})();
