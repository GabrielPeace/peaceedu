(function () {
  "use strict";

  var SCRIPT_TIMEOUT_MS = 15000;
  var scriptPromise;

  function loadScript(src) {
    if (window.CozeWebSDK && window.CozeWebSDK.WebChatClient) {
      return Promise.resolve();
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector("script[data-peaceedu-ai-sdk]");
      var script = existing || document.createElement("script");
      var timeout = window.setTimeout(function () {
        reject(new Error("AI SDK loading timed out"));
      }, SCRIPT_TIMEOUT_MS);

      function finish(callback, value) {
        window.clearTimeout(timeout);
        callback(value);
      }

      script.addEventListener("load", function () {
        if (window.CozeWebSDK && window.CozeWebSDK.WebChatClient) {
          finish(resolve);
        } else {
          finish(reject, new Error("AI SDK is unavailable"));
        }
      }, { once: true });
      script.addEventListener("error", function () {
        finish(reject, new Error("AI SDK request failed"));
      }, { once: true });

      if (!existing) {
        script.src = src;
        script.async = true;
        script.setAttribute("data-peaceedu-ai-sdk", "true");
        document.head.appendChild(script);
      }
    }).catch(function (error) {
      scriptPromise = null;
      throw error;
    });

    return scriptPromise;
  }

  function setState(root, state, message) {
    var button = root.querySelector("[data-ai-load]");
    var label = button.querySelector("span");
    var status = root.querySelector("[data-ai-status]");
    var fallback = root.querySelector("[data-ai-fallback]");

    root.dataset.aiState = state;
    status.textContent = message;
    fallback.hidden = state !== "error";
    button.disabled = state === "loading" || state === "ready";
    label.textContent = state === "loading"
      ? "正在连接…"
      : state === "error"
        ? "重新加载"
        : state === "ready"
          ? "助手已加载"
          : "加载 AI 助手";
    if (state === "error") button.disabled = false;
  }

  function initialize(root) {
    var button = root.querySelector("[data-ai-load]");
    if (!button) return;

    button.addEventListener("click", function () {
      var sdkUrl = root.dataset.aiSdkUrl;
      var botId = root.dataset.aiBotId;
      var assistantName = root.dataset.aiName || "Ewaya.ai";

      if (!sdkUrl || !botId) {
        setState(root, "error", "助手配置不完整，请通过邮件反馈。");
        return;
      }

      setState(root, "loading", "正在连接第三方 AI 服务…");
      loadScript(sdkUrl).then(function () {
        if (!root.aiClient) {
          root.aiClient = new window.CozeWebSDK.WebChatClient({
            config: { bot_id: botId },
            componentProps: { title: assistantName }
          });
        }
        setState(root, "ready", "助手已加载，请点击页面右下角的对话图标开始。");
      }).catch(function () {
        setState(root, "error", "暂时无法连接 AI 服务，请检查网络后重试。");
      });
    });
  }

  function ready() {
    document.querySelectorAll("[data-ai-assistant]").forEach(initialize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
