if (Deno.env.get("DOWNLOAD_SENTINEL") !== "functional")
  throw Error("Потерян functional env");
const logPath = Deno.env.get("DOWNLOAD_CHILD_LOG");
const realGit = Deno.env.get("DOWNLOAD_REAL_GIT");
if (!logPath || !realGit) throw Error("Не заданы пути Git fixture");
await Deno.writeTextFile(
  logPath,
  JSON.stringify({
    parent: Deno.env.get("COURSE_PERF_PARENT_SPAN_ID"),
    args: Deno.args,
  }) + "\n",
  { append: true },
);
const child = new Deno.Command(realGit, {
  args: Deno.args,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).spawn();
Deno.exitCode = (await child.status).code;
export {};
