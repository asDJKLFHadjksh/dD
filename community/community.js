const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZiGRgDxVjlJupwCAb29TPzNlksU5kISHLkmfpqbdwO_NQ__PEOk8FxuHe_UwzxWe5pcnfTJ1MFX3b/pub?gid=741033517&single=true&output=csv";

const latestContainer = document.getElementById("noticeLatest");
const listContainer = document.getElementById("noticeList");
const MEDIA_BASE = new URL(
  "media/",
  document.currentScript?.src || window.location.href
).toString();
const lightboxElements = {
  overlay: document.querySelector(".notice-lightbox"),
  image: document.querySelector(".notice-lightbox__image"),
  closeButton: document.querySelector(".notice-lightbox__close"),
};

if (latestContainer || listContainer) {
  loadNotices();
}

setupLightbox();

async function loadNotices() {
  try {
    const response = await fetch(CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Fetch gagal: ${response.status}`);
    }
    const csvText = await response.text();
    const posts = parsePosts(csvText);

    if (latestContainer) {
      renderLatestNotice(posts, latestContainer);
    }

    if (listContainer) {
      renderNoticeList(posts, listContainer);
    }
  } catch (error) {
    console.error("Gagal memuat pemberitahuan:", error);
    if (latestContainer) {
      latestContainer.textContent =
        "Gagal memuat pemberitahuan. Silakan refresh halaman.";
      latestContainer.classList.add("notice-error");
    }
    if (listContainer) {
      listContainer.innerHTML =
        '<p class="notice-error">Gagal memuat daftar postingan. Silakan refresh halaman.</p>';
    }
  }
}

function parsePosts(csvText) {
  const rows = parseCSV(csvText).filter((row) =>
    row.some((cell) => cell.trim() !== "")
  );
  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row, index) => {
    const [
      title = "",
      description = "",
      imageFlag = "",
      imagePath = "",
      progressFlag = "",
      progressValue = "",
      startRaw = "",
      endRaw = "",
      hideFlag = "",
      pinFlag = "",
    ] = row;

    return {
      title: title.trim() || "(Tanpa judul)",
      description: description.trim(),
      imageFlag: imageFlag.trim().toUpperCase(),
      imagePath: imagePath.trim(),
      progressFlag: progressFlag.trim().toUpperCase(),
      progressValue: progressValue.trim(),
      startRaw: startRaw.trim(),
      endRaw: endRaw.trim(),
      hideFlag: hideFlag.trim().toUpperCase(),
      pinFlag: pinFlag.trim().toUpperCase(),
      startDate: parseDate(startRaw.trim()),
      endDate: parseDate(endRaw.trim()),
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

function isActiveToday(post, today) {
  const startTime = post.startDate ? post.startDate.getTime() : -Infinity;
  const endTime = post.endDate ? post.endDate.getTime() : Infinity;
  const todayTime = today.getTime();
  return todayTime >= startTime && todayTime <= endTime;
}

function isScheduled(post, today) {
  if (!post.startDate) {
    return false;
  }
  return today.getTime() < post.startDate.getTime();
}

function isExpired(post, today) {
  if (!post.endDate) {
    return false;
  }
  return today.getTime() > post.endDate.getTime();
}

function isHidden(post) {
  return post.hideFlag === "I";
}

function isPinned(post) {
  return post.pinFlag === "I";
}

function pickLatestNotice(posts, today) {
  const visiblePosts = posts.filter(
    (post) => !isHidden(post) && !isScheduled(post, today)
  );
  const pinnedPosts = visiblePosts.filter((post) => isPinned(post));
  if (pinnedPosts.length) {
    return pinnedPosts.reduce((latest, current) => {
      if (!latest) {
        return current;
      }
      const latestStart = latest.startDate
        ? latest.startDate.getTime()
        : -Infinity;
      const currentStart = current.startDate
        ? current.startDate.getTime()
        : -Infinity;
      if (currentStart > latestStart) {
        return current;
      }
      if (currentStart === latestStart && current.rowIndex > latest.rowIndex) {
        return current;
      }
      return latest;
    }, null);
  }
  const activePosts = visiblePosts.filter((post) => isActiveToday(post, today));
  if (activePosts.length) {
    return activePosts.reduce((latest, current) => {
      if (!latest) {
        return current;
      }
      const latestStart = latest.startDate
        ? latest.startDate.getTime()
        : -Infinity;
      const currentStart = current.startDate
        ? current.startDate.getTime()
        : -Infinity;
      if (currentStart > latestStart) {
        return current;
      }
      if (currentStart === latestStart && current.rowIndex > latest.rowIndex) {
        return current;
      }
      return latest;
    }, null);
  }

  const expiredPosts = visiblePosts.filter((post) => isExpired(post, today));
  return expiredPosts.reduce((latest, current) => {
    if (!latest) {
      return current;
    }
    const latestEnd = latest.endDate ? latest.endDate.getTime() : -Infinity;
    const currentEnd = current.endDate ? current.endDate.getTime() : -Infinity;
    if (currentEnd > latestEnd) {
      return current;
    }
    if (currentEnd === latestEnd && current.rowIndex > latest.rowIndex) {
      return current;
    }
    return latest;
  }, null);
}

function renderLatestNotice(posts, container) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latest = pickLatestNotice(posts, today);
  container.innerHTML = "";

  if (!latest) {
    const empty = document.createElement("p");
    empty.className = "notice-empty";
    empty.textContent = "Belum ada pemberitahuan terbaru untuk saat ini.";
    container.appendChild(empty);
    return;
  }

  const title = document.createElement("h4");
  title.className = "notice-latest__title";
  title.textContent = latest.title;

  const desc = document.createElement("p");
  desc.className = "notice-latest__desc";
  desc.replaceChildren(
    renderSafeTextWithLinks(latest.description || "(Tanpa deskripsi)")
  );

  container.appendChild(title);
  container.appendChild(desc);

  if (latest.imageFlag === "I" && latest.imagePath) {
    const media = buildNoticeMedia(latest.imagePath, latest.title);
    if (media) {
      container.appendChild(media);
    }
  }

  if (latest.progressFlag === "I") {
    const progressValue = parseProgressValue(latest.progressValue);
    if (progressValue !== null) {
      container.appendChild(buildProgress(progressValue, true));
    }
  }

  const meta = buildNoticeMeta(latest, today, { compact: true });
  if (meta) {
    container.appendChild(meta);
  }
}

function renderNoticeList(posts, container) {
  if (!posts.length) {
    container.innerHTML = '<p class="notice-empty">Belum ada postingan.</p>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visiblePosts = posts.filter(
    (post) => !isHidden(post) && !isScheduled(post, today)
  );
  if (!visiblePosts.length) {
    container.innerHTML = '<p class="notice-empty">Belum ada postingan.</p>';
    return;
  }
  const sorted = visiblePosts.sort((a, b) => {
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    const aActive = isActiveToday(a, today);
    const bActive = isActiveToday(b, today);
    const aExpired = isExpired(a, today);
    const bExpired = isExpired(b, today);
    const aGroup = getNoticeGroupOrder(aPinned, aActive, aExpired);
    const bGroup = getNoticeGroupOrder(bPinned, bActive, bExpired);
    if (aGroup !== bGroup) {
      return aGroup - bGroup;
    }

    if (aActive && bActive) {
      const aStart = a.startDate ? a.startDate.getTime() : -Infinity;
      const bStart = b.startDate ? b.startDate.getTime() : -Infinity;
      if (aStart !== bStart) {
        return bStart - aStart;
      }
      return b.rowIndex - a.rowIndex;
    }

    const aEnd = a.endDate ? a.endDate.getTime() : null;
    const bEnd = b.endDate ? b.endDate.getTime() : null;
    if (aEnd === null && bEnd !== null) {
      return 1;
    }
    if (aEnd !== null && bEnd === null) {
      return -1;
    }
    if (aEnd !== null && bEnd !== null && aEnd !== bEnd) {
      return bEnd - aEnd;
    }
    return b.rowIndex - a.rowIndex;
  });

  container.innerHTML = "";

  sorted.forEach((post) => {
    const card = document.createElement("article");
    card.className = "notice-item";

    if (isPinned(post)) {
      const pin = document.createElement("span");
      pin.className = "notice-pin";
      pin.setAttribute("aria-hidden", "true");
      pin.textContent = "📌";
      card.appendChild(pin);
    }

    const header = document.createElement("div");
    header.className = "notice-item__header";

    const meta = buildNoticeMeta(post, today);
    if (meta) {
      header.appendChild(meta);
    }

    const title = document.createElement("h3");
    title.className = "notice-item__title";
    title.textContent = post.title;
    header.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "notice-item__desc";
    desc.replaceChildren(
      renderSafeTextWithLinks(post.description || "(Tanpa deskripsi)")
    );
    header.appendChild(desc);

    card.appendChild(header);

    if (post.imageFlag === "I" && post.imagePath) {
      const media = buildNoticeMedia(post.imagePath, post.title);
      if (media) {
        card.appendChild(media);
      }
    }

    if (post.progressFlag === "I") {
      const progressValue = parseProgressValue(post.progressValue);
      if (progressValue !== null) {
        card.appendChild(buildProgress(progressValue));
      }
    }

    const statusDot = buildStatusDot(post, today);
    if (statusDot) {
      card.appendChild(statusDot);
    }

    container.appendChild(card);
  });
}

function getNoticeGroupOrder(isPinnedPost, isActivePost, isExpiredPost) {
  if (isPinnedPost && isActivePost) {
    return 0;
  }
  if (isPinnedPost && isExpiredPost) {
    return 1;
  }
  if (!isPinnedPost && isActivePost) {
    return 2;
  }
  return 3;
}

function buildStatusDot(post, today) {
  const status = getStatusInfo(post, today);
  if (!status) {
    return null;
  }
  const dot = document.createElement("span");
  dot.className = `notice-status-dot notice-status-dot--${status.key}`;
  dot.setAttribute("aria-hidden", "true");
  return dot;
}

function parseProgressValue(value) {
  if (!value) {
    return null;
  }
  const number = Number.parseFloat(value.replace("%", ""));
  if (Number.isNaN(number)) {
    return null;
  }
  return Math.min(100, Math.max(0, number));
}

function buildProgress(value, isCompact = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "notice-progress";
  if (isCompact) {
    wrapper.classList.add("notice-progress--compact");
  }

  const track = document.createElement("div");
  track.className = "notice-progress__track";

  const bar = document.createElement("div");
  bar.className = "notice-progress__bar";
  bar.style.width = `${value}%`;

  track.appendChild(bar);

  const label = document.createElement("div");
  label.className = "notice-progress__label";
  label.textContent = `Progress ${Math.round(value)}%`;

  wrapper.appendChild(track);
  wrapper.appendChild(label);

  return wrapper;
}

function buildNoticeMeta(post, today, { compact = false } = {}) {
  const meta = document.createElement("div");
  meta.className = compact ? "notice-meta notice-meta--compact" : "notice-meta";

  if (post.startRaw) {
    const start = document.createElement("span");
    start.textContent = `Publish: ${post.startRaw}`;
    meta.appendChild(start);
  }

  if (post.endRaw) {
    const end = document.createElement("span");
    end.textContent = `Expired: ${post.endRaw}`;
    meta.appendChild(end);
  }

  if (!meta.children.length) {
    return null;
  }
  return meta;
}

function buildNoticeMedia(url, title) {
  const resolvedSrc = resolveImageSrc(url);
  if (!resolvedSrc) {
    return null;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "notice-media";

  const image = document.createElement("img");
  image.className = "notice-image";
  image.src = resolvedSrc;
  image.alt = title;
  image.loading = "lazy";
  image.dataset.fullsrc = resolvedSrc;
  image.addEventListener("error", () => {
    wrapper.style.display = "none";
  });

  wrapper.appendChild(image);
  return wrapper;
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

function resolveImageSrc(valueFromSheet) {
  if (!valueFromSheet) {
    return "";
  }
  const trimmed = valueFromSheet.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes("/")) {
    return trimmed;
  }
  return `${MEDIA_BASE}${trimmed}`;
}

function getStatusInfo(post, today) {
  const todayTime = today.getTime();
  const startTime = post.startDate ? post.startDate.getTime() : -Infinity;
  const endTime = post.endDate ? post.endDate.getTime() : Infinity;

  if (todayTime < startTime) {
    return {
      key: "upcoming",
      tooltip: "Belum mulai",
      badge: "Belum mulai",
    };
  }

  if (todayTime > endTime) {
    return {
      key: "ended",
      tooltip: "Arsip / Sudah berakhir",
      badge: "Arsip",
    };
  }

  return {
    key: "active",
    tooltip: "Aktif / Sedang berlangsung",
    badge: "",
  };
}

function setupLightbox() {
  const { overlay, image, closeButton } = lightboxElements;
  if (!overlay || !image || !closeButton) {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest(".notice-image");
    if (!target) {
      return;
    }
    event.preventDefault();
    openLightbox(target);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeLightbox();
    }
  });

  closeButton.addEventListener("click", () => {
    closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}

function openLightbox(targetImage) {
  const { overlay, image } = lightboxElements;
  if (!overlay || !image) {
    return;
  }
  const fullSrc =
    targetImage.dataset.fullsrc || targetImage.currentSrc || targetImage.src;
  if (!fullSrc) {
    return;
  }
  image.src = fullSrc;
  image.alt = targetImage.alt || "Preview gambar";
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("notice-lightbox-open");
}

function closeLightbox() {
  const { overlay, image } = lightboxElements;
  if (!overlay || !image) {
    return;
  }
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  image.removeAttribute("src");
  document.body.classList.remove("notice-lightbox-open");
}

// Gambar komunitas diambil dari folder media di repo.
