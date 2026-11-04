import { strict as assert } from "node:assert";
import { ArtifactInventorySchema } from "../_extensions/course-core/public.ts";
import { packageArtifact } from "../_extensions/project-download/public.ts";

const inventory = () =>
  ArtifactInventorySchema.parse({
    schema: "course-artifact-inventory-v1",
    operation: "31cb4f31-b746-4ee4-9d07-54d1db192366",
    exerciseId: "exr-package",
    audience: "student",
    files: [{
      target: "README.md",
      sha256: "0".repeat(64),
      size: 999,
      audience: "student",
      reason: "Готовые bytes для упаковки",
      bytes: new Uint8Array([0, 1, 128, 255]),
    }],
  });

Deno.test("Упаковка передаёт точные bytes, не удостоверяя заявленные SHA и размер", async () => {
  const value = inventory();
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

Deno.test("Caller не меняет bytes и target после начала упаковки", async () => {
  const original = inventory();
  const expected = await packageArtifact(original);
  const borrowed = inventory();
  const pending = packageArtifact(borrowed);
  borrowed.files[0].bytes.fill(42);
  borrowed.files[0].target = "other.txt";
  borrowed.files.push({ ...borrowed.files[0], target: "extra.txt" });
  assert.deepEqual(await pending, expected);
});

Deno.test("Упаковка отвергает чужую аудиторию, небезопасный target и collisions", async () => {
  const audience = inventory();
  audience.files[0].audience = "full";
  await assert.rejects(
    () => packageArtifact(audience),
    /DOWNLOAD.INVENTORY_INVALID/,
  );
  const escape = inventory();
  escape.files[0].target = "../private";
  await assert.rejects(
    () => packageArtifact(escape),
    /DOWNLOAD.INVENTORY_INVALID/,
  );
  const duplicate = inventory();
  duplicate.files.push({ ...duplicate.files[0] });
  await assert.rejects(
    () => packageArtifact(duplicate),
    /DOWNLOAD.INVENTORY_INVALID/,
  );
  const ancestor = inventory();
  ancestor.files.push({ ...ancestor.files[0], target: "README.md/nested.txt" });
  await assert.rejects(
    () => packageArtifact(ancestor),
    /DOWNLOAD.INVENTORY_INVALID/,
  );
});

Deno.test("SAB bytes сохраняются в ZIP с корректным CRC после изменения общей памяти", async () => {
  const value = inventory();
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
