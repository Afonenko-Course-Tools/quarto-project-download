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
  const starterFiles = ["starter.py", "run.sh", "app.ts", "settings.yaml", "pyproject.toml", "README.md", "starter.lua"];
  for (const name of starterFiles) await Deno.writeTextFile(join(root, "data", name), "PUBLIC_STARTER_" + name);
  await Deno.writeTextFile(root + "/data/private.txt", "PRIVATE");
  await Deno.writeTextFile(root + "/data/source.qmd", "# AUTHORED_INPUT");
  await Deno.writeTextFile(root + "/data/_quarto.yml", "format: html\n");
  await Deno.writeTextFile(root + "/data/service.py", "print('SERVICE_HOOK')\n");
  await Deno.writeTextFile(root + "/data/service.lua", '-- BUILD_SERVICE_SECRET\nreturn {{Pandoc=function(doc) io.stderr:write("OBJECT_FILTER_EXECUTED\\n"); return doc end}}\n');
  await Deno.mkdir(root + "/data/reference");
  await Deno.writeTextFile(root + "/data/reference/answer.py", "PRIVATE_REFERENCE");
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
  render: [index.qmd]
  resources: ["!data/**"]
  pre-render: [${nativeHooks}${prefix}/project-download/entrypoints/pre.ts, "python3 data/service.py"]
  post-render: [${nativePost}${prefix}/project-download/entrypoints/post.ts]
format: html
${active ? "course: {id: course-a, view: student}\n" : ""}filters: [${
      active ? "course-core, " : ""
    }project-download, {path: data/service.lua}]
project-download:
  course-model: ${mode === "namespaced"}
  resources:
    public-data: {path: data, include: [public.txt, starter.py, run.sh, app.ts, settings.yaml, pyproject.toml, README.md, starter.lua]}
    private-data: {path: data, include: [private.txt]}
    course-input: {path: data, include: [source.qmd]}
    build-service: {path: data, include: [service.py]}
    object-filter: {path: data, include: [service.lua]}
    course-config: {path: data, include: [_quarto.yml]}
    private-reference: {path: data/reference}
`,
  );
  const body = `# Materials {#sec-materials}\n\n[Public](data/public.txt)\n\n${
    active ? "::: {.when-full}\n[Hidden](data/private.txt)\n:::\n" : ""
  }\n{{< project-download public-data >}}\n`;
  await Deno.writeTextFile(root + "/index.qmd", body);
  await native(["render", "--profile", "student", "--fail-if-warnings"], true, "OBJECT_FILTER_EXECUTED");
  const zip = new TextDecoder().decode(
    await Deno.readFile(root + "/_site/_downloads/public-data.zip"),
  );
  if (!zip.includes("PUBLIC")) throw Error("public ZIP missing");
  for (const name of starterFiles) if (!zip.includes("PUBLIC_STARTER_" + name)) throw Error("public starter missing: " + name);
  for (const id of ["object-filter", "course-input", "build-service", "course-config", "private-reference"]) {
    await Deno.writeTextFile(root + "/index.qmd", body + "\n{{< project-download " + id + " >}}\n");
    await native(["render", "--profile", "student"], false, "RESOURCE.PRIVATE_OR_SOURCE");
  }
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
