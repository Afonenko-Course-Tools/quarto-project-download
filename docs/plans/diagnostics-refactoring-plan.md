# План рефакторинга диагностики Download — 7 октября 2026

Для исполнения: subagent-driven-development либо executing-plans по выбранному
способу. **Цель:** русская ошибка показывает ресурс/запрос/путь и сохраняет
Quarto/Git/Core cause. **Архитектура:** prepare → native requests → finish →
resource selection/git-ignore → native ZIP → publication.
**Средства:** нынешние Deno/Lua/ZIP; Core импортируется только опциональным
course-model/courseProcessed маршрутом. **Основание:** [общий план](../../../specs/course-change-plan.md#исследование-и-план-рефакторинга-7-октября-2026).
База main `2d20327`, подтверждена через GitHub.

Сохраняются ownership API, resource semantics и RESOURCE.PRIVATE_OR_SOURCE;
нет общего subprocess/error framework и mandatory accumulator. Контрпримеры
только internal tests, CI без нового warning gate.
При ревью проверить: неизвестный ресурс, unavailable profile/empty selection, symlink
или path escape, collision чужого ZIP и внешний Git/Core отказ.

## DL1 Контекст и внешний запуск

Создать: `_extensions/project-download/diagnostics.ts` с чистой локальной
`diagnostic(code,message,context?,cause?) → Error & {code:string}`.
Изменить: `domain/config.ts`, `application/publish.ts`, `infrastructure/files.ts`,
`runtime.ts`, `filter.lua`, `shortcodes.lua`, `ownership.ts`, `domain/zip.ts`.
Все runtime-пути относятся к `_extensions/project-download/`; runtime.ts здесь
означает infrastructure/runtime.ts. Pure helper не зависит от IO;
domain/config.ts не импортирует infrastructure ради форматирования ошибок.
Сохранить `prepare(root)`, `finish(root,current?) → Promise<number>` и
inspectOwnedRequests/clearOwnedRequests. Новые неименованные guards:
`DOWNLOAD.CONFIG_INVALID`, `DOWNLOAD.REQUEST_INVALID`, `DOWNLOAD.PATH_INVALID`,
`DOWNLOAD.RESOURCE_UNAVAILABLE`, `DOWNLOAD.SELECTION_EMPTY`, `DOWNLOAD.OUTPUT_CONFLICT`.
Существующие неименованные ZIP64/entry-name guards получают `DOWNLOAD.ZIP_INVALID`
с entry/размером и пояснением ограничения, без изменения самого ZIP writer.

- [x] Дополнить tests/archive.ts/ownership.ts/native.ts: ID/resource/path/profile,
  отсутствие повреждения чужого ZIP и сохранение исходного Core ID.
- [x] Перевести собственные English native-context сообщения и обогатить guards,
  не менять allowed inputs/resource/profile/ownership policy.
- [x] При inspect/Git init refusal сохранить tool, status и оба потока/cause.
  Для git check-ignore код 1 остаётся штатным «нет совпадений», а не новой ошибкой;
  текущий guard code > 1 сохраняется. Tests используют fake Git/native command.
- [x] Выполнить названные tests через `quarto run tests/<имя>.ts`;
  native tests получают CORE=/home/tolya/course-tools/quarto-course.
  Проверка изменений и коммит без нового standalone Core dependency.

## DL2 Entry points и документация

Изменить: `entrypoints/pre.ts`, `post.ts`, README. Создать: `docs/diagnostics.md`.

- [x] Ожидаемые свои ошибки печатаются однократно, foreign отказ сохраняет ID/
  cause, неизвестное исключение сохраняет stack; просьбы о ZIP после отказа
  не публикуются как успешный результат.
- [x] Русский справочник ID/смысла/действия и корректные snippets. Native
  source-переход относится к документу, resource download — к артефакту;
  эти действия не объединяются собственным UI.
- [x] Выполнить `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh`
  на обеих версиях, включая installed/namespaced/plain/active fixtures.
- [ ] Проверка изменений, PR и выпуск только затронутого инструмента из merged SHA.
  Отдельную demo-группу ради диагностики не создавать; применимые resource
  scenarios проверяются существующими группами производителей.

## Локальный результат текущего рефакторинга

DL1/DL2 реализованы на исходной базе main2d20327. Локальная чистая функция
создаёт Error с code/context; process failure хранит tool/exit/stdout/stderr/cause.
Неизвестные исключения запуска повторно выбрасываются с исходным stack.
Git check-ignore code1 остаётся штатным; успешный stderr выводится без warning-parser.
Ранний exit19 Git со stdin больше64KiB воспроизвёл потерю foreign stream и получил
RED→GREEN; исходный CommandOutput сохраняется как cause. Нативный shortcode
с unknown параметром сначала позволял exit0 из-за Quarto global error logger;
существующий guard завершён встроенным assert и проверен обоими Quarto.
Собственные IDs, context/foreign outputonce, unknownstack, unavailableprofile,
путь/ZIP32 и чужойZIPпобайтно проверены; acceptance/ownership/API сохранены.

Полный tools/check.sh: Quarto1.10.18 и1.11.5, CUE0.17.1, локальный Corecandidate —
exit0 оба. Включены diagnostics/archive/render/ownership/native/native-installed
и namespaced/plain/active native installs. Все затронутые TS плюс новые/изменённые
tests прошли bundled Deno check; diff и новый purehelper/test fmt check проходят.
Независимое ревью, финальные coordinated pins, PR/CI/merge и выпуск остаются
координатору; старые релизы не менялись. Отдельная demo-группа не создавалась.
