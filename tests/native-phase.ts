// Genuine ordinary Core hooks/late observations. Не assignment/P/qualified delivery.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  core = Deno.env.get("CORE");
if (!core) throw Error("CORE обязателен");
const root = await Deno.makeTempDir({ prefix: "download-phase-" }),
  td = new TextDecoder(),
  rows: any[] = [];
function assert(v: unknown, m: string) {
  if (!v) throw Error(m);
}
async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  for await (const e of Deno.readDir(dir)) {
    const p = join(dir, e.name);
    if (e.isDirectory) out.push(...await files(p));
    else out.push(p);
  }
  return out;
}
try {
  await copy(
    join(repo, "_extensions/project-download"),
    join(root, "_extensions/project-download"),
  );
  await copy(
    join(core, "_extensions/course-core"),
    join(root, "_extensions/course-core"),
  );
  async function config(
    order: string,
    projection = "student",
    format = "html",
  ) {
    await Deno.writeTextFile(
      join(root, "_quarto.yml"),
      `project:\n  type: website\n  output-dir: _site\n  render: [index.qmd]\n  pre-render: [quarto run _extensions/project-download/entrypoints/pre.ts, quarto run _extensions/course-core/entrypoints/native-pre.ts]\n  post-render: [quarto run _extensions/course-core/entrypoints/native-post.ts]\nformat: {${format}: {theme: ${
        format === "revealjs" ? "simple" : "none"
      }}}\nfilters: [${order}]\ncourse: {id: phase, view: ${
        projection === "author" ? "full" : "student"
      }}\ncourse-core-projection: ${projection}\nexercise-bank: true\nproject-download: {course-model: true}\n`,
    );
  }
  const content =
    `# Наблюдение\n\n::: {#exr-demo difficulty=introductory course-role=demonstration statement-visibility=open project="/projects/demo"}\nPUBLIC_DEMO\n\n{{< project-download exr-demo >}}\n\n::: {.solution}\nPUBLIC_SOLUTION\n:::\n:::\n\n::: {#exr-format difficulty=introductory statement-visibility=open project="/projects/format"}\nFORMAT_EXERCISE\n\n::: {.content-visible when-format=revealjs}\nFORMAT_ONLY\n\n{{< project-download exr-format >}}\n:::\n:::\n\n::: {#exr-private difficulty=introductory statement-visibility=restricted project="/projects/private"}\nPRIVATE_STATEMENT\n\n{{< project-download exr-private >}}\n\n::: {.solution}\nPRIVATE_SOLUTION\n:::\n:::\n`;
  await Deno.writeTextFile(join(root, "index.qmd"), content);
  const Core = await import(
      toFileUrl(join(root, "_extensions/course-core/public.ts")).href
    ),
    capture = await import(
      toFileUrl(
        join(root, "_extensions/course-core/document/project-capture.ts"),
      ).href
    );
  async function run(
    name: string,
    format = "html",
    success = true,
    marker = "",
  ) {
    const r = await new Deno.Command(Deno.env.get("QUARTO") ?? "quarto", {
      args: ["render", "index.qmd", "--to", format],
      cwd: root,
      env: { PROJECT_DOWNLOAD_LITERAL_ONLY: "1" },
      stdout: "piped",
      stderr: "piped",
    }).output();
    const text = td.decode(r.stderr);
    rows.push({ name, format, exit: r.code });
    assert(
      r.success === success && (!marker || text.includes(marker)),
      name + ": " + text,
    );
    return r;
  }
  for (
    const [order, format, projection] of [
      ["project-download, course-core", "html", "student"],
      ["course-core, project-download", "html", "student"],
      ["project-download, course-core", "revealjs", "student"],
      ["project-download, course-core", "html", "author"],
    ]
  ) {
    await config(order, projection, format);
    await run(order + "/" + projection, format);
    const html = await Deno.readTextFile(join(root, "_site/index.html"));
    assert(html.includes("_downloads/exr-demo-full.zip"), "demo default full");
    assert(
      !html.includes("project-download-request") &&
        !html.includes("project-download-raw-request") &&
        !html.includes("data-project-download-ordinal"),
      "technical carrier leak",
    );
    if (projection === "student") {
      assert(
        !html.includes("PRIVATE_STATEMENT") &&
          !html.includes("PRIVATE_SOLUTION"),
        "private leak",
      );
    }
    const base = join(root, "_generated/course-spec/native-ts"),
      pointer = JSON.parse(await Deno.readTextFile(join(base, "active.json"))),
      earlyPath = (await files(pointer.directory)).find((p) =>
        p.endsWith(".early.json")
      );
    assert(earlyPath, "early absent");
    const early = JSON.parse(await Deno.readTextFile(earlyPath!)),
      facts = capture.collectNativeProjectFacts(early, root);
    assert(
      facts.projects.length === 3 && facts.projects.some((p: any) =>
        p.exerciseId === "exr-private" && p.statementVisibility === "restricted"
      ) && facts.projects.every((p: any) =>
        p.bankMember === true
      ),
      "raw hidden project facts lost",
    );
  }
  await config("project-download, course-core");
  await Deno.writeTextFile(
    join(root, "index.qmd"),
    '# Отказ\n\n`{{< project-download missing text="Текст" >}}`\n',
  );
  await run(
    "restrictive after genuine early",
    "html",
    false,
    "DOWNLOAD.DELIVERY_PHASE_UNSUPPORTED",
  );
  let invoked = false, error = "";
  try {
    await Core.withCurrentNativeOperation({
      root,
      profiles: [],
      projection: "student",
      outputDirectory: join(root, "_site"),
    }, async () => {
      invoked = true;
    });
  } catch (e) {
    error = String(e);
  }
  assert(
    !invoked && error.includes("OPERATION_INCOMPLETE"),
    "aborted run made usable completion: " + error,
  );
  const afterFailure = await files(join(root, "_generated"));
  assert(
    afterFailure.some((p) => p.endsWith(".early.json")),
    "control did not reach Core early",
  );
  assert(
    !afterFailure.some((p) => p.includes("/project-download/requests/")),
    "restrictive callback wrote Download sidecar",
  );
  // Известная внешняя Core M1 recovery: только точные пустые Quarto support dirs,
  // НЕ изменение продукта/исключение из source fence. Nonrecursive remove сохраняет непустое.
  for (const relative of ["index_files/mediabag", "index_files"]) {
    const path = join(root, relative);
    try {
      const s = await Deno.lstat(path);
      assert(s.isDirectory && !s.isSymlink, "Не native empty directory");
      if ((await Array.fromAsync(Deno.readDir(path))).length === 0) {
        await Deno.remove(path);
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  // Новый реальный pre начинает новый operation/buffer после отказа.
  await Deno.writeTextFile(join(root, "index.qmd"), content);
  await run("retry after error");
  console.log(
    JSON.stringify({
      scope:
        "ordinary genuine native hooks + pure fact projection; no assignment/P",
      rows,
      failedCallbackUnusable: true,
    }),
  );
  const out = Deno.env.get("DOWNLOAD_LITERAL_EVIDENCE");
  if (out) {
    await Deno.mkdir(out, { recursive: true });
    await Deno.writeTextFile(
      join(out, "phase.json"),
      JSON.stringify(rows, null, 2),
    );
  }
} finally {
  if (Deno.env.get("NATIVE_PHASE_KEEP")) console.error("PHASE_ROOT " + root);
  else await Deno.remove(root, { recursive: true });
}
