(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function isChinese() {
    return document.documentElement.lang.toLowerCase().indexOf("zh") === 0;
  }

  function label(zh, en) {
    return isChinese() ? zh : en;
  }

  function createProgressBar() {
    if (document.querySelector(".reading-progress")) return;
    var bar = document.createElement("div");
    bar.className = "reading-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = "<i></i>";
    document.body.appendChild(bar);
  }

  function updateProgress() {
    var indicator = document.querySelector(".reading-progress i");
    if (!indicator) return;

    var documentElement = document.documentElement;
    var scrollable = documentElement.scrollHeight - window.innerHeight;
    var progress = scrollable > 0
      ? Math.min(1, Math.max(0, window.scrollY / scrollable))
      : 0;
    indicator.style.transform = "scaleX(" + progress + ")";
    var topButton = document.querySelector(".reader-tools__button--top");
    if (topButton) {
      var shouldShow =
        scrollable > 0 &&
        window.scrollY > Math.min(480, window.innerHeight * 0.6);
      topButton.classList.toggle("is-visible", shouldShow);
      topButton.tabIndex = shouldShow ? 0 : -1;
      topButton.setAttribute("aria-hidden", String(!shouldShow));
    }
  }

  function createButton(className, title, iconClass, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.innerHTML = "<i class=\"" + iconClass + "\" aria-hidden=\"true\"></i>";
    button.addEventListener("click", handler);
    return button;
  }

  function closeToc(panel) {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    document.body.classList.remove("mobile-toc-open");
    if (panel.previousFocus && document.contains(panel.previousFocus)) {
      panel.previousFocus.focus();
    }
  }

  function createMobileToc(sourceToc) {
    var panel = document.createElement("div");
    panel.className = "mobile-toc";
    panel.id = "mobile-article-toc";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    panel.innerHTML = [
      "<button class=\"mobile-toc__shade\" type=\"button\" data-close-toc aria-label=\"" +
        label("关闭文章目录", "Close table of contents") + "\"></button>",
      "<aside class=\"mobile-toc__panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"" +
        label("文章目录", "Table of contents") + "\" tabindex=\"-1\">",
      "<button class=\"mobile-toc__close\" type=\"button\" data-close-toc aria-label=\"" +
        label("关闭文章目录", "Close table of contents") + "\">",
      "<i class=\"fas fa-times\" aria-hidden=\"true\"></i></button>",
      "<div class=\"mobile-toc__body\"></div>",
      "</aside>"
    ].join("");

    panel.querySelector(".mobile-toc__body").appendChild(sourceToc.cloneNode(true));
    panel.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-toc]") || event.target.closest(".toc a")) {
        closeToc(panel);
      }
    });
    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeToc(panel);
        return;
      }

      if (event.key !== "Tab") return;
      var controls = Array.prototype.slice.call(panel.querySelectorAll(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      ));
      if (!controls.length) return;
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.body.appendChild(panel);
    return panel;
  }

  function createTools() {
    if (document.querySelector(".reader-tools")) return;

    var toc = document.querySelector("nav.toc");
    var tocPanel = toc ? createMobileToc(toc) : null;
    var tools = document.createElement("div");
    tools.className = "reader-tools";

    if (tocPanel) {
      var tocButton = createButton(
        "reader-tools__button reader-tools__button--toc",
        label("打开文章目录", "Open table of contents"),
        "fas fa-list-ul",
        function () {
          tocPanel.previousFocus = this;
          tocPanel.classList.add("is-open");
          tocPanel.setAttribute("aria-hidden", "false");
          tocPanel.removeAttribute("inert");
          document.body.classList.add("mobile-toc-open");
          tocPanel.querySelector(".mobile-toc__close").focus();
        }
      );
      tocButton.setAttribute("aria-controls", tocPanel.id);
      tools.appendChild(tocButton);
    }

    var topButton = createButton(
      "reader-tools__button reader-tools__button--top",
      label("返回顶部", "Back to top"),
      "fas fa-arrow-up",
      function () {
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    );
    topButton.tabIndex = -1;
    topButton.setAttribute("aria-hidden", "true");
    tools.appendChild(topButton);
    document.body.appendChild(tools);
  }

  ready(function () {
    if (!document.querySelector(".page__content")) return;
    createProgressBar();
    createTools();
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  });
})();
