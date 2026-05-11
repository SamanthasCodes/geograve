/* ────────────────────────────────────────────
   Geograve — D3 orthographic globe
   Renders biome polygons + 30° graticule and supports drag-to-rotate.
   Public API hangs off Geograve.globe.
   ──────────────────────────────────────────── */

Geograve.globe = (function () {

  let svg = null;
  let projection = null;
  let path = null;
  let biomesG = null;
  let graticuleG = null;
  let sphereG = null;
  let pointsG = null;
  let pendingFrame = false;
  let layerRefs = {};

  // Per-(slug+week) JSON cache. Keys are "<slug>/<week>", values are the
  // Promise returned by d3.json, so concurrent callers of loadWeek share
  // a single fetch.
  const weekCache = new Map();

  function create(svgEl) {
    const PANEL = Geograve.PANEL_GLOBE;
    const W = PANEL.w;
    const H = PANEL.h;

    projection = d3.geoOrthographic()
      .scale(Math.min(W, H) / 2 - 10)
      .translate([W / 2, H / 2])
      .rotate([95, -38])
      .clipAngle(90);

    path = d3.geoPath(projection);

    svg = d3.select(svgEl)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    sphereG = svg.append("g").attr("class", "sphere-layer");
    sphereG.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "globe-sphere")
      .attr("d", path)
      .attr("fill", Geograve.BIOME_COLOR_MAP["Ocean"])
      .attr("opacity", 0.85);

    biomesG = svg.append("g").attr("class", "biomes-layer");
    graticuleG = svg.append("g").attr("class", "graticule-layer");
    // Abundance points draw on top of biomes + graticule (Phase 3).
    pointsG = svg.append("g").attr("class", "points-layer");

    // Layer registry for the debug toggles exposed below. Keys are the
    // labels user code passes to toggleLayer / setLayerVisible.
    layerRefs = {
      sphere:    sphereG,
      biomes:    biomesG,
      graticule: graticuleG,
      points:    pointsG,
    };
  }

  // ── GeoJSON winding-order fix ──
  // The biome dataset uses RFC 7946 winding (outer rings CCW); D3's spherical
  // clip expects the opposite. Custom planar/wrapped-Δlng signed-area tests
  // give the wrong answer for polygons that enclose a pole (Antarctica, large
  // Arctic regions), so we leaned on D3 itself: d3.geoArea is the canonical
  // spherical area calc, and a polygon whose computed area is > 2π steradians
  // (half the sphere) is necessarily interpreted as its complement → winding
  // is wrong → reverse all its rings.
  const HALF_SPHERE = 2 * Math.PI;

  function fixPolygonWinding(rings) {
    if (!rings || rings.length === 0) return;
    if (d3.geoArea({ type: "Polygon", coordinates: rings }) > HALF_SPHERE) {
      rings.forEach(function (ring) { ring.reverse(); });
    }
  }

  function fixGeometryWinding(geom) {
    if (!geom) return;
    if (geom.type === "Polygon") {
      fixPolygonWinding(geom.coordinates);
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach(fixPolygonWinding);
    } else if (geom.type === "GeometryCollection") {
      geom.geometries.forEach(fixGeometryWinding);
    }
  }

  function rewindFeatureCollection(fc) {
    fc.features.forEach(function (f) { fixGeometryWinding(f.geometry); });
    return fc;
  }

  function renderBiomes(featureCollection) {
    rewindFeatureCollection(featureCollection);

    biomesG.selectAll("path.biome")
      .data(featureCollection.features)
      .join("path")
      .attr("class", "biome")
      .attr("d", path)
      .attr("fill", function (d) {
        // BIOME_NAME is the canonical RESOLVE field; biome_group is mis-grouped
        // in the source data. See Geograve.BIOME_NAME_TO_GROUP.
        const name  = d.properties && d.properties.BIOME_NAME;
        const group = Geograve.BIOME_NAME_TO_GROUP[name] || "Other";
        return Geograve.BIOME_COLOR_MAP[group] || Geograve.BIOME_COLOR_MAP["Ocean"];
      })
      .attr("opacity", 0.78)
      .attr("stroke", "none");
  }

  function renderGraticule() {
    // 30° latitude/longitude lines (Geograve.GLOBE_GRATICULE_STEP)
    const graticule = d3.geoGraticule().step([30, 30]);
    graticuleG.selectAll("path").remove();
    graticuleG.append("path")
      .datum(graticule())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#435064")
      .attr("stroke-width", 0.6)
      .attr("opacity", 0.45);
  }

  function redraw() {
    sphereG.selectAll("path").attr("d", path);
    biomesG.selectAll("path").attr("d", path);
    graticuleG.selectAll("path").attr("d", path);
    // Re-project abundance points on every drag frame using a real
    // back-of-globe test (see refreshPointPositions).
    refreshPointPositions();
  }

  // ── Phase 3 abundance-point API ──

  // d3.geoProjection.clipAngle(90) clips PATHS via geoPath, but a direct
  // projection([lon, lat]) call returns a 2D point regardless of which
  // hemisphere the point is on — back-of-globe points fold over onto the
  // visible disk. We have to do our own visibility test: a point (lon, lat)
  // is on the visible hemisphere iff the dot product of its unit-sphere
  // position with the unit-sphere center of the projection is positive.
  //
  // The projection center on the sphere is at (-rotate[0], -rotate[1]) deg.
  // dot = sin(lat0)·sin(lat) + cos(lat0)·cos(lat)·cos(lon - lon0)
  // visible ⇔ dot > 0   (i.e., angular distance < 90°)
  //
  // We refresh every "live" circle once per drag/render frame, caching
  // sin/cos of the center to avoid recomputing per point.
  function refreshPointPositions() {
    if (!pointsG) return;
    const r = projection.rotate();
    const lon0 = -r[0] * Math.PI / 180;
    const lat0 = -r[1] * Math.PI / 180;
    const sinLat0 = Math.sin(lat0);
    const cosLat0 = Math.cos(lat0);

    pointsG.selectAll("circle.point").each(function (d) {
      const latR = d.lat * Math.PI / 180;
      const lonR = d.lon * Math.PI / 180;
      const visible =
        sinLat0 * Math.sin(latR) +
        cosLat0 * Math.cos(latR) * Math.cos(lonR - lon0) > 0;
      const sel = d3.select(this);
      if (visible) {
        const p = projection([d.lon, d.lat]);
        sel.attr("cx", p[0]).attr("cy", p[1]).style("display", null);
      } else {
        sel.style("display", "none");
      }
    });
  }

  function weekKey(slug, week) {
    return slug + "/" + week;
  }

  // Fetch a week JSON, caching the Promise so concurrent callers share one
  // network request. Returns the cached Promise on a hit.
  function loadWeek(slug, week) {
    const k = weekKey(slug, week);
    if (weekCache.has(k)) return weekCache.get(k);
    const url = "data/species/" + slug + "/week_" +
                String(week).padStart(2, "0") + ".json";
    const p = d3.json(url);
    weekCache.set(k, p);
    return p;
  }

  // Fire-and-forget: warm the cache for an upcoming week without blocking.
  function prefetchWeek(slug, week) {
    loadWeek(slug, week);
  }

  function renderAbundancePoints(points, globalMax) {
    if (!pointsG) return;
    const sizeScale  = d3.scaleSqrt().domain([0, globalMax || 1]).range([0, 8]);
    // Sequential Plasma heatmap: low abundance → deep blue, high → yellow.
    // Reads as a true density encoding on top of the dark navy backdrop.
    const colorScale = d3.scaleSequential(d3.interpolatePlasma)
                         .domain([0, globalMax || 1]);

    pointsG.selectAll("circle.point")
      .data(points || [], function (d) { return d.lat + "," + d.lon; })
      .join(
        function (enter) {
          return enter.append("circle")
            .attr("class", "point")
            .attr("fill-opacity", 0.75)
            .attr("stroke", "none")
            .attr("pointer-events", "none");
        }
      )
      .attr("r",    function (d) { return sizeScale(d.abundance);  })
      .attr("fill", function (d) { return colorScale(d.abundance); });

    // Initial visibility + cx/cy pass.
    refreshPointPositions();
  }

  function clearPoints() {
    if (!pointsG) return;
    pointsG.selectAll("*").remove();
  }

  // ── Debug layer toggles ──
  // For investigating render artifacts in DevTools. Layers: "sphere",
  // "biomes", "graticule", "points". Usage:
  //   Geograve.globe.toggleLayer("points")     // flip current visibility
  //   Geograve.globe.setLayerVisible("biomes", false)
  //   Geograve.globe.listLayers()              // ["sphere","biomes",...]

  function toggleLayer(name) {
    const sel = layerRefs[name];
    if (!sel) {
      console.warn(
        'Geograve.globe.toggleLayer: unknown layer "' + name + '". Available: ' +
        Object.keys(layerRefs).join(", ")
      );
      return;
    }
    const node = sel.node();
    const wasVisible = node.style.display !== "none";
    node.style.display = wasVisible ? "none" : "";
    console.log('layer "' + name + '" → ' + (wasVisible ? "hidden" : "visible"));
    return !wasVisible;
  }

  function setLayerVisible(name, visible) {
    const sel = layerRefs[name];
    if (!sel) return;
    sel.node().style.display = visible ? "" : "none";
  }

  function listLayers() {
    return Object.keys(layerRefs);
  }

  function enableDrag() {
    const sensitivity = 0.28;  // deg per pixel
    svg.call(d3.drag().on("drag", function (event) {
      const r = projection.rotate();
      projection.rotate([
        r[0] + event.dx * sensitivity,
        r[1] - event.dy * sensitivity
      ]);
      // Throttle to one repaint per animation frame to keep drag smooth
      // even with ~847 biome features.
      if (!pendingFrame) {
        pendingFrame = true;
        requestAnimationFrame(function () {
          redraw();
          pendingFrame = false;
        });
      }
    }));
  }

  return {
    create,
    renderBiomes,
    renderGraticule,
    enableDrag,
    loadWeek,
    prefetchWeek,
    renderAbundancePoints,
    clearPoints,
    // Debug helpers (Phase 3 LL-5 investigation)
    toggleLayer,
    setLayerVisible,
    listLayers,
  };
})();
