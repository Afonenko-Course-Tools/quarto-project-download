// Малый настоящий render ordinary resource; без Core и полного курса.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";

const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "download-presentation-" });
const htmlOutput = !Deno.args.includes("--gfm");
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
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
`,
  );
  await Deno.writeTextFile(
    join(root, "capture.lua"),
    `local result={callouts={},links={},paragraphs={}}
return {{
 Callout=function(node)
  result.callouts[#result.callouts+1]={text=pandoc.utils.stringify(node.content),type=node.type,appearance=node.appearance,icon=node.icon}
 end,
 Link=function(node)
  if node.classes:includes('project-download') then
   result.links[#result.links+1]={text=pandoc.utils.stringify(node.content),target=node.target,download=node.attributes.download}
  end
 end,
 Para=function(node) result.paragraphs[#result.paragraphs+1]=pandoc.utils.stringify(node) end,
 Pandoc=function(doc)
  local file=assert(io.open('presentation-ast.json','w'));file:write(pandoc.json.encode(result));file:close();return doc
 end
}}
`,
  );
  const started = performance.now();
  const run = await new Deno.Command(Deno.env.get("QUARTO") ?? "quarto", {
    args: ["render", "index.qmd", "--fail-if-warnings"],
    cwd: root,
    env: {
      XDG_CACHE_HOME: join(root, "cache"),
      ...(Deno.args.includes("--literal")
        ? { PROJECT_DOWNLOAD_LITERAL_ONLY: "1" }
        : {}),
    },
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    run.success,
    new TextDecoder().decode(run.stdout) + new TextDecoder().decode(run.stderr),
  );
  const ast = JSON.parse(
    await Deno.readTextFile(join(root, "presentation-ast.json")),
  );
  assert(
    ast.callouts.length === (htmlOutput ? 4 : 3),
    `Неверное число новых и авторских callout: ${JSON.stringify(ast.callouts)}`,
  );
  const generated = ast.callouts.find((node: { text: string }) =>
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
      ast.links.every((link: { target: string; download: string }) =>
        link.target === "_downloads/public-data.zip" && link.download === ""
      ),
    "Потеряны ссылки, href или download",
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
    `PASS: native ${htmlOutput ? "HTML" : "GFM"}, ${
      Deno.args.includes("--literal") ? "literal" : "shortcode"
    }, standalone/inline/авторские callout, href/download и ZIP; ${
      (performance.now() - started).toFixed(0)
    } мс`,
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
