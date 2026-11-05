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

В HTML отдельный Para/Plain с одним shortcode оформляется
публичным конструктором `quarto.Callout` (`type: none`, `appearance: minimal`):
знак ⤓ и прежняя ссылка с `download`. Inline-контекст и существующие авторские
callout сохраняются без дополнительного обрамления. Другие форматы получают
прежнюю ссылку. Оформление не изменяет запрос, подпись, href, targets или ZIP;
новые CSS, параметры и зависимости не вводятся.

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
files имеют optional artifacts вместе с source/resources/configuration. Заявка
хранится как `requests/<owner-relative-source>/request.json`, без хеша. Путь
канонический, JSON source должен совпадать с адресом. Native writer,
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


## Ранняя и поздняя native-фазы

Quarto исполняет `project-download` через штатный shortcode callback. Ранний
Lua pre-ast проверяет авторские reserved Attr и начинает document-local buffer;
собственного чтения reader Span и режима `PROJECT_DOWNLOAD_LITERAL_ONLY` нет.
Порядок Download/Core не меняет native видимость поздних запросов.

Единственный request decoder — [domain/request.ts](../_extensions/project-download/domain/request.ts).
Он проверяет синтаксис всех actual callbacks, включая Code/Raw/attr и consumed
callbacks. Config, resource и default-kind policy применяются только к Span,
которые сохранились после штатных conditional/shortcode фаз Quarto. Допустимый
missing ID в Code/Raw/attr остаётся текстом без конфигурации и ZIP-заявки;
неверный синтаксис отказывает. Метаданные с сохранившимся Span разрешают ресурс.

Buffer необходим: callback может быть исполнен и затем превращён Quarto в текст
или удалён другим фильтром; один оставшийся AST не содержит его аргументов.
Span хранит только ordinal и текст callback, чтобы Quarto мог сохранить inline
или stringify поведение. Поздний обход использует те же записи buffer в порядке
видимого документа, а затем добавляет невидимые callbacks только для syntax check.
Другой input/root/format, отсутствие ранней фазы и повторный drain отвергаются;
лимиты — 16384 callbacks и 16 MiB сериализованных аргументов на документ.

Extended AST остаётся в Lua: штатные Callout/ConditionalBlock/Theorem
обрабатываются native walk без JSON round-trip целого позднего документа. `pandoc.utils.run_json_filter`
принимает и возвращает Pandoc-документ; пустой документ с MetaString переносит
один малый JSON batch в существующий TS decoder и его source/ordinal-bound
результат обратно. Решение TS превращается в штатный Link, а существующий
request.json сохраняет выбранные ресурсы до отдельного project post-render,
когда доступны все документы для ZIP. Это фазовые границы native API, не новые
форматы авторского источника. Список видимых callbacks и ZIP bytes отдельно не
копируются. Публичный `packageArtifact` сохраняет собственную защитную копию
внешних bytes до асинхронного обращения к Core.

Без callbacks TS child не запускается; иначе на документ нужен один поздний
child независимо от количества запросов. Новых inspect/hash на shortcode нет.
Полный курс и общий выигрыш производительности этим не заявляются.

В ordinary `finish` готовые `files.config` и пути явно подключённых
filters из `files.configResources` Quarto inspect защищают author config/filter
файлы от попадания в resource ZIP. Весь `configResources` не считается закрытым:
публичные CSV/CSS из metadata сохраняют обычную выдачу.
Quarto 1.11.5 не включает hook внутри `quarto run "путь с пробелами.ts"` в эти
списки и не выдаёт готовый argv: прежнее извлечение существующих путей сохранено
только для pre/post-render строк. Оно не исполняет команду и не объявляет полную
поддержку shell-синтаксиса. Адресная проверка — `tests/ordinary-source-guards.ts`.
