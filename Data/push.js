// Data/push.js
// Run once with:  node push.js

require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');

const ALLOWED_USER_ROLES = new Set([
  'citizen',
  'officer',
  'supervisor',
  'department_head',
  'admin',
  'department_officer',
]);

function normalizeUserRole(role) {
  const r = String(role || '').trim();
  if (ALLOWED_USER_ROLES.has(r)) return r;

  // Map seed-specific roles -> DB enum user_role
  const lower = r.toLowerCase();
  if (lower === 'field_officer') return 'officer';
  if (lower === 'ward_officer') return 'officer';
  if (lower.endsWith('_level')) {
    // state_level, central_level, district_level, taluka_level, city_level
    if (lower === 'state_level' || lower === 'central_level') return 'admin';
    return 'supervisor';
  }
  return 'citizen';
}

// Deterministic UUID (v5-like) derived from a stable string.
// This makes IDs repeatable across runs instead of random.
function deterministicUuid(name) {
  const hash = crypto.createHash('sha1').update(String(name), 'utf8').digest();
  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
  const hex = bytes.toString('hex');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  );
}

function normalizeAadhaar(aadhaar) {
  if (aadhaar === null || aadhaar === undefined) return null;
  const s = String(aadhaar).trim();
  if (!s) return null;

  // Prefer digits if present
  const digits = s.replace(/\D/g, '');
  if (digits.length === 12) return digits;
  if (digits.length > 12) return digits.slice(-12);

  // Fallback: keep at most 12 chars (column is varchar(12))
  return s.length <= 12 ? s : s.slice(0, 12);
}

function ensurePasswordHash(hash) {
  const s = (hash ?? '').toString().trim();
  return s || 'seed_password_hash';
}

const ALLOWED_ESCALATION_LEVELS = new Set(['level_1', 'level_2', 'level_3', 'level_4']);

function normalizeEscalationLevel(level) {
  const s = String(level || '').trim();
  if (ALLOWED_ESCALATION_LEVELS.has(s)) return s;
  const lower = s.toLowerCase();
  if (lower === 'first' || lower === 'level1' || lower === '1') return 'level_1';
  if (lower === 'second' || lower === 'level2' || lower === '2') return 'level_2';
  if (lower === 'third' || lower === 'level3' || lower === '3') return 'level_3';
  if (lower === 'fourth' || lower === 'level4' || lower === '4') return 'level_4';
  return null;
}

const ALLOWED_GRIEVANCE_STATUSES = new Set([
  'submitted',
  'assigned',
  'accepted',
  'field_visit',
  'in_progress',
  'work_completed',
  'verified',
  'closed',
  'rejected',
]);

function normalizeGrievanceStatus(status) {
  const s = String(status || '').trim();
  if (ALLOWED_GRIEVANCE_STATUSES.has(s)) return s;
  const lower = s.toLowerCase();
  if (lower === 'pending') return 'submitted';
  if (lower === 'resolved') return 'closed';
  if (lower === 'completed') return 'work_completed';
  if (lower === 'open') return 'submitted';
  return 'submitted';
}
/**
 * Load seed data from db.json.
 * Supports either:
 *  - a single JSON object, or
 *  - multiple top-level JSON objects concatenated in the same file.
 * In the multi-object case, arrays for the same key are merged together.
 */
