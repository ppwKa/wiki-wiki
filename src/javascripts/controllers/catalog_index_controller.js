/**
 * 通用：分类 → 产品 筛选（PC 下拉 + 移动 Sheet）
 * 配套 snippets/_catalog_product_filter、_catalog_product_sheet 与 catalog.css
 * 页面根节点：class="catalog-index-page" data-controller="catalog-index"（FAQ 聚合页同用，并叠 `max-height-accordion`）
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
    this._abortController = new AbortController()
    this._filterContainer = this.element.querySelector(".filter-container")
    this._filterHeader = this.element.querySelector(".filter-trigger-btn")
    this._pcDropdown = this.element.querySelector(".pc-dropdown-menu")
    this._pcCategoryList = this.element.querySelector(".pc-category-list")
    this._pcProductList = this.element.querySelector(".pc-product-list")
    this._selectedNameDisplay = this.element.querySelector(".filter-trigger-text")
    this._arrowIcon = this.element.querySelector(".filter-trigger-arrow")
    this._thumbBox = this.element.querySelector(".filter-trigger-icon")
    this._mobileOverlay = this.element.querySelector(".mobile-overlay")
    this._mobileSheet = this.element.querySelector(".mobile-sheet")
    this._closeSheetBtn = this.element.querySelector(".mobile-sheet-close-btn")
    this._mobileAccordion = this.element.querySelector(".mobile-sheet-content")

    this._currentCategoryPath = ""
    this._selectedProductPath = ""
    this._hoverCategoryPath = ""

    if (!this._filterContainer) return

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

    window.addEventListener("popstate", () => this._syncFromUrl(), { signal })

    this._initDefaultSelection()
    this._skeletonTimer = setTimeout(() => this._showContent(), 200)
  }

  closeDropdowns() {
    this._closePcDropdown()
    this._closeMobileSheet()
  }

  showSkeletonBeforeNavigate() {
    this._showSkeleton()
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
  }

  _skeletonEl() {
    return this.element.querySelector("[data-catalog-skeleton], .catalog-skeleton, .faq-skeleton")
  }

  _contentEl() {
    return this.element.querySelector("[data-catalog-content], .catalog-content, .faq-content")
  }

  _showSkeleton() {
    clearTimeout(this._skeletonTimer)
    const sk = this._skeletonEl()
    const ct = this._contentEl()
    if (sk) sk.style.display = ""
    if (ct) ct.style.display = "none"
  }

  _showContent() {
    clearTimeout(this._skeletonTimer)
    const sk = this._skeletonEl()
    const ct = this._contentEl()
    if (sk) sk.style.display = "none"
    if (ct) ct.style.display = ""
  }

  _isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT
  }

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

  _showProductsForCategory(catPath) {
    this._pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      el.style.display = (el.dataset.catPath || "") === catPath ? "" : "none"
    })

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

  _getProductItemByPath(path) {
    return [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
      (el) => (el.dataset.path || "") === path
    )
  }

  _syncSelectionFromItem(item) {
    if (!item) return
    this._currentCategoryPath = item.dataset.catPath || ""
    this._selectedProductPath = item.dataset.path || ""
    this._hoverCategoryPath = this._currentCategoryPath
  }

  _onDocumentClick(e) {
    if (!this._filterContainer?.contains(e.target)) this._closePcDropdown()

    if (this._mobileSheet?.classList.contains("open") && !this._mobileSheet.contains(e.target)) {
      this._closeMobileSheet()
    }
  }

  _closePcDropdown() {
    this._pcDropdown?.classList.add("hidden")
    if (this._arrowIcon) this._arrowIcon.style.transform = "rotate(0deg)"
  }

  _openMobileCategory(catPath) {
    if (!catPath) return
    const wrapper = [...(this._mobileAccordion?.querySelectorAll(".mobile-accordion-item") || [])].find(
      (el) => (el.dataset.catPath || "") === catPath
    )
    if (!wrapper) return
    const content = wrapper.querySelector(".mobile-accordion-content")
    const icon = wrapper.querySelector(".mobile-accordion-arrow")
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
    const icon = header.querySelector(".mobile-accordion-arrow")
    if (!content) return
    const isOpen = content.classList.contains("open")
    content.classList.toggle("open", !isOpen)
    icon?.classList.toggle("rotated", !isOpen)
  }

  _initDefaultSelection() {
    let match = null
    const items = [...(this._pcProductList?.querySelectorAll(".pc-product-item") || [])]

    if (this.initProductPathValue) {
      match = items.find((el) => el.dataset.path === this.initProductPathValue)
    }

    if (!match && this.initCatPathValue) {
      const catPath = this.initCatPathValue
      match = items.find((el) => {
        const p = el.dataset.path || ""
        return p.startsWith(catPath + "/") || p === catPath
      })
    }

    if (!match) {
      match = this._pcProductList?.querySelector(".pc-product-item")
    }

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
