local wrappers=pandoc.List()
return {{
 Div=function(node)
  if node.classes:includes('project-download') then
   local links=0
   node:walk({Link=function(link)if link.classes:includes('project-download') then links=links+1 end end})
   wrappers:insert({links=links,text=pandoc.utils.stringify(node)})
  end
 end,
 Pandoc=function(doc)
  local file=assert(io.open('presentation-final-ast.json','w'));file:write(pandoc.json.encode(wrappers));file:close();return doc
 end
}}
