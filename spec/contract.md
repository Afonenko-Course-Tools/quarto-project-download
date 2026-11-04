---
type: contract
component: project-download
status: current
---

# Контракт Download 3

Текущий ref — кандидат **3.5.0**; до публикации соответствующего тега он unreleased.

Обычный `project-download.resources` сохраняет закрытый словарь ресурсов:
path, include, exclude, profiles, gitignore. ID соответствует
`^[a-z0-9][a-z0-9-]*$`. Native projection определяет оставшиеся requests;
profiles разрешает уже видимую ссылку. ZIP обычного ресурса — `_downloads/ID.zip`.
Resource path guards отвергают symlink/escape, авторские Quarto inputs, служебные
и закрытые reference/solution/test части. Этот guard действует также в full.
Обычные resources не требуют Core/CUE.

Модельный запрос включается `course-model: true` и содержит exerciseId, необязательный
авторский kind (starter/full/conditions) и text. Он не повторяет path/profile/exclude
и не требует записи exercise ID в resources map. Native filter выбирает ровно одну
ссылку; authoritative Core resolver повторно проверяет kind по текущей публичной
операции Core. Full обычного упражнения разрешён в full audience; открытая demonstration
получает full также в student и может оставаться вне банка. Restricted упражнение
не выдаётся в student. Условия не включают решения/notes/private tests.

Typed transport хранит отдельные `artifacts: [{exerciseId, kind}]` вместе с source
и generic resources. Неизвестные поля, неизвестный kind, отсутствующий project,
несогласованный повторный запрос и запрещённый full дают ошибку до публикации.
У каждого model ZIP имя `ID-kind.zip`, контекстный caption при пустой text:
«Скачать заготовку», «Скачать полный проект», «Скачать условие».

Текущий native маршрут использует только Core `public.ts` и
`withNativePublication`: actual condition, plan/materialize и `ArtifactFiles`.
Download не читает project/student как fallback и не применяет generic excludes
к готовым owner bytes. Public/private policy остаётся в Core. README проходит только owner writer. Подробнее —
[публичный runtime](../docs/public-runtime.md).

Текущий public owner проверяет семантику публикации каждого документа до выдачи.
HTML student/full, condition-only closure и native default kind используют один
Core writer; ordinary reveal model остаётся CONDITION_UNQUALIFIED. Root-generated resources проверяются теми же текущими membership, visibility
и inventory guards; предгенерация не заменяет разрешённую текущую операцию.
Подробности и границы проверок перечислены в публичном runtime; полный rollout
проверяется отдельно.

ZIP: STORE, UTF-8, фиксированная дата, sorted names; independent fresh runs дают
одинаковые bytes. Symlink/path escapes/специальные файлы/чужие output collisions
запрещены. Pre-hook `resetDownloadRequests` очищает только requests, не ZIP.
`prepareNativeDownloads` собирает draft без final output writes/cleanup; publish
выполняется после Core closing. Одноразовые состояния и failure/discard semantics
задают [публичный runtime](../docs/public-runtime.md). Final writer очищает только
owned ZIP по именному manifest; partial failure не обещает rollback.
Artifacts receipts, их schema guards и per-ZIP SHA удалены; старые generated
receipts не мигрируются и не участвуют в текущей операции.

Ownership API inspectOwnedRequests/clearOwnedRequests сохраняет protocol1;
files имеют optional artifacts вместе с source/resources/configuration. Native writer,
inspect и cleanup выполняются последовательно, закрытые поля всей области
проверяются до удаления. Текущая public operation должна совпадать с root/profiles/output и
содержать каждый source заявки. Retained страницы и course.json не авторизуют bytes.

Все requests/generated inputs исключаются из публикации. Course Core
authoring не использует audience wrappers; full-only страницы и model permissions
определяют преподавательское содержание. Полная acceptance проверяет реальные
student/full/student DOM, каждый ZIP, privacy, QRC/search/hrefs и установленный пакет.

ZIP basename collision generic/model остаётся ошибкой независимо от порядка.

## Подготовка и публикация архивов

Orchestrator открывает actual Native publication один раз. Все наборы файлов model и
обычные наборы ресурсов получаются внутри её callback, без private
NativeRun/resolver imports. Один batch project contexts обслуживает все artifacts;
сравнение повторных заявок не создаёт ZIP. Упаковка каждого готового artifact
вызывается один раз. ZIP bytes фиксируются в Download-owned draft. Public helper
`packageArtifact` принимает функциональный `ArtifactFiles` без сертификатов, SHA,
rawSource или size и делает собственную раннюю копию bytes/targets. Проверяются
`ArtifactFilesSchema`, аудитория, paths и collisions. ZIP writer использует
фактические bytes для размеров и CRC32. Для SAB-backed Uint8Array сохраняется отдельная
поздняя ownership copy после schema parse; обычные bytes повторно не копируются. Подробнее — [публичная упаковка](../docs/public-inventory.md).

