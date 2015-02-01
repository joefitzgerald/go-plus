_ = require('underscore-plus')

module.exports =
class SplicerSplitter
  splitAndSquashToArray: (delimeter, arg) ->
    return [] unless arg? and arg.length > 0
    return [] unless delimeter? and delimeter.length > 0
    result = switch delimeter
      when ' ' then arg.split(/[\s]+/)
      when ':' then arg.split(/[:]+/)
      when ';' then arg.split(/[;]+/)
      else []
    result = _.map result, (item) ->
      return '' unless item?
      return item.trim()
    result = _.filter(result, (item) -> item? and item.length > 0 and item isnt '')

  spliceAndSquash: (args...) ->
    return '' unless args? and args.length > 0
    args = _.map args..., (item) ->
      return '' unless item?
      return item.trim()
    args = _.filter(args, (item) -> item? and item.length > 0 and item.trim() isnt '')
    result = args.join(' ')
