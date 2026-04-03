/**
 * FAQ 聚合页：在 catalog_index 上增加 Quick Answer 手风琴
 */
import CatalogIndexController from "./catalog_index_controller"

export default class extends CatalogIndexController {
  connect() {
    super.connect()
    this._faqRO = new WeakMap()
    this.element.addEventListener("click", (e) => this._onFaqClick(e), { signal: this._abortController.signal })
  }

  disconnect() {
    this._faqRO = null
    super.disconnect()
  }

  _onFaqClick(e) {
    const btn = e.target.closest(".faq-trigger-btn")
    if (!btn) return
    const item = btn.closest(".faq-item")
    const content = item?.querySelector(".faq-answer-container")
    const icon = item?.querySelector(".faq-trigger-icon")
    if (!content) return

    const isOpen = content.classList.contains("open")

    if (isOpen) {
      content.style.maxHeight = content.scrollHeight + "px"
      content.offsetHeight
      content.style.maxHeight = "0px"
      content.classList.remove("open")
      icon?.classList.remove("rotated")
      this._disconnectFaqObserver(content)
    } else {
      content.style.maxHeight = "0px"
      content.offsetHeight
      content.classList.add("open")
      icon?.classList.add("rotated")
      content.style.maxHeight = content.scrollHeight + "px"
      this._ensureFaqObserver(content)
    }
  }

  _ensureFaqObserver(content) {
    if (this._faqRO.has(content)) return this._faqRO.get(content)

    const ro = new ResizeObserver(() => {
      if (content.classList.contains("open")) {
        content.style.maxHeight = content.scrollHeight + "px"
      }
    })
    ro.observe(content)
    this._faqRO.set(content, ro)
    return ro
  }

  _disconnectFaqObserver(content) {
    const ro = this._faqRO.get(content)
    if (ro) {
      ro.disconnect()
      this._faqRO.delete(content)
    }
  }
}
