---
type: plan
component: project-download
status: accepted-next
---

# Download: план владельца

Статус: подготовка шагов 1–2 выполнена; новое поведение ещё не реализовано. Выполнять пункт 11 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md)
задаёт поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

Сверить существующий `_extensions/project-download/diagnostics.ts`; изменить `_extensions/project-download/domain/{config,zip}.ts`, `_extensions/project-download/application/publish.ts`, `_extensions/project-download/infrastructure/{files,runtime}.ts`, `_extensions/project-download/{filter,shortcodes}.lua`, `_extensions/project-download/ownership.ts`, `_extensions/project-download/entrypoints/{pre,post}.ts`. Сохранить `prepare`/`finish`/inspectOwnedRequests/clearOwnedRequests и независимость обычных resources от Core. Optional Core bridge получает актуальный выбранный participant проект; закрытые исходники/решения/teacher resources не превращаются в student ZIP. RESOURCE.PRIVATE_OR_SOURCE не переименовывается. DOWNLOAD diagnostics получают resource/request/path/profile/field; ZIP64/entry guards получают ZIP_INVALID без изменения writer. Git check-ignore exit 1 — штатное отсутствие match; refusal >1/native inspect failure сохраняет tool/status/оба потока и foreign Core cause/ID. Unknown stack не гасить.

Обновить `README.md`, уточнить существующий `docs/diagnostics.md`, owner plan и `tests/{archive,ownership,native,native-installed,render,install-context}.ts`. Проверки: `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh` (archive/render/ownership/native/native-installed и install-context namespaced/plain/active). Проверить unknown resource/unavailable profile/empty selection/symlink/path escape/чужой ZIP collision/Git refusal. Отдельного demo release ради Download нет: затронутые resource scenarios используют producer группы.

## Завершение

Оформить актуальный индекс спецификаций, README и собственный справочник
диагностик; примеры показывают правильную русскую авторскую разметку.
Старые plans/probes сохранить в Git до удаления из активной ветки.

Сверить свежие required checks и owner PR, слить в main и проверить merged SHA.
Выпустить новую версию с точными уже выпущенными зависимостями; готовую группу
демо, если она есть, выпускать отдельным проверенным asset. Старые Releases
не заменять. Финальная очистка веток только после общего маршрута:
main + служебная gh-pages, если используется, + heads OPEN automatic PR.
Здесь сохранить commit/PR/tag/SHA, фактические проверки и ссылки на готовые assets.


## Подготовка шагов 1–2 — 8 октября 2026

Общий старт: 02:36 Europe/Minsk; deadline: 11:36 (9 часов). Root назначил
документальной задаче reasoning ultra; модель исполнителя не менялась.

- Рабочая ветка: `feat/authoring-model-20261008`, создана в исходном checkout
  перед сохранением материалов; пользовательский `main` не сбрасывался.
- Preservation commit: `6801f71fd5e93994b178f5a3dea7c5e4c7504473`. Dirty/untracked планы сохранены до
  включения свежего `origin/main` `fc8b517995a4a2d3a179a08f916e5ff2b0ee87f9`. Этот upstream соответствует
  опубликованному `v1.1.1` и является предком текущего рабочего дерева.
- [Карта истории, source provenance и восстановление](../history-index.md).
  Полные snapshot/source-state/SHA256 карты сохранены в Git commit
  `3de07a2e29bfff2913af61e7b1c048f59fb302dd`, затем убраны из active tree после координации.
  Исходники root остались без изменений; локальные и upstream owner планы
  сохранены отдельно с provenance refs.
- Один исходный worktree; существующие local heads не имеют уникальных
  коммитов относительно свежего origin/main. Ветки, теги и Releases сохранены.
- Ignored авторских материалов не обнаружено.
- CI: optional Core fixture `v3.0.2`; собственного demo Release у Download нет.
- README выделяет [текущий индекс](../../spec/index.md) и контракт; `main`
  явно unreleased. Типы/владельцы/status отделяют current и accepted-next.

OPEN PR: нет по свежему gh pr list; новые PR на этом этапе не создавались.
Tool Release `v1.1.1` подтверждён свежим `gh release list`, draft/prerelease
false. Демонстрации не имеют отдельного Download Release.

Фактическая проверка подготовки: свежий `git fetch origin --prune --tags`,
`gh pr list`, `gh release list`; SHA256 и bytes каждого сохранённого snapshot;
`git diff --check`/`git diff --cached --check`; ancestry `origin/main` и
отсутствие unresolved merge markers; локальные ссылки README/index/контрактов.
Runtime tests и CI здесь не запускались: код импортирован из опубликованного
upstream и не изменён исполнителем. Старые evidence/CI не принимаются за новые
проверки. Свежая runtime матрица принадлежит последующему пункту владельца.

Ruling: свежий upstream уже содержит диагностику 7 октября; дальнейший шаг
проверяет и дополняет реальный код, а не повторяет старый unchecked план.
Конфликтующие owner планы сохранены в обеих версиях; active historical текст
берётся из свежего upstream, а нынешний маршрут — только этот plan/accepted-next.
Цена ошибки — лишняя история, без потери исходных документов.

Ruling: после координации сохранённые historical snapshots и старые owner
plans/probes убраны из active tree; восстановимые SHA/paths указаны в карте истории.
Root и пользовательские worktrees не удалялись. Текущие spec/docs и план 8 октября
сохранены; transferred decisions закреплены в current/accepted-next контрактах.

Блокирующих расхождений для подготовки нет. Baseline ещё содержит Quarto 1.10.x
в workflows и descriptor; удалить одновременно с runtime/README/examples на пункте владельца.
Следующий шаг ждёт новый текущий Core contract/Body; новые поля не заявлены
поддерживаемыми данным preflight. Merge в shared main, push, CI, release и
публикация не выполнялись.


## Подготовка документации пункта 11 — 8 октября 2026

Документационный исполнитель работает по принятым Core решениям; модель не
менялась. Добавлена [подготовка авторства](../authoring-next.md) `accepted-next`,
ссылки из README и индекса. Существующие current API/контракты не объявлены
мигрированными до проверки runtime. Примеры на этой ветке предназначены для
следующей модели; native ordinary Quarto сохранён вне bank opt-in.

- Свежая проверка: `git diff --check`; 26 локальных Markdown-ссылок
  README/spec/docs/плана/README примеров существуют; 1 авторских YAML
  файлов успешно прочитаны. Проверка исключает generated/dependency деревья.
- Активные примеры не содержат старых kinds exam/handout, solution `for`,
  fixture sentinel/literal текста и Quarto 1.10.x. Русский lang сохраняется,
  публичные native проекты задают `fail-if-warnings: true`.
- Машинные descriptors/workflows и runtime/tests не изменялись этим исполнителем.
  Старые выпущенные dependency/demo/source pins сохранены как baseline;
  **новые release pins ожидают решения о версиях и фактических Releases**.

Full dependent suites/CI/render против меняющегося Core здесь не запускались.
Следующий runtime исполнитель выполняет команды выше, проверяет текущие
student/full outputs и выбранный экспорт, после чего документальная подготовка
переносится в current README/контракт. Merge/push/release/публикация не выполнены.
