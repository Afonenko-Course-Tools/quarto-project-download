// Адаптер фактического Deno graph к стандартному typed ESLint.
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import tseslint from "typescript-eslint";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import { scope } from "../eslint.config.mjs";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
/** @param {string} bin @param {string[]} args */
const run = (bin, args) =>
  execFileSync(bin, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
  if (!isRecord(value)) throw Error("Expected JSON object");
  return value;
}
/** @param {string} text @returns {Record<string, unknown>} */
function jsonRecord(text) {
  /** @type {unknown} */
  const value = JSON.parse(text);
  return record(value);
}
/** @param {unknown} value @returns {string} */
function text(value) {
  if (typeof value !== "string") throw Error("Expected string");
  return value;
}
/** @param {unknown} value @returns {Record<string, string>} */
function stringMap(value) {
  return Object.fromEntries(
    Object.entries(record(value)).map(([key, item]) => [key, text(item)]),
  );
}
/** @param {unknown} value @returns {unknown[]} */
function array(value) {
  if (!Array.isArray(value)) throw Error("Expected array");
  return value;
}
/** @param {unknown} value */
function graphModule(value) {
  const module = record(value);
  const dependencies = array(module.dependencies ?? []).map((value) => {
    const dependency = record(value);
    const code =
      dependency.code === undefined
        ? undefined
        : text(record(dependency.code).specifier);
    const type =
      dependency.type === undefined
        ? undefined
        : text(record(dependency.type).specifier);
    return { specifier: text(dependency.specifier), code, type };
  });
  return {
    specifier: text(module.specifier),
    local: module.local === undefined ? undefined : text(module.local),
    mediaType:
      module.mediaType === undefined ? undefined : text(module.mediaType),
    error: module.error,
    dependencies,
  };
}
const temporary = mkdtempSync(join(tmpdir(), "course-quality-"));
try {
  const tracked = run("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]).split("\0");
  const owned = [...new Set(tracked)]
    .filter(
      (file) =>
        file &&
        existsSync(file) &&
        !/(^|\/)(vendor|node_modules|generated|_generated)(\/|$)/.test(file) &&
        !/^_extensions\/project-download\/observability\/bridge\.(ts|lua)$/.test(
          file,
        ),
    )
    .sort();
  const formatted = owned.filter((file) =>
    /\.(?:ts|js|cjs|mjs|json|ya?ml)$/.test(file),
  );
  if (formatted.length) console.log(run("prettier", ["--check", ...formatted]));
  const toml = owned.filter((file) => file.endsWith(".toml"));
  if (toml.length) {
    console.log(run("taplo", ["lint", "--no-schema", ...toml]));
    console.log(run("taplo", ["fmt", "--check", ...toml]));
  }
  const lua = owned.filter((file) => file.endsWith(".lua"));
  if (lua.length) {
    console.log(run("stylua", ["--check", ".luacheckrc", ...lua]));
    console.log(run("luacheck", ["--codes", ...lua]));
    console.log(
      run(process.env.QUARTO ?? "quarto", [
        "run",
        "tools/check-types.ts",
        "--lua",
      ]),
    );
  }
  const shell = owned.filter((file) => file.endsWith(".sh"));
  if (shell.length) {
    console.log(run("shfmt", ["-d", "-i", "2", "-ci", ...shell]));
    console.log(run("shellcheck", ["--severity=style", ...shell]));
    for (const file of shell) run("bash", ["-n", file]);
  }
  const yaml = owned.filter((file) => /\.ya?ml$/.test(file));
  if (yaml.length) console.log(run("yamllint", ["--strict", ...yaml]));
  const workflows = yaml.filter((file) =>
    file.startsWith(".github/workflows/"),
  );
  if (workflows.length) console.log(run("actionlint", workflows));
  const python = owned.filter((file) => file.endsWith(".py"));
  if (python.length) {
    console.log(run("ruff", ["format", "--check", ...python]));
    console.log(run("ruff", ["check", ...python]));
  }
  const sourceFiles = [...new Set(tracked)]
    .filter(
      (file) =>
        (scope.some((prefix) => file.startsWith(prefix)) ||
          file.startsWith("tools/") ||
          /\.(?:js|cjs|mjs)$/.test(file)) &&
        /\.(?:ts|js|cjs|mjs)$/.test(file) &&
        !/(^|\/)(vendor|node_modules|generated|_generated)(\/|$)/.test(file) &&
        existsSync(file),
    )
    .sort()
    .map((file) => resolve(file));
  // native-validators.js — генерируемый standalone AJV artifact; проверяется воспроизводимостью и потребляющим .d.ts.
  const generated = new Set(
    ["_extensions/course-prairielearn/application/native-validators.js"].map(
      (file) => resolve(file),
    ),
  );
  const files = sourceFiles.filter(
    (file) => file.endsWith(".ts") && !file.endsWith(".d.ts"),
  );
  const javascriptFiles = sourceFiles.filter(
    (file) => !file.endsWith(".ts") && !generated.has(file),
  );
  if (!files.length)
    throw Error(
      "Quality scope пуст: проверка без собственного production-кода запрещена",
    );
  const denoConfig = jsonRecord(
    readFileSync(
      text(scope[0]).startsWith("src/") ? "deno.json" : "typecheck/deno.json",
      "utf8",
    ),
  );
  const compilerOptions = record(denoConfig.compilerOptions);
  if (compilerOptions.strict !== true)
    throw Error("Quality gate требует strict: true");
  const imports = stringMap(denoConfig.imports ?? {});
  if (!text(scope[0]).startsWith("src/")) {
    const share = run(process.env.QUARTO ?? "quarto", ["--paths"])
      .trim()
      .split("\n")
      .at(-1);
    if (!share) throw Error("Quarto share not found");
    const quarto = jsonRecord(
      readFileSync(join(share, "deno_std/run_import_map.json"), "utf8"),
    );
    for (const name of ["stdlib/path", "stdlib/fs"])
      imports[name] = text(record(quarto.imports)[name]).replace(
        "jsr:/",
        "jsr:",
      );
    const siblings = dirname(root);
    imports["course-performance/"] = pathToFileURL(
      resolve(
        process.env.COURSE_PERFORMANCE_SOURCE ??
          process.env.PERFORMANCE ??
          join(siblings, "quarto-course-performance"),
      ) + "/",
    ).href;
    /** @type {Map<string, string>} */
    const providers = new Map();
    /** @type {Set<string>} */
    const namespaces = new Set([join(root, "_extensions")]);
    /** @type {[string, string, string][]} */
    const providerSources = [
      ["course-core", "CORE", "quarto-course"],
      ["course-navigation", "CORE", "quarto-course"],
      ["course-prairielearn", "PL", "quarto-course-prairielearn"],
      ["reference-catalog", "QRC", "quarto-reference-catalog"],
      ["project-download", "DOWNLOAD", "quarto-project-download"],
      ["course-site", "SITE", "quarto-project-publish"],
    ];
    for (const [name, variable, repo] of providerSources) {
      const source = process.env[variable] ?? join(siblings, repo);
      const extension = [
        join(source, "_extensions", name),
        join(source, "_extensions/Afonenko-Course-Tools", name),
        source,
      ].find((path) => existsSync(join(path, "public.ts")));
      if (!extension) continue;
      const target = pathToFileURL(resolve(extension) + "/").href;
      imports[name + "/"] = target;
      providers.set(name, target);
      namespaces.add(dirname(resolve(extension)));
      if (name === "course-prairielearn")
        imports["pl-native/"] = new URL("application/", target).href;
    }
    for (const namespace of namespaces)
      for (const [name, target] of providers) {
        imports[pathToFileURL(join(namespace, name) + "/").href] = target;
      }
  }
  let importMap = process.argv[2];
  if (importMap)
    Object.assign(
      imports,
      stringMap(jsonRecord(readFileSync(resolve(importMap), "utf8")).imports),
    );
  const configPath = join(temporary, "deno.json");
  writeFileSync(configPath, JSON.stringify({ ...denoConfig, imports }));
  const entry = join(temporary, "entry.ts");
  writeFileSync(
    entry,
    files
      .map((file) => `import ${JSON.stringify(pathToFileURL(file).href)};`)
      .join("\n"),
  );
  const graphData = jsonRecord(
    run("deno", ["info", "--no-lock", "--config", configPath, "--json", entry]),
  );
  const graph = {
    modules: array(graphData.modules).map(graphModule),
    redirects: stringMap(graphData.redirects ?? {}),
  };
  const errors = graph.modules.filter((module) => module.error);
  if (errors.length) throw Error(JSON.stringify(errors));
  const byUrl = new Map(
    graph.modules.map((module) => [module.specifier, module]),
  );
  const byFile = new Map(
    graph.modules
      .filter((module) => module.local)
      .map((module) => [module.local, module]),
  );
  const options = {
    ...ts.convertCompilerOptionsFromJson(compilerOptions, root).options,
    noEmit: true,
    allowImportingTsExtensions: true,
    allowJs: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    types: ["node"],
    typeRoots: [join(root, "node_modules/@types")],
  };
  const globals = join(temporary, "deno.d.ts");
  // `deno types` уже объединяет эти библиотеки; TS не знает имён встроенных Deno libs.
  writeFileSync(
    globals,
    run("deno", ["types"]).replace(
      /^\/\/\/ <reference lib="(?:deno\.[^"]*|node)" \/>\r?\n/gm,
      "",
    ),
  );
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = (names, containing) =>
    names.map((name) => {
      const dep = byFile
        .get(containing)
        ?.dependencies?.find((item) => item.specifier === name);
      let url = dep?.type ?? dep?.code;
      while (url && graph.redirects[url]) url = graph.redirects[url];
      const module = url ? byUrl.get(url) : undefined;
      return module?.local
        ? {
            resolvedFileName: module.local,
            extension:
              module.mediaType === "JavaScript"
                ? ts.Extension.Js
                : ts.Extension.Ts,
          }
        : ts.resolveModuleName(name, containing, options, host).resolvedModule;
    });
  const program = ts.createProgram([...files, globals], options, host);
  const programs = [program];
  if (javascriptFiles.length) {
    const browserConfig = join(
      root,
      "typecheck",
      existsSync(join(root, "typecheck/javascript.json"))
        ? "javascript.json"
        : "browser.json",
    );
    const settings = jsonRecord(readFileSync(browserConfig, "utf8"));
    const jsOptions = {
      ...ts.convertCompilerOptionsFromJson(
        record(settings.compilerOptions),
        dirname(browserConfig),
      ).options,
      strict: true,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      typeRoots: [join(root, "node_modules/@types")],
    };
    const declarations = join(root, "typecheck/browser.d.ts");
    programs.push(
      ts.createProgram(
        [
          ...javascriptFiles,
          ...(existsSync(declarations) ? [declarations] : []),
        ],
        jsOptions,
      ),
    );
  }
  const checkedFiles = [...files, ...javascriptFiles];
  const diagnostics = programs
    .flatMap((program) => ts.getPreEmitDiagnostics(program))
    .filter((item) => !item.file || checkedFiles.includes(item.file.fileName));
  if (diagnostics.length)
    throw Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (file) => file,
        getNewLine: () => "\n",
      }),
    );
  const eslint = new ESLint({
    overrideConfig: [{ languageOptions: { parserOptions: { programs } } }],
  });
  const results = await eslint.lintFiles(checkedFiles);
  console.log(await (await eslint.loadFormatter("stylish")).format(results));
  if (
    results.length !== checkedFiles.length ||
    results.some((result) => result.warningCount)
  )
    throw Error("Неполный quality scope либо предупреждения линтера");
  let receipt;
  if (results.some((result) => result.errorCount)) process.exitCode = 1;
  else {
    /** @type {unknown[]} */
    const configured = await Promise.all(
      checkedFiles.map((file) => eslint.calculateConfigForFile(file)),
    );
    receipt = {
      checked: files.length,
      javascriptChecked: javascriptFiles.length,
      structuralChecked: configured.filter(
        (config) =>
          array(record(record(config).rules).complexity ?? [])[0] === 2,
      ).length,
      strict: true,
      typescript: ts.version,
      eslint: ESLint.version,
      typescriptESLint: text(record(record(tseslint.parser).meta).version),
      graphModules: graph.modules.length,
    };
  }
  console.log(
    run(join(root, "node_modules/.bin/depcruise"), [
      "--config",
      ".dependency-cruiser.json",
      "--output-type",
      "err-long",
      ...scope.map((prefix) => prefix.replace(/\/$/, "")),
    ]),
  );
  if (!process.exitCode) console.log(JSON.stringify(receipt));
} catch (error) {
  if (isRecord(error) && error.stdout) console.error(String(error.stdout));
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
