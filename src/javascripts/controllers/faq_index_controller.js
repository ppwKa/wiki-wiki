/**
 * FAQ 聚合页交互控制器
 * 负责产品筛选、FAQ 折叠、移动端弹窗
 * 初始选中状态由服务端通过 data-faq-index-init-cat-value / data-faq-index-init-product-value 注入
 * 产品切换通过 Turbo frame 导航驱动 main-content-frame 局部刷新并推入 URL 历史
 */
import { Controller } from "@hotwired/stimulus"

const MOBILE_BREAKPOINT = 768
const DEFAULT_PLACEHOLDER = "Choose Product Model"
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#F5F5F7"/><rect x="10" y="10" width="80" height="80" fill="white"/></svg>'

export default class extends Controller {
  static values = {
    initCat: String,
    initProduct: String,
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
    this._faqSkeleton         = this.element.querySelector(".faq-index-page .faq-skeleton")
    this._faqContent          = this.element.querySelector(".faq-index-page .faq-content")

    // ── State ─────────────────────────────────────────────────────────────────
    this._currentCategoryId = this._handleize(this.initCatValue || "")
    this._selectedProductId = this._handleize(this.initProductValue || "")
    this._hoverCategoryId   = this._currentCategoryId
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
            this._hoverCategoryId = this._currentCategoryId || this._hoverCategoryId
            if (this._hoverCategoryId) this._showProductsForCategory(this._hoverCategoryId)
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
          this._hoverCategoryId = this._handleize(el.dataset.cat)
          this._showProductsForCategory(this._hoverCategoryId)
          this._highlightSelectedProduct()
        },
        { signal }
      )
    })

    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      el.addEventListener(
        "click",
        () => {
          this._selectProduct(el.dataset.name, el.dataset.cat, el.dataset.product, el.dataset.thumb, el.dataset.path)
          this._closePcDropdown()
        },
        { signal }
      )
    })

    this._closeSheetBtn?.addEventListener("click", () => this._closeMobileSheet(), { signal })
    this._mobileOverlay?.addEventListener("click", () => this._closeMobileSheet(), { signal })

    this._mobileAccordion?.addEventListener(
      "click",
      (e) => {
        const header  = e.target.closest(".mobile-accordion-header")
        const product = e.target.closest(".mobile-accordion-product")
        if (header) {
          this._toggleMobileCategoryContent(header)
        } else if (product) {
          this._selectProduct(
            product.dataset.name,
            product.dataset.cat,
            product.dataset.product,
            product.dataset.thumb,
            product.dataset.path
          )
          this._closeMobileSheet()
        }
      },
      { signal }
    )

    // FAQ 手风琴：事件委托
    this.element.addEventListener("click", (e) => this._onFaqClick(e), { signal })

    this._initDefaultSelection()

    // 骨架屏揭开：首次加载 & 每次 frame 导航后 connect() 重新触发
    this._skeletonTimer = setTimeout(() => this._showContent(), 200)
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
    if (this._faqSkeleton) this._faqSkeleton.style.display = ""
    if (this._faqContent)  this._faqContent.style.display  = "none"
  }

  _showContent() {
    if (this._faqSkeleton) this._faqSkeleton.style.display = "none"
    if (this._faqContent)  this._faqContent.style.display  = ""
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  _handleize(str) {
    if (!str || typeof str !== "string") return ""
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
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
  _showProductsForCategory(catId) {
    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      el.style.display = this._handleize(el.dataset.cat) === catId ? "" : "none"
    })

    // 类目列表 active 以"当前选中类目"为准（不是 hover）
    this._pcCategoryList?.querySelectorAll(".pc-category-item").forEach((el) => {
      const active = this._handleize(el.dataset.cat) === this._currentCategoryId
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })
  }

  _highlightSelectedProduct() {
    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      const active =
        this._handleize(el.dataset.cat) === this._currentCategoryId &&
        this._handleize(el.dataset.product) === this._selectedProductId
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })

    this._mobileAccordion?.querySelectorAll(".mobile-accordion-product").forEach((el) => {
      const active =
        this._handleize(el.dataset.cat) === this._currentCategoryId &&
        this._handleize(el.dataset.product) === this._selectedProductId
      el.classList.toggle("active", active)
      el.classList.toggle("inactive", !active)
    })
  }

  _getThumbForProduct(cat, product) {
    const el = [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
      (e) => this._handleize(e.dataset.cat) === cat && this._handleize(e.dataset.product) === product
    )
    return el?.dataset.thumb || ""
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  _getCurrentFramePathname() {
    const frame = document.getElementById("main-content-frame")
    if (frame) {
      const src = frame.getAttribute("src")
      if (src) {
        try {
          return new URL(src, window.location.origin).pathname
        } catch (_) {}
      }
    }
    return window.location.pathname
  }

  _navigateToProduct(path) {
    if (!path) return

    // ✅ 防止重复导航 / 历史堆叠
    const targetPathname = (() => {
      try {
        return new URL(path, window.location.origin).pathname
      } catch (_) {
        return path
      }
    })()
    if (targetPathname === this._getCurrentFramePathname()) return

    const a = document.createElement("a")
    a.href = path
    a.setAttribute("data-turbo-frame", "main-content-frame")
    a.setAttribute("data-turbo-action", "advance")
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Product Selection ─────────────────────────────────────────────────────
  _selectProduct(name, cat, product, thumb, path) {
    this._currentCategoryId = this._handleize(cat || "")
    this._selectedProductId = this._handleize(product || "")
    this._hoverCategoryId   = this._currentCategoryId
    const thumbUrl = thumb || this._getThumbForProduct(this._currentCategoryId, this._selectedProductId)

    this._setHeaderDisplay(name, thumbUrl)
    this._highlightSelectedProduct()
    this._showProductsForCategory(this._currentCategoryId)
    this._showSkeleton()

    this._navigateToProduct(path)
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
  _openMobileCategory(catId) {
    if (!catId) return
    const wrapper = [...(this._mobileAccordion?.querySelectorAll(".mobile-accordion-item") || [])].find(
      (el) => this._handleize(el.dataset.cat) === catId
    )
    if (!wrapper) return
    const content = wrapper.querySelector(".mobile-accordion-content")
    const icon    = wrapper.querySelector(".mobile-accordion-arrow")
    if (content) content.classList.add("open")
    if (icon)    icon.classList.add("rotated")
  }

  _openMobileSheet() {
    this._mobileOverlay?.classList.add("open")
    this._mobileSheet?.classList.add("open")
    document.body.classList.add("modal-open")
    if (this._currentCategoryId) this._openMobileCategory(this._currentCategoryId)
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
    content?.classList.toggle("open")
    icon?.classList.toggle("rotated")
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

    // ✅ 修复：初始化匹配也用 handleize（避免大小写/空格导致失配）
    if (this.initCatValue && this.initProductValue) {
      const initCatId  = this._handleize(this.initCatValue)
      const initProdId = this._handleize(this.initProductValue)
      match = items.find(
        (el) => this._handleize(el.dataset.cat) === initCatId && this._handleize(el.dataset.product) === initProdId
      )
    }

    // 有 cat 但无 product（或 product 未匹配）：取该 cat 下第一个 product
    if (!match && this.initCatValue) {
      const initCatId = this._handleize(this.initCatValue)
      match = items.find((el) => this._handleize(el.dataset.cat) === initCatId)
      if (match) {
        this._currentCategoryId = this._handleize(match.dataset.cat)
        this._selectedProductId = this._handleize(match.dataset.product)
        this._hoverCategoryId   = this._currentCategoryId
      }
    }

    // 兜底：取第一个产品项
    if (!match) {
      match = this._pcProductList?.querySelector(".pc-product-item")
      if (match) {
        this._currentCategoryId = this._handleize(match.dataset.cat)
        this._selectedProductId = this._handleize(match.dataset.product)
        this._hoverCategoryId   = this._currentCategoryId
      }
    }

    this._showProductsForCategory(this._currentCategoryId || this._hoverCategoryId)
    this._highlightSelectedProduct()

    if (match) {
      this._setHeaderDisplay(match.dataset.name, match.dataset.thumb)
    } else {
      this._setHeaderDisplay(DEFAULT_PLACEHOLDER, "")
    }
  }
}
