# SETKA — сквозной аудит: проверенный этап 1
Дата: 2026-10-23 (Europe/Saratov).
Статус: НЕ ЗАВЕРШЁН. Приёмка экосистемы и автономности НЕ подтверждена.
База кода: 323fa7dfd424b7ca95c1c96cc37c680cbd3ce507.

## Границы выполненной работы
Получен актуальный репозиторий, прочитаны AGENTS.md, входная документация и контракты платформы (большие совместные выводы документации были усечены; полное прочтение перед правками приложения ещё требуется). Выполнены безопасные запросы в действующую БД и публичные API. Реальный аккаунт владельца не авторизован и его архив не изменялся. Проверки не создавали десять пользователей, не публиковали тестовые паттерны, не меняли схему, функции, доступы и реальные пользовательские данные. Открытие обычного фронта могло создать штатную гостевую телеметрию; отсутствие любых фоновых записей браузера не заявляется.

## Проверенная архитектура
- GitHub Pages обслуживает standalone-v34.html и standalone-research-admin-v1.html.
- standalone-pattern-registry-v1.js + однофайловые модули -> scripts/build-pattern-manifest.mjs -> setka-pattern-manifest-v1.json.
- Общий загрузчик и Canvas runtime используются потребителями паттернов.
- Авторизация приложения — собственные Tester ID, пароль и сессии через setka-tester-account-v40; это не доказанный Supabase Auth flow. Приглашения выпускаются через общий issuer, который генерирует T-* ID; точные имена test01..test10 ещё не реализованы/не созданы.
- standalone-data-scope-v1.js разделяет локальные области; standalone-private-corpus-v40.js синхронизирует архив через setka-tester-archive-v37.
- Приватные архивы хранятся по устройствам, затем объединяются по tester_id. Эта многоклиентная модель требует реального теста конфликтов и удаления.
- prototype_v41_account_favorites / account_sessions / account_exposures -> текущие SQL views -> setka-community-patterns-v38 -> сообщество.
- setka-research-admin-v1 читает текущие факты аккаунтов, приватные архивы, исторические источники и источники replay; браузерный research-v1 строит представления.
- Фронт опрашивает каталог каждые 30 секунд; серверные кэши каталога имеют отдельные TTL (60 секунд в research admin и 300 секунд в community). Это не подтверждённый realtime.

## Контрольная сверка живых данных
| Показатель | Точный SQL count | Публичный API | Браузер |
|---|---:|---:|---|
| Аккаунты | 1 | connectedAccounts=1 | Не проверяется по списку пользователей |
| Текущие сохранения | 12 | configurationSaves=12 | 12 карточек |
| Уникальные конфигурации | 12 | items=12 | 12 карточек |
| Сохранения каждой конфигурации | min=max=1 | все saveCount=1 | все видимые сердца =1 |
| Сессии | 3 | sessions=3 | Не проверено через кабинет |
| Просмотры паттернов | 470 | exposures=470 | Не проверено через кабинет |

Это сверка количества, не побайтовая сверка конфигураций и не доказательство сквозной записи.
Оценочные rows из list_tables оказались неравны точным count(*); в выводах использованы только точные запросы.

## Матрица выполненных проверок
| Проверка | Метод | Ожидание | Факт / статус |
|---|---|---|---|
| Фронт | настоящий Chrome, production URL | библиотека открывается | PASS, 10 карточек паттернов |
| Для меня | настоящий браузер, гость | серверная лента | PASS отображения, 12 карточек ♥1; персонализация владельца не проверена |
| Популярное | настоящий браузер | переключение ленты | PASS отображения; все счётчики равны, качество сортировки не доказано |
| Новое | настоящий браузер | переключение ленты | PASS открытия; порядок по данным карточек не подтверждён |
| Заметки | настоящий браузер | публичные записи | PASS отображения, видна одна опубликованная запись от 15 октября |
| Админка | настоящий браузер | закрытый доступ | показана форма ключа, внутренняя админка не пройдена |
| overview без ключа | живой HTTP API | отказ | PASS, HTTP 403 invalid_admin_key |
| private archive без сессии | живой HTTP API | отказ | PASS, HTTP 401 auth_required |
| community feed | живой HTTP API | совпадение с БД | PASS по количествам, HTTP 200 |
| Время ответа feed | один HTTP запрос | измерить | 7714 мс; не p50/p95 и не время синхронизации |
| Контракты платформы/авторизации/сообщества | Node tests | отсутствие регрессий | 71 PASS |
| Research/replay/storage/state | Node tests | отсутствие регрессий | 88 PASS |
| Создание изолированной ветки | Supabase connector | отдельная БД без production data | BLOCKED: PaymentRequiredException, Pro plan required |
| 10 аккаунтов, реальные циклы и recovery | не выполнялось | настоящие регистрации и сессии | BLOCKED изоляцией |
| 3 новых алгоритма + отзыв/восстановление | не выполнялось в живой системе | подключение без изменений потребителей | UNVERIFIED |
| QA сообщество владельца | не реализовано/не выполнялось | защищённый просмотр тестовой группы | UNVERIFIED |
| Одновременные клиенты / сеть / retry | не выполнялось в живой системе | проверенные конфликты и идемпотентность | UNVERIFIED |
| Пульсометр / iPhone / Android | физические устройства | настоящие измерения и жесты | NOT TESTED |

