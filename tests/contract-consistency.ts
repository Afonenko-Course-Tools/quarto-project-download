import { dirname, fromFileUrl, join } from "stdlib/path";
const root = dirname(dirname(fromFileUrl(import.meta.url))),
  map = await Deno.makeTempFile({ suffix: ".json" });
let scratch: string | undefined;
async function copy(from: string, to: string) {
  await Deno.mkdir(to, { recursive: true });
  for await (const e of Deno.readDir(from)) {
    if (e.isDirectory) await copy(join(from, e.name), join(to, e.name));
    else if (e.isFile) {
      await Deno.copyFile(join(from, e.name), join(to, e.name));
    } else throw Error("Необычный source member");
  }
}
async function check(root: string) {
  return await new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      "--no-lock",
      "--no-config",
      "--import-map",
      map,
      join(root, "tests/contract-types.ts"),
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
}
try {
  const imports: Record<string, string> = {};
  for (const key of ["stdlib/path", "stdlib/fs"]) {
    imports[key] = import.meta.resolve(key).replace(
      /^https:\/\/jsr\.io\/@std\/(path|fs)\/([^/]+)\/mod\.ts$/,
      "jsr:@std/$1@$2",
    );
  }
  await Deno.writeTextFile(map, JSON.stringify({ imports }));
  const current = await check(root);
  if (!current.success) {
    await Deno.stderr.write(current.stderr);
    throw Error("Current public consumer graph не компилируется");
  }
  scratch = await Deno.makeTempDir({ prefix: "contract-runtime-drift-" });
  await copy(join(root, "_extensions"), join(scratch, "_extensions"));
  await Deno.mkdir(join(scratch, "tests"));
  await Deno.copyFile(
    join(root, "tests/contract-types.ts"),
    join(scratch, "tests/contract-types.ts"),
  );
  const file = join(scratch, "_extensions/project-download/domain/config.ts");
  let source = await Deno.readTextFile(file);
  const needle = 'typeof path !== "string" || !path || path === "/"';
  if (!source.includes(needle)) throw Error("Drift probe устарел");
  source = source.replace(needle, 'typeof path !== "number" || !path');
  await Deno.writeTextFile(file, source);
  const drift = await check(scratch),
    diagnostic = new TextDecoder().decode(drift.stderr);
  if (
    drift.success || !diagnostic.includes("contract-types.ts") ||
    !diagnostic.includes("number")
  ) {
    throw Error(
      "Реальный runtime drift не обнаружен consumer typecheck: " + diagnostic,
    );
  }
  console.log(
    JSON.stringify({
      currentExit: current.code,
      driftExit: drift.code,
      consumerDriftCaught: true,
      diagnostic,
    }),
  );
} finally {
  await Deno.remove(map);
  if (scratch) await Deno.remove(scratch, { recursive: true });
}
