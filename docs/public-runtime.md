# Публичная Native публикация Download

Core открывает `withNativePublication(expectation, selection, use)` и внутри
callback предоставляет `NativePublication`: текущие catalog/identity/course,
condition/document/resources и project-contract batch. Core проверяет семантику
публикуемых документов и владеет audience, path и lifetime guards.
Обычная публикация не требует полной grading/seed qualification PL.

Orchestrator вызывает `PL.inspectPublication(publication)` только при активном
`course.adapters: [prairielearn]`. Установленный, но неактивный PL не запускает
inspection. Отсутствующий активный PL — ошибка; ошибка инициализации установленного
модуля сохраняет исходную причину. Download сам PL не загружает.

`prepareNativeDownloads(publication, options)` собирает готовые ZIP bytes внутри
живого callback. Native root/profiles/projection/source output берутся из Core;
options задают конечный destination, baseUrl/catalogBaseUrl/referenceCatalog и
submission. `PreparedDownloads` владеет своими bytes/options. Методы Core, project contexts и PL
capabilities не сохраняются в draft.
Обычные ресурсы получаются через `publication.resourceFiles(request)` как
`NativeResourceFiles {audience, files: [{source, target, bytes}]}`.

После успешного closing вызывается `draft.publish()`. Состояния одноразовые:
`prepared → publishing → published|failed` либо `prepared → discarded`.
Повторный/reentrant publish отклоняется до записи. `discard()` до публикации
освобождает draft; после success/failure освобождает только buffers. Во время
publishing discard отказывает. Discard не удаляет старые, чужие или частично
записанные outputs. При closing rejection сохранённый внутри callback handle
позволяет discard; новые archive writes этого draft ещё не начались.

`resetDownloadRequests(root)` удаляет только прежнюю owned requests directory
с прежними path guards. Он не inspect-ит output и не удаляет ZIP.
`clearOwned` вызывается только final writer. Именной
`.project-download-manifest.json` записывается перед архивами: следующая обычная
очистка знает собственные имена даже после частичной writer failure. Это не
rollback всех результатов render/Site. JSON artifacts receipts, per-ZIP SHA и
release proof больше не создаются, не читаются и не чистятся; исторические
сохранённые файлы не мигрируются. CRC и deterministic ZIP packaging сохраняются.

Project plans переиспользуются по format/project/audience внутри
`publication.withProjectContracts`: запрос передаёт `directories` с каталогами
кодовых проектов, а `context.input` является абсолютным каталогом. Loader читает
предметный YAML без технического QMD или копии дерева. `materializationClosure`
сохраняет bases/resources/reference tokens; QRC связывает ссылки до единственного
README writer. `materializeCondition` включает условие/resources без code/build.
Download не исправляет README или ZIP после Core writer.

Student/full соответствуют Core projections student/author. Explicit starter
в author получает `DOWNLOAD.STARTER_UNQUALIFIED`: author condition не является
student-набором файлов. Full в student требует открытой demonstration с фактическим
публичным решением. Reveal model остаётся `CONDITION_UNQUALIFIED`, HTML fallback
не создаётся. Role filtering не квалифицирует произвольный неразмеченный текст
или свежесть native execution cache.

`finishDownloads(root, options)` обслуживает отдельный ordinary resource режим
без Core и PL. Его inspect/config/resource privacy guards сохраняются; native
flag, observe callback и самостоятельное acquisition внутри finish удалены.
Native CLI post orchestrates Core session, optional PL inspection, preparation,
closing и publish. Author выбирается `--native --author`, student — `--native`.

Адресные существующие fixtures проверяют ZIP entries/README/resources, конечные
URL, privacy, одноразовую запись, сохранение чужих outputs и публикацию готовых
bytes после удаления временных заявок. Повторной сверки SHA или состояния
исходников/заявок перед записью нет. Source ref
не подтверждает приёмку полного курса, assignment/P, CI или установленный выпуск.
