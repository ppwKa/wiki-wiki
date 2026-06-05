import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["searchInput", "clearBtn", "qrModal", "qrModalImage", "qrModalCaption", "section"]

  connect() {
    this._activeContactCard = null
    this._syncClearButton()
    this._onEscape = (e) => {
      if (e.key === "Escape" && this.hasQrModalTarget && this.qrModalTarget.classList.contains("is-open")) {
        this.closeQrModal()
      }
    }
    document.addEventListener("keydown", this._onEscape)
  }

  disconnect() {
    document.removeEventListener("keydown", this._onEscape)
    document.body.classList.remove("psc-qr-modal-open")
  }

  searchInputChanged() {
    this._syncClearButton()
  }

  clearSearch(event) {
    event.preventDefault()
    if (!this.hasSearchInputTarget) return
    this.searchInputTarget.value = ""
    this.searchInputTarget.focus()
    this._syncClearButton()
  }

  toggleSection(event) {
    const section = event.currentTarget.closest("[data-psc-home-target='section']")
    if (!section) return

    const toggle = section.querySelector(".psc-section-head")
    const wasCollapsed = section.classList.contains("is-collapsed")
    const expanded = wasCollapsed

    section.classList.toggle("is-collapsed", !expanded)
    if (toggle) toggle.setAttribute("aria-expanded", String(expanded))

    if (expanded && wasCollapsed) {
      section.querySelectorAll(".psc-section-card").forEach((card) => {
        card.style.animation = "none"
        void card.offsetHeight
        card.style.animation = ""
      })
    }

    if (event.currentTarget.blur) event.currentTarget.blur()
  }

  openQrModal(event) {
    const card = event.currentTarget
    if (!this.hasQrModalTarget) return

    const label = card.getAttribute("data-qr-label") || ""
    const qrSrc = card.getAttribute("data-qr-src") || ""
    const qrImg = card.querySelector(".psc-contact-card-qr img")
    const src = qrSrc || (qrImg ? qrImg.getAttribute("src") || qrImg.currentSrc || "" : "")

    if (this.hasQrModalCaptionTarget) this.qrModalCaptionTarget.textContent = label
    if (this.hasQrModalImageTarget && src) {
      this.qrModalImageTarget.src = src
      this.qrModalImageTarget.alt = label
    }

    this.element.querySelectorAll(".psc-contact-card.is-active").forEach((el) => {
      el.classList.remove("is-active")
    })
    card.classList.add("is-active")
    this._activeContactCard = card

    this.qrModalTarget.hidden = false
    requestAnimationFrame(() => this.qrModalTarget.classList.add("is-open"))
    document.body.classList.add("psc-qr-modal-open")
    if (card.blur) card.blur()
  }

  openQrModalKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      this.openQrModal(event)
    }
  }

  closeQrModal() {
    if (!this.hasQrModalTarget) return

    this.qrModalTarget.classList.remove("is-open")
    document.body.classList.remove("psc-qr-modal-open")

    if (this._activeContactCard) {
      this._activeContactCard.classList.remove("is-active")
      this._activeContactCard = null
    }

    window.setTimeout(() => {
      if (!this.qrModalTarget.classList.contains("is-open")) {
        this.qrModalTarget.hidden = true
      }
    }, 400)
  }

  _syncClearButton() {
    if (!this.hasClearBtnTarget || !this.hasSearchInputTarget) return
    const hasValue = this.searchInputTarget.value.trim().length > 0
    this.clearBtnTarget.hidden = !hasValue
  }
}
