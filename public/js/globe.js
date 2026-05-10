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
  let pendingFrame = false;

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

  return { create, renderBiomes, renderGraticule, enableDrag };
})();
