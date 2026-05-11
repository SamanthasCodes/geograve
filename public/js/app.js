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

    // Phase 2B: mount the autocomplete search.
    Geograve.search.init(species);

    // Phase 3C: mount the timeline UI (play button, scrub track, label).
    Geograve.timeline.init();

    // Phase 4B: mount the regional distribution bar chart.
    Geograve.chart.init(document.getElementById("species-chart"));

    // Phase 2C + 3C + 4B: when the user picks a species, render the
    // card, hand the species to the timeline (week 1, paused), and feed
    // the chart its regional_stats.csv for the All Year tab.
    const cardContainer = document.getElementById("species-card");
    document.addEventListener("species-selected", function (e) {
      Geograve.state.selectedSpecies = e.detail;
      Geograve.card.render(e.detail, cardContainer);
      Geograve.timeline.onSpeciesSelected(e.detail);
      Geograve.chart.onSpeciesSelected(e.detail);
    });

    // Hide the loading overlay (CSS transitions opacity).
    overlay.classList.add("hidden");
  }).catch(function (err) {
    console.error("Geograve: data load failed —", err);
    const spinner = overlay.querySelector(".spinner");
    if (spinner) spinner.style.borderTopColor = "#E05A5A";  // red on error
  });
});
