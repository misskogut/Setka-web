# SENIOR ASTRA · VERSTAK POST-FLIGHT SYSTEM GAP REVIEW

STATUS: MANDATORY PHASE 2
PARENT TASK KEY: GENESIS-WAKE-SENIOR-ONESESSION-20260906-7F31
RUN ONLY AFTER: GENESIS ONE-SESSION FLIGHT TEST checkpoint is complete

## MISSION

После практического Genesis flight test проведи короткую, но системную ревизию VERSTAK и ответь:

> Что ещё необходимо разработать, убрать, объединить, переподключить или формализовать, чтобы VERSTAK работал так, как теперь определён его канон?

Это НЕ вторая большая археология и НЕ новый цикл исправлений. Не трать фазу на широкую разработку. Используй факты полёта, актуальный AS-IS Supabase/код и текущий CANON, чтобы выдать точную карту дальнейшей разработки.

## SOURCE OF TRUTH

Сверяй вместе:
- фактический результат TEST-0 / MASHA / LERA / NIKITA;
- пользовательские фронтовые эпизоды;
- AI Guard cases;
- information needs;
- association traces;
- baseline/retest;
- текущий GitHub frontend/runtime;
- актуальный Supabase AS-IS;
- утверждённый Genesis canon.

Для каждого вывода разделяй:
- AS-IS — что реально есть;
- CANON — как должно быть;
- GAP — точная разница.

## REVIEW TARGETS

Проверь минимум следующие контуры:

1. GENESIS CORE
- естественный ввод → устойчивое знание;
- рождение mission/entity/relation;
- organ birth;
- sector birth;
- local crew birth;
- lifecycle корабля.

2. ONBOARD / ZERO FRICTION
- понимание человека;
- инициативность;
- NEXT BEST ACTION;
- продолжение после паузы;
- где пользователь вынужден знать внутреннее устройство SETKA.

3. TIME / TRANSCRIPT
- append-only;
- фактическая история;
- retrospective analysis;
- future/scenario separation;
- внутреннее корабельное время;
- provenance.

4. DYNAMIC FRONT
- front = projection of real ship state;
- birth/visibility органов;
- presentation spec;
- contextual evidence/graphs;
- blackbox technical entities stay hidden.

5. PENCIL
- gesture/target/intent;
- presentation-only mutation;
- semantic request boundary;
- undo/history/provenance if still missing.

6. MISSION / SECTOR / CREW
- birth criteria;
- change/merge/split/finish lifecycle;
- local vs mother infrastructure;
- what is backend entity vs front grouping.

7. AI GUARDS
- INGRESS;
- EGRESS;
- INFORMATION;
- validation;
- learning trace;
- when repeated cases can stop using AI.

8. ACTIVE INVESTIGATION
- uncertainty representation;
- missing-variable detection;
- value of information;
- data request / experiment proposal;
- recomputation after new observations.

9. EXTERNAL WORLD
- web/APIs/files/connectors/user data;
- provenance;
- distinction between user fact, external fact, observation and AI suggestion.

10. ASSOCIATIONS / FLEET LEARNING
- LOCAL association;
- FLEET candidate;
- accepted generalized association;
- contradiction/confidence/provenance/privacy;
- safe reuse without leaking another user’s life.

11. IDENTITY / AUTH / SHIP SCOPE
- PERSON/SETKA ID;
- password/auth;
- ship ownership;
- session;
- scope;
- recovery/expiry/multi-device gaps relevant to release.

12. SECURITY / LEGACY SURFACE
Use real Supabase warnings and classify:
- RELEASE BLOCKER;
- REQUIRED HARDENING;
- LEGACY DEBT.
Do not claim system-wide security clean unless proven.

13. MOTHER FLEET
- what mother can see;
- what local ships cannot see;
- fleet health/learning/capability-gap view;
- synthetic test isolation.

14. BLACKBOX CLEANUP
Classify historical or duplicated components only as:
KEEP / MERGE / MIGRATE / DEPRECATE / REMOVE LATER.
Do not delete them during this review.

## TARGET SPINE

From the evidence, derive the MINIMAL implementation-independent spine VERSTAK actually needs.

Do not simply copy all existing tables.

Name only the universal primitives/loops that must survive architecture cleanup.

## ROADMAP

Sort future work into:

P0 · GENESIS BLOCKERS
Without these a new user ship cannot honestly work.

P1 · CLOSED USER LOOP
Needed so a person can live with the ship end-to-end.

P2 · SELF-LEARNING / AUTONOMY
Needed to reduce AI dependency and improve investigation.

P3 · FLEET / SCALE
Needed for many ships and safe heredity.

P4 · LEGACY CLEANUP
Can follow after the new spine is stable.

For every recommended task state briefly:
- problem;
- evidence;
- required capability;
- reuse existing component or build/merge what;
- dependency;
- acceptance test;
- priority.

## TOP 10

End with exactly TEN next development actions in the order the team should execute them.

These ten must be actionable and dependency-aware, not broad themes.

## DO NOT BUILD YET

Give a short list of attractive but premature things that should NOT consume development time yet.

## FINAL REPORT

The final combined report after Phase 2 must contain:

1. FLIGHT VERDICT
2. TEST FLEET ACCESS
3. VERIFIED CAPABILITIES
4. MISSING CAPABILITIES
5. WRONG / DUPLICATED / LEGACY CAPABILITIES
6. TARGET SPINE
7. ROADMAP P0-P4
8. TOP 10 NEXT ACTIONS
9. DO NOT BUILD YET
10. RELEASE GATE
11. FINAL ANSWER: «Что конкретно нам теперь делать с системой, в каком порядке и почему?»

## STOP RULE

Не начинай вторую волну реализации после этого аудита.

Phase 2 заканчивается РАПОРТОМ И ROADMAP.

Цель — оставить Президенту и команде ясную карту разработки, а не снова потратить лимит на бесконечные исправления.
