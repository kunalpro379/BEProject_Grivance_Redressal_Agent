# Visual Hierarchy Diagrams

## 1. Overall Administrative Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     STATE GOVERNMENT                         │
│                  (state_officials table)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   DISTRICT OFFICIALS                         │
│                (district_officials table)                    │
│              District Collector, DM, etc.                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   CITY COMMISSIONER                          │
│                  (city_officials table)                      │
│              Municipal Commissioner, Mayor                   │
│                                                              │
│  Fields:                                                     │
│  • city_id (FK → cities)                                    │
│  • district_id (FK → districts)                             │
│  • reports_to (FK → government_officials)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ↓                       ↓
┌──────────────────────┐  ┌──────────────────────┐
│   WARD OFFICERS      │  │  CITY-LEVEL DEPT     │
│ (ward_officers)      │  │     OFFICERS         │
│                      │  │ (departmentofficers) │
│ Ward 1, 2, 3...      │  │                      │
│                      │  │ Not ward-specific    │
│ Fields:              │  │                      │
│ • ward_id            │  │ Fields:              │
│ • city_id            │  │ • city_id            │
│ • reports_to_        │  │ • reports_to_        │
│   city_official_id   │  │   city_official_id   │
└──────────┬───────────┘  └──────────────────────┘
           │
           ↓
┌──────────────────────┐
│  WARD-LEVEL DEPT     │
│     OFFICERS         │
│ (departmentofficers) │
│                      │
│ Assigned to wards    │
│                      │
│ Fields:              │
│ • ward_id            │
│ • city_id            │
│ • reports_to_        │
│   ward_officer_id    │
└──────────────────────┘
```

## 2. City-Level Detailed Structure

```
                    MUMBAI CITY COMMISSIONER
                    (city_officials table)
                    ┌─────────────────────┐
                    │ John Doe            │
                    │ City Commissioner   │
                    │ Mumbai Municipal    │
                    │ Corporation         │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ↓                      ↓                      ↓
┌───────────────┐      ┌───────────────┐     ┌───────────────┐
│ WARD OFFICER  │      │ WARD OFFICER  │     │ WARD OFFICER  │
│   (Ward 1)    │      │   (Ward 2)    │     │   (Ward 3)    │
├───────────────┤      ├───────────────┤     ├───────────────┤
│ Jane Smith    │      │ Bob Johnson   │     │ Alice Brown   │
│ Zone: North   │      │ Zone: South   │     │ Zone: East    │
└───────┬───────┘      └───────┬───────┘     └───────┬───────┘
        │                      │                      │
    ┌───┴───┐              ┌───┴───┐             ┌───┴───┐
    ↓       ↓              ↓       ↓             ↓       ↓
┌────────┐ ┌────────┐  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Water  │ │ Roads  │  │ Water  │ │Sanit.  │ │ Roads  │ │Electric│
│ Dept   │ │ Dept   │  │ Dept   │ │ Dept   │ │ Dept   │ │ Dept   │
│Officer │ │Officer │  │Officer │ │Officer │ │Officer │ │Officer │
└────────┘ └────────┘  └────────┘ └────────┘ └────────┘ └────────┘
```

## 3. Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS TABLE                              │
│  (Base table for all user types)                                │
│  • id (PK)                                                       │
│  • email, password_hash, full_name                              │
│  • role (citizen, ward_officer, city_official, etc.)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬────────────────┐
         │               │               │                │
         ↓               ↓               ↓                ↓
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐
│  CITIZENS   │  │CITY_OFFICIALS│  │WARD_OFFICERS │  │  DEPT    │
│             │  │              │  │              │  │ OFFICERS │
│ • user_id   │  │ • user_id    │  │ • user_id    │  │          │
│   (FK)      │  │   (FK)       │  │   (FK)       │  │• user_id │
└─────────────┘  │ • city_id    │  │ • city_id    │  │  (FK)    │
                 │   (FK)       │  │   (FK)       │  │          │
                 │ • district_id│  │ • ward_id    │  │• dept_id │
                 │   (FK)       │  │   (FK)       │  │  (FK)    │
                 │ • reports_to │  │ • reports_to_│  │          │
                 │   (FK)       │  │   city_      │  │• city_id │
                 └──────┬───────┘  │   official_id│  │  (FK)    │
                        │          │   (FK) ──────┼──┤          │
                        │          └──────┬───────┘  │• ward_id │
                        │                 │          │  (FK)    │
                        │                 │          │          │
                        │                 │          │• reports_│
                        │                 │          │  to_city_│
                        └─────────────────┼──────────┤  official│
                                          │          │  _id (FK)│
                                          │          │          │
                                          │          │• reports_│
                                          └──────────┤  to_ward_│
                                                     │  officer_│
                                                     │  id (FK) │
                                                     └──────────┘

Legend:
PK = Primary Key
FK = Foreign Key
→  = References/Links to
```

## 4. Reporting Flow Diagram

