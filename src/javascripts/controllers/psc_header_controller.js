import { Controller } from "@hotwired/stimulus"

/**
 * PSC 顶栏：移动端菜单 checkbox 联动底部导航弹层（结构同 tree_article_toc_sheet）
 */
export default class extends Controller {
  static targets = ["menuToggle", "overlay", "sheet"]

  connect() {
    this._setMenuOpen(this.hasMenuToggleTarget && this.menuToggleTarget.checked)
  }

  disconnect() {
    document.body.classList.remove("modal-open")
  }

  menuToggleChanged(event) {
    this._setMenuOpen(event.currentTarget.checked)
  }

  closeMenu() {
    if (this.hasMenuToggleTarget) this.menuToggleTarget.checked = false
    this._setMenuOpen(false)
  }

  toggleSheetCategory(event) {
    const header = event.currentTarget
    const item = header.closest(".mobile-accordion-item")
    if (item?.classList.contains("mobile-accordion-item--leaf")) return

    const content = item?.querySelector(":scope > .mobile-accordion-content")
    const arrow = header.querySelector(".mobile-accordion-arrow")
    if (!content) return

    const isOpen = content.classList.contains("open")
    content.classList.toggle("open", !isOpen)
    arrow?.classList.toggle("rotated", !isOpen)
  }

  _setMenuOpen(open) {
    if (this.hasOverlayTarget) this.overlayTarget.classList.toggle("open", open)
    if (this.hasSheetTarget) this.sheetTarget.classList.toggle("open", open)
    document.body.classList.toggle("modal-open", open)
  }
}
