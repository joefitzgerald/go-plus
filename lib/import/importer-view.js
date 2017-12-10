// @flow

import SelectListView from 'atom-select-list'

export default class ImporterView {
  modalPanel: any
  selectListView: SelectListView
  previouslyFocusedElement: ?HTMLElement

  constructor (props: Object) {
    const {items, didConfirmSelection} = props
    const font = atom.config.get('editor.fontFamily')
    this.selectListView = new SelectListView({
      items,
      didConfirmSelection: (item) => {
        this.hide()
        didConfirmSelection(item)
      },
      didCancelSelection: () => this.hide(),
      elementForItem: (i) => {
        const li = document.createElement('li')
        li.style.fontFamily = font
        li.textContent = i
        return li
      }
    })
  }

  async show (items: Array<string> = []) {
    this.previouslyFocusedElement = document.activeElement
    this.selectListView.reset()
    await this.selectListView.update({
      items,
      query: 'Enter a package to import',
      selectQuery: true })
    this.getModalPanel().show()
    this.selectListView.focus()
  }

  dispose () {
    this.destroy()
  }

  destroy () {
    this.selectListView.destroy()
    this.getModalPanel().destroy()
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }

  hide () {
    this.getModalPanel().hide()
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }

  getModalPanel () {
    if (!this.modalPanel) {
      this.modalPanel = atom.workspace.addModalPanel({item: this.selectListView})
    }
    return this.modalPanel
  }
}