```
GRIEVANCE ASSIGNMENT FLOW
═════════════════════════

Citizen Files Grievance
         │
         ↓
    ┌────────────┐
    │  SYSTEM    │ ← Analyzes location, department, priority
    └─────┬──────┘
          │
          ↓
    ┌─────────────────────────────────────┐
    │  ASSIGNMENT LOGIC                   │
    │                                     │
    │  IF ward-specific issue:            │
    │    → Assign to Ward Officer         │
    │                                     │
    │  IF city-wide issue:                │
    │    → Assign to City Commissioner    │
    │                                     │
    │  IF department-specific:            │
    │    → Assign to Dept Officer         │
    └─────┬───────────────────────────────┘
          │
          ↓
    ┌─────────────────┐
    │ WARD OFFICER    │
    │ (if ward issue) │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │ DEPT OFFICER    │
    │ (executes work) │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │ WARD OFFICER    │
    │ (reviews)       │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │ CITY OFFICIAL   │
    │ (final approval)│
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │ RESOLVED        │
    └─────────────────┘
```

## 5. Data Flow for Queries

```
QUERY: "Get all officers under City Commissioner X"
══════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────┐
│ SELECT * FROM city_hierarchy_structure                   │
│ WHERE city_official_id = 'X'                             │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────┐
│ VIEW: city_hierarchy_structure                           │
│ (Joins city_officials + ward_officers + dept_officers)  │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│city_officials│  │ward_officers │  │departmen-    │
│             │  │              │  │tofficers     │
│ WHERE       │  │ WHERE        │  │              │
│ id = 'X'    │  │ reports_to_  │  │ WHERE        │
│             │  │ city_official│  │ reports_to_  │
│             │  │ _id = 'X'    │  │ city_official│
│             │  │              │  │ _id = 'X'    │
│             │  │              │  │ OR           │
│             │  │              │  │ reports_to_  │
│             │  │              │  │ ward_officer │
│             │  │              │  │ _id IN (...)  │
└─────────────┘  └──────────────┘  └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ RESULT: Complete hierarchy with all officers             │
│ • City Commissioner details                              │
│ • All Ward Officers under them                           │
│ • All Department Officers (ward-level & city-level)      │
└──────────────────────────────────────────────────────────┘
```

## 6. Permission & Access Control Flow

```
PERMISSION HIERARCHY
════════════════════

┌─────────────────────────────────────────────────────────┐
│ CITY COMMISSIONER                                        │
│ Access Level: 5                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • View all grievances in city                       │ │
│ │ • Assign to any ward officer                        │ │
│ │ • Approve budgets                                   │ │
│ │ • Manage all officers                               │ │
│ │ • Access all reports                                │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ WARD OFFICER                                             │
│ Access Level: 3                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • View grievances in assigned ward                  │ │
│ │ • Assign to dept officers in ward                   │ │
│ │ • Approve ward-level expenses                       │ │
│ │ • Manage dept officers in ward                      │ │
│ │ • Access ward reports                               │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ DEPARTMENT OFFICER                                       │
│ Access Level: 2                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • View assigned grievances only                     │ │
│ │ • Update work status                                │ │
│ │ • Submit expense reports                            │ │
│ │ • Request resources                                 │ │
│ │ • Access own performance reports                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 7. Escalation Path

```
ESCALATION HIERARCHY
════════════════════

Issue at Department Officer Level
         │
         ↓
    [Timeout/SLA Breach]
         │
         ↓
    Ward Officer
    (reviews & decides)
         │
    ┌────┴────┐
    │         │
    ↓         ↓
Resolve   Escalate
         │
         ↓
    City Commissioner
    (final authority)
         │
    ┌────┴────┐
    │         │
    ↓         ↓
Resolve   Escalate to
         District/State
```

## 8. Table Relationships Summary

```
FOREIGN KEY RELATIONSHIPS
═════════════════════════

city_officials
├── city_id          → cities.id
├── district_id      → districts.id
├── reports_to       → government_officials.id
└── department_id    → departments.id

ward_officers
├── city_id                    → cities.id
├── district_id                → districts.id
├── ward_id                    → wards.id
├── reports_to_city_official_id → city_officials.id
└── reporting_to               → users.id (legacy)

departmentofficers
├── city_id                    → cities.id
├── ward_id                    → wards.id
├── department_id              → departments.id
├── reports_to_city_official_id → city_officials.id
└── reports_to_ward_officer_id  → ward_officers.id

government_officials (unified table)
├── user_id         → users.id
├── role_id         → government_roles.id
├── state_id        → states.id
├── district_id     → districts.id
├── city_id         → cities.id
├── ward_id         → wards.id
├── department_id   → departments.id
└── reports_to      → government_officials.id (self-reference)
```

## Legend

```
┌─────┐
│ Box │  = Entity/Table
└─────┘

   │
   ↓     = One-to-Many Relationship

   ═     = Strong/Primary Relationship

   ─     = Weak/Optional Relationship

  (FK)   = Foreign Key

  (PK)   = Primary Key
```
