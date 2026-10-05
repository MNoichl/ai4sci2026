(() => {
  const LAYOUT_MAP = Object.freeze({
    title: "gp-title",
    outline: "gp-outline",
    divider: "gp-divider",
    claim: "gp-claim",
    bullets: "gp-bullets",
    reading: "gp-reading",
    quote: "gp-quote-slide",
    "quote-slide": "gp-quote-slide",
    exhibit: "gp-exhibit",
    half: "gp-half",
    filters: "gp-filters",
    table: "gp-table-slide",
    "table-slide": "gp-table-slide",
    references: "gp-references",
  });

  const GP_LAYOUT_CLASSES = new Set(Object.values(LAYOUT_MAP));

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^gp-/, "")
      .replace(/[\s_]+/g, "-");
  }

  function addClass(node, className) {
    if (!className || !(node instanceof Element)) return;
    if (!node.classList.contains(className)) node.classList.add(className);
  }

  function hasAnyLayoutClass(section) {
    return Array.from(section.classList).some((className) => GP_LAYOUT_CLASSES.has(className));
  }

  function resolveLayoutClass(rawToken) {
    const token = normalizeToken(rawToken);
    if (!token) return null;
    if (token.startsWith("gp-")) return token;
    return LAYOUT_MAP[token] || `gp-${token}`;
  }

  function findHeading(section) {
    return section.querySelector(":scope > h1, :scope > h2, :scope > h3");
  }

  function getLeafSections(root = document) {
    const sections = Array.from(root.querySelectorAll(".reveal .slides section"));
    return sections.filter((section) => !section.querySelector(":scope > section"));
  }

  function getLayoutToken(section, heading) {
    const candidates = [
      section.dataset.layout,
      section.dataset.gpLayout,
      section.getAttribute("layout"),
      section.getAttribute("gp-layout"),
      section.getAttribute("data-layout"),
      section.getAttribute("data-gp-layout"),
      heading ? heading.dataset.layout : "",
      heading ? heading.dataset.gpLayout : "",
      heading ? heading.getAttribute("layout") : "",
      heading ? heading.getAttribute("gp-layout") : "",
      heading ? heading.getAttribute("data-layout") : "",
      heading ? heading.getAttribute("data-gp-layout") : "",
    ];

    const fromClass = [...section.classList, ...(heading ? Array.from(heading.classList) : [])]
      .map((className) => {
        if (className.startsWith("layout-")) return className.slice(7);
        return className;
      })
      .find((className) => normalizeToken(className) in LAYOUT_MAP);

    if (fromClass) candidates.push(fromClass);
    return candidates.find((token) => String(token || "").trim()) || "";
  }

  function sanitizeQuartoSlide(section) {
    section.classList.remove("smaller", "scrollable");
    if (section.style && section.style.maxHeight) section.style.removeProperty("max-height");
  }

  function ensureMarks(section) {
    let marks = section.querySelector(":scope > .gp-marks");
    if (marks) return marks;
    marks = document.createElement("div");
    marks.className = "gp-marks";
    marks.setAttribute("aria-hidden", "true");
    section.insertBefore(marks, section.firstElementChild || null);
    return marks;
  }

  function ensureRunningHead(section, fallback) {
    if (!section.dataset.runningHead || !section.dataset.runningHead.trim()) {
      section.dataset.runningHead = fallback;
    }
  }

  function ensureListClasses(section) {
    const lists = section.querySelectorAll(":scope ul, :scope ol");
    lists.forEach((listNode) => {
      addClass(listNode, "gp-list");
      if (listNode.tagName === "OL") addClass(listNode, "gp-list--ordered");
    });
  }

  function convertAsides(section) {
    const children = Array.from(section.children);
    children.forEach((child) => {
      if (child.classList.contains("gp-note")) return;

      if (child.tagName === "ASIDE") {
        addClass(child, "gp-cites");
        return;
      }

      if (!child.classList.contains("aside")) return;
      const aside = document.createElement("aside");
      aside.className = "gp-cites";
      while (child.firstChild) aside.appendChild(child.firstChild);
      child.replaceWith(aside);
    });
  }

  function ensureAccentBar(section, underlineMode = "tag") {
    let bar = section.querySelector(":scope > .gp-accent-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.className = "gp-accent-bar";
    bar.dataset.gpUnderline = underlineMode;
    bar.setAttribute("aria-hidden", "true");

    const codeAnchor = section.querySelector(":scope > .gp-code");
    const headingAnchor = findHeading(section);
    const anchor = codeAnchor || headingAnchor || section.querySelector(":scope > .gp-kicker.gp-tag");
    if (anchor) {
      anchor.insertAdjacentElement("afterend", bar);
    } else {
      section.appendChild(bar);
    }
    return bar;
  }

  function ensureDividerKicker(section, dividerNumber) {
    if (section.querySelector(":scope > .gp-kicker.gp-tag")) return;
    const kicker = document.createElement("p");
    kicker.className = "gp-kicker gp-tag";
    kicker.textContent = section.dataset.gpKicker || `Section / ${String(dividerNumber).padStart(2, "0")}`;
    const marks = ensureMarks(section);
    marks.insertAdjacentElement("afterend", kicker);
  }

  function ensureTitleScaffold(section) {
    const marks = ensureMarks(section);
    let tag = section.querySelector(":scope > .gp-kicker.gp-tag");
    if (!tag) {
      tag = document.createElement("p");
      tag.className = "gp-kicker gp-tag";
      tag.textContent = section.dataset.gpKicker || "SPEC / DECK";
      marks.insertAdjacentElement("afterend", tag);
    }

    let code = section.querySelector(":scope > .gp-code");
    if (!code) {
      const heading = findHeading(section);
      const codeText = String(section.dataset.gpCode || (heading ? heading.textContent : "")).trim();
      if (codeText) {
        code = document.createElement("div");
        code.className = "gp-code";
        code.textContent = codeText;
        if (heading) {
          addClass(heading, "gp-title-heading");
          heading.insertAdjacentElement("afterend", code);
        } else {
          tag.insertAdjacentElement("afterend", code);
        }
      }
    }
  }

  function applyReferencesLayout(section) {
    const refList = section.querySelector(":scope > ul, :scope > ol");
    if (refList) {
      addClass(refList, "gp-refs");
      refList.classList.remove("gp-list--ordered");
    }

    const cslBody = section.querySelector(":scope > .csl-bib-body");
    if (cslBody) {
      addClass(cslBody, "gp-refs");
      addClass(cslBody, "gp-refs-body");
      cslBody.querySelectorAll(":scope > .csl-entry").forEach((entry) => addClass(entry, "gp-ref-entry"));
    }
  }

  function inferLayoutClass(section) {
    const heading = findHeading(section);
    const headingText = normalizeToken(heading ? heading.textContent : "");
    if (/^(literature|references|bibliography)$/.test(headingText)) return "gp-references";

    if (section.querySelector(":scope > blockquote")) return "gp-quote-slide";

    const mediaCount = section.querySelectorAll(":scope > figure, :scope > iframe, :scope > video, :scope > p > img, :scope > img")
      .length;
    const listCount = section.querySelectorAll(":scope > ul, :scope > ol").length;
    const paragraphCount = section.querySelectorAll(":scope > p").length;

    if (mediaCount > 0 && listCount === 0 && paragraphCount <= 3) return "gp-exhibit";
    if (listCount > 0 && paragraphCount <= 3) return "gp-bullets";
    if (paragraphCount >= 3) return "gp-reading";
    return null;
  }

  function firstContentAnchor(section) {
    return (
      section.querySelector(":scope > .gp-accent-bar") ||
      section.querySelector(":scope > .gp-code") ||
      section.querySelector(":scope > h1, :scope > h2, :scope > h3") ||
      section.querySelector(":scope > .gp-kicker") ||
      section.querySelector(":scope > .gp-marks")
    );
  }

  function readCaptionFromNode(node) {
    if (!(node instanceof Element)) return "";
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function ensureExhibitFigure(section) {
    let figure = section.querySelector(":scope > figure.gp-figure");
    if (figure) return figure;

    figure = section.querySelector(":scope > figure");
    if (figure) {
      addClass(figure, "gp-figure");
      return figure;
    }

    const directMedia = section.querySelector(":scope > iframe, :scope > video, :scope > img");
    const stackMedia = section.querySelector(":scope > .r-stack iframe, :scope > .r-stack video, :scope > .r-stack img");
    const media = directMedia || stackMedia;
    if (!media) return null;

    figure = document.createElement("figure");
    figure.className = "gp-figure";

    const anchor = firstContentAnchor(section);
    if (anchor) anchor.insertAdjacentElement("afterend", figure);
    else section.appendChild(figure);

    figure.appendChild(media);

    const stack = section.querySelector(":scope > .r-stack");
    if (stack && !stack.children.length) stack.remove();

    return figure;
  }

  function ensureExhibitStructure(section) {
    if (!section.classList.contains("gp-exhibit")) return;

    const figure = ensureExhibitFigure(section);
    if (!figure) return;

    let frame = figure.querySelector(":scope > .gp-frame");
    if (!frame) {
      frame = document.createElement("div");
      frame.className = "gp-frame";

      const existingNodes = Array.from(figure.childNodes).filter(
        (node) => !(node instanceof Element && node.tagName === "FIGCAPTION"),
      );
      figure.insertBefore(frame, figure.firstChild || null);
      existingNodes.forEach((node) => frame.appendChild(node));
    }

    let mediaWrap = frame.querySelector(":scope > .gp-media");
    if (!mediaWrap) {
      const mediaNode = frame.querySelector(":scope > iframe, :scope > video, :scope > img, :scope > div > img");
      if (!mediaNode) return;

      mediaWrap = document.createElement("div");
      mediaWrap.className = "gp-media gp-media--exhibit";
      frame.insertBefore(mediaWrap, frame.firstChild || null);
      mediaWrap.appendChild(mediaNode);
    } else {
      addClass(mediaWrap, "gp-media--exhibit");
    }

    const media = mediaWrap.querySelector(":scope > iframe, :scope > video, :scope > img");
    if (media) {
      if (media.tagName === "IFRAME") {
        addClass(frame, "gp-frame--embed");
        addClass(media, "gp-frame-embed");
        media.removeAttribute("width");
        media.removeAttribute("height");
        media.removeAttribute("style");
      } else {
        addClass(media, "gp-frame-img");
      }
    }

    const captionClass = section.querySelector(":scope > .gp-exhibit-caption");
    const fallbackNode = section.querySelector(":scope > .gp-embed-fallback");
    const trailingCaption = Array.from(section.querySelectorAll(":scope > p")).find((node) =>
      /^fig\.?\s*\d+/i.test(readCaptionFromNode(node)),
    );
    const captionText =
      readCaptionFromNode(captionClass) ||
      readCaptionFromNode(trailingCaption) ||
      String(section.dataset.gpCaption || "").trim();

    let figcaption = figure.querySelector(":scope > figcaption");
    if (!figcaption && captionText) {
      figcaption = document.createElement("figcaption");
      figcaption.textContent = captionText;
      figure.appendChild(figcaption);
    } else if (figcaption && captionText) {
      figcaption.textContent = captionText;
    }

    if (captionClass) captionClass.remove();
    if (trailingCaption) trailingCaption.remove();

    if (fallbackNode && fallbackNode.parentElement !== figure) {
      figure.appendChild(fallbackNode);
    }

    const halftoneMode = String(section.dataset.gpHalftone || "").trim();
    const halftonePreset = String(section.dataset.gpPreset || "").trim();
    const halftoneOptions = String(section.dataset.gpOptions || "").trim();
    const defaultHalftone = String(section.dataset.gpHalftoneDefault || "").trim().toLowerCase() === "true";

    if (halftoneMode || defaultHalftone) {
      addClass(mediaWrap, "gp-halftone");
      mediaWrap.dataset.gpHalftone = halftoneMode || "dots";
      mediaWrap.dataset.gpPreset = halftonePreset || "default";
      if (halftoneOptions) mediaWrap.dataset.gpOptions = halftoneOptions;
    }
  }

  function normalizeInlineCitations(section) {
    section.querySelectorAll(":scope .citation").forEach((node) => {
      if (node.closest(".gp-cites")) return;
      addClass(node, "gp-inline-cite");

      if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
        const raw = node.textContent.trim();
        const match = raw.match(/^\((.*)\)$/);
        if (match) node.textContent = match[1];
      }
    });
  }

  function normalizeFooterCitations(section) {
    section.querySelectorAll(":scope > .gp-cites .citation").forEach((node) => {
      const raw = node.textContent.replace(/\s+/g, " ").trim();
      const match = raw.match(/^\((.*)\)$/);
      if (match) node.textContent = match[1];
    });
  }

  function getDirectListItems(section) {
    const selectors = [
      ":scope > ul.gp-list > li",
      ":scope > ol.gp-list > li",
      ":scope > .gp-two-col ul.gp-list > li",
      ":scope > .gp-two-col ol.gp-list > li",
    ];
    const seen = new Set();
    const items = [];
    selectors.forEach((selector) => {
      section.querySelectorAll(selector).forEach((item) => {
        if (seen.has(item) || item.parentElement.closest("li")) return;
        seen.add(item);
        items.push(item);
      });
    });
    return items;
  }

  function collectRevealFigures(section) {
    const figures = Array.from(section.querySelectorAll(":scope > .gp-figure, :scope > .gp-two-col > figure.gp-figure"));
    const seen = new Set();
    return figures.filter((figure) => {
      if (!(figure instanceof Element)) return false;
      if (seen.has(figure)) return false;
      seen.add(figure);
      return true;
    });
  }

  function applyFragments(section) {
    if (String(section.dataset.gpFragments || "").toLowerCase() === "off") return;
    if (section.classList.contains("gp-title") || section.classList.contains("gp-references")) return;

    section.querySelectorAll(".opens-modal").forEach((trigger) => {
      addClass(trigger, "gp-modal-trigger");
    });

    const listItems = getDirectListItems(section);
    if (listItems.length < 2) return;

    // Each list item is a step; pop-up buttons inside it follow as steps of their
    // own, in order, and `data-gp-after-item` blocks come after those.
    let nextIndex = 0;
    const afterIndex = new Map();
    listItems.forEach((item) => {
      addClass(item, "fragment");
      addClass(item, "fade-up");
      item.dataset.fragmentIndex = String(nextIndex++);
      item.querySelectorAll(".opens-modal").forEach((trigger) => {
        addClass(trigger, "fragment");
        trigger.dataset.fragmentIndex = String(nextIndex++);
        if (trigger.tagName === "A" && !String(trigger.getAttribute("href") || "").trim()) {
          trigger.setAttribute("href", "#");
        }
      });
      afterIndex.set(item, nextIndex++);
    });

    // `data-gp-after-item="N"` reveals a block right after list item N (1-based).
    section.querySelectorAll("[data-gp-after-item]").forEach((node) => {
      const item = listItems[Number.parseInt(String(node.dataset.gpAfterItem || ""), 10) - 1];
      if (!item) return;
      addClass(node, "fragment");
      addClass(node, "fade-in");
      node.dataset.fragmentIndex = String(afterIndex.get(item));
    });

    // `data-gp-with-item="N"` reveals a block together with list item N (1-based).
    section.querySelectorAll("[data-gp-with-item]").forEach((node) => {
      const item = listItems[Number.parseInt(String(node.dataset.gpWithItem || ""), 10) - 1];
      if (!item) return;
      addClass(node, "fragment");
      addClass(node, "fade-in");
      node.dataset.fragmentIndex = item.dataset.fragmentIndex;
    });

    const figures = collectRevealFigures(section);
    figures.forEach((figure) => {
      addClass(figure, "fragment");
      addClass(figure, "fade-in");
      figure.dataset.fragmentIndex = String(nextIndex);
      nextIndex += 1;
    });
  }

  function applyGridProtocolBridge(root = document) {
    const leafSlides = getLeafSections(root);
    // A short deck slug (`data-gp-slug` on any slide, usually the title) beats the page title.
    const slugSlide = root.querySelector(".reveal .slides section[data-gp-slug]");
    const runningHead = String(
      (slugSlide ? slugSlide.dataset.gpSlug : "") ||
        document.documentElement.dataset.runningHead ||
        document.body.dataset.runningHead ||
        document.querySelector("meta[name='title']")?.getAttribute("content") ||
        document.title ||
        "Grid Protocol",
    )
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    let dividerNumber = 0;

    leafSlides.forEach((section) => {
      sanitizeQuartoSlide(section);

      const heading = findHeading(section);
      if (heading) {
        heading.classList.forEach((className) => {
          if (className.startsWith("gp-")) addClass(section, className);
        });
      }

      addClass(section, "gp-slide");

      const explicitLayout = resolveLayoutClass(getLayoutToken(section, heading));
      if (explicitLayout) {
        addClass(section, explicitLayout);
      } else if (!hasAnyLayoutClass(section)) {
        const inferred = inferLayoutClass(section);
        if (inferred) addClass(section, inferred);
      }

      ensureRunningHead(section, runningHead || "GRID PROTOCOL");
      ensureMarks(section);
      convertAsides(section);
      ensureListClasses(section);

      if (section.classList.contains("gp-divider")) {
        dividerNumber += 1;
        ensureDividerKicker(section, dividerNumber);
        ensureAccentBar(section, "tag");
      }

      if (section.classList.contains("gp-title")) {
        ensureTitleScaffold(section);
        ensureAccentBar(section, "tag");
      }

      if (
        !section.classList.contains("gp-title") &&
        !section.classList.contains("gp-divider") &&
        !section.classList.contains("gp-quote-slide") &&
        !section.classList.contains("gp-references") &&
        findHeading(section)
      ) {
        ensureAccentBar(section, "heading");
      }

      if (section.classList.contains("gp-references")) {
        applyReferencesLayout(section);
      }

      if (section.classList.contains("gp-exhibit")) {
        ensureExhibitStructure(section);
      }

      section.querySelectorAll(".opens-modal").forEach((trigger) => {
        addClass(trigger, "gp-modal-trigger");
      });

      normalizeInlineCitations(section);
      normalizeFooterCitations(section);
      applyFragments(section);
    });

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }

  function enforceSlideMode() {
    const reveal = window.Reveal;
    if (!reveal || typeof reveal.on !== "function") return;

    const apply = () => {
      if (typeof reveal.configure === "function") {
        reveal.configure({ scrollActivationWidth: null });
      }

      try {
        if (typeof reveal.isScrollView === "function" && reveal.isScrollView() && typeof reveal.toggleScrollView === "function") {
          reveal.toggleScrollView(false);
        }
      } catch {
        // no-op
      }

      const url = new URL(window.location.href);
      if (String(url.searchParams.get("view") || "").trim().toLowerCase() === "scroll") {
        url.searchParams.delete("view");
        history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
    };

    reveal.on("ready", apply);
    reveal.on("slidechanged", apply);
    reveal.on("resize", apply);
    window.setTimeout(apply, 0);
  }

  function bootstrap() {
    applyGridProtocolBridge(document);
    enforceSlideMode();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
