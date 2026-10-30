// Реальный public Core producer и временная установленная раскладка; не полный курс.
import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const api = await import(
  toFileUrl(join(repo, "_extensions/project-download/public.ts")).href
).catch(() => undefined);
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
assert(
  typeof api?.packageArtifact === "function",
  "B1 RED: Download не упаковывает публичный ArtifactInventory",
);
const source = Deno.env.get("CORE");
const qrcSource = Deno.env.get("QRC");
if (!source || !qrcSource) {
  throw Error(
    "CORE и QRC должны указывать на фиксированные исходники владельцев",
  );
}
const root = await Deno.makeTempDir({ prefix: "download-public-inventory-" });
const put = async (name: string, text: string) => {
  const path = join(root, name);
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, text);
};
async function copy(source: string, target: string) {
  await Deno.mkdir(target, { recursive: true });
  for await (const item of Deno.readDir(source)) {
    if (item.isDirectory) {
      await copy(join(source, item.name), join(target, item.name));
    } else {await Deno.copyFile(
        join(source, item.name),
        join(target, item.name),
      );}
  }
}
async function refused(use: () => unknown, marker: string) {
  let error = "";
  try {
    await use();
  } catch (cause) {
    error = String(cause);
  }
  assert(error.includes(marker), `Ожидался ${marker}, получен ${error}`);
}
try {
  const extensions = join(root, "_extensions/Afonenko-Course-Tools");
  await copy(
    join(source, "_extensions/course-core"),
    join(extensions, "course-core"),
  );
  await copy(
    join(repo, "_extensions/project-download"),
    join(extensions, "project-download"),
  );
  await copy(
    join(qrcSource, "_extensions/reference-catalog"),
    join(extensions, "reference-catalog"),
  );
  const core = await import(
    toFileUrl(join(extensions, "course-core/public.ts")).href
  );
  const download = await import(
    toFileUrl(join(extensions, "project-download/public.ts")).href
  );
  const qrc = await import(
    toFileUrl(join(extensions, "reference-catalog/public.ts")).href
  );
  const native = join(extensions, "course-core/native-ts");
  await put(
    "_quarto.yml",
    `project:\n  type: book\n  output-dir: _site\nbook:\n  title: B1\n  chapters: [index.qmd]\nformat:\n  html:\n    theme: none\ncourse-core-projection: student\nfilters:\n  - at: pre-ast\n    path: ${native}/early-context.lua\n  - at: post-quarto\n    path: ${native}/late-kind.lua\n  - at: post-render\n    path: ${native}/late-filter.lua\ncourse-project:\n  build:\n    files:\n      build.gradle: shared/build.gradle\n      settings.gradle: shared/settings.gradle\n  starter: {path: starter}\n  instructions:\n    gradle: {path: shared/gradle.md}\n`,
  );
  await put("shared/gradle.md", "JDK25. Выполните `gradle test`.\n");
  await put("shared/build.gradle", "plugins { id 'java' }\n");
  await put("shared/settings.gradle", "rootProject.name='b1'\n");
  await put(
    "projects/demo/starter/src/main/java/Main.java",
    "public class Main {}\n",
  );
  await put(
    "projects/demo/_metadata.yml",
    "course-project:\n  starter: {path: starter}\n",
  );
  await put(
    "index.qmd",
    '# Проверка\n\n::: {#exr-demo difficulty=introductory statement-visibility=open project="projects/demo/input.qmd"}\nПолное условие с [заготовкой](starter.zip).\n\n{{< include sections/extra.qmd >}}\n\n::: {.solution}\n![Закрытый](private.svg)\n:::\n\n:::\n',
  );
  await put(
    "sections/extra.qmd",
    "### Подробности {#details}\n\n[К подробностям](#details).\n\n- Первый пункт\n- Второй пункт\n\n| Вход | Выход |\n|---|---|\n| 1 | 2 |\n\nСноска[^note].\n\n[^note]: Содержание сноски.\n\n::: {.callout-note}\nПримечание native.\n:::\n\n[Другой проект](other.qmd#target). [Импорт](os:sec-memory).\n\n![Generated](generated.svg)\n",
  );
  await put(
    "private.svg",
    '<svg xmlns="http://www.w3.org/2000/svg"><text>PRIVATE_RESOURCE</text></svg>',
  );
  await put(
    "generate.lua",
    "return {{Pandoc=function(doc) local f=assert(io.open('generated.svg','wb')); f:write('<svg xmlns=\"http://www.w3.org/2000/svg\"><text>GENERATED_RESOURCE</text></svg>'); f:close(); return doc end}}\n",
  );
  const config = await Deno.readTextFile(join(root, "_quarto.yml"));
  await put(
    "_quarto.yml",
    config.replace(
      "  - at: post-render\n",
      `  - at: post-quarto\n    path: ${root}/generate.lua\n  - at: post-render\n`,
    ),
  );
  const context = {
    operation: crypto.randomUUID(),
    input: join(root, "index.qmd"),
    format: "html",
    projection: "student",
    exerciseBank: true,
  };
  const capture = join(root, "capture");
  await put("run.json", JSON.stringify({ context, capture }));
  const render = await new Deno.Command(Deno.env.get("QUARTO") || "quarto", {
    args: ["render", "index.qmd", "--to", "html"],
    cwd: root,
    env: {
      COURSE_CORE_TS_RUN: join(root, "run.json"),
      QUARTO_RUN_NO_NETWORK: "true",
    },
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    render.success,
    "Native producer: " + new TextDecoder().decode(render.stderr),
  );
  const finalized = core.finalizeDocument(
    JSON.parse(await Deno.readTextFile(capture + ".early.json")),
    JSON.parse(await Deno.readTextFile(capture + ".late.json")),
  );
  const condition = core.selectCondition(finalized, "exr-demo", "student");
  const links = qrc.bindConditionLinks(condition, {
    catalog: {
      schema: "quarto-reference-catalog",
      generator: { quarto: "1.11.5" },
      targets: {},
    },
    baseUrl: "https://example.test/course/",
    importedTargets: [{
      namespace: "os",
      id: "sec-memory",
      page: "chapters/memory.html",
      fragment: "sec-memory",
      label: "Память",
      labelHtml: "Память",
      number: "1",
      numberHtml: "1",
      baseUrl: "https://example.test/os/",
    }],
    references: {
      "os:sec-memory": { key: "os:sec-memory", style: "external" },
    },
    urls: {
      "starter.zip": "_downloads/exr-demo-starter.zip",
      "other.qmd#target": "projects/other.html#target",
    },
  });
  let artifact = { files: [] as { target: string; bytes: Uint8Array }[] };
  let archive: Uint8Array | undefined;
  await core.readProjectContexts([{
    owner: root,
    inputs: ["projects/demo/input.qmd"],
    profiles: [],
    format: "html",
  }], async ([batch]: { contexts: unknown[]; metrics: unknown }[]) => {
    const plan = await core.planProject(batch.contexts[0], {
      audience: "student",
    });
    const inventory = await core.materializeProject(plan, condition, {
      links,
      resources: {
        "generated.svg": {
          path: "generated.svg",
          target: "resources/generated.svg",
        },
      },
      submission: {
        files: [{ name: "Main.java", starterPath: "src/main/java/Main.java" }],
        instructions: "Сдайте Main.java.",
      },
    });
    const beforeConsumer = JSON.stringify(batch.metrics);
    const beforePlan = JSON.stringify(core.projectPlanMetrics(plan));
    const consumerStart = performance.now();
    const packed = await download.packageArtifact(inventory);
    archive = packed;
    artifact = inventory;
    const again = await download.packageArtifact({
      ...inventory,
      files: [...inventory.files].reverse(),
    });
    assert(
      packed.length === again.length &&
        packed.every((byte: number, i: number) => byte === again[i]),
      "Порядок inventory изменил ZIP",
    );
    await refused(
      () =>
        download.packageArtifact({
          ...inventory,
          files: [...inventory.files, inventory.files[0]],
        }),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    const borrowed = structuredClone(inventory);
    const pending = download.packageArtifact(borrowed);
    borrowed.files[0].bytes.fill(0);
    const frozen = await pending;
    assert(
      frozen.length === packed.length &&
        frozen.every((byte: number, i: number) => byte === packed[i]),
      "Caller изменил bytes во время lazy import/hash",
    );
    const ancestor = structuredClone(inventory);
    ancestor.files[0].target = "collision";
    ancestor.files[1].target = "collision/nested.txt";
    await refused(
      () => download.packageArtifact(ancestor),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    const wrongSize = structuredClone(inventory);
    wrongSize.files[0].size++;
    await refused(
      () => download.packageArtifact(wrongSize),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    const wrongHash = structuredClone(inventory);
    wrongHash.files[0].bytes[0] ^= 1;
    await refused(
      () => download.packageArtifact(wrongHash),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    const wrongAudience = structuredClone(inventory);
    wrongAudience.files[0].audience = "full";
    await refused(
      () => download.packageArtifact(wrongAudience),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    await refused(
      () => download.packageArtifact(JSON.parse(JSON.stringify(inventory))),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    const escape = structuredClone(inventory);
    escape.files[0].target = "../private";
    await refused(
      () => download.packageArtifact(escape),
      "DOWNLOAD.INVENTORY_INVALID",
    );
    assert(
      JSON.stringify(batch.metrics) === beforeConsumer &&
        JSON.stringify(core.projectPlanMetrics(plan)) === beforePlan,
      "Consumer повторно выполнил Core inspect/обход/чтение исходников",
    );
    console.log(
      JSON.stringify({
        consumerMs: Math.round(performance.now() - consumerStart),
        native: batch.metrics,
        plan: core.projectPlanMetrics(plan),
      }),
    );
  });
  await Deno.writeFile(join(root, "student.zip"), archive!);
  const extracted = join(root, "extracted");
  const unzip = await new Deno.Command("unzip", {
    args: ["-q", join(root, "student.zip"), "-d", extracted],
    stderr: "piped",
  }).output();
  assert(unzip.success, "Не удалось распаковать реальный ZIP");
  const listed = await new Deno.Command("unzip", {
    args: ["-Z1", join(root, "student.zip")],
    stdout: "piped",
  }).output();
  assert(
    new TextDecoder().decode(listed.stdout).trim().split("\n").sort().join(
      "\n",
    ) === artifact.files.map((file) => file.target).sort().join("\n"),
    "Имена ZIP отличаются от inventory",
  );
  for (const file of artifact.files) {
    const actual = await Deno.readFile(join(extracted, file.target));
    assert(
      actual.length === file.bytes.length &&
        actual.every((byte, i) => byte === file.bytes[i]),
      "ZIP изменил байты " + file.target,
    );
  }
  const readme = await Deno.readTextFile(join(extracted, "README.md"));
  assert(
    readme.includes("Полное условие") &&
      readme.includes(
        "https://example.test/course/_downloads/exr-demo-starter.zip",
      ),
    "Download переписал README Core",
  );
  for (
    const expected of [
      "Первый пункт",
      "Второй пункт",
      "Вход",
      "Выход",
      "Содержание сноски",
      "Примечание native",
      "#details",
      "https://example.test/course/projects/other.html#target",
      "https://example.test/os/chapters/memory.html#sec-memory",
    ]
  ) {
    assert(
      readme.includes(expected),
      "Core→QRC→Download потерял содержание/адрес: " + expected,
    );
  }
  assert(
    artifact.files.some((file) => file.target === "resources/generated.svg"),
    "Generated ресурс не попал в ZIP",
  );
  assert(
    !artifact.files.some((file) =>
      /private|reference|solution|closed-tests/.test(file.target)
    ) && !artifact.files.some((file) =>
      new TextDecoder().decode(file.bytes).includes("PRIVATE_RESOURCE")
    ),
    "Закрытый ресурс попал в student bytes",
  );
  console.log(
    "PASS public Core→установленный Download: точные имена/байты, README, воспроизводимость, hash/size/audience/path guards",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
