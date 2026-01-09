(() => {
  if (window.__miniLoaderInited) {
    return;
  }
  window.__miniLoaderInited = true;

  const LOADER_ID = "miniLoader";
  const STYLE_ID = "miniLoaderStyles";
  const LOTTIE_SCRIPT_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
  const LOTTIE_JSON_PATH = "/assets/lottie/Loading.json";
  let loadingCount = 0;
  let lottiePromise = null;
  let animationInstance = null;

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${LOADER_ID} {
        position: fixed;
        top: 12px;
        right: 12px;
        width: 56px;
        height: 56px;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease;
      }

      #${LOADER_ID}.is-visible {
        opacity: 1;
        visibility: visible;
      }

      #${LOADER_ID} svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      @media (max-width: 480px) {
        #${LOADER_ID} {
          width: 44px;
          height: 44px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureContainer = () => {
    const existing = document.getElementById(LOADER_ID);
    if (existing) {
      return existing;
    }
    const container = document.createElement("div");
    container.id = LOADER_ID;
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
    return container;
  };

  const loadLottieScript = () => {
    if (window.lottie) {
      return Promise.resolve(window.lottie);
    }
    if (lottiePromise) {
      return lottiePromise;
    }
    lottiePromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = LOTTIE_SCRIPT_SRC;
      script.onload = () => resolve(window.lottie);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return lottiePromise;
  };

  const initLottie = async () => {
    if (animationInstance) {
      return;
    }
    injectStyles();
    const container = ensureContainer();
    const lottie = await loadLottieScript();
    if (!lottie || animationInstance) {
      return;
    }
    animationInstance = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: LOTTIE_JSON_PATH,
    });
  };

  const updateVisibility = () => {
    const container = ensureContainer();
    container.classList.toggle("is-visible", loadingCount > 0);
  };

  const showMiniLoader = () => {
    loadingCount += 1;
    initLottie();
    updateVisibility();
  };

  const hideMiniLoader = () => {
    loadingCount = Math.max(loadingCount - 1, 0);
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

  window.showMiniLoader = showMiniLoader;
  window.hideMiniLoader = hideMiniLoader;
  window.fetchWithMiniLoader = fetchWithMiniLoader;

  document.addEventListener("DOMContentLoaded", () => {
    showMiniLoader();
  });

  window.addEventListener("load", () => {
    hideMiniLoader();
  });
})();
