> Исторический план/исследование. Актуальный маршрут от 8 октября 2026: [план владельца](2026-10-08-implementation.md).
> Исходный текст сохранён без правок; его старые статусы и конфликтующие правила не действуют.
> Нужные материалы сохранить в Git до удаления из активной ветки.

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

- [ ] Дополнить tests/archive.ts/ownership.ts/native.ts: ID/resource/path/profile,
  отсутствие повреждения чужого ZIP и сохранение исходного Core ID.
- [ ] Перевести собственные English native-context сообщения и обогатить guards,
  не менять allowed inputs/resource/profile/ownership policy.
- [ ] При inspect/Git init refusal сохранить tool, status и оба потока/cause.
  Для git check-ignore код 1 остаётся штатным «нет совпадений», а не новой ошибкой;
  текущий guard code > 1 сохраняется. Tests используют fake Git/native command.
- [ ] Выполнить названные tests через `quarto run tests/<имя>.ts`;
  native tests получают CORE=/home/tolya/course-tools/quarto-course.
  Проверка изменений и коммит без нового standalone Core dependency.

## DL2 Entry points и документация

Изменить: `entrypoints/pre.ts`, `post.ts`, README. Создать: `docs/diagnostics.md`.

- [ ] Ожидаемые свои ошибки печатаются однократно, foreign отказ сохраняет ID/
  cause, неизвестное исключение сохраняет stack; просьбы о ZIP после отказа
  не публикуются как успешный результат.
- [ ] Русский справочник ID/смысла/действия и корректные snippets. Native
  source-переход относится к документу, resource download — к артефакту;
  эти действия не объединяются собственным UI.
- [ ] Выполнить `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh`
  на обеих версиях, включая installed/namespaced/plain/active fixtures.
- [ ] Проверка изменений, PR и выпуск только затронутого инструмента из merged SHA.
  Отдельную demo-группу ради диагностики не создавать; применимые resource
  scenarios проверяются существующими группами производителей.
