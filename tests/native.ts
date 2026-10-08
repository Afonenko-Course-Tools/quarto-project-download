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
        format: "html",
        view: "full",
        effectiveBase: root,
        outputDirectory: root + "/_site",
        outputFile: "index.html",
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
  await Deno.writeTextFile(root+"/_quarto.yml","project:\n  type: website\n  output-dir: _site\nproject-download:\n  resources:\n    data: {path: data, include: [public.txt]}\n");
  await Deno.mkdir(root+"/_site/_downloads",{recursive:true});
  const foreignArchive=root+"/_site/_downloads/data.zip";
  await Deno.writeTextFile(foreignArchive,"FOREIGN_ZIP_BYTES");
  let collision=false;
  try { await finish(root,{run,evaluateResources:policy.evaluateResources}); }
  catch(error) { collision=error instanceof Error && (error as Error & {code?:string}).code==="DOWNLOAD.OUTPUT_CONFLICT" && error.message.includes("data.zip"); }
  assert(collision && await Deno.readTextFile(foreignArchive)==="FOREIGN_ZIP_BYTES","Конфликт ZIP сохраняет ID, путь и чужие байты");
  run.documents = [];
  let stale = false;
  try {
    await finish(root, { run, evaluateResources: policy.evaluateResources });
  } catch (e) {
    stale = e instanceof Error && (e as Error & {code?:string}).code === "DOWNLOAD.REQUEST_INVALID" && e.message.includes("index.qmd");
  }
  assert(stale, "request from a stale unselected document accepted");
  // Canonical exercises are raw facts, never a substitute for website projection.
  await Deno.mkdir(root + "/projects/demo/student", { recursive: true });
  await Deno.writeTextFile(root + "/projects/demo/student/Main.py", "PUBLIC_STARTER");
  await Deno.remove(foreignArchive);
  await Deno.writeTextFile(root + "/_quarto.yml", "project:\n  type: website\n  output-dir: _site\nproject-download:\n  course-model: true\n");
  await Deno.writeTextFile(root + "/_generated/project-download/requests/one.json", JSON.stringify({ source: "index.qmd", resources: ["exr-demo"] }));
  run.profiles = ["student"];
  run.documents = [{ source: "index.qmd", course: { view: "student" }, exercises: [{ id: "exr-demo", project: "/projects/demo", statementVisibility: "restricted" }] }];
  let missingProjection = false;
  try { await finish(root, { run, evaluateResources: async () => {} }); }
  catch (error) { missingProjection = error instanceof Error && (error as Error & {code?:string}).code === "DOWNLOAD.RESOURCE_UNAVAILABLE"; }
  assert(missingProjection, "raw restricted exercise substituted for missing publicExercises projection");
  run.documents[0].body = { publicExercises: [{ id: "exr-demo", project: "/projects/demo", statementVisibility: "open" }] };
  assert(await finish(root, { run, evaluateResources: async () => {} }) === 1, "explicit public exercise starter was not archived");

} finally {
  await Deno.remove(root, { recursive: true });
}
