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
  const compactQuery = window.matchMedia("(max-width: 820px), (pointer: coarse)");
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let ambientVideoStarted = false;
  let visibilityObserver = null;
  let idleHandle = 0;
  let idleFallback = false;
  let engagementListenersInstalled = false;
  const engagementEvents = ["pointermove", "pointerdown", "touchstart", "keydown", "scroll"];

  function ambientVideoDisabled() {
    return motionQuery.matches || compactQuery.matches || Boolean(connection && connection.saveData);
  }

  function ensureVideoSource(video) {
    const sources = Array.from(video.querySelectorAll("source[data-src]"));

    sources.forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });

    if (sources.length) {
      video.load();
    }
  }

  function syncVideo(video) {
    const disabled =
      ambientVideoDisabled() ||
      root.classList.contains("ambient-video-disabled") ||
      document.hidden;

    if (!ambientVideoStarted || disabled) {
      video.pause();
      return;
    }

    ensureVideoSource(video);

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {
        root.classList.add("ambient-video-blocked");
      });
    }
  }

  function cancelScheduledStart() {
    if (visibilityObserver) {
      visibilityObserver.disconnect();
      visibilityObserver = null;
    }

    if (idleHandle) {
      if (!idleFallback && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }

      idleHandle = 0;
    }

    if (engagementListenersInstalled) {
      engagementEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleFirstEngagement);
      });
      engagementListenersInstalled = false;
    }
  }

  function handleFirstEngagement() {
    engagementEvents.forEach((eventName) => {
      window.removeEventListener(eventName, handleFirstEngagement);
    });
    engagementListenersInstalled = false;
    scheduleIdleStart();
  }

  function awaitEngagement() {
    if (ambientVideoStarted || ambientVideoDisabled() || engagementListenersInstalled) {
      return;
    }

    engagementListenersInstalled = true;
    engagementEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleFirstEngagement, { passive: true });
    });
  }

  function scheduleIdleStart() {
    if (ambientVideoStarted || ambientVideoDisabled() || idleHandle) {
      return;
    }

    const run = () => {
      idleHandle = 0;
      startAmbientVideo();
    };

    if ("requestIdleCallback" in window) {
      idleFallback = false;
      idleHandle = window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      idleFallback = true;
      idleHandle = window.setTimeout(run, 160);
    }
  }

  function observeNearViewport() {
    if (ambientVideoStarted || ambientVideoDisabled() || visibilityObserver || idleHandle || engagementListenersInstalled) {
      return;
    }

    const target = primaryShell || videos[0];
    if (!("IntersectionObserver" in window) || !target) {
      awaitEngagement();
      return;
    }

    visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        visibilityObserver?.disconnect();
        visibilityObserver = null;
        awaitEngagement();
      },
      { rootMargin: "240px 0px", threshold: 0 }
    );
    visibilityObserver.observe(target);
  }

  function applyAmbientPreference() {
    const disabled = ambientVideoDisabled();
    root.classList.toggle("ambient-video-disabled", disabled);

    videos.forEach((video) => {
      video.preload = !ambientVideoStarted || disabled ? "none" : "metadata";
      syncVideo(video);
    });

    if (disabled) {
      root.classList.remove("ambient-video-ready", "ambient-video-blocked");
      cancelScheduledStart();
      return;
    }

    root.classList.remove("ambient-video-blocked");
    if (!ambientVideoStarted) {
      observeNearViewport();
    }
  }

  function startAmbientVideo() {
    if (ambientVideoStarted || ambientVideoDisabled()) {
      return;
    }

    cancelScheduledStart();
    ambientVideoStarted = true;
    applyAmbientPreference();
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

  if (typeof compactQuery.addEventListener === "function") {
    compactQuery.addEventListener("change", applyAmbientPreference);
  } else if (typeof compactQuery.addListener === "function") {
    compactQuery.addListener(applyAmbientPreference);
  }

  if (connection && typeof connection.addEventListener === "function") {
    connection.addEventListener("change", applyAmbientPreference);
  }

  applyAmbientPreference();
})();
