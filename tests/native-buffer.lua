-- Только transport unit на настоящем Pandoc/Lua; context заглушка не authority.
local root = pandoc.path.directory(pandoc.path.directory(PANDOC_SCRIPT_FILE))
local format = "html"
quarto = {
  project = { directory = "/owner" },
  doc = { input_file = "/owner/index.qmd" },
  format = {
    format_identifier = function()
      return { ["target-format"] = format }
    end,
  },
}
local path = pandoc.path.join({ root, "_extensions/project-download/request-transport.lua" })
---@type DownloadTransport
local m = dofile(path)
local count = 0
---@param f fun()
---@param code string
local function refuse(f, code)
  local ok, e = pcall(f)
  assert(not ok and tostring(e):find(code, 1, true), tostring(e))
  count = count + 1
end
---@return DownloadInvocation
local value = function()
  return {
    positional = pandoc.List({ "data" }) --[[@as DownloadArgumentList]],
    named = pandoc.List() --[[@as DownloadNamedArgumentList]],
  }
end
return {
  {
    Pandoc = function(doc)
      local key = m.context().key
      refuse(function()
        m.record(value())
      end, "Нет действующей")
      refuse(function()
        m.drain(key)
      end, "незавершённый")
      m.begin(key)
      assert(m.record(value()) == 0)
      ---@type DownloadTransport
      local other = dofile(path)
      assert(other.record(value()) == 1)
      assert(#m.drain(key) == 2)
      count = count + 3
      refuse(function()
        m.drain(key)
      end, "незавершённый")
      m.begin(key)
      quarto.doc.input_file = "/owner/other.qmd"
      refuse(function()
        m.record(value())
      end, "Нет действующей")
      quarto.doc.input_file = "/owner/index.qmd"
      m.begin(key)
      format = "revealjs"
      refuse(function()
        m.record(value())
      end, "Нет действующей")
      format = "html"
      m.begin(key)
      quarto.project.directory = "/foreign"
      refuse(function()
        m.record(value())
      end, "Нет действующей")
      quarto.project.directory = "/owner"
      m.begin(key)
      refuse(function()
        m.record({
          positional = pandoc.List({ string.rep("x", 16 * 1024 * 1024) }) --[[@as DownloadArgumentList]],
          named = pandoc.List() --[[@as DownloadNamedArgumentList]],
        })
      end, "Превышен")
      assert(#m.drain(key) == 0)
      count = count + 1
      m.begin(key)
      for _ = 1, 16384 do
        m.record(value())
      end
      refuse(function()
        m.record(value())
      end, "Превышен")
      m.begin(key)
      assert(m.record(value()) == 0)
      assert(#m.drain(key) == 1)
      count = count + 2
      io.stderr:write("BUFFER_CONTROLS " .. count .. "\n")
      return doc
    end,
  },
}
