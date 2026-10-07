# Download: план владельца

Статус: следующий этап, реализация не начата. Выполнять пункт 11 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md)
задаёт поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

Создать `_extensions/project-download/diagnostics.ts`; изменить `_extensions/project-download/domain/{config,zip}.ts`, `_extensions/project-download/application/publish.ts`, `_extensions/project-download/infrastructure/{files,runtime}.ts`, `_extensions/project-download/{filter,shortcodes}.lua`, `_extensions/project-download/ownership.ts`, `_extensions/project-download/entrypoints/{pre,post}.ts`. Сохранить `prepare`/`finish`/inspectOwnedRequests/clearOwnedRequests и независимость обычных resources от Core. Optional Core bridge получает актуальный выбранный participant проект; закрытые исходники/решения/teacher resources не превращаются в student ZIP. RESOURCE.PRIVATE_OR_SOURCE не переименовывается. DOWNLOAD diagnostics получают resource/request/path/profile/field; ZIP64/entry guards получают ZIP_INVALID без изменения writer. Git check-ignore exit 1 — штатное отсутствие match; refusal >1/native inspect failure сохраняет tool/status/оба потока и foreign Core cause/ID. Unknown stack не гасить.

Обновить `README.md`, создать `docs/diagnostics.md`, owner plan и `tests/{archive,ownership,native,native-installed,render,install-context}.ts`. Проверки: `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh` (archive/render/ownership/native/native-installed и install-context namespaced/plain/active). Проверить unknown resource/unavailable profile/empty selection/symlink/path escape/чужой ZIP collision/Git refusal. Отдельного demo release ради Download нет: затронутые resource scenarios используют producer группы.

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
