(() => {
  const ROOT_SELECTOR = "#yuucomments, #yuulog-comments";
  const COMMENT_RENDER_ASSETS = {
    assetBase: "https://cdn.jsdelivr.net/npm",
    marked: "/marked@12.0.2/marked.min.js",
    dompurify: "/dompurify@3.1.6/dist/purify.min.js",
    katexCss: "/katex@0.16.10/dist/katex.min.css",
    katex: "/katex@0.16.10/dist/katex.min.js",
    katexAutoRender: "/katex@0.16.10/dist/contrib/auto-render.min.js",
  };
  const COMMENT_LINK_REL = "nofollow noopener noreferrer";
  const I18N = {
    "zh-CN": {
      comments: "评论",
      postComment: "发表评论",
      cancelReply: "取消回复",
      nickname: "昵称",
      email: "邮箱",
      website: "网站",
      content: "评论内容",
      submit: "提交",
      submitting: "提交中...",
      configMissing: "YuuComments 配置缺失：apiBase 或 turnstileSiteKey",
      empty: "还没有评论。",
      reply: "回复",
      loading: "正在加载评论...",
      loadFailed: "评论加载失败。",
      loadFailedError: "评论加载失败",
      like: "赞",
      liked: "已赞",
      likeFailed: "点赞操作失败。",
      missingSiteKey: "缺少 Turnstile site key。",
      verifyFirst: "请先完成人机验证。",
      verifyFailed: "验证组件加载失败。",
      requiredFields: "昵称和评论内容不能为空。",
      invalidWebsite: "网站必须以 http:// 或 https:// 开头。",
      submitFailed: "评论提交失败。",
      submitted: "评论已提交。",
    },
    en: {
      comments: "Comments",
      postComment: "Post a comment",
      cancelReply: "Cancel reply",
      nickname: "Name",
      email: "Email",
      website: "Website",
      content: "Comment",
      submit: "Submit",
      submitting: "Submitting...",
      configMissing: "YuuComments configuration is missing: apiBase or turnstileSiteKey",
      empty: "No comments yet.",
      reply: "Reply",
      loading: "Loading comments...",
      loadFailed: "Failed to load comments.",
      loadFailedError: "Failed to load comments",
      like: "Like",
      liked: "Liked",
      likeFailed: "Failed to update like.",
      missingSiteKey: "Missing Turnstile site key.",
      verifyFirst: "Please complete the verification first.",
      verifyFailed: "Verification widget failed to load.",
      requiredFields: "Name and comment content are required.",
      invalidWebsite: "Website must start with http:// or https://.",
      submitFailed: "Failed to submit comment.",
      bannedSource: "Failed to submit comment: this source has been banned.",
      submitted: "Comment submitted.",
    },
  };
  Object.assign(I18N["zh-CN"], {
    report: "举报",
    reportEmail: "你的邮箱",
    reportReason: "举报原因",
    reportMessage: "补充说明，可选",
    reportSubmit: "提交举报",
    reportCancel: "取消",
    reportSubmitted: "举报已提交。",
    reportAlreadySubmitted: "你已经举报过这条评论。",
    reportFailed: "举报提交失败。",
    reportInvalidEmail: "请输入有效的邮箱地址。",
    reportPrivacyNote: "你的邮箱会显示给站点管理员，用于处理举报。",
    reportMovedToPending: "这条评论已因多次举报被转回待审核状态。",
    reportReasonSpam: "垃圾广告",
    reportReasonAbuse: "辱骂攻击",
    reportReasonHarassment: "骚扰",
    reportReasonPrivacy: "隐私泄露",
    reportReasonIllegal: "违法内容",
    reportReasonOther: "其他",
  });
  Object.assign(I18N.en, {
    report: "Report",
    reportEmail: "Your email",
    reportReason: "Reason",
    reportMessage: "Optional details",
    reportSubmit: "Submit report",
    reportCancel: "Cancel",
    reportSubmitted: "Report submitted.",
    reportAlreadySubmitted: "You have already reported this comment.",
    reportFailed: "Failed to submit report.",
    reportInvalidEmail: "Please enter a valid email address.",
    reportPrivacyNote: "Your email will be visible to the site admin for report handling.",
    reportMovedToPending:
      "This comment has been moved back to pending review after multiple reports.",
    reportReasonSpam: "Spam",
    reportReasonAbuse: "Abuse",
    reportReasonHarassment: "Harassment",
    reportReasonPrivacy: "Privacy violation",
    reportReasonIllegal: "Illegal content",
    reportReasonOther: "Other",
  });
  I18N["zh-CN"].bannedSource = "评论提交失败：该来源已被封禁。";
  const REPORT_REASONS = [
    ["spam", "reportReasonSpam"],
    ["abuse", "reportReasonAbuse"],
    ["harassment", "reportReasonHarassment"],
    ["privacy", "reportReasonPrivacy"],
    ["illegal", "reportReasonIllegal"],
    ["other", "reportReasonOther"],
  ];
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let deviceFingerprintPromise;

  async function getDeviceFingerprint() {
    if (!deviceFingerprintPromise) {
      deviceFingerprintPromise = (async () => {
        if (!window.crypto?.subtle) return null;
        const source = [
          navigator.userAgent,
          navigator.language,
          screen.width,
          screen.height,
          screen.colorDepth,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ].join("|");
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(source),
        );
        return Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
      })().catch(() => null);
    }

    return deviceFingerprintPromise;
  }

  function resolveConfig(root) {
    const globalConfig = window.YuuCommentsConfig ?? {};
    return {
      apiBase: root.dataset.apiBase || globalConfig.apiBase || "",
      siteKey: root.dataset.siteKey || globalConfig.turnstileSiteKey || "",
    };
  }

  function readBoolean(value, fallback) {
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
  }

  function resolveCommentRenderConfig(root) {
    const globalConfig = window.YuuCommentsConfig ?? {};
    const params = new URLSearchParams(window.location.search);
    const assetBase =
      globalConfig.commentRenderAssetBase ||
      globalConfig.assetBase ||
      COMMENT_RENDER_ASSETS.assetBase;
    const assets = globalConfig.commentRenderAssets || {};
    const assetUrl = (key) => {
      const value = assets[key] || COMMENT_RENDER_ASSETS[key];
      return /^https?:\/\//i.test(value) ? value : `${assetBase}${value}`;
    };

    return {
      markdown: readBoolean(
        root.dataset.markdown,
        readBoolean(params.get("markdown"), globalConfig.markdown !== false),
      ),
      math: readBoolean(
        root.dataset.math,
        readBoolean(params.get("math"), globalConfig.math !== false),
      ),
      assets: {
        marked: assetUrl("marked"),
        dompurify: assetUrl("dompurify"),
        katexCss: assetUrl("katexCss"),
        katex: assetUrl("katex"),
        katexAutoRender: assetUrl("katexAutoRender"),
      },
    };
  }

  function resolvePageKey(root) {
    const params = new URLSearchParams(window.location.search);
    return (
      root.dataset.pageKey ||
      params.get("pageKey") ||
      params.get("path") ||
      window.location.pathname
    );
  }

  function resolveTheme(root) {
    const params = new URLSearchParams(window.location.search);
    const theme = root.dataset.theme || params.get("theme") || "";
    return theme === "dark" ? "dark" : "light";
  }

  function resolveLang(root) {
    const params = new URLSearchParams(window.location.search);
    const lang = root.dataset.lang || params.get("lang") || "";
    return lang.toLowerCase().startsWith("en") ? "en" : "zh-CN";
  }

  function applyPresentation(root) {
    root.dataset.theme = resolveTheme(root);
    root.dataset.lang = resolveLang(root);
    root.lang = root.dataset.lang;
  }

  function t(root, key) {
    const lang = resolveLang(root);
    return I18N[lang][key] || I18N["zh-CN"][key] || key;
  }

  function isHttpWebsite(value) {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function safeWebsite(value) {
    return value && isHttpWebsite(value) ? value : null;
  }

  function isValidEmail(value) {
    return EMAIL_PATTERN.test(value);
  }

  function formatLocalTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  function createMarkup(root) {
    root.classList.add("yc-root");
    root.innerHTML = `
      <section class="yc-section" aria-label="${t(root, "comments")}">
        <div class="yc-header">
          <h2>${t(root, "comments")}</h2>
          <span data-yc-count aria-live="polite"></span>
        </div>
        <div class="yc-list" data-yc-list aria-live="polite"></div>
        <form class="yc-form" data-yc-form novalidate>
          <div class="yc-form-heading">
            <h3 data-yc-form-title>${t(root, "postComment")}</h3>
            <button type="button" data-yc-cancel-reply hidden>${t(root, "cancelReply")}</button>
          </div>
          <div class="yc-grid">
            <label>
              <span>${t(root, "nickname")}</span>
              <input name="nickname" type="text" required maxlength="30" />
            </label>
            <label>
              <span>${t(root, "email")}</span>
              <input name="email" type="email" maxlength="160" />
            </label>
            <label>
              <span>${t(root, "website")}</span>
              <input name="website" type="url" placeholder="https://example.com" maxlength="240" />
            </label>
          </div>
          <label>
            <span>${t(root, "content")}</span>
            <textarea name="content" required rows="5" maxlength="1000"></textarea>
          </label>
          <div class="yc-turnstile" data-yc-turnstile hidden></div>
          <div class="yc-footer">
            <p class="yc-feedback" data-yc-feedback aria-live="polite"></p>
            <button type="submit" data-yc-submit>${t(root, "submit")}</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderConfigurationError(root) {
    root.classList.add("yc-root");
    root.innerHTML = `
      <div class="yc-state">
        <p>${t(root, "configMissing")}</p>
      </div>
    `;
  }

  function normalizeCommentLikeState(comment) {
    const likeCount = Number(comment.likeCount);
    comment.likeCount = Number.isFinite(likeCount) && likeCount > 0 ? likeCount : 0;
    comment.liked = comment.liked === true;
  }

  function updateLikeButton(root, button, comment) {
    normalizeCommentLikeState(comment);
    button.classList.toggle("is-liked", comment.liked);
    button.setAttribute("aria-pressed", comment.liked ? "true" : "false");
    button.textContent = comment.liked
      ? `♥ ${t(root, "liked")} ${comment.likeCount}`
      : `♡ ${t(root, "like")} ${comment.likeCount}`;
  }

  function getElements(root) {
    return {
      list: root.querySelector("[data-yc-list]"),
      count: root.querySelector("[data-yc-count]"),
      form: root.querySelector("[data-yc-form]"),
      formTitle: root.querySelector("[data-yc-form-title]"),
      cancelReplyButton: root.querySelector("[data-yc-cancel-reply]"),
      feedback: root.querySelector("[data-yc-feedback]"),
      submitButton: root.querySelector("[data-yc-submit]"),
      turnstileSlot: root.querySelector("[data-yc-turnstile]"),
    };
  }

  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (window.__yuuCommentsTurnstileLoader) {
      return window.__yuuCommentsTurnstileLoader;
    }

    window.__yuuCommentsTurnstileLoader = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[data-yuucomments-turnstile="true"]',
      );
      const script = existingScript ?? document.createElement("script");

      script.addEventListener(
        "load",
        () => {
          if (window.turnstile) {
            resolve(window.turnstile);
          } else {
            reject(new Error("Turnstile API unavailable"));
          }
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error("Turnstile script failed to load")),
        { once: true },
      );

      if (!existingScript) {
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.yuucommentsTurnstile = "true";
        document.head.append(script);
      }
    });

    return window.__yuuCommentsTurnstileLoader;
  }

  function loadScriptOnce(id, src, isReady) {
    if (isReady()) return Promise.resolve();
    const existingScript = document.querySelector(`script[data-yuucomments-lib="${id}"]`);
    const script = existingScript ?? document.createElement("script");

    if (!window.__yuuCommentsScriptLoaders) window.__yuuCommentsScriptLoaders = {};
    if (window.__yuuCommentsScriptLoaders[id]) {
      return window.__yuuCommentsScriptLoaders[id];
    }

    window.__yuuCommentsScriptLoaders[id] = new Promise((resolve, reject) => {
      script.addEventListener(
        "load",
        () => (isReady() ? resolve() : reject(new Error(`${id} unavailable`))),
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error(`${id} failed to load`)),
        { once: true },
      );

      if (!existingScript) {
        script.src = src;
        script.async = true;
        script.defer = true;
        script.dataset.yuucommentsLib = id;
        document.head.append(script);
      }
    });

    return window.__yuuCommentsScriptLoaders[id];
  }

  function loadStyleOnce(id, href) {
    if (document.querySelector(`link[data-yuucomments-lib="${id}"]`)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.yuucommentsLib = id;
    document.head.append(link);
  }

  async function prepareCommentRendering(root) {
    const config = resolveCommentRenderConfig(root);
    if (!config.markdown && !config.math) return;

    try {
      const loaders = [];
      if (config.markdown) {
        loaders.push(
          loadScriptOnce("marked", config.assets.marked, () => Boolean(window.marked)),
          loadScriptOnce("dompurify", config.assets.dompurify, () =>
            Boolean(window.DOMPurify),
          ),
        );
      }
      if (config.math) {
        loadStyleOnce("katex-css", config.assets.katexCss);
        loaders.push(
          loadScriptOnce("katex", config.assets.katex, () => Boolean(window.katex)).then(
            () =>
              loadScriptOnce("katex-auto-render", config.assets.katexAutoRender, () =>
                Boolean(window.renderMathInElement),
              ),
          ),
        );
      }
      await Promise.all(loaders);
    } catch (error) {
      console.warn("YuuComments comment renderer dependencies failed to load.", error);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;");
  }

  function sanitizeCommentHtml(html) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
      FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    });
  }

  function hardenCommentLinks(container) {
    for (const link of container.querySelectorAll("a[href]")) {
      let url;
      try {
        url = new URL(link.getAttribute("href"), window.location.href);
      } catch {
        link.removeAttribute("href");
        continue;
      }
      if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
        link.removeAttribute("href");
        continue;
      }
      link.target = "_blank";
      link.rel = COMMENT_LINK_REL;
    }
  }

  function renderCommentMath(container) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      throwOnError: false,
    });
  }

  function renderCommentContent(root, container, content) {
    const config = resolveCommentRenderConfig(root);
    container.className = "yc-content";

    if (!config.markdown && !config.math) {
      container.textContent = content;
      return;
    }

    if (config.markdown && window.marked && window.DOMPurify) {
      container.classList.add("yc-markdown");
      try {
        const html = window.marked.parse(escapeHtml(content), {
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false,
        });
        container.innerHTML = sanitizeCommentHtml(html);
        hardenCommentLinks(container);
        if (config.math) renderCommentMath(container);
      } catch (error) {
        console.warn("YuuComments failed to render comment content.", error);
        container.textContent = content;
      }
      return;
    }

    container.textContent = content;
    if (config.math && window.renderMathInElement) {
      container.classList.add("yc-markdown");
      renderCommentMath(container);
    }
  }

  function renderState(container, message) {
    container.innerHTML = `<div class="yc-state"><p>${message}</p></div>`;
  }

  function renderComments(root, comments) {
    const { list, count } = getElements(root);
    if (!list) return;

    list.replaceChildren();
    if (count) count.textContent = comments.length ? `${comments.length}` : "";
    if (!comments.length) {
      renderState(list, t(root, "empty"));
      return;
    }

    const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
    const repliesByParentId = new Map();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const replies = repliesByParentId.get(comment.parentId) ?? [];
      replies.push(comment);
      repliesByParentId.set(comment.parentId, replies);
    }

    comments
      .filter((comment) => !comment.parentId)
      .forEach((comment) => {
        const article = createCommentArticle(root, comment, commentsById);
        appendReplies(
          root,
          comment.id,
          article.querySelector(".yc-replies"),
          repliesByParentId,
          commentsById,
        );
        list.append(article);
      });
  }

  function appendReplies(root, parentId, container, repliesByParentId, commentsById) {
    if (!container) return;
    for (const reply of repliesByParentId.get(parentId) ?? []) {
      const article = createCommentArticle(root, reply, commentsById);
      appendReplies(
        root,
        reply.id,
        article.querySelector(".yc-replies"),
        repliesByParentId,
        commentsById,
      );
      container.append(article);
    }
  }

  function colorFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) % 360;
    }
    return `hsl(${h}, 55%, 55%)`;
  }

  function createLetterAvatar(comment) {
    const div = document.createElement("div");
    div.className = "yc-avatar yc-avatar-letter";
    const name = comment.nickname || "?";
    div.textContent = Array.from(name)[0].toUpperCase();
    div.style.background = colorFromString(name);
    div.setAttribute("aria-hidden", "true");
    return div;
  }

  function createAvatar(root, comment) {
    // 优先 SHA256（emailHash），回退 MD5（emailMd5）；都没有则用字母占位
    const hash = comment.emailHash || comment.emailMd5;
    if (!hash) {
      return createLetterAvatar(comment);
    }
    const img = document.createElement("img");
    img.className = "yc-avatar";
    // WeAvatar：HASH 为邮箱的 SHA256 或 MD5；无头像时自动回退 Gravatar/QQ/默认
    img.src = `https://weavatar.com/avatar/${hash}?s=96`;
    img.alt = comment.nickname || "";
    img.width = 44;
    img.height = 44;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      const letter = createLetterAvatar(comment);
      if (letter) img.replaceWith(letter);
    });
    return img;
  }

  function createCommentArticle(root, comment, commentsById) {
    const article = document.createElement("article");
    article.className = "yc-comment";

    const meta = document.createElement("div");
    meta.className = "yc-meta";
    const website = safeWebsite(comment.website);
    const author = website ? document.createElement("a") : document.createElement("span");
    const parent = comment.parentId ? commentsById.get(comment.parentId) : null;
    author.className = "yc-author";
    author.textContent = parent ? `${t(root, "reply")} @${parent.nickname}` : comment.nickname;
    if (website && author instanceof HTMLAnchorElement) {
      author.href = website;
      author.target = "_blank";
      author.rel = "nofollow noopener noreferrer";
    }
    const time = document.createElement("time");
    time.dateTime = comment.createdAt;
    time.textContent = formatLocalTime(comment.createdAt);
    meta.append(author, time);

    const content = document.createElement("div");
    renderCommentContent(root, content, comment.content);

    const actions = document.createElement("div");
    actions.className = "yc-actions";
    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.className = "yc-like-button";
    updateLikeButton(root, likeButton, comment);
    likeButton.addEventListener("click", () => {
      void toggleCommentLike(root, comment, likeButton);
    });
    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.textContent = t(root, "reply");
    replyButton.addEventListener("click", () => {
      setReplyTarget(root, { id: comment.id, nickname: comment.nickname });
    });
    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "yc-report-button";
    reportButton.textContent = t(root, "report");
    reportButton.setAttribute("aria-expanded", "false");
    const reportContainer = document.createElement("div");
    reportContainer.className = "yc-report-container";
    reportButton.addEventListener("click", () => {
      toggleReportForm(root, comment, reportContainer, reportButton);
    });
    actions.append(likeButton, replyButton, reportButton);

    const replies = document.createElement("div");
    replies.className = "yc-replies";

    const body = document.createElement("div");
    body.className = "yc-comment-body";
    body.append(meta, content, actions, reportContainer, replies);

    const avatar = createAvatar(root, comment);
    if (avatar) {
      article.append(avatar, body);
    } else {
      article.append(body);
    }
    return article;
  }

  function toggleReportForm(root, comment, container, button) {
    if (container.firstChild) {
      container.replaceChildren();
      button.setAttribute("aria-expanded", "false");
      return;
    }

    container.append(
      createReportForm(root, comment, () => {
        container.replaceChildren();
        button.setAttribute("aria-expanded", "false");
      }),
    );
    button.setAttribute("aria-expanded", "true");
  }

  function createReportForm(root, comment, onCancel) {
    const form = document.createElement("form");
    form.className = "yc-report-form";
    form.noValidate = true;

    const emailLabel = document.createElement("label");
    const emailText = document.createElement("span");
    emailText.textContent = t(root, "reportEmail");
    const emailInput = document.createElement("input");
    emailInput.name = "email";
    emailInput.type = "email";
    emailInput.required = true;
    emailInput.maxLength = 254;
    emailInput.placeholder = "you@example.com";
    emailLabel.append(emailText, emailInput);

    const privacyNote = document.createElement("p");
    privacyNote.className = "yc-report-note";
    privacyNote.textContent = t(root, "reportPrivacyNote");

    const reasonLabel = document.createElement("label");
    const reasonText = document.createElement("span");
    reasonText.textContent = t(root, "reportReason");
    const reasonSelect = document.createElement("select");
    reasonSelect.name = "reason";
    reasonSelect.required = true;
    for (const [value, labelKey] of REPORT_REASONS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = t(root, labelKey);
      reasonSelect.append(option);
    }
    reasonLabel.append(reasonText, reasonSelect);

    const messageLabel = document.createElement("label");
    const messageText = document.createElement("span");
    messageText.textContent = t(root, "reportMessage");
    const messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.rows = 3;
    messageInput.maxLength = 500;
    messageInput.placeholder = t(root, "reportMessage");
    messageLabel.append(messageText, messageInput);

    const feedback = document.createElement("p");
    feedback.className = "yc-report-feedback";
    feedback.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "yc-report-actions";
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = t(root, "reportSubmit");
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = t(root, "reportCancel");
    cancelButton.addEventListener("click", () => {
      onCancel();
    });
    actions.append(submitButton, cancelButton);

    form.append(emailLabel, privacyNote, reasonLabel, messageLabel, feedback, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitCommentReport(root, comment, {
        emailInput,
        reasonSelect,
        messageInput,
        feedback,
        submitButton,
      });
    });

    return form;
  }

  async function submitCommentReport(root, comment, elements) {
    const email = elements.emailInput.value.trim();
    const reason = elements.reasonSelect.value;
    const message = elements.messageInput.value.trim();

    elements.feedback.textContent = "";
    if (!isValidEmail(email)) {
      elements.feedback.textContent = t(root, "reportInvalidEmail");
      return;
    }

    elements.submitButton.disabled = true;
    try {
      const { apiBase } = resolveConfig(root);
      const response = await fetch(
        `${apiBase}/api/comments/${encodeURIComponent(comment.id)}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email,
            reason,
            message: message || null,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t(root, "reportFailed"));
      }

      if (data.alreadyReported === true) {
        elements.feedback.textContent = t(root, "reportAlreadySubmitted");
        return;
      }

      elements.feedback.textContent =
        data.movedToPending === true
          ? `${t(root, "reportSubmitted")} ${t(root, "reportMovedToPending")}`
          : t(root, "reportSubmitted");
    } catch {
      elements.feedback.textContent = t(root, "reportFailed");
    } finally {
      elements.submitButton.disabled = false;
    }
  }

  async function toggleCommentLike(root, comment, button) {
    const { apiBase } = resolveConfig(root);
    const liked = comment.liked === true;
    button.disabled = true;

    try {
      const response = await fetch(
        `${apiBase}/api/comments/${encodeURIComponent(comment.id)}/like`,
        {
          method: liked ? "DELETE" : "POST",
          headers: { Accept: "application/json" },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t(root, "likeFailed"));
      }

      comment.likeCount = Number(data.likeCount) || 0;
      comment.liked = data.liked === true;
      updateLikeButton(root, button, comment);
    } catch (error) {
      console.warn(t(root, "likeFailed"), error);
    } finally {
      button.disabled = false;
    }
  }

  async function loadComments(root) {
    const { list } = getElements(root);
    if (!list) return;
    const pageKey = resolvePageKey(root);
    const { apiBase } = resolveConfig(root);
    renderState(list, t(root, "loading"));

    try {
      const response = await fetch(
        `${apiBase}/api/comments?path=${encodeURIComponent(pageKey)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.comments)) {
        throw new Error(t(root, "loadFailedError"));
      }
      await prepareCommentRendering(root);
      renderComments(root, data.comments);
    } catch {
      renderState(list, t(root, "loadFailed"));
    }
  }

  function resetTurnstile(root) {
    root.__yuuCommentsTurnstileToken = "";
    if (root.__yuuCommentsTurnstileWidgetId && window.turnstile) {
      window.turnstile.reset(root.__yuuCommentsTurnstileWidgetId);
    }
  }

  async function setupTurnstile(root) {
    const { turnstileSlot, feedback, submitButton } = getElements(root);
    if (!turnstileSlot || !feedback || !submitButton) return;
    const { siteKey } = resolveConfig(root);
    if (!siteKey) {
      feedback.textContent = t(root, "missingSiteKey");
      submitButton.disabled = true;
      return;
    }

    turnstileSlot.hidden = false;
    try {
      const turnstile = await loadTurnstileScript();
      root.__yuuCommentsTurnstileWidgetId = turnstile.render(turnstileSlot, {
        sitekey: siteKey,
        callback: (token) => {
          root.__yuuCommentsTurnstileToken = token;
          if (feedback.textContent === t(root, "verifyFirst")) {
            feedback.textContent = "";
          }
        },
        "expired-callback": () => {
          root.__yuuCommentsTurnstileToken = "";
        },
        "error-callback": () => {
          root.__yuuCommentsTurnstileToken = "";
          feedback.textContent = t(root, "verifyFailed");
        },
      });
    } catch {
      feedback.textContent = t(root, "verifyFailed");
      submitButton.disabled = true;
    }
  }

  function setupForm(root) {
    const { form, feedback, submitButton, cancelReplyButton } = getElements(root);
    if (!form || !feedback || !submitButton) return;

    cancelReplyButton?.addEventListener("click", () => setReplyTarget(root, null));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      feedback.textContent = "";
      const formData = new FormData(form);
      const nickname = String(formData.get("nickname") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const website = String(formData.get("website") ?? "").trim();
      const content = String(formData.get("content") ?? "").trim();

      if (!nickname || !content) {
        feedback.textContent = t(root, "requiredFields");
        return;
      }
      if (!isHttpWebsite(website)) {
        feedback.textContent = t(root, "invalidWebsite");
        return;
      }
      if (!root.__yuuCommentsTurnstileToken) {
        feedback.textContent = t(root, "verifyFirst");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = t(root, "submitting");
      try {
        const { apiBase } = resolveConfig(root);
        const deviceFingerprint = await getDeviceFingerprint();
        const response = await fetch(`${apiBase}/api/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            pagePath: resolvePageKey(root),
            parentId: root.__yuuCommentsReplyTarget?.id ?? null,
            nickname,
            email,
            website,
            content,
            turnstileToken: root.__yuuCommentsTurnstileToken,
            deviceFingerprint,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          feedback.textContent =
            response.status === 403
              ? t(root, "bannedSource")
              : data.message || t(root, "submitFailed");
          return;
        }
        feedback.textContent = t(root, "submitted");
        form.elements.content.value = "";
        setReplyTarget(root, null);
        await loadComments(root);
      } catch {
        feedback.textContent = t(root, "submitFailed");
      } finally {
        resetTurnstile(root);
        submitButton.disabled = false;
        submitButton.textContent = t(root, "submit");
      }
    });
  }

  function setReplyTarget(root, target) {
    const { formTitle, cancelReplyButton, form } = getElements(root);
    root.__yuuCommentsReplyTarget = target;
    if (formTitle) {
      formTitle.textContent = target
        ? `${t(root, "reply")} @${target.nickname}`
        : t(root, "postComment");
    }
    if (cancelReplyButton) cancelReplyButton.hidden = !target;
    if (target) form?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root || root.dataset.yuuCommentsReady === "true") return;
    root.dataset.yuuCommentsReady = "true";
    applyPresentation(root);
    const { apiBase, siteKey } = resolveConfig(root);
    if (!apiBase || !siteKey) {
      renderConfigurationError(root);
      return;
    }
    createMarkup(root);
    setupForm(root);
    void setupTurnstile(root);
    void loadComments(root);
  }

  // ---- SPA (Swup) friendly bootstrap ----
  // Expose a manual mount so host pages can re-trigger rendering if needed.
  window.YuuComments = window.YuuComments || {};
  window.YuuComments.mount = init;

  if (typeof window !== "undefined" && !window.__yuuCommentsBootstrapped) {
    window.__yuuCommentsBootstrapped = true;

    // Initial mount on a full page load.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }

    // Re-mount after Swup soft navigations. The freshly swapped container is a
    // brand-new DOM node without the yuuCommentsReady flag, so init() renders it.
    const onPageView = () => {
      init();
    };
    if (window.swup && window.swup.hooks) {
      window.swup.hooks.on("page:view", onPageView);
    } else {
      document.addEventListener("swup:enable", () => {
        if (window.swup && window.swup.hooks) {
          window.swup.hooks.on("page:view", onPageView);
        }
      });
    }
  }
})();
