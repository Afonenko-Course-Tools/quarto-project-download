import { finish } from "../_extensions/project-download/infrastructure/runtime.ts";
import { join } from "stdlib/path";
const root = await Deno.makeTempDir();
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
try {
  await Deno.mkdir(root + "/data");
  await Deno.writeTextFile(root + "/data/private.txt", "PRIVATE");
  await Deno.writeTextFile(root + "/data/public.txt", "PUBLIC");
  await Deno.mkdir(root + "/_generated/project-download/requests", {
    recursive: true,
  });
  await Deno.writeTextFile(
    root + "/_generated/project-download/requests/one.json",
    JSON.stringify({ source: "index.qmd", resources: ["data"] }),
  );
  await Deno.writeTextFile(root + "/index.qmd", "# Index");
  await Deno.writeTextFile(
    root + "/_quarto.yml",
    "project:\n  type: website\n  output-dir: _site\nproject-download:\n  resources:\n    data: {path: data}\n",
  );
  const core = Deno.env.get("CORE")!;
  const policy = await import(
    "file://" + core + "/_extensions/course-core/infrastructure/resources.ts"
  );
  const run: any = {
    projectRoot: root,
    outputDirectory: root + "/_site",
    profiles: ["full"],
    documents: [{
      source: "index.qmd",
      course: { view: "full" },
      resources: {
        source: "index.qmd",
        effectiveBase: root,
        rawUses: ["data/private.txt", "data/public.txt"],
        projectedUses: ["data/public.txt"],
      },
    }],
  };
  let refused = false;
  try {
    await finish(root, { run, evaluateResources: policy.evaluateResources });
  } catch (e) {
    refused = String(e).includes("PRIVATE");
  }
  assert(refused, "full native Download copied hidden-only bytes");
  run.documents = [];
  let stale = false;
  try {
    await finish(root, { run, evaluateResources: policy.evaluateResources });
  } catch (e) {
    stale = String(e).includes("current");
  }
  assert(stale, "request from a stale unselected document accepted");
} finally {
  await Deno.remove(root, { recursive: true });
}
