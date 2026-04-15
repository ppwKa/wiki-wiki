/**
 * 通用：max-height + open/rotated + ResizeObserver 手风琴
 * 默认选择器对应 FAQ 聚合页；其他页面通过 data-max-height-accordion-*-selector-value 覆盖
 */
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    triggerSelector: { type: String, default: ".faq-trigger-btn" },
    itemSelector: { type: String, default: ".faq-item" },
    contentSelector: { type: String, default: ".faq-answer-container" },
    iconSelector: { type: String, default: ".faq-trigger-icon" },
  }

  connect() {
    this._abortController = new AbortController()
    this._contentRO = new WeakMap()
    this.element.addEventListener("click", (e) => this._onClick(e), { signal: this._abortController.signal })
  }

  disconnect() {
    this._contentRO = null
    if (this._abortController) this._abortController.abort()
  }

  _onClick(e) {
    const btn = e.target.closest(this.triggerSelectorValue)
    if (!btn) return
    const item = btn.closest(this.itemSelectorValue)
    const content = item?.querySelector(this.contentSelectorValue)
    const icon = item?.querySelector(this.iconSelectorValue)
    if (!content) return

    const isOpen = content.classList.contains("open")

    if (isOpen) {
      content.style.maxHeight = content.scrollHeight + "px"
      content.offsetHeight
      content.style.maxHeight = "0px"
      content.classList.remove("open")
      icon?.classList.remove("rotated")
      this._disconnectObserver(content)
    } else {
      content.style.maxHeight = "0px"
      content.offsetHeight
      content.classList.add("open")
      icon?.classList.add("rotated")
      content.style.maxHeight = content.scrollHeight + "px"
      this._ensureObserver(content)
    }
  }

  _ensureObserver(content) {
    if (this._contentRO.has(content)) return this._contentRO.get(content)

    const ro = new ResizeObserver(() => {
      if (content.classList.contains("open")) {
        content.style.maxHeight = content.scrollHeight + "px"
      }
    })
    ro.observe(content)
    this._contentRO.set(content, ro)
    return ro
  }

  _disconnectObserver(content) {
    const ro = this._contentRO.get(content)
    if (ro) {
      ro.disconnect()
      this._contentRO.delete(content)
    }
  }
}
