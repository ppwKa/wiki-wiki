import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["autoIcon", "lightIcon", "darkIcon", "currentIcon"];

  connect() {
    // 添加系统主题变化监听
    this.systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.systemThemeMediaQuery.addEventListener("change", this.handleSystemThemeChange.bind(this));
    this.#updateTheme(this.theme);

    document.addEventListener("turbo:load", () => {
      this.#updateTheme(this.theme);
    });
  }

  disconnect() {
    // 清理监听器
    this.systemThemeMediaQuery.removeEventListener("change", this.handleSystemThemeChange.bind(this));
  }

  handleSystemThemeChange() {
    if (this.theme == "auto") {
      this.#updateTheme(this.systemDark ? "dark" : "light");
    }
  }

  toggle(event) {
    const { mode } = event.params
    this.theme = mode;
    this.#updateTheme(mode);
  }

  get theme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme == "light" || savedTheme == "dark") {
      return savedTheme;
    }
    return "auto";
  }

  set theme(name) {
    if(name == "light" || name == "dark") {
      localStorage.setItem("theme", name);
    } else {
      localStorage.removeItem("theme");
    }
  }

  get systemDark() {
    return this.systemThemeMediaQuery.matches;
  }

  #updateTheme(name) {
    // 更新主题
    switch (name) {
      case "dark":
        this.element.dataset.theme = "dark";
        this.element.classList.add("dark");
        break;
      case "light":
        this.element.dataset.theme = "light";
        this.element.classList.remove("dark");
        break;
      default:
        const isDarkMode = this.systemDark;
        this.element.dataset.theme = isDarkMode ? "dark" : "light";
        this.element.classList.toggle("dark", isDarkMode);
        break;
    }
    this.#updateIcons(name);
  }

  #updateIcons(mode) {
    // PSC 等页面无顶栏主题切换 UI 时不渲染对应 target，仅更新 html 的 dark class
    if (!this.hasCurrentIconTarget) return

    let icon = null
    switch (mode) {
      case "light":
        if (!this.hasLightIconTarget) return
        icon = this.lightIconTarget
        break
      case "dark":
        if (!this.hasDarkIconTarget) return
        icon = this.darkIconTarget
        break
      case "auto":
      default:
        if (!this.hasAutoIconTarget) return
        icon = this.autoIconTarget
        break
    }
    icon = icon.cloneNode(true)
    icon.setAttribute("data-theme-target", this.currentIconTarget.dataset.themeTarget)
    icon.setAttribute("class", this.currentIconTarget.classList)
    this.currentIconTarget.outerHTML = icon.outerHTML
  }
}
