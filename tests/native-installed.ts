import { join } from "stdlib/path";
const root = await Deno.makeTempDir({ prefix: "download-native-installed-" });
const repo = Deno.cwd(), core = Deno.env.get("CORE")!;
const quarto = Deno.env.get("QUARTO") || "quarto";
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
async function native(args: string[], success = true) {
  const result = await new Deno.Command(quarto, {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    result.success === success,
    new TextDecoder().decode(result.stdout) +
      new TextDecoder().decode(result.stderr),
  );
}
try {
  await native(["add", core, "--no-prompt"]);
  await native(["add", repo, "--no-prompt"]);
  await Deno.mkdir(root + "/projects/demo/student", { recursive: true });
  await Deno.mkdir(root + "/projects/demo/reference", { recursive: true });
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(
    root + "/projects/demo/student/Main.java",
    "PUBLIC_STARTER",
  );
  await Deno.writeTextFile(
    root + "/projects/demo/reference/Secret.java",
    "PRIVATE_SOLUTION",
  );
  await Deno.writeTextFile(root + "/data/public.txt", "PUBLIC_DATA");
  await Deno.writeTextFile(root + "/data/private.txt", "PRIVATE_RESOURCE");
  await Deno.writeTextFile(
    root + "/_quarto.yml",
    `project:
  type: website
  output-dir: _site
  render: [index.qmd, other.qmd]
  resources: ["!projects/**", "!data/**"]
  pre-render: [_extensions/course-core/entrypoints/pre.ts, _extensions/project-download/entrypoints/pre.ts]
  post-render: [_extensions/course-core/entrypoints/post.ts, _extensions/project-download/entrypoints/post.ts]
format: html
course: {id: course-a}
filters: [course-core, project-download]
project-download:
  course-model: true
  resources:
    public-data: {path: data, include: [public.txt]}
    private-data: {path: data, include: [private.txt]}
`,
  );
  for (const view of ["full", "student"]) {
    await Deno.writeTextFile(
      root + `/_quarto-${view}.yml`,
      `course: {view: ${view}}\nproject: {output-dir: _site-${view}}\n`,
    );
  }
  const body = `# Native projects {#sec-projects}

::: {#exr-demo target="manual" project="/projects/demo" course-role="independent-study" difficulty="introductory"}
## Starter
PUBLIC_TASK

{{< project-download exr-demo >}}
:::

[Public](data/public.txt)

::: {.content-visible when-profile="full"}
[Hidden](data/private.txt)
:::

{{< project-download public-data >}}
`;
  await Deno.writeTextFile(root + "/index.qmd", body);
  await Deno.writeTextFile(root + "/other.qmd", "# Other {#sec-other}\n");
  for (const view of ["student", "full", "student"]) {
    await native(["render", "--profile", view, "--fail-if-warnings"]);
    const zip = new TextDecoder().decode(
      await Deno.readFile(root + `/_site-${view}/_downloads/exr-demo.zip`),
    );
    assert(
      zip.includes("PUBLIC_STARTER") && !zip.includes("PRIVATE_SOLUTION"),
      "private starter sibling leaked",
    );
  }
  // Selected native document produces current request/result inventory, ignoring retained pages.
  await Deno.writeTextFile(
    root + "/other.qmd",
    "# Selected other {#sec-other}\n",
  );
  await native([
    "render",
    "other.qmd",
    "--profile",
    "student",
    "--fail-if-warnings",
  ]);
  let absent = false;
  try {
    await Deno.stat(root + "/_site-student/_downloads/exr-demo.zip");
  } catch {
    absent = true;
  }
  assert(absent, "unselected retained exercise ZIP survived");
  await Deno.writeTextFile(
    root + "/index.qmd",
    body + "\n{{< project-download private-data >}}\n",
  );
  await native(["render", "index.qmd", "--profile", "full"], false);
  await Deno.writeTextFile(root + "/index.qmd", body);
  await Deno.remove(root + "/data/public.txt");
  await native(["render", "index.qmd", "--profile", "student"], false);
  console.log(
    "PASS installed current selected-document ZIP, public policy in full, missing generated/current resource, retry and isolation",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
