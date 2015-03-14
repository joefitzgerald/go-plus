Dialog = require './dialog'

module.exports =
class RenameDialog extends Dialog
  constructor: (@originalName) ->
    prompt = "Change #{ @originalName } to:"
    super
      prompt: prompt
      initialPath: ''
      select: true
      iconClass: 'icon-arrow-right'

  onConfirm: (newName) ->
    newName = newName.trim()
    @trigger 'name-accepted', [newName]
    @close()
