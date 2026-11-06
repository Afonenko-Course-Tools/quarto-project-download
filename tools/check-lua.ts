import { dirname, fromFileUrl, join } from "stdlib/path";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const share = Deno.env.get("DOWNLOAD_QUARTO_SHARE") ?? join(dirname(Deno.execPath()), "../../../share");
const temporary = await Deno.makeTempDir({ prefix: "download-luals-" });
try {
  const probe = Deno.args.includes("--probe");
  const workspace = probe ? join(temporary, "probe") : root;
  if (probe) {
    await Deno.mkdir(workspace);
    await Deno.writeTextFile(join(workspace, "unknown.lua"), "---@param value unknown\nlocal function identity(value)\n local copy=value\n return copy\nend\nreturn identity\n");
  }
  const config = {
    "runtime.version": "Lua 5.4",
    "runtime.path": ["?.lua", "?/init.lua", "_extensions/project-download/?.lua"],
    "runtime.plugin": join(share, "lua-plugin/plugin.lua"),
    "workspace.library": [join(share, "lua-types"), join(root, "_extensions/project-download/observability")],
    "workspace.ignoreDir": [".git", "node_modules", "_extensions/project-download/observability"],
    "diagnostics.libraryFiles": "Disable",
    "diagnostics.ignoredFiles": "Disable",
    "diagnostics.groupFileStatus": { "type-check": "Any", strong: "Any" },
    "diagnostics.groupSeverity": { "type-check": "Error", strong: "Error" },
    "diagnostics.neededFileStatus": { "no-unknown": "Any!" },
    "diagnostics.severity": { "no-unknown": "Error" },
    "type.weakNilCheck": false,
    "type.weakUnionCheck": false,
    "type.checkTableShape": true,
  };
  const path = join(temporary, "luarc.json");
  await Deno.writeTextFile(path, JSON.stringify(config));
  const result = await new Deno.Command("lua-language-server", {
    args: [`--check=${workspace}`, "--checklevel=Warning", "--check_format=json", `--check_out_path=${join(temporary, "check.json")}`, `--configpath=${path}`, `--logpath=${temporary}`, "--num_threads=1"],
    cwd: root, stdout: "inherit", stderr: "inherit",
  }).output();
  const diagnostics = await Deno.readTextFile(join(temporary, "check.json"));
  console.log(diagnostics);
  if (probe) {
    if (result.success || !diagnostics.includes("no-unknown")) throw Error("LuaLS не обнаружил контрольный неизвестный тип");
    console.log("PASS: контроль no-unknown действительно включён");
  } else Deno.exitCode = result.code;
} finally { await Deno.remove(temporary, { recursive: true }); }
