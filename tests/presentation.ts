import { required } from "./required.ts";
// Малый настоящий render ordinary resource; без Core и полного курса.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";

const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "download-presentation-" });
const htmlOutput = !Deno.args.includes("--gfm");
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}
function presentation(value: unknown) {
  if (!record(value) || !Array.isArray(value.callouts) || !Array.isArray(value.links) || !strings(value.paragraphs)) throw Error("Некорректный presentation AST");
  const callouts = value.callouts.map((node: unknown) => {
    if (!record(node) || typeof node.text !== "string") throw Error("Некорректный callout AST");
    return node;
  });
  const links = value.links.map((link: unknown) => {
    if (!record(link) || typeof link.target !== "string" || typeof link.download !== "string") throw Error("Некорректный link AST");
    return link;
  });
  return { callouts, links, paragraphs: value.paragraphs };
}
function wrapperList(value: unknown) {
  if (!Array.isArray(value)) throw Error("Некорректный wrapper AST");
  return value.map((node: unknown) => {
    if (!record(node) || typeof node.links !== "number" || typeof node.text !== "string") throw Error("Некорректный wrapper AST");
    return { links: node.links, text: node.text };
  });
}
try {
  await copy(join(repo, "_extensions"), join(root, "_extensions"));
  await Deno.mkdir(join(root, "data"));
  await Deno.writeTextFile(join(root, "data/public.csv"), "значение\n42\n");
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    `project:
  type: website
  output-dir: _site
  render: [index.qmd]
  resources: ["!data/**"]
  pre-render: _extensions/project-download/entrypoints/pre.ts
  post-render: _extensions/project-download/entrypoints/post.ts
format: ${htmlOutput ? "html" : "gfm"}
filters:
  - project-download
  - at: post-quarto
    path: capture.lua
  - at: post-render
    path: capture-final.lua
project-download:
  resources:
    public-data: {path: /data}
`,
  );
  await Deno.writeTextFile(
    join(root, "index.qmd"),
    `# Материалы

{{< project-download public-data text="Комплект" >}}

До {{< project-download public-data text="В предложении" >}} после.

::: {.callout-note title="Авторский блок"}
{{< project-download public-data text="Внутри блока" >}}
:::

::: {.callout appearance="minimal"}
::: {.inner}
{{< project-download public-data text="Во вложенном блоке" >}}
:::
:::

::: {.callout-note}
# {{< project-download public-data text="Заголовок блока" >}}

Содержание авторского блока.
:::

::: {.content-visible when-format=revealjs}
{{< project-download missing text="Скрытый запрос" >}}
:::
`,
  );
  await Deno.writeTextFile(
    join(root, "capture.lua"),
    await Deno.readTextFile(join(repo, "tests/fixtures/presentation-capture.lua")),
  );
  // Проверяем semantic role после штатного HTML renderer, без чтения HTML-разметки.
  await Deno.writeTextFile(
    join(root, "capture-final.lua"),
    await Deno.readTextFile(join(repo, "tests/fixtures/presentation-final.lua")),
  );
  const started = performance.now();
  const run = await new Deno.Command(Deno.env.get("QUARTO") ?? "quarto", {
    args: ["render", "index.qmd", "--fail-if-warnings"],
    cwd: root,
    env: {
      XDG_CACHE_HOME: join(root, "cache"),
    },
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    run.success,
    new TextDecoder().decode(run.stdout) + new TextDecoder().decode(run.stderr),
  );
  const ast = presentation(JSON.parse(
    await Deno.readTextFile(join(root, "presentation-ast.json")),
  ));
  assert(
    ast.callouts.length === (htmlOutput ? 4 : 3),
    `Неверное число новых и авторских callout: ${JSON.stringify(ast.callouts)}`,
  );
  const generated = ast.callouts.find((node) =>
    node.text === "⤓ Комплект"
  );
  assert(
    htmlOutput
      ? generated?.type === "none" && generated.appearance === "simple" &&
        generated.icon === false
      : !generated,
    "Отдельный shortcode должен стать штатным минимальным callout без стандартной иконки",
  );
  assert(
    ast.paragraphs.includes("До В предложении после."),
    "Inline shortcode разорвал предложение",
  );
  assert(
    ast.links.length === 5 &&
      ast.links.every((link) =>
        link.target === "_downloads/public-data.zip" && link.download === ""
      ),
    "Потеряны ссылки, href или download",
  );
  const wrappers = wrapperList(JSON.parse(
    await Deno.readTextFile(join(root, "presentation-final-ast.json")),
  ));
  assert(
    wrappers.length === (htmlOutput ? 1 : 0) &&
      (!htmlOutput ||
        required(wrappers[0]).links === 1 && required(wrappers[0]).text.includes("⤓ Комплект")),
    "Semantic role Download должна сохраняться на целом native блоке, не на авторских callout",
  );
  if (htmlOutput) {
    const html = await Deno.readTextFile(join(root, "_site/index.html"));
    assert(
      html.includes("⤓") && html.includes('class="callout-body') &&
        html.includes("В предложении"),
      "Штатный Quarto renderer не вывел callout и ссылки",
    );
  }
  assert(
    (await Deno.stat(join(root, "_site/_downloads/public-data.zip"))).size > 0,
    "Архив не опубликован",
  );
  console.log(
    `PASS: native ${
      htmlOutput ? "HTML" : "GFM"
    }, shortcode, standalone/inline/авторские callout, href/download и ZIP; ${
      (performance.now() - started).toFixed(0)
    } мс`,
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
