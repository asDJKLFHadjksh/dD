(() => {
  const LOADER_ID = "miniLoader";
  const LOADER_HIDDEN_CLASS = "hidden";
  const LOADER_VISIBLE_CLASS = "is-visible";
  const LOADER_PATH = "/Loading.json";
  let loadingCount = 0;
  let hasInitialized = false;
  let animationInstance = null;

  const ensureLoader = () => {
    if (hasInitialized) {
      return document.getElementById(LOADER_ID);
    }

    const container = document.createElement("div");
    container.id = LOADER_ID;
    container.className = `mini-loader ${LOADER_HIDDEN_CLASS}`;
    container.setAttribute("aria-hidden", "true");

    const animationHost = document.createElement("div");
    animationHost.className = "mini-loader__animation";
    container.appendChild(animationHost);

    document.body.appendChild(container);
    hasInitialized = true;

    if (window.lottie) {
      animationInstance = window.lottie.loadAnimation({
        container: animationHost,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: LOADER_PATH,
      });
    } else {
      console.warn("lottie-web belum tersedia untuk loader.");
    }

    return container;
  };

  const updateVisibility = () => {
    const loader = ensureLoader();
    if (!loader) {
      return;
    }

    if (loadingCount > 0) {
      loader.classList.remove(LOADER_HIDDEN_CLASS);
      loader.classList.add(LOADER_VISIBLE_CLASS);
    } else {
      loader.classList.add(LOADER_HIDDEN_CLASS);
      loader.classList.remove(LOADER_VISIBLE_CLASS);
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

  const setLoaderLoading = (isLoading) => {
    if (isLoading) {
      showLoader();
    } else {
      hideLoader();
    }
  };

  window.showLoader = showLoader;
  window.hideLoader = hideLoader;
  window.setLoaderLoading = setLoaderLoading;
  window.__miniLoaderState = {
    get count() {
      return loadingCount;
    },
    get animation() {
      return animationInstance;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureLoader);
  } else {
    ensureLoader();
  }
})();
