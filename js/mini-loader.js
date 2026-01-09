(() => {
  if (window.__miniLoaderInited) {
    return;
  }
  window.__miniLoaderInited = true;

  const LOADER_ID = "miniLoader";
  const STYLE_ID = "miniLoaderStyle";
  const LOTTIE_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
  const ANIMATION_PATH = "/assets/lottie/Loading.json";
  let loadingCount = 0;

  const loadLottie = () => {
    if (window.lottie) {
      return Promise.resolve(window.lottie);
    }
    if (window.__miniLoaderLottiePromise) {
      return window.__miniLoaderLottiePromise;
    }

    window.__miniLoaderLottiePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LOTTIE_SRC;
      script.async = true;
      script.onload = () => resolve(window.lottie);
      script.onerror = () => reject(new Error("Gagal memuat lottie-web"));
      document.head.appendChild(script);
    });

    return window.__miniLoaderLottiePromise;
  };

  const ensureStyle = () => {
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
      #${LOADER_ID}.is-active {
        opacity: 1;
      }
      #${LOADER_ID} .mini-loader__anim {
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

  const createLoader = () => {
    if (document.getElementById(LOADER_ID)) {
      return document.getElementById(LOADER_ID);
    }
    ensureStyle();
    const loader = document.createElement("div");
    loader.id = LOADER_ID;
    loader.setAttribute("aria-hidden", "true");
    const animContainer = document.createElement("div");
    animContainer.className = "mini-loader__anim";
    loader.appendChild(animContainer);
    document.body.appendChild(loader);
    return loader;
  };

  const initAnimation = () => {
    const loader = createLoader();
    const container = loader.querySelector(".mini-loader__anim");
    if (!container || window.__miniLoaderAnimation) {
      return;
    }
    loadLottie()
      .then((lottie) => {
        if (window.__miniLoaderAnimation) {
          return;
        }
        window.__miniLoaderAnimation = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: ANIMATION_PATH,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const updateVisibility = () => {
    const loader = document.getElementById(LOADER_ID);
    if (!loader) {
      return;
    }
    loader.classList.toggle("is-active", loadingCount > 0);
  };

  window.showMiniLoader = () => {
    loadingCount += 1;
    updateVisibility();
  };

  window.hideMiniLoader = () => {
    loadingCount = Math.max(0, loadingCount - 1);
    updateVisibility();
  };

  window.fetchWithMiniLoader = async (url, options) => {
    window.showMiniLoader();
    try {
      return await fetch(url, options);
    } finally {
      window.hideMiniLoader();
    }
  };

  const initMiniLoader = () => {
    createLoader();
    initAnimation();
    updateVisibility();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMiniLoader);
  } else {
    initMiniLoader();
  }

  const showOnDOMContentLoaded = () => window.showMiniLoader();
  const hideOnLoad = () => window.hideMiniLoader();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showOnDOMContentLoaded, {
      once: true,
    });
  } else {
    showOnDOMContentLoaded();
  }

  window.addEventListener("load", hideOnLoad, { once: true });
})();
