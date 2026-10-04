(() => {
  const DEFAULT_RUNNING_HEAD = "GRID PROTOCOL";

  const LIST_COLUMN_MIN_ITEMS = 8;
  const LIST_COLUMN_MIN_CHARS = 520;
  const REF_COLUMN_MIN_ITEMS = 6;
  const REF_COLUMN_MIN_CHARS = 600;
  const FLOW_COLUMN_MIN_BLOCKS = 3;
  const FLOW_COLUMN_MIN_CHARS = 760;
  const CORNER_GRID_SIDE = 5;
  const CORNER_GRID_CELLS = CORNER_GRID_SIDE * CORNER_GRID_SIDE;

  const FLOW_SKIP_SLIDE_CLASSES = new Set([
    "gp-title",
    "gp-outline",
    "gp-divider",
    "gp-claim",
    "gp-reading",
    "gp-quote-slide",
    "gp-exhibit",
    "gp-half",
    "gp-filters",
    "gp-table-slide",
    "gp-references",
  ]);

  function isLeafSlide(section) {
    return !section.querySelector(":scope > section");
  }

  function getTextLength(node) {
    if (!(node instanceof Element)) return 0;
    return node.textContent.replace(/\s+/g, " ").trim().length;
  }

  function assignFolioNumbers(root = document) {
    const sections = Array.from(root.querySelectorAll(".reveal .slides section"));
    const leafSlides = sections.filter(isLeafSlide);
    leafSlides.forEach((slide, i) => {
      if (!slide.dataset.runningHead) slide.dataset.runningHead = DEFAULT_RUNNING_HEAD;
      if (!slide.dataset.gpFolio) slide.dataset.gpFolio = String(i + 1);
    });
  }

  function fitRunningHeadRules(root = document) {
    const slides = getLeafSlides(root);
    if (!slides.length) return;

    let measure = document.querySelector("[data-gp-running-head-measure='true']");
    if (!measure) {
      measure = document.createElement("span");
      measure.dataset.gpRunningHeadMeasure = "true";
      measure.setAttribute("aria-hidden", "true");
      Object.assign(measure.style, {
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        visibility: "hidden",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      });
      document.body.appendChild(measure);
    }

    slides.forEach((slide) => {
      const label = normalizeLabelText(slide.dataset.runningHead || DEFAULT_RUNNING_HEAD);
      const style = window.getComputedStyle(slide, "::before");
      measure.textContent = label;
      measure.style.fontFamily = style.fontFamily;
      measure.style.fontSize = style.fontSize;
      measure.style.fontWeight = style.fontWeight;
      measure.style.letterSpacing = style.letterSpacing;
      measure.style.textTransform = style.textTransform;
      const width = measure.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        slide.style.setProperty("--gp-running-head-width", `${Math.ceil(width)}px`);
      }
    });
  }

  function normalizeLabelText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLeafSlides(root = document) {
    const sections = Array.from(root.querySelectorAll(".reveal .slides section"));
    return sections.filter(isLeafSlide);
  }

  function getSlideHeading(slide) {
    const explicit = normalizeLabelText(slide.dataset.gpSection || "");
    if (explicit) return explicit;

    const heading = slide.querySelector(":scope > h1, :scope > h2, :scope > h3");
    if (heading) return normalizeLabelText(heading.textContent);

    const tag = slide.querySelector(":scope > .gp-kicker.gp-tag, :scope > .gp-tag");
    if (tag) return normalizeLabelText(tag.textContent);

    return "";
  }

  function normalizeMatrixTitle(raw) {
    const clean = normalizeLabelText(raw)
      .replace(/^section\s+\d+\s*[:\-]?\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return "PRELUDE";
    const compact = clean
      .replace(/\b(the|a|an)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    const text = compact || clean.toUpperCase();
    if (text.length <= 24) return text;
    return `${text.slice(0, 23).trimEnd()}…`;
  }

  function buildSlideSectionState(leafSlides) {
    const state = [];
    let sectionNumber = 0;
    let sectionTitle = "Prelude";

    leafSlides.forEach((slide, slideIndex) => {
      const explicit = normalizeLabelText(slide.dataset.gpSection || "");

      if (slide.classList.contains("gp-divider")) {
        sectionNumber += 1;
        sectionTitle = getSlideHeading(slide) || `Section ${String(sectionNumber).padStart(2, "0")}`;
      }

      if (explicit) {
        const explicitKey = explicit.toLowerCase();
        const sectionKey = normalizeLabelText(sectionTitle).toLowerCase();
        if (!slide.classList.contains("gp-divider") && explicitKey !== sectionKey) {
          sectionNumber += 1;
        } else if (sectionNumber === 0) {
          sectionNumber = 1;
        }
        sectionTitle = explicit;
      }

      state.push({
        slide,
        slideIndex,
        sectionNumber,
        sectionTitle: sectionTitle || "Prelude",
      });
    });

    const totals = new Map();
    state.forEach((info) => {
      const key = String(info.sectionNumber);
      totals.set(key, (totals.get(key) || 0) + 1);
    });

    const seen = new Map();
    state.forEach((info) => {
      const key = String(info.sectionNumber);
      const localIndex = seen.get(key) || 0;
      info.localIndex = localIndex;
      info.sectionLength = totals.get(key) || 1;
      seen.set(key, localIndex + 1);
    });

    return state;
  }

  function getGoldenSpiralCells(value) {
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    const phi = (1 + Math.sqrt(5)) / 2;
    const centerX = 2;
    const centerY = 2;
    const count = Math.round((normalized / 100) * 20) + 2;
    const lit = new Set();

    for (let i = 0; i < count; i += 1) {
      const angle = i * phi * 2 * Math.PI + normalized * 0.1;
      const radius = Math.sqrt(i / count) * 2.5;
      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));
      if (x >= 0 && x < CORNER_GRID_SIDE && y >= 0 && y < CORNER_GRID_SIDE) {
        lit.add(y * CORNER_GRID_SIDE + x);
      }
    }

    return Array.from(lit);
  }

  function ensureCornerMatrixNode(slide) {
    let widget = slide.querySelector(":scope > .gp-corner-matrix[data-gp-generated='true']");
    if (widget) return widget;

    widget = document.createElement("aside");
    widget.className = "gp-corner-matrix";
    widget.dataset.gpGenerated = "true";
    widget.setAttribute("aria-hidden", "true");

    const meta = document.createElement("div");
    meta.className = "gp-corner-matrix__meta";

    const section = document.createElement("div");
    section.className = "gp-corner-matrix__section";
    meta.appendChild(section);

    const title = document.createElement("div");
    title.className = "gp-corner-matrix__title";
    meta.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "gp-corner-matrix__grid";
    for (let i = 0; i < CORNER_GRID_CELLS; i += 1) {
      const cell = document.createElement("span");
      cell.className = "gp-corner-matrix__cell";
      grid.appendChild(cell);
    }

    widget.append(meta, grid);
    slide.appendChild(widget);
    return widget;
  }

  function updateCornerMatrix(widget, info, totalSlides) {
    const sectionLine = widget.querySelector(".gp-corner-matrix__section");
    const titleLine = widget.querySelector(".gp-corner-matrix__title");
    const cells = Array.from(widget.querySelectorAll(".gp-corner-matrix__cell"));
    if (!sectionLine || !titleLine || cells.length !== CORNER_GRID_CELLS) return;

    sectionLine.textContent = `Section ${String(info.sectionNumber).padStart(2, "0")}:`;
    titleLine.textContent = normalizeMatrixTitle(info.sectionTitle || "Prelude");

    cells.forEach((cell) => {
      cell.classList.remove("is-on", "is-trace", "is-hot");
    });

    const value = totalSlides <= 1 ? 100 : (info.slideIndex / (totalSlides - 1)) * 100;
    const litCells = getGoldenSpiralCells(value);
    litCells.forEach((idx) => {
      cells[idx].classList.add("is-on");
    });
  }

  function renderCornerMatrices(root = document) {
    const leafSlides = getLeafSlides(root);
    const state = buildSlideSectionState(leafSlides);
    const totalSlides = state.length || 1;
    state.forEach((info) => {
      const widget = ensureCornerMatrixNode(info.slide);
      updateCornerMatrix(widget, info, totalSlides);
    });
  }

  function findUnderlineAnchor(bar) {
    let probe = bar.previousElementSibling;
    while (probe) {
      if (probe.matches("h1, h2, h3, .gp-code")) return probe;
      probe = probe.previousElementSibling;
    }
    return null;
  }

  function getRevealScale() {
    const reveal = window.Reveal;
    if (!reveal || typeof reveal.getScale !== "function") return 1;
    const scale = Number(reveal.getScale());
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function findTagAnchor(bar) {
    let probe = bar.previousElementSibling;
    while (probe) {
      if (probe.matches(".gp-tag, .gp-kicker.gp-tag")) return probe;
      probe = probe.previousElementSibling;
    }
    const slide = bar.closest(".gp-slide");
    if (!slide) return null;
    const fallback = slide.querySelector(":scope > .gp-kicker.gp-tag, :scope > .gp-tag");
    return fallback instanceof HTMLElement ? fallback : null;
  }

  function fitAccentBars(root = document) {
    const bars = Array.from(root.querySelectorAll(".gp-accent-bar"));
    const revealScale = getRevealScale();
    bars.forEach((bar) => {
      const slide = bar.closest(".gp-slide");
      const isDivider = Boolean(slide && slide.classList.contains("gp-divider"));
      const underlineMode = String(bar.dataset.gpUnderline || "").toLowerCase();
      const preferTagWidth = underlineMode === "tag" || (underlineMode !== "heading" && isDivider);

      if (preferTagWidth) {
        const tagAnchor = findTagAnchor(bar);
        if (tagAnchor) {
          const tagWidth = tagAnchor.getBoundingClientRect().width / revealScale;
          if (Number.isFinite(tagWidth) && tagWidth > 0) {
            const tagScaleRaw = Number.parseFloat(bar.dataset.gpUnderlineTagScale || "");
            const tagScale = Number.isFinite(tagScaleRaw) ? tagScaleRaw : 1;
            const width = Math.max(0, Math.min(tagWidth * tagScale, 980));
            bar.style.setProperty("--gp-underline-width", `${width.toFixed(2)}px`);
            return;
          }
        }
      }

      const anchor = findUnderlineAnchor(bar);
      if (!anchor) {
        bar.style.removeProperty("--gp-underline-width");
        return;
      }

      const anchorWidth = anchor.getBoundingClientRect().width / revealScale;
      if (!Number.isFinite(anchorWidth) || anchorWidth <= 0) return;

      const overrideRatio = Number.parseFloat(bar.dataset.gpUnderlineRatio || "");
      const ratio = Number.isFinite(overrideRatio) ? overrideRatio : isDivider ? 0.52 : 0.46;
      const minWidth = isDivider ? 220 : 180;
      const maxWidth = isDivider ? 620 : 520;
      const width = Math.max(minWidth, Math.min(Math.round(anchorWidth * ratio), maxWidth));
      bar.style.setProperty("--gp-underline-width", `${width}px`);
    });
  }

  function shouldSkipFlowColumns(slide) {
    for (const className of FLOW_SKIP_SLIDE_CLASSES) {
      if (slide.classList.contains(className)) return true;
    }
    if (slide.querySelector(":scope > .gp-two-col, :scope > .gp-filter-grid, :scope > .gp-reading-grid")) return true;
    if (slide.querySelector(":scope > figure, :scope > table, :scope > .gp-quote")) return true;
    return false;
  }

  function applyLongTextColumns(root = document) {
    const listNodes = Array.from(root.querySelectorAll(".gp-list, .gp-refs"));
    listNodes.forEach((listNode) => {
      const itemCount = listNode.querySelectorAll(":scope > li").length;
      const charCount = getTextLength(listNode);
      const isReferences = listNode.classList.contains("gp-refs");
      const minItems = isReferences ? REF_COLUMN_MIN_ITEMS : LIST_COLUMN_MIN_ITEMS;
      const minChars = isReferences ? REF_COLUMN_MIN_CHARS : LIST_COLUMN_MIN_CHARS;
      const forceColumns = listNode.dataset.gpColumns === "2";
      const shouldColumnize = forceColumns || itemCount >= minItems || charCount >= minChars;
      listNode.classList.toggle("gp-auto-columns-list", shouldColumnize);
    });

    const slides = Array.from(root.querySelectorAll(".reveal .slides > section.gp-slide"));
    slides.forEach((slide) => {
      const forceColumns = slide.dataset.gpAutoColumns === "true";
      if (shouldSkipFlowColumns(slide) && !forceColumns) return;

      let flow = slide.querySelector(":scope > .gp-auto-columns-content[data-gp-generated='true']");
      if (!flow) {
        const candidates = Array.from(slide.children).filter((child) =>
          child.matches("p, .gp-body, ul, ol, blockquote"),
        );
        if (candidates.length >= 2) {
          flow = document.createElement("div");
          flow.className = "gp-auto-columns-content";
          flow.dataset.gpGenerated = "true";
          slide.insertBefore(flow, candidates[0]);
          candidates.forEach((node) => flow.appendChild(node));
        }
      }

      if (!flow) return;

      const blockCount = flow.querySelectorAll(":scope > p, :scope > .gp-body, :scope > ul, :scope > ol, :scope > blockquote")
        .length;
      const textLength = getTextLength(flow);
      const shouldActivate = forceColumns || (blockCount >= FLOW_COLUMN_MIN_BLOCKS && textLength >= FLOW_COLUMN_MIN_CHARS);
      flow.classList.toggle("gp-auto-columns-content--active", shouldActivate);
    });
  }

  function applyLayoutAutomation(root = document) {
    assignFolioNumbers(root);
    fitRunningHeadRules(root);
    renderCornerMatrices(root);
    fitAccentBars(root);
    applyLongTextColumns(root);
  }

  let refreshScheduled = false;
  function scheduleLayoutRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      applyLayoutAutomation(document);
    });
  }

  function bindRevealHooks() {
    if (typeof window.Reveal === "undefined" || !window.Reveal || typeof window.Reveal.on !== "function") return;
    window.Reveal.on("ready", scheduleLayoutRefresh);
    window.Reveal.on("slidechanged", scheduleLayoutRefresh);
    window.Reveal.on("resize", scheduleLayoutRefresh);
  }

  window.addEventListener("DOMContentLoaded", () => {
    scheduleLayoutRefresh();
    bindRevealHooks();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleLayoutRefresh).catch(() => {});
    }
  });

  window.addEventListener("load", scheduleLayoutRefresh, { once: true });
  window.addEventListener("resize", scheduleLayoutRefresh, { passive: true });
})();
