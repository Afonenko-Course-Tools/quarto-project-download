const [modulePath, root] = Deno.args;
if (!modulePath || !root) throw Error("Нужны путь модуля и корень fixture");
const {
  resourceFiles,
}: typeof import("project-download/infrastructure/files.ts") = await import(
  modulePath
);
const files = await resourceFiles(root, { path: "data" });
if (
  files.length !== 1 ||
  !files[0] ||
  files[0].name !== "public.csv" ||
  new TextDecoder().decode(files[0].bytes) !== "PUBLIC"
)
  throw Error("Git selection/bytes changed");
console.log("PASS actual Git inherited env");
export {};
