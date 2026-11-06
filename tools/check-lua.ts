import { dirname, fromFileUrl, join } from "stdlib/path";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const share = Deno.env.get("DOWNLOAD_QUARTO_SHARE") ?? join(dirname(Deno.execPath()), "../../../share");
const temporary = await Deno.makeTempDir({ prefix: "download-luals-" });
try {
  const config = {
    "runtime.version": "Lua 5.4",
    "runtime.path": ["?.lua", "?/init.lua", "_extensions/project-download/?.lua"],
    "runtime.plugin": join(share, "lua-plugin/plugin.lua"),
    "workspace.library": [join(share, "lua-types"), join(root, "_extensions/project-download/observability")],
    "workspace.ignoreDir": [".git", "node_modules", "_extensions/project-download/observability"],
    "diagnostics.libraryFiles": "Disable",
    "diagnostics.ignoredFiles": "Disable",
    "diagnostics.groupFileStatus": { "type-check": "Any!", strong: "Any!" },
    "diagnostics.groupSeverity": { "type-check": "Error!", strong: "Error!" },
    "type.weakNilCheck": false,
    "type.weakUnionCheck": false,
    "type.checkTableShape": true,
  };
  const path = join(temporary, "luarc.json");
  await Deno.writeTextFile(path, JSON.stringify(config));
  const result = await new Deno.Command("lua-language-server", {
    args: [`--check=${root}`, "--checklevel=Warning", `--configpath=${path}`, `--logpath=${temporary}`, "--num_threads=1"],
    cwd: root, stdout: "inherit", stderr: "inherit",
  }).output();
  try { console.log(await Deno.readTextFile(join(temporary, "check.json"))); }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
  Deno.exitCode = result.code;
} finally { await Deno.remove(temporary, { recursive: true }); }
