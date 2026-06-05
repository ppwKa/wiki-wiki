import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "auto" })
  }
}
