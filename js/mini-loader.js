(() => {
  const STYLE_ID = "miniLoaderStyles";
  const CONTAINER_ID = "miniLoader";
  const LOTTIE_SCRIPT_ID = "miniLoaderLottieScript";
  const LOTTIE_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
  const SHOW_DELAY = 150;

  let loaderCount = 0;
  let showTimer = null;
  let loaderElement = null;
  let animationInstance = null;
  let animationReady = false;
  let initPromise = null;
  let lottiePromise = null;

  const whenBodyReady = () => {
    if (document.body) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  };

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${CONTAINER_ID} {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 56px;
  height: 56px;
  z-index: 9999;
  opacity: 0;
  transition: opacity 150ms ease;
  pointer-events: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 480px) {
  #${CONTAINER_ID} {
    width: 44px;
    height: 44px;
  }
}
`;
    document.head.appendChild(style);
  };

  const ensureContainer = () => {
    const existing = document.getElementById(CONTAINER_ID);
    if (existing) {
      loaderElement = existing;
      return existing;
    }
    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
    loaderElement = container;
    return container;
  };

  const loadLottie = () => {
    if (window.lottie) {
      return Promise.resolve(true);
    }
    if (lottiePromise) {
      return lottiePromise;
    }
    lottiePromise = new Promise((resolve) => {
      const existing = document.getElementById(LOTTIE_SCRIPT_ID);
      if (existing) {
        if (window.lottie) {
          resolve(true);
          return;
        }
        existing.addEventListener(
          "load",
          () => resolve(Boolean(window.lottie)),
          { once: true }
        );
        existing.addEventListener("error", () => resolve(false), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.id = LOTTIE_SCRIPT_ID;
      script.src = LOTTIE_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener(
        "load",
        () => resolve(Boolean(window.lottie)),
        { once: true }
      );
      script.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(script);
    });
    return lottiePromise;
  };

  const tryFetchUrl = async (url) => {
    try {
      const headResponse = await fetch(url, {
        method: "HEAD",
        cache: "no-store",
      });
      if (headResponse.ok) {
        return url;
      }
    } catch (error) {
      console.warn("Mini loader HEAD gagal, coba GET:", error);
    }

    try {
      const getResponse = await fetch(url, { method: "GET", cache: "no-store" });
      if (getResponse.ok) {
        return url;
      }
    } catch (error) {
      console.warn("Mini loader GET gagal:", error);
    }

    return null;
  };

  const resolveLoaderJsonUrl = async () => {
    const candidates = [
      new URL("../assets/lottie/Loading.json", document.baseURI).toString(),
      new URL("assets/lottie/Loading.json", document.baseURI).toString(),
      new URL("../../assets/lottie/Loading.json", document.baseURI).toString(),
    ];

    for (const url of candidates) {
      const resolved = await tryFetchUrl(url);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  };

  const initLoader = () => {
    if (initPromise) {
      return initPromise;
    }
    initPromise = (async () => {
      await whenBodyReady();
      ensureStyles();
      ensureContainer();

      const lottieReady = await loadLottie();
      if (!lottieReady || !window.lottie) {
        console.warn("Mini loader gagal memuat lottie-web.");
        return;
      }

      const jsonUrl = await resolveLoaderJsonUrl();
      if (!jsonUrl) {
        console.warn("Mini loader gagal menemukan Loading.json.");
        return;
      }

      animationInstance = window.lottie.loadAnimation({
        container: loaderElement,
        renderer: "svg",
        loop: true,
        autoplay: false,
        path: jsonUrl,
      });
      animationReady = true;
      if (loaderCount > 0 && !showTimer) {
        updateVisibility(true);
      }
    })();
    return initPromise;
  };

  const updateVisibility = (visible) => {
    if (!loaderElement || !animationReady) {
      return;
    }
    loaderElement.style.opacity = visible ? "1" : "0";
    if (animationInstance) {
      if (visible) {
        animationInstance.play();
      } else {
        animationInstance.stop();
      }
    }
  };

  window.showMiniLoader = () => {
    loaderCount += 1;
    initLoader();
    if (loaderCount > 1) {
      return;
    }
    if (showTimer) {
      clearTimeout(showTimer);
    }
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (loaderCount > 0) {
        updateVisibility(true);
      }
    }, SHOW_DELAY);
  };

  window.hideMiniLoader = () => {
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount > 0) {
      return;
    }
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    updateVisibility(false);
  };

  window.withMiniLoader = (promiseOrAsyncFn) => {
    window.showMiniLoader();
    try {
      const result =
        typeof promiseOrAsyncFn === "function"
          ? promiseOrAsyncFn()
          : promiseOrAsyncFn;
      return Promise.resolve(result).finally(() => {
        window.hideMiniLoader();
      });
    } catch (error) {
      window.hideMiniLoader();
      return Promise.reject(error);
    }
  };
})();
