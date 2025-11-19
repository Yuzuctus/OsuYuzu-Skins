document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const skinsContainer = document.getElementById("skins-container");
  const skinModal = document.getElementById("skin-modal");
  const modalImg = document.getElementById("modal-img");
  const backToTopBtn = document.getElementById("back-to-top");
  const header = document.querySelector(".site-header");

  // Variables for header control
  let lastScrollTop = 0;

  // Cache for already loaded images
  const imageCache = new Map();

  // Intersection Observer for lazy loading
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImageWithAnimation(img);
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "50px",
    }
  );

  // Animation Observer for cards
  const cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  /**
   * Lazy loading amélioré
   */
  const loadImageWithAnimation = (img) => {
    // Ajouter classe de chargement
    img.classList.add("lazy-loading");

    const tempImg = new Image();
    tempImg.onload = () => {
      // Image chargée, la remplacer
      img.src = tempImg.src;
      img.classList.remove("lazy-loading");
      img.classList.add("loaded");
      img.style.opacity = "1";

      // Cache l'image
      imageCache.set(img.dataset.src, tempImg.src);
    };

    tempImg.onerror = () => {
      img.classList.remove("lazy-loading");
      img.classList.add("error");
    };

    tempImg.src = img.dataset.src || img.src;
  };

  // Update available indicator
  let updateAvailable = false;

  /**
   * Service Worker functionality
   */
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data === "dataUpdated" || event.data === "updateAvailable") {
        updateAvailable = true;
        showUpdateNotification();
      }
    });
  }

  const checkForUpdates = () => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        action: "checkForUpdates",
      });
    }
  };

  const startUpdateChecker = () => {
    setTimeout(checkForUpdates, 2000);
    setInterval(checkForUpdates, 5 * 60 * 1000);
  };

  /**
   * Update notification functionality
   */
  const showUpdateNotification = () => {
    if (document.querySelector(".update-notification")) return;

    const notification = document.createElement("div");
    notification.classList.add("update-notification");

    notification.innerHTML = `
            <p>New data is available!</p>
            <div class="update-actions">
                <button class="refresh-now">Refresh now</button>
                <button class="dismiss">Later</button>
            </div>
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("visible");
    }, 100);

    notification.querySelector(".refresh-now").addEventListener("click", () => {
      localStorage.removeItem("skinsCacheInfo");
      localStorage.removeItem("cachedSkins");
      window.location.reload();
    });

    notification.querySelector(".dismiss").addEventListener("click", () => {
      notification.classList.remove("visible");
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  };

  const addUpdateNotificationStyle = () => {
    const style = document.createElement("style");
    style.textContent = `
            .update-notification {
                position: fixed;
                bottom: -100px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #4a90e2;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                transition: bottom 0.3s ease;
                text-align: center;
                max-width: 90%;
                width: 400px;
            }
            .update-notification.visible { bottom: 20px; }
            .update-notification p { margin: 0 0 10px 0; font-weight: 500; }
            .update-actions { display: flex; justify-content: center; gap: 10px; }
            .update-actions button { background: none; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; }
            .refresh-now { background-color: white; color: #4a90e2; }
            .refresh-now:hover { background-color: #f0f0f0; }
            .dismiss { color: white; background-color: rgba(255, 255, 255, 0.2); }
            .dismiss:hover { background-color: rgba(255, 255, 255, 0.3); }
        `;
    document.head.appendChild(style);
  };

  /**
   * Scroll and header functionality
   */
  const handleScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollTop > 300) {
      backToTopBtn?.classList.add("visible");
    } else {
      backToTopBtn?.classList.remove("visible");
    }

    lastScrollTop = scrollTop;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Skin data loading and caching
   */
  const loadSkins = async () => {
    try {
      const metaResponse = await fetch("data/yuzuctus_osu_skins.json", {
        method: "HEAD",
        cache: "no-cache",
      });
      const lastModified = metaResponse.headers.get("Last-Modified");
      const etag = metaResponse.headers.get("ETag");
      const fileIdentifier = etag || lastModified;

      const cachedDataInfo = localStorage.getItem("skinsCacheInfo");
      let useCache = false;

      if (cachedDataInfo) {
        const cacheInfo = JSON.parse(cachedDataInfo);
        useCache = cacheInfo.fileIdentifier === fileIdentifier;
      }

      if (useCache) {
        const cachedData = JSON.parse(
          localStorage.getItem("cachedSkins") || "{}"
        );
        if (cachedData.skins) {
          const sortedSkins = [...cachedData.skins].sort(
            (a, b) => a.order - b.order
          );
          displaySkins(sortedSkins, fileIdentifier);
          return;
        }
      }

      const response = await fetch("data/yuzuctus_osu_skins.json", {
        cache: "no-store",
      });
      const data = await response.json();

      if (data && data.skins) {
        const sortedSkins = [...data.skins].sort((a, b) => a.order - b.order);
        localStorage.setItem("cachedSkins", JSON.stringify(data));
        localStorage.setItem(
          "skinsCacheInfo",
          JSON.stringify({
            fileIdentifier: fileIdentifier,
            timestamp: Date.now(),
          })
        );
        displaySkins(sortedSkins, fileIdentifier);
      }
    } catch (error) {
      console.error("Error loading skins:", error);
      const cachedData = JSON.parse(
        localStorage.getItem("cachedSkins") || "{}"
      );
      if (cachedData.skins) {
        const sortedSkins = [...cachedData.skins].sort(
          (a, b) => a.order - b.order
        );
        displaySkins(sortedSkins, null);
      } else {
        skinsContainer.innerHTML =
          "<p>Unable to load skins. Please try again later.</p>";
      }
    }
  };

  /**
   * Random Character Loader
   */
  const loadRandomCharacter = () => {
    const characters = [
      "img/Characters/yuzuchibi1_nobg.png",
      "img/Characters/yuzuchibi1_nobg_nofog.png",
      "img/Characters/yuzuchibi2_nobg.png",
      "img/Characters/yuzuchibi3_nobg.png",
    ];

    const randomChar =
      characters[Math.floor(Math.random() * characters.length)];
    const imgElement = document.querySelector(".hero-img-placeholder img");
    if (imgElement) {
      imgElement.src = randomChar;
    }
  };

  /**
   * Parallax Effect
   */
  const initParallax = () => {
    const heroSection = document.querySelector(".hero-section");
    const heroImage = document.querySelector(".hero-img-placeholder");
    const heroGlow = document.querySelector(".hero-section::before"); // Pseudo-elements can't be manipulated directly via JS styles easily, so we might target the container or add a specific glow element.
    // Actually, let's just target the image for a strong effect.

    if (!heroSection || !heroImage) return;

    heroSection.addEventListener("mousemove", (e) => {
      // Intensified Parallax
      const x = (window.innerWidth - e.pageX * 2) / 25; // Stronger movement
      const y = (window.innerHeight - e.pageY * 2) / 25;

      heroImage.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });

    // Reset on mouse leave
    heroSection.addEventListener("mouseleave", () => {
      heroImage.style.transform = "translateX(0) translateY(0)";
    });
  };

  /**
   * Skin display functionality
   */
  const displaySkins = (skins, version) => {
    skinsContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    skins.forEach((skin, index) => {
      const skinCard = document.createElement("div");
      skinCard.classList.add("skin-card");

      // Bento Grid Logic
      // First item is Featured (Big Square)
      if (index === 0) {
        skinCard.classList.add("featured");
      }
      // Fourth item is Wide (Rectangular) to break the grid
      else if (index === 3) {
        skinCard.classList.add("wide");
      }

      // Rank Tag Logic
      let rankTagHTML = "";
      if (index === 0) rankTagHTML = `<div class="rank-tag">#1 👑</div>`;
      else if (index === 1) rankTagHTML = `<div class="rank-tag">#2 🥈</div>`;
      else if (index === 2) rankTagHTML = `<div class="rank-tag">#3 🥉</div>`;

      skinCard.innerHTML = `
                ${rankTagHTML}
                <div class="skin-image">
                    <img src="img/placeholder_loading.png" data-src="${
                      skin.imageUrl
                    }" alt="${
        skin.name
      }" class="lazy-load" style="opacity: 0; transition: opacity 0.5s;">
                </div>
                <div class="skin-info">
                    <h2>${skin.name}</h2>
                    <div class="skin-buttons">
                        <a href="${
                          skin.downloadLink
                        }" class="card-btn btn-download" target="_blank">
                            <i class="fas fa-download"></i> Download
                        </a>
                        ${
                          skin.forumLink
                            ? `<a href="${skin.forumLink}" class="card-btn btn-forum" target="_blank"><i class="fas fa-comments"></i> Forum</a>`
                            : ""
                        }
                    </div>
                </div>
            `;

      const img = skinCard.querySelector("img");
      if (img) imageObserver.observe(img);

      fragment.appendChild(skinCard);
    });

    skinsContainer.appendChild(fragment);
  };

  const initialize = () => {
    loadSkins();
    startUpdateChecker();
    addUpdateNotificationStyle();
    initParallax();
    loadRandomCharacter();

    // --- Theme Switcher Logic ---
    const themeToggleBtn = document.getElementById("theme-toggle");
    if (themeToggleBtn) {
      const themeIcon = themeToggleBtn.querySelector("i");
      const savedTheme = localStorage.getItem("theme");
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      // Apply initial theme (Default to Dark)
      if (savedTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        if (themeIcon) themeIcon.classList.replace("fa-sun", "fa-moon");
      } else {
        // Default is dark
        document.documentElement.setAttribute("data-theme", "dark");
        if (themeIcon) themeIcon.classList.replace("fa-moon", "fa-sun");
      }

      // Toggle event
      themeToggleBtn.addEventListener("click", () => {
        const currentTheme =
          document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);

        // Update Icon
        if (themeIcon) {
          if (newTheme === "dark") {
            themeIcon.classList.replace("fa-moon", "fa-sun");
          } else {
            themeIcon.classList.replace("fa-sun", "fa-moon");
          }
        }
      });
    }
  };

  // Event Listeners
  window.addEventListener("scroll", handleScroll);
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", scrollToTop);
  }

  // Start initialization
  initialize();
});
