module.exports =
class AtomConfig

  defaults: ->
    atom.config.set('go-plus.environmentOverridesConfiguration', true)
    atom.config.set('go-plus.gofmtArgs', '-w')
    atom.config.set('go-plus.vetArgs', '')
    atom.config.set('go-plus.goPath', '')
    atom.config.set('go-plus.golintArgs', '')
    atom.config.set('go-plus.showPanel', true)
    atom.config.set('go-plus.showPanelWhenNoIssuesExist', false)

  allfunctionalitydisabled: =>
    @defaults()
    atom.config.set("go-plus.syntaxCheckOnSave", false)
    atom.config.set("go-plus.formatOnSave", false)
    atom.config.set("go-plus.formatWithGoImports", false)
    atom.config.set("go-plus.getMissingTools", false)
    atom.config.set("go-plus.vetOnSave", false)
    atom.config.set("go-plus.lintOnSave", false)
    atom.config.set("go-plus.runCoverageOnSave", false)
