---
type: contract
component: project-download
status: current
---

# Контракт Download 3

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
ссылку; authoritative Core resolver повторно проверяет kind по trusted current
NativeRun. Full обычного упражнения разрешён в full audience; открытая demonstration
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
Core writer; ordinary reveal model остаётся CONDITION_UNQUALIFIED. Actual
root-generated resources вместе с release proof имеют адресный Core blocker;
его нельзя обходить предгенерацией или снятием guards. Подробности и границы
bounded проверки перечислены в публичном runtime, полный rollout не заявлен.

ZIP: STORE, UTF-8, фиксированная дата, sorted names; independent fresh runs дают
одинаковые bytes. Symlink/path escapes/специальные файлы/чужие output collisions
запрещены. Pre-hook очищает только owned output текущего audience и requests.
Другие outputs и чужие ZIP сохраняются. Новые receipts `project-download-artifacts-v2` содержат name/sha256,
model kind/exerciseId/source, profiles, operation, публичную identity и release proof/metrics.
Receipt подтверждает архивы, а не source authority. Старый v1 узнаётся только
как собственный cleanup объект; смысл NativeRun sourceRunHash не переименован.

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
