import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Flygeonの小站",
	subtitle: "Flygeonの小站",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // 与 _tokens.scss 的 --md-ref-hue 保持一致（正蓝）
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/banner.webp", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		title: {
			enable: true,
			text: "Flygeonの小站",
		},
		subtitle: {
			enable: true,
			text: "音无结弦之时，悦动天使之心",
			typingEffect: true,
		},
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		LinkPreset.Friends,
		LinkPreset.Bangumi,
		LinkPreset.Music,
		LinkPreset.Memos,
		{
			name: "开往",
			url: "https://www.travellings.cn/go.html",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Flygeon",
	bio: "音无结弦之时，悦动天使之心；\n立于浮华之世，奏响天籁之音。",
	links: [
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://space.bilibili.com/497846789",
		},
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://steamcommunity.com/profiles/76561198990801744",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Flygeon",
		},
	],
};

/**
 * giscus 评论系统（基于 GitHub Discussions）
 * repoId / categoryId 通过 giscus.app 生成，或 GraphQL API 查询。
 * 亮暗主题由 Giscus.vue 跟随站点主题动态切换。
 */
export const giscusConfig = {
	repo: "Flygeon/REBLOG",
	repoId: "R_kgDOUGFS1Q",
	category: "Announcements",
	categoryId: "DIC_kwDOUGFS1c4DET_m",
	lang: "zh-CN",
	/** 站点亮/暗主题对应的 giscus 主题名 */
	themes: { light: "light", dark: "transparent_dark" } as const,
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
