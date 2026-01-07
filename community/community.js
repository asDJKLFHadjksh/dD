const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZiGRgDxVjlJupwCAb29TPzNlksU5kISHLkmfpqbdwO_NQ__PEOk8FxuHe_UwzxWe5pcnfTJ1MFX3b/pub?gid=741033517&single=true&output=csv";

const latestContainer = document.getElementById("noticeLatest");
const listContainer = document.getElementById("noticeList");

if (latestContainer || listContainer) {
  loadNotices();
}

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

function pickLatestActive(posts, today) {
  return posts
    .filter((post) => isActiveToday(post, today))
    .reduce((latest, current) => {
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

function renderLatestNotice(posts, container) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latest = pickLatestActive(posts, today);
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
  desc.textContent = latest.description || "(Tanpa deskripsi)";

  container.appendChild(title);
  container.appendChild(desc);

  if (latest.imageFlag === "I" && latest.imagePath) {
    const image = document.createElement("img");
    image.className = "notice-image";
    image.src = latest.imagePath;
    image.alt = latest.title;
    container.appendChild(image);
  }

  if (latest.progressFlag === "I") {
    const progressValue = parseProgressValue(latest.progressValue);
    if (progressValue !== null) {
      container.appendChild(buildProgress(progressValue));
    }
  }
}

function renderNoticeList(posts, container) {
  if (!posts.length) {
    container.innerHTML = '<p class="notice-empty">Belum ada postingan.</p>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...posts].sort((a, b) => {
    const aStart = a.startDate ? a.startDate.getTime() : -Infinity;
    const bStart = b.startDate ? b.startDate.getTime() : -Infinity;
    if (aStart !== bStart) {
      return bStart - aStart;
    }
    return b.rowIndex - a.rowIndex;
  });

  container.innerHTML = "";

  sorted.forEach((post) => {
    const card = document.createElement("article");
    card.className = "notice-item";

    const status = buildStatus(post, today);
    card.appendChild(status);

    const title = document.createElement("h3");
    title.className = "notice-item__title";
    title.textContent = post.title;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "notice-item__desc";
    desc.textContent = post.description || "(Tanpa deskripsi)";
    card.appendChild(desc);

    if (post.imageFlag === "I" && post.imagePath) {
      const image = document.createElement("img");
      image.className = "notice-image";
      image.src = post.imagePath;
      image.alt = post.title;
      card.appendChild(image);
    }

    if (post.progressFlag === "I") {
      const progressValue = parseProgressValue(post.progressValue);
      if (progressValue !== null) {
        card.appendChild(buildProgress(progressValue));
      }
    }

    const meta = document.createElement("div");
    meta.className = "notice-item__meta";

    if (post.startRaw) {
      const start = document.createElement("span");
      start.textContent = `Mulai: ${post.startRaw}`;
      meta.appendChild(start);
    }

    if (post.endRaw) {
      const end = document.createElement("span");
      end.textContent = `Selesai: ${post.endRaw}`;
      meta.appendChild(end);
    }

    if (meta.children.length) {
      card.appendChild(meta);
    }

    container.appendChild(card);
  });
}

function buildStatus(post, today) {
  const status = document.createElement("span");
  const isActive = isActiveToday(post, today);

  if (isActive) {
    status.className = "notice-status";
    status.textContent = "Aktif";
    return status;
  }

  status.className = "notice-status notice-status--inactive";

  if (post.startDate && today.getTime() < post.startDate.getTime()) {
    status.textContent = "Belum mulai";
  } else if (post.endDate && today.getTime() > post.endDate.getTime()) {
    status.textContent = "Arsip";
  } else {
    status.textContent = "Tidak aktif";
  }

  return status;
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

function buildProgress(value) {
  const wrapper = document.createElement("div");
  wrapper.className = "notice-progress";

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
