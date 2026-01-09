(() => {
  if (window.__miniLoaderInited) {
    return;
  }
  window.__miniLoaderInited = true;

  const LOADER_ID = "miniLoader";
  const STYLE_ID = "miniLoaderStyles";
  const LOTTIE_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js";
  let loadingCount = 0;
  let lottieInstance = null;
  let lottieReadyPromise = null;

  const ensureStyles = () => {
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
        transition: opacity 0.2s ease;
      }
      #${LOADER_ID}.is-visible {
        opacity: 1;
      }
      #${LOADER_ID} > div {
        width: 100%;
        height: 100%;
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

    const inner = document.createElement("div");
    inner.className = "mini-loader__animation";
    container.appendChild(inner);

    document.body.appendChild(container);
    return container;
  };

  const loadLottieScript = () => {
    if (window.lottie) {
      return Promise.resolve();
    }

    if (lottieReadyPromise) {
      return lottieReadyPromise;
    }

    lottieReadyPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LOTTIE_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Gagal memuat lottie-web"));
      document.head.appendChild(script);
    });

    return lottieReadyPromise;
  };

  const initLottie = async () => {
    if (window.__miniLoaderAnimation) {
      lottieInstance = window.__miniLoaderAnimation;
      return;
    }

    await loadLottieScript();
    const container = ensureContainer();
    const target = container.querySelector(".mini-loader__animation");
    if (!window.lottie || !target) {
      return;
    }

    lottieInstance = window.lottie.loadAnimation({
      container: target,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/assets/lottie/Loading.json",
    });
    window.__miniLoaderAnimation = lottieInstance;
  };

  const showMiniLoader = () => {
    loadingCount = Math.max(0, loadingCount + 1);
    const container = ensureContainer();
    container.classList.add("is-visible");
  };

  const hideMiniLoader = () => {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount > 0) {
      return;
    }
    const container = document.getElementById(LOADER_ID);
    if (container) {
      container.classList.remove("is-visible");
    }
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

  const onReady = () => {
    ensureStyles();
    ensureContainer();
    initLottie();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      onReady();
      showMiniLoader();
    });
  } else {
    onReady();
    showMiniLoader();
  }

  window.addEventListener("load", () => {
    hideMiniLoader();
  });
})();
