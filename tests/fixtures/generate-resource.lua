return {
  {
    Pandoc = function(doc)
      local f = assert(io.open("generated.svg", "wb"))
      f:write('<svg xmlns="http://www.w3.org/2000/svg"><text>GENERATED_RESOURCE</text></svg>')
      f:close()
      return doc
    end,
  },
}
