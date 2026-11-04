import { sibling } from "../infrastructure/siblings.ts";
import { diagnostic } from "../diagnostics.ts";
import { zip } from "../domain/zip.ts";

/**
 * Один ZIP из публичного inventory Core без чтения проекта и изменения README.
 * Упаковывает переданные bytes, не удостоверяет заявленные size/SHA256.
 * Currentness и финальный source fence принадлежат вызывающей композиции Core.
 */
export async function packageArtifact(value: unknown): Promise<Uint8Array> {
  let supplied;
  try {
    // До lazy import тоже нельзя отдавать caller право изменить будущий ZIP.
    supplied = structuredClone(value);
  } catch (cause) {
    throw diagnostic(
      "DOWNLOAD.INVENTORY_INVALID",
      "Inventory нельзя зафиксировать",
      { field: "inventory" },
      cause,
    );
  }
  const core = await sibling("course-core");
  let inventory;
  try {
    inventory = core.ArtifactInventorySchema.parse(supplied);
  } catch (cause) {
    throw diagnostic(
      "DOWNLOAD.INVENTORY_INVALID",
      "Core inventory не соответствует публичной схеме",
      { field: "inventory" },
      cause,
    );
  }
  // Обычные bytes уже принадлежат раннему snapshot; shared memory отделяется ниже.
  const files = inventory.files;
  const names = new Set<string>();
  for (const file of files) {
    // structuredClone сохраняет общую память SAB: оставляем прежнюю позднюю ownership copy.
    if (file.bytes.buffer instanceof SharedArrayBuffer) {
      file.bytes = new Uint8Array(file.bytes);
    }
    if (names.has(file.target) || file.audience !== inventory.audience) {
      throw diagnostic(
        "DOWNLOAD.INVENTORY_INVALID",
        "Повторный target или чужая аудитория файла inventory",
        { id: file.target, field: "target/audience" },
      );
    }
    names.add(file.target);
  }
  for (const name of names) {
    const parts = name.split("/");
    while (parts.length > 1) {
      parts.pop();
      if (names.has(parts.join("/"))) {
        throw diagnostic(
          "DOWNLOAD.INVENTORY_INVALID",
          "Файл inventory пересекается с каталогом другого файла",
          { id: name, field: "target" },
        );
      }
    }
  }
  files.sort((a, b) => a.target < b.target ? -1 : a.target > b.target ? 1 : 0);
  return zip(files.map((file) => ({
    name: file.target,
    bytes: file.bytes,
  })));
}
