(() => {
  const LOADER_ID = "miniLoader";
  const ANIMATION_ID = "miniLoaderAnimation";
  const LOADER_PATH = new URL("assets/lottie/Loading.json", document.baseURI).toString();
  const ROOT_LOADER_PATH = new URL("/assets/lottie/Loading.json", document.baseURI).toString();
  const RESOLVED_LOADER_PATH = LOADER_PATH.startsWith(`${window.location.origin}/assets/`)
    ? LOADER_PATH
    : ROOT_LOADER_PATH;
  const LOTTIE_CDN = "https://unpkg.com/lottie-web/build/player/lottie.min.js";
  let loadingCount = 0;
  let animationInstance = null;
  let lottieLoadPromise = null;

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
    if (animationInstance) return;
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
        path: RESOLVED_LOADER_PATH,
      });
      animationInstance.addEventListener("data_failed", enableFallback);
    } catch (error) {
      console.warn(error);
      enableFallback();
    }
  };

  const updateVisibility = () => {
    const loader = ensureLoader();
    if (loadingCount > 0) {
      loader.classList.add("is-visible");
      initLottie();
    } else {
      loader.classList.remove("is-visible");
    }
  };

  const showLoader = () => {
    loadingCount += 1;
    updateVisibility();
  };

  const hideLoader = () => {
    loadingCount = Math.max(0, loadingCount - 1);
    updateVisibility();
  };

  window.showLoader = showLoader;
  window.hideLoader = hideLoader;

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function" && !originalFetch.__miniLoaderPatched) {
    const patchedFetch = (...args) => {
      showLoader();
      try {
        return Promise.resolve(originalFetch(...args)).finally(hideLoader);
      } catch (error) {
        hideLoader();
        throw error;
      }
    };
    patchedFetch.__miniLoaderPatched = true;
    window.fetch = patchedFetch;
  }

  document.addEventListener("DOMContentLoaded", showLoader);
  window.addEventListener("load", hideLoader);
})();