После успешного Core closing одноразовый publish проверяет
destination parents, symlink и foreign collisions; manifest пишется первым, ZIP
затем. Ошибка записи сохраняет manifest для следующей owned cleanup и не обещает
rollback. Повторного чтения заявок или проверки свежести перед записью нет.
Pre reset удаляет только requests. Обычные resources без активного Core
остаются самостоятельными; private Core fallback отсутствует.

Explicit starter требует native student condition. В author он адресно закрыт
DOWNLOAD.STARTER_UNQUALIFIED до genuine student authority; full artifact не
переименовывается в starter. Это адресный отрицательный контроль; обычный full
пользуется default kind. Конкретные authored courses и полный экспорт проверяются отдельно.

## Контекст наблюдения и дочерние процессы

Канонические фасады ABI 1 передают `attributes.extension_id: "project-download"`
и необязательный явный `document_id`. Документ не выводится из имени операции:
ресурсный `resourceFiles` и пакетная обработка нескольких заявок сохраняют общий
контекст без выбора одного произвольного документа. Общий runtime внутри
Download не вводится; разметка не заявляет полного семантического покрытия.

Только при активном контексте агента оба Git-процесса `infrastructure/files.ts`
получают полный снимок окружения через `childEnv` и `clearEnv: true`. Рабочие переменные сохраняются, а удалённый
устаревший `COURSE_PERF_PARENT_SPAN_ID` не восстанавливается наследованием Deno.
Существующий span `resourceFiles` задаёт родителя только в активном контексте.
Identity-ветка (`off`, отсутствующий агент или недоступное чтение режима)
сохраняет прежние разрешения и native inheritance: нового полного чтения env
и `clearEnv` нет. Фасад сохраняет исходные функции, Promise и переданное окружение.
Git selection, ZIP bytes и публичный ownership API сохраняют прежние правила.

Пакетный мост Core 8.2.3 и Download 3.2.2 требует собственной native/installed
проверки точных refs. Проверка ABI с тестовым агентом и прежний Core fallback
не подтверждают текущую publication-фазу. Body v2 и delivery v3 этим дополнением
не изменяются.

## Типы исполняемого договора

`Resource` выводится из фактических проверенных полей resource validator,
`Configuration` — из guarded output и реального empty default. Дублирующих
ручных интерфейсов нет. Optional `include/exclude/profiles/gitignore` и
`course-model` сохраняют ранее допускавшийся `null`; это не новая нормализация.
Исходные resource/map объекты, own undefined и пустой default сохраняются.
Локальные assertions используют только inferred guard types, а не отдельный DTO;
они нужны для сохранения object identity. Новый filesystem index, IO и child
process в validator не добавлены.

`quarto run tests/contract-consistency.ts` компилирует реальный consumer graph и
меняет actual path guard в отдельном scratch; числовой path обязан сломать
consumer typecheck. Before/after oracle сравнивает outputs и diagnostics;
archive/public inventory/runtime suites остаются самостоятельными gates.


## Ранняя и поздняя native-фазы 3.4.0

Download должен стоять перед Core в `filters` при раннем literal capture.
`PROJECT_DOWNLOAD_LITERAL_ONLY=1` — только ограничение actual callbacks, не
источник прав. В этом режиме собственный pre-ast filter переводит строгие
literal reader Span в прежний `.project-download-request`. Динамические,
неизвестные параметры и авторские reserved transport Attr отвергаются. Другие
shortcodes остаются в ведении Core. Core profile и prior authority по-прежнему
обязаны связывать реальные phases, bytes и окружение.

Единственный request decoder — [domain/request.ts](../_extensions/project-download/domain/request.ts).
Он проверяет syntax всех actual callbacks, включая consumed/stringify carriers.
Config, resource и default-kind policy применяются только к surviving inline
Span на прежней post-quarto фазе. Code/Raw/attr callback с допустимым missing ID
может оставаться текстом без конфигурации и ZIP-заявки; неверный syntax отказывает.
Metadata, реально дошедшая как inline Span, сохраняет обычное разрешение ресурса.

Lua сохраняет extended native AST и bounded document-local buffer. Поздний TS
получает один малый batch и возвращает source/ordinal-bound решения; whole late
AST не проходит JSON round-trip. Buffer не является authority и очищается при
drain; другой input/root/format, отсутствие ранней фазы и повторный drain отвергаются.
Лимиты buffer — 16384 actual callbacks и 16 MiB сериализованных аргументов на документ.

Без запросов новых TS children нет. Ordinary callbacks используют один late TS
child на документ, независимо от их числа. Restrictive literal документы могут
использовать один early и один late TS child. Предварительный AST preflight
нужен до генерации собственных markers; новых inspect, filesystem indexing или
hash на shortcode нет. Это не заявление об ускорении полного курса.

Restrictive runtime callback отказывает до Download buffer record, links и
sidecar. Уже выполненная Core early-фаза может оставить временные файлы; это
незавершённая операция, не delivery/publication/ZIP authority.
