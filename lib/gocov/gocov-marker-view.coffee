{$} = require 'atom'

module.exports =
class GocovMarkerView

  constructor: (range, count, parent, editor) ->
    @range = range
    @parent = parent
    @editor = editor
    @count = count
    @element = document.createElement('div')
    @element.className = 'gocov-marker'
    rowSpan = range.end.row - range.start.row

    if rowSpan == 0
      @appendRegion(1, range.start, range.end)
    else
      @appendRegion(1, range.start, null)
      if rowSpan > 1
        @appendRegion(rowSpan - 1, { row: range.start.row + 1, column: 0}, null)
      @appendRegion(1, { row: range.end.row, column: 0 }, range.end)

  appendRegion: (rows, start, end) ->
    { lineHeight, charWidth } = @editor
    css = @editor.pixelPositionForBufferPosition(start)
    css.height = lineHeight * rows
    if end
      css.width = @editor.pixelPositionForBufferPosition(end).left - css.left
    else
      css.right = 0

    region = document.createElement('div')
    if @count == 0
      region.className = 'region uncovered'
    else
      region.className = 'region covered'

    for name, value of css
      region.style[name] = value + 'px'

    @element.appendChild(region)
