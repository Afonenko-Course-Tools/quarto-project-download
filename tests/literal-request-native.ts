// Реальный reader→Download pre-ast→Core callback; НЕ assignment/admission/P.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
const assert = (v: unknown, m: string) => {
    if (!v) throw Error(m);
  },
  repo = dirname(dirname(fromFileUrl(import.meta.url))),
  core = Deno.env.get("CORE");
assert(core, "CORE source обязателен");
const root = await Deno.makeTempDir({ prefix: "download-literal-" }),
  fixture = join(repo, "tests/fixtures/literal-request");
try {
  await Deno.mkdir(join(root, "bank"));
  await Deno.mkdir(join(root, "test-support/shared/39f0ce0b2a11"), {
    recursive: true,
  });
  await copy(join(fixture, "numbers.qmd"), join(root, "bank/numbers.qmd"));
  await copy(
    join(fixture, "console-io.md"),
    join(root, "test-support/shared/39f0ce0b2a11/console-io.md"),
  );
  await copy(
    join(repo, "_extensions/project-download"),
    join(root, "_extensions/project-download"),
  );
  await copy(
    join(core!, "_extensions/course-core"),
    join(root, "_extensions/course-core"),
  );
  const earlyPath = join(
    root,
    "_extensions/project-download/native-ts/early-filter.lua",
  );
  const early = await Deno.readTextFile(earlyPath);
  await Deno.writeTextFile(
    earlyPath,
    early.replace(
      "local context=transport.context();transport.begin(context.key)",
      `local f=assert(io.open(${
        JSON.stringify(join(root, "before.json"))
      },'wb'));f:write(pandoc.write(doc,'json'));f:close()
 local context=transport.context();transport.begin(context.key)`,
    ).replace(
      " return result",
      ` local f=assert(io.open(${
        JSON.stringify(join(root, "after.json"))
      },'wb'));f:write(pandoc.write(result,'json'));f:close()
 return result`,
    ),
  );
  const path = join(
      root,
      "_extensions/course-core/native-ts/early-context.lua",
    ),
    old = await Deno.readTextFile(path),
    needle =
      "local projected=pandoc.utils.run_json_filter(doc,pandoc.path.join({dir,'early-filter.sh'}),{FORMAT})\n  return projected";
  assert(old.includes(needle), "Изменился actual Core callback");
  await Deno.writeTextFile(
    path,
    old.replace(
      needle,
      `local f=assert(io.open(${
        JSON.stringify(join(root, "observed.json"))
      },'wb'));f:write(pandoc.write(doc,'json'));f:close()\n  return pandoc.Pandoc({},doc.meta) -- Только source observer; не genuine completion\n`,
    ),
  );
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project:\n  type: website\n  output-dir: _site\n  render: [bank/numbers.qmd]\n  pre-render: [quarto run _extensions/course-core/entrypoints/pre.ts]\nformat: {html: {theme: none}}\nfilters: [project-download, course-core]\ncourse: {id: source-probe, view: full}\n",
  );
  const q = await new Deno.Command(
    Deno.env.get("QUARTO") ?? "/opt/quarto/bin/quarto",
    {
      args: ["render", "bank/numbers.qmd"],
      cwd: root,
      env: { PROJECT_DOWNLOAD_LITERAL_ONLY: "1" },
      stdout: "piped",
      stderr: "piped",
    },
  ).output();
  const ast = JSON.parse(await Deno.readTextFile(join(root, "observed.json"))),
    baseline = JSON.parse(
      await Deno.readTextFile(join(root, "before.json")),
    ),
    raw: any[] = [],
    requests: any[] = [];
  function walk(v: any) {
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (!v || typeof v !== "object") return;
    if (v.t === "Span") {
      if (v.c[0][1].includes("quarto-shortcode__")) raw.push(v);
      if (v.c[0][1].includes("project-download-request")) requests.push(v);
    }
    Object.values(v).forEach(walk);
  }
  walk(ast.blocks);
  const out = Deno.env.get("DOWNLOAD_LITERAL_EVIDENCE");
  if (out) {
    await Deno.mkdir(out, { recursive: true });
    await Deno.writeTextFile(
      join(out, "observed.json"),
      JSON.stringify(ast, null, 2),
    );
    await Deno.writeFile(join(out, "quarto.stderr"), q.stderr);
    await Deno.writeTextFile(
      join(out, "shape.json"),
      JSON.stringify(
        {
          quartoExit: q.code,
          rawShortcodes: raw.length,
          inertRequests: requests.length,
          assignment: false,
        },
        null,
        2,
      ),
    );
  }
  assert(
    raw.length === 0 && requests.length === 13,
    `Owner lowering отсутствует: raw=${raw.length}, requests=${requests.length}; ожидались13 inert requests доCore`,
  );
  // Возвращаем исходные reader subtrees только в тестовой копии для точной проверки прочих blocks.
  const original: any[] = [];
  function originals(v: any) {
    if (Array.isArray(v)) {
      v.forEach(originals);
      return;
    }
    if (!v || typeof v !== "object") return;
    if (v.t === "Span" && v.c[0][1].includes("quarto-shortcode__")) {
      original.push(v);
    }
    Object.values(v).forEach(originals);
  }
  originals(baseline.blocks);
  const lowered = JSON.parse(await Deno.readTextFile(join(root, "after.json")));
  let i = 0;
  function undo(v: any): any {
    if (Array.isArray(v)) return v.map(undo);
    if (!v || typeof v !== "object") return v;
    if (v.t === "Span" && v.c[0][1].includes("project-download-request")) {
      const expected = original[i++],
        id = Object.fromEntries(v.c[0][2]).resource;
      assert(
        expected.c[1].filter((x: any) => x.t === "Span").some((x: any) =>
          Object.fromEntries(x.c[0][2])["data-value"] === id
        ),
        "Потерян resource ID",
      );
      return expected;
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, undo(x)]));
  }
  const stable = (v: any): string =>
    JSON.stringify(
      v,
      (_k, x) =>
        x && typeof x === "object" && !Array.isArray(x)
          ? Object.fromEntries(
            Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
          )
          : x,
    );
  assert(
    stable(undo(lowered.blocks)) === stable(baseline.blocks),
    "Lowering изменил посторонние native blocks",
  );
  console.log(
    "PASS actual13 lowerings/inverse blocks, same-callback inverse blocks unchanged; NOT assignment/P",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
