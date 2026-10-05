import { join } from "stdlib/path";
const mode = Deno.args[0] || "namespaced";
const root = await Deno.makeTempDir({ prefix: "download-install-context-" });
const quarto = Deno.env.get("QUARTO") || "quarto",
  repo = Deno.cwd(),
  core = Deno.env.get("CORE")!;
async function native(args: string[], success = true, expected = "") {
  const p = await new Deno.Command(quarto, {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(p.stdout) +
    new TextDecoder().decode(p.stderr);
  if (p.success !== success || expected && !text.includes(expected)) {
    throw Error(text);
  }
}
try {
  await native(["add", core, "--no-prompt"]);
  await native(["add", repo, "--no-prompt"]);
  let prefix = "_extensions";
  if (mode === "namespaced") {
    // Offline actual-add delivery is moved intact to Quarto's GitHub provider layout.
    const namespace = join(root, "_extensions/Afonenko-Course-Tools");
    await Deno.mkdir(namespace);
    for (const name of ["course-core", "project-download"]) {
      await Deno.rename(join(root, "_extensions", name), join(namespace, name));
    }
    prefix = "_extensions/Afonenko-Course-Tools";
  }
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(root + "/data/public.txt", "PUBLIC");
  await Deno.writeTextFile(root + "/data/private.txt", "PRIVATE");
  const active = mode !== "plain";
  const nativeHooks = active
    ? `${prefix}/course-core/entrypoints/pre.ts, `
    : "";
  const nativePost = active
    ? `${prefix}/course-core/entrypoints/post.ts, `
    : "";
  await Deno.writeTextFile(
    root + "/_quarto.yml",
    `project:
  type: website
  output-dir: _site
  resources: ["!data/**"]
  pre-render: [${nativeHooks}${prefix}/project-download/entrypoints/pre.ts]
  post-render: [${nativePost}${prefix}/project-download/entrypoints/post.ts]
format: html
${active ? "course: {id: course-a, view: student}\n" : ""}filters: [${
      active ? "course-core, " : ""
    }project-download]
project-download:
  course-model: ${mode === "namespaced"}
  resources:
    public-data: {path: data, include: [public.txt]}
    private-data: {path: data, include: [private.txt]}
`,
  );
  const body = `# Materials {#sec-materials}\n\n[Public](data/public.txt)\n\n${
    active ? "::: {.when-full}\n[Hidden](data/private.txt)\n:::\n" : ""
  }\n{{< project-download public-data >}}\n`;
  await Deno.writeTextFile(root + "/index.qmd", body);
  await native(["render", "--profile", "student", "--fail-if-warnings"]);
  const zip = new TextDecoder().decode(
    await Deno.readFile(root + "/_site/_downloads/public-data.zip"),
  );
  if (!zip.includes("PUBLIC")) throw Error("public ZIP missing");
  if (active) {
    await Deno.writeTextFile(
      root + "/index.qmd",
      body + "\n{{< project-download private-data >}}\n",
    );
    await native(
      ["render", "--profile", "student"],
      false,
      "RESOURCE.PRIVATE_OR_SOURCE",
    );
  }
  console.log("PASS installed Download context: " + mode);
} finally {
  await Deno.remove(root, { recursive: true });
}
