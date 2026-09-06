# SENIOR ASTRA · GENESIS CHAINED DIRECTIVE

STATUS: ACTIVE PRESIDENT DIRECTIVE
TASK KEY: GENESIS-WAKE-SENIOR-ONESESSION-20260906-7F31
SENIOR IDENTITY: SETKA-S-0003-0001

## COMMAND

Выполнить ДВА поручения строго последовательно в рамках одного рабочего цикла.

НЕЛЬЗЯ начинать Phase 2 до завершения Phase 1.
НЕЛЬЗЯ завершать общую работу после Phase 1.
НЕЛЬЗЯ считать вторую фазу optional.

Если любой дочерний файл содержит правило завершить работу после собственного рапорта, этот CHAINED DIRECTIVE имеет высший приоритет: после Phase 1 рапорт считается CHECKPOINT REPORT, затем немедленно выполняется Phase 2, и только после Phase 2 создаётся FINAL COMBINED REPORT.

## PHASE 1 · GENESIS FLIGHT TEST

Прочитать и выполнить полностью:
`SENIOR_ASTRA_GENESIS_ONE_SESSION_FLIGHT.md`

Цель:
- короткий экспериментальный флот;
- FRONT-ONLY user simulation;
- USER / AI GUARD / SENIOR role firewall;
- baseline;
- максимум 1–3 корневых исправления;
- short retest;
- реальные TEST ID / Ship ID / passwords / user-front access;
- checkpoint verdict.

После Phase 1 обязательно сохранить:
- TEST FLEET ACCESS;
- checkpoint GENESIS_SMOKE_TEST_* verdict;
- список verified capabilities;
- remaining defects;
- фактические доказательства, необходимые для Phase 2.

НЕ ОСТАНАВЛИВАТЬСЯ.

## PHASE 2 · POST-FLIGHT SYSTEM GAP REVIEW

Сразу после checkpoint Phase 1 прочитать и выполнить:
`SENIOR_ASTRA_POST_FLIGHT_GAP_REVIEW.md`

Phase 2 использует именно факты только что завершённого полёта, а не абстрактную теорию.

Цель:
- AS-IS vs CANON vs GAP;
- определить, чего системе ещё не хватает;
- определить, что нужно свести/объединить/мигрировать/депрекейтить;
- вывести минимальный TARGET SPINE;
- построить roadmap P0–P4;
- выдать TOP 10 следующих действий разработки;
- назвать DO NOT BUILD YET;
- сформировать release gate.

В Phase 2 НЕ запускать новую большую волну реализации.
Это audit + roadmap.

## TOTAL SESSION BUDGET

Ориентир на весь рабочий цикл:

- 70% максимум — Phase 1 вместе с тестовым флотом, аудитом, 1–3 исправлениями и short retest;
- 30% минимум — Phase 2 + FINAL COMBINED REPORT.

Если Phase 1 начинает съедать резерв Phase 2:
1. прекратить расширять сценарии;
2. не добавлять новые корабли;
3. не чинить дефекты сверх трёх;
4. завершить short retest;
5. перейти к Phase 2.

Phase 2 и финальный combined report обязательны.

## FINAL COMBINED REPORT

Общая работа считается завершённой только когда Президент получил единый финальный рапорт, включающий минимум:

1. PHASE 1 FLIGHT VERDICT
2. TEST FLEET ACCESS — все TEST ID / Ship ID / login / passwords / front URLs / Run IDs
3. SHIP BIOGRAPHIES
4. ROLE LOG — USER / AI GUARD / SENIOR
5. VERIFIED CAPABILITIES
6. CAPABILITY GAPS
7. BASELINE vs RETEST
8. TARGET SPINE
9. ROADMAP P0–P4
10. TOP 10 NEXT DEVELOPMENT ACTIONS
11. DO NOT BUILD YET
12. RELEASE GATE
13. REMAINING RISKS / SECURITY DEBT
14. FINAL ANSWER: что команде делать дальше, в каком порядке и почему

## FAILURE MODE

Если лимит становится критическим, не продолжай исследование и не начинай новый repair.
Приоритет:
1. сохранить фактические результаты Phase 1;
2. выполнить минимально достаточный Phase 2 audit;
3. обязательно отдать доступы и roadmap.

Не завершай работу с незаписанными результатами.
