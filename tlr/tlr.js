const TLR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZiGRgDxVjlJupwCAb29TPzNlksU5kISHLkmfpqbdwO_NQ__PEOk8FxuHe_UwzxWe5pcnfTJ1MFX3b/pub?gid=273910268&single=true&output=csv";

const TLR_MEDIA_BASE = "media/";

const searchInput = document.getElementById("tlrSearch");
const categorySelect = document.getElementById("tlrCategory");
const listContainer = document.getElementById("tlrList");

let visibleItems = [];

setupCopyInteractions(listContainer);

loadTLR();

searchInput.addEventListener("input", () => applyFilters());
categorySelect.addEventListener("change", () => applyFilters());

async function loadTLR() {
  if (!listContainer) {
    return;
  }

  try {
    const response = await fetch(TLR_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Fetch gagal: ${response.status}`);
    }
    const csvText = await response.text();
    const items = parseItems(csvText);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    visibleItems = items
      .filter((item) => isEligible(item, today))
      .sort((a, b) => compareItems(a, b));

    buildCategoryOptions(visibleItems);
    renderList(visibleItems);
  } catch (error) {
    console.error("Gagal memuat data TLR:", error);
    listContainer.innerHTML =
      '<p class="tlr-empty">Gagal memuat data TLR. Silakan refresh halaman.</p>';
  }
}

function parseItems(csvText) {
  const rows = parseCSV(csvText).filter((row) =>
    row.some((cell) => cell.trim() !== "")
  );
  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row, index) => {
    const [
      title = "",
      materi = "",
      kategori = "",
      evidenceRaw = "",
      publishRaw = "",
      downloadLink = "",
      hideFlag = "",
      pinFlag = "",
    ] = row;

    return {
      title: title.trim() || "(Tanpa judul)",
      materi: materi.trim(),
      categories: parseCategories(kategori),
      evidenceRaw: evidenceRaw.trim(),
      publishDate: parseDate(publishRaw.trim()),
      downloadLink: downloadLink.trim(),
      isHidden: hideFlag.trim().toUpperCase() === "I",
      isPinned: pinFlag.trim().toUpperCase() === "I",
      rowIndex: index,
    };
  });
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }

    field += char;
  }

  current.push(field);
  rows.push(current);
  return rows;
}

function parseCategories(raw) {
  return (raw || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length);
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function isEligible(item, today) {
  if (item.isHidden) {
    return false;
  }
  if (!item.publishDate) {
    return false;
  }
  return today.getTime() >= item.publishDate.getTime();
}

function compareItems(a, b) {
  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }
  const dateA = a.publishDate ? a.publishDate.getTime() : 0;
  const dateB = b.publishDate ? b.publishDate.getTime() : 0;
  if (dateA !== dateB) {
    return dateB - dateA;
  }
  return b.rowIndex - a.rowIndex;
}

function buildCategoryOptions(items) {
  if (!categorySelect) {
    return;
  }
  const categories = new Set();
  items.forEach((item) => {
    item.categories.forEach((category) => categories.add(category));
  });

  const sorted = Array.from(categories).sort((a, b) =>
    a.localeCompare(b, "id")
  );

  categorySelect.innerHTML = '<option value="">Semua Kategori</option>';
  sorted.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

function applyFilters() {
  const query = (searchInput?.value || "").toLowerCase();
  const category = categorySelect?.value || "";

  const filtered = visibleItems.filter((item) => {
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.materi.toLowerCase().includes(query);
    const matchesCategory = !category || item.categories.includes(category);
    return matchesSearch && matchesCategory;
  });

  renderList(filtered);
}

function renderList(items) {
  if (!listContainer) {
    return;
  }
  listContainer.innerHTML = "";

  if (!items.length) {
    listContainer.innerHTML =
      '<p class="tlr-empty">Belum ada materi yang sesuai filter.</p>';
    return;
  }

  items.forEach((item) => {
    listContainer.appendChild(buildCard(item));
  });
}

function buildCard(item) {
  const card = document.createElement("article");
  card.className = "tlr-card";

  const title = document.createElement("h3");
  title.textContent = item.title;
  card.appendChild(title);

  const materi = document.createElement("p");
  materi.className = "tlr-card__materi";
  materi.appendChild(parseInteractiveMarkers(item.materi));
  card.appendChild(materi);

  if (item.categories.length) {
    const badges = document.createElement("div");
    badges.className = "tlr-badges";
    item.categories.forEach((category) => {
      const badge = document.createElement("span");
      badge.className = "tlr-badge";
      badge.textContent = category;
      badges.appendChild(badge);
    });
    card.appendChild(badges);
  }

  const evidenceBlock = buildEvidenceBlock(item);
  if (evidenceBlock) {
    card.appendChild(evidenceBlock);
  }

  if (item.downloadLink) {
    const actions = document.createElement("div");
    actions.className = "tlr-actions";

    const button = document.createElement("a");
    button.className = "tlr-download";
    button.href = item.downloadLink;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.textContent = "Download File";
    actions.appendChild(button);

    card.appendChild(actions);
  }

  return card;
}

function buildEvidenceBlock(item) {
  const evidence = item.evidenceRaw;
  if (!evidence) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "tlr-evidence";

  if (isDrivePreview(evidence)) {
    wrapper.classList.add("tlr-evidence--video");
    const iframe = document.createElement("iframe");
    iframe.src = evidence;
    iframe.title = item.title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    wrapper.appendChild(iframe);
    return wrapper;
  }

  if (isUrl(evidence)) {
    return null;
  }

  const fileName = evidence;
  const extension = fileName.split(".").pop().toLowerCase();
  const resolvedSrc = `${TLR_MEDIA_BASE}${fileName}`;

  if (["mp4", "webm"].includes(extension)) {
    wrapper.classList.add("tlr-evidence--video");
    const video = document.createElement("video");
    video.controls = true;
    video.src = resolvedSrc;
    video.addEventListener("error", () => {
      wrapper.style.display = "none";
    });
    wrapper.appendChild(video);
    return wrapper;
  }

  wrapper.classList.add("tlr-evidence--media");
  const image = document.createElement("img");
  image.src = resolvedSrc;
  image.alt = item.title;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    wrapper.style.display = "none";
  });
  wrapper.appendChild(image);
  return wrapper;
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function isDrivePreview(url) {
  return (
    /^https?:\/\//i.test(url) &&
    url.includes("drive.google.com/file/d/") &&
    url.includes("/preview")
  );
}

function parseInteractiveMarkers(rawText) {
  const fragment = document.createDocumentFragment();
  const normalized = (rawText || "").replace(/\r\n?/g, "\n");
  const markerPattern = /\?\[([\s\S]*?)\]\?|\?\{([\s\S]*?)\}\?/g;
  let lastIndex = 0;
  let match;

  while ((match = markerPattern.exec(normalized))) {
    const { index } = match;
    if (index > lastIndex) {
      fragment.appendChild(
        renderSafeTextWithLinks(normalized.slice(lastIndex, index))
      );
    }

    if (match[1] !== undefined) {
      fragment.appendChild(buildInteractiveSpan(match[1], "cc-copy"));
    } else if (match[2] !== undefined) {
      fragment.appendChild(buildInteractiveSpan(match[2], "cc-link", true));
    }

    lastIndex = markerPattern.lastIndex;
  }

  if (lastIndex < normalized.length) {
    fragment.appendChild(renderSafeTextWithLinks(normalized.slice(lastIndex)));
  }

  return fragment;
}

function buildInteractiveSpan(value, className, isLink = false) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = value;
  span.dataset.copy = value;
  if (isLink) {
    span.dataset.open = value;
  }
  return span;
}

function renderSafeTextWithLinks(text) {
  const fragment = document.createDocumentFragment();
  const normalized = (text || "").replace(/\r\n?/g, "\n");
  const linkPattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkPattern.exec(normalized))) {
    const { index } = match;
    if (index > lastIndex) {
      appendTextWithLineBreaks(fragment, normalized.slice(lastIndex, index));
    }

    if (match[3]) {
      appendLink(fragment, match[3], match[3]);
    } else {
      appendLink(fragment, match[2], match[1]);
    }

    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < normalized.length) {
    appendTextWithLineBreaks(fragment, normalized.slice(lastIndex));
  }

  return fragment;
}

function appendTextWithLineBreaks(container, text) {
  const parts = text.split("\n");
  parts.forEach((part, index) => {
    if (part) {
      container.appendChild(document.createTextNode(part));
    }
    if (index < parts.length - 1) {
      container.appendChild(document.createElement("br"));
    }
  });
}

function appendLink(container, url, label) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  container.appendChild(link);
}

function setupCopyInteractions(container) {
  if (!container) {
    return;
  }

  container.addEventListener("click", (event) => {
    const target = event.target.closest(".cc-copy, .cc-link");
    if (!target || !container.contains(target)) {
      return;
    }
    const value = target.dataset.copy || "";
    copyToClipboard(value);
    triggerCopyFeedback(target);
  });

  container.addEventListener("dblclick", (event) => {
    const target = event.target.closest(".cc-link");
    if (!target || !container.contains(target)) {
      return;
    }
    const url = target.dataset.open;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  });
}

const copyFeedbackTimers = new WeakMap();

function triggerCopyFeedback(element) {
  if (!element) {
    return;
  }
  element.classList.add("copied");
  const existingTimer = copyFeedbackTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = window.setTimeout(() => {
    element.classList.remove("copied");
  }, 600);
  copyFeedbackTimers.set(element, timer);
}

async function copyToClipboard(text) {
  if (!text) {
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn("Clipboard API gagal, coba fallback.", error);
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch (error) {
    console.warn("Fallback clipboard gagal.", error);
  }
  document.body.removeChild(textarea);
}
