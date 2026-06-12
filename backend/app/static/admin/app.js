// HTMX drawer handling
document.addEventListener("htmx:afterSwap", function (e) {
  if (e.target && e.target.id === "drawer") {
    openDrawer();
  }
});

document.addEventListener("htmx:trigger", function (e) {
  if (e.detail && (e.detail.value === "refreshList" || e.detail.value === "refreshPage")) {
    closeDrawer();
    window.location.reload();
  }
});

function openDrawer() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("drawer-overlay");
  if (overlay) overlay.addEventListener("click", closeDrawer);

  // Auto-dismiss flash banner
  const flash = document.getElementById("flash-banner");
  if (flash) setTimeout(() => flash.style.opacity = "0", 3500);

  // CSRF for HTMX requests (header-based)
  document.body.addEventListener("htmx:configRequest", function (e) {
    const csrf = getCookie("admin_csrf");
    if (csrf) e.detail.headers["X-CSRF-Token"] = csrf;
  });

  // CSRF for regular form POSTs (hidden field injection before submit)
  document.addEventListener("submit", function (e) {
    const form = e.target;
    if (form.method && form.method.toLowerCase() === "post") {
      if (!form.querySelector('[name="csrf_token"]')) {
        const csrf = getCookie("admin_csrf");
        if (csrf) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "csrf_token";
          input.value = csrf;
          form.appendChild(input);
        }
      }
    }
  });
});

function getCookie(name) {
  const v = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return v ? v.pop() : "";
}
