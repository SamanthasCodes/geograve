// ─────────────────────────────────────────────
//  GEOGRAVE — Design Tokens
//  Font: Playfair Display (400, 400i, 700)
//  Load via: https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400
// ─────────────────────────────────────────────


// ── Backgrounds & Surfaces ───────────────────

export const COLOR_BG_APP          = "#162130";   // main app background
export const COLOR_BG_PANEL        = "#162130";   // panel fill (same as app bg, separated by stroke)
export const COLOR_BG_SEARCH       = "#242e3c";   // search box fill
export const COLOR_PANEL_STROKE    = "#435064";   // panel border — 2pt, border-radius 15px


// ── Accent ───────────────────────────────────

export const COLOR_ACCENT          = "#7ec8a0";   // primary mint green
                                                  // used on: logo "ave", search border, active tab,
                                                  // progress bar fill, play button, timeline fill,
                                                  // section heading italic modifier


// ── Text Hierarchy ───────────────────────────

export const COLOR_TEXT_PRIMARY    = "#e9e4d9";   // primary text (species name, percentages)
export const COLOR_TEXT_SECONDARY  = "#cbcac2";   // subtext (scientific name, date, biome legend)
export const COLOR_TEXT_TERTIARY   = "#9da2a4";   // sub-subtext (family/order, country names, inactive tabs)
export const COLOR_TEXT_MUTED      = "#84888d";   // muted labels (COMMON, SEASONAL, Distribution by Region)


// ── IUCN Red List Category Badges ────────────
//  All badges: stroke 2pt, border-radius 4px, fill at 25% opacity of stroke color

export const COLOR_STATUS_LEAST_CONCERN  = "#7ec8a0";   // Least Concern
export const COLOR_STATUS_NEAR_THREATENED= "#C9A84C";   // Near Threatened — warm gold
export const COLOR_STATUS_VULNERABLE     = "#D4956A";   // Vulnerable — terracotta


// ── Population Trend Badges ──────────────────
//  Same badge style as Red List above

export const COLOR_TREND_INCREASING = "#7ec8a0";  // Increasing — accent green
export const COLOR_TREND_STABLE     = "#7FB8D4";  // Stable — tundra blue
export const COLOR_TREND_DECREASING = "#E05A5A";  // Decreasing — red


// ── Biome Colors (globe + legend) ────────────

export const COLOR_BIOME_FOREST    = "#2D6A4F";
export const COLOR_BIOME_GRASSLAND = "#8DB048";
export const COLOR_BIOME_DESERT    = "#D4956A";
export const COLOR_BIOME_TUNDRA    = "#7FB8D4";
export const COLOR_BIOME_WETLANDS  = "#2BBFB0";
export const COLOR_BIOME_OCEAN     = "#2E6BA8";

export const BIOME_COLOR_MAP = {
  "Forest":              COLOR_BIOME_FOREST,
  "Grassland & Savanna": COLOR_BIOME_GRASSLAND,
  "Desert":              COLOR_BIOME_DESERT,
  "Tundra & Ice":        COLOR_BIOME_TUNDRA,
  "Wetlands & Coast":    COLOR_BIOME_WETLANDS,
  "Ocean":               COLOR_BIOME_OCEAN,
};


// ── Typography ───────────────────────────────
//  All text uses Playfair Display

export const FONT_FAMILY           = "'Playfair Display', Georgia, serif";

export const FONT_SIZE_WORDMARK    = 36;    // pt — "Geograve" logo
export const FONT_SIZE_TAGLINE     = 20;    // pt — "Mapping the Avian World" + loading screen tagline
export const FONT_SIZE_SPECIES     = 14;    // px — species common name, bold
export const FONT_SIZE_SCIENTIFIC  = 12;    // px — scientific name, italic
export const FONT_SIZE_FAMILY      = 11;    // pt — family / order line
export const FONT_SIZE_META_LABEL  = 11;    // px — COMMON / SCIENTIFIC / FAMILY labels, all-caps
export const FONT_SIZE_SECTION     = 12.5;  // pt — "SEASONAL • Exploration" headings
export const FONT_SIZE_SEASON_BTN  = 12;    // pt — All Year / Breeding / Migration / Wintering tabs
export const FONT_SIZE_COUNTRY     = 10.5;  // px — country name + emoji in distribution list
export const FONT_SIZE_PERCENTAGE  = 10;    // pt — percentage values, italic
export const FONT_SIZE_DATE        = 13;    // pt — "September, 2023" timeline label
export const FONT_SIZE_BIOME       = 11;    // pt — biome legend labels
export const FONT_SIZE_DATASOURCE  = 7;     // pt — "DATA SOURCES" label
export const FONT_SIZE_DATASOURCE_DETAIL = 5.5; // pt — source list text

// Font weight constants
export const FONT_WEIGHT_REGULAR   = 400;
export const FONT_WEIGHT_BOLD      = 700;


// ── Section Heading Pattern ──────────────────
//  "SEASONAL • Exploration" / "DISTRIBUTION BY REGION • Wintering"
//  Render as two tspan elements — the italic modifier updates dynamically

export const SECTION_HEAD_LABEL_COLOR    = COLOR_TEXT_MUTED;    // #84888d — uppercase bold part
export const SECTION_HEAD_MODIFIER_COLOR = COLOR_ACCENT;        // #7ec8a0 — italic dynamic part


// ── Season Filter Tabs ───────────────────────

export const TAB_COLOR_DEFAULT     = COLOR_TEXT_TERTIARY;  // #9da2a4 — inactive
export const TAB_COLOR_ACTIVE      = COLOR_ACCENT;         // #7ec8a0 — active / hover, bold
export const TAB_BORDER_DEFAULT    = "rgba(255,255,255,0.18)";
export const TAB_BORDER_ACTIVE     = COLOR_ACCENT;


// ── Status Badge Helper ──────────────────────
//  Returns border/text color + rgba fill for any badge

export function getBadgeStyle(hex) {
  return {
    stroke: hex,
    fill:   hexToRgba(hex, 0.25),
    color:  hex,
    strokeWidth: 2,
    borderRadius: 4,
  };
}


// ── Distribution Bar ─────────────────────────

export const BAR_TRACK_COLOR       = "rgba(67, 80, 100, 0.6)";  // #435064 at ~60%
export const BAR_FILL_COLOR        = COLOR_ACCENT;
export const BAR_HEIGHT            = 6;    // px


// ── Play / Timeline Bar ──────────────────────

export const TIMELINE_TRACK_STROKE = COLOR_PANEL_STROKE;         // #435064
export const TIMELINE_TRACK_FILL   = "rgba(67, 80, 100, 0.25)"; // #435064 at 25%
export const TIMELINE_PROGRESS     = COLOR_ACCENT;


// ── Panel Dimensions (from Figma) ────────────
//  Reference canvas: ~1366 × 768

export const PANEL_HEADER = { w: 512.2, h: 109.6, x: 19.1,  y: 16.5  };
export const PANEL_INFO   = { w: 512.3, h: 614.7, x: 18.6,  y: 136.8 };
export const PANEL_GLOBE  = { w: 799,   h: 734.9, x: 547.1, y: 16.5  };

export const PANEL_BORDER_RADIUS   = 15;   // px
export const PANEL_STROKE_WIDTH    = 2;    // pt
export const PANEL_PADDING         = 18;   // px — approximate uniform internal padding


// ── Utility ──────────────────────────────────

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
