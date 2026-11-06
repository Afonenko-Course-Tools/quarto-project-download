// Настоящий inspect, без исполнения hooks и без render/матрицы курса.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
import { finish } from "../_extensions/project-download/infrastructure/runtime.ts";
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "download-source-guards-" });
try {
  await copy(join(repo, "_extensions"), join(root, "_extensions"));
  await Deno.mkdir(join(root, "data"));
  await Deno.writeTextFile(join(root, "index.qmd"), "# Материалы\n");
  await Deno.writeTextFile(
    join(root, "data/hook with spaces.ts"),
    await Deno.readTextFile(join(repo, "tests/fixtures/forbidden-hook.ts")),
  );
  await Deno.writeTextFile(
    join(root, "data/filter with spaces.lua"),
    await Deno.readTextFile(join(repo, "tests/fixtures/empty-filter.lua")),
  );
  await Deno.writeTextFile(join(root, "data/filter string.lua"), await Deno.readTextFile(join(repo, "tests/fixtures/empty-filter.lua")));
  await Deno.writeTextFile(join(root, "data/course style.css"), "body {}\n");
  await Deno.writeTextFile(join(root, "data/public.csv"), "42\n");
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    `project:
  type: website
  output-dir: _site
  pre-render: ['quarto run "data/hook with spaces.ts"']
filters:
  - path: data/filter with spaces.lua
  - data/filter string.lua
course-material: data/public.csv
format:
  html:
    css: data/course style.css
`,
  );
  const directory = join(
    root,
    "_generated/project-download/requests/index.qmd",
  );
  await Deno.mkdir(directory, { recursive: true });
  for (
    const name of [
      "filter with spaces.lua",
      "filter string.lua",
      "hook with spaces.ts",
      "course style.css",
      "public.csv",
    ]
  ) {
    await Deno.writeTextFile(
      join(directory, "request.json"),
      JSON.stringify({
        source: "index.qmd",
        resources: ["materials"],
        configuration: {
          resources: { materials: { path: "/data", include: [name] } },
        },
      }),
    );
    const publicFile = name === "public.csv" || name === "course style.css";
    let error = "";
    try {
      const count = await finish(root);
      if (!publicFile || count !== 1) {
        throw Error("Авторский файл попал в ZIP: " + name);
      }
    } catch (cause) {
      error = String(cause);
    }
    if (
      publicFile ? !!error : !error.includes("RESOURCE.PRIVATE_OR_SOURCE")
    ) {
      throw Error(name + ": " + error);
    }
  }
  console.log(
    "PASS: native filter string/path, quoted hook path; публичные metadata CSV/CSS разрешены, hooks не выполнялись",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
