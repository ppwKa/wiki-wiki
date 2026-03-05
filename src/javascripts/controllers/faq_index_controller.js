/**
 * FAQ 聚合页交互控制器
 * 负责产品筛选、FAQ 折叠、移动端弹窗
 * 初始选中状态由服务端通过 data-faq-index-init-cat-value / data-faq-index-init-product-value 注入
 * 产品切换通过 Turbo frame 导航驱动 main-content-frame 局部刷新并推入 URL 历史
 */
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    initCat: String,
    initProduct: String,
  }

  connect() {
    const MOBILE_BREAKPOINT = 768
    const DEFAULT_PLACEHOLDER = "Choose Product Model"
    const PLACEHOLDER_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#F5F5F7"/><rect x="10" y="10" width="80" height="80" fill="white"/></svg>'

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
    const faqSkeleton     = this.element.querySelector("#faqSkeleton")
    const faqContent      = this.element.querySelector("#faqContent")

    const showSkeleton = () => {
      if (faqSkeleton) faqSkeleton.style.display = ""
      if (faqContent)  faqContent.style.display  = "none"
    }

    const showContent = () => {
      if (faqSkeleton) faqSkeleton.style.display = "none"
      if (faqContent)  faqContent.style.display  = ""
    }

    // 初始选中状态来自服务端注入的 Stimulus values
    const initCatTitle = this.initCatValue || ""
    const initProductTitle = this.initProductValue || ""

    const handleize = (str) => {
      if (!str || typeof str !== "string") return ""
      return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    }

    let currentCategoryId = handleize(initCatTitle)
    let selectedProductId = handleize(initProductTitle)
    let hoverCategoryId = currentCategoryId

    const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT

    const setHeaderDisplay = (name, thumbUrl) => {
      if (selectedNameDisplay) {
        selectedNameDisplay.textContent = name || DEFAULT_PLACEHOLDER
      }
      if (thumbBox) {
        const safe = thumbUrl && /^(https?:|\/)/.test(String(thumbUrl).trim())
        thumbBox.innerHTML = safe
          ? '<img src="' + String(thumbUrl).trim() + '" alt="" class="h-full w-full object-cover">'
          : PLACEHOLDER_SVG
      }
    }

    const showProductsForCategory = (catId) => {
      pcProductList?.querySelectorAll(".pc-product-item").forEach((el) => {
        el.style.display = handleize(el.dataset.cat) === catId ? "" : "none"
      })

      // 类目列表 active 以“当前选中类目”为准（不是 hover）
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

    const getThumbForProduct = (cat, product) => {
      const el = [...(pcProductList?.querySelectorAll(".pc-product-item") || [])].find(
        (e) => handleize(e.dataset.cat) === cat && handleize(e.dataset.product) === product
      )
      return el?.dataset.thumb || ""
    }

    /**
     * 获取 Turbo Frame 当前 URL（优先 frame.src / data-turbo-frame 的 location）
     * 兜底用 window.location
     */
    const getCurrentFramePathname = () => {
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

    /**
     * 通过创建临时 <a> 标签触发 Turbo frame 导航，跳转到目标产品页
     * 比直接设置 frame.src 更可靠，走标准 Turbo 导航流程
     * data-turbo-action="advance" 会把新 URL 推入浏览器历史
     */
    const navigateToProduct = (path) => {
      if (!path) return

      // ✅ 防止重复导航 / 历史堆叠
      const targetPathname = (() => {
        try {
          return new URL(path, window.location.origin).pathname
        } catch (_) {
          return path
        }
      })()
      if (targetPathname === getCurrentFramePathname()) return

      const a = document.createElement("a")
      a.href = path
      a.setAttribute("data-turbo-frame", "main-content-frame")
      a.setAttribute("data-turbo-action", "advance")
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    const selectProduct = (name, cat, product, thumb, path) => {
      currentCategoryId = handleize(cat || "")
      selectedProductId = handleize(product || "")
      hoverCategoryId = currentCategoryId
      const thumbUrl = thumb || getThumbForProduct(currentCategoryId, selectedProductId)

      setHeaderDisplay(name, thumbUrl)
      highlightSelectedProduct()
      showProductsForCategory(currentCategoryId)
      showSkeleton()

      navigateToProduct(path)
    }

    const closePcDropdown = () => {
      pcDropdown?.classList.add("hidden")
      if (arrowIcon) arrowIcon.style.transform = "rotate(0deg)"
    }

    const openMobileCategory = (catId) => {
      if (!catId) return
      const wrapper = [...(mobileAccordion?.querySelectorAll(".mobile-accordion-item") || [])].find(
        (el) => handleize(el.dataset.cat) === catId
      )
      if (!wrapper) return
      const content = wrapper.querySelector(".mobile-accordion-content")
      const icon = wrapper.querySelector(".mobile-accordion-arrow")
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

    const toggleMobileCategoryContent = (header) => {
      const content = header.nextElementSibling
      const icon = header.querySelector(".mobile-accordion-arrow")
      content?.classList.toggle("open")
      icon?.classList.toggle("rotated")
    }

    if (!filterContainer) return

    // ✅ 用 AbortController 统一清理所有监听
    this.abortController = new AbortController()
    this.signal = this.abortController.signal

    // ✅ 修复：为每个 answer 容器缓存/管理 ResizeObserver，避免泄露
    this._faqRO = new WeakMap()

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
          selectProduct(el.dataset.name, el.dataset.cat, el.dataset.product, el.dataset.thumb, el.dataset.path)
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
            product.dataset.thumb,
            product.dataset.path
          )
          closeMobileSheet()
        }
      },
      { signal: this.signal }
    )

    // FAQ 手风琴：事件委托
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

        // 获取/创建 observer（每个 content 只一份）
        const ensureObserver = () => {
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

        const disconnectObserver = () => {
          const ro = this._faqRO.get(content)
          if (ro) {
            ro.disconnect()
            this._faqRO.delete(content)
          }
        }

        if (isOpen) {
          // 收起：先设定当前高度，再过渡到 0
          content.style.maxHeight = content.scrollHeight + "px"
          content.offsetHeight
          content.style.maxHeight = "0px"
          content.classList.remove("open")
          icon?.classList.remove("rotated")

          // ✅ 收起时断开 observer，避免一直挂着
          disconnectObserver()
        } else {
          // 展开：先归零再打开
          content.style.maxHeight = "0px"
          content.offsetHeight
          content.classList.add("open")
          icon?.classList.add("rotated")
          content.style.maxHeight = content.scrollHeight + "px"

          // ✅ 展开时确保 observer 存在（用于内容变化时自适应高度）
          ensureObserver()
        }
      },
      { signal: this.signal }
    )

    // 初始化：根据服务端注入的 init 值设置下拉头部显示和高亮
    const initDefaultSelection = () => {
      let match = null
      const items = [...(pcProductList?.querySelectorAll(".pc-product-item") || [])]

      // ✅ 修复：初始化匹配也用 handleize（避免大小写/空格导致失配）
      if (initCatTitle && initProductTitle) {
        const initCatId = handleize(initCatTitle)
        const initProdId = handleize(initProductTitle)
        match = items.find(
          (el) => handleize(el.dataset.cat) === initCatId && handleize(el.dataset.product) === initProdId
        )
      }

      // 兜底：取第一个产品项
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
      } else {
        setHeaderDisplay(DEFAULT_PLACEHOLDER, "")
      }
    }

    initDefaultSelection()

    // 骨架屏揭开：首次加载 & 每次 frame 导航后 connect() 重新触发
    this._skeletonTimer = setTimeout(showContent, 200)
  }

  disconnect() {
    clearTimeout(this._skeletonTimer)
    if (this.abortController) this.abortController.abort()
    document.body.classList.remove("faq-index-modal-open")

    // ✅ 兜底清理 observer（防止极端情况下残留）
    if (this._faqRO) {
      // WeakMap 无法遍历，这里只需要让引用释放即可；通常 controller 销毁后自然回收
      // 如果你担心某些浏览器实现问题，可改用 Map + Set 存 observer 以便遍历断开
      this._faqRO = null
    }
  }
}