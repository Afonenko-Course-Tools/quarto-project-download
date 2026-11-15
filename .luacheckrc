std = "lua54"
max_line_length = false
files["_extensions/project-download/**/*.lua"] = { read_globals = { "pandoc" } }
files["_extensions/project-download/filter.lua"] = { read_globals = { "quarto", "FORMAT" } }
files["_extensions/project-download/request-transport.lua"] = { read_globals = { "quarto" } }
files["tests/**/*.lua"] = { read_globals = { "pandoc", "PANDOC_SCRIPT_FILE" } }
files["tests/native-buffer.lua"] = { globals = { "quarto" } }
files["typecheck/download.lua"] = { globals = { "pandoc" } }
