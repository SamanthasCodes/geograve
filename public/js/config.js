/* ────────────────────────────────────────────
   Geograve — design tokens + runtime constants
   Plain-JS port of Design Info/geograve.tokens.js
   No `export`; everything hangs off window.Geograve
   ──────────────────────────────────────────── */

const Geograve = {

  // ── Backgrounds & Surfaces ──
  COLOR_BG_APP:       "#162130",
  COLOR_BG_PANEL:     "#162130",
  COLOR_BG_SEARCH:    "#242e3c",
  COLOR_PANEL_STROKE: "#435064",

  // ── Accent ──
  COLOR_ACCENT: "#7ec8a0",

  // ── Text Hierarchy ──
  COLOR_TEXT_PRIMARY:   "#e9e4d9",
  COLOR_TEXT_SECONDARY: "#cbcac2",
  COLOR_TEXT_TERTIARY:  "#9da2a4",
  COLOR_TEXT_MUTED:     "#84888d",

  // ── IUCN Red List Category ──
  COLOR_STATUS_LEAST_CONCERN:   "#7ec8a0",
  COLOR_STATUS_NEAR_THREATENED: "#C9A84C",
  COLOR_STATUS_VULNERABLE:      "#D4956A",

  // ── Population Trend ──
  COLOR_TREND_INCREASING: "#7ec8a0",
  COLOR_TREND_STABLE:     "#7FB8D4",
  COLOR_TREND_DECREASING: "#E05A5A",

  // ── Biome Colors ──
  // NOTE: data file biomes.geojson contains a 6th group "Other" (19 features
  // not covered by the named biomes). We map "Other" to the same color as
  // "Ocean" — matches the convention in Data/Biomes/biome_globe_layer.js.
  BIOME_COLOR_MAP: {
    "Forest":              "#2D6A4F",
    "Grassland & Savanna": "#8DB048",
    "Desert":              "#D4956A",
    "Tundra & Ice":        "#7FB8D4",
    "Wetlands & Coast":    "#2BBFB0",
    "Ocean":               "#2E6BA8",
    "Other":               "#2E6BA8"
  },

  // The `biome_group` field already in biomes.geojson is mis-grouped (e.g., it
  // labels Tundra and Boreal Forests as "Wetlands & Coast", and Mangroves as
  // "Other"). The canonical RESOLVE field BIOME_NAME is reliable; we derive
  // the correct group from it via this lookup.
  BIOME_NAME_TO_GROUP: {
    "Tropical & Subtropical Moist Broadleaf Forests":          "Forest",
    "Tropical & Subtropical Dry Broadleaf Forests":            "Forest",
    "Tropical & Subtropical Coniferous Forests":               "Forest",
    "Temperate Broadleaf & Mixed Forests":                     "Forest",
    "Temperate Conifer Forests":                               "Forest",
    "Boreal Forests/Taiga":                                    "Forest",
    "Mediterranean Forests, Woodlands & Scrub":                "Forest",

    "Tropical & Subtropical Grasslands, Savannas & Shrublands":"Grassland & Savanna",
    "Temperate Grasslands, Savannas & Shrublands":             "Grassland & Savanna",
    "Montane Grasslands & Shrublands":                         "Grassland & Savanna",

    "Flooded Grasslands & Savannas":                           "Wetlands & Coast",
    "Mangroves":                                               "Wetlands & Coast",

    "Tundra":                                                  "Tundra & Ice",

    "Deserts & Xeric Shrublands":                              "Desert",

    "N/A":                                                     "Other"
  },

  // ── Typography ──
  FONT_FAMILY:       "'Playfair Display', Georgia, serif",
  FONT_SIZE_WORDMARK:        36,
  FONT_SIZE_TAGLINE:         20,
  FONT_SIZE_SPECIES:         14,
  FONT_SIZE_SCIENTIFIC:      12,
  FONT_SIZE_FAMILY:          11,
  FONT_SIZE_META_LABEL:      11,
  FONT_SIZE_SECTION:         12.5,
  FONT_SIZE_SEASON_BTN:      12,
  FONT_SIZE_COUNTRY:         10.5,
  FONT_SIZE_PERCENTAGE:      10,
  FONT_SIZE_DATE:            13,
  FONT_SIZE_BIOME:           11,
  FONT_WEIGHT_REGULAR:       400,
  FONT_WEIGHT_BOLD:          700,

  // ── Section heading colors ──
  SECTION_HEAD_LABEL_COLOR:    "#84888d",
  SECTION_HEAD_MODIFIER_COLOR: "#7ec8a0",

  // ── Season filter tabs ──
  TAB_COLOR_DEFAULT:  "#9da2a4",
  TAB_COLOR_ACTIVE:   "#7ec8a0",
  TAB_BORDER_DEFAULT: "rgba(255,255,255,0.18)",
  TAB_BORDER_ACTIVE:  "#7ec8a0",

  // ── Distribution bar ──
  BAR_TRACK_COLOR: "rgba(67, 80, 100, 0.6)",
  BAR_FILL_COLOR:  "#7ec8a0",
  BAR_HEIGHT:      6,

  // ── Timeline bar ──
  TIMELINE_TRACK_STROKE: "#435064",
  TIMELINE_TRACK_FILL:   "rgba(67, 80, 100, 0.25)",
  TIMELINE_PROGRESS:     "#7ec8a0",

  // ── Panel dimensions (Figma reference, 1366×768 canvas) ──
  PANEL_HEADER: { w: 512.2, h: 109.6, x: 19.1,  y: 16.5  },
  PANEL_INFO:   { w: 512.3, h: 614.7, x: 18.6,  y: 136.8 },
  PANEL_GLOBE:  { w: 799,   h: 734.9, x: 547.1, y: 16.5  },
  PANEL_BORDER_RADIUS: 15,
  PANEL_STROKE_WIDTH:  2,
  PANEL_PADDING:       18,

  // ── Globe defaults ──
  GLOBE_INITIAL_ROTATION: [95, -38],   // centered on US (≈ Kansas, 95°W 38°N)
  GLOBE_GRATICULE_STEP:   [30, 30],

  // ── Animation defaults (Phase 3) ──
  ANIMATION_INTERVAL_MS: 300,
  PREFETCH_WEEKS_AHEAD:  2,

  // ── Helpers ──
  hexToRgba: function (hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  getBadgeStyle: function (hex) {
    return {
      stroke:       hex,
      fill:         this.hexToRgba(hex, 0.25),
      color:        hex,
      strokeWidth:  2,
      borderRadius: 4
    };
  },

  // Display name → public/data/species/<slug>/ folder lookup
  speciesSlug: function (commonName) {
    return commonName.replaceAll(" ", "_");
  }
};

window.Geograve = Geograve;
