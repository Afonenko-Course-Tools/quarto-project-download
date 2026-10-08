---
type: contract
component: project-download
status: current
---

# Контракт Download

`project-download.resources` — словарь явно разрешённых ресурсов. Источник списка
полей и значений по умолчанию — [domain/config.ts](../_extensions/project-download/domain/config.ts).
ID соответствует `^[a-z0-9][a-z0-9-]*$`. Ресурс задаёт обязательный `path` и
необязательные `include`, `exclude`, `profiles`, `gitignore`; неизвестные поля
отклоняются. Путь относится к текущему project root; начальный `/` обозначает
тот же корень. `include` по умолчанию `**/*`, `gitignore` — `true`.

Архив запрашивается только видимым после native projection shortcode.
`profiles` разрешает уже видимый запрос, а не скрывает ссылку. Отбор сохраняет
обычные файлы внутри выбранного каталога; symlink/path escape и чужой ZIP collision
отклоняются. `.gitignore` проверяется изолированным Git индексом, независимо от
внешнего репозитория и пользовательского состояния. Служебные каталоги, учебные
Quarto inputs и закрытые solution/reference/test части не выдаются как публичный
payload. Открытые стартовые исходники внутри `student/` допускаются.

ZIP использует STORE, UTF-8, фиксированную дату и сортировку имён. ZIP64 не
поддерживается. Pre-hook очищает собственные текущие requests и только ранее
owned архивы выбранного output; post-hook публикует `_downloads/<id>.zip`.
Манифест принадлежит Download, чужие архивы не удаляются.

Публичный [ownership.ts](../_extensions/project-download/ownership.ts) предоставляет
`inspectOwnedRequests(root, sources)` и `clearOwnedRequests(root, sources)`.
Снимок protocol 1 содержит канонические root/directory/files, source/resource IDs
и SHA256 текущих bytes. Guards проверяют всю область до cleanup. Потребитель не
воспроизводит внутренние имена и JSON transport. Native writer, inspect и cleanup
выполняются последовательно после завершения hooks; снимок не является блокировкой.

Обычные resources работают без Core/CUE. Только явный `course-model: true`
разрешает fallback shortcode ID в текущую native модель Core и выбранный
`<project>/student`. Если Core уже обработал AST, его public resource policy
применяется и без моста; собственная явная декларация имеет приоритет и тоже
проходит эту policy. Сохранённый `course.json` не используется.

[Core](../../quarto-course/spec/index.md) владеет participant-safe payload и
закрытыми partitions; Download сохраняет `RESOURCE.PRIVATE_OR_SOURCE` и не
делает solution/teacher материал публичным. Подключение, ограничения и точная
сигнатура ownership приведены в [README](../README.md), IDs — в
[диагностике](../docs/diagnostics.md).

## Restricted условия и ZIP сайта

StatementVisibility описывает публикацию условия. В student мост не получает
restricted задачу и не создаёт из её проекта download-заявку. В full используется
безопасная `body.publicExercises`, а не teacher payload. Participant-safe
`visibility: public` выбранного Print/PrairieLearn экспорта не даёт разрешения
публиковать restricted условие на student-сайте. Current Core resource policy,
включая `RESOURCE.PRIVATE_OR_SOURCE` и raw project roots, сохраняется.

Полная проверка переключения full → student охватывает current ZIP, HTML,
search, QRC и ресурсы. Pre-hook удаляет только свои заявки и owned архивы
выбранного output, сохраняя чужие ZIP и другие audience outputs.
Native GitHub source action может вести к QMD, но source modal и копирование
raw QMD с закрытыми телами в student output не включаются. Автор отдельно
исключает закрытые каталоги из обычного `project.resources`.

[Пример](../examples/materials/index.qmd) остаётся обычным native проектом с
набором данных без банка. Отдельного Download demo Release нет; интеграционные
resource сценарии входят в готовые группы их производителей.
