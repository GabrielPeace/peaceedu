(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function parseTags(value) {
    return value ? value.split("||").map(function (tag) { return tag.trim(); }).filter(Boolean) : [];
  }

  function reduceMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  ready(function () {
    var directory = document.querySelector("[data-tag-directory]");
    if (!directory) return;

    var queryInput = directory.querySelector("[data-tag-query]");
    var directoryStatus = directory.querySelector("[data-tag-directory-status]");
    var buttons = Array.prototype.slice.call(directory.querySelectorAll("[data-tag]"));
    var groups = Array.prototype.slice.call(directory.querySelectorAll("[data-tag-group]"));
    var posts = Array.prototype.slice.call(document.querySelectorAll("[data-post-tags]"));
    var currentTag = document.querySelector("[data-current-tag]");
    var currentCount = document.querySelector("[data-current-tag-count]");
    var noPosts = document.querySelector("[data-tag-no-posts]");
    var reset = document.querySelector("[data-tag-reset]");

    function selectedTagFromLocation() {
      var queryTag = new URLSearchParams(window.location.search).get("tag");
      if (queryTag) return queryTag;
      var legacySlug;
      try {
        legacySlug = decodeURIComponent(window.location.hash.slice(1));
      } catch (error) {
        legacySlug = window.location.hash.slice(1);
      }
      if (!legacySlug) return "";
      var legacyButton = buttons.find(function (button) {
        return button.dataset.tagSlug === legacySlug;
      });
      return legacyButton ? legacyButton.dataset.tag : "";
    }

    function updateDirectory() {
      var query = queryInput.value.trim().toLocaleLowerCase();
      var visible = 0;
      buttons.forEach(function (button) {
        var matches = !query || button.dataset.tag.toLocaleLowerCase().includes(query);
        button.hidden = !matches;
        if (matches) visible += 1;
      });
      groups.forEach(function (group) {
        var hasVisibleTag = Array.prototype.some.call(
          group.querySelectorAll("[data-tag]"),
          function (button) { return !button.hidden; }
        );
        group.hidden = !hasVisibleTag;
        if (query && hasVisibleTag) group.open = true;
      });
      directoryStatus.textContent = "显示 " + visible + "/" + buttons.length + " 个标签";
    }

    function applyTag(tag, options) {
      options = options || {};
      var matched = 0;

      posts.forEach(function (post) {
        var visible = !tag || parseTags(post.dataset.postTags).includes(tag);
        post.hidden = !visible;
        if (visible) matched += 1;
      });
      buttons.forEach(function (button) {
        var active = button.dataset.tag === tag;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
        if (active && button.closest("[data-tag-group]")) {
          button.closest("[data-tag-group]").open = true;
        }
      });

      currentTag.textContent = tag || "全部";
      currentCount.textContent = matched + " 篇文章";
      noPosts.hidden = matched > 0;

      if (options.updateHistory) {
        var url = new URL(window.location.href);
        if (tag) url.searchParams.set("tag", tag);
        else url.searchParams.delete("tag");
        url.hash = "";
        history.pushState(null, "", url.pathname + url.search + url.hash);
      }

      if (options.scroll) {
        currentTag.closest(".tag-filter-status").scrollIntoView({
          behavior: reduceMotion() ? "auto" : "smooth",
          block: "start"
        });
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        applyTag(button.dataset.tag, { updateHistory: true, scroll: true });
      });
    });
    reset.addEventListener("click", function () {
      applyTag("", { updateHistory: true, scroll: true });
    });
    queryInput.addEventListener("input", updateDirectory);
    window.addEventListener("popstate", function () {
      applyTag(selectedTagFromLocation());
    });

    updateDirectory();
    applyTag(selectedTagFromLocation());
  });
})();
