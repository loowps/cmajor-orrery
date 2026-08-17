import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import type { PatchConnection } from '@/models/patch-connection.model'

const cmajViewElementTag = 'cmaj-view'

class CmajApp extends HTMLElement {
  private patchConnection?: PatchConnection

  constructor(patchConnection: PatchConnection) {
    super()
    this.patchConnection = patchConnection
  }

  connectedCallback() {
    createApp(App)
      .use(createPinia())
      .use(router)
      .provide('patchConnection', this.patchConnection)
      .mount(this)
  }
}

window.customElements.define(cmajViewElementTag, CmajApp)

if (!customElements.get(cmajViewElementTag)) {
  customElements.define(cmajViewElementTag, CmajApp)
}

export default function createPatchView(patchConnection: PatchConnection) {
  return new CmajApp(patchConnection)
}
