// Main JavaScript for Computer Inventory System

document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle functionality
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
    // Dark mode toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeToggleIcon = document.getElementById('themeToggleIcon');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeToggleIcon) {
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
      }
    } else {
      document.body.classList.remove('dark-mode');
      if (themeToggleIcon) {
        themeToggleIcon.classList.remove('fa-sun');
        themeToggleIcon.classList.add('fa-moon');
      }
    }
  }

  const savedTheme = localStorage.getItem('cis-theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
      const isDark = document.body.classList.contains('dark-mode');
      const nextTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('cis-theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  const notificationsBtn = document.getElementById("notificationsBtn");
  const notificationsDropdown = document.getElementById(
    "notificationsDropdown",
  );
  const notificationsList = document.getElementById("notificationsList");
  const notificationDot = document.getElementById("notificationDot");
  const refreshNotificationsBtn = document.getElementById(
    "refreshNotificationsBtn",
  );

  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const helpModalBody = document.getElementById("helpModalBody");
  const closeHelpModal = document.getElementById("closeHelpModal");
  const closeHelpModalFooter = document.getElementById("closeHelpModalFooter");
  const helpOverlay = helpModal
    ? helpModal.querySelector(".modal-overlay")
    : null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function fetchSystemNotifications() {
    const items = [];
    const pageTitle =
      document.querySelector(".page-title")?.textContent?.trim() ||
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

  function getPageHelpSections() {
    const pageTitle =
      document.querySelector(".page-title")?.textContent?.trim() || "This page";
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
          `You are signed in as ${userName} (${userRole}).`,
          `You are currently on the ${pageTitle} page.`,
        ],
      },
      {
        title: "Keyboard shortcuts",
        items: [
          "Press Ctrl/Cmd + K to focus the first search box on the page.",
          "Press Escape to close an open modal or dropdown.",
        ],
      },
    ];

    if (currentPath === "/dashboard") {
      sections.push({
        title: "What you can do here",
        items: [
          "Review live inventory summary cards.",
          "Use Quick Navigation to jump to Inventory, Transactions, Reports, Users, or API Keys.",
          "Open System Status to verify server and page data.",
        ],
      });
    }

    if (currentPath === "/users") {
      sections.push({
        title: "What you can do here",
        items: [
          "Search existing users with the search box.",
          "Change a user role using the role dropdown.",
          "Enable or disable accounts using the status toggle.",
          "Create a new user from the Add New User button.",
        ],
      });
    }

    if (currentPath === "/keys") {
      sections.push({
        title: "What you can do here",
        items: [
          "Generate a new API key from the modal form.",
          "Search keys using the search box.",
          "Revoke an active key from the table.",
          "Copy a newly created raw key immediately because it is only shown once.",
        ],
      });
    }

    if (currentPath === "/inventory") {
      sections.push({
        title: "What you can do here",
        items: [
          "Review inventory records and current statuses.",
          "Use search to filter visible items.",
          "Add-item behavior depends on the connected inventory implementation.",
        ],
      });
    }

    if (currentPath === "/transactions") {
      sections.push({
        title: "What you can do here",
        items: [
          "Use this page for check-in and check-out operations.",
          "Transaction actions depend on the connected transaction implementation.",
          "Uploaded documents should be tied to the transaction flow.",
        ],
      });
    }

    if (currentPath === "/reports") {
      sections.push({
        title: "What you can do here",
        items: [
          "Use reports to review inventory summary, asset aging, and user audit data.",
          "Real report output depends on your connected report routes.",
          "System Status can help confirm whether summary data is loading.",
        ],
      });
    }

    return sections;
  }

  function renderHelpModal() {
    if (!helpModalBody) return;

    const sections = getPageHelpSections();

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
    document.body.style.overflow = "hidden";
  }

  function hideHelpModal() {
    if (!helpModal) return;
    helpModal.classList.remove("active");
    document.body.style.overflow = "";
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

  if (closeHelpModal) closeHelpModal.addEventListener("click", hideHelpModal);
  if (closeHelpModalFooter)
    closeHelpModalFooter.addEventListener("click", hideHelpModal);
  if (helpOverlay) helpOverlay.addEventListener("click", hideHelpModal);

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

  // Toggle sidebar collapse (desktop)
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("collapsed");
      document.body.classList.toggle("sidebar-collapsed");

      const icon = this.querySelector("i");
      if (sidebar.classList.contains("collapsed")) {
        icon.classList.remove("fa-chevron-left");
        icon.classList.add("fa-chevron-right");
      } else {
        icon.classList.remove("fa-chevron-right");
        icon.classList.add("fa-chevron-left");
      }
    });
  }

  // Mobile menu toggle
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("mobile-open");
      sidebarOverlay.classList.toggle("active");
      document.body.style.overflow = sidebar.classList.contains("mobile-open")
        ? "hidden"
        : "";
    });
  }

  // Close sidebar on overlay click (mobile)
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", function () {
      sidebar.classList.remove("mobile-open");
      this.classList.remove("active");
      document.body.style.overflow = "";
    });
  }

  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll(".alert-dismissible");
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Table row hover effect enhancement
  const tableRows = document.querySelectorAll(".data-table tbody tr");
  tableRows.forEach((row) => {
    row.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.002)";
    });
    row.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });
  });

  // Form input focus effects
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
    form.addEventListener("submit", function (e) {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.classList.contains("no-loading")) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Loading...';
      }
    });
  });

  // Status toggle animation
  const statusToggles = document.querySelectorAll(".status-toggle input");
  statusToggles.forEach((toggle) => {
    toggle.addEventListener("change", function () {
      const label = this.closest(".status-toggle").querySelector(
        ".status-toggle-label",
      );
      label.textContent = this.checked ? "Active" : "Disabled";
      label.style.color = this.checked ? "var(--success)" : "var(--danger)";
    });
  });

  // Search input clear button
  const searchInputs = document.querySelectorAll(".search-box input");
  searchInputs.forEach((input) => {
    const clearBtn = document.createElement("button");
    clearBtn.className = "search-clear";
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.style.display = "none";
    input.parentElement.appendChild(clearBtn);

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

  // Tooltip initialization for icons
  const tooltipTriggers = document.querySelectorAll("[title]");
  tooltipTriggers.forEach((trigger) => {
    trigger.addEventListener("mouseenter", function (e) {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = this.getAttribute("title");
      document.body.appendChild(tooltip);

      const rect = this.getBoundingClientRect();
      tooltip.style.left =
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
      tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + "px";

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
    // ESC to close modals
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.active");
      if (activeModal) {
        activeModal.classList.remove("active");
        document.body.style.overflow = "";
      }

      const activeDropdown = document.querySelector(".action-dropdown.active");
      if (activeDropdown) {
        activeDropdown.classList.remove("active");
      }
    }

    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const searchInput = document.querySelector(".search-box input");
      if (searchInput) searchInput.focus();
    }
  });

  // Window resize handler for sidebar
  window.addEventListener("resize", function () {
    if (window.innerWidth > 1024) {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
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

// Export for use in other scripts
window.CIS = {
  formatDate,
  formatDateTime,
  debounce,
};
