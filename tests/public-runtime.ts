import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const core = Deno.env.get("CORE"), qrc = Deno.env.get("QRC");
if (!core || !qrc) throw Error("Нужны immutable CORE и QRC");
const root = await Deno.makeTempDir({ prefix: "download-public-runtime-" });
const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
const ext = "_extensions/Afonenko-Course-Tools";
async function put(path: string, text: string) {
  await Deno.mkdir(dirname(join(root, path)), { recursive: true });
  await Deno.writeTextFile(join(root, path), text);
}
async function install(source: string, name: string) {
  const result = await new Deno.Command("cp", {
    args: ["-R", join(source, "_extensions", name), join(root, ext, name)],
  }).output();
  assert(result.success, "Установка " + name);
  await new Deno.Command("chmod", {
    args: ["-R", "u+w", join(root, ext, name)],
  }).output();
}
async function render(expected = true, marker = "") {
  const result = await new Deno.Command("quarto", {
    args: ["render", "--to", "html"],
    cwd: root,
    env: { QUARTO_RUN_NO_NETWORK: "true" },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(result.stdout) +
    new TextDecoder().decode(result.stderr);
  await Deno.mkdir(join(root, "_generated"), { recursive: true });
  await Deno.writeTextFile(join(root, "_generated/download-render.log"), text);
  assert(
    result.success === expected && (!marker || text.includes(marker)),
    "Реальный runtime отказал: " + root + "\n" + text,
  );
}
try {
  await Deno.mkdir(join(root, ext), { recursive: true });
  await install(core, "course-core");
  await install(qrc, "reference-catalog");
  await install(repo, "project-download");
  await put(
    "_quarto.yml",
    `project:\n  type: website\n  output-dir: _site\n  render: [index.qmd, other.qmd]\n  pre-render: [quarto run ${ext}/project-download/entrypoints/pre.ts, quarto run ${ext}/course-core/entrypoints/native-pre.ts]\n  post-render: [quarto run ${ext}/course-core/entrypoints/native-post.ts, quarto run ${ext}/project-download/entrypoints/post.ts --native]\nformat:\n  html:\n    theme: none\nfilters: [project-download, course-core]\ncourse-core-runtime: native-ts\ncourse-core-projection: student\nexercise-bank: true\nproject-download:\n  course-model: true\n  base-url: https://pages.example.test/course/\n  resources:\n    data: {path: assets, gitignore: false}\ncourse-project:\n  build:\n    files:\n      build.gradle: shared/build.gradle\n      settings.gradle: shared/settings.gradle\n  instructions:\n    gradle: {path: shared/gradle.md}\n`,
  );
  await put("shared/build.gradle", "plugins { id 'java' }\n");
  await put("shared/settings.gradle", "rootProject.name='runtime'\n");
  await put("shared/gradle.md", "JDK25. Выполните `gradle test`.\n");
  await put(
    "projects/demo/_metadata.yml",
    "course-project:\n  starter: {path: starter}\n  solutions:\n    reference: {path: reference}\n",
  );
  await put(
    "projects/demo/starter/src/main/java/Main.java",
    "class Main {} // STUDENT\n",
  );
  await put(
    "projects/demo/reference/src/main/java/Main.java",
    "class Main {} // REFERENCE\n",
  );
  await put("assets/public.txt", "PUBLIC_RESOURCE_1\n");
  await put(
    "private.svg",
    '<svg xmlns="http://www.w3.org/2000/svg"><text>PRIVATE_RESOURCE</text></svg>',
  );
  await put("other.qmd", "# Другая страница {#target}\n");
  const statement =
    `# Проверка\n\n::: {#exr-demo difficulty=introductory statement-visibility=open course-role=demonstration project="projects/demo"}\nУсловие. [Другая страница](other.qmd#target).\n\n{{< project-download exr-demo kind=starter >}}\n\n{{< project-download exr-demo kind=full >}}\n\n![Материал](assets/public.txt)\n\n::: {.solution}\nОткрытый пример решения.\n:::\n\n:::\n\n{{< project-download data >}}\n`;
  await put("index.qmd", statement);
  await render();
  const starter = join(root, "_site/_downloads/exr-demo-starter.zip"),
    full = join(root, "_site/_downloads/exr-demo-full.zip");
  for (const path of [starter, full, join(root, "_site/_downloads/data.zip")]) {
    assert((await Deno.stat(path)).isFile, "Нет actual ZIP " + path);
  }
  const extract = async (path: string, file: string) => {
    const result = await new Deno.Command("unzip", {
      args: ["-p", path, file],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(result.success, "Нет файла ZIP " + file);
    return new TextDecoder().decode(result.stdout);
  };
  const readme = await extract(starter, "README.md");
  assert(
    readme.includes("https://pages.example.test/course/other.html#target") &&
      readme.includes(
        "https://pages.example.test/course/_downloads/exr-demo-starter.zip",
      ),
    "Конечные адреса README потеряны",
  );
  const names = await new Deno.Command("unzip", {
    args: ["-Z1", starter],
    stdout: "piped",
  }).output();
  assert(
    !new TextDecoder().decode(names.stdout).includes("author/"),
    "В starter попало решение",
  );
  assert(
    (await extract(full, "author/reference/src/main/java/Main.java")).includes(
      "REFERENCE",
    ),
    "Full artifact не содержит решения",
  );
  assert(
    (await extract(join(root, "_site/_downloads/data.zip"), "public.txt"))
      .includes("PUBLIC_RESOURCE_1"),
    "Ordinary public resource потерян",
  );
  await put("assets/public.txt", "PUBLIC_RESOURCE_2\n");
  await render();
  assert(
    (await extract(join(root, "_site/_downloads/data.zip"), "public.txt"))
      .includes("PUBLIC_RESOURCE_2"),
    "Повторный render вернул stale resource",
  );
  const { finishDownloads } = await import(
    toFileUrl(join(root, ext, "project-download/public.ts")).href
  );
  const receiptVersion = JSON.parse(
    await Deno.readTextFile(
      join(root, "_generated/project-download/artifacts-receipt.json"),
    ),
  );
  assert(
    receiptVersion.schema === "project-download-artifacts-v2" &&
      receiptVersion.operation === receiptVersion.identity.operation &&
      receiptVersion.identity.projection === "student",
    "Receipt подменил NativeRun sourceRunHash вместо явной operation identity",
  );
  const before = await Deno.readFile(starter),
    beforeReceipt = await Deno.readTextFile(
      join(root, "_generated/project-download/artifacts-receipt.json"),
    );
  const refused = async (use: () => Promise<unknown>, code: string) => {
    let error = "";
    try {
      await use();
    } catch (cause) {
      error = String(cause);
    }
    assert(error.includes(code), "Нет адресного отказа " + code + ": " + error);
  };
  const options = { native: true, outputDirectory: join(root, "_site") };
  await refused(
    () => finishDownloads(root, { ...options, profiles: ["foreign"] }),
    "OPERATION_BINDING",
  );
  await refused(
    () => finishDownloads(root, { ...options, projection: "author" }),
    "OPERATION_BINDING",
  );
  await refused(
    () =>
      finishDownloads(root, {
        ...options,
        expectedDocuments: [{ source: "index.qmd", format: "revealjs" }, {
          source: "other.qmd",
          format: "html",
        }],
      }),
    "OPERATION_BINDING",
  );
  await refused(
    () =>
      finishDownloads(root, {
        ...options,
        outputDirectory: join(root, "_foreign-output"),
      }),
    "OPERATION_BINDING",
  );
  await refused(
    () =>
      finishDownloads(root, {
        ...options,
        observeOperation: () =>
          Deno.writeTextFileSync(
            join(root, "index.qmd"),
            statement + "\nИзменённый source\n",
          ),
      }),
    "OPERATION_CHANGED",
  );
  assert(
    (await Deno.readFile(starter)).every((v, i) => v === before[i]) &&
      await Deno.readTextFile(
          join(root, "_generated/project-download/artifacts-receipt.json"),
        ) === beforeReceipt,
    "Source drift до fence изменил owned output",
  );
  await put("index.qmd", statement);
  await render();
  const priorGeneration = JSON.parse(
    await Deno.readTextFile(
      join(root, "_generated/project-download/artifacts-receipt.json"),
    ),
  ).operation;
  const currentArchive = await Deno.readFile(starter),
    currentReceipt = await Deno.readTextFile(
      join(root, "_generated/project-download/artifacts-receipt.json"),
    );
  await refused(
    () =>
      finishDownloads(root, {
        ...options,
        observeOperation: async () => {
          const begin = await new Deno.Command("quarto", {
            args: ["run", `${ext}/course-core/entrypoints/native-pre.ts`],
            cwd: root,
            env: {
              QUARTO_PROJECT_DIR: root,
              QUARTO_PROJECT_OUTPUT_DIR: "_site",
              QUARTO_PROJECT_INPUT_FILES: "index.qmd\nother.qmd",
              QUARTO_USE_FILE_FOR_PROJECT_INPUT_FILES: "",
              QUARTO_RUN_NO_NETWORK: "true",
              DENO_NO_PACKAGE_JSON: "1",
            },
            stdout: "piped",
            stderr: "piped",
          }).output();
          assert(
            begin.success,
            "Новая native generation не началась: " +
              new TextDecoder().decode(begin.stderr),
          );
        },
      }),
    "OPERATION_CHANGED",
  );
  assert(
    (await Deno.readFile(starter)).every((b, i) => b === currentArchive[i]) &&
      await Deno.readTextFile(
          join(root, "_generated/project-download/artifacts-receipt.json"),
        ) === currentReceipt,
    "Generation switch опубликовал старую подготовку",
  );
  await render();
  assert(
    JSON.parse(
      await Deno.readTextFile(
        join(root, "_generated/project-download/artifacts-receipt.json"),
      ),
    ).operation !== priorGeneration,
    "Fresh render не сменил generation",
  );
  const NativeCommand = Deno.Command;
  let rootInspections = 0, totalInspections = 0;
  try {
    Deno.Command = class extends NativeCommand {
      constructor(command: string | URL, options?: Deno.CommandOptions) {
        if (options?.args?.[0] === "inspect") {
          totalInspections++;
          if (options.args.includes(root)) rootInspections++;
        }
        super(command, options);
      }
    };
    await finishDownloads(root, options);
  } finally {
    Deno.Command = NativeCommand;
  }
  assert(
    rootInspections === 0 && totalInspections === 1,
    "Consumer добавил inspect сверх одного disposable origin при operation-owned A1: " +
      JSON.stringify({ rootInspections, totalInspections }),
  );
  console.log(
    JSON.stringify({
      rootInspections,
      totalInspections,
      artifacts: 2,
      resourceArchives: 1,
    }),
  );
  const foreign = await Deno.makeTempDir({ prefix: "b2-foreign-" });
  await Deno.writeTextFile(join(foreign, "keep"), "FOREIGN");
  try {
    await refused(() =>
      finishDownloads(root, {
        ...options,
        observeOperation: () => {
          Deno.renameSync(
            join(root, "_site/_downloads"),
            join(root, "_site/_downloads-saved"),
          );
          Deno.symlinkSync(foreign, join(root, "_site/_downloads"));
        },
      }), "DOWNLOAD.PATH_INVALID");
    assert(
      await Deno.readTextFile(join(foreign, "keep")) === "FOREIGN" &&
        (await Array.fromAsync(Deno.readDir(foreign))).length === 1,
      "Повреждён чужой symlink destination",
    );
  } finally {
    if ((await Deno.lstat(join(root, "_site/_downloads"))).isSymlink) {
      await Deno.remove(join(root, "_site/_downloads"));
    }
    await Deno.rename(
      join(root, "_site/_downloads-saved"),
      join(root, "_site/_downloads"),
    );
    await Deno.remove(foreign, { recursive: true });
  }
  const authoredConfig = await Deno.readTextFile(join(root, "_quarto.yml"));
  await put(
    "_quarto.yml",
    authoredConfig.replace(
      "data: {path:",
      "exr-demo-starter: {path: assets, gitignore: false}\n    data: {path:",
    ),
  );
  await put(
    "index.qmd",
    statement + "\n{{< project-download exr-demo-starter >}}\n",
  );
  await render(false, "DOWNLOAD.OUTPUT_CONFLICT");
  let successReceipt = false;
  try {
    await Deno.stat(
      join(root, "_generated/project-download/artifacts-receipt.json"),
    );
    successReceipt = true;
  } catch (cause) {
    if (!(cause instanceof Deno.errors.NotFound)) throw cause;
  }
  assert(!successReceipt, "Collision создал success receipt");
  await put("_quarto.yml", authoredConfig);
  await put("index.qmd", statement.replace("course-role=demonstration ", ""));
  await render(false, "DOWNLOAD.FULL_UNQUALIFIED");
  console.log(
    "PASS actual pre/late/post Download: starter/full-artifact, ordinary resources, final destinations, privacy, incremental resource и full permission",
  );
} finally {
  if (!Deno.env.get("B2_KEEP")) await Deno.remove(root, { recursive: true });
  else console.log("B2 fixture " + root);
}
