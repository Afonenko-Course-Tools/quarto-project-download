import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  core = Deno.env.get("CORE"),
  qrc = Deno.env.get("QRC");
if (!core || !qrc) throw Error("CORE/QRC required");
const root = await Deno.makeTempDir({ prefix: "down-contract-consumer-" }),
  ext = "_extensions/Afonenko-Course-Tools";
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
const put = async (p: string, s: string) => {
  await Deno.mkdir(dirname(join(root, p)), { recursive: true });
  await Deno.writeTextFile(join(root, p), s);
};
let success = false;
try {
  await Deno.mkdir(join(root, ext), { recursive: true });
  for (
    const [source, name] of [
      [core, "course-core"],
      [qrc, "reference-catalog"],
      [repo, "project-download"],
    ]
  ) {
    const c = await new Deno.Command("cp", {
      args: ["-R", join(source, "_extensions", name), join(root, ext, name)],
    }).output();
    assert(c.success, "install");
  }
  await put(
    "_quarto.yml",
    `project:\n  type: website\n  output-dir: _site\n  render: [index.qmd]\n  pre-render: [quarto run ${ext}/project-download/entrypoints/pre.ts, quarto run ${ext}/course-core/entrypoints/native-pre.ts]\n  post-render: [quarto run ${ext}/course-core/entrypoints/native-post.ts]\nformat:\n  html: {theme: none}\nfilters: [project-download, course-core]\ncourse-core-runtime: native-ts\ncourse-core-source-policy: static\ncourse-core-projection: student\nexercise-bank: true\nproject-download:\n  course-model: true\n  base-url: https://example.test/course/\n`,
  );
  await put(
    "index.qmd",
    ["a", "b"].map((n) =>
      `::: {#exr-${n} project="projects/${n}" difficulty=introductory statement-visibility=open}\nУсловие ${n}.\n\n{{< project-download exr-${n} kind=starter >}}\n:::\n`
    ).join("\n"),
  );
  for (const n of ["a", "b"]) {
    await put(
      `projects/${n}/_metadata.yml`,
      "course-project:\n  starter: {path: starter}\n",
    );
    await put(`projects/${n}/starter/Main.txt`, "PUBLIC " + n + "\n");
  }
  const rendered = await new Deno.Command(
    Deno.env.get("QUARTO") || "/opt/quarto/bin/quarto",
    {
      args: ["render", "index.qmd", "--to", "html"],
      cwd: root,
      env: { QUARTO_RUN_NO_NETWORK: "true", COURSE_SITE_DEFER_DOWNLOADS: "1" },
      stdout: "inherit",
      stderr: "inherit",
    },
  ).output();
  assert(rendered.success, "producer failed");
  const Down = await import(
    toFileUrl(join(root, ext, "project-download/public.ts")).href
  );
  await Down.finishDownloads(root, {
    native: true,
    outputDirectory: join(root, "_site"),
    profiles: [],
  });
  for (const n of ["a", "b"]) {
    const result = await new Deno.Command("unzip", {
      args: [
        "-p",
        join(root, `_site/_downloads/exr-${n}-starter.zip`),
        "Main.txt",
      ],
    }).output();
    assert(
      result.success &&
        new TextDecoder().decode(result.stdout) === "PUBLIC " + n + "\n",
      "ZIP source bytes differ",
    );
  }
  console.log(
    JSON.stringify({
      status: "PASS",
      archives: 2,
      scope:
        "genuine native producer and changed Down public consumer, not wholecourse",
    }),
  );
  success = true;
} finally {
  if (success) await Deno.remove(root, { recursive: true });
  else console.error("retained", root);
}
