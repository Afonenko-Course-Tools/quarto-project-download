# Download 3.3.0

Кандидат объединяет ранее независимо проверенную native B3 ветку
`ad79ee55f91d367feeeb4615b4a71099850f21d2` и main `10cb38f2ba5c88e585a0ff6800adf5fc2b77597e`
с сохранением обеих Git историй. Исходные version-only snapshots сохранены.

Публичные owner/resource/condition гарантии B3 объединены с контекстом
наблюдения ABI 1 и прежними restricted env permissions из main. Publisher
сохраняет также main preview startup guard. Download не возвращает private
NativeRun fallback; его прежние harness проверки перенесены на actual public
операции и явный отказ старого carrier, mapping сохранён в tests.

Независимая приёмка объединения и настоящие CI окончательных SHA выполняются
отдельно. Этот файл не утверждает их прохождения. Новый immutable tag и release
создаются только после необходимых проверок; прежние опубликованные теги не
заменяются. Полный курс135, assignment/P/OCI/installed квалифицируются отдельно.
