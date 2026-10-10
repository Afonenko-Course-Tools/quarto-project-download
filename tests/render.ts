import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  root = await Deno.makeTempDir({ prefix: "download-render-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
function assert(v: unknown, m: string) {
  if (!v) throw Error(m);
}
async function render(profile: string, success = true) {
  const r = await new Deno.Command(quarto, {
    args: ["render", "--profile", profile, "--fail-if-warnings"],
    cwd: root,
    env: { CUE: "не-должен-вызываться" },
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    r.success === success,
    new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr),
  );
  return r;
}
try {
  await copy(join(repo, "_extensions"), join(root, "_extensions"));
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(root + "/data/public.csv", "1,2\n");
  await Deno.mkdir(root + "/nested");
  await Deno.writeTextFile(
    root + "/_quarto.yml",
    `project:
  type: website
  output-dir: _site
  render: [index.qmd, nested/page.qmd]
  resources: ["!data/**"]
  pre-render: _extensions/project-download/entrypoints/pre.ts
  post-render: _extensions/project-download/entrypoints/post.ts
format: html
filters: [project-download]
project-download:
  resources:
    public-data: {path: /data}
    private-data: {path: /data, profiles: [full]}
`,
  );
  await Deno.writeTextFile(root + "/index.qmd", "# Материалы\n");
  const body =
    '# Данные\n\n{{< project-download public-data text="" >}}\n\n::: {.content-visible when-profile="full"}\n{{< project-download private-data >}}\n:::\n';
  await Deno.writeTextFile(root + "/nested/page.qmd", body);
  for (const profile of ["full", "student"]) {
    await Deno.writeTextFile(root + `/_quarto-${profile}.yml`, "lang: ru\n");
  }
  await render("full");
  assert(
    (await Deno.stat(root + "/_site/_downloads/private-data.zip")).size > 0,
    "Архив full",
  );
  await render("student");
  let absent = false;
  try {
    await Deno.stat(root + "/_site/_downloads/private-data.zip");
  } catch {
    absent = true;
  }
  assert(absent, "Архив скрытого профиля остался");
  const html = await Deno.readTextFile(root + "/_site/nested/page.html");
  assert(
    html.includes('href="../_downloads/public-data.zip"') &&
      !html.includes("private-data"),
    "Относительная ссылка и отбор профиля",
  );
  assert(/class="project-download"[^>]*>Скачать материалы<\/a>/.test(html), "Empty caption must produce an accessible link name");
  // Координатор может переопределить output-dir за пределами исходников.
  const outside = await Deno.makeTempDir({ prefix: "download-output-" });
  try {
    const redirected = await new Deno.Command(quarto, {
      args: ["render", "--profile", "student", "--output-dir", outside],
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(redirected.success, new TextDecoder().decode(redirected.stderr));
    assert(
      (await Deno.stat(outside + "/_downloads/public-data.zip")).size > 0,
      "Архив не учитывает output-dir координатора",
    );
  } finally {
    await Deno.remove(outside, { recursive: true });
  }
  await Deno.writeTextFile(root + "/nested/page.qmd", body);
  await render("student");
  await Deno.writeTextFile(
    root + "/nested/page.qmd",
    "# Ошибка\n\n{{< project-download missing >}}\n",
  );
  const invalid = await render("student", false);
  const diagnostics = new TextDecoder().decode(invalid.stderr);
  assert(diagnostics.includes("DOWNLOAD.RESOURCE_UNAVAILABLE") && diagnostics.includes("nested/page.qmd") && diagnostics.includes("missing"), "Нативный guard содержит ID, исходник и ресурс: "+diagnostics);
  absent = false;
  try {
    await Deno.stat(root + "/_site/_downloads/public-data.zip");
  } catch {
    absent = true;
  }
  assert(absent, "Старый архив пережил ошибку новой сборки");
  await Deno.writeTextFile(root+"/nested/page.qmd", "# Ошибка параметра\n\n{{< project-download public-data unknown=1 >}}\n");
  const invalidParameter=await render("student",false);
  const parameterDiagnostics=new TextDecoder().decode(invalidParameter.stderr);
  assert(parameterDiagnostics.includes("DOWNLOAD.REQUEST_INVALID") && parameterDiagnostics.includes("unknown") && parameterDiagnostics.includes("nested/page.qmd"),"Shortcode guard завершает рендер и сохраняет ID/поле/исходник: "+parameterDiagnostics);
  console.log(
    "Quarto: независимость от Core/CUE, вложенные ссылки, full → student, очистка после ошибки проверены.",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
