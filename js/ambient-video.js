(() => {
  const root = document.documentElement;
  const videos = Array.from(document.querySelectorAll(".ambient-video-media"));

  if (!videos.length) {
    return;
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const heroObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.dataset.ambientVisible = entry.isIntersecting ? "true" : "false";
            const video = entry.target.querySelector(".ambient-video-media");
            if (video) {
              syncVideo(video);
            }
          });
        },
        { threshold: 0.18 }
      )
    : null;

  function ambientVideoDisabled() {
    return motionQuery.matches || Boolean(connection && connection.saveData);
  }

  function syncVideo(video) {
    const scene = video.closest(".hero, .page-hero");
    const sceneVisible = !scene || scene.dataset.ambientVisible !== "false";
    const disabled =
      root.classList.contains("ambient-video-disabled") ||
      document.hidden ||
      !sceneVisible;

    if (disabled) {
      video.pause();
      return;
    }

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {
        root.classList.add("ambient-video-blocked");
      });
    }
  }

  function applyAmbientPreference() {
    root.classList.toggle("ambient-video-disabled", ambientVideoDisabled());
    if (!root.classList.contains("ambient-video-disabled")) {
      root.classList.remove("ambient-video-blocked");
    }

    videos.forEach((video) => {
      video.preload = root.classList.contains("ambient-video-disabled") ? "none" : "metadata";
      syncVideo(video);
    });
  }

  videos.forEach((video) => {
    const scene = video.closest(".hero, .page-hero");

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (scene) {
      scene.dataset.ambientVisible = "true";
      if (heroObserver) {
        heroObserver.observe(scene);
      }
    }

    video.addEventListener(
      "canplay",
      () => {
        root.classList.add("ambient-video-ready");
      },
      { once: true }
    );
  });

  document.addEventListener("visibilitychange", () => {
    videos.forEach((video) => syncVideo(video));
  });

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", applyAmbientPreference);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(applyAmbientPreference);
  }

  if (connection && typeof connection.addEventListener === "function") {
    connection.addEventListener("change", applyAmbientPreference);
  }

  applyAmbientPreference();
})();
