import { required } from "./required.ts";
import { strict as assert } from "node:assert";
import type { ArtifactFiles } from "../_extensions/course-core/public.ts";
import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";

const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const core = Deno.env.get("CORE");
if (!core) throw Error("CORE должен указывать на проверяемый Source Core");
const installed = await Deno.makeTempDir({ prefix: "download-package-files-" });
await Deno.mkdir(join(installed, "_extensions"));
for (
  const [source, name] of [[core, "course-core"], [repo, "project-download"]] as const
) {
  const result = await new Deno.Command("cp", {
    args: [
      "-R",
      join(source, "_extensions", name),
      join(installed, "_extensions", name),
    ],
  }).output();
  if (!result.success) throw Error("Не удалось установить " + name);
}
const { packageArtifact }:
  typeof import("../_extensions/project-download/public.ts") = await import(
    toFileUrl(join(installed, "_extensions/project-download/public.ts")).href
  );
const cases: { name: string; run: () => Promise<void> }[] = [];
function test(name: string, run: () => Promise<void>) {
  cases.push({ name, run });
}

const artifactFiles = (): ArtifactFiles => ({
  exerciseId: "exr-package",
  audience: "student",
  files: [{
    target: "README.md",
    audience: "student",
    reason: "Готовые bytes для упаковки",
    bytes: new Uint8Array([0, 1, 128, 255]),
  }],
});

