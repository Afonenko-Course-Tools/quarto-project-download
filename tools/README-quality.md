# Проверка качества собственного кода

Локальная проверка и CI используют одни блокирующие команды:

```sh
npm ci --ignore-scripts
npm run check-quality
npm run check-quality:controls
```

`scope` в `eslint.config.mjs` задаёт production-каталоги. Все существующие и
новые tracked/untracked `.ts`, `.js`, `.cjs`, `.mjs` обнаруживаются автоматически.
Vendor, node_modules, generated и _generated не входят в собственный код.
Пустой scope и `strict: false` запрещены. Структурные правила действуют на весь
собственный production-код: `complexity <= 30`, `max-depth <= 5`, `max-params <= 5`.
Списка успешно прошедших старых файлов, baseline и подавлений нет.

Typed ESLint проверяет `no-explicit-any`, `no-unsafe-type-assertion`,
`no-unsafe-assignment`, `no-unsafe-argument`, `no-unsafe-call`,
`no-unsafe-member-access`, `no-unsafe-return`, `switch-exhaustiveness-check`.
`@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` и inline отключения ESLint
завершают gate ошибкой. Линтер печатает конкретные диагностики и считает
предупреждения ошибками. Типизация не заменяется произвольными any или stub API.

Для TypeScript строится строгая программа из реального `deno info --json`
graph, `deno types`, Quarto import map и фактических публичных providers.
`CORE`, `PL`, `QRC`, `DOWNLOAD`, `SITE`, `COURSE_PERFORMANCE_SOURCE` позволяют
указать source roots; существующая переданная import map сохраняет приоритет.
Проверяются диагностики собственных production `.ts` и TypeScript-инструментов. Декларации `.d.ts`
обслуживают реальные типы потребителей; `skipLibCheck` пропускает их отдельную
семантическую проверку. Полные существующие Deno/source gates сохраняются.

JavaScript проверяется отдельной строгой `allowJs/checkJs` программой с
действующим `typecheck/javascript.json` либо `typecheck/browser.json` и настоящими
DOM/Node declarations. Deno globals в браузерный JS не подмешиваются. Структурные
правила действуют на production JS; typed правила также проверяют служебные JS.

TypeScript в npm devDependencies — совместимый peer parser/ESLint. Это отдельная
зависимость линтера; системный `tsc`, Compiler API, установленный CLI и Quarto/Deno
сохраняют продуктовые проверки. Точная версия host TypeScript не требуется.
TypeScript 7.0.2 фактически отвергнут текущим parser peer `<6.1.0`; принудительная
установка с `--force` или `--legacy-peer-deps` не используется.

Dependency-cruiser проверяет разрешаемый статический TS/JS import graph,
публичные границы providers и runtime cycles. Type-only цикл допускается;
импорт внутренних provider modules запрещён и для type-only связи. Динамически
вычисленный импорт не объявляется статически доказанным. Lua, Python и shell
сохраняют собственные существующие language-server/typechecker/lint gates;
прохождение TS graph не означает проверку всего Lua или dynamic graph.

`check-quality:controls` сначала требует чистый production gate, затем по одному
создаёт новые временные собственные файлы и запускает ту же `check-quality`
команду. Независимо проверяются каждое правило typed/structural набора, запрет
подавления, malformed AST, цикл и импорт внутренностей. Выход должен быть
ненулевым с диагностикой именно проверяемого правила. Файлы удаляются в `finally`.
Эту команду нельзя запускать одновременно с другим source gate того же checkout.
В CI она обязательна после положительного gate. Итоговый JSON положительного
входа сообщает TS/JS/structural counts и реальные версии parser/ESLint/compiler.

Собственные файлы форматируются одним владельцем: Prettier для TS/JS/CJS/MJS/JSON/YAML
(`embeddedLanguageFormatting: off`), StyLua для Lua, shfmt (`-i 2 -ci`) для shell,
Ruff format для появившихся Python. `check-quality` обнаруживает новые tracked и
untracked файлы через Git; вручную перечислять их в CI не требуется. Markdown,
QMD, учебные материалы, зависимости и canonical bridge Performance не форматируются
этим gate. Копии bridge обновляются только из канонического источника Performance.

Та же команда блокирует предупреждения LuaCheck, строгого LuaLS, ShellCheck,
`yamllint --strict` и actionlint. Известные globals Quarto/Pandoc разрешены в
`.luacheckrc` адресно; неизвестный global остаётся ошибкой. YAML оформляет Prettier,
а yamllint проверяет синтаксис и повтор ключей. Actionlint проверяет семантику всех
workflow и встроенный shell. Единственное исключение SC2016 относится к строке
`git submodule foreach`, где `$sm_path` раскрывает дочерний Git shell.

Стандартные CLI должны быть доступны в PATH: `prettier`, `stylua`, `shfmt`,
`luacheck`, `shellcheck`, `yamllint`, `actionlint`, LuaLS и имеющиеся Quarto/Deno.
Для нового Python нужны `ruff format --check` и `ruff check`.
Отсутствие или ненулевой выход инструмента блокирует проверку. Отрицательные
контроли проверяют реальный отказ инструмента и диагностики новых MJS/Lua/shell/
YAML/workflow файлов. Все собственные JS/CJS/MJS, включая служебные инструменты и ESLint config,
входят в strict checkJs и typed ESLint. TypeScript-инструменты также проходят
typed ESLint. Структурные ограничения и production dependency graph относятся
к production-каталогам; тестовые программы сохраняют собственный strict Deno gate.
Форма внешнего JSON и graph проверяется до использования; произвольных any или
подавлений в инструментах нет.
`typecheck/coverage.json` описывает текущую поставку, а языковые gates обнаруживают
новые файлы самостоятельно, сохраняя явное делегирование двух мостов Performance.
