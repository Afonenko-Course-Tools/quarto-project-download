import { required } from "./required.ts";
import { dirname, fromFileUrl, join } from "stdlib/path";
import { strict as assert } from "node:assert";
import {
  clearOwnedRequests,
  inspectOwnedRequests,
} from "../_extensions/project-download/ownership.ts";

const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "download-request-paths-" });
const longName = "я".repeat(110) + ".qmd";
const sources: [string, string] = ["index.qmd", "nested/" + longName];
const directory = join(root, "_generated/project-download/requests");
const requestPath = (source: string) => join(directory, source, "request.json");
const put = async (path: string, value: string) => {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, value);
};
const body = (source: string) =>
  JSON.stringify({ source, resources: ["materials"] });
async function reset() {
  await Deno.remove(directory, { recursive: true }).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  });
  for (const source of sources) await put(requestPath(source), body(source));
}
async function refused() {
  const original = await Deno.readTextFile(requestPath(sources[0]));
  await assert.rejects(
    () => inspectOwnedRequests(root, sources),
    /DOWNLOAD\.(?:REQUEST|PATH)_INVALID/,
  );
  await assert.rejects(
    () => clearOwnedRequests(root, sources),
    /DOWNLOAD\.(?:REQUEST|PATH)_INVALID/,
  );
  assert.equal(await Deno.readTextFile(requestPath(sources[0])), original);
}
try {
  await reset();
  const state = await inspectOwnedRequests(root, sources);
  assert.deepEqual(
    state.files.map((file) => file.path),
    sources.map(requestPath),
  );
  await put(
    requestPath(sources[0]),
    JSON.stringify({ source: sources[0], resources: [] }),
  );
  assert.deepEqual(
    required((await inspectOwnedRequests(root, sources)).files[0]).resources,
    [],
  );
  const keep = join(root, "_generated/project-download/keep.txt");
  await put(keep, "Соседний файл");
  await clearOwnedRequests(root, sources);
  assert.equal(await Deno.readTextFile(keep), "Соседний файл");
  assert.equal((await inspectOwnedRequests(root, sources)).files.length, 0);

  for (
    const source of [
      "../escape.qmd",
      "./index.qmd",
      "/index.qmd",
      "nested//page.qmd",
      "nested/../index.qmd",
      "nested\\page.qmd",
    ] as const
  ) {
    await assert.rejects(
      () => inspectOwnedRequests(root, [source]),
      /DOWNLOAD\.(?:REQUEST|PATH)_INVALID/,
    );
  }
  for (
    const [path, value] of [
      ["foreign.txt", "Чужой"],
      ["0".repeat(40) + ".json", body(sources[0])],
      ["unknown.qmd/request.json", body("unknown.qmd")],
      ["nested/foreign.txt", "Чужой"],
      [sources[1] + "/other.json", body(sources[1])],
      [sources[1] + "/request.json", body(sources[0])],
      [sources[1] + "/request.json", "{"],
      [
        sources[1] + "/request.json",
        JSON.stringify({ source: sources[1], resources: [], extra: true }),
      ],
    ] as const
  ) {
    await reset();
    await put(join(directory, path), value);
    await refused();
  }
  await reset();
  await Deno.mkdir(join(directory, "foreign"));
  await refused();
  await reset();
  const fifo = join(directory, "pipe");
  assert.equal(
    (await new Deno.Command("mkfifo", { args: [fifo] }).output()).success,
    true,
  );
  await refused();
  for (const path of [join(directory, "nested"), requestPath(sources[1])]) {
    for (const target of [join(root, "absent"), root]) {
      await reset();
      await Deno.remove(path, { recursive: true });
      await Deno.symlink(target, path);
      await refused();
    }
  }
  await reset();
  await clearOwnedRequests(root, sources);
  console.log(
    "PASS request paths: вложенный длинный Unicode source, функциональное чтение, foreign/duplicate/source/path/symlink/special guards, безопасная очистка",
  );

  if (Deno.args[0] !== "pure") {
    await Deno.mkdir(join(root, "_extensions"));
    assert.equal(
      (await new Deno.Command("cp", {
        args: [
          "-R",
          join(repo, "_extensions/project-download"),
          join(root, "_extensions/project-download"),
        ],
      }).output()).success,
      true,
    );
    await put(
      join(root, "_quarto.yml"),
      `project:\n  type: website\n  render: [index.qmd, nested/${longName}]\nformat: {html: {theme: none}}\nfilters: [project-download]\nproject-download:\n  resources:\n    materials: {path: data, gitignore: false}\n`,
    );
    await put(join(root, "index.qmd"), "# Главная\n");
    await put(
      join(root, sources[1]),
      "# Материалы\n\n{{< project-download materials >}}\n",
    );
    await put(join(root, "data/public.txt"), "Данные\n");
    const native = await new Deno.Command(Deno.env.get("QUARTO") || "quarto", {
      args: ["render", "--no-execute"],
      cwd: root,
      env: { QUARTO_RUN_NO_NETWORK: "true" },
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert.equal(native.success, true, new TextDecoder().decode(native.stderr));
    const produced = await inspectOwnedRequests(root, sources);
    assert.deepEqual(
      produced.files.map((file) => file.path),
      sources.map(requestPath),
    );
    assert.deepEqual(produced.files.map((file) => file.resources), [[], [
      "materials",
    ]]);
    await clearOwnedRequests(root, sources);
    assert.equal((await inspectOwnedRequests(root, sources)).files.length, 0);
    console.log(
      "PASS actual Quarto producer→reader: две заявки, nested/Unicode source без хеша, без ZIP и Core",
    );
  }
} finally {
  await Deno.remove(root, { recursive: true });
}
