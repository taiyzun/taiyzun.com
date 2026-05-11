(() => {
  const root = document.documentElement;
  const shells = Array.from(document.querySelectorAll(".hero-video, .page-hero-video"));
  const primaryShell = shells[0];

  if (primaryShell) {
    primaryShell.classList.add("site-ambient-video");
    document.body.insertBefore(primaryShell, document.body.firstChild);
    shells.slice(1).forEach((shell) => shell.remove());
  }

  const videos = Array.from(document.querySelectorAll(".site-ambient-video .ambient-video-media, .ambient-video-media"));

  if (!videos.length) {
    return;
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  function ambientVideoDisabled() {
    return motionQuery.matches || Boolean(connection && connection.saveData);
  }

  function syncVideo(video) {
    const disabled =
      root.classList.contains("ambient-video-disabled") ||
      document.hidden;

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
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

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
