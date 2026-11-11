import { dirname, fromFileUrl, join, resolve, toFileUrl } from "stdlib/path";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const mode = Deno.args[0] ?? "--typescript";
if (!["--typescript", "--lua"].includes(mode) || Deno.args.length > 1) {
  throw Error("Укажите --typescript или --lua");
}
const tracked = await new Deno.Command("git", {
  args: ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd: root, stdout: "piped", stderr: "piped",
}).output();
if (!tracked.success) throw Error(new TextDecoder().decode(tracked.stderr));
const paths = new TextDecoder().decode(tracked.stdout).split("\0").filter(Boolean);
const bridges = [
  "_extensions/project-download/observability/bridge.ts",
  "_extensions/project-download/observability/bridge.lua",
];
const own = paths.filter((file) => !file.includes("/vendor/") && !bridges.includes(file));
const unsupported = own.filter((file) => /\.(?:js|cjs|jsx|tsx)$/.test(file));
if (unsupported.length) throw Error("Добавьте языковую проверку: " + unsupported.join(", "));
const inventory: unknown = JSON.parse(await Deno.readTextFile(join(root, "typecheck/coverage.json")));
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}
if (typeof inventory !== "object" || inventory === null ||
    !("typescript" in inventory) || !strings(inventory.typescript) ||
    !("node" in inventory) || !strings(inventory.node) ||
    !("lua" in inventory) || !strings(inventory.lua) ||
    !("shell" in inventory) || !strings(inventory.shell) ||
    !("delegated" in inventory) || typeof inventory.delegated !== "object" ||
    inventory.delegated === null || Array.isArray(inventory.delegated)) {
  throw Error("Неверный перечень языкового покрытия");
}
const delegated = Object.values(inventory.delegated).flatMap((value: unknown) => {
  if (!strings(value)) throw Error("Неверный перечень делегированных файлов");
  return value;
});
if (JSON.stringify(delegated.sort()) !== JSON.stringify([...bridges].sort()) ||
    JSON.stringify(paths.filter((file) => bridges.includes(file)).sort()) !== JSON.stringify([...bridges].sort())) {
  throw Error("Два канонических bridge Performance должны быть отслеживаемыми и делегированными");
}
const groups = { typescript: inventory.typescript, lua: inventory.lua, shell: inventory.shell, node: inventory.node };
for (const [language, suffix] of [["typescript", ".ts"], ["lua", ".lua"], ["shell", ".sh"], ["node", ".mjs"]] as const) {
  const files = own.filter((file) => file.endsWith(suffix));
  if (JSON.stringify(files.sort()) !== JSON.stringify([...groups[language]].sort())) {
    throw Error(`Состав ${language} изменился: обновите typecheck/coverage.json`);
  }
}
if (mode === "--lua") {
  const performanceRoot = resolve(Deno.env.get("PERFORMANCE") ?? join(root, "..", "quarto-course-performance"));
  const args = ["run", "--no-config", "--no-lock", "-A", join(performanceRoot, "tools/check-lua.ts"), "--root", root];
  for (const path of groups.lua) args.push("--scope", path);
  args.push("--exclude", "_extensions/project-download/observability/bridge.lua",
    "--library", join(root, "_extensions/project-download/observability"),
    "--runtime-path", "_extensions/project-download/?.lua");
  const server = Deno.env.get("LUA_LANGUAGE_SERVER");
  if (server) args.push("--server", server);
  const result = await new Deno.Command(Deno.execPath(), { args, cwd: root, stdout: "inherit", stderr: "inherit" }).spawn().status;
  Deno.exitCode = result.code;
} else {
  for (const file of groups.node) {
    const result = await new Deno.Command("node", { args: ["--check", join(root, file)], cwd: root,
      stdout: "inherit", stderr: "inherit" }).spawn().status;
    if (!result.success) { Deno.exitCode = result.code; throw Error("Неверный Node tool: " + file); }
  }
  const files = groups.typescript;
  const imports: Record<string, string> = { "project-download/": toFileUrl(join(root, "_extensions/project-download") + "/").href };
  for (const key of ["stdlib/path", "stdlib/fs"]) {
    imports[key] = import.meta.resolve(key).replace(
      /^https:\/\/jsr\.io\/@std\/(path|fs)\/([^/]+)\/mod\.ts$/,
      "jsr:@std/$1@$2",
    ).replace("jsr:/", "jsr:");
  }
  for (const [name, variable, fallback] of [
    ["course-core", "CORE", "quarto-course"],
    ["course-prairielearn", "PL", "quarto-course-prairielearn"],
    ["reference-catalog", "QRC", "quarto-reference-catalog"],
  ] as const) {
    const repository = Deno.env.get(variable) ?? resolve(root, "..", fallback);
    const extension = await Deno.realPath(join(repository, "_extensions", name));
    imports[toFileUrl(join(root, "_extensions", name) + "/").href] = toFileUrl(extension + "/").href;
    imports[name + "/"] = toFileUrl(extension + "/").href;
  }
  const config: unknown = JSON.parse(await Deno.readTextFile(join(root, "typecheck/deno.json")));
  if (typeof config !== "object" || config === null || Array.isArray(config)) throw Error("Неверная конфигурация типов");
  const temporary = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(temporary, JSON.stringify({ ...config, imports }));
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["check", "--no-lock", "--config", temporary, ...files.map((file) => join(root, file))],
      cwd: root, stdout: "inherit", stderr: "inherit",
    }).output();
    if (!result.success) Deno.exitCode = result.code;
    else {
      const lint = await new Deno.Command(Deno.execPath(), {
        args: ["lint", "--config", temporary, ...files.map((file) => join(root, file))],
        cwd: root, stdout: "inherit", stderr: "inherit",
      }).spawn().status;
      if (!lint.success) Deno.exitCode = lint.code;
      else console.log(JSON.stringify({ checked: files.length, strict: true, scope: "Собственные TS source/tests/tools; bridge проверяет владелец Performance" }));
    }
  } finally {
    await Deno.remove(temporary);
  }

}
