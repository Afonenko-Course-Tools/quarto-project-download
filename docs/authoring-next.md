---
type: authoring-guide
component: project-download
status: accepted-next
updated: 2026-10-08
---

# Новый банк и безопасные ZIP

Это подготовка согласованного следующего выпуска, а не обещание опубликованной версии. [Целевой контракт Core](../../quarto-course/spec/authoring-model-next.md) задаёт общую модель; [план владельца](plans/2026-10-08-implementation.md) фиксирует порядок внедрения и свежие проверки. Существующие публичные API владельца сохраняются. После реализации и проверки эти правила переносятся в действующий контракт и README. Минимум следующего выпуска — Quarto 1.11.5, CUE 0.17.1.

Обычные явно объявленные `project-download.resources` сохраняют независимость от Core/CUE. Новый банк не меняет `prepare`/`finish`, `inspectOwnedRequests`/`clearOwnedRequests`, детерминированный ZIP, manifest ownership и порядок validation-before-cleanup.

Явный `course-model: true` включает только существующий мост к текущему NativeRun Core. В student мост не получает restricted задачу и не создаёт из её проекта заявку на скачивание. В full используется безопасная `body.publicExercises`, а не полный teacher payload. Выбирается только `<project>/student`; teacher tests, reference/solution, исходные QMD, metadata и build-входы не становятся ZIP.

`statementVisibility` относится к сайту; participant-safe `visibility: public` из отдельного Print/PL экспорта не служит разрешением для публичного Download. Заявка ресурса на сайте всё равно проходит текущую Core public resource policy. `RESOURCE.PRIVATE_OR_SOURCE` сохраняется, включая raw project roots после удаления задачи из student-проекции.

После переключения full → student проверяется собственный текущий output ZIP вместе с HTML, search, каталогом QRC и ресурсами. Pre-hook удаляет только свои прежние requests/archives выбранного output; чужие ZIP и другие audience outputs сохраняются. Нельзя считать сохранённый `course.json` или старую страницу текущим inventory.

Native внешнее действие GitHub source может вести к точному QMD. Source modal и сырые QMD с закрытыми условиями не копируются в student output. Архивирование не заменяет настройки native `project.resources`: автор исключает закрытые исходные каталоги из обычной веб-публикации.

`examples/materials` остаётся обычным native проектом с набором данных без банковского opt-in. Собственного demo Release для Download не создаётся: интеграционные resource сценарии входят в готовые группы их производителей.

Сейчас release pins ещё указывают на последние опубликованные теги. Новые install/demo/source refs появятся только после решения о версиях и успешных releases; новый URL до этого не выдумывается. Готовый asset должен содержать точный producer commit и фактические зависимости в `BUILD.json`. Эта подготовка не подтверждает render, CI или выпуск.
