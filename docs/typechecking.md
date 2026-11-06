# Проверка собственного кода Download

Состав поддерживаемых файлов закреплён в `typecheck/coverage.json`.
`tools/check-types.ts` сверяет конечный список TypeScript с отслеживаемыми
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
quarto run tools/check-lua.ts --probe
quarto run tools/check-lua.ts
for script in tools/check.sh _extensions/project-download/native-ts/late-filter.sh tests/fixtures/*.sh; do
  bash -n "$script"
done
shellcheck tools/check.sh _extensions/project-download/native-ts/late-filter.sh tests/fixtures/*.sh
```

`--probe` проверяет саму конфигурацию: намеренно неизвестный тип обязан
вызвать диагностику `no-unknown`. Обычная проверка включает строгую диагностику
типов, nil, union и формы таблиц. Она использует один процесс проверки LuaLS
и выводит полный JSON с диагностикой. `DOWNLOAD_QUARTO_SHARE` позволяет явно
указать штатный каталог `share`, если расположение Quarto нестандартное.

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
