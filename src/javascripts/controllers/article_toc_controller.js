import { Controller } from "@hotwired/stimulus"

/**
 * 文章详情 TOC：PC 侧栏折叠、移动端 Contents 弹窗、当前文高亮。
 * 用于 FAQ 详情（faq-detail-page）与通用树形文章页（article-toc-page）等；DOM 结构需含 .toc-* / .mobile-* 约定类名。
 */
export default class ArticleTocController extends Controller {
  connect() {
    this._markActive()
    this._expandActiveToc()
    this._expandActiveInSheet()

    this._abortController = new AbortController()
    document.addEventListener("click", (e) => this._onDocumentClick(e), { signal: this._abortController.signal })
  }

  disconnect() {
    this._abortController?.abort()
    document.body.classList.remove("modal-open")
  }

  toggleSheet(event) {
    event.stopPropagation()
    this._setSheetOpen(true)
  }

  toggleTocSubmenu(event) {
    const btn = event.currentTarget
    const id = btn.dataset.toggle
    const submenu = document.getElementById(id)
    const arrow = btn.querySelector(".toc-arrow")

    if (arrow) arrow.classList.toggle("collapsed")
    if (submenu) submenu.classList.toggle("collapsed")
  }

  _onDocumentClick(e) {
    const sheet = this.element.querySelector(".mobile-sheet")
    if (!sheet?.classList.contains("open")) return
    if (!sheet.contains(e.target)) this._setSheetOpen(false)
  }

  openSheet() {
    this._setSheetOpen(true)
  }

  closeSheet() {
    this._setSheetOpen(false)
  }

  _setSheetOpen(open) {
    const overlay = this.element.querySelector(".mobile-overlay")
    const sheet = this.element.querySelector(".mobile-sheet")
    overlay?.classList.toggle("open", open)
    sheet?.classList.toggle("open", open)
    document.body.classList.toggle("modal-open", open)
  }

  toggleSheetCategory(event) {
    const header = event.currentTarget
    const item = header.closest(".mobile-accordion-item")
    const content = item?.querySelector(":scope > .mobile-accordion-content")
    const arrow = header.querySelector(".mobile-accordion-arrow")
    if (!content) return
    this._toggleAccordion(content, arrow)
  }

  toggleSheetProduct(event) {
    const header = event.currentTarget
    const item = header.closest(".mobile-accordion-product-item")
    const content = item?.querySelector(".mobile-accordion-product-content")
    const arrow = header.querySelector(".mobile-accordion-product-arrow")
    if (!content) return
    this._toggleAccordion(content, arrow)
  }

  _toggleAccordion(content, arrow) {
    const isOpen = content.classList.contains("open")
    content.classList.toggle("open", !isOpen)
    arrow?.classList.toggle("rotated", !isOpen)
  }

  _markActive() {
    const path = window.location.pathname
    this.element.querySelectorAll(".toc-nested-link, .mobile-accordion-article-item").forEach((a) => {
      if (a.getAttribute("href") === path) {
        a.classList.add("active")
      }
    })
  }

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
