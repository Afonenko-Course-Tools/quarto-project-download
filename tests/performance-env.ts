// Actual Git helpers сохраняют прежние permissions и inherited env без агента.
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };
const root = await Deno.makeTempDir({ prefix: "download-env-permission-" });
try {
  await Deno.mkdir(root + "/bin");
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(root + "/data/public.csv", "PUBLIC");
  await Deno.writeTextFile(root + "/data/private.csv", "PRIVATE");
  await Deno.writeTextFile(root + "/.gitignore", "private.csv\n");
  const git = await new Deno.Command("which", { args: ["git"], stdout: "piped" }).output();
  assert(git.success, "Git отсутствует");
  const gitPath = new TextDecoder().decode(git.stdout).trim();
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  const log = root + "/git-calls";
  await Deno.writeTextFile(root + "/bin/git", `#!/bin/sh\n[ "$DOWNLOAD_ENV_SENTINEL" = inherited ] || exit 92\n[ "$COURSE_PERF_PARENT_SPAN_ID" = original-ghost ] || exit 93\nprintf '%s\\n' "$1" >> ${quote(log)}\nexec ${quote(gitPath)} "$@"\n`);
  await Deno.chmod(root + "/bin/git", 0o755);
  const importMap = root + "/imports.json";
  await Deno.writeTextFile(importMap, JSON.stringify({ imports: { "stdlib/path": import.meta.resolve("stdlib/path") } }));
  const script = root + "/child.ts";
  const module = new URL("../_extensions/project-download/infrastructure/files.ts", import.meta.url).href;
  await Deno.writeTextFile(script, `const {resourceFiles}=await import(${JSON.stringify(module)});const files=await resourceFiles(${JSON.stringify(root)},{path:'data'});if(files.length!==1||files[0].name!=='public.csv'||new TextDecoder().decode(files[0].bytes)!=='PUBLIC')throw Error('Git selection/bytes changed');console.log('PASS actual Git inherited env');`);
  for (const [mode, permission] of [["summary", "--deny-env"], ["off", "--allow-env=COURSE_PERF_MODE"], ["summary", "--allow-env=COURSE_PERF_MODE"]]) {
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--no-config", "--no-lock", "--no-prompt", "--import-map", importMap, "--allow-read", "--allow-write", "--allow-run", permission, script],
      env: { COURSE_PERF_MODE: mode, DOWNLOAD_ENV_SENTINEL: "inherited", COURSE_PERF_PARENT_SPAN_ID: "original-ghost", PATH: root + "/bin:" + Deno.env.get("PATH") },
      stdout: "piped", stderr: "piped",
    }).output();
    assert(result.success, `${mode}/${permission}: ${new TextDecoder().decode(result.stderr)}`);
    assert(new TextDecoder().decode(result.stdout).includes("PASS actual Git inherited env"), "Не выполнен Git helper");
  }
  const calls = (await Deno.readTextFile(log)).trim().split("\n");
  assert(calls.length === 6 && calls.filter(call => call === "init").length === 3, "Не выполнены оба Git subprocess во всех режимах");
  console.log("PASS denied env, scoped off/missing-agent: actual Git inherited sentinel and selection");
} finally { await Deno.remove(root, { recursive: true }); }
