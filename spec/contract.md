---
type: contract
component: project-download
status: current
---

# Контракт Download 3

Текущий ref — кандидат **3.2.2**; до публикации соответствующего тега он unreleased.

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

Core `artifacts/resolve.ts` предоставляет
`resolveArtifact(run,{source,exerciseId,kind?})`; результат имеет kind/projectRoot,
для starter partition student и точный files inventory из Core materializer,
для conditions — готовые файлы portable native condition/resources.
Caller-supplied audience не принимается. Явный files inventory упаковывается
без повторного generic excludes: только Core разрешает controlled учебную .git.
Если Core не предоставил files (прежний full project API), Download отбирает
обычные файлы разрешённой partition, сохраняя README bytes и root student/.gitignore,
исключая source QMD/config/extensions/generated/build/cache/class/jar. README не
проходит Quarto rendering. Generic resource guards при model full не ослабляются.

ZIP: STORE, UTF-8, фиксированная дата, sorted names; independent fresh runs дают
одинаковые bytes. Symlink/path escapes/специальные файлы/чужие output collisions
запрещены. Pre-hook очищает только owned output текущего audience и requests.
Другие outputs и чужие ZIP сохраняются. Private artifacts receipt schema
`project-download-artifacts-v1` содержит name/sha256, model kind/exerciseId/source,
profiles и sourceRunHash. Receipt подтверждает архивы, не runtime verification.

Ownership API inspectOwnedRequests/clearOwnedRequests сохраняет protocol1;
files имеют optional artifacts вместе с source/resources/sha256. Native writer,
inspect и cleanup выполняются последовательно, закрытые поля всей области
проверяются до удаления. Current NativeRun должен совпадать с project/output и
содержать каждый source заявки. Retained страницы и course.json не авторизуют bytes.

Все requests/receipts/generated inputs исключаются из публикации. Course Core
authoring не использует audience wrappers; full-only страницы и model permissions
определяют преподавательское содержание. Полная acceptance проверяет реальные
student/full/student DOM, каждый ZIP, privacy, QRC/search/hrefs и установленный пакет.

Receipt audience берётся из trusted NativeRun course.view, независимо от названий profiles и kind. Каждому модельному архиву соответствует audience его source документа; общий audience задан для однородного run, при смешанном run — null и явный список audiences. ZIP basename collision между generic/model заявками — ошибка независимо от порядка ссылок.

## Пакетная proof-фаза необязательного Core-моста

Если установленный Core предоставляет `withNativeArtifactBatch`, production
runtime вызывает его один раз для загрузки NativeRun и всех заявок. Callback
использует bound resolver и actual run для прежних проверок source, profiles,
audience и ресурсов. Внутри callback Download сохраняет собственные копии ZIP
bytes и готовые receipt facts в памяти. До успешных завершающих Core guards
не выполняются owned cleanup и публикационные записи, включая пустой пакет.
Отказ callback либо Core оставляет прежние outputs без изменений этой операции.

После batch return runtime применяет существующие destination/foreign receipt
и createNew guards к фиксированным bytes: manifest первым, ZIP затем, receipt
последним. Ошибка записи не создаёт новый success receipt; manifest сохраняет
прежнюю возможность очистки прерванной записи. Это не атомарная ZIP-транзакция.
Самостоятельный pre-hook cleanup сохраняет прежнее назначение.

На старом Core остаётся полностью guarded standalone fallback. Явный
`finish(root,current)` сохраняет standalone semantics; новый phase parameter
в публичном Download API не вводится. Для быстрого маршрута нужен Core 8.2.3
с указанным internal export; exact native совместимость проверяется отдельно.

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