function loadSeedData() {
  const jsonPath = __dirname + '/db.json';
  const raw = fs.readFileSync(jsonPath, 'utf8');

  // First try normal JSON
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: treat file as multiple top-level JSON objects concatenated.
    // We wrap them in an array and insert commas between root objects.
    const fixed = '[' + raw.replace(/}\s*{/g, '},{') + ']';
    const blocks = JSON.parse(fixed);

    return blocks.reduce((acc, block) => {
      for (const [key, value] of Object.entries(block)) {
        if (Array.isArray(value)) {
          if (!acc[key]) acc[key] = [];
          acc[key].push(...value);
        } else if (value && typeof value === 'object') {
          acc[key] = { ...(acc[key] || {}), ...value };
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }
}

const seedData = loadSeedData();

const {
  departments = [],
  users = [],
  citizens = [],
  usergrievance = [],
  grievanceworkflow = [],
  grievancecomments = [],
  grievanceescalations = [],
  grievancefeedback = [],
  grievancecosttracking = [],
  departmentofficers = [],
  departmentknowledgebase = [],
  faqs = [],
  materialinventory = [],
  equipment = [],
  predictivemaintenance = [],
  repeatgrievancepatterns = [],
  department_dashboards = [],
  auditlog = [],
  aiinsights = [],
  tenders = [],
  contractors = [],
  tenderapplications = [],
  policydocuments = [],
  user_hierarchy = [],
  state_central_officials = [],
  district_officials = [],
  taluka_officials = [],
  city_officials = [],
  ward_officers = [],
  migrations: seedMigrations = [],
  refreshtokens = [],
} = seedData;

async function main() {
  // Hardcoded Supabase connection as requested
  const connectionString =
    "postgresql://postgres.hjpgyfowhrbciemdzqgn:kunalpro379@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Supabase direct connection
  });

  await client.connect();
  console.log('Connected to Postgres');

  try {
    await client.query('BEGIN');

    // 1) Departments (insert all, pick main water department for default linking)
    const departmentIdByName = {};
    const departmentIdByDepCode = {}; // logical dep code -> uuid (derived from name)
    let departmentId = null;
    const seenDepartmentNames = new Set();

    for (const deptJson of departments) {
      if (!deptJson || !deptJson.name) continue;
      if (seenDepartmentNames.has(deptJson.name)) continue;
      seenDepartmentNames.add(deptJson.name);

      const deptRes = await client.query(
        `
        INSERT INTO public.departments
          (id, name, description, contact_email, contact_phone, is_active,
           budget_allocated, budget_used, total_grievances,
           resolved_grievances, avg_resolution_time, performance_score, address)
        VALUES
          ($1,$2,$3,$4,$5,$6,
           $7,$8,$9,
           $10,$11,$12,$13)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          contact_email = EXCLUDED.contact_email,
          contact_phone = EXCLUDED.contact_phone,
          is_active = EXCLUDED.is_active,
          budget_allocated = EXCLUDED.budget_allocated,
          budget_used = EXCLUDED.budget_used,
          total_grievances = EXCLUDED.total_grievances,
          resolved_grievances = EXCLUDED.resolved_grievances,
          avg_resolution_time = EXCLUDED.avg_resolution_time,
          performance_score = EXCLUDED.performance_score,
          address = EXCLUDED.address,
          updated_at = now()
        RETURNING id, name;
        `,
        [
          deterministicUuid(`department:${deptJson.name}`),
          deptJson.name,
          deptJson.description,
          deptJson.contact_email,
          deptJson.contact_phone,
          deptJson.is_active,
          deptJson.budget_allocated,
          deptJson.budget_used,
          deptJson.total_grievances,
          deptJson.resolved_grievances,
          deptJson.avg_resolution_time,
          deptJson.performance_score,
          deptJson.address,
        ]
      );
      const row = deptRes.rows[0];
      departmentIdByName[row.name] = row.id;

      // derive logical dep code from name
      const lower = row.name.toLowerCase();
      if (lower.includes('water resources')) {
        departmentIdByDepCode["WAT/AMB"] = row.id;
      } else if (lower.includes('roads & public works')) {
        departmentIdByDepCode["ROAD/AMB"] = row.id;
      } else if (lower.includes('sanitation') || lower.includes('solid waste')) {
        departmentIdByDepCode["SAN/AMB"] = row.id;
      }

      console.log('Inserted department:', row.name, row.id);

      if (
        !departmentId ||
        lower.includes('water resources') ||
        row.name.includes('जलसंपदा')
      ) {
        departmentId = row.id;
      }
    }

    if (!departmentId) {
      const anyId = Object.values(departmentIdByName)[0];
      if (!anyId) {
        throw new Error('No departments found in seed data');
      }
      departmentId = anyId;
    }
    console.log('Using main departmentId for links:', departmentId);
    console.log('Department dep_id map:', Object.keys(departmentIdByDepCode));

    const pickDepartmentId = (depCodeOrNull) => {
      if (depCodeOrNull && departmentIdByDepCode[depCodeOrNull]) {
        return departmentIdByDepCode[depCodeOrNull];
      }
      return departmentId;
    };

    const depCodeFromPrefix = (s) => {
      if (!s || typeof s !== 'string') return null;
      // Examples:
      // - "WAT/AMB/001" -> "WAT/AMB"
      // - "MAT/WAT/PIPE/150" -> "WAT/AMB"
      // - "EQ/ROAD/ROLL/003" -> "ROAD/AMB"
      const parts = s.split('/');
      if (parts.length < 2) return null;
      const domain = parts[1].toUpperCase();
      if (domain === 'WAT') return 'WAT/AMB';
      if (domain === 'ROAD') return 'ROAD/AMB';
      if (domain === 'SAN') return 'SAN/AMB';
      return null;
    };

    // 2) Users (staff, government hierarchy, ward officers, etc.)
    const userByEmail = {};
    const userByRole = {};
    for (const u of users) {
      const normalizedRole = normalizeUserRole(u.role);
      const deptCodeByName =
        u.department_name && typeof u.department_name === 'string'
          ? u.department_name.toLowerCase().includes('water')
            ? 'WAT/AMB'
            : u.department_name.toLowerCase().includes('road')
              ? 'ROAD/AMB'
              : u.department_name.toLowerCase().includes('sanitation')
                ? 'SAN/AMB'
                : null
          : null;

      const deptIdForUser =
        u.role === 'department_officer' || u.role === 'field_officer'
          ? pickDepartmentId(deptCodeByName || 'WAT/AMB')
          : deptCodeByName
            ? pickDepartmentId(deptCodeByName)
            : null;

      const res = await client.query(
        `
        INSERT INTO public.users
          (id, email, password_hash, full_name, phone,
           role, status,
           department_id, department_name,
           designation, city, address,
           last_login, email_verified, approval_status)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,
           $8,$9,
           $10,$11,$12,
           $13,$14,$15)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          department_id = EXCLUDED.department_id,
          department_name = EXCLUDED.department_name,
          designation = EXCLUDED.designation,
          city = EXCLUDED.city,
          address = EXCLUDED.address,
          last_login = EXCLUDED.last_login,
          email_verified = EXCLUDED.email_verified,
          approval_status = EXCLUDED.approval_status,
          updated_at = now()
        RETURNING id, email, full_name, role;
        `,
        [
          deterministicUuid(`user:${u.email}`),
          u.email,
          ensurePasswordHash(u.password_hash),
          u.full_name,
          u.phone,
          normalizedRole,
          u.status,
          deptIdForUser,
          u.department_name || null,
          u.designation,
          u.city,
          u.address,
          u.last_login,
          u.email_verified,
          u.approval_status,
        ]
      );
      const row = res.rows[0];
      userByEmail[row.email] = row;
      if (!userByRole[row.role]) {
        userByRole[row.role] = [];
      }
      userByRole[row.role].push(row);
      console.log('Inserted user:', row.email, row.id);
    }

    // Convenience handles for named officers
    const rameshUser = userByEmail['r.patil@waterdept.in'];     // Executive Engineer
    const snehalUser = userByEmail['s.deshmukh@waterdept.in'];   // Junior Engineer
    const kuldeepUser = userByEmail['k.sharma@waterdept.in'];    // Field Officer

    // 3) Create citizen users + citizens table rows
    const citizenUserMap = []; // { userId, citizenId, telegramId }
    for (const c of citizens) {
      // Create app-user for the citizen
      const cuRes = await client.query(
        `
        INSERT INTO public.users
          (id, email, password_hash, full_name, phone,
           role, status,
           address, last_login, email_verified)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,
           $8,$9,$10)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          address = EXCLUDED.address,
          last_login = EXCLUDED.last_login,
          email_verified = EXCLUDED.email_verified,
          updated_at = now()
        RETURNING id;
        `,
        [
          deterministicUuid(`user:${c.email}`),
          c.email,
          ensurePasswordHash(c.password_hash),
          c.full_name,
          c.phone,
          'citizen', // role
          'active',
          c.address,
          c.last_login,
          c.email_verified,
        ]
      );
      const citizenUserId = cuRes.rows[0].id;

      const citRes = await client.query(
        `
        INSERT INTO public.citizens
          (id, telegram_id, phone, username, full_name,
           latitude, longitude, location_address,
           is_registered, is_active, user_id,
           email, password_hash, address,
           email_verified, verification_token,
           reset_token, reset_token_expiry,
           last_login, profile_image,
           total_grievances, resolved_grievances,
           date_of_birth, gender, aadhaar_number, occupation)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8,
           $9,$10,$11,
           $12,$13,$14,
           $15,$16,
           $17,$18,
           $19,$20,
           $21,$22,
           $23,$24,$25,$26)
        ON CONFLICT (email) DO UPDATE SET
          telegram_id = EXCLUDED.telegram_id,
          phone = EXCLUDED.phone,
          username = EXCLUDED.username,
          full_name = EXCLUDED.full_name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          location_address = EXCLUDED.location_address,
          is_registered = EXCLUDED.is_registered,
          is_active = EXCLUDED.is_active,
          user_id = EXCLUDED.user_id,
          password_hash = EXCLUDED.password_hash,
          address = EXCLUDED.address,
          email_verified = EXCLUDED.email_verified,
          verification_token = EXCLUDED.verification_token,
          reset_token = EXCLUDED.reset_token,
          reset_token_expiry = EXCLUDED.reset_token_expiry,
          last_login = EXCLUDED.last_login,
          profile_image = EXCLUDED.profile_image,
          total_grievances = EXCLUDED.total_grievances,
          resolved_grievances = EXCLUDED.resolved_grievances,
          updated_at = now()
        RETURNING id;
        `,
        [
          deterministicUuid(`citizen:${c.email || c.telegram_id}`),
          c.telegram_id,
          c.phone,
          c.username,
          c.full_name,
          c.latitude,
          c.longitude,
          c.location_address,
          c.is_registered,
          c.is_active,
          citizenUserId,
          c.email,
          ensurePasswordHash(c.password_hash),
          c.address,
          c.email_verified,
          c.verification_token || null,
          c.reset_token || null,
          c.reset_token_expiry || null,
          c.last_login,
          c.profile_image,
          c.total_grievances,
          c.resolved_grievances,
          c.date_of_birth,
          c.gender,
          normalizeAadhaar(c.aadhaar_number),
          c.occupation,
        ]
      );
      const citizenId = citRes.rows[0].id;
      citizenUserMap.push({
        userId: citizenUserId,
        citizenId,
        telegramId: c.telegram_id,
      });
      console.log('Inserted citizen:', c.username, citizenId);
    }

    // 4) Department officers (linked to staff users & department)
    const deptOfficerByStaffId = {};
    const seenStaffIds = new Set();

    async function ensureOfficerUser({ staffId, deptCode, fullName }) {
      const safeStaff = String(staffId || '').replace(/[^a-zA-Z0-9/_-]/g, '');
      const email = `officer.${safeStaff.replaceAll('/', '.')}@seed.local`;
      const userId = deterministicUuid(`user:${email}`);
      const departmentIdForUser = deptCode ? pickDepartmentId(deptCode) : null;

      const res = await client.query(
        `
        INSERT INTO public.users
          (id, email, password_hash, full_name, phone,
           role, status, department_id)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          department_id = EXCLUDED.department_id,
          updated_at = now()
        RETURNING id;
        `,
        [
          userId,
          email,
          ensurePasswordHash(null),
          fullName || safeStaff || 'Seed Officer',
          null,
          'officer',
          'active',
          departmentIdForUser,
        ]
      );

      return res.rows[0].id;
    }

    for (const o of departmentofficers) {
      if (!o || !o.staff_id) continue;
      if (seenStaffIds.has(o.staff_id)) continue;
      seenStaffIds.add(o.staff_id);

      const deptCode = depCodeFromPrefix(o.staff_id);

      // map to correct user by role/staff
      let userId;
      if (deptCode === 'ROAD/AMB' && userByEmail['v.patil@roaddept.in']) {
        userId = userByEmail['v.patil@roaddept.in'].id;
      } else if (deptCode === 'SAN/AMB' && userByEmail['a.shaikh@sanitation.in']) {
        userId = userByEmail['a.shaikh@sanitation.in'].id;
      } else if (deptCode === 'WAT/AMB') {
        const roleText = String(o.role || '');
        if (roleText.includes('Executive Engineer')) {
          userId = rameshUser?.id;
        } else if (roleText.toLowerCase().includes('junior engineer')) {
          userId = snehalUser?.id;
        } else if (roleText.toLowerCase().includes('field officer') || roleText.toLowerCase().includes('inspector')) {
          userId = kuldeepUser?.id;
        } else {
          userId = snehalUser?.id;
        }
      }

      if (!userId) {
        userId = await ensureOfficerUser({
          staffId: o.staff_id,
          deptCode: deptCode || null,
          fullName: o.full_name || o.role,
        });
      }

      const res = await client.query(
        `
        INSERT INTO public.departmentofficers
          (id, user_id, department_id, staff_id,
           role, zone, ward, status,
           workload, specialization,
           performance_score, avg_resolution_time,
           total_assigned, total_resolved,
           current_tasks, skills, certifications, dep_id)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,$8,
           $9,$10,
           $11,$12,
           $13,$14,
           $15,$16,$17,$18)
        ON CONFLICT (staff_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          department_id = EXCLUDED.department_id,
          role = EXCLUDED.role,
          zone = EXCLUDED.zone,
          ward = EXCLUDED.ward,
          status = EXCLUDED.status,
          workload = EXCLUDED.workload,
          specialization = EXCLUDED.specialization,
          performance_score = EXCLUDED.performance_score,
          avg_resolution_time = EXCLUDED.avg_resolution_time,
          total_assigned = EXCLUDED.total_assigned,
          total_resolved = EXCLUDED.total_resolved,
          current_tasks = EXCLUDED.current_tasks,
          skills = EXCLUDED.skills,
          certifications = EXCLUDED.certifications,
          dep_id = EXCLUDED.dep_id,
          updated_at = now()
        RETURNING id, staff_id;
        `,
        [
          deterministicUuid(`departmentofficer:${o.staff_id}`),
          userId,
          pickDepartmentId(deptCode || 'WAT/AMB'),
          o.staff_id,
          o.role,
          o.zone,
          o.ward,
          o.status,
          o.workload,
          o.specialization,
          o.performance_score,
          o.avg_resolution_time,
          o.total_assigned,
          o.total_resolved,
          JSON.stringify(o.current_tasks || []),
          JSON.stringify(o.skills || []),
          JSON.stringify(o.certifications || []),
          o.dep_id,
        ]
      );
      const row = res.rows[0];
      deptOfficerByStaffId[row.staff_id] = row.id;
      console.log('Inserted department officer:', row.staff_id, row.id);
    }

    // Mark department head (FK -> departmentofficers.id)
    const waterHodOfficerId = deptOfficerByStaffId['WAT/AMB/001'] || null;
    if (waterHodOfficerId) {
      const waterDeptId = pickDepartmentId('WAT/AMB');
      await client.query(
        `UPDATE public.departments SET head_officer_id = $1 WHERE id = $2`,
        [waterHodOfficerId, waterDeptId]
      );
      console.log('Updated water department head_officer_id:', waterHodOfficerId);
    }

    // 5) Department dashboards
    for (const d of department_dashboards) {
      await client.query(
        `
        INSERT INTO public.department_dashboards
          (id, dep_id, dashboard_data, last_calculated_at)
        VALUES
          ($1,$2,$3,$4)
        ON CONFLICT (dep_id) DO UPDATE SET
          dashboard_data = EXCLUDED.dashboard_data,
          last_calculated_at = EXCLUDED.last_calculated_at,
          updated_at = now();
        `,
        [
          deterministicUuid(`department_dashboard:${d.dep_id}`),
          d.dep_id,
          JSON.stringify(d.dashboard_data),
          d.last_calculated_at,
        ]
      );
    }
    console.log('Inserted department_dashboard rows');

    // 6) Material inventory (all mapped to same department)
    for (const m of materialinventory) {
      const deptIdForMaterial = pickDepartmentId(depCodeFromPrefix(m.material_id));
      await client.query(
        `
        INSERT INTO public.materialinventory
          (id, material_id, name, department_id,
           available_quantity, unit, min_threshold,
           status, location, supplier,
           unit_cost, last_restocked, restock_history)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,$10,
           $11,$12,$13)
        ON CONFLICT (material_id) DO UPDATE SET
          name = EXCLUDED.name,
          department_id = EXCLUDED.department_id,
          available_quantity = EXCLUDED.available_quantity,
          unit = EXCLUDED.unit,
          min_threshold = EXCLUDED.min_threshold,
          status = EXCLUDED.status,
          location = EXCLUDED.location,
          supplier = EXCLUDED.supplier,
          unit_cost = EXCLUDED.unit_cost,
          last_restocked = EXCLUDED.last_restocked,
          restock_history = EXCLUDED.restock_history,
          updated_at = now();
        `,
        [
          deterministicUuid(`material:${m.material_id}`),
          m.material_id,
          m.name,
          deptIdForMaterial,
          m.available_quantity,
          m.unit,
          m.min_threshold,
          m.status || 'adequate',
          m.location,
          m.supplier,
          m.unit_cost,
          m.last_restocked,
          JSON.stringify(m.restock_history || []),
        ]
      );
    }
    console.log('Inserted materialinventory rows');

    // 7) Equipment (linked to department and optionally officers)
    const equipmentByCode = {};
    for (const e of equipment) {
      const deptIdForEquipment = pickDepartmentId(depCodeFromPrefix(e.equipment_id));
      let assignedToUserId = null;
      if (e.assigned_to_officer_id === null) {
        // simple heuristic: tanker -> Kuldeep, compressor -> Ramesh
        if (e.type.toLowerCase().includes('tanker')) {
          assignedToUserId = kuldeepUser.id;
        } else {
          assignedToUserId = rameshUser.id;
        }
      }

      const res = await client.query(
        `
        INSERT INTO public.equipment
          (id, equipment_id, name, type, department_id,
           status, location, assigned_to_officer_id,
           condition, utilization_rate,
           next_maintenance, last_maintenance,
           specifications, maintenance_history)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8,
           $9,$10,
           $11,$12,
           $13,$14)
        ON CONFLICT (equipment_id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          department_id = EXCLUDED.department_id,
          status = EXCLUDED.status,
          location = EXCLUDED.location,
          assigned_to_officer_id = EXCLUDED.assigned_to_officer_id,
          condition = EXCLUDED.condition,
          utilization_rate = EXCLUDED.utilization_rate,
          next_maintenance = EXCLUDED.next_maintenance,
          last_maintenance = EXCLUDED.last_maintenance,
          specifications = EXCLUDED.specifications,
          maintenance_history = EXCLUDED.maintenance_history,
          updated_at = now()
        RETURNING id, equipment_id;
        `,
        [
          deterministicUuid(`equipment:${e.equipment_id}`),
          e.equipment_id,
          e.name,
          e.type,
          deptIdForEquipment,
          e.status || 'available',
          e.location,
          assignedToUserId,
          e.condition || 'good',
          e.utilization_rate || 0,
          e.next_maintenance,
          e.last_maintenance,
          JSON.stringify(e.specifications || {}),
          JSON.stringify(e.maintenance_history || []),
        ]
      );
      const row = res.rows[0];
      equipmentByCode[row.equipment_id] = row.id;
      console.log('Inserted equipment:', row.equipment_id, row.id);
    }

    // 8) Predictive maintenance (link to equipment)
    for (const p of predictivemaintenance) {
      // link to compressor by default
      const anyEquipmentId =
        equipmentByCode['EQ/WAT/COMP/001'] ||
        Object.values(equipmentByCode)[0];

      await client.query(
        `
        INSERT INTO public.predictivemaintenance
          (id, equipment_id, risk_level, breakdown_probability,
           predicted_failure_date, recommendation,
           preventive_cost, breakdown_cost,
           utilization_rate, last_maintenance,
           next_scheduled_maintenance,
           is_overdue, overdue_days,
           maintenance_scheduled, scheduled_date)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9,$10,
           $11,
           $12,$13,
           $14,$15)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `predictivemaint:${anyEquipmentId}:${p.predicted_failure_date || ''}:${p.recommendation || ''}`
          ),
          anyEquipmentId,
          p.risk_level,
          p.breakdown_probability,
          p.predicted_failure_date,
          p.recommendation,
          p.preventive_cost,
          p.breakdown_cost,
          p.utilization_rate,
          p.last_maintenance,
          p.next_scheduled_maintenance,
          p.is_overdue,
          p.overdue_days,
          p.maintenance_scheduled,
          p.scheduled_date,
        ]
      );
    }
    console.log('Inserted predictivemaintenance rows');

    // 9) FAQs (attach to department)
    for (const f of faqs) {
      await client.query(
        `
        INSERT INTO public.faqs
          (id, question, answer, category, department_id,
           view_count, helpful_count, is_active)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(`faq:${departmentId}:${f.question}`),
          f.question,
          f.answer,
          f.category,
          departmentId,
          f.view_count,
          f.helpful_count,
          f.is_active,
        ]
      );
    }
    console.log('Inserted faqs');

    // 10) Department knowledge base
    for (const kb of departmentknowledgebase) {
      await client.query(
        `
        INSERT INTO public.departmentknowledgebase
          (id, department_id, title, description,
           file_name, file_url, file_type, file_size,
           uploaded_by_officer_id, category, tags,
           content_text, view_count, download_count, is_active)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,$8,
           $9,$10,$11,
           $12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `deptkb:${departmentId}:${kb.title || ''}:${kb.file_url || ''}:${kb.file_name || ''}`
          ),
          departmentId,
          kb.title,
          kb.description,
          kb.file_name,
          kb.file_url,
          kb.file_type,
          kb.file_size,
          rameshUser.id, // treat exec engineer as uploader/admin
          kb.category,
          JSON.stringify(kb.tags || []),
          kb.content_text,
          kb.view_count,
          kb.download_count,
          kb.is_active,
        ]
      );
    }
    console.log('Inserted departmentknowledgebase');

    // 11) Contractors
    const contractorByCode = {};
    const seenContractorCodes = new Set();
    for (const c of contractors) {
      if (!c || !c.contractor_id) continue;
      if (seenContractorCodes.has(c.contractor_id)) continue;
      seenContractorCodes.add(c.contractor_id);

      const res = await client.query(
        `
        INSERT INTO public.contractors
          (id, contractor_id, company_name, contact_person,
           phone, email, address,
           specialization, performance_score,
           active_projects, completed_projects,
           avg_completion_time, contract_value,
           is_active, documents, certifications)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,
           $10,$11,
           $12,$13,
           $14,$15,$16)
        ON CONFLICT (contractor_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          specialization = EXCLUDED.specialization,
          performance_score = EXCLUDED.performance_score,
          active_projects = EXCLUDED.active_projects,
          completed_projects = EXCLUDED.completed_projects,
          avg_completion_time = EXCLUDED.avg_completion_time,
          contract_value = EXCLUDED.contract_value,
          is_active = EXCLUDED.is_active,
          documents = EXCLUDED.documents,
          certifications = EXCLUDED.certifications,
          updated_at = now()
        RETURNING id, contractor_id;
        `,
        [
          deterministicUuid(`contractor:${c.contractor_id}`),
          c.contractor_id,
          c.company_name,
          c.contact_person,
          c.phone,
          c.email,
          c.address,
          c.specialization,
          c.performance_score,
          c.active_projects,
          c.completed_projects,
          c.avg_completion_time,
          c.contract_value,
          c.is_active,
          JSON.stringify(c.documents || []),
          JSON.stringify(c.certifications || []),
        ]
      );
      const row = res.rows[0];
      contractorByCode[row.contractor_id] = row.id;
      console.log('Inserted contractor:', row.contractor_id, row.id);
    }

    // 12) Tenders (attach to department + officers + contractors)
    const tenderByCode = {};
    const seenTenderCodes = new Set();
    for (const t of tenders) {
      if (!t || !t.tender_id) continue;
      if (seenTenderCodes.has(t.tender_id)) continue;
      seenTenderCodes.add(t.tender_id);

      const deptCode = depCodeFromPrefix(t.tender_id) || 'WAT/AMB';
      const deptIdForTender = pickDepartmentId(deptCode);
      const contractorId =
        contractorByCode['CONT/WAT/045'] || Object.values(contractorByCode)[0];

      const res = await client.query(
        `
        INSERT INTO public.tenders
          (id, tender_id, title, description,
           department_id, created_by_officer_id,
           estimated_value, status,
           published_date, submission_deadline,
           opening_date, awarded_to_contractor_id,
           awarded_date, requirements, documents)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9,$10,
           $11,$12,
           $13,$14,$15)
        ON CONFLICT (tender_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          department_id = EXCLUDED.department_id,
          created_by_officer_id = EXCLUDED.created_by_officer_id,
          estimated_value = EXCLUDED.estimated_value,
          status = EXCLUDED.status,
          published_date = EXCLUDED.published_date,
          submission_deadline = EXCLUDED.submission_deadline,
          opening_date = EXCLUDED.opening_date,
          awarded_to_contractor_id = EXCLUDED.awarded_to_contractor_id,
          awarded_date = EXCLUDED.awarded_date,
          requirements = EXCLUDED.requirements,
          documents = EXCLUDED.documents,
          updated_at = now()
        RETURNING id, tender_id;
        `,
        [
          deterministicUuid(`tender:${t.tender_id}`),
          t.tender_id,
          t.title,
          t.description,
          deptIdForTender,
          rameshUser.id,
          t.estimated_value,
          t.status,
          t.published_date,
          t.submission_deadline,
          t.opening_date,
          contractorId || null,
          t.awarded_date || null,
          JSON.stringify(t.requirements || {}),
          JSON.stringify(t.documents || []),
        ]
      );
      const row = res.rows[0];
      tenderByCode[row.tender_id] = row.id;
      console.log('Inserted tender:', row.tender_id, row.id);
    }

    // 13) Tender applications
    for (const a of tenderapplications) {
      const tenderId =
        tenderByCode['TND/WAT/AMB/2024/008'] || Object.values(tenderByCode)[0];
      const contractorId =
        contractorByCode['CONT/WAT/045'] || Object.values(contractorByCode)[0];

      await client.query(
        `
        INSERT INTO public.tenderapplications
          (id, tender_id, contractor_id, bid_amount,
           proposal_document, technical_documents, financial_documents,
           status, evaluation_score, evaluation_notes,
           is_shortlisted)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,$10,
           $11)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(`tenderapp:${tenderId}:${contractorId}`),
          tenderId,
          contractorId,
          a.bid_amount,
          JSON.stringify(a.proposal_document || {}),
          JSON.stringify(a.technical_documents || {}),
          JSON.stringify(a.financial_documents || {}),
          a.status,
          a.evaluation_score,
          a.evaluation_notes,
          a.is_shortlisted,
        ]
      );
    }
    console.log('Inserted tenderapplications');

    // 14) Policy documents (attach to department)
    for (const p of policydocuments) {
      await client.query(
        `
        INSERT INTO public.policydocuments
          (id, title, content, department_id,
           document_url, metadata, is_active)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(`policy:${departmentId}:${p.title || ''}:${p.document_url || ''}`),
          p.title,
          p.content,
          departmentId,
          p.document_url,
          JSON.stringify(p.metadata || {}),
          p.is_active,
        ]
      );
    }
    console.log('Inserted policydocuments');

    // User hierarchy (admin-like chain)
    for (const h of user_hierarchy) {
      let userId = null;
      let supervisorId = null;

      if (h.hierarchy_level === 'executive_engineer') {
        userId = rameshUser.id;
        supervisorId = null;
      } else if (h.hierarchy_level === 'junior_engineer') {
        userId = snehalUser.id;
        supervisorId = rameshUser.id;
      }

      if (!userId) continue;

      await client.query(
        `
        INSERT INTO public.user_hierarchy
          (id, user_id, supervisor_id, hierarchy_level)
        VALUES
          ($1,$2,$3,$4)
        ON CONFLICT (user_id) DO UPDATE SET
          supervisor_id = EXCLUDED.supervisor_id,
          hierarchy_level = EXCLUDED.hierarchy_level;
        `,
        [
          deterministicUuid(`userhier:${userId}:${h.hierarchy_level}:${supervisorId || ''}`),
          userId,
          supervisorId,
          h.hierarchy_level,
        ]
      );
    }
    console.log('Inserted user_hierarchy');

    // State & central officials
    if (state_central_officials.length) {
      for (const s of state_central_officials) {
        let userId = null;
        if (
          s.level_type === 'state' &&
          userByRole['state_level'] &&
          userByRole['state_level'][0]
        ) {
          userId = userByRole['state_level'][0].id;
        } else if (
          s.level_type === 'central' &&
          userByRole['central_level'] &&
          userByRole['central_level'][0]
        ) {
          userId = userByRole['central_level'][0].id;
        }
        if (!userId) continue;

        await client.query(
          `
          INSERT INTO public.state_central_officials
            (id, user_id, level_type, ministry_name, jurisdiction)
          VALUES
            ($1,$2,$3,$4,$5)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            deterministicUuid(`statecentral:${userId}:${s.level_type}:${s.ministry_name || ''}`),
            userId,
            s.level_type,
            s.ministry_name,
            s.jurisdiction,
          ]
        );
      }
      console.log('Inserted state_central_officials');
    }

    // District officials
    if (
      district_officials.length &&
      userByRole['district_level'] &&
      userByRole['district_level'][0]
    ) {
      const districtUser = userByRole['district_level'][0];
      for (const d of district_officials) {
        await client.query(
          `
          INSERT INTO public.district_officials
            (id, user_id, district, designation, jurisdiction)
          VALUES
            ($1,$2,$3,$4,$5)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            deterministicUuid(
              `districtofficial:${districtUser.id}:${d.district || ''}:${d.designation || ''}`
            ),
            districtUser.id,
            d.district,
            d.designation,
            d.jurisdiction,
          ]
        );
      }
      console.log('Inserted district_officials');
    }

    // Taluka officials
    if (
      taluka_officials.length &&
      userByRole['taluka_level'] &&
      userByRole['taluka_level'][0]
    ) {
      const talukaUser = userByRole['taluka_level'][0];
      for (const t of taluka_officials) {
        await client.query(
          `
          INSERT INTO public.taluka_officials
            (id, user_id, district, taluka, designation, block_name)
          VALUES
            ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            deterministicUuid(
              `talukaofficial:${talukaUser.id}:${t.district || ''}:${t.taluka || ''}:${t.designation || ''}`
            ),
            talukaUser.id,
            t.district,
            t.taluka,
            t.designation,
            t.block_name,
          ]
        );
      }
      console.log('Inserted taluka_officials');
    }

    // City officials
    if (
      city_officials.length &&
      userByRole['city_level'] &&
      userByRole['city_level'][0]
    ) {
      const cityUser = userByRole['city_level'][0];
      for (const c of city_officials) {
        await client.query(
          `
          INSERT INTO public.city_officials
            (id, user_id, city, district, designation, corporation_name)
          VALUES
            ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            deterministicUuid(
              `cityofficial:${cityUser.id}:${c.city || ''}:${c.district || ''}:${c.designation || ''}`
            ),
            cityUser.id,
            c.city,
            c.district,
            c.designation,
            c.corporation_name,
          ]
        );
      }
      console.log('Inserted city_officials');
    }

    // Ward officers
    if (
      ward_officers.length &&
      userByRole['ward_officer'] &&
      userByRole['ward_officer'].length
    ) {
      const wardOfficerUsers = userByRole['ward_officer'];
      const reportingToUser =
        (userByRole['city_level'] && userByRole['city_level'][0]) || null;

      for (
        let i = 0;
        i < ward_officers.length && i < wardOfficerUsers.length;
        i++
      ) {
        const w = ward_officers[i];
        const wardUser = wardOfficerUsers[i];

        await client.query(
          `
          INSERT INTO public.ward_officers
            (id, user_id, ward_number, city, district, zone, reporting_to)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            deterministicUuid(`wardofficer:${wardUser.id}:${w.ward_number || ''}`),
            wardUser.id,
            w.ward_number,
            w.city,
            w.district,
            w.zone,
            reportingToUser ? reportingToUser.id : null,
          ]
        );
      }
      console.log('Inserted ward_officers');
    }

    // 16) User grievances (two grievances)
    const grievanceByCode = {};
    const mainCitizen = citizenUserMap[0];
    const secondCitizen = citizenUserMap[1] || mainCitizen;
    const seenGrievanceCodes = new Set();

    for (let i = 0; i < usergrievance.length; i++) {
      const g = usergrievance[i];
      if (!g || !g.grievance_id) continue;
      if (seenGrievanceCodes.has(g.grievance_id)) continue;
      seenGrievanceCodes.add(g.grievance_id);

      const citizenRef = i === 0 ? mainCitizen : secondCitizen;

      const res = await client.query(
        `
        INSERT INTO public.usergrievance
          (id, grievance_id, grievance_text,
           image_path, image_description,
           enhanced_query,
           citizen_id, department_id, assigned_officer_id,
           zone, ward, status,
           priority, validation_status, validation_score,
           validation_reasoning, extracted_location,
           extracted_address, extracted_latitude, extracted_longitude,
           location_confidence, validation_timestamp,
           processing_metadata, query_type, category,
           similar_cases_summary, sentiment_priority,
           emotion, severity, patterns,
           fraud, department_info, policy_search,
           past_queries_summary, full_result,
           sla_deadline, resolution_time,
           is_escalated, escalation_level, dep_id,
           comments, workflow,
           estimated_cost, actual_cost,
           escalated_at, citizen_feedback,
           resolved_at, resolved_by, embedding_status)
        VALUES
          ($1,$2,$3,
           $4,$5,
           $6,
           $7,$8,$9,
           $10,$11,$12,
           $13,$14,$15,
           $16,$17,
           $18,$19,$20,
           $21,$22,
           $23,$24,$25,
           $26,$27,
           $28,$29,$30,
           $31,$32,$33,
           $34,$35,
           $36,$37,
           $38,$39,$40,
           $41,$42,
           $43,$44,
           $45,$46,
           $47,$48,$49)
        ON CONFLICT (grievance_id) DO UPDATE SET
          grievance_text = EXCLUDED.grievance_text,
          image_path = EXCLUDED.image_path,
          image_description = EXCLUDED.image_description,
          enhanced_query = EXCLUDED.enhanced_query,
          citizen_id = EXCLUDED.citizen_id,
          department_id = EXCLUDED.department_id,
          assigned_officer_id = EXCLUDED.assigned_officer_id,
          zone = EXCLUDED.zone,
          ward = EXCLUDED.ward,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          validation_status = EXCLUDED.validation_status,
          validation_score = EXCLUDED.validation_score,
          validation_reasoning = EXCLUDED.validation_reasoning,
          extracted_location = EXCLUDED.extracted_location,
          extracted_address = EXCLUDED.extracted_address,
          extracted_latitude = EXCLUDED.extracted_latitude,
          extracted_longitude = EXCLUDED.extracted_longitude,
          location_confidence = EXCLUDED.location_confidence,
          validation_timestamp = EXCLUDED.validation_timestamp,
          processing_metadata = EXCLUDED.processing_metadata,
          query_type = EXCLUDED.query_type,
          category = EXCLUDED.category,
          similar_cases_summary = EXCLUDED.similar_cases_summary,
          sentiment_priority = EXCLUDED.sentiment_priority,
          emotion = EXCLUDED.emotion,
          severity = EXCLUDED.severity,
          patterns = EXCLUDED.patterns,
          fraud = EXCLUDED.fraud,
          department_info = EXCLUDED.department_info,
          policy_search = EXCLUDED.policy_search,
          past_queries_summary = EXCLUDED.past_queries_summary,
          full_result = EXCLUDED.full_result,
          sla_deadline = EXCLUDED.sla_deadline,
          resolution_time = EXCLUDED.resolution_time,
          is_escalated = EXCLUDED.is_escalated,
          escalation_level = EXCLUDED.escalation_level,
          dep_id = EXCLUDED.dep_id,
          comments = EXCLUDED.comments,
          workflow = EXCLUDED.workflow,
          estimated_cost = EXCLUDED.estimated_cost,
          actual_cost = EXCLUDED.actual_cost,
          escalated_at = EXCLUDED.escalated_at,
          citizen_feedback = EXCLUDED.citizen_feedback,
          resolved_at = EXCLUDED.resolved_at,
          resolved_by = EXCLUDED.resolved_by,
          embedding_status = EXCLUDED.embedding_status,
          updated_at = now()
        RETURNING id, grievance_id;
        `,
        [
          deterministicUuid(`grievance:${g.grievance_id}`),
          g.grievance_id,
          g.grievance_text,
          g.image_path,
          g.image_description,
          g.enhanced_query,
          citizenRef.citizenId,
          departmentId,
          kuldeepUser.id, // assign to field officer
          g.zone,
          g.ward,
          normalizeGrievanceStatus(g.status),
          g.priority,
          g.validation_status,
          g.validation_score,
          g.validation_reasoning,
          JSON.stringify(g.extracted_location || null),
          g.extracted_address,
          g.extracted_latitude,
          g.extracted_longitude,
          g.location_confidence,
          g.validation_timestamp,
          JSON.stringify(g.processing_metadata || null),
          JSON.stringify(g.query_type || null),
          JSON.stringify(g.category || null),
          g.similar_cases_summary,
          JSON.stringify(g.sentiment_priority || null),
          JSON.stringify(g.emotion || null),
          JSON.stringify(g.severity || null),
          JSON.stringify(g.patterns || null),
          JSON.stringify(g.fraud || null),
          JSON.stringify(g.department_info || null),
          JSON.stringify(g.policy_search || null),
          g.past_queries_summary,
          JSON.stringify(g.full_result || null),
          g.sla_deadline,
          g.resolution_time,
          g.is_escalated,
          normalizeEscalationLevel(g.escalation_level),
          g.dep_id,
          JSON.stringify(g.comments || []),
          JSON.stringify(g.workflow || null),
          g.estimated_cost,
          g.actual_cost,
          g.escalated_at,
          JSON.stringify(g.citizen_feedback || null),
          g.resolved_at,
          g.resolved_by,
          g.embedding_status || 'completed',
        ]
      );
      const row = res.rows[0];
      grievanceByCode[row.grievance_id] = row.id;
      console.log('Inserted usergrievance:', row.grievance_id, row.id);
    }

    const gMainId = grievanceByCode['WAT/AMB/2024/0256'];
    const gSecondId = grievanceByCode['WAT/AMB/2024/0257'] || gMainId;

    // 17) Grievance workflow (link to main grievance & officers by name)
    for (const w of grievanceworkflow) {
      let officerId = null;
      if (w.officer_name && w.officer_name.includes('Kuldeep')) {
        officerId = kuldeepUser.id;
      } else if (w.officer_name && w.officer_name.includes('Snehal')) {
        officerId = snehalUser.id;
      }

      await client.query(
        `
        INSERT INTO public.grievanceworkflow
          (id, grievance_id, step_number, status,
           officer_id, officer_name,
           action_taken, notes,
           gps_location, attachments,
           progress_percentage, is_completed, completed_at)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9,$10,
           $11,$12,$13)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(`gworkflow:${gMainId}:${w.step_number}`),
          gMainId,
          w.step_number,
          normalizeGrievanceStatus(w.status),
          officerId,
          w.officer_name,
          w.action_taken,
          w.notes,
          JSON.stringify(w.gps_location || null),
          JSON.stringify(w.attachments || []),
          w.progress_percentage,
          w.is_completed,
          w.completed_at,
        ]
      );
    }
    console.log('Inserted grievanceworkflow');

    // 18) Grievance comments (attach to main grievance, map user_id to officers)
    for (const c of grievancecomments) {
      // public comments -> citizen, internal -> officer
      let userId;
      if (c.is_internal) {
        userId = snehalUser.id;
      } else {
        userId = mainCitizen.userId;
      }

      await client.query(
        `
        INSERT INTO public.grievancecomments
          (id, grievance_id, user_id, comment,
           is_internal, attachments)
        VALUES
          ($1,$2,$3,$4,
           $5,$6)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `gcomment:${gMainId}:${userId}:${c.comment || ''}:${c.is_internal ? '1' : '0'}`
          ),
          gMainId,
          userId,
          c.comment,
          c.is_internal,
          JSON.stringify(c.attachments || []),
        ]
      );
    }
    console.log('Inserted grievancecomments');

    // 19) Grievance escalations (map to main grievance & officers)
    for (const e of grievanceescalations) {
      await client.query(
        `
        INSERT INTO public.grievanceescalations
          (id, grievance_id, escalation_level,
           escalated_to_officer_id, escalated_by_officer_id,
           reason, action_taken,
           is_resolved, resolved_at,
           overdue_hours, next_escalation_at)
        VALUES
          ($1,$2,$3,
           $4,$5,
           $6,$7,
           $8,$9,
           $10,$11)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `gescalation:${gMainId}:${normalizeEscalationLevel(e.escalation_level) || ''}`
          ),
          gMainId,
          normalizeEscalationLevel(e.escalation_level),
          rameshUser.id, // escalated to HOD/admin
          snehalUser.id, // escalated by JE
          e.reason,
          e.action_taken,
          e.is_resolved,
          e.resolved_at,
          e.overdue_hours,
          e.next_escalation_at,
        ]
      );
    }
    console.log('Inserted grievanceescalations');

    // 20) Grievance feedback (main grievance + first citizen)
    for (const f of grievancefeedback) {
      await client.query(
        `
        INSERT INTO public.grievancefeedback
          (id, grievance_id, citizen_id, rating,
           feedback_text, additional_comments,
           would_recommend, satisfaction_level,
           feedback_data)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9)
        ON CONFLICT (grievance_id) DO UPDATE SET
          citizen_id = EXCLUDED.citizen_id,
          rating = EXCLUDED.rating,
          feedback_text = EXCLUDED.feedback_text,
          additional_comments = EXCLUDED.additional_comments,
          would_recommend = EXCLUDED.would_recommend,
          satisfaction_level = EXCLUDED.satisfaction_level,
          feedback_data = EXCLUDED.feedback_data;
        `,
        [
          deterministicUuid(`grievancefeedback:${gMainId}`),
          gMainId,
          mainCitizen.citizenId,
          f.rating,
          f.feedback_text,
          f.additional_comments,
          f.would_recommend,
          f.satisfaction_level,
          JSON.stringify(f.feedback_data || {}),
        ]
      );
    }
    console.log('Inserted grievancefeedback');

    // 21) Grievance cost tracking (main grievance)
    for (const ct of grievancecosttracking) {
      await client.query(
        `
        INSERT INTO public.grievancecosttracking
          (id, grievance_id, labor_cost, material_cost,
           equipment_cost, transport_cost,
           total_cost, budget_allocated,
           budget_used, budget_remaining,
           cost_breakdown, status)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9,$10,
           $11,$12)
        ON CONFLICT (grievance_id) DO UPDATE SET
          labor_cost = EXCLUDED.labor_cost,
          material_cost = EXCLUDED.material_cost,
          equipment_cost = EXCLUDED.equipment_cost,
          transport_cost = EXCLUDED.transport_cost,
          total_cost = EXCLUDED.total_cost,
          budget_allocated = EXCLUDED.budget_allocated,
          budget_used = EXCLUDED.budget_used,
          budget_remaining = EXCLUDED.budget_remaining,
          cost_breakdown = EXCLUDED.cost_breakdown,
          status = EXCLUDED.status;
        `,
        [
          deterministicUuid(`grievancecost:${gMainId}`),
          gMainId,
          ct.labor_cost,
          ct.material_cost,
          ct.equipment_cost,
          ct.transport_cost,
          ct.total_cost,
          ct.budget_allocated,
          ct.budget_used,
          ct.budget_remaining,
          JSON.stringify(ct.cost_breakdown || {}),
          ct.status,
        ]
      );
    }
    console.log('Inserted grievancecosttracking');

    // 22) Repeat grievance patterns (no FKs)
    for (const r of repeatgrievancepatterns) {
      await client.query(
        `
        INSERT INTO public.repeatgrievancepatterns
          (id, zone, area, issue_type,
           complaint_count, affected_citizens,
           time_period_days, priority,
           pattern_description, ai_recommendation,
           estimated_cost, estimated_savings,
           related_grievance_ids, is_addressed, addressed_at)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,
           $7,$8,
           $9,$10,
           $11,$12,
           $13,$14,$15)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `repeatpattern:${r.zone || ''}:${r.area || ''}:${r.issue_type || ''}:${r.time_period_days || ''}`
          ),
          r.zone,
          r.area,
          r.issue_type,
          r.complaint_count,
          r.affected_citizens,
          r.time_period_days,
          r.priority,
          r.pattern_description,
          r.ai_recommendation,
          r.estimated_cost,
          r.estimated_savings,
          JSON.stringify(r.related_grievance_ids || []),
          r.is_addressed,
          r.addressed_at,
        ]
      );
    }
    console.log('Inserted repeatgrievancepatterns');

    // 23) Audit log (link actors by name)
    for (const a of auditlog) {
      let actorId = null;
      if (a.actor_name && a.actor_name.includes('Ramesh')) {
        actorId = rameshUser.id;
      } else if (a.actor_name && a.actor_name.includes('Snehal')) {
        actorId = snehalUser.id;
      }

      await client.query(
        `
        INSERT INTO public.auditlog
          (id, timestamp, actor_id, actor_name, actor_role,
           action, entity_type, entity_id,
           details, ip_address, user_agent)
        VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8,
           $9,$10,$11)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(
            `audit:${a.timestamp || ''}:${a.actor_name || ''}:${a.action || ''}:${a.entity_type || ''}`
          ),
          a.timestamp || new Date().toISOString(),
          actorId,
          a.actor_name,
          a.actor_role,
          a.action,
          a.entity_type,
          gMainId,
          JSON.stringify(a.details || {}),
          a.ip_address,
          a.user_agent,
        ]
      );
    }
    console.log('Inserted auditlog');

    // 24) AI insights (attach to main grievance where needed)
    for (const i of aiinsights) {
      await client.query(
        `
        INSERT INTO public.aiinsights
          (id, grievance_id, insight_type, priority,
           confidence_score, title, description,
           ai_explanation, recommended_action,
           metrics, is_accepted,
           accepted_by_officer_id, accepted_at,
           is_dismissed, dismissed_reason)
        VALUES
          ($1,$2,$3,$4,
           $5,$6,$7,
           $8,$9,
           $10,$11,
           $12,$13,
           $14,$15)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          deterministicUuid(`aiinsight:${gMainId}:${i.insight_type || ''}:${i.title || ''}`),
          gMainId,
          i.insight_type,
          i.priority,
          i.confidence_score,
          i.title,
          i.description,
          JSON.stringify(i.ai_explanation || {}),
          i.recommended_action,
          JSON.stringify(i.metrics || {}),
          i.is_accepted,
          rameshUser.id,
          i.accepted_at,
          i.is_dismissed,
          i.dismissed_reason,
        ]
      );
    }
    console.log('Inserted aiinsights');

    await client.query('COMMIT');
    console.log('All data from db.json pushed successfully with proper IDs');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});