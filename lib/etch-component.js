// @flow

'use babel'

/** @jsx etch.dom */

import etch from 'etch'

/*
  Public: Abstract class for handling the initialization
  boilerplate of an Etch component.
*/
export default class EtchComponent {
  props: any
  refs: Object
  element: HTMLElement

  constructor (props: Object) {
    this.props = props

    etch.initialize(this)
    EtchComponent.setScheduler(atom.views)
  }

  /*
    Public: Gets the scheduler Etch uses for coordinating DOM updates.

    Returns a {Scheduler}
  */
  static getScheduler () {
    return etch.getScheduler()
  }

  /*
    Public: Sets the scheduler Etch uses for coordinating DOM updates.

    * `scheduler` {Scheduler}
  */
  static setScheduler (scheduler: any) {
    etch.setScheduler(scheduler)
  }

  /*
    Public: Updates the component's properties and re-renders it. Only the
    properties you specify in this object will update – any other properties
    the component stores will be unaffected.

    * `props` an {Object} representing the properties you want to update
  */
  update (props: any = {}) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)
    return etch.update(this)
  }

  updateSync (props: any = {}) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)
    return etch.updateSync(this)
  }

  /*
    Public: Destroys the component, removing it from the DOM.
  */
  destroy (removeNode: bool = false) {
    etch.destroy(this, removeNode)
  }

  render () {
    throw new Error('Etch components must implement a `render` method')
  }
}
