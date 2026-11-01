---
type: contract
component: project-download
status: current
---

# Контракт Download 3

Текущий ref — кандидат **3.3.1**; до публикации соответствующего тега он unreleased.

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
`withCurrentNativeOperation`: actual condition, plan/materialize и inventory.
Download не читает project/student как fallback и не применяет generic excludes
к готовым owner bytes. Exact source/currentness и public/private policy остаются
Core. README проходит только owner writer. Подробнее —
[публичный runtime](../docs/public-runtime.md).

Текущий public owner проверяет effective release каждого документа до выдачи.
HTML student/full, condition-only closure и native default kind используют один
Core writer; ordinary reveal model остаётся CONDITION_UNQUALIFIED. Root-generated resources проверяются теми же текущими membership, visibility
и inventory guards; предгенерация не заменяет разрешённую текущую операцию.
Подробности и границы проверок перечислены в публичном runtime; полный rollout
проверяется отдельно.

ZIP: STORE, UTF-8, фиксированная дата, sorted names; independent fresh runs дают
одинаковые bytes. Symlink/path escapes/специальные файлы/чужие output collisions
запрещены. Pre-hook очищает только owned output текущего audience и requests.
Другие outputs и чужие ZIP сохраняются. Новые receipts `project-download-artifacts-v2` содержат name/sha256,
model kind/exerciseId/source, profiles, operation, публичную identity и release proof/metrics.
Receipt подтверждает архивы, а не source authority. Старый v1 узнаётся только
как собственный cleanup объект и не предоставляет authority текущей операции.

Ownership API inspectOwnedRequests/clearOwnedRequests сохраняет protocol1;
files имеют optional artifacts вместе с source/resources/sha256. Native writer,
inspect и cleanup выполняются последовательно, закрытые поля всей области
проверяются до удаления. Текущая public operation должна совпадать с root/profiles/output и
содержать каждый source заявки. Retained страницы и course.json не авторизуют bytes.

Все requests/receipts/generated inputs исключаются из публикации. Course Core
authoring не использует audience wrappers; full-only страницы и model permissions
определяют преподавательское содержание. Полная acceptance проверяет реальные
student/full/student DOM, каждый ZIP, privacy, QRC/search/hrefs и установленный пакет.

Receipt audience происходит из trusted native projection: student либо full
для author. Full demonstration artifact в student не меняет projection.

ZIP basename collision generic/model остаётся ошибкой независимо от порядка.

## Пакетная public proof-фаза

Runtime загружает actual public operation один раз. Все model inventories и
ordinary resource inventories получаются внутри её callback, без private
NativeRun/resolver imports. Один batch project contexts обслуживает все artifacts;
сравнение повторных заявок не создаёт ZIP. Упаковка каждого готового artifact
вызывается один раз. ZIP bytes и v2 receipt facts фиксируются в памяти.

После успешных owner/request fences публикация проверяет destination parents,
symlink и foreign collisions; manifest пишется первым, ZIP затем, receipt
последним. Ошибка записи не создаёт success receipt. Standalone pre cleanup
сохраняет своё назначение. Обычные resources без активного Core остаются
самостоятельными; старый private Core fallback в этом ref отсутствует.

Explicit starter требует native student condition. В author он адресно закрыт
DOWNLOAD.STARTER_UNQUALIFIED до genuine student authority; full artifact не
переименовывается в starter. Реальный bank full render с explicit starter остаётся
открытым integration gate, цели full135 этим отказом не сокращаются.

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
не подтверждают новую proof-фазу. Body v2 и delivery v3 этим дополнением
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
