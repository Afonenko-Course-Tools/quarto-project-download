// Старые private Core doubles заменены actual public operation controls.
import { dirname, fromFileUrl, join } from "stdlib/path";
if (Deno.args[0] !== "no-core-ordinary") {
  await import("./public-runtime.ts");
} else {
  const repo = dirname(dirname(fromFileUrl(import.meta.url))),
    root = await Deno.makeTempDir({ prefix: "download-no-core-" });
  try {
    await Deno.mkdir(join(root, "_extensions"));
    const copied = await new Deno.Command("cp", {
      args: [
        "-R",
        join(repo, "_extensions/project-download"),
        join(root, "_extensions/project-download"),
      ],
    }).output();
    if (!copied.success) throw Error("Установка Download");
    await Deno.mkdir(join(root, "data"));
    await Deno.writeTextFile(
      join(root, "data/public.txt"),
      "PUBLIC_WITHOUT_CORE\n",
    );
    await Deno.writeTextFile(
      join(root, "_quarto.yml"),
      "project:\n  type: website\n  output-dir: _site\n  pre-render: [quarto run _extensions/project-download/entrypoints/pre.ts]\n  post-render: [quarto run _extensions/project-download/entrypoints/post.ts]\nformat: html\nfilters: [project-download]\nproject-download:\n  resources:\n    data: {path: data, gitignore: false}\n",
    );
    await Deno.writeTextFile(
      join(root, "index.qmd"),
      "# Ресурс\n\n{{< project-download data >}}\n",
    );
    const rendered = await new Deno.Command("quarto", {
      args: ["render"],
      cwd: root,
      env: { QUARTO_RUN_NO_NETWORK: "true" },
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!rendered.success) {
      throw Error(new TextDecoder().decode(rendered.stderr));
    }
    const extracted = await new Deno.Command("unzip", {
      args: ["-p", join(root, "_site/_downloads/data.zip"), "public.txt"],
      stdout: "piped",
    }).output();
    if (
      !extracted.success ||
      !new TextDecoder().decode(extracted.stdout).includes(
        "PUBLIC_WITHOUT_CORE",
      )
    ) throw Error("NoCore потерял resource bytes");
    console.log("PASS no-core-ordinary actual native pre/post без Core");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}
