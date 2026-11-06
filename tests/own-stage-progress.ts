import { publish, type PublishPorts } from "../_extensions/project-download/application/publish.ts";
import { finish, resetDownloadRequests } from "../_extensions/project-download/infrastructure/runtime.ts";
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };
const root = await Deno.makeTempDir({ prefix: "download-progress-" });
const quietEnv = Deno.env.get("QUARTO_PROJECT_SCRIPT_QUIET");
const outputEnv = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR");
const error = console.error, log = console.log, getEnv = Deno.env.get;
const Command = Deno.Command, writeFile = Deno.writeFile, readFile = Deno.readFile;
const stderr: string[] = [], stdout: unknown[] = [], results: unknown[] = [];
const has = (text: string) => stderr.some((line) => line.includes(text));
const failed = async (action: () => Promise<unknown>, sentinel: unknown) => {
  let caught: unknown;
  try { await action(); } catch (cause) { caught = cause; }
  assert(caught === sentinel, "Стадия сохраняет исходный объект ошибки");
};
const bytes = new TextEncoder().encode("same source");
const config = { resources: { data: { path: "/data", gitignore: false } } };
try {
  Deno.env.set("QUARTO_PROJECT_OUTPUT_DIR", root + "/_site");
  console.error = (...values: unknown[]) => { stderr.push(values.join(" ")); };
  console.log = (...values: unknown[]) => { stdout.push(values); };
  for (const quiet of [false, true]) {
    Deno.env.set("QUARTO_PROJECT_SCRIPT_QUIET", quiet ? "1" : "0");
    stderr.length = 0;
    const requests = root + "/_generated/project-download/requests";
    await Deno.mkdir(requests + "/index.qmd", { recursive: true });
    await Deno.writeTextFile(requests + "/index.qmd/request.json", JSON.stringify({ source: "index.qmd", resources: [] }));
    await Deno.mkdir(root + "/_site/_downloads", { recursive: true });
    await Deno.writeTextFile(root + "/_site/_downloads/keep.zip", "Ранее опубликованный архив");
    await resetDownloadRequests(root);
    assert(!await Deno.lstat(requests).catch((cause) => { if (cause instanceof Deno.errors.NotFound) return undefined; throw cause; }), "Reset удаляет заявки");
    assert(await Deno.readTextFile(root + "/_site/_downloads/keep.zip") === "Ранее опубликованный архив", "Reset сохраняет архивы");
    assert(stderr.length === 0 && stdout.length === 0, "Reset не добавляет вывод");
    const calls: string[] = [];
    const ports: PublishPorts = {
      requests: async () => {
        assert(quiet || has("Чтение заявок — начало"), "Чтение имеет ранний progress");
        assert(!has("pages=1"), "Незавершённая заявка не посчитана");
        calls.push("requests");
        return [{ source: "index.qmd", resources: ["data"] }, { source: "other.qmd", resources: ["data"] }];
      },
      courseResource: async () => { throw Error("Неиспользуемый model lookup"); },
      files: async () => {
        assert(quiet || has("Подготовка заявок — pages=2/2"), "Страницы посчитаны после подготовки");
        assert(quiet || has("Чтение материалов — начало"), "Чтение материалов имеет начало");
        assert(!has("archives=1"), "До получения bytes нет готового архива");
        calls.push("files");
        return [{ name: "README.txt", bytes }];
      },
      save: async (archives) => {
        assert(quiet || has("Сборка ZIP — archives=1/1"), "Архив посчитан после упаковки");
        assert(!has("files=1"), "Передача draft не объявляет запись файла");
        calls.push("save");
        assert(archives.length === 1 && archives[0].name === "data.zip" && archives[0].bytes[0] === 80 && archives[0].bytes[1] === 75, "ZIP и дедупликация сохранены");
      },
    };
    const count = await publish(config, ["student"], ports);
    assert(count === 1 && calls.join(",") === "requests,files,save", "Сохранены число и порядок операций");
    assert(quiet ? stderr.length === 0 : has("Чтение заявок — готово") && has("Подготовка заявок — готово") && has("Чтение материалов — готово") && has("Сборка ZIP — готово") && /готово \([0-9.]+ с\)/.test(stderr.at(-1) ?? ""), "Стадии завершаются или молчат в quiet");
    for (const stage of ["read", "prepare", "archive", "save"] as const) {
      stderr.length = 0;
      const sentinel = Error("Исходная ошибка " + stage);
      let saved = false;
      await failed(() => publish({ resources: {}, "course-model": true }, [], {
        ...ports,
        requests: async () => { if (stage === "read") throw sentinel; return [{ source: "index.qmd", resources: [], artifacts: [{ exerciseId: "demo", kind: "full" }] }]; },
        modelArtifact: async () => {
          assert(!has("pages=1"), "Подготовка страницы ещё не завершена");
          if (stage === "prepare") throw sentinel;
          return { kind: "full", files: [{ name: "main.txt", bytes }], package: async () => { assert(!has("archives=1"), "Архив не посчитан до package"); if (stage === "archive") throw sentinel; return new Uint8Array([80, 75]); } };
        },
        save: async () => { saved = true; throw sentinel; },
      }), sentinel);
      if (!quiet) {
        const label = { read: "Чтение заявок", prepare: "Подготовка материалов", archive: "Сборка ZIP", save: "Передача архивов" }[stage];
        assert(has(label + " — начало") && has(label + " — ошибка") && !has(label + " — готово"), "Ошибка стадии не объявляет её успех: " + stage);
        assert(stage === "save" ? has("archives=1/1") : !has("archives=1"), "Только собранный архив попадает в счётчик");
        if (stage === "read" || stage === "prepare") assert(!has("pages=1"), "Ошибка подготовки не завершает страницу");
        assert(!has("files=1"), "Ошибка не объявляет запись файла");
      } else assert(stderr.length === 0, "Ошибки quiet не добавляют progress");
      assert(saved === (stage === "save"), "После ранней ошибки сохранение не вызывается");
    }
    stderr.length = 0;
    const materialFailure = Error("Ошибка чтения обычных материалов");
    await failed(() => publish(config, [], {
      ...ports,
      requests: async () => [{ source: "index.qmd", resources: ["data"] }],
      files: async () => { throw materialFailure; },
      save: async () => { throw Error("После ошибки чтения сохранение запрещено"); },
    }), materialFailure);
    assert(quiet ? stderr.length === 0 : has("Чтение материалов — ошибка") && !has("Чтение материалов — готово") && !has("archives=1"), "Ошибка обычных материалов не завершает архив");
    // Реальный ordinary writer и guards; заменён только внешний inspect, без запуска Quarto.
    const runtimeRoot = root + (quiet ? "/runtime-quiet" : "/runtime");
    await Deno.mkdir(runtimeRoot + "/data", { recursive: true });
    await Deno.writeFile(runtimeRoot + "/data/README.txt", bytes);
    const requestDir = runtimeRoot + "/_generated/project-download/requests/index.qmd";
    await Deno.mkdir(requestDir, { recursive: true });
    const requestPath = requestDir + "/request.json";
    await Deno.writeTextFile(requestPath, JSON.stringify({ source: "index.qmd", resources: ["data", "more"], configuration: { resources: { ...config.resources, more: config.resources.data } } }));
    let inspectCalls = 0;
    Deno.Command = class {
      constructor(_executable: string | URL, options: Deno.CommandOptions) {
        assert(options.cwd === runtimeRoot && options.args?.join(",") === "inspect," + runtimeRoot, "Только прежний inspect, без дополнительных вызовов");
        inspectCalls++;
      }
      async output() {
        return { success: true, code: 0, signal: null, stdout: new TextEncoder().encode(JSON.stringify({ config: { project: { "output-dir": "_site" } }, files: { input: [runtimeRoot + "/index.qmd"], config: [], configResources: [] } })), stderr: new Uint8Array() };
      }
    } as unknown as typeof Deno.Command;
    stderr.length = 0;
    const readFailure = Error("Ошибка чтения request.json");
    Deno.readFile = async (path, options) => { if (String(path) === requestPath) throw readFailure; return await readFile(path, options); };
    await failed(() => finish(runtimeRoot, { profiles: [], outputDirectory: "_site" }), readFailure);
    Deno.readFile = readFile;
    assert(quiet ? stderr.length === 0 : has("Чтение заявок — ошибка") && !has("Чтение заявок — готово") && !has("pages=1"), "Ошибка owner-чтения не завершает стадию");
    for (const failedName of ["data.zip", "more.zip"]) {
      stderr.length = 0;
      const writeFailure = Error("Ошибка записи " + failedName);
      Deno.writeFile = async (path, data, options) => {
        if (String(path).endsWith("/" + failedName)) {
          assert(!has(failedName === "data.zip" ? "files=1" : "files=2"), "Файл не посчитан до writeFile");
          throw writeFailure;
        }
        return await writeFile(path, data, options);
      };
      await failed(() => finish(runtimeRoot, { profiles: [], outputDirectory: "_site" }), writeFailure);
      Deno.writeFile = writeFile;
      assert(quiet ? stderr.length === 0 : has("Запись файлов — начало") && has("Запись файлов — ошибка") && !has("Запись файлов — готово") && !has("files=2"), "Неудачная запись не сообщает успех");
      if (!quiet) assert(failedName === "data.zip" ? !has("files=1") : has("Запись файлов — files=1/2"), "Учтены только фактически записанные ZIP при частичной ошибке");
      assert(await Deno.readTextFile(runtimeRoot + "/_site/_downloads/.project-download-manifest.json") === '["data.zip","more.zip"]\n', "Manifest сохраняется после ошибки записи");
    }
    stderr.length = 0;
    assert(await finish(runtimeRoot, { profiles: [], outputDirectory: "_site" }) === 2, "Повторная публикация через новый draft успешна");
    assert(quiet ? stderr.length === 0 : has("Запись файлов — files=2/2") && has("Запись файлов — готово"), "Записанный ZIP посчитан после writeFile");
    assert((await Deno.readFile(runtimeRoot + "/_site/_downloads/data.zip"))[0] === 80 && inspectCalls === 4, "ZIP записан без дополнительных inspect");
    Deno.Command = Command;
    assert(stdout.length === 0, "Progress не попадает в предметный stdout");
    results.push({ quiet, count, callOrder: calls, failureIdentity: true, inspectCalls });
  }
  stderr.length = 0;
  Deno.env.get = (key) => { if (key === "QUARTO_PROJECT_SCRIPT_QUIET") throw Error("quiet env denied"); return getEnv(key); };
  const count = await publish(config, [], { requests: async () => [{ source: "index.qmd", resources: ["data"] }], courseResource: async () => { throw Error("unused"); }, files: async () => [{ name: "README.txt", bytes }], save: async () => {} });
  assert(count === 1 && stderr.length === 0 && stdout.length === 0, "Счётчики не требуют новых env permissions");
  results.push({ quietEnvDenied: true, count });
} finally {
  Deno.Command = Command; Deno.writeFile = writeFile; Deno.readFile = readFile; Deno.env.get = getEnv;
  console.error = error; console.log = log;
  quietEnv === undefined ? Deno.env.delete("QUARTO_PROJECT_SCRIPT_QUIET") : Deno.env.set("QUARTO_PROJECT_SCRIPT_QUIET", quietEnv);
  outputEnv === undefined ? Deno.env.delete("QUARTO_PROJECT_OUTPUT_DIR") : Deno.env.set("QUARTO_PROJECT_OUTPUT_DIR", outputEnv);
  await Deno.remove(root, { recursive: true });
}
console.log(JSON.stringify({ status: "PASS", nativeCalls: 0, results }));
