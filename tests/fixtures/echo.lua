return {echo=
---@param args pandoc.Inlines[]
function(args)return pandoc.Str(pandoc.utils.stringify(args[1])) end}
