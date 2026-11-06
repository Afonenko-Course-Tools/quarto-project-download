# Проверка собственного кода Download

Состав поддерживаемых файлов закреплён в `typecheck/coverage.json`.
`tools/check-types.ts` сверяет конечные списки TypeScript, Lua и shell с отслеживаемыми
исходниками Git и проверяет source, tests, tools и исполняемые fixtures.
Новые файлы добавляют в этот список в том же изменении.

## TypeScript

```sh
CORE=/path/to/quarto-course PL=/path/to/quarto-course-prairielearn QRC=/path/to/quarto-reference-catalog quarto run tools/check-types.ts
```

Если переменные не заданы, проверка ищет канонические соседние репозитории.
Она использует настоящие публичные модули зависимостей и штатные импорты
Quarto. Временная конфигурация удаляется после завершения процесса.
Действуют `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride` и
`useUnknownInCatchVariables`; отдельная статическая проверка запрещает
явный `any` и подавление ошибок TypeScript.

Внешний набор файлов для ZIP остаётся `unknown` до
`ArtifactFilesSchema.parse`. Защитное копирование bytes, проверки аудитории,
путей и конфликтов targets сохраняются при строгой типизации.

## Lua и shell

Для Lua нужен установленный `lua-language-server` 3.19.2 и поставляемые с
Quarto определения Pandoc/Quarto. Команды выполняются раздельно:

```sh
quarto run tools/check-types.ts --lua
for script in tools/check.sh _extensions/project-download/native-ts/late-filter.sh tests/fixtures/*.sh; do
  bash -n "$script"
done
shellcheck tools/check.sh _extensions/project-download/native-ts/late-filter.sh tests/fixtures/*.sh
```

Lua использует единый checker `quarto-course-performance@05803ba2ee66171cec12c5fb9027da2642e5518a`.
По умолчанию он берётся из соседнего `../quarto-course-performance`; переменная
`PERFORMANCE` задаёт другой checkout этой же закреплённой редакции. Тонкий вызов
передаёт конечный собственный список `--scope`, точное исключение канонического
bridge и каталог его типов. Собственного движка LuaLS и установщика здесь нет.
Каталоги Pandoc/Quarto определяются каноническим checker через `quarto --paths`.
`LUA_LANGUAGE_SERVER` при необходимости задаёт абсолютный путь к LuaLS 3.19.2.
Для CI применяется общий `tools/setup-lua-ci.sh` из того же Performance checkout:
он принимает новый абсолютный каталог, проверяет SHA256 и версию установки.
Контрольный `--probe` принадлежит тому же каноническому инструменту, а не локальной
копии настроек. Строгие type/strong/no-unknown, nil/union и форма таблиц сохраняются;
внешний bridge подключён как библиотека и не объявляется собственной проверкой.

Канонические `observability/bridge.ts` и `bridge.lua` создаются владельцем
Performance из его шаблона. Их проверку и синхронизацию выполняют по этому
источнику; локальное исправление производной копии не заменяет проверку
шаблона.

## Исполняемые fixtures и тестовые данные

Программы, которые тест действительно запускает через Deno, Pandoc или shell,
находятся в `tests/fixtures` и входят в соответствующие проверки. Тест копирует
этот же исходник; изменяемые пути передаются явными аргументами или окружением.
Проверка внешней строки не выдаётся за проверку содержащейся в ней программы.
Ожидаемые ошибки отрицательных контролей сохраняются.

Отдельно учитываются намеренно ошибочный `unknown.lua`, создаваемый LuaLS
probe, и две диагностические вставки в копии проверенных Lua-программ:
`tests/native-carriers.ts` добавляет marker callback, `tests/phase-cost.ts` —
marker обхода. Это генерируемые контрольные фрагменты, а не непрозрачные данные.
Проверка исходного Lua не выдаётся за статическую проверку изменённой копии:
отрицательный probe должен дать ожидаемую диагностику, а изменённые native
программы проверяются соответствующими сценариями исполнения. Измерительный
сценарий до render требует ровно одну известную точку подстановки.

Текст условия, JSON/YAML, изображения и непрозрачные bytes, которые используются
лишь как входные данные проверки ZIP, не являются отдельными исполняемыми
программами. Неиспользуемые private fixtures удалены после сверки вызовов;
[карта переноса](../tests/legacy-harness-mapping.md) указывает действующие гарантии.

Статическая проверка не подтверждает native render, полный состав ZIP,
приватность, браузерную выдачу или установленный выпуск. Эти результаты
проверяются штатным `bash tools/check.sh` и межкомпонентной приёмкой на точных
версиях зависимостей. `tools/check.sh` включает TS gate один раз.
