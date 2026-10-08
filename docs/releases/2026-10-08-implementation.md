---
type: implementation-report
component: quarto-project-download
status: completed
updated: 2026-10-08
---

# Download: внедрение 8 октября 2026

Это отчёт проверенных операций. Нормативные правила принадлежат
[текущим спецификациям](../../spec/index.md) того же ref; контракт выпуска
читается по точному immutable тегу.

Выпущен [v2.0.0](https://github.com/Afonenko-Course-Tools/quarto-project-download/releases/tag/v2.0.0), source SHA
`ee5ae76255d265ad7c7f43a765bc061ffc8eec75`, immutable Release ID `406380812`.
[PR #6](https://github.com/Afonenko-Course-Tools/quarto-project-download/pull/6)
прошёл проверки и слит с сохранением истории; дерево merged main равно tested PR head.
[Main CI](https://github.com/Afonenko-Course-Tools/quarto-project-download/actions/runs/37722486189)
завершился SUCCESS на указанном source SHA до публикации.

Optional Core bridge проверен с `v4.0.0`; standalone без Core/CUE; Download `v2.0.0`, Quarto 1.11.5.
Штатный remote-tag `quarto add` прошёл: все **12** установленных
пути и bytes совпали с upstream `_extensions` этого Git object, без overlay
и лишних файлов. Draft assets были скачаны и сверены до immutable публикации.

Полный существующий `tools/check.sh` прошёл: diagnostics/archive/render/ownership/native/native-installed, namespaced/plain/active install. ZIP/private ownership/hash/current-run guards и standalone маршрут без Core/CUE сохранены.

Отдельной demo группы/Release у Download нет. Он проверен собственными
native suites и remote-tag установкой; эта граница не подменена чужим демо.

Нативный Windows прогон не заявляется. Узкие path/CUE-TEMP исправления Core 4.0.0
подтверждены fixtures; чужие warning streams сохраняются с фактическим exit.
Подробные receipts и общий результат — [центральный отчёт Core](https://github.com/Afonenko-Course-Tools/quarto-course/blob/main/docs/releases/2026-10-08-implementation.md).

Первый сохранённый owner history checkpoint: `2c807dac27b9c2a8852d6b41a49c807877bd63d4`.
Шаг 17 выполнен; actual before/after receipt: `3 LOCAL / 1 REMOTE; main, all tags/Releases, serving gh-pages и API-confirmed OPEN bot heads сохранены`.
Более поздний docs/history main не переименовывает опубликованный source SHA.

Восстановление финальных снимков: [SOURCE-MAP](https://github.com/Afonenko-Course-Tools/quarto-project-download/blob/2c807dac27b9c2a8852d6b41a49c807877bd63d4/docs/history/2026-10-08-completion/SOURCE-MAP.json). После проверки exact Git blobs только этот новый датированный snapshot-каталог удаляется из active docs; архивный commit остаётся reachable. Последние планы и cleanup receipts: [Git checkpoint](https://github.com/Afonenko-Course-Tools/quarto-project-download/blob/c5aaeb43b94d3ccf131b5697d104b0fc1285a119/docs/history/2026-10-08-completion/final-journals/2026-10-08-implementation.md); [общая квитанция](https://github.com/Afonenko-Course-Tools/quarto-course/blob/35ab45a60d3859c4aa584499e4a49c5b8b6f14bf/docs/history/2026-10-08-completion/final-cleanup/03-verified-cleanup.json).
