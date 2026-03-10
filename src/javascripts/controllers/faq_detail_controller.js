import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this._markActive()
    this._expandActiveToc()
    this._expandActiveInSheet()

    this._abortController = new AbortController()
    document.addEventListener("click", (e) => this._onDocumentClick(e), { signal: this._abortController.signal })
  }

  disconnect() {
    this._abortController?.abort()
  }

  // ── 弹窗展开 ───────────────────────────────────────────────────────
  toggleSheet(event) {
    event.stopPropagation()
    this._setSheetOpen(true)
  }

  // ── TOC 折叠（PC aside 内部） ──────────────────────────────────────────────
  toggleTocSubmenu(event) {
    const btn = event.currentTarget
    const id = btn.dataset.toggle
    const submenu = document.getElementById(id)
    const arrow = btn.querySelector(".toc-arrow")

    if(arrow) arrow.classList.toggle("collapsed")
    if(submenu) submenu.classList.toggle("collapsed")
  }

  // ── Document 全局点击关闭 ──────────────────────────────────────────────────
  _onDocumentClick(e) {
    const sheet = this.element.querySelector(".mobile-sheet")
    if (!sheet?.classList.contains("open")) return
    if (!sheet.contains(e.target)) this._setSheetOpen(false)
  }

  // ── 移动端底部弹窗 ────────────────────────────────────────────────────────
  openSheet() {
    this._setSheetOpen(true)
  }

  closeSheet() {
    this._setSheetOpen(false)
  }

  _setSheetOpen(open) {
    const overlay = this.element.querySelector(".mobile-overlay")
    const sheet   = this.element.querySelector(".mobile-sheet")
    overlay?.classList.toggle("open", open)
    sheet?.classList.toggle("open", open)
    document.body.classList.toggle("modal-open", open)
  }

  // ── 移动端 accordion — 分类层 ─────────────────────────────────────────────
  toggleSheetCategory(event) {
    const header  = event.currentTarget
    const item    = header.closest(".mobile-accordion-item")
    const content = item?.querySelector(":scope > .mobile-accordion-content")
    const arrow   = header.querySelector(".mobile-accordion-arrow")
    if (!content) return
    this._toggleAccordion(content, arrow)
  }

  // ── 移动端 accordion — 产品层 ─────────────────────────────────────────────
  toggleSheetProduct(event) {
    const header  = event.currentTarget
    const item    = header.closest(".mobile-accordion-product-item")
    const content = item?.querySelector(".mobile-accordion-product-content")
    const arrow   = header.querySelector(".mobile-accordion-product-arrow")
    if (!content) return
    this._toggleAccordion(content, arrow)
  }

  // ── Accordion 通用展开/收起 ───────────────────────────────────────────────
  _toggleAccordion(content, arrow) {
    const isOpen = content.classList.contains("open")
    content.classList.toggle("open", !isOpen)
    arrow?.classList.toggle("rotated", !isOpen)
  }

  // ── Active 文章高亮 ───────────────────────────────────────────────────────
  _markActive() {
    const path = window.location.pathname
    this.element.querySelectorAll(".toc-nested-link, .mobile-accordion-article-item").forEach((a) => {
      console.log(a.getAttribute("href"), path)
      if (a.getAttribute("href") === path) {
        a.classList.add("active")
      }
    })
  }

  // PC aside：自动展开含有当前文章的所有祖先 submenu
  _expandActiveToc() {
    this.element.querySelectorAll(".toc-nested-item .active").forEach((activeEl) => {
      let el = activeEl.parentElement
      while (el && el !== this.element) {
        if (el.id && (el.classList.contains("toc-sublist") || el.classList.contains("toc-nested-list"))) {
          el.classList.remove("collapsed")
          const btn = this.element.querySelector(`[data-toggle="${el.id}"]`)
          btn?.querySelector(".toc-arrow")?.classList.remove("collapsed")
        }
        el = el.parentElement
      }
    })
  }

  // 移动端 sheet：自动展开含有当前文章的分类 / 产品
  _expandActiveInSheet() {
    const activeLink = this.element.querySelector(".mobile-accordion-article-item.active")
    if (!activeLink) return

    const productItem = activeLink.closest(".mobile-accordion-product-item")
    if (productItem) {
      productItem.querySelector(".mobile-accordion-product-content")?.classList.add("open")
      productItem.querySelector(".mobile-accordion-product-arrow")?.classList.add("rotated")
    }

    const catItem = activeLink.closest(".mobile-accordion-item")
    if (catItem) {
      catItem.querySelector(".mobile-accordion-content")?.classList.add("open")
      catItem.querySelector(".mobile-accordion-arrow")?.classList.add("rotated")
    }
  }
}