Первый запуск 11 тестов autodiscovery завершился ошибкой окружения ENOENT /tmp. Повтор с TMPDIR внутри workspace: все 71 PASS. Ошибка окружения не объявляется дефектом продукта.
Существующий tests/setka-front-research-audit-browser.mjs явно подменяет все /functions/v1/**. Его результаты нельзя называть настоящим сквозным прогоном API/БД.
159 — сумма двух перечисленных запусков, не всё тестовое покрытие репозитория. Chromium/WebKit интеграции текущим исполнителем не запускались.

## Находки и риски
| ID | Категория | Подтверждение | Состояние |
|---|---|---|---|
| QA-01 | Изоляция | list_branches=[]; create_branch отклонён тарифом; docker/supabase CLI не найдены в PATH | Живой тестовый цикл заблокирован |
| QA-02 | Архитектура | _shared/pattern-catalog.mjs: loadManifest использует фиксированный production URL | Изолированная БД сама по себе не изолирует каталог; нужен общий конфиг окружения до добавления тестовых модулей |
| QA-03 | Безопасность БД | Две legacy-таблицы без RLS; anon/authenticated имеют SELECT/INSERT/UPDATE/DELETE и другие grants | Открытые права подтверждены SQL; HTTP эксплуатация и наличие чувствительных данных не проверялись; исправление не применено |
| QA-04 | Публикация / CI | Pages workflow не зависит от общего browser smoke; v34 smoke на текущем SHA cancelled, Pages success | Публикация не доказывает прохождение всех обязательных gates |
| QA-05 | Тестовое покрытие | Существующий браузерный аудит подменяет API | Не покрывает реальные записи, гонки и server read-back |
| QA-06 | Синхронизация | Разные TTL каталога + polling | Нужны измерения сквозной задержки и проверка версий во время смены каталога |
| QA-07 | Производительность | один живой feed=7714 мс | Нужны повторные ограниченные измерения и разделение холодного/тёплого вызова |

Две таблицы QA-03: public.prototype_legacy_service_metric_snapshots_v40 и public.prototype_legacy_pattern_metric_snapshots_v40.
Supabase явно требует не применять автоматическое включение RLS без решения о политиках: это может блокировать действующих потребителей.
Вариант для согласования после проверки потребителей:
```sql
ALTER TABLE public.prototype_legacy_service_metric_snapshots_v40 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prototype_legacy_pattern_metric_snapshots_v40 ENABLE ROW LEVEL SECURITY;
```
Политики должны следовать фактической модели доступа; здесь намеренно не добавлены широкие разрешающие политики.
Документация: https://supabase.com/docs/guides/database/postgres/row-level-security

## Публикация и CI на исходном SHA
- Pages: SUCCESS https://github.com/misskogut/Setka-web/actions/runs/39827751809
- Pattern platform: SUCCESS https://github.com/misskogut/Setka-web/actions/runs/39827751782
- v34 smoke: CANCELLED https://github.com/misskogut/Setka-web/actions/runs/39827751944
- Production front и форма admin реально открыты. Deployment SHA ресурсов страницы отдельно не сверен.
- Серверные функции текущим аудитом не развёртывались; паритет deployed source с Git ещё не подтверждён.

## Воспроизведение автоматических проверок
В рабочем каталоге репозитория:
```bash
mkdir -p .qa-tmp
TMPDIR="$PWD/.qa-tmp" node --test tests/setka-app-platform-guard.test.mjs tests/pattern-autodiscovery.test.mjs tests/pattern-platform-v2.test.mjs tests/setka-tester-account-ownership.test.mjs tests/standalone-v34-community-aggregate.test.mjs tests/standalone-v34-integrity.test.mjs
TMPDIR="$PWD/.qa-tmp" node --test tests/research-admin-v1-access.test.mjs tests/research-management-v1.test.mjs tests/front-cloud-integrity-v1.test.mjs tests/research-admin-v1.test.mjs tests/standalone-pulse-v1.test.mjs tests/research-replay-integrity-v1.test.mjs tests/standalone-v34-admin-restoration.test.mjs tests/standalone-v34-note-merge-integrity.test.mjs tests/state-persistence-v1.test.mjs tests/standalone-account-storage-transition.test.mjs
```

## Следующий обязательный этап
1. Получить отдельную работающую Supabase QA БД (ветка требует Pro; альтернативно предоставленное изолированное окружение).
2. Настроить общий конфиг API/catalog/origin для QA; исключить запросы QA к production, покрыть регрессией.
3. Развернуть совместимые schema/functions в QA; использовать настоящие auth API и безопасную передачу доступов.
4. Реализовать защищённый owner-only QA просмотр и видимую группу в research, без переключения настоящего личного архива владельца.
5. Выполнить 10 разных пользовательских сценариев и три однофайловых алгоритма; для каждого действия собрать correlation ID, write receipt, read-back, SQL/API/UI/admin сверку.
6. Исправлять обнаруженные первопричины с регрессионными тестами; затем Chromium/WebKit, отказоустойчивость, p50/p95 синхронизации и физические устройства.
7. Публиковать только исправления после gates; тестовые алгоритмы не выпускать в обычный каталог.

Ни один невыполненный пункт не считается PASS. Полный аудит не закрыт.
