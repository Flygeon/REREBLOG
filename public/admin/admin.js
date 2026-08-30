(() => {
  const COMMENT_RENDER_ASSETS = {
    assetBase: "https://cdn.jsdelivr.net/npm",
    marked: "/marked@12.0.2/marked.min.js",
    dompurify: "/dompurify@3.1.6/dist/purify.min.js",
    katexCss: "/katex@0.16.10/dist/katex.min.css",
    katex: "/katex@0.16.10/dist/katex.min.js",
    katexAutoRender: "/katex@0.16.10/dist/contrib/auto-render.min.js",
  };
  const COMMENT_LINK_REL = "nofollow noopener noreferrer";
  const statuses = ["pending", "approved", "spam", "deleted"];
  const reportStatuses = ["open", "resolved", "ignored", "all"];
  const storageKey = "yuucomments-admin-token";
  const languageStorageKey = "yuucomments-admin-language";
  const I18N = {
    en: {
      adminTitle: "Comment management", save: "Save", search: "Search",
      searchPlaceholder: "Nickname, content, or page path", comments: "Comments",
      reports: "Reports", bans: "Bans", all: "All", pending: "Pending",
      approved: "Approved", spam: "Spam", deleted: "Deleted", open: "Open",
      resolved: "Resolved", ignored: "Ignored", moderationAction: "Moderation action",
      spamBanTitle: "Mark spam & ban source",
      spamBanDescription: "This will mark the comment as spam and block the selected source from submitting new comments.",
      banTarget: "Ban target", deviceFingerprint: "Device fingerprint",
      deviceDescription: "Recommended. Best for blocking the same browser/device.",
      ipHash: "IP hash", ipDescription: "May affect users on the same network.",
      both: "Both", bothDescription: "Strongest option for obvious spam/bot abuse.",
      banReason: "Ban reason", customReason: "Custom reason", cancel: "Cancel",
      markSpamBan: "Mark spam & ban", createdAt: "Created at", email: "Email",
      likes: "Likes", device: "Device", delete: "Delete", noToken: "Please enter ADMIN_TOKEN.",
      noComments: "No matching comments.", noReports: "No matching reports.",
      noBans: "No matching bans.", loading: "Loading...", loadingBans: "Loading bans...",
      resolve: "Resolve", ignore: "Ignore", deleteComment: "Delete comment",
      reporterEmail: "Reporter email", reportedAt: "Reported at", status: "Status",
      reportedComment: "Reported comment", author: "Author", page: "Page",
      commentStatus: "Comment status", missingReportedComment: "Reported comment no longer exists.",
      reason: "Reason", expiresAt: "Expires at", sourceCommentId: "Source comment ID",
      sourceAuthor: "Source author", permanent: "Permanent", active: "Active",
      expired: "Expired", unavailable: "Unavailable", unban: "Unban",
      unbanConfirm: "Unban this source?", unbanned: "Source unbanned.",
      spamBanSuccess: "Comment marked as spam and source banned.",
      spamBanSkipped: "Comment was marked as spam, but some bans were skipped:",
      deleteConfirm: "Permanently delete this comment? This cannot be undone.",
      deleteReportedConfirm: "Permanently delete this reported comment?",
      reportReasonSpam: "Spam", reportReasonAbuse: "Abuse",
      reportReasonHarassment: "Harassment", reportReasonPrivacy: "Privacy violation",
      reportReasonIllegal: "Illegal content", reportReasonOther: "Other",
      reasonSpam: "Spam", reasonAds: "Ads", reasonBot: "Bot", reasonAbuse: "Abuse",
      reasonOffensive: "Offensive", reasonOther: "Other", reportsLoadFailed: "Reports failed to load.",
      reportStatusFailed: "Report status update failed.", commentDeleteFailed: "Comment deletion failed.",
      reportedCommentDeleted: "Reported comment deleted.", commentDeleted: "Comment permanently deleted.",
      unbanFailed: "Unban failed.", commentsLoadFailed: "Comments failed to load.",
      bansLoadFailed: "Bans failed to load.", statusUpdateFailed: "Status update failed.",
      spamBanFailed: "Spam & ban failed.",
    },
    "zh-CN": {
      adminTitle: "评论管理", save: "保存", search: "搜索", searchPlaceholder: "昵称、内容或页面路径",
      comments: "评论", reports: "举报", bans: "封禁来源", all: "全部", pending: "待审核",
      approved: "已通过", spam: "垃圾", deleted: "已删除", open: "未处理",
      resolved: "已处理", ignored: "已忽略", moderationAction: "审核操作",
      spamBanTitle: "标记垃圾并封禁来源",
      spamBanDescription: "此操作会将评论标记为垃圾，并阻止选中的来源再次提交评论。",
      banTarget: "封禁目标", deviceFingerprint: "设备指纹",
      deviceDescription: "推荐。适合封禁相同浏览器或设备。", ipHash: "IP 哈希",
      ipDescription: "可能影响同一网络中的其他用户。", both: "同时封禁",
      bothDescription: "适合明显的垃圾评论或机器人滥用。", banReason: "封禁原因",
      customReason: "自定义原因", cancel: "取消", markSpamBan: "标记垃圾并封禁",
      createdAt: "创建时间", email: "邮箱", likes: "点赞", device: "设备", delete: "删除",
      noToken: "请先输入 ADMIN_TOKEN。", noComments: "没有匹配的评论。",
      noReports: "没有匹配的举报。", noBans: "没有匹配的封禁来源。",
      loading: "正在加载...", loadingBans: "正在加载封禁来源...", resolve: "标记已处理",
      ignore: "忽略", deleteComment: "删除评论", reporterEmail: "举报者邮箱",
      reportedAt: "举报时间", status: "状态", reportedComment: "被举报评论", author: "作者",
      page: "页面", commentStatus: "评论状态", missingReportedComment: "被举报评论已不存在。",
      reason: "原因", expiresAt: "过期时间", sourceCommentId: "来源评论 ID",
      sourceAuthor: "来源作者", permanent: "永久", active: "生效中", expired: "已过期",
      unavailable: "不可用", unban: "解除封禁", unbanConfirm: "是否解除该来源的封禁？",
      unbanned: "已解除来源封禁。", spamBanSuccess: "评论已标记为垃圾并封禁来源。",
      spamBanSkipped: "评论已标记为垃圾，但部分封禁被跳过：",
      deleteConfirm: "确定要永久删除这条评论吗？此操作不可恢复。",
      deleteReportedConfirm: "确定要永久删除这条被举报评论吗？", reportReasonSpam: "垃圾广告",
      reportReasonAbuse: "辱骂攻击", reportReasonHarassment: "骚扰",
      reportReasonPrivacy: "隐私泄露", reportReasonIllegal: "违法内容", reportReasonOther: "其他",
      reasonSpam: "垃圾评论", reasonAds: "广告", reasonBot: "机器人", reasonAbuse: "滥用",
      reasonOffensive: "冒犯内容", reasonOther: "其他", reportsLoadFailed: "举报加载失败。",
      reportStatusFailed: "举报状态更新失败。", commentDeleteFailed: "评论删除失败。",
      reportedCommentDeleted: "被举报评论已删除。", commentDeleted: "评论已永久删除。",
      unbanFailed: "解除封禁失败。", commentsLoadFailed: "评论加载失败。",
      bansLoadFailed: "封禁来源加载失败。", statusUpdateFailed: "状态更新失败。",
      spamBanFailed: "标记垃圾并封禁失败。",
    },
  };
  const apiBase = document.body.dataset.apiBase || "";
  const tokenForm = document.querySelector("[data-token-form]");
  const tokenInput = tokenForm.elements.token;
  const searchInput = document.querySelector("[data-search]");
  const filters = document.querySelector("[data-filters]");
  const feedback = document.querySelector("[data-feedback]");
  const viewTabs = document.querySelector("[data-view-tabs]");
  const commentsRoot = document.querySelector("[data-comments]");
  const reportsRoot = document.querySelector("[data-reports]");
  const bansRoot = document.querySelector("[data-bans]");
  const spamBanDialog = document.querySelector("[data-spam-ban-dialog]");
  const spamBanForm = document.querySelector("[data-spam-ban-form]");
  const spamBanFeedback = document.querySelector("[data-spam-ban-feedback]");
  const customReasonField = document.querySelector("[data-custom-reason]");
  const languageToggle = document.querySelector("[data-language-toggle]");
  let comments = [];
  let reports = [];
  let bans = [];
  let spamBanCommentId = null;
  let activeView = "comments";
  let activeStatus = "";
  let activeReportStatus = "open";
  let activeLanguage =
    localStorage.getItem(languageStorageKey) === "zh-CN" ? "zh-CN" : "en";

  function t(key) {
    return I18N[activeLanguage][key] || I18N.en[key] || key;
  }

  function statusLabel(status) {
    return t(status);
  }

  function reportReasonLabel(reason) {
    const key = `reportReason${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
    return t(key);
  }

  function banReasonLabel(reason) {
    const presetKeys = {
      Spam: "reasonSpam",
      Ads: "reasonAds",
      Bot: "reasonBot",
      Abuse: "reasonAbuse",
      Offensive: "reasonOffensive",
      Other: "reasonOther",
    };
    return presetKeys[reason] ? t(presetKeys[reason]) : reason;
  }

  function applyLanguage() {
    document.documentElement.lang = activeLanguage;
    document.title = `YuuComments - ${t("adminTitle")}`;
    languageToggle.textContent = activeLanguage === "en" ? "中文" : "English";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    renderViewTabs();
    renderFilters();
    if (activeView === "comments") renderComments();
    if (activeView === "reports") renderReports();
    if (activeView === "bans") renderBans();
  }

  function formatLocalTime(value) {
    const date = parseDatabaseTime(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(activeLanguage);
  }

  function parseDatabaseTime(value) {
    if (typeof value !== "string") return new Date(value);
    const normalized =
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
        ? `${value.replace(" ", "T")}Z`
        : value;
    return new Date(normalized);
  }

  function getToken() {
    return tokenInput.value.trim() || localStorage.getItem(storageKey) || "";
  }

  function showMessage(message) {
    feedback.textContent = message;
  }

  function shortHash(value) {
    return value ? `${value.slice(0, 12)}...` : t("unavailable");
  }

  function readBoolean(value, fallback) {
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
  }

  function resolveCommentRenderConfig() {
    const globalConfig = window.YuuCommentsAdminConfig || window.YuuCommentsConfig || {};
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
      markdown: readBoolean(document.body.dataset.markdown, globalConfig.markdown !== false),
      math: readBoolean(document.body.dataset.math, globalConfig.math !== false),
      assets: {
        marked: assetUrl("marked"),
        dompurify: assetUrl("dompurify"),
        katexCss: assetUrl("katexCss"),
        katex: assetUrl("katex"),
        katexAutoRender: assetUrl("katexAutoRender"),
      },
    };
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

  async function prepareCommentRendering() {
    const config = resolveCommentRenderConfig();
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
      console.warn("YuuComments admin renderer dependencies failed to load.", error);
    }
  }

  function escapeUserHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  }

  function sanitizeContentHtml(html) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
      FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    });
  }

  function hardenContentLinks(container) {
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

  function renderContentMath(container) {
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

  function renderAdminContent(container, content) {
    const config = resolveCommentRenderConfig();
    container.classList.add("ya-content");

    if (!config.markdown && !config.math) {
      container.textContent = content;
      return;
    }

    if (config.markdown && window.marked && window.DOMPurify) {
      container.classList.add("ya-markdown");
      try {
        const html = window.marked.parse(escapeUserHtml(content), {
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false,
        });
        container.innerHTML = sanitizeContentHtml(html);
        hardenContentLinks(container);
        if (config.math) renderContentMath(container);
      } catch (error) {
        console.warn("YuuComments admin failed to render content.", error);
        container.textContent = content;
      }
      return;
    }

    container.textContent = content;
    if (config.math && window.renderMathInElement) {
      container.classList.add("ya-markdown");
      renderContentMath(container);
    }
  }

  function renderViewTabs() {
    viewTabs.replaceChildren();
    [
      { label: t("comments"), value: "comments" },
      { label: t("reports"), value: "reports" },
      { label: t("bans"), value: "bans" },
    ].forEach(({ label, value }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = activeView === value ? "is-active" : "";
      button.textContent = label;
      button.addEventListener("click", () => {
        activeView = value;
        commentsRoot.hidden = activeView !== "comments";
        reportsRoot.hidden = activeView !== "reports";
        bansRoot.hidden = activeView !== "bans";
        renderViewTabs();
        renderFilters();
        if (activeView === "comments") {
          renderComments();
        } else if (activeView === "reports") {
          void loadReports();
        } else {
          void loadBans();
        }
      });
      viewTabs.append(button);
    });
  }

  function renderFilters() {
    if (activeView === "reports") {
      renderReportFilters();
      return;
    }
    if (activeView === "bans") {
      filters.replaceChildren();
      return;
    }

    const counts = comments.reduce(
      (acc, comment) => {
        acc.all += 1;
        acc[comment.status] += 1;
        return acc;
      },
      { all: 0, pending: 0, approved: 0, spam: 0, deleted: 0 },
    );
    filters.replaceChildren();
    [{ label: t("all"), value: "" }, ...statuses.map((value) => ({ label: statusLabel(value), value }))].forEach(
      ({ label, value }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = activeStatus === value ? "is-active" : "";
        button.textContent = `${label} ${value ? counts[value] : counts.all}`;
        button.addEventListener("click", () => {
          activeStatus = value;
          renderFilters();
          renderComments();
        });
        filters.append(button);
      },
    );
  }

  function renderReportFilters() {
    filters.replaceChildren();
    reportStatuses.forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = activeReportStatus === status ? "is-active" : "";
      button.textContent = statusLabel(status);
      button.addEventListener("click", () => {
        activeReportStatus = status;
        renderReportFilters();
        void loadReports();
      });
      filters.append(button);
    });
  }

  function visibleComments() {
    const query = searchInput.value.trim().toLowerCase();
    return comments.filter((comment) => {
      const matchesStatus = !activeStatus || comment.status === activeStatus;
      const matchesQuery =
        !query ||
        [comment.nickname, comment.content, comment.pagePath]
          .join("\n")
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }

  function visibleReports() {
    const query = searchInput.value.trim().toLowerCase();
    return reports.filter((report) => {
      const comment = report.comment;
      return (
        !query ||
        [
          report.reporterEmail,
          report.reason,
          report.message,
          report.status,
          comment?.nickname,
          comment?.content,
          comment?.pagePath,
          comment?.status,
        ]
          .join("\n")
          .toLowerCase()
          .includes(query)
      );
    });
  }

  function renderComments() {
    const visible = visibleComments();
    commentsRoot.replaceChildren();
    if (!getToken()) {
      commentsRoot.innerHTML = `<div class="ya-empty">${t("noToken")}</div>`;
      return;
    }
    if (!visible.length) {
      commentsRoot.innerHTML = `<div class="ya-empty">${t("noComments")}</div>`;
      return;
    }

    visible.forEach((comment) => {
      const article = document.createElement("article");
      article.className = "ya-card";
      article.innerHTML = `
        <header>
          <div>
            <h2>${escapeHtml(comment.nickname)}</h2>
            <p>${escapeHtml(comment.pagePath)}</p>
          </div>
          <span class="status status-${comment.status}">${statusLabel(comment.status)}</span>
        </header>
        <div class="ya-content" data-comment-content></div>
        <dl>
          <div><dt>${t("createdAt")}</dt><dd>${escapeHtml(formatLocalTime(comment.createdAt))}</dd></div>
          <div><dt>${t("email")}</dt><dd>${escapeHtml(comment.email || "")}</dd></div>
          <div><dt>${t("likes")}</dt><dd>${escapeHtml(normalizeLikeCount(comment.likeCount))}</dd></div>
          <div><dt>${t("ipHash")}</dt><dd>${escapeHtml(shortHash(comment.ipHash))}</dd></div>
          <div><dt>${t("device")}</dt><dd>${escapeHtml(shortHash(comment.deviceFingerprint))}</dd></div>
        </dl>
        <footer></footer>
      `;
      renderAdminContent(article.querySelector("[data-comment-content]"), comment.content);
      const footer = article.querySelector("footer");
      statuses
        .filter((status) => status !== "deleted")
        .forEach((status) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = statusLabel(status);
          button.disabled = comment.status === status;
          button.addEventListener("click", () => updateStatus(comment.id, status));
          footer.append(button);
        });
      const spamBanButton = document.createElement("button");
      spamBanButton.type = "button";
      spamBanButton.className = "is-danger";
      spamBanButton.textContent = t("markSpamBan");
      spamBanButton.addEventListener("click", () => spamAndBanComment(comment.id));
      footer.append(spamBanButton);
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "is-danger";
      deleteButton.textContent = t("delete");
      deleteButton.addEventListener("click", () => deleteComment(comment.id));
      footer.append(deleteButton);
      commentsRoot.append(article);
    });
  }

  function renderReports() {
    const visible = visibleReports();
    reportsRoot.replaceChildren();
    if (!getToken()) {
      reportsRoot.innerHTML = `<div class="ya-empty">${t("noToken")}</div>`;
      return;
    }
    if (!visible.length) {
      reportsRoot.innerHTML = `<div class="ya-empty">${t("noReports")}</div>`;
      return;
    }

    visible.forEach((report) => {
      const comment = report.comment;
      const article = document.createElement("article");
      article.className = "ya-card ya-report-card";
      article.innerHTML = `
        <header>
          <div>
            <h2>${escapeHtml(report.reporterEmail)}</h2>
            <p>${escapeHtml(reportReasonLabel(report.reason))}</p>
          </div>
          <span class="status status-report-${report.status}">${escapeHtml(statusLabel(report.status))}</span>
        </header>
        <dl>
          <div><dt>${t("reporterEmail")}</dt><dd class="ya-email">${escapeHtml(report.reporterEmail)}</dd></div>
          <div><dt>${t("reportedAt")}</dt><dd>${escapeHtml(formatLocalTime(report.createdAt))}</dd></div>
          <div><dt>${t("status")}</dt><dd>${escapeHtml(statusLabel(report.status))}</dd></div>
        </dl>
        ${
          report.message
            ? `<div class="ya-content" data-report-message></div>`
            : ""
        }
        ${
          comment
            ? `<section class="ya-report-comment">
                <h3>${t("reportedComment")}</h3>
                <div class="ya-content" data-reported-comment-content></div>
                <dl>
                  <div><dt>${t("author")}</dt><dd>${escapeHtml(comment.nickname || "")}</dd></div>
                  <div><dt>${t("page")}</dt><dd>${escapeHtml(comment.pagePath || "")}</dd></div>
                  <div><dt>${t("commentStatus")}</dt><dd>${escapeHtml(statusLabel(comment.status || ""))}</dd></div>
                </dl>
              </section>`
            : `<section class="ya-report-comment"><p class="ya-empty">${t("missingReportedComment")}</p></section>`
        }
        <footer></footer>
      `;
      const reportMessage = article.querySelector("[data-report-message]");
      if (reportMessage) renderAdminContent(reportMessage, report.message);
      const reportedContent = article.querySelector("[data-reported-comment-content]");
      if (reportedContent) renderAdminContent(reportedContent, comment.content || "");
      const footer = article.querySelector("footer");
      const resolveButton = document.createElement("button");
      resolveButton.type = "button";
      resolveButton.textContent = t("resolve");
      resolveButton.disabled = report.status === "resolved";
      resolveButton.addEventListener("click", () =>
        updateReportStatus(report.id, "resolved"),
      );
      footer.append(resolveButton);

      const ignoreButton = document.createElement("button");
      ignoreButton.type = "button";
      ignoreButton.textContent = t("ignore");
      ignoreButton.disabled = report.status === "ignored";
      ignoreButton.addEventListener("click", () =>
        updateReportStatus(report.id, "ignored"),
      );
      footer.append(ignoreButton);

      if (comment?.id) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "is-danger";
        deleteButton.textContent = t("deleteComment");
        deleteButton.addEventListener("click", () =>
          deleteReportedComment(comment.id),
        );
        footer.append(deleteButton);
      }
      reportsRoot.append(article);
    });
  }

  function renderBans() {
    const visible = visibleBans();
    bansRoot.replaceChildren();
    if (!getToken()) {
      bansRoot.innerHTML = `<div class="ya-empty">${t("noToken")}</div>`;
      return;
    }
    if (!visible.length) {
      bansRoot.innerHTML = `<div class="ya-empty">${t("noBans")}</div>`;
      return;
    }

    visible.forEach((ban) => {
      const expired = ban.expiresAt
        ? parseDatabaseTime(ban.expiresAt).getTime() <= Date.now()
        : false;
      const article = document.createElement("article");
      article.className = "ya-card";
      article.innerHTML = `
        <header>
          <div>
            <h2>${ban.type === "both" ? t("both") : ban.type === "ip" ? t("ipHash") : t("deviceFingerprint")}</h2>
            ${ban.ipValueHash ? `<p>${t("ipHash")}: ${escapeHtml(shortHash(ban.ipValueHash))}</p>` : ""}
            ${ban.deviceValueHash ? `<p>${t("device")}: ${escapeHtml(shortHash(ban.deviceValueHash))}</p>` : ""}
          </div>
          <div>
            ${ban.type === "both" ? `<span class="status status-ban-ip">IP</span><span class="status status-ban-device">${t("device")}</span>` : `<span class="status status-ban-${ban.type}">${ban.type === "ip" ? "IP" : t("device")}</span>`}
            <span class="status status-ban-${expired ? "expired" : "active"}">${expired ? t("expired") : t("active")}</span>
          </div>
        </header>
        <dl>
          <div><dt>${t("reason")}</dt><dd>${escapeHtml(banReasonLabel(ban.reason || ""))}</dd></div>
          <div><dt>${t("createdAt")}</dt><dd>${escapeHtml(formatLocalTime(ban.createdAt))}</dd></div>
          <div><dt>${t("expiresAt")}</dt><dd>${ban.expiresAt ? escapeHtml(formatLocalTime(ban.expiresAt)) : t("permanent")}</dd></div>
          <div><dt>${t("sourceCommentId")}</dt><dd>${escapeHtml(ban.sourceCommentId || t("unavailable"))}</dd></div>
          <div><dt>${t("sourceAuthor")}</dt><dd>${escapeHtml(ban.sourceCommentAuthor || t("unavailable"))}</dd></div>
        </dl>
        ${
          ban.sourceCommentContentPreview
            ? `<div class="ya-content">${escapeHtml(ban.sourceCommentContentPreview)}</div>`
            : ""
        }
        <footer></footer>
      `;
      const unbanButton = document.createElement("button");
      unbanButton.type = "button";
      unbanButton.className = "is-danger";
      unbanButton.textContent = t("unban");
      unbanButton.addEventListener("click", () => unbanSource(ban.ids));
      article.querySelector("footer").append(unbanButton);
      bansRoot.append(article);
    });
  }

  async function loadComments() {
    const token = getToken();
    if (!token) {
      comments = [];
      renderFilters();
      renderComments();
      return;
    }
    showMessage(t("loading"));
    try {
      const response = await fetch(`${apiBase}/api/admin/comments`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.comments)) {
        throw new Error(data.message || t("commentsLoadFailed"));
      }
      comments = data.comments;
      await prepareCommentRendering();
      showMessage("");
      renderFilters();
      renderComments();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t("commentsLoadFailed"));
    }
  }

  async function loadReports() {
    const token = getToken();
    if (!token) {
      reports = [];
      renderFilters();
      renderReports();
      return;
    }
    showMessage(t("loading"));
    try {
      const response = await fetch(
        `${apiBase}/api/admin/reports?status=${encodeURIComponent(activeReportStatus)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.reports)) {
        throw new Error(data.message || t("reportsLoadFailed"));
      }
      reports = data.reports;
      await prepareCommentRendering();
      showMessage("");
      renderFilters();
      renderReports();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : t("reportsLoadFailed"),
      );
    }
  }

  async function loadBans() {
    const token = getToken();
    if (!token) {
      bans = [];
      renderFilters();
      renderBans();
      return;
    }
    showMessage(t("loadingBans"));
    try {
      const response = await fetch(`${apiBase}/api/admin/bans`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.bans)) {
        throw new Error(data.message || t("bansLoadFailed"));
      }
      bans = data.bans;
      showMessage("");
      renderFilters();
      renderBans();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t("bansLoadFailed"));
    }
  }

  async function updateStatus(id, status) {
    const token = getToken();
    try {
      const response = await fetch(
        `${apiBase}/api/admin/comments/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t("statusUpdateFailed"));
      }
      comments = comments.map((comment) =>
        comment.id === id ? { ...comment, status } : comment,
      );
      renderFilters();
      renderComments();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t("statusUpdateFailed"));
    }
  }

  function spamAndBanComment(id) {
    spamBanCommentId = id;
    spamBanForm.reset();
    spamBanFeedback.textContent = "";
    customReasonField.hidden = true;
    spamBanDialog.showModal();
  }

  async function submitSpamAndBan() {
    if (!spamBanCommentId) return;

    const formData = new FormData(spamBanForm);
    const target = String(formData.get("banTarget") || "device");
    const selectedReason = String(formData.get("banReason") || "Spam");
    const customReason = String(formData.get("customReason") || "").trim();
    const reason =
      selectedReason === "Other" ? customReason || "Other" : selectedReason;
    const submitButton = spamBanForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    spamBanFeedback.textContent = "";

    try {
      const response = await fetch(
        `${apiBase}/api/admin/comments/${encodeURIComponent(spamBanCommentId)}/spam-ban`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            banIp: target === "ip" || target === "both",
            banDevice: target === "device" || target === "both",
            reason,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t("spamBanFailed"));
      }

      comments = comments.map((comment) =>
        comment.id === spamBanCommentId ? { ...comment, status: "spam" } : comment,
      );
      const skipped = Array.isArray(data.skipped) ? data.skipped : [];
      showMessage(
        skipped.length > 0
          ? `${t("spamBanSkipped")} ${skipped.join(", ")}.`
          : t("spamBanSuccess"),
      );
      spamBanDialog.close();
      spamBanCommentId = null;
      renderFilters();
      renderComments();
    } catch (error) {
      spamBanFeedback.textContent =
        error instanceof Error ? error.message : t("spamBanFailed");
    } finally {
      submitButton.disabled = false;
    }
  }

  function groupBans() {
    const groups = new Map();
    bans.forEach((ban) => {
      const key = ban.sourceCommentId
        ? ["source", ban.sourceCommentId, ban.reason || "", ban.expiresAt || ""].join("|")
        : [
            "orphan",
            ban.reason || "",
            ban.createdAt,
            ban.expiresAt || "",
            ban.sourceCommentAuthor || "",
            ban.sourceCommentContentPreview || "",
          ].join("|");
      const group = groups.get(key) || {
        ...ban,
        ids: [],
        ipValueHash: null,
        deviceValueHash: null,
      };
      group.ids.push(ban.id);
      if (ban.type === "ip") group.ipValueHash = ban.valueHash;
      if (ban.type === "device") group.deviceValueHash = ban.valueHash;
      group.type =
        group.ipValueHash && group.deviceValueHash
          ? "both"
          : group.ipValueHash
            ? "ip"
            : "device";
      groups.set(key, group);
    });
    return [...groups.values()];
  }

  function visibleBans() {
    const query = searchInput.value.trim().toLowerCase();
    return groupBans().filter((ban) => {
      return (
        !query ||
        [
          ban.type,
          ban.ipValueHash,
          ban.deviceValueHash,
          ban.reason,
          ban.sourceCommentId,
          ban.sourceCommentAuthor,
          ban.sourceCommentContentPreview,
        ]
          .join("\n")
          .toLowerCase()
          .includes(query)
      );
    });
  }

  async function updateReportStatus(id, status) {
    const token = getToken();
    try {
      const response = await fetch(
        `${apiBase}/api/admin/reports/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t("reportStatusFailed"));
      }
      if (activeReportStatus === "all") {
        reports = reports.map((report) =>
          report.id === id ? { ...report, status } : report,
        );
        renderReports();
      } else {
        reports = reports.filter((report) => report.id !== id);
        renderReports();
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : t("reportStatusFailed"),
      );
    }
  }

  async function unbanSource(ids) {
    if (!window.confirm(t("unbanConfirm"))) {
      return;
    }

    try {
      for (const id of ids) {
        const response = await fetch(
          `${apiBase}/api/admin/bans/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t("unbanFailed"));
        }
      }
      const removedIds = new Set(ids);
      bans = bans.filter((ban) => !removedIds.has(ban.id));
      showMessage(t("unbanned"));
      renderBans();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t("unbanFailed"));
      await loadBans();
    }
  }

  async function deleteComment(id) {
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }

    const token = getToken();
    try {
      const response = await fetch(
        `${apiBase}/api/admin/comments/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t("commentDeleteFailed"));
      }
      comments = comments.filter((comment) => comment.id !== id);
      showMessage(t("commentDeleted"));
      renderFilters();
      renderComments();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t("commentDeleteFailed"));
    }
  }

  async function deleteReportedComment(id) {
    if (!window.confirm(t("deleteReportedConfirm"))) {
      return;
    }

    const token = getToken();
    try {
      const response = await fetch(
        `${apiBase}/api/admin/comments/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t("commentDeleteFailed"));
      }
      showMessage(t("reportedCommentDeleted"));
      comments = comments.filter((comment) => comment.id !== id);
      await loadReports();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : t("commentDeleteFailed"),
      );
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeLikeCount(value) {
    const likeCount = Number(value);
    return Number.isFinite(likeCount) && likeCount > 0 ? likeCount : 0;
  }

  tokenInput.value = localStorage.getItem(storageKey) || "";
  tokenForm.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem(storageKey, tokenInput.value.trim());
    if (activeView === "comments") {
      void loadComments();
    } else if (activeView === "reports") {
      void loadReports();
    } else {
      void loadBans();
    }
  });
  searchInput.addEventListener("input", () => {
    if (activeView === "comments") {
      renderComments();
    } else if (activeView === "reports") {
      renderReports();
    } else {
      renderBans();
    }
  });
  languageToggle.addEventListener("click", () => {
    activeLanguage = activeLanguage === "en" ? "zh-CN" : "en";
    localStorage.setItem(languageStorageKey, activeLanguage);
    applyLanguage();
  });
  spamBanForm.addEventListener("change", () => {
    const selectedReason = new FormData(spamBanForm).get("banReason");
    customReasonField.hidden = selectedReason !== "Other";
  });
  spamBanForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitSpamAndBan();
  });
  document.querySelector("[data-spam-ban-cancel]").addEventListener("click", () => {
    spamBanDialog.close();
  });
  document.querySelector("[data-spam-ban-close]").addEventListener("click", () => {
    spamBanDialog.close();
  });
  spamBanDialog.addEventListener("close", () => {
    spamBanCommentId = null;
    spamBanFeedback.textContent = "";
  });
  applyLanguage();
  void loadComments();
})();
