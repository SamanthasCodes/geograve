/* ────────────────────────────────────────────
   Geograve — species info card (Phase 2C)
   Renders header + 4-line taxonomy + Macaulay photo iframe +
   IUCN/trend pill badges into a container (typically #species-card).
   ──────────────────────────────────────────── */

(function () {

  // Build the direct-photo URL from a PHOTO_ML_ID like "ML618996326".
  // The Macaulay iframe embed pulls in Cornell's full media player plus
  // GTM/HubSpot analytics, which spams the console with CSP-blocked fetches
  // from inside their own sandbox. The CDN serves the same asset as a flat
  // image, so we skip the iframe entirely.
  function photoUrlFromMlId(mlId) {
    if (!mlId) return null;
    const num = String(mlId).replace(/^ML/, "");
    if (!num) return null;
    return "https://cdn.download.ams.birds.cornell.edu/api/v2/asset/" + num + "/480";
  }

  function el(tag, opts) {
    const node = document.createElement(tag);
    if (!opts) return node;
    if (opts.className) node.className = opts.className;
    if (opts.text)      node.textContent = opts.text;
    if (opts.html)      node.innerHTML = opts.html;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (k) {
        node.setAttribute(k, opts.attrs[k]);
      });
    }
    if (opts.style) Object.assign(node.style, opts.style);
    return node;
  }

  function buildBadge(text, hex) {
    const s = Geograve.getBadgeStyle(hex);
    return el("span", {
      className: "badge",
      text:      text,
      style: {
        borderColor:     s.stroke,
        backgroundColor: s.fill,
        color:           s.color,
        borderWidth:     s.strokeWidth + "px",
        borderStyle:     "solid",
        borderRadius:    s.borderRadius + "px"
      }
    });
  }

  function buildTaxonomyRow(label, value, valueClass) {
    const row = el("div", { className: "tax-row" });
    row.appendChild(el("span", { className: "label", text: label }));
    row.appendChild(el("span", {
      className: "value" + (valueClass ? " " + valueClass : ""),
      text:      value
    }));
    return row;
  }

  function render(species, container) {
    if (!species || !container) return;
    container.innerHTML = "";
    container.style.display = "flex";

    // ── Header: bird icon + COMMON_NAME ──
    const header = el("div", { className: "header" });
    header.appendChild(el("img", {
      attrs: { src: "icons/bird.png", alt: "" }
    }));
    header.appendChild(el("span", {
      className: "name",
      text: species.COMMON_NAME
    }));
    container.appendChild(header);

    // ── Taxonomy block (4 rows) ──
    const taxonomy = el("div", { className: "taxonomy" });
    taxonomy.appendChild(buildTaxonomyRow("COMMON", species.COMMON_NAME));
    taxonomy.appendChild(buildTaxonomyRow(
      "SCIENTIFIC",
      species.SCIENTIFIC_NAME,
      "scientific"
    ));
    taxonomy.appendChild(buildTaxonomyRow(
      "FAMILY",
      species.FAMILY_COMMON_NAME + " • " + species.FAMILY_SCIENTIFIC_NAME,
      "family"
    ));
    taxonomy.appendChild(buildTaxonomyRow("ORDER", species.ORDER));
    container.appendChild(taxonomy);

    // ── Media + badges row ──
    const mediaRow = el("div", { className: "media-row" });

    const photoFrame = el("div", { className: "photo-frame" });
    const photoSrc = photoUrlFromMlId(species.PHOTO_ML_ID);
    if (photoSrc) {
      const img = el("img", {
        attrs: {
          src:     photoSrc,
          alt:     species.COMMON_NAME + " photo",
          loading: "lazy"
        }
      });
      photoFrame.appendChild(img);
    }
    mediaRow.appendChild(photoFrame);

    const badges = el("div", { className: "badges" });
    badges.appendChild(buildBadge(
      species.REDLIST_CATEGORY,
      Geograve.getIucnColor(species.REDLIST_CATEGORY)
    ));
    badges.appendChild(buildBadge(
      "Population " + species.POPULATION_TREND,
      Geograve.getTrendColor(species.POPULATION_TREND)
    ));
    mediaRow.appendChild(badges);

    container.appendChild(mediaRow);
  }

  window.Geograve = window.Geograve || {};
  window.Geograve.card = { render: render };
})();
