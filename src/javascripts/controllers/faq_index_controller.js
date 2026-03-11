/**
 * FAQ 聚合页交互控制器
 * 负责产品筛选、FAQ 折叠、移动端弹窗
 * 产品切换由 Turbo Frame 处理（data-turbo-frame="faq-content-frame"）
 * 首屏加载由 turbo-frame src 处理（depth 1/2 时）
 */
import { Controller } from "@hotwired/stimulus"

const MOBILE_BREAKPOINT = 768
const DEFAULT_PLACEHOLDER = "Choose Product Model"
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#F5F5F7"/><rect x="10" y="10" width="80" height="80" fill="white"/></svg>'

export default class extends Controller {
  static values = {
    pagePath: String,
    initCatPath: String,
    initProductPath: String,
  }

  connect() {
    // ── DOM refs ──────────────────────────────────────────────────────────────
    this._filterContainer     = this.element.querySelector(".faq-index-page .filter-container")
    this._filterHeader        = this.element.querySelector(".faq-index-page .filter-trigger-btn")
    this._pcDropdown          = this.element.querySelector(".faq-index-page .pc-dropdown-menu")
    this._pcCategoryList      = this.element.querySelector(".faq-index-page .pc-category-list")
    this._pcProductList       = this.element.querySelector(".faq-index-page .pc-product-list")
    this._selectedNameDisplay = this.element.querySelector(".faq-index-page .filter-trigger-text")
    this._arrowIcon           = this.element.querySelector(".faq-index-page .filter-trigger-arrow")
    this._thumbBox            = this.element.querySelector(".faq-index-page .filter-trigger-icon")
    this._mobileOverlay       = this.element.querySelector(".faq-index-page .mobile-overlay")
    this._mobileSheet         = this.element.querySelector(".faq-index-page .mobile-sheet")
    this._closeSheetBtn       = this.element.querySelector(".faq-index-page .mobile-sheet-close-btn")
    this._mobileAccordion     = this.element.querySelector(".faq-index-page .mobile-sheet-content")

    // ── State ─────────────────────────────────────────────────────────────────
    this._currentCategoryPath = ""
    this._selectedProductPath = ""
    this._hoverCategoryPath   = ""
    this._faqRO = new WeakMap()

    if (!this._filterContainer) return

    // ── Event listeners ───────────────────────────────────────────────────────
    this._abortController = new AbortController()
    const signal = this._abortController.signal

    this._filterHeader?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation()
        if (this._isMobile()) {
          this._openMobileSheet()
        } else {
          this._pcDropdown?.classList.toggle("hidden")
          if (this._arrowIcon) {
            this._arrowIcon.style.transform = this._pcDropdown?.classList.contains("hidden")
              ? "rotate(0deg)"
              : "rotate(180deg)"
          }
          if (!this._pcDropdown?.classList.contains("hidden")) {
            this._hoverCategoryPath = this._currentCategoryPath || this._hoverCategoryPath
            if (this._hoverCategoryPath) this._showProductsForCategory(this._hoverCategoryPath)
          }
        }
      },
      { signal }
    )

    document.addEventListener("click", (e) => this._onDocumentClick(e), { signal })

    this._pcCategoryList?.querySelectorAll(".pc-category-item").forEach((el) => {
      el.addEventListener(
        "mouseenter",
        () => {
          this._hoverCategoryPath = el.dataset.catPath || ""
          this._showProductsForCategory(this._hoverCategoryPath)
          this._highlightSelectedProduct()
        },
        { signal }
      )
    })

    this._closeSheetBtn?.addEventListener("click", () => this._closeMobileSheet(), { signal })
    this._mobileOverlay?.addEventListener("click", () => this._closeMobileSheet(), { signal })

    this._mobileAccordion?.addEventListener(
      "click",
      (e) => {
        const header = e.target.closest(".mobile-accordion-header")
        if (header) this._toggleMobileCategoryContent(header)
      },
      { signal }
    )

    this._faqFrame = this.element.querySelector("turbo-frame#faq-content-frame")
    this._faqFrame?.addEventListener("turbo:frame-render", () => {
      this._syncFromUrl()
      this._showContent()
    }, { signal })
    this._faqFrame?.addEventListener("turbo:frame-load", () => {
      this._syncFromUrl()
      this._showContent()
    }, { signal })

    // FAQ 手风琴：事件委托
    this.element.addEventListener("click", (e) => this._onFaqClick(e), { signal })
    window.addEventListener("popstate", () => this._syncFromUrl(), { signal })

    this._initDefaultSelection()
    this._skeletonTimer = setTimeout(() => this._showContent(), 200)
  }

  closeDropdowns() {
    this._closePcDropdown()
    this._closeMobileSheet()
  }

  _syncFromUrl() {
    const path = window.location.pathname
    let item = this._getProductItemByPath(path)
    if (!item && this.pagePathValue && path === this.pagePathValue && this.initProductPathValue) {
      item = this._getProductItemByPath(this.initProductPathValue) || this._pcProductList?.querySelector(".pc-product-item")
    }
    if (item) {
      this._syncSelectionFromItem(item)
      this._setHeaderDisplay(item.dataset.name, item.dataset.thumb)
      this._showProductsForCategory(this._currentCategoryPath)
      this._highlightSelectedProduct()
    }
  }

  disconnect() {
    clearTimeout(this._skeletonTimer)
    if (this._abortController) this._abortController.abort()
    document.body.classList.remove("modal-open")

    // ✅ 兜底清理 observer（防止极端情况下残留）
    if (this._faqRO) {
      // WeakMap 无法遍历，这里只需要让引用释放即可；通常 controller 销毁后自然回收
      // 如果你担心某些浏览器实现问题，可改用 Map + Set 存 observer 以便遍历断开
      this._faqRO = null
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  _showSkeleton() {
    clearTimeout(this._skeletonTimer)
    const sk = this.element.querySelector(".faq-index-page .faq-skeleton")
    const ct = this.element.querySelector(".faq-index-page .faq-content")
    if (sk) sk.style.display = ""
    if (ct) ct.style.display = "none"
  }

  _showContent() {
    clearTimeout(this._skeletonTimer)
    const sk = this.element.querySelector(".faq-index-page .faq-skeleton")
    const ct = this.element.querySelector(".faq-index-page .faq-content")
    if (sk) sk.style.display = "none"
    if (ct) ct.style.display = ""
  }

  _isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT
  }

  // ── Header Display ────────────────────────────────────────────────────────
  _setHeaderDisplay(name, thumbUrl) {
    if (this._selectedNameDisplay) {
      this._selectedNameDisplay.textContent = name || DEFAULT_PLACEHOLDER
    }
    if (this._thumbBox) {
      const safe = thumbUrl && /^(https?:|\/)/.test(String(thumbUrl).trim())
      this._thumbBox.innerHTML = safe
        ? '<img src="' + String(thumbUrl).trim() + '" alt="" class="h-full w-full object-cover">'
        : PLACEHOLDER_SVG
    }
  }

  // ── Product List ──────────────────────────────────────────────────────────
  _showProductsForCategory(catPath) {
    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      el.style.display = (el.dataset.catPath || "") === catPath ? "" : "none"
    })

    // 类目列表 active 以"当前选中类目"为准（不是 hover）
    this._pcCategoryList?.querySelectorAll(".pc-category-item").forEach((el) => {
      const active = (el.dataset.catPath || "") === this._currentCategoryPath
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })
  }

  _highlightSelectedProduct() {
    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      const active = (el.dataset.path || "") === this._selectedProductPath
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })

    this._mobileAccordion?.querySelectorAll(".mobile-accordion-product").forEach((el) => {
      const active = (el.dataset.path || "") === this._selectedProductPath
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })
  }

  _getThumbForProduct(productPath) {
    const el = [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
      (e) => (e.dataset.path || "") === productPath
    )
    return el?.dataset.thumb || ""
  }

  _getProductItemByPath(path) {
    return [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
      (el) => (el.dataset.path || "") === path
    )
  }

  _syncSelectionFromItem(item) {
    if (!item) return
    this._currentCategoryPath = item.dataset.catPath || ""
    this._selectedProductPath = item.dataset.path || ""
    this._hoverCategoryPath   = this._currentCategoryPath
  }

  // ── Document 全局点击 ─────────────────────────────────────────────────────
  _onDocumentClick(e) {
    // PC 下拉：点击 filter-container 外部时关闭
    if (!this._filterContainer.contains(e.target)) this._closePcDropdown()

    // 移动端弹窗：sheet 打开时点击 sheet 外部关闭
    if (this._mobileSheet?.classList.contains("open") && !this._mobileSheet.contains(e.target)) {
      this._closeMobileSheet()
    }
  }

  // ── PC Dropdown ───────────────────────────────────────────────────────────
  _closePcDropdown() {
    this._pcDropdown?.classList.add("hidden")
    if (this._arrowIcon) this._arrowIcon.style.transform = "rotate(0deg)"
  }

  // ── Mobile Sheet ──────────────────────────────────────────────────────────
  _openMobileCategory(catPath) {
    if (!catPath) return
    const wrapper = [...(this._mobileAccordion?.querySelectorAll(".mobile-accordion-item") || [])].find(
      (el) => (el.dataset.catPath || "") === catPath
    )
    if (!wrapper) return
    const content = wrapper.querySelector(".mobile-accordion-content")
    const icon    = wrapper.querySelector(".mobile-accordion-arrow")
    if (content) content.classList.add("open")
    if (icon) icon.classList.add("rotated")
  }

  _openMobileSheet() {
    this._mobileOverlay?.classList.add("open")
    this._mobileSheet?.classList.add("open")
    document.body.classList.add("modal-open")
    if (this._currentCategoryPath) this._openMobileCategory(this._currentCategoryPath)
    this._highlightSelectedProduct()
  }

  _closeMobileSheet() {
    this._mobileOverlay?.classList.remove("open")
    this._mobileSheet?.classList.remove("open")
    document.body.classList.remove("modal-open")
  }

  _toggleMobileCategoryContent(header) {
    const content = header.nextElementSibling
    const icon    = header.querySelector(".mobile-accordion-arrow")
    if (!content) return
    const isOpen = content.classList.contains("open")
    content.classList.toggle("open", !isOpen)
    icon?.classList.toggle("rotated", !isOpen)
  }

  // ── FAQ Accordion ─────────────────────────────────────────────────────────
  _onFaqClick(e) {
    const btn = e.target.closest(".faq-trigger-btn")
    if (!btn) return
    const item    = btn.closest(".faq-item")
    const content = item?.querySelector(".faq-answer-container")
    const icon    = item?.querySelector(".faq-trigger-icon")
    if (!content) return

    const isOpen = content.classList.contains("open")

    if (isOpen) {
      // 收起：先设定当前高度，再过渡到 0
      content.style.maxHeight = content.scrollHeight + "px"
      content.offsetHeight
      content.style.maxHeight = "0px"
      content.classList.remove("open")
      icon?.classList.remove("rotated")

      // ✅ 收起时断开 observer，避免一直挂着
      this._disconnectFaqObserver(content)
    } else {
      // 展开：先归零再打开
      content.style.maxHeight = "0px"
      content.offsetHeight
      content.classList.add("open")
      icon?.classList.add("rotated")
      content.style.maxHeight = content.scrollHeight + "px"

      // ✅ 展开时确保 observer 存在（用于内容变化时自适应高度）
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

  // ── Initialization ────────────────────────────────────────────────────────
  _initDefaultSelection() {
    let match = null
    const items = [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])]

    // 优先按产品 path 精确匹配（path 唯一，比 title 可靠）
    if (this.initProductPathValue) {
      match = items.find((el) => el.dataset.path === this.initProductPathValue)
    }

    // 有分类 path 但无产品匹配：取该分类下第一个产品
    if (!match && this.initCatPathValue) {
      const catPath = this.initCatPathValue
      match = items.find((el) => {
        const p = el.dataset.path || ""
        return p.startsWith(catPath + "/") || p === catPath
      })
    }

    // 兜底：取第一个产品项
    if (!match) {
      match = this._pcProductList?.querySelector(".pc-product-item")
    }

    // 从匹配项同步 path 状态
    if (match) {
      this._syncSelectionFromItem(match)
    }

    this._showProductsForCategory(this._currentCategoryPath || this._hoverCategoryPath)
    this._highlightSelectedProduct()

    if (match) {
      this._setHeaderDisplay(match.dataset.name, match.dataset.thumb)
    } else {
      this._setHeaderDisplay(DEFAULT_PLACEHOLDER, "")
    }
  }

}
