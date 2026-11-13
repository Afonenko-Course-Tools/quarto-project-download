// Проверяет правила штатной командой на новых production-файлах; исходники всегда удаляются.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  writeFileSync,
  unlinkSync,
  mkdtempSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scope } from "../eslint.config.mjs";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
/** @type {string[]} */
const files = [];
function run(env = process.env) {
  try {
    return {
      status: 0,
      output: execFileSync(
        process.execPath,
        ["tools/check-quality.mjs", ...process.argv.slice(2)],
        {
          cwd: root,
          env,
          encoding: "utf8",
          stdio: "pipe",
          maxBuffer: 32 * 1024 * 1024,
        },
      ),
    };
  } catch (error) {
    return {
      status:
        error instanceof Error &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : 1,
      output:
        error instanceof Error
          ? ("stdout" in error ? String(error.stdout) : "") +
            ("stderr" in error ? String(error.stderr) : error.message)
          : String(error),
    };
  }
}
/** @param {string} path @param {string} source */
function put(path, source) {
  const file = join(root, path);
  if (existsSync(file)) throw Error("Контрольный путь уже занят: " + file);
  writeFileSync(file, source);
  files.push(file);
  if (
    /\.(?:ts|js|mjs|cjs|json|ya?ml)$/.test(file) &&
    !source.includes("malformed =")
  ) {
    execFileSync("prettier", ["--write", file], { cwd: root, stdio: "pipe" });
  }
}
function clean() {
  for (const file of files.splice(0)) unlinkSync(file);
}
/** @type {[string, string][]} */
const cases = [
  ["no-explicit-any", "export const explicit: any = 1;"],
  ["ban-ts-comment", "// @ts-ignore\nexport const ignored = 1;"],
  [
    "no-unsafe-type-assertion",
    "export const narrowed = ({} as unknown) as string;",
  ],
  ["no-unsafe-assignment", `export const assigned: string = JSON.parse('{}');`],
  [
    "no-unsafe-argument",
    `function consume(value: string): string { return value; } export const argument = consume(JSON.parse('{}'));`,
  ],
  ["no-unsafe-call", `export const called: unknown = JSON.parse('{}')();`],
  [
    "no-unsafe-member-access",
    `export const member: unknown = JSON.parse('{}').field;`,
  ],
  [
    "no-unsafe-return",
    `export function returned(): string { return JSON.parse('{}'); }`,
  ],
  [
    "switch-exhaustiveness-check",
    `export function omitted(value: 'a'|'b'): number | undefined { switch(value) { case 'a': return 1; } return undefined; }`,
  ],
  [
    "complexity",
    "export function complex(value: number): number { " +
      Array.from(
        { length: 31 },
        (_, n) => `if(value === ${n}) return ${n};`,
      ).join(" ") +
      " return -1; }",
  ],
  [
    "max-depth",
    "export function deep(value: boolean): number { " +
      "if(value) { ".repeat(6) +
      "return 1;" +
      " }".repeat(6) +
      " return 0; }",
  ],
  [
    "max-params",
    "export function parameters(a: number,b: number,c: number,d: number,e: number,f: number): number { return a+b+c+d+e+f; }",
  ],
  [
    "noInlineConfig",
    "// eslint-disable-next-line complexity\nexport const disabled = 1;",
  ],
  ["malformed AST", "export const malformed = ;"],
];
try {
  const positive = run();
  if (positive.status !== 0)
    throw Error("Исходный production gate не проходит:\n" + positive.output);
  console.log(JSON.stringify({ control: "positive", status: "passed" }));
  const brokenTool = mkdtempSync(join(tmpdir(), "download-quality-tool-"));
  try {
    const fake = join(brokenTool, "luacheck");
    writeFileSync(fake, "#!/bin/sh\necho QUALITY_TOOL_FAILURE >&2\nexit 73\n");
    chmodSync(fake, 0o755);
    const result = run({
      ...process.env,
      PATH: brokenTool + ":" + process.env.PATH,
    });
    if (result.status === 0 || !result.output.includes("QUALITY_TOOL_FAILURE"))
      throw Error("Отказ инструмента не блокирует gate: " + result.output);
    console.log(
      JSON.stringify({ control: "tool-failure", status: "rejected" }),
    );
  } finally {
    rmSync(brokenTool, { recursive: true, force: true });
  }
  for (const [rule, source] of cases) {
    put(scope[0] + "__quality_negative.ts", source);
    const result = run();
    clean();
    const expected =
      rule === "malformed AST"
        ? /[Ss]yntax|[Pp]ars|TS1109|[Ee]xpression expected/
        : new RegExp(rule);
    if (result.status === 0 || !expected.test(result.output))
      throw Error("Контроль не обнаружен: " + rule + "\n" + result.output);
    console.log(JSON.stringify({ control: rule, status: "rejected" }));
  }
  /** @type {[string, string, string, RegExp][]} */
  const discovered = [
    [
      "new-helper-types",
      "tools/__quality_negative.mjs",
      '/** @type {number} */\nexport const value = "invalid";\n',
      /TS2322/,
    ],
    [
      "new-helper-eslint",
      "tools/__quality_negative.mjs",
      '/** @type {string} */\nexport const value = JSON.parse("null");\n',
      /no-unsafe-assignment/,
    ],
    [
      "new-format",
      "__quality_negative.json",
      '{"quality":true}\n',
      /Code style issues/,
    ],
    [
      "new-lua-types",
      "__quality_negative.lua",
      "---@param value string\nlocal function identity(value)\n  return value\nend\nreturn identity({})\n",
      /param-type-mismatch/,
    ],
    [
      "new-mjs-eslint",
      scope[0] + "__quality_negative.mjs",
      `/** @param {number} a @param {number} b @param {number} c @param {number} d @param {number} e @param {number} f */
export function parameters(a,b,c,d,e,f) { return a+b+c+d+e+f; }`,
      /max-params/,
    ],
    [
      "new-lua-lint",
      "__quality_negative.lua",
      "return unknown_quality_global\n",
      /113.*unknown_quality_global/,
    ],
    [
      "new-shell-lint",
      "__quality_negative.sh",
      "#!/usr/bin/env bash\necho $quality_value\n",
      /SC2086/,
    ],
    [
      "new-yaml-duplicate",
      "__quality_negative.yml",
      "name: first\nname: second\n",
      /key-duplicates|duplicated|Duplicate|must be unique|is repeated/i,
    ],
    [
      "new-workflow",
      ".github/workflows/__quality_negative.yml",
      "name: Negative\non: push\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ${{ invalid_quality.value }}\n",
      /invalid_quality/,
    ],
  ];
  for (const [control, path, source, expected] of discovered) {
    // Повтор YAML-ключа должен дойти до диагностики форматтера/парсера.
    if (control === "new-yaml-duplicate" || control === "new-format") {
      const file = join(root, path);
      if (existsSync(file)) throw Error("Контрольный путь уже занят: " + file);
      writeFileSync(file, source);
      files.push(file);
    } else put(path, source);
    const result = run();
    clean();
    if (result.status === 0 || !expected.test(result.output))
      throw Error("Контроль не обнаружен: " + control + "\n" + result.output);
    console.log(JSON.stringify({ control, status: "rejected" }));
  }
  put(
    scope[0] + "__quality_cycle_a.ts",
    "import { b } from './__quality_cycle_b.ts'; export function a(): number { return b(); }",
  );
  put(
    scope[0] + "__quality_cycle_b.ts",
    "import { a } from './__quality_cycle_a.ts'; export function b(): number { return a(); }",
  );
  const cycle = run();
  clean();
  if (cycle.status === 0 || !cycle.output.includes("no-production-cycles"))
    throw Error("Cycle не обнаружен:\n" + cycle.output);
  console.log(
    JSON.stringify({ control: "no-production-cycles", status: "rejected" }),
  );
  put(
    scope[0] + "__quality_boundary.ts",
    "import * as internal from 'course-core/domain/vocabulary.ts'; export const boundary = internal;",
  );
  const boundary = run();
  clean();
  if (
    boundary.status === 0 ||
    !boundary.output.includes("providers-use-public-api")
  )
    throw Error("Internal import не обнаружен:\n" + boundary.output);
  console.log(
    JSON.stringify({ control: "providers-use-public-api", status: "rejected" }),
  );
} finally {
  clean();
}
