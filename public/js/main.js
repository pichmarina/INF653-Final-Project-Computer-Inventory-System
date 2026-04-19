// Main JavaScript for Computer Inventory System

document.addEventListener("DOMContentLoaded", function () {
  const body = document.body;

  // Sidebar
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  // Theme
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeToggleIcon = document.getElementById("themeToggleIcon");

  // Notifications
  const notificationsBtn = document.getElementById("notificationsBtn");
  const notificationsDropdown = document.getElementById(
    "notificationsDropdown",
  );
  const notificationsList = document.getElementById("notificationsList");
  const notificationDot = document.getElementById("notificationDot");
  const refreshNotificationsBtn = document.getElementById(
    "refreshNotificationsBtn",
  );

  // Help
  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const helpModalBody = document.getElementById("helpModalBody");
  const closeHelpModal = document.getElementById("closeHelpModal");
  const closeHelpModalFooter = document.getElementById("closeHelpModalFooter");
  const helpOverlay = helpModal
    ? helpModal.querySelector(".modal-overlay")
    : null;

  // Shared confirm modal
  const confirmModal = document.getElementById("confirmModal");
  const confirmModalMessage = document.getElementById("confirmModalMessage");
  const closeConfirmModalBtn = document.getElementById("closeConfirmModal");
  const cancelConfirmModalBtn = document.getElementById("cancelConfirmModal");
  const acceptConfirmModalBtn = document.getElementById("acceptConfirmModal");
  const confirmModalOverlay = confirmModal
    ? confirmModal.querySelector(".modal-overlay")
    : null;

  // Shared state for confirm flow
  let pendingConfirmForm = null;
  let pendingToggleState = null;

  // Restore scroll position after submit
  const savedScrollY = sessionStorage.getItem("cis-scroll-y");
  if (savedScrollY !== null) {
    requestAnimationFrame(() => {
      window.scrollTo(0, parseInt(savedScrollY, 10));
      sessionStorage.removeItem("cis-scroll-y");
    });
  }

  function saveScrollPosition() {
    sessionStorage.setItem("cis-scroll-y", String(window.scrollY));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setBodyLocked(locked) {
    body.style.overflow = locked ? "hidden" : "";
  }

  function updateStatusToggleLabel(input, checked) {
    const label = input
      ?.closest(".status-toggle")
      ?.querySelector(".status-toggle-label");

    if (!label) return;

    label.textContent = checked ? "Active" : "Disabled";
    label.classList.toggle("disabled", !checked);
    label.style.color = checked ? "var(--success)" : "var(--danger)";
  }

  function resetSubmitButton(form) {
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (submitBtn.dataset.originalText) {
      submitBtn.innerHTML = submitBtn.dataset.originalText;
    }

    submitBtn.disabled = false;
  }

  function openConfirmModal(message, form, toggleState = null) {
    if (!confirmModal || !confirmModalMessage) return;

    pendingConfirmForm = form || null;
    pendingToggleState = toggleState || null;

    confirmModalMessage.textContent =
      message || "Are you sure you want to continue?";

    confirmModal.classList.add("active");
    setBodyLocked(true);
  }

  function restorePendingToggleState() {
    if (!pendingToggleState) return;

    const { input, previousChecked, hiddenInput } = pendingToggleState;

    if (input) {
      input.checked = previousChecked;
      input.dataset.currentChecked = String(previousChecked);
      updateStatusToggleLabel(input, previousChecked);
    }

    if (hiddenInput) {
      hiddenInput.value = previousChecked ? "true" : "false";
    }

    pendingToggleState = null;
  }

  function closeConfirmModal(restoreState = false) {
    if (!confirmModal) return;

    confirmModal.classList.remove("active");
    setBodyLocked(false);

    if (restoreState) {
      resetSubmitButton(pendingConfirmForm);
      restorePendingToggleState();
    } else {
      pendingToggleState = null;
    }

    pendingConfirmForm = null;
  }

  if (acceptConfirmModalBtn) {
    acceptConfirmModalBtn.addEventListener("click", function () {
      if (!pendingConfirmForm) {
        closeConfirmModal(false);
        return;
      }

      if (pendingToggleState?.input) {
        pendingToggleState.input.dataset.currentChecked = String(
          pendingToggleState.nextChecked,
        );
      }

      pendingConfirmForm.dataset.confirmed = "true";
      saveScrollPosition();
      pendingConfirmForm.submit();
      closeConfirmModal(false);
    });
  }

  if (closeConfirmModalBtn) {
    closeConfirmModalBtn.addEventListener("click", function () {
      closeConfirmModal(true);
    });
  }

  if (cancelConfirmModalBtn) {
    cancelConfirmModalBtn.addEventListener("click", function () {
      closeConfirmModal(true);
    });
  }

  if (confirmModalOverlay) {
    confirmModalOverlay.addEventListener("click", function () {
      closeConfirmModal(true);
    });
  }

  // One shared confirm interceptor for normal forms only
  document.addEventListener(
    "submit",
    function (e) {
      const form = e.target;
      const message = form.getAttribute("data-confirm-message");

      if (!message) return;
      if (form.dataset.skipSharedConfirm === "true") return;

      if (form.dataset.confirmed === "true") {
        form.dataset.confirmed = "";
        return;
      }

      e.preventDefault();
      openConfirmModal(message, form);
    },
    true,
  );

  // Expose one clean status toggle handler globally for inline onchange
  window.handleStatusToggleChange = function (input) {
    const form = input?.form;
    if (!form) return;

    const previousChecked = input.dataset.currentChecked === "true";
    const nextChecked = input.checked;

    if (previousChecked === nextChecked) return;

    // This toggle uses the shared confirm modal directly.
    form.dataset.skipSharedConfirm = "true";

    // Remove checkbox name to avoid duplicate submitted values.
    if (!input.dataset.originalName) {
      input.dataset.originalName = input.getAttribute("name") || "isEnabled";
    }
    input.removeAttribute("name");

    let hiddenInput = form.querySelector('input[data-status-hidden="true"]');
    if (!hiddenInput) {
      hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = input.dataset.originalName || "isEnabled";
      hiddenInput.setAttribute("data-status-hidden", "true");
      form.appendChild(hiddenInput);
    }

    hiddenInput.value = nextChecked ? "true" : "false";

    updateStatusToggleLabel(input, nextChecked);

    const message =
      form.getAttribute("data-confirm-message") ||
      "Are you sure you want to change this user's account status?";

    openConfirmModal(message, form, {
      input,
      hiddenInput,
      previousChecked,
      nextChecked,
    });
  };

  // Dropdown helper
  function setupSimpleDropdown(toggleId, menuId) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);

    if (!toggle || !menu) return;

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();

      const isHidden = menu.hasAttribute("hidden");

      document.querySelectorAll(".filter-menu").forEach((item) => {
        item.setAttribute("hidden", "");
      });

      if (isHidden) {
        menu.removeAttribute("hidden");
      } else {
        menu.setAttribute("hidden", "");
      }
    });

    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  setupSimpleDropdown("userFilterToggle", "userFilterMenu");

  document.addEventListener("click", function () {
    document.querySelectorAll(".filter-menu").forEach((item) => {
      item.setAttribute("hidden", "");
    });
  });

  // Theme
  function applyTheme(theme) {
    if (theme === "dark") {
      body.classList.add("dark-mode");
      if (themeToggleIcon) {
        themeToggleIcon.classList.remove("fa-moon");
        themeToggleIcon.classList.add("fa-sun");
      }
      if (themeToggleBtn) {
        themeToggleBtn.title = "Light mode";
        themeToggleBtn.setAttribute("aria-label", "Light mode");
      }
    } else {
      body.classList.remove("dark-mode");
      if (themeToggleIcon) {
        themeToggleIcon.classList.remove("fa-sun");
        themeToggleIcon.classList.add("fa-moon");
      }
      if (themeToggleBtn) {
        themeToggleBtn.title = "Dark mode";
        themeToggleBtn.setAttribute("aria-label", "Dark mode");
      }
    }
  }

  const savedTheme = localStorage.getItem("cis-theme") || "light";
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
      const isDark = body.classList.contains("dark-mode");
      const nextTheme = isDark ? "light" : "dark";
      localStorage.setItem("cis-theme", nextTheme);
      applyTheme(nextTheme);
    });
  }

  async function fetchSystemNotifications() {
    const items = [];

    const pageTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
      document.querySelector(".page-heading")?.textContent?.trim() ||
      "Current page";

    const userName =
      document.querySelector(".user-name")?.textContent?.trim() ||
      "Signed-in user";

    const userRole =
      document.querySelector(".role-badge")?.textContent?.trim() ||
      "Unknown role";

    items.push({
      icon: "fas fa-user-shield",
      title: "Signed-in account",
      text: `${userName} (${userRole}) is currently using the ${pageTitle} page.`,
      time: "Current session",
      important: true,
    });

    try {
      const healthResponse = await fetch("/health", {
        credentials: "same-origin",
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        items.push({
          icon: "fas fa-server",
          title: "Server status",
          text: healthData.message || "Server is running normally.",
          time: "Live",
          important: false,
        });
      } else {
        items.push({
          icon: "fas fa-exclamation-triangle",
          title: "Server status",
          text: `Health endpoint returned HTTP ${healthResponse.status}.`,
          time: "Live",
          important: true,
        });
      }
    } catch (error) {
      items.push({
        icon: "fas fa-exclamation-triangle",
        title: "Server status",
        text: "Could not reach the health endpoint.",
        time: "Live",
        important: true,
      });
    }

    const totalItemsEl = document.getElementById("totalItems");
    const deployedItemsEl = document.getElementById("deployedItems");
    const availableItemsEl = document.getElementById("availableItems");
    const maintenanceItemsEl = document.getElementById("maintenanceItems");

    if (
      totalItemsEl &&
      deployedItemsEl &&
      availableItemsEl &&
      maintenanceItemsEl
    ) {
      items.push({
        icon: "fas fa-chart-bar",
        title: "Dashboard summary",
        text: `Total: ${totalItemsEl.textContent.trim()} | In Use: ${deployedItemsEl.textContent.trim()} | Available: ${availableItemsEl.textContent.trim()} | Maintenance: ${maintenanceItemsEl.textContent.trim()}`,
        time: "Visible on page",
        important: false,
      });
    }

    const usersTable = document.getElementById("usersTable");
    if (usersTable) {
      const countLabel =
        document.querySelector(".data-card-count")?.textContent?.trim() ||
        "User count unavailable";

      items.push({
        icon: "fas fa-users",
        title: "User management summary",
        text: countLabel,
        time: "Rendered from current page",
        important: false,
      });
    }

    const keysTable = document.getElementById("keysTable");
    if (keysTable) {
      const countLabel =
        document.querySelector(".data-card-count")?.textContent?.trim() ||
        "API key count unavailable";

      items.push({
        icon: "fas fa-key",
        title: "API key summary",
        text: countLabel,
        time: "Rendered from current page",
        important: false,
      });
    }

    const searchInput = document.querySelector(".search-box input");
    if (searchInput) {
      items.push({
        icon: "fas fa-search",
        title: "Quick search available",
        text: `This page includes search: "${searchInput.placeholder || "Search"}". Press Ctrl/Cmd + K to focus it.`,
        time: "Current page",
        important: false,
      });
    }

    return items;
  }

  async function renderNotifications() {
    if (!notificationsList) return;

    notificationsList.innerHTML =
      '<div class="dropdown-empty">Loading status...</div>';

    const items = await fetchSystemNotifications();

    if (!items.length) {
      notificationsList.innerHTML =
        '<div class="dropdown-empty">No status information available.</div>';

      if (notificationDot) notificationDot.style.display = "none";
      return;
    }

    notificationsList.innerHTML = items
      .map(
        (item) => `
      <div class="notification-item">
        <div class="notification-item-icon">
          <i class="${escapeHtml(item.icon)}"></i>
        </div>
        <div class="notification-item-content">
          <div class="notification-item-title">${escapeHtml(item.title)}</div>
          <div class="notification-item-text">${escapeHtml(item.text)}</div>
          <span class="notification-item-time">${escapeHtml(item.time)}</span>
        </div>
      </div>
    `,
      )
      .join("");

    const hasImportant = items.some((item) => item.important);
    if (notificationDot) {
      notificationDot.style.display = hasImportant ? "block" : "none";
    }
  }

  function renderHelpModal() {
    if (!helpModalBody) return;

    const pageTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
      document.querySelector(".page-heading")?.textContent?.trim() ||
      "This page";

    const userName =
      document.querySelector(".user-name")?.textContent?.trim() ||
      "Unknown user";

    const userRole =
      document.querySelector(".role-badge")?.textContent?.trim() ||
      "Unknown role";

    const currentPath = window.location.pathname;

    const sections = [
      {
        title: "Current session",
        items: [
          `Signed in as ${userName} (${userRole}).`,
          `You are currently viewing the ${pageTitle} page.`,
        ],
      },
    ];

    if (currentPath === "/dashboard") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Shows a quick overview of inventory status.",
            "Provides shortcuts to the main parts of the system.",
            "Displays summary cards such as total items, in use, available, and maintenance.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Use the sidebar to move to Inventory, Check-In/Out, History, Reports, Users, or API Keys.",
            "Use the navigation cards to jump directly to a section.",
            "Use dark mode if you prefer a lower-brightness view.",
          ],
        },
      );
    }

    if (currentPath === "/inventory") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Displays inventory items and their current status.",
            "Helps you review hardware and peripheral records.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Use the search box to find items quickly.",
            "Use the filter button if your inventory tools support filtering.",
            "Use the Add Item button when the item creation flow is connected.",
          ],
        },
      );
    }

    if (currentPath === "/transactions") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Handles check-in and check-out operations.",
            "Supports assigning items to users and processing returns.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Choose Check Out to assign an available item.",
            "Choose Check In to return an item to available status.",
            "Follow the connected transaction flow and upload required documents if enabled.",
          ],
        },
      );
    }

    if (currentPath === "/history") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Shows transaction history and audit activity.",
            "Helps track who used an item and what action was taken.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Use the search box to find specific history records.",
            "Review action, date, user, and document information from the table.",
          ],
        },
      );
    }

    if (currentPath === "/reports") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Provides reporting and summary views for the inventory system.",
            "Helps review asset status, aging, and user-related data.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Open a report card to review that category when the report logic is connected.",
            "Use this page to understand the overall condition of the system.",
          ],
        },
      );
    }

    if (currentPath === "/users") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Manages system users and their roles.",
            "Lets admins control access by enabling or disabling accounts.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Use the search box to find a user.",
            "Use the role dropdown to change a user role.",
            "Use the status toggle to enable or disable an account.",
            "Use Add New User to create another account.",
          ],
        },
      );
    }

    if (currentPath === "/keys") {
      sections.push(
        {
          title: "What this page does",
          items: [
            "Manages API keys for integrations and programmatic access.",
            "Lets admins create and revoke keys securely.",
          ],
        },
        {
          title: "How to use it",
          items: [
            "Use Generate API Key to create a new key.",
            "Copy the raw key immediately because it is shown only once.",
            "Use the search box to find keys quickly.",
            "Use Revoke to disable a key permanently.",
          ],
        },
      );
    }

    sections.push({
      title: "General note",
      items: ["Press Escape to close an open modal or popup."],
    });

    helpModalBody.innerHTML = sections
      .map(
        (section) => `
      <div class="help-section">
        <div class="help-section-title">${escapeHtml(section.title)}</div>
        <ul class="help-list">
          ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    `,
      )
      .join("");
  }

  function openNotifications() {
    if (!notificationsDropdown) return;
    notificationsDropdown.classList.add("active");
    renderNotifications();
  }

  function closeNotifications() {
    if (!notificationsDropdown) return;
    notificationsDropdown.classList.remove("active");
  }

  function openHelpModal() {
    if (!helpModal) return;
    renderHelpModal();
    helpModal.classList.add("active");
    setBodyLocked(true);
  }

  function hideHelpModal() {
    if (!helpModal) return;
    helpModal.classList.remove("active");
    setBodyLocked(false);
  }

  if (notificationsBtn && notificationsDropdown) {
    notificationsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = notificationsDropdown.classList.contains("active");
      closeNotifications();
      if (!isOpen) openNotifications();
    });
  }

  if (refreshNotificationsBtn) {
    refreshNotificationsBtn.addEventListener("click", function () {
      renderNotifications();
    });
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", function () {
      openHelpModal();
    });
  }

  if (closeHelpModal) {
    closeHelpModal.addEventListener("click", hideHelpModal);
  }

  if (closeHelpModalFooter) {
    closeHelpModalFooter.addEventListener("click", hideHelpModal);
  }

  if (helpOverlay) {
    helpOverlay.addEventListener("click", hideHelpModal);
  }

  document.addEventListener("click", function (e) {
    if (notificationsDropdown && notificationsBtn) {
      if (
        notificationsDropdown.classList.contains("active") &&
        !notificationsDropdown.contains(e.target) &&
        !notificationsBtn.contains(e.target)
      ) {
        closeNotifications();
      }
    }
  });

  // Sidebar collapse
  function setSidebarCollapsed(collapsed) {
    if (collapsed) {
      sidebar.classList.add("collapsed");
      body.classList.add("sidebar-collapsed");
    } else {
      sidebar.classList.remove("collapsed");
      body.classList.remove("sidebar-collapsed");
    }
    const icon = sidebarToggle ? sidebarToggle.querySelector("i") : null;
    if (icon) {
      if (collapsed) {
        icon.classList.remove("fa-chevron-left");
        icon.classList.add("fa-chevron-right");
      } else {
        icon.classList.remove("fa-chevron-right");
        icon.classList.add("fa-chevron-left");
      }
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      setSidebarCollapsed(!sidebar.classList.contains("collapsed"));
    });
  }

  // Click the brand logo to expand when collapsed
  const brandEl = sidebar ? sidebar.querySelector(".brand") : null;
  if (brandEl && sidebar) {
    brandEl.style.cursor = "pointer";
    brandEl.addEventListener("click", function () {
      if (sidebar.classList.contains("collapsed")) {
        setSidebarCollapsed(false);
      }
    });
  }

  // Mobile menu
  if (mobileMenuToggle && sidebar && sidebarOverlay) {
    mobileMenuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("mobile-open");
      sidebarOverlay.classList.toggle("active");
      setBodyLocked(sidebar.classList.contains("mobile-open"));
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener("click", function () {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("active");
      setBodyLocked(false);
    });
  }

  // Auto-hide alerts
  const alerts = document.querySelectorAll(".alert-dismissible");
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Table hover
  const tableRows = document.querySelectorAll(".data-table tbody tr");
  tableRows.forEach((row) => {
    row.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.002)";
    });
    row.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });
  });

  // Form focus
  const formInputs = document.querySelectorAll(".form-input, .form-select");
  formInputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.closest(".form-group")?.classList.add("focused");
    });

    input.addEventListener("blur", function () {
      this.closest(".form-group")?.classList.remove("focused");
    });
  });

  // Button loading state
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", function () {
      if (
        this.hasAttribute("data-confirm-message") &&
        this.dataset.confirmed !== "true" &&
        this.dataset.skipSharedConfirm !== "true"
      ) {
        return;
      }

      saveScrollPosition();

      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.classList.contains("no-loading")) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Loading...';
      }
    });
  });

  // Search input clear buttons
  const searchInputs = document.querySelectorAll(".search-box input");
  searchInputs.forEach((input) => {
    const wrapper = input.parentElement;
    if (!wrapper) return;

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "search-clear";
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.style.display = "none";
    wrapper.appendChild(clearBtn);

    input.addEventListener("input", function () {
      clearBtn.style.display = this.value ? "flex" : "none";
    });

    clearBtn.addEventListener("click", function () {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  });

  // Card entrance animation
  const cards = document.querySelectorAll(
    ".data-card, .dashboard-card, .stat-card",
  );

  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    setTimeout(() => {
      card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });

  // Tooltip
  const tooltipTriggers = document.querySelectorAll("[title]");
  tooltipTriggers.forEach((trigger) => {
    trigger.addEventListener("mouseenter", function () {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = this.getAttribute("title");
      document.body.appendChild(tooltip);

      const rect = this.getBoundingClientRect();
      let ttTop = rect.top - tooltip.offsetHeight - 8;
      if (ttTop < 4) {
        ttTop = rect.bottom + 8;
      }
      let ttLeft = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
      ttLeft = Math.max(8, Math.min(ttLeft, window.innerWidth - tooltip.offsetWidth - 8));
      tooltip.style.left = ttLeft + "px";
      tooltip.style.top = ttTop + "px";

      this._tooltip = tooltip;
    });

    trigger.addEventListener("mouseleave", function () {
      if (this._tooltip) {
        this._tooltip.remove();
        this._tooltip = null;
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.active");
      if (activeModal) {
        activeModal.classList.remove("active");
        setBodyLocked(false);
      }

      document.querySelectorAll(".filter-menu").forEach((item) => {
        item.setAttribute("hidden", "");
      });

      if (
        notificationsDropdown &&
        notificationsDropdown.classList.contains("active")
      ) {
        closeNotifications();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const searchInput = document.querySelector(".search-box input");
      if (searchInput) searchInput.focus();
    }
  });

  // Window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 1024 && sidebar && sidebarOverlay) {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("active");
      setBodyLocked(false);
    }
  });

  // Update navbar quick stats on every page
  async function updateNavbarStats() {
    try {
      const response = await fetch("/api/reports/summary", {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.success || !result.data) return;
      const { available, deployed, maintenance } = result.data;
      const navAvailable = document.getElementById("navAvailableCount");
      const navInUse = document.getElementById("navInUseCount");
      const navMaintenance = document.getElementById("navMaintenanceCount");
      if (navAvailable) navAvailable.textContent = available ?? 0;
      if (navInUse) navInUse.textContent = deployed ?? 0;
      if (navMaintenance) navMaintenance.textContent = maintenance ?? 0;
      const mobileAvailable = document.getElementById("mobileAvailableCount");
      const mobileInUse = document.getElementById("mobileInUseCount");
      const mobileMaintenance = document.getElementById("mobileMaintenanceCount");
      if (mobileAvailable) mobileAvailable.textContent = available ?? 0;
      if (mobileInUse) mobileInUse.textContent = deployed ?? 0;
      if (mobileMaintenance) mobileMaintenance.textContent = maintenance ?? 0;
    } catch (e) {
      // silently ignore on pages without auth
    }
  }
  updateNavbarStats();
});

// Helper functions
function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export helpers
window.CIS = {
  formatDate,
  formatDateTime,
  debounce,
};