/**
 * FAQ 聚合页交互控制器
 * 负责产品筛选、FAQ 折叠、移动端弹窗、URL 状态同步、内容懒加载
 * 仅在 FAQ 聚合页生效（通过 data-controller="faq-index" 绑定）
 */
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {}

  connect() {
    const MOBILE_BREAKPOINT = 768
    const DEFAULT_PLACEHOLDER = "Choose Product Model"
    const PLACEHOLDER_SVG =
      '<svg viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'

    const filterContainer = this.element.querySelector("#filterContainer")
    const filterHeader = this.element.querySelector("#filterHeader")
    const pcDropdown = this.element.querySelector("#pcDropdown")
    const pcCategoryList = this.element.querySelector("#pcCategoryList")
    const pcProductList = this.element.querySelector("#pcProductList")
    const selectedNameDisplay = this.element.querySelector("#selectedName")
    const arrowIcon = this.element.querySelector("#arrowIcon")
    const thumbBox = this.element.querySelector("#thumbBox")
    const mobileOverlay = this.element.querySelector("#mobileOverlay")
    const mobileSheet = this.element.querySelector("#mobileSheet")
    const closeSheet = this.element.querySelector("#closeSheet")
    const mobileAccordion = this.element.querySelector("#mobileAccordion")
    const faqContentFrame = this.element.querySelector("#faq-content-frame")
    const faqContentPlaceholder = this.element.querySelector("#faqContentPlaceholder")
    const faqSkeleton = this.element.querySelector("#faqSkeleton")
    const faqSelectHint = this.element.querySelector("#faqSelectHint")
    const faqContentWrapper = this.element.querySelector("#faqContentWrapper")

    const params = new URLSearchParams(location.search)
    const faqPath = faqContentWrapper?.dataset.faqPath || "/faq"

    const handleize = (str) => {
      if (!str || typeof str !== "string") return ""
      return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    }

    let currentCategoryId = handleize(params.get("cat") || "")
    let selectedProductId = handleize(params.get("product") || "")
    let hoverCategoryId = currentCategoryId || ""
    let currentCategoryTitle = ""
    let currentProductTitle = ""

    const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT

    const updateUrl = (cat, product) => {
      const url = new URL(location.href)
      if (cat) url.searchParams.set("cat", cat)
      else url.searchParams.delete("cat")
      if (product) url.searchParams.set("product", product)
      else url.searchParams.delete("product")
      history.replaceState(null, "", url.toString())
    }

    const setHeaderDisplay = (name, thumbUrl) => {
      if (selectedNameDisplay) {
        selectedNameDisplay.textContent = name || DEFAULT_PLACEHOLDER
      }
      if (thumbBox) {
        const safe = thumbUrl && /^(https?:|\/)/.test(thumbUrl.trim())
        thumbBox.innerHTML = safe
          ? '<img src="' + thumbUrl + '" alt="" class="h-full w-full object-cover">'
          : PLACEHOLDER_SVG
      }
    }

    const showProductsForCategory = (catId) => {
      pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
        el.style.display = handleize(el.dataset.cat) === catId ? "" : "none"
      })
      pcCategoryList?.querySelectorAll(".pc-category-item").forEach((el) => {
        const active = handleize(el.dataset.cat) === currentCategoryId
        el.classList.toggle("active", active)
        el.classList.toggle("inactive", !active)
      })
    }

    const highlightSelectedProduct = () => {
      pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
        const active =
          handleize(el.dataset.cat) === currentCategoryId &&
          handleize(el.dataset.product) === selectedProductId
        el.classList.toggle("active", active)
        el.classList.toggle("inactive", !active)
      })
      mobileAccordion?.querySelectorAll(".mobile-accordion-product").forEach((el) => {
        const active =
          handleize(el.dataset.cat) === currentCategoryId &&
          handleize(el.dataset.product) === selectedProductId
        el.classList.toggle("active", active)
        el.classList.toggle("inactive", !active)
      })
    }

    const showSkeleton = () => {
      if (faqSkeleton) faqSkeleton.style.display = ""
      if (faqSelectHint) faqSelectHint.style.display = "none"
    }

    const showHint = () => {
      if (faqSkeleton) faqSkeleton.style.display = "none"
      if (faqSelectHint) faqSelectHint.style.display = ""
    }

    const loadContentForProduct = (catTitle, productTitle) => {
      if (!faqContentFrame || !catTitle || !productTitle) return
      showSkeleton()
      const url =
        "/s/faq/content?faq_path=" +
        encodeURIComponent(faqPath) +
        "&cat=" +
        encodeURIComponent(catTitle) +
        "&product=" +
        encodeURIComponent(productTitle)
      faqContentFrame.src = url
    }

    const openMobileCategory = (catId) => {
      if (!catId) return
      const wrapper = [...(mobileAccordion?.querySelectorAll(".mobile-accordion-item") || [])].find(
        (el) => handleize(el.dataset.cat) === catId
      )
      if (!wrapper) return
      mobileAccordion?.querySelectorAll(".mobile-accordion-content").forEach((c) => {
        c.classList.remove("open")
        const icon = c.previousElementSibling?.querySelector(".mobile-accordion-arrow")
        if (icon) icon.classList.remove("rotated")
      })
      const content = wrapper.querySelector(".mobile-accordion-content")
      const icon = content?.previousElementSibling?.querySelector(".mobile-accordion-arrow")
      if (content) content.classList.add("open")
      if (icon) icon.classList.add("rotated")
    }

    const openMobileSheet = () => {
      mobileOverlay?.classList.add("open")
      mobileSheet?.classList.add("open")
      document.body.classList.add("faq-index-modal-open")
      if (currentCategoryId) openMobileCategory(currentCategoryId)
      highlightSelectedProduct()
    }

    const closeMobileSheet = () => {
      mobileOverlay?.classList.remove("open")
      mobileSheet?.classList.remove("open")
      document.body.classList.remove("faq-index-modal-open")
    }

    const getThumbForProduct = (cat, product) => {
      const el = [...(pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
        (e) => handleize(e.dataset.cat) === cat && handleize(e.dataset.product) === product
      )
      return el?.dataset.thumb || ""
    }

    const selectProduct = (name, cat, product, thumb) => {
      currentCategoryId = handleize(cat || "")
      selectedProductId = handleize(product || "")
      currentCategoryTitle = cat || ""
      currentProductTitle = product || ""
      hoverCategoryId = currentCategoryId
      const thumbUrl = thumb || getThumbForProduct(currentCategoryId, selectedProductId)
      setHeaderDisplay(name, thumbUrl)
      updateUrl(currentCategoryId, selectedProductId)
      highlightSelectedProduct()
      showProductsForCategory(currentCategoryId)
      loadContentForProduct(currentCategoryTitle, currentProductTitle)
    }

    const closePcDropdown = () => {
      pcDropdown?.classList.add("hidden")
      if (arrowIcon) arrowIcon.style.transform = "rotate(0deg)"
    }

    const toggleMobileCategoryContent = (header) => {
      const content = header.nextElementSibling
      const icon = header.querySelector(".mobile-accordion-arrow")
      mobileAccordion?.querySelectorAll(".mobile-accordion-content").forEach((c) => {
        if (c !== content) {
          c.classList.remove("open")
          const i = c.previousElementSibling?.querySelector(".mobile-accordion-arrow")
          if (i) i.classList.remove("rotated")
        }
      })
      content?.classList.toggle("open")
      icon?.classList.toggle("rotated")
    }

    if (!filterContainer) return

    this.abortController = new AbortController()
    this.signal = this.abortController.signal

    filterHeader?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation()
        if (isMobile()) {
          openMobileSheet()
        } else {
          pcDropdown?.classList.toggle("hidden")
          if (arrowIcon) {
            arrowIcon.style.transform = pcDropdown?.classList.contains("hidden")
              ? "rotate(0deg)"
              : "rotate(180deg)"
          }
          if (!pcDropdown?.classList.contains("hidden")) {
            hoverCategoryId = currentCategoryId || hoverCategoryId
            if (hoverCategoryId) showProductsForCategory(hoverCategoryId)
          }
        }
      },
      { signal: this.signal }
    )

    document.addEventListener(
      "click",
      (e) => {
        if (!filterContainer.contains(e.target)) closePcDropdown()
      },
      { signal: this.signal }
    )

    pcCategoryList?.querySelectorAll(".pc-category-item").forEach((el) => {
      el.addEventListener(
        "mouseenter",
        () => {
          hoverCategoryId = handleize(el.dataset.cat)
          showProductsForCategory(hoverCategoryId)
          highlightSelectedProduct()
        },
        { signal: this.signal }
      )
    })

    pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
      el.addEventListener(
        "click",
        () => {
          selectProduct(el.dataset.name, el.dataset.cat, el.dataset.product, el.dataset.thumb)
          closePcDropdown()
        },
        { signal: this.signal }
      )
    })

    closeSheet?.addEventListener("click", closeMobileSheet, { signal: this.signal })
    mobileOverlay?.addEventListener("click", closeMobileSheet, { signal: this.signal })

    mobileAccordion?.addEventListener(
      "click",
      (e) => {
        const header = e.target.closest(".mobile-accordion-header")
        const product = e.target.closest(".mobile-accordion-product")
        if (header) {
          toggleMobileCategoryContent(header)
        } else if (product) {
          selectProduct(
            product.dataset.name,
            product.dataset.cat,
            product.dataset.product,
            product.dataset.thumb
          )
          closeMobileSheet()
        }
      },
      { signal: this.signal }
    )

    // FAQ 手风琴：使用事件委托，支持懒加载后的动态内容
    this.element.addEventListener(
      "click",
      (e) => {
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
        } else {
          content.style.maxHeight = "none"
          const scrollHeight = content.scrollHeight
          content.style.maxHeight = "0px"
          content.offsetHeight
          content.classList.add("open")
          icon?.classList.add("rotated")
          content.style.maxHeight = scrollHeight + "px"

          const observer = new ResizeObserver(() => {
            if (content.classList.contains("open")) {
              content.style.maxHeight = content.scrollHeight + "px"
            }
          })
          observer.observe(content)
        }
      },
      { signal: this.signal }
    )

    const initDefaultSelection = () => {
      let match = null
      if (currentCategoryId && selectedProductId) {
        match = [...(pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
          (el) =>
            handleize(el.dataset.cat) === currentCategoryId &&
            handleize(el.dataset.product) === selectedProductId
        )
      }
      if (!match) {
        match = pcProductList?.querySelector(".pc-product-item")
        if (match) {
          currentCategoryId = handleize(match.dataset.cat)
          selectedProductId = handleize(match.dataset.product)
          hoverCategoryId = currentCategoryId
        }
      }
      showProductsForCategory(currentCategoryId || hoverCategoryId)
      highlightSelectedProduct()
      if (match) {
        setHeaderDisplay(match.dataset.name, match.dataset.thumb)
        currentCategoryTitle = match.dataset.cat
        currentProductTitle = match.dataset.product
        loadContentForProduct(currentCategoryTitle, currentProductTitle)
      } else {
        setHeaderDisplay(DEFAULT_PLACEHOLDER, "")
        showHint()
      }
    }

    initDefaultSelection()
  }

  disconnect() {
    if (this.abortController) this.abortController.abort()
    document.body.classList.remove("faq-index-modal-open")
  }
}
