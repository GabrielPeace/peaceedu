/* ==========================================================================
   jQuery plugin settings and other scripts
   ========================================================================== */

$(document).ready(function () {
  var pageIsChinese =
    document.documentElement.lang.toLowerCase().indexOf("zh") === 0;

  function localizedText(zh, en) {
    return pageIsChinese ? zh : en;
  }

  // FitVids init
  $("#main").fitVids();

  // Follow menu drop down
  $(".author__urls-wrapper button").on("click", function () {
    var $button = $(this);
    var $urls = $button.closest(".author__urls-wrapper").find(".author__urls");
    var shouldOpen = !$urls.hasClass("is--visible");
    $urls.toggleClass("is--visible", shouldOpen);
    $button
      .toggleClass("open", shouldOpen)
      .attr("aria-expanded", String(shouldOpen));
  });

  var $searchContent = $(".search-content");
  var $initialContent = $(".initial-content");
  var $searchToggle = $(".search__toggle");

  function setSearchVisibility(isVisible) {
    $searchContent
      .toggleClass("is--visible", isVisible)
      .attr("aria-hidden", String(!isVisible))
      .prop("inert", !isVisible);
    $initialContent
      .toggleClass("is--hidden", isVisible)
      .attr("aria-hidden", String(isVisible))
      .prop("inert", isVisible);
    $searchToggle.attr("aria-expanded", String(isVisible));
    if (isVisible) {
      document.dispatchEvent(new CustomEvent("peaceedu:search-open"));
    }
  }

  // Close search screen with Esc key
  $(document).keyup(function (e) {
    if ((e.key === "Escape" || e.keyCode === 27) && $searchContent.hasClass("is--visible")) {
      setSearchVisibility(false);
      $searchToggle.first().trigger("focus");
    }
  });

  // Search toggle
  $searchToggle.on("click", function () {
    var shouldOpen = !$searchContent.hasClass("is--visible");
    setSearchVisibility(shouldOpen);
    if (shouldOpen) {
      setTimeout(function () {
        $searchContent.find("input").first().trigger("focus");
      }, 400);
    }
  });

  $(document).on("click", "[data-open-site-search]", function () {
    setSearchVisibility(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    setTimeout(function () {
      $searchContent.find("input").first().trigger("focus");
    }, 400);
  });

  // Smooth scrolling
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scroll = new SmoothScroll('a[href*="#"]', {
    offset: 20,
    speed: reduceMotion ? 0 : 400,
    speedAsDuration: true,
    durationMax: reduceMotion ? 0 : 500,
  });

  // Gumshoe scroll spy init
  if ($("nav.toc").length > 0) {
    var spy = new Gumshoe("nav.toc a", {
      // Active classes
      navClass: "active", // applied to the nav list item
      contentClass: "active", // applied to the content

      // Nested navigation
      nested: false, // if true, add classes to parents of active link
      nestedClass: "active", // applied to the parent items

      // Offset & reflow
      offset: 20, // how far from the top of the page to activate a content area
      reflow: true, // if true, listen for reflows

      // Event support
      events: true, // if true, emit custom events
    });
  }

  // Auto scroll sticky ToC with content
  const scrollTocToContent = function (event) {
    var target = event.target;
    var scrollOptions = { behavior: "auto", block: "nearest", inline: "start" };

    var tocElement = document.querySelector("aside.sidebar__right.sticky");
    if (!tocElement) return;
    if (window.getComputedStyle(tocElement).position !== "sticky") return;

    if (target.parentElement.classList.contains("toc__menu") && target == target.parentElement.firstElementChild) {
      // Scroll to top instead
      document.querySelector("nav.toc header").scrollIntoView(scrollOptions);
    } else {
      target.scrollIntoView(scrollOptions);
    }
  };

  // Has issues on Firefox, whitelist Chrome for now
  if (!!window.chrome) {
    document.addEventListener("gumshoeActivate", scrollTocToContent);
  }

  // add lightbox class to all image links
  $(
    "a[href$='.jpg'],a[href$='.jpeg'],a[href$='.JPG'],a[href$='.png'],a[href$='.gif'],a[href$='.webp']"
  ).addClass("image-popup");

  // Magnific-Popup options
  $(".image-popup").magnificPopup({
    // disableOn: function() {
    //   if( $(window).width() < 500 ) {
    //     return false;
    //   }
    //   return true;
    // },
    type: "image",
    tLoading: "Loading image #%curr%...",
    gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0, 1], // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      tError: '<a href="%url%">Image #%curr%</a> could not be loaded.',
    },
    removalDelay: 500, // Delay in milliseconds before popup is removed
    // Class that is added to body when popup is open.
    // make it unique to apply your CSS animations just to this exact popup
    mainClass: "mfp-zoom-in",
    callbacks: {
      beforeOpen: function () {
        // just a hack that adds mfp-anim class to markup
        this.st.image.markup = this.st.image.markup.replace(
          "mfp-figure",
          "mfp-figure mfp-with-anim"
        );
      },
    },
    closeOnContentClick: true,
    midClick: true, // allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source.
  });

  // Add anchors for headings
  (function () {
    var pageContentElement = document.querySelector(".page__content");
    if (!pageContentElement) return;

    pageContentElement
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach(function (element) {
        var id = element.getAttribute("id");
        if (id) {
          var anchor = document.createElement("a");
          anchor.className = "header-link";
          anchor.href = "#" + id;
          anchor.innerHTML =
            '<span class="sr-only">' +
            localizedText("本节永久链接", "Permalink to this section") +
            '</span><i class="fas fa-link" aria-hidden="true"></i>';
          anchor.title = localizedText("本节永久链接", "Permalink to this section");
          element.appendChild(anchor);
        }
      });
  })();

  // Add copy button for <pre> blocks
  var copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return false; }
      );
    } else {
      var isRTL = document.documentElement.getAttribute("dir") === "rtl";

      var textarea = document.createElement("textarea");
      textarea.className = "clipboard-helper";
      textarea.style[isRTL ? "right" : "left"] = "-9999px";
      // Move element to the same position vertically
      var yPosition = window.pageYOffset || document.documentElement.scrollTop;
      textarea.style.top = yPosition + "px";

      textarea.setAttribute("readonly", "");
      textarea.value = text;
      document.body.appendChild(textarea);

      var success = true;
      try {
        textarea.select();
        success = document.execCommand("copy");
      } catch (e) {
        success = false;
      }
      textarea.parentNode.removeChild(textarea);
      return Promise.resolve(success);
    }
  };

  var copyButtonEventListener = function (event) {
    var thisButton = event.currentTarget;

    // Locate the <code> element
    var codeBlock = thisButton.nextElementSibling;
    while (codeBlock && codeBlock.tagName.toLowerCase() !== "code") {
      codeBlock = codeBlock.nextElementSibling;
    }
    if (!codeBlock) {
      return false;
    }

    // Skip line numbers if present (i.e. {% highlight lineno %})
    var realCodeBlock = codeBlock.querySelector("td.code, td.rouge-code");
    if (realCodeBlock) {
      codeBlock = realCodeBlock;
    }
    var status = thisButton.querySelector(".clipboard-copy-status");
    copyText(codeBlock.innerText).then(function (result) {
      thisButton.focus();
      if (thisButton.interval !== null) clearTimeout(thisButton.interval);
      thisButton.classList.toggle("copied", result);
      thisButton.classList.toggle("copy-failed", !result);
      status.textContent = result
        ? localizedText("已复制", "Copied")
        : localizedText("复制失败", "Copy failed");
      thisButton.interval = setTimeout(function () {
        thisButton.classList.remove("copied", "copy-failed");
        status.textContent = localizedText("复制代码", "Copy code");
        thisButton.interval = null;
      }, 1800);
    });
    return true;
  };

  if (window.enable_copy_code_button) {
    document
      .querySelectorAll(".page__content pre.highlight > code")
      .forEach(function (element, index, parentList) {
        // Locate the <pre> element
        var container = element.parentElement;
        // Sanity check - don't add an extra button if there's already one
        if (container.firstElementChild.tagName.toLowerCase() !== "code") {
          return;
        }
        var copyButton = document.createElement("button");
        copyButton.title = localizedText("复制到剪贴板", "Copy to clipboard");
        copyButton.setAttribute(
          "aria-label",
          localizedText("复制到剪贴板", "Copy to clipboard")
        );
        copyButton.className = "clipboard-copy-button";
        copyButton.innerHTML =
          '<span class="clipboard-copy-status sr-only" aria-live="polite">' +
          localizedText("复制代码", "Copy code") +
          '</span><i class="far fa-fw fa-copy" aria-hidden="true"></i>' +
          '<i class="fas fa-fw fa-check copied" aria-hidden="true"></i>';
        copyButton.addEventListener("click", copyButtonEventListener);
        container.prepend(copyButton);
      });
  }
});
