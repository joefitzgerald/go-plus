module.exports =
class AtomConfig

  defaults: ->
    atom.config.set('go-plus.environmentOverridesConfiguration', true)
    atom.config.set('go-plus.formatArgs', '-w -e')
    atom.config.set('go-plus.vetArgs', '')
    atom.config.set('go-plus.formatTool', 'goimports')
    atom.config.set('go-plus.goPath', '')
    atom.config.set('go-plus.golintArgs', '')
    atom.config.set('go-plus.showPanel', true)
    atom.config.set('go-plus.showPanelWhenNoIssuesExist', false)

  allfunctionalitydisabled: =>
    @defaults()
    atom.config.set('go-plus.syntaxCheckOnSave', false)
    atom.config.set('go-plus.formatOnSave', false)
    atom.config.set('go-plus.formatTool', 'gofmt')
    atom.config.set('go-plus.getMissingTools', false)
    atom.config.set('go-plus.vetOnSave', false)
    atom.config.set('go-plus.lintOnSave', false)
    atom.config.set('go-plus.runCoverageOnSave', false)
    atom.config.set('autocomplete-plus.enableAutoActivation', false)