test("ZIP принимает функциональные файлы без сертификатов и сохраняет точные bytes", async () => {
  const value = artifactFiles();
  const packed = await packageArtifact(value);
  const root = await Deno.makeTempDir({ prefix: "download-package-bytes-" });
  try {
    await Deno.writeFile(root + "/artifact.zip", packed);
    const names = await new Deno.Command("unzip", {
      args: ["-Z1", root + "/artifact.zip"],
      stdout: "piped",
    }).output();
    assert.equal(names.success, true);
    assert.equal(new TextDecoder().decode(names.stdout), "README.md\n");
    const extracted = await new Deno.Command("unzip", {
      args: ["-p", root + "/artifact.zip", "README.md"],
      stdout: "piped",
    }).output();
    assert.equal(extracted.success, true);
    assert.deepEqual(extracted.stdout, new Uint8Array([0, 1, 128, 255]));
    const checked = await new Deno.Command("unzip", {
      args: ["-t", root + "/artifact.zip"],
      stdout: "piped",
    }).output();
    assert.equal(checked.success, true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

test("Caller не меняет bytes и target после начала упаковки", async () => {
  const original = artifactFiles();
  const expected = await packageArtifact(original);
  const borrowed = artifactFiles();
  const pending = packageArtifact(borrowed);
  required(borrowed.files[0]).bytes.fill(42);
  required(borrowed.files[0]).target = "other.txt";
  borrowed.files.push({ ...required(borrowed.files[0]), target: "extra.txt" });
  assert.deepEqual(await pending, expected);
});

test("Упаковка отвергает чужую аудиторию, небезопасный target и collisions", async () => {
  const audience = artifactFiles();
  required(audience.files[0]).audience = "full";
  await assert.rejects(
    () => packageArtifact(audience),
    /DOWNLOAD.FILES_INVALID/,
  );
  const escape = artifactFiles();
  required(escape.files[0]).target = "../private";
  await assert.rejects(
    () => packageArtifact(escape),
    /DOWNLOAD.FILES_INVALID/,
  );
  const duplicate = artifactFiles();
  duplicate.files.push({ ...required(duplicate.files[0]) });
  await assert.rejects(
    () => packageArtifact(duplicate),
    /DOWNLOAD.FILES_INVALID/,
  );
  const ancestor = artifactFiles();
  ancestor.files.push({ ...required(ancestor.files[0]), target: "README.md/nested.txt" });
  await assert.rejects(
    () => packageArtifact(ancestor),
    /DOWNLOAD.FILES_INVALID/,
  );
});

test("SAB bytes сохраняются в ZIP с корректным CRC после изменения общей памяти", async () => {
  const value = artifactFiles();
  const shared = new Uint8Array(new SharedArrayBuffer(4));
  shared.set([9, 8, 7, 6]);
  const supplied = { ...value, files: [{ ...value.files[0], bytes: shared }] };
  const pending = packageArtifact(supplied);
  // Как и прежде, shared memory фиксируется после lazy import, а не ранним clone.
  shared.set([6, 7, 8, 9]);
  const packed = await pending;
  shared.fill(42);
  const root = await Deno.makeTempDir({ prefix: "download-package-shared-" });
  try {
    await Deno.writeFile(root + "/artifact.zip", packed);
    const extracted = await new Deno.Command("unzip", {
      args: ["-p", root + "/artifact.zip", "README.md"],
      stdout: "piped",
    }).output();
    assert.equal(extracted.success, true);
    assert.deepEqual(extracted.stdout, new Uint8Array([6, 7, 8, 9]));
    const checked = await new Deno.Command("unzip", {
      args: ["-t", root + "/artifact.zip"],
      stdout: "piped",
    }).output();
    assert.equal(checked.success, true);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

test("ZIP сохраняет README, src и бинарные resources; private разрешён только full", async () => {
  const files: ArtifactFiles = {
    exerciseId: "exr-package",
    audience: "student",
    files: [
      {
        target: "README.md",
        audience: "student",
        reason: "Условие",
        bytes: new TextEncoder().encode(
          "# Условие\n\n[Источник](https://example.test/task)\n",
        ),
      },
      {
        target: "src/main/java/Task.java",
        audience: "student",
        reason: "Заготовка",
        bytes: new TextEncoder().encode("class Task {}\r\n"),
      },
      {
        target: "resources/data.bin",
        audience: "student",
        reason: "Данные",
        bytes: new Uint8Array([0, 255, 13, 10, 128]),
      },
    ],
  };
  const root = await Deno.makeTempDir({ prefix: "download-package-layout-" });
  try {
    const student = await packageArtifact(files);
    await Deno.writeFile(root + "/student.zip", student);
    for (
      const [name, expected] of [
        [
          "README.md",
          new TextEncoder().encode(
            "# Условие\n\n[Источник](https://example.test/task)\n",
          ),
        ],
        [
          "src/main/java/Task.java",
          new TextEncoder().encode("class Task {}\r\n"),
        ],
        ["resources/data.bin", new Uint8Array([0, 255, 13, 10, 128])],
      ] as const
    ) {
      const extracted = await new Deno.Command("unzip", {
        args: ["-p", root + "/student.zip", name],
      }).output();
      assert.equal(extracted.success, true);
      assert.deepEqual(extracted.stdout, expected);
    }
    const privateFile = {
      target: "solutions/Task.java",
      audience: "student" as const,
      reason: "Решение",
      bytes: new TextEncoder().encode("class Solution {}\n"),
    };
    await assert.rejects(
      () => packageArtifact({ ...files, files: [...files.files, privateFile] }),
      /DOWNLOAD.FILES_INVALID/,
    );
    const full: ArtifactFiles = {
      ...files,
      audience: "full",
      files: [...files.files, privateFile].map((file) => ({
        ...file,
        audience: "full",
      })),
    };
    await Deno.writeFile(root + "/full.zip", await packageArtifact(full));
    const solution = await new Deno.Command("unzip", {
      args: ["-p", root + "/full.zip", "solutions/Task.java"],
    }).output();
    assert.equal(solution.success, true);
    assert.equal(
      new TextDecoder().decode(solution.stdout),
      "class Solution {}\n",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

try {
  for (const item of cases) {
    await item.run();
    console.log("PASS " + item.name);
  }
  console.log(`PASS ${cases.length}/${cases.length} package bytes`);
} finally {
  await Deno.remove(installed, { recursive: true });
}
