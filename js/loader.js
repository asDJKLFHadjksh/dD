(() => {
  const LOADER_ID = "miniLoader";
  const ANIMATION_ID = "miniLoaderAnimation";
  const LOTTIE_CDN = "https://unpkg.com/lottie-web/build/player/lottie.min.js";
  const LOTTIE_JSON_PATH = "/assets/lottie/Loading.json";
  const SHOW_DELAY_MS = 150;
  const MIN_VISIBLE_MS = 250;

  if (window.__miniLoaderInit) {
    return;
  }
  if (document.getElementById(LOADER_ID)) {
    return;
  }
  window.__miniLoaderInit = true;
  console.debug("[miniLoader] init once");

  let loadingCount = 0;
  let animationInstance = null;
  let lottieLoadPromise = null;
  let showTimeoutId = null;
  let hideTimeoutId = null;
  let visibleSince = null;
  let showCount = 0;
  let hideCount = 0;

  const ensureStyles = () => {
    if (document.getElementById("miniLoaderStyles")) return;
    const style = document.createElement("style");
    style.id = "miniLoaderStyles";
    style.textContent = `
      #${LOADER_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
        z-index: 9999;
        display: none;
        pointer-events: none;
      }
      #${LOADER_ID}.is-visible {
        display: block;
      }
      #${LOADER_ID} .mini-loader__animation,
      #${LOADER_ID} .mini-loader__fallback {
        width: 100%;
        height: 100%;
      }
      #${LOADER_ID} .mini-loader__fallback {
        display: none;
        box-sizing: border-box;
        border: 3px solid rgba(255, 255, 255, 0.25);
        border-top-color: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        animation: miniLoaderSpin 0.9s linear infinite;
      }
      #${LOADER_ID}.use-fallback .mini-loader__animation {
        display: none;
      }
      #${LOADER_ID}.use-fallback .mini-loader__fallback {
        display: block;
      }
      @media (max-width: 640px) {
        #${LOADER_ID} {
          width: 44px;
          height: 44px;
        }
      }
      @keyframes miniLoaderSpin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureLoader = () => {
    let loader = document.getElementById(LOADER_ID);
    if (loader) return loader;

    ensureStyles();
    loader = document.createElement("div");
    loader.id = LOADER_ID;
    loader.setAttribute("aria-hidden", "true");

    const animationHost = document.createElement("div");
    animationHost.id = ANIMATION_ID;
    animationHost.className = "mini-loader__animation";

    const fallback = document.createElement("div");
    fallback.className = "mini-loader__fallback";
    fallback.setAttribute("aria-hidden", "true");

    loader.appendChild(animationHost);
    loader.appendChild(fallback);
    document.body.appendChild(loader);
    return loader;
  };

  const loadLottie = () => {
    if (window.lottie && typeof window.lottie.loadAnimation === "function") {
      return Promise.resolve(window.lottie);
    }
    if (lottieLoadPromise) return lottieLoadPromise;
    lottieLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LOTTIE_CDN;
      script.async = true;
      script.onload = () => resolve(window.lottie);
      script.onerror = () => reject(new Error("Gagal memuat lottie-web."));
      document.head.appendChild(script);
    });
    return lottieLoadPromise;
  };

  const enableFallback = () => {
    const loader = ensureLoader();
    loader.classList.add("use-fallback");
  };

  const initLottie = async () => {
    if (animationInstance || window.__miniLoaderAnim) return;
    try {
      await loadLottie();
      const container = document.getElementById(ANIMATION_ID);
      if (!container || !window.lottie) {
        enableFallback();
        return;
      }
      animationInstance = window.lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: LOTTIE_JSON_PATH,
      });
      window.__miniLoaderAnim = animationInstance;
      animationInstance.addEventListener("data_failed", () => {
        console.warn("Gagal memuat data animasi Lottie. Menampilkan fallback.");
        enableFallback();
      });
    } catch (error) {
      console.warn(error);
      enableFallback();
    }
  };

  const showNow = () => {
    const loader = ensureLoader();
    if (!loader.classList.contains("is-visible")) {
      loader.classList.add("is-visible");
      visibleSince = Date.now();
      showCount += 1;
      console.debug("[miniLoader] show", showCount);
      initLottie();
    }
  };

  const hideNow = () => {
    const loader = ensureLoader();
    if (loader.classList.contains("is-visible")) {
      loader.classList.remove("is-visible");
      visibleSince = null;
      hideCount += 1;
      console.debug("[miniLoader] hide", hideCount);
    }
  };

  const updateVisibility = () => {
    if (loadingCount > 0) {
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
      if (!showTimeoutId && !document.getElementById(LOADER_ID)?.classList.contains("is-visible")) {
        showTimeoutId = window.setTimeout(() => {
          showTimeoutId = null;
          if (loadingCount > 0) {
            showNow();
          }
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showTimeoutId) {
      clearTimeout(showTimeoutId);
      showTimeoutId = null;
    }

    const loader = document.getElementById(LOADER_ID);
    if (!loader || !loader.classList.contains("is-visible")) {
      return;
    }

    const elapsed = visibleSince ? Date.now() - visibleSince : 0;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    hideTimeoutId = window.setTimeout(() => {
      hideTimeoutId = null;
      if (loadingCount === 0) {
        hideNow();
      }
    }, remaining);
  };

  const showMiniLoader = () => {
    loadingCount += 1;
    updateVisibility();
  };

  const hideMiniLoader = () => {
    loadingCount = Math.max(0, loadingCount - 1);
    updateVisibility();
  };

  const fetchWithMiniLoader = async (url, options) => {
    showMiniLoader();
    try {
      return await fetch(url, options);
    } finally {
      hideMiniLoader();
    }
  };

  const handleVisibilityChange = () => {
    const anim = window.__miniLoaderAnim || animationInstance;
    if (!anim) return;
    if (document.visibilityState === "hidden") {
      anim.pause();
    } else {
      anim.play();
    }
  };

  window.showMiniLoader = showMiniLoader;
  window.hideMiniLoader = hideMiniLoader;
  window.fetchWithMiniLoader = fetchWithMiniLoader;

  document.addEventListener("visibilitychange", handleVisibilityChange);
})();
