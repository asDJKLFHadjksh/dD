(() => {
  const LOADER_ID = "globalLoader";
  const ACTIVE_CLASS = "is-active";
  const BODY_LOADING_CLASS = "is-loading";
  const FALLBACK_TIMEOUT_MS = 2000;
  const state = {
    count: 0,
    previousOverflow: "",
  };

  const getLoader = () => document.getElementById(LOADER_ID);

  const showFallback = () => {
    const loader = getLoader();
    const fallback = loader?.querySelector("[data-loader-fallback]");
    if (fallback) {
      fallback.hidden = false;
    }
  };

  const initLoader = () => {
    const loader = getLoader();
    if (!loader) {
      return;
    }
    const player = loader.querySelector("lottie-player");
    const fallback = loader.querySelector("[data-loader-fallback]");
    if (player && !player.getAttribute("src")) {
      const scriptUrl = document.currentScript?.src;
      if (scriptUrl) {
        const lottieUrl = new URL("../../Loading.lottie", scriptUrl);
        player.setAttribute("src", lottieUrl.toString());
      }
    }

    if (!player) {
      showFallback();
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      if (fallback?.hidden) {
        showFallback();
      }
    }, FALLBACK_TIMEOUT_MS);

    player.addEventListener("error", () => {
      clearTimeout(fallbackTimer);
      showFallback();
    });

    player.addEventListener("load", () => {
      clearTimeout(fallbackTimer);
      if (fallback) {
        fallback.hidden = true;
      }
    });
  };

  const showLoader = () => {
    const loader = getLoader();
    if (!loader) {
      return;
    }
    if (state.count === 0) {
      loader.classList.add(ACTIVE_CLASS);
      loader.setAttribute("aria-hidden", "false");
      state.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.classList.add(BODY_LOADING_CLASS);
    }
    state.count += 1;
  };

  const hideLoader = () => {
    const loader = getLoader();
    if (!loader) {
      return;
    }
    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      loader.classList.remove(ACTIVE_CLASS);
      loader.setAttribute("aria-hidden", "true");
      document.body.style.overflow = state.previousOverflow;
      document.body.classList.remove(BODY_LOADING_CLASS);
    }
  };

  window.showLoader = showLoader;
  window.hideLoader = hideLoader;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoader);
  } else {
    initLoader();
  }
})();
