/* ────────────────────────────────────────────
   Geograve — species search (Phase 2B)
   Autocomplete dropdown over the #search-input.
   On select, dispatches `species-selected` on document.
   ──────────────────────────────────────────── */

(function () {
  let inputEl    = null;
  let wrapEl     = null;
  let dropdownEl = null;
  let speciesData    = [];
  let currentMatches = [];
  let highlightIdx   = -1;

  // ── Pure-logic filter ── (Python spec mirrors this exactly)
  function filterSpecies(query, allSpecies) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return allSpecies.slice();
    return allSpecies.filter(function (s) {
      return s.COMMON_NAME.toLowerCase().indexOf(q) !== -1;
    });
  }

  function ensureDropdown() {
    if (dropdownEl) return;
    dropdownEl = document.createElement("ul");
    dropdownEl.id = "search-dropdown";
    dropdownEl.setAttribute("role", "listbox");
    wrapEl.appendChild(dropdownEl);
  }

  function renderRows(matches) {
    ensureDropdown();
    dropdownEl.innerHTML = "";
    matches.forEach(function (sp, i) {
      const li = document.createElement("li");
      li.textContent = sp.COMMON_NAME;
      li.setAttribute("role", "option");
      li.dataset.idx = String(i);
      if (i === highlightIdx) li.classList.add("highlighted");

      // mousedown (not click) fires before the input's blur, so selection
      // survives the blur-induced dropdown hide.
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        select(sp);
      });

      li.addEventListener("mousemove", function () {
        if (highlightIdx !== i) {
          highlightIdx = i;
          updateHighlight();
        }
      });

      dropdownEl.appendChild(li);
    });
    dropdownEl.style.display = matches.length ? "block" : "none";
  }

  function updateHighlight() {
    if (!dropdownEl) return;
    const rows = dropdownEl.children;
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("highlighted", i === highlightIdx);
    }
    // Keep the highlighted row visible in the scroll viewport.
    if (highlightIdx >= 0 && rows[highlightIdx]) {
      const item   = rows[highlightIdx];
      const itemTop = item.offsetTop;
      const itemBot = itemTop + item.offsetHeight;
      if (itemTop < dropdownEl.scrollTop) {
        dropdownEl.scrollTop = itemTop;
      } else if (itemBot > dropdownEl.scrollTop + dropdownEl.clientHeight) {
        dropdownEl.scrollTop = itemBot - dropdownEl.clientHeight;
      }
    }
  }

  function hideDropdown() {
    if (dropdownEl) dropdownEl.style.display = "none";
    highlightIdx = -1;
  }

  function select(species) {
    inputEl.value = species.COMMON_NAME;
    hideDropdown();
    document.dispatchEvent(new CustomEvent("species-selected", { detail: species }));
  }

  function onInput() {
    const raw = inputEl.value;
    if (!raw.trim()) {
      currentMatches = [];
      hideDropdown();
      return;
    }
    currentMatches = filterSpecies(raw, speciesData);
    highlightIdx = currentMatches.length ? 0 : -1;
    renderRows(currentMatches);
  }

  function onKeydown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!currentMatches.length) return;
      highlightIdx = (highlightIdx + 1) % currentMatches.length;
      updateHighlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!currentMatches.length) return;
      highlightIdx = (highlightIdx - 1 + currentMatches.length) % currentMatches.length;
      updateHighlight();
    } else if (e.key === "Enter") {
      if (highlightIdx >= 0 && currentMatches[highlightIdx]) {
        e.preventDefault();
        select(currentMatches[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      hideDropdown();
    }
  }

  function onBlur() {
    // Delay so mousedown on a row registers first.
    setTimeout(hideDropdown, 150);
  }

  function init(allSpecies) {
    speciesData = allSpecies || [];
    inputEl = document.getElementById("search-input");
    if (!inputEl) {
      console.error("Geograve.search.init: #search-input not found");
      return;
    }
    wrapEl = inputEl.parentElement;
    if (!wrapEl || !wrapEl.classList.contains("search-wrap")) {
      console.warn("Geograve.search.init: expected #search-input inside .search-wrap");
      wrapEl = wrapEl || inputEl.parentElement;
    }
    inputEl.addEventListener("input", onInput);
    inputEl.addEventListener("keydown", onKeydown);
    inputEl.addEventListener("blur", onBlur);
  }

  window.Geograve = window.Geograve || {};
  window.Geograve.search = {
    init:          init,
    filterSpecies: filterSpecies
  };
})();
