import { fromFileUrl } from "stdlib/path";
import { configuration } from "../_extensions/project-download/domain/config.ts";
import { zip } from "../_extensions/project-download/domain/zip.ts";
import { publish } from "../_extensions/project-download/application/publish.ts";
import {
  child,
  resourceFiles,
} from "../_extensions/project-download/infrastructure/files.ts";
import { finish } from "../_extensions/project-download/infrastructure/runtime.ts";
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
async function refuses(
  action: () => unknown,
  code: string,
  fragments: string[],
) {
  try {
    await action();
  } catch (error) {
    assert(error instanceof Error, "Отказ должен быть Error");
    const diagnostic = error as Error & { code?: string };
    assert(
      diagnostic.code === code,
      `Ожидался ${code}, получен ${diagnostic.code}: ${diagnostic.message}`,
    );
    for (const text of fragments) {
      assert(
        diagnostic.message.includes(text),
        `Отсутствует контекст ${text}: ${diagnostic.message}`,
      );
    }
    return diagnostic;
  }
  throw Error(`Ожидался отказ ${code}`);
}
const root = await Deno.makeTempDir({ prefix: "download-diagnostics-" });
try {
  await refuses(
    () =>
      configuration({ resources: { data: { path: "/data", unknown: true } } }),
    "DOWNLOAD.CONFIG_INVALID",
    ["data", "unknown"],
  );
  await refuses(() => child(root, "../escape"), "DOWNLOAD.PATH_INVALID", [
    "../escape",
  ]);
  await refuses(
    () => zip([{ name: "../escape", bytes: new Uint8Array() }]),
    "DOWNLOAD.ZIP_INVALID",
    ["../escape"],
  );
  await refuses(
    () => zip(Array(65536).fill({ name: "data", bytes: new Uint8Array() })),
    "DOWNLOAD.ZIP_INVALID",
    ["65536", "65535"],
  );
  await refuses(
    () => zip([{ name: "я".repeat(32768), bytes: new Uint8Array() }]),
    "DOWNLOAD.ZIP_INVALID",
    ["65536", "65535", "0"],
  );
  // Синтетическая длина проверяет guard ZIP32 без выделения нескольких GiB.
  const measuredBytes = (length: number) =>
    ({
      length,
      [Symbol.iterator]: function* () {},
    }) as unknown as Uint8Array;
  await refuses(
    () => zip([{ name: "oversize.bin", bytes: measuredBytes(0x100000000) }]),
    "DOWNLOAD.ZIP_INVALID",
    ["oversize.bin", "4294967296", "4294967295"],
  );
  await refuses(
    () =>
      zip([
        { name: "first.bin", bytes: measuredBytes(0x80000000) },
        { name: "second.bin", bytes: measuredBytes(0x80000000) },
      ]),
    "DOWNLOAD.ZIP_INVALID",
    ["4294967486", "4294967295"],
  );
  await Deno.mkdir(root + "/data");
  await refuses(
    () => resourceFiles(root, { path: "/data" }),
    "DOWNLOAD.SELECTION_EMPTY",
    ["/data"],
  );
  const ports = {
    requests: async () => [{ source: "lesson.qmd", resources: ["data"] }],
    courseResource: async () => {
      throw Error("Не используется");
    },
    files: async () => [],
    save: async () => {
      throw Error("Результат не должен записываться");
    },
  };
  await refuses(
    () => publish({ resources: {} }, [], ports),
    "DOWNLOAD.RESOURCE_UNAVAILABLE",
    ["lesson.qmd", "data"],
  );
  await refuses(
    () =>
      publish(
        { resources: { data: { path: "/data", profiles: ["full"] } } },
        ["student"],
        ports,
      ),
    "DOWNLOAD.RESOURCE_UNAVAILABLE",
    ["lesson.qmd", "data", "student"],
  );
  const fake = root + "/fake-quarto";
  await Deno.writeTextFile(
    fake,
    await Deno.readTextFile(
      new URL("./fixtures/foreign-tool-failure.sh", import.meta.url),
    ),
  );
  await Deno.chmod(fake, 0o755);
  const previous = Deno.env.get("QUARTO");
  Deno.env.set("QUARTO", fake);
  try {
    try {
      await finish(root);
      throw Error("Внешний отказ должен завершить finish");
    } catch (error) {
      const failure = error as Error & {
        tool?: string;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };
      assert(
        failure.name === "ExternalToolFailure",
        "Внешний отказ сохраняет собственный тип",
      );
      assert(
        failure.tool === fake && failure.exitCode === 23,
        "Сохраняются инструмент и exit",
      );
      assert(
        (failure.cause as { code?: number })?.code === 23,
        "Сохраняется исходный CommandOutput как cause",
      );
      assert(
        failure.stdout?.includes("FOREIGN_STDOUT_ID") &&
          failure.stderr?.includes("FOREIGN_STDERR_ID"),
        "Сохраняются оба исходных потока",
      );
      assert(
        failure.message.includes("FOREIGN_STDOUT_ID") &&
          failure.message.includes("FOREIGN_STDERR_ID"),
        "CLI сможет показать оба потока без потери foreign ID",
      );
    }
  } finally {
    if (previous === undefined) Deno.env.delete("QUARTO");
    else Deno.env.set("QUARTO", previous);
  }
  await Deno.writeTextFile(fake, "#!/bin/sh\nprintf '{'\n");
  Deno.env.set("QUARTO", fake);
  try {
    const failure = await refuses(
      () => finish(root),
      "DOWNLOAD.CONFIG_INVALID",
      [root, "inspect"],
    );
    assert(
      failure.cause instanceof SyntaxError,
      "Inspect потерял исходный JSON cause",
    );
  } finally {
    if (previous === undefined) Deno.env.delete("QUARTO");
    else Deno.env.set("QUARTO", previous);
  }
  await Deno.writeTextFile(
    fake,
    await Deno.readTextFile(
      new URL("./fixtures/foreign-tool-failure.sh", import.meta.url),
    ),
  );
  // Существующие исключения программиста не становятся внешней диагностикой.
  try {
    await finish({} as unknown as string);
    throw Error("TypeError expected");
  } catch (error) {
    assert(
      error instanceof TypeError && error.stack?.includes("inspect"),
      "Неизвестный TypeError сохраняет native identity/stack",
    );
  }
  const priorTool = Deno.env.get("QUARTO");
  Deno.env.set("QUARTO", root + "/missing-quarto");
  try {
    try {
      await finish(root);
      throw Error("Startup refusal expected");
    } catch (error) {
      const failure = error as Error & {
        tool?: string;
        exitCode?: number | null;
      };
      assert(
        failure.name === "ExternalToolFailure" &&
          failure.tool === root + "/missing-quarto" &&
          failure.exitCode === null &&
          failure.cause instanceof Deno.errors.NotFound,
        "Отказ запуска сохраняет инструмент и исходную OS cause",
      );
    }
  } finally {
    if (priorTool === undefined) Deno.env.delete("QUARTO");
    else Deno.env.set("QUARTO", priorTool);
  }
  const runner =
    Deno.env.get("QUARTO_TEST_BIN") || Deno.env.get("QUARTO") || "quarto";
  const pre = fromFileUrl(
    new URL(
      "../_extensions/project-download/entrypoints/post.ts",
      import.meta.url,
    ),
  );
  const cli = await new Deno.Command(runner, {
    args: ["run", pre],
    cwd: root,
    env: { QUARTO: fake },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const cliText =
    new TextDecoder().decode(cli.stdout) + new TextDecoder().decode(cli.stderr);
  assert(
    !cli.success && cliText.includes("23"),
    "CLI завершился неуспешно и сохранил foreign exit",
  );
  for (const marker of ["FOREIGN_STDOUT_ID", "FOREIGN_STDERR_ID"]) {
    assert(
      cliText.split(marker).length - 1 === 1,
      "CLI печатает foreign marker один раз: " + cliText,
    );
  }
  assert(
    !cliText.includes("Uncaught"),
    "Ожидаемый foreign отказ не получает повторный native stack: " + cliText,
  );
  const fakeBin = root + "/bin";
  await Deno.mkdir(fakeBin);
  const git = fakeBin + "/git";
  await Deno.writeTextFile(
    git,
    await Deno.readTextFile(
      new URL("./fixtures/git-failure.sh", import.meta.url),
    ),
  );
  await Deno.chmod(git, 0o755);
  await Deno.writeTextFile(root + "/data/sample.csv", "1,2");
  const many = root + "/many";
  await Deno.mkdir(many);
  // Список совпадений превышает буфер stdout, пока Git ещё читает stdin.
  for (let i = 0; i < 700; i++) {
    await Deno.writeTextFile(
      many + "/" + String(i).padStart(4, "0") + "-" + "x".repeat(230) + ".csv",
      "1",
    );
  }
  const path = Deno.env.get("PATH")!;
  Deno.env.set("PATH", fakeBin + ":" + path);
  try {
    try {
      await resourceFiles(root, { path: "/data" });
      throw Error("Git refusal expected");
    } catch (error) {
      const failure = error as Error & {
        tool?: string;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };
      assert(
        failure.name === "ExternalToolFailure" &&
          failure.tool === "git" &&
          failure.exitCode === 17,
        "Git failure keeps type/tool/exit",
      );
      assert(
        failure.stdout?.includes("GIT_STDOUT_ID") &&
          failure.stderr?.includes("GIT_STDERR_ID"),
        "Git failure keeps both streams",
      );
    }
    await Deno.writeTextFile(
      git,
      await Deno.readTextFile(
        new URL("./fixtures/git-early-failure.sh", import.meta.url),
      ),
    );
    try {
      await resourceFiles(root, { path: "/many" });
      throw Error("Early Git refusal expected");
    } catch (error) {
      const failure = error as Error & {
        tool?: string;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
      };
      assert(
        failure.name === "ExternalToolFailure" &&
          failure.exitCode === 19 &&
          failure.stdout?.includes("GIT_EARLY_STDOUT") &&
          failure.stderr?.includes("GIT_EARLY_STDERR"),
        "Ранний отказ Git сохраняет exit и оба потока при закрытом stdin: " +
          failure,
      );
    }
    await Deno.writeTextFile(
      git,
      await Deno.readTextFile(
        new URL("./fixtures/git-warning.sh", import.meta.url),
      ),
    );
    const files = await resourceFiles(root, { path: "/data" });
    assert(
      files.length === 1,
      "Git check-ignore exit1 remains no matches, warning allowed",
    );
  } finally {
    Deno.env.set("PATH", path);
  }
  await Deno.writeTextFile(
    root + "/.gitignore",
    "/many/*.csv\n!/many/allowed.csv\n",
  );
  await Deno.writeTextFile(many + "/allowed.csv", "2");
  const selected = await resourceFiles(root, { path: "/many" });
  assert(
    selected.length === 1 && selected[0]?.name === "allowed.csv",
    "Git отбирает разрешённый файл при большом списке игнорируемых путей",
  );
  console.log(
    "PASS Download named context, ZIP boundary, unavailable profile, foreign process streams/exit",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
