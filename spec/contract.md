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

Core `artifacts/resolve.ts` предоставляет
`resolveArtifact(run,{source,exerciseId,kind?})`; результат имеет kind/projectRoot,
для starter partition student, для conditions — готовые файлы portable native
condition/resources. Caller-supplied audience не принимается. Download отбирает
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
