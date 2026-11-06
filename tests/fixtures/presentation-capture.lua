---@type {callouts: {text: string, type: string, appearance: string, icon?: boolean}[], links: {text: string, target: string, download?: string}[], paragraphs: string[]}
local result={callouts={},links={},paragraphs={}}
return {{
 Callout=
 ---@param node DownloadCallout
 function(node)
  result.callouts[#result.callouts+1]={text=pandoc.utils.stringify(node.content),type=node.type,appearance=node.appearance,icon=node.icon}
 end,
 Link=function(node)
  if node.classes:includes('project-download') then
   result.links[#result.links+1]={text=pandoc.utils.stringify(node.content),target=node.target,download=node.attributes.download}
  end
 end,
 Para=function(node) result.paragraphs[#result.paragraphs+1]=pandoc.utils.stringify(node) end,
 Pandoc=function(doc)
  local file=assert(io.open('presentation-ast.json','w'));file:write(pandoc.json.encode(result));file:close();return doc
 end
}}
