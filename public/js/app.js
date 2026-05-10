/* ────────────────────────────────────────────
   Geograve — application entry point
   Loads biomes + species data, mounts globe, hides loader.
   ──────────────────────────────────────────── */

Geograve.state = Geograve.state || {};

document.addEventListener("DOMContentLoaded", function () {
  const svgEl = document.getElementById("globe-svg");
  const overlay = document.getElementById("loading-overlay");

  // Initialize the empty globe (sphere + empty biome/graticule layers).
  Geograve.globe.create(svgEl);

  // Fetch biomes (large, ~23 MB) and species metadata in parallel.
  Promise.all([
    d3.json("data/biomes.geojson"),
    d3.json("data/species.json")
  ]).then(function (results) {
    const biomes = results[0];
    const species = results[1];

    // Cache species for Phase 2 (search + card).
    Geograve.state.species = species;

    // Render the loaded globe content and enable rotation.
    Geograve.globe.renderBiomes(biomes);
    Geograve.globe.renderGraticule();
    Geograve.globe.enableDrag();

    // Hide the loading overlay (CSS transitions opacity).
    overlay.classList.add("hidden");
  }).catch(function (err) {
    console.error("Geograve: data load failed —", err);
    const spinner = overlay.querySelector(".spinner");
    if (spinner) spinner.style.borderTopColor = "#E05A5A";  // red on error
  });
});
