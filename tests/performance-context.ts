// Проверяет ABI-контракт фасада и настоящие дочерние процессы без зависимости от Core.
import { createMetrics, type OperationSpec } from "../_extensions/project-download/observability/bridge.ts";
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };
const root = await Deno.makeTempDir({ prefix: "download-context-" });
const registry = globalThis as unknown as Record<symbol, unknown>;
const key = Symbol.for("course.performance.agent.v1");
const saved = Deno.env.toObject(), priorAgent = registry[key];
try {
  Deno.env.set("COURSE_PERF_MODE", "off");
  const off = createMetrics("project-download"), base = { SENTINEL: "functional" };
  const fn = () => Promise.resolve(7), promise = fn();
  assert(off.wrapAsync({ id: "off", kind: "function" }, fn) === fn, "Off изменил функцию");
  assert(off.wrapSync({ id: "off", kind: "function" }, () => promise)() === promise, "Off изменил Promise");
  assert(off.childEnv(base) === base, "Off изменил base env");
  Deno.env.set("COURSE_PERF_MODE", "trace");
  Deno.env.set("COURSE_PERF_PARENT_SPAN_ID", "ghost-parent");
  Deno.env.set("DOWNLOAD_SENTINEL", "functional");
  const specs: OperationSpec[] = [], spans: string[] = [];
  let linked = true;
  const metrics = {
    wrapSync(spec: OperationSpec, action: (...args: any[]) => any) {
      specs.push(spec);
      return (...args: any[]) => { spans.push(spec.id); try { return action(...args); } finally { spans.pop(); } };
    },
    wrapAsync(spec: OperationSpec, action: (...args: any[]) => any) {
      specs.push(spec);
      return async (...args: any[]) => { if (!linked) return await action(...args); spans.push(spec.id); try { return await action(...args); } finally { spans.pop(); } };
    },
    wrapWalk(spec: OperationSpec, action: (...args: any[]) => any) { return this.wrapSync(spec, action); },
    childEnv(env: Record<string, string>) {
      const result = { ...env }; delete result.COURSE_PERF_PARENT_SPAN_ID;
      if (spans.length) result.COURSE_PERF_PARENT_SPAN_ID = spans.at(-1)!;
      return result;
    },
  };
  registry[key] = { abiVersion: 1, metrics };
  const bound = createMetrics("project-download");
  bound.wrapSync({ id: "document", kind: "function", document_id: "chapter.qmd", attributes: { extension_id: "foreign", custom: true } } as OperationSpec, () => 1)();
  assert(specs[0].document_id === "chapter.qmd" && specs[0].attributes?.extension_id === "project-download" && specs[0].attributes?.custom === true, "Фасад потерял document/extension context");
  const probe = root + "/probe.ts";
  await Deno.writeTextFile(probe, `if(Deno.env.get('DOWNLOAD_SENTINEL')!=='functional')throw Error('Потерян functional env');console.log(Deno.env.get('COURSE_PERF_PARENT_SPAN_ID')??'unlinked');`);
  const unlinked = await new Deno.Command(Deno.execPath(), { args: ["run", "--allow-env", probe], env: bound.childEnv(Deno.env.toObject()), clearEnv: true, stdout: "piped" }).output();
  assert(unlinked.success && new TextDecoder().decode(unlinked.stdout).trim() === "unlinked", "Actual Deno child унаследовал ghost parent");
  const git = await new Deno.Command("which", { args: ["git"], stdout: "piped" }).output();
  const realGit = new TextDecoder().decode(git.stdout).trim(); assert(git.success && realGit, "Git отсутствует");
  await Deno.mkdir(root + "/bin");
  const log = root + "/children.jsonl";
  await Deno.writeTextFile(root + "/bin/git", `#!/usr/bin/env -S ${Deno.execPath()} run -A\nif(Deno.env.get('DOWNLOAD_SENTINEL')!=='functional')throw Error('Потерян functional env');await Deno.writeTextFile(${JSON.stringify(log)},JSON.stringify({parent:Deno.env.get('COURSE_PERF_PARENT_SPAN_ID'),args:Deno.args})+'\\n',{append:true});const child=new Deno.Command(${JSON.stringify(realGit)},{args:Deno.args,stdin:'inherit',stdout:'inherit',stderr:'inherit'}).spawn();Deno.exit((await child.status).code);\n`);
  await Deno.chmod(root + "/bin/git", 0o755);
  Deno.env.set("PATH", root + "/bin:" + saved.PATH);
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(root + "/data/public.csv", "PUBLIC");
  await Deno.writeTextFile(root + "/data/private.csv", "PRIVATE");
  await Deno.writeTextFile(root + "/.gitignore", "private.csv\n");
  const { resourceFiles } = await import("../_extensions/project-download/infrastructure/files.ts");
  const files = await resourceFiles(root, { path: "data" });
  assert(files.length === 1 && files[0].name === "public.csv" && new TextDecoder().decode(files[0].bytes) === "PUBLIC", "Изменился функциональный отбор Git");
  linked = false;
  const unlinkedFiles = await resourceFiles(root, { path: "data" });
  assert(unlinkedFiles.length === 1 && unlinkedFiles[0].name === "public.csv", "Unlinked Git потерял functional env");
  const children = (await Deno.readTextFile(log)).trim().split("\n").map(line => JSON.parse(line));
  assert(children.length === 4 && children.slice(0, 2).every(child => child.parent === "project-download.infrastructure.files.resourceFiles"), "Git child не получил фактический parent span");
  assert(children.slice(2).every(child => child.parent === undefined), "Unlinked Git унаследовал ghost parent без clearEnv");
  assert(children[0].args[0] === "init" && children[1].args.includes("check-ignore"), "Изменились native argv");
  assert(specs.slice(1).every(spec => spec.document_id === undefined && spec.attributes?.extension_id === "project-download"), "Ресурсная операция выбрала произвольный документ/extension");
  console.log("PASS: off identity, document/extension context, actual Deno child unlinked/linked, functional Git sentinel");
} finally {
  registry[key] = priorAgent;
  for (const name of Object.keys(Deno.env.toObject())) if (!(name in saved)) Deno.env.delete(name);
  for (const [name, value] of Object.entries(saved)) Deno.env.set(name, value);
  await Deno.remove(root, { recursive: true });
}
