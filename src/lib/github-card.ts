/**
 * github-card.ts —— GitHub 仓库卡片的客户端填充。
 *
 * 正文里的 `::github{repo="owner/repo"}` 由 markdown.ts 渲染成
 * `.card-github.fetch-waiting[repo]` 骨架；这里在正文挂载后统一拉取
 * api.github.com 填充数据。相比原「内联 <script>」方案，能在 SPA 路由
 * 切换（v-html 注入不执行 script）时同样生效。
 */

interface GithubRepo {
  description?: string | null;
  language?: string | null;
  forks?: number;
  stargazers_count?: number;
  license?: { spdx_id?: string | null } | null;
  owner?: { avatar_url?: string } | null;
}

function compact(n: number | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-us", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

async function fillCard(card: HTMLElement): Promise<void> {
  const repo = card.getAttribute("repo");
  if (!repo) return;

  const set = (selector: string, text: string) => {
    const el = card.querySelector(selector);
    if (el) el.textContent = text;
  };

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as GithubRepo;

    set(
      ".gc-description",
      data.description?.replace(/:[a-zA-Z0-9_]+:/g, "") || "Description not set",
    );
    set(".gc-language", data.language || "—");
    set(".gc-forks", compact(data.forks));
    set(".gc-stars", compact(data.stargazers_count));
    set(".gc-license", data.license?.spdx_id || "no-license");

    const avatar = card.querySelector<HTMLElement>(".gc-avatar");
    if (avatar && data.owner?.avatar_url) {
      avatar.style.backgroundImage = `url(${data.owner.avatar_url})`;
      avatar.style.backgroundColor = "transparent";
    }
    card.classList.remove("fetch-waiting");
  } catch {
    card.classList.add("fetch-error");
  }
}

/**
 * 填充 root 内所有尚未完成的 GitHub 卡片。
 * 已完成的卡片不带 `fetch-waiting`，会自然跳过（幂等，可重复调用）。
 */
export function hydrateGithubCards(
  root: ParentNode | null = typeof document !== "undefined" ? document : null,
): void {
  if (!root) return;
  const cards = root.querySelectorAll<HTMLElement>(
    ".card-github.fetch-waiting[repo]",
  );
  cards.forEach((card) => void fillCard(card));
}
