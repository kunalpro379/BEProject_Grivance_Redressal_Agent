import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import pool from '../config/database.js';
import { mapRoleCodeToSystemRole } from './roles.controller.js';

const generateTokens = (userId, userData = {}) => {
  console.log('📝 generateTokens called with:', {
    userId,
    userData
  });
  
  const tokenPayload = { 
    userId, 
    type: 'access',
    role: userData.role,
    department_id: userData.department_id
  };
  
  console.log('📝 Token payload:', tokenPayload);
  
  const accessToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh', timestamp: Date.now() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Simple 6-digit OTP generator for email verification
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique department officer ID: DEP-XXXX-YYYY (pure random)
const generateDepId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Generate first 4 random characters
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Generate second 4 random characters
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `DEP-${part1}-${part2}`;
};

// Email sender for OTP using nodemailer
const sendOtpEmail = async (email, otp) => {
  try {
    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      // Fallback to console log if SMTP not configured
      console.log(`\n📧 OTP Email (SMTP not configured - check .env):`);
      console.log(`   To: ${email}`);
      console.log(`   OTP: ${otp}\n`);
      return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Email content
    const mailOptions = {
      from: `"IGRS Portal" <${smtpUser}>`,
      to: email,
      subject: 'Email Verification OTP - IGRS Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">
            Email Verification
          </h2>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
            Hello,
          </p>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
            Thank you for registering with IGRS Portal. Please use the following OTP to verify your email address:
          </p>
          <div style="background: #F3F4F6; border: 2px dashed #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1F2937; font-size: 36px; letter-spacing: 8px; margin: 0;">
              ${otp}
            </h1>
          </div>
          <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
            This OTP is valid for 10 minutes. Please do not share this code with anyone.
          </p>
          <p style="color: #6B7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
            If you did not request this verification, please ignore this email.
          </p>
        </div>
      `,
      text: `
Email Verification - IGRS Portal

Hello,

Thank you for registering with IGRS Portal. Please use the following OTP to verify your email address:

OTP: ${otp}

This OTP is valid for 10 minutes. Please do not share this code with anyone.

If you did not request this verification, please ignore this email.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err.message);
    // Don't throw error - log it but allow registration to continue
    // In production, you might want to queue the email or use a fallback service
  }
};

export const register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      email,
      password,
      full_name,
      phone,
      address,
      role,
      department_id,
      department_name,
      designation,
      city,
      ward,
      zone,
      official_type,
      district,
      hierarchy_level,
      level_type,
      ministry_name,
      taluka,
      block_name,
      corporation_name,
      jurisdiction
    } = req.body;

    await client.query('BEGIN');

    // Determine if this is a citizen or official registration
    const userRole = role || 'citizen';
    const isCitizen = userRole === 'citizen';

    if (isCitizen) {
      // CITIZEN REGISTRATION - Store in Citizens table
      
      // Check if email already exists in Citizens
      const existingCitizen = await client.query(
        'SELECT id FROM citizens WHERE email = $1',
        [email]
      );

      if (existingCitizen.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await client.query(
        `INSERT INTO citizens (
          id, email, password_hash, full_name, phone, address,
          date_of_birth, gender, aadhaar_number, occupation,
          email_verified, is_registered, is_active, created_at, updated_at
        )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, true, NOW(), NOW())
         RETURNING id, email, full_name, phone, created_at`,
        [email, passwordHash, full_name, phone, address, 
         req.body.date_of_birth || null, 
         req.body.gender || null, 
         req.body.aadhaar_number || null, 
         req.body.occupation || null]
      );

      const citizen = result.rows[0];

      // Generate tokens for citizen
      const { accessToken, refreshToken } = generateTokens(citizen.id, {
        role: 'citizen',
        department_id: null
      });

      // For citizens, we'll store refresh token in citizens table itself
      // instead of refreshtokens table (which has foreign key to users table)
      await client.query(
        `UPDATE citizens SET last_login = NOW() WHERE id = $1`,
        [citizen.id]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: citizen.id,
          email: citizen.email,
          full_name: citizen.full_name,
          role: 'citizen',
          approval_status: 'approved'
        },
        accessToken,
        refreshToken
      });

    } else {
      // OFFICIAL REGISTRATION - Store in Users table and departmentofficers + hierarchy tables
      
      // Check if email already exists in Users
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already registered' });
      }

      // If role_id is provided (government official), look up the role and map to system role
      let finalUserRole = userRole;
      let roleInfo = null;
      
      if (req.body.role_id) {
        try {
          const roleResult = await client.query(
            'SELECT role_code, role_name, role_level FROM government_roles WHERE id = $1',
            [req.body.role_id]
          );
          
          if (roleResult.rows.length > 0) {
            roleInfo = roleResult.rows[0];
            // Map role_code to system role
            finalUserRole = mapRoleCodeToSystemRole(roleInfo.role_code, roleInfo.role_level);
            console.log(`Mapped role_id ${req.body.role_id} (${roleInfo.role_code}) to system role: ${finalUserRole}`);
          } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid role_id provided' });
          }
        } catch (roleError) {
          console.error('Error looking up role:', roleError);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Failed to lookup role' });
        }
      }

      // Validate role
      const validRoles = [
        'department_officer', 
        'department_head', 
        'admin',
        'ward_officer',
        'city_commissioner',
        'district_collector'
      ];
      
      if (!validRoles.includes(finalUserRole)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid role for official registration: ${finalUserRole}` });
      }

      // Department officers/heads must select a department (stored as requested preference).
      // Actual department allocation happens when admin approves and selects department.
      if (finalUserRole === 'department_officer' && !department_name && !req.body.role_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Department selection is required for officers' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Look up department_id from department_name if provided
      let resolvedDepartmentId = null;
      if (department_name) {
        try {
          const deptResult = await client.query(
            'SELECT id FROM departments WHERE name ILIKE $1 LIMIT 1',
            [department_name]
          );
          if (deptResult.rows.length > 0) {
            resolvedDepartmentId = deptResult.rows[0].id;
            console.log(`Found department_id: ${resolvedDepartmentId} for "${department_name}"`);
          } else {
            console.warn(` Department "${department_name}" not found in database`);
          }
        } catch (deptLookupError) {
          console.error('Error looking up department:', deptLookupError.message);
        }
      }
      
      // If department_id is still null and department_name was provided, use department_id from request
      if (!resolvedDepartmentId && department_id) {
        resolvedDepartmentId = department_id;
      }
      
      const departmentWasCreated = false;

      // Officers need approval
      const approvalStatus = 'pending';

      // Generate OTP for email verification of officials
      const otp = generateOtp();

      // Try INSERT with new columns, fallback if columns don't exist yet
      let result;
      let user;
      let columnsExist = false;
      try {
        console.log('Attempting INSERT into users with all columns...');
        console.log('Parameters:', {
          email,
          finalUserRole,
          department_name,
          designation: roleInfo?.role_name || designation,
          city
        });
        
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        try {
          result = await client.query(
            `INSERT INTO users (
              email, password_hash, full_name, phone, address, role, status, 
              department_id, department_name, designation, city,
              approval_status, verification_token, verification_token_expiry
            )
             VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, $13)
             RETURNING id, email, full_name, role, approval_status, department_id, department_name, designation, city, email_verified, created_at`,
            [
              email,
              passwordHash,
              full_name,
              phone,
              address,
              finalUserRole, // Use mapped role instead of userRole
              resolvedDepartmentId,
              department_name,
              roleInfo?.role_name || official_type || designation, // Use role_name from database
              city,
              approvalStatus,
              otp,
              otpExpiry
            ]
          );
        } catch (expiryErr) {
          if (expiryErr.code === '42703') {
            result = await client.query(
              `INSERT INTO users (
                email, password_hash, full_name, phone, address, role, status, 
                department_id, department_name, designation, city,
                approval_status, verification_token
              )
               VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12)
               RETURNING id, email, full_name, role, approval_status, department_id, department_name, designation, city, email_verified, created_at`,
              [
                email,
                passwordHash,
                full_name,
                phone,
                address,
                finalUserRole, // Use mapped role
                resolvedDepartmentId,
                department_name,
                roleInfo?.role_name || official_type || designation, // Use role_name from database
                city,
                approvalStatus,
                otp
              ]
            );
          } else {
            throw expiryErr;
          }
        }
        user = result.rows[0];
        columnsExist = true; // Successfully inserted with new columns
        console.log('Successfully inserted user with all columns');
      } catch (colError) {
        console.error('First INSERT failed:', {
          code: colError.code,
          message: colError.message,
          detail: colError.detail,
          constraint: colError.constraint
        });
        // Always rollback first if transaction is aborted or any error occurs
        // Store the original error code before rollback
        const originalErrorCode = colError.code;
        const originalErrorMessage = colError.message;
        
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          // Ignore rollback errors - transaction might already be rolled back
          console.warn('Rollback warning:', rollbackErr.message);
        }
        
        // If error is due to missing columns, retry with fallback query
        if (originalErrorCode === '42703') {
          try {
            // Begin new transaction for fallback
            await client.query('BEGIN');
            
            result = await client.query(
              `INSERT INTO users (
                email, password_hash, full_name, phone, address, role, status, 
                department_id, department_name, designation, city,
                approval_status
              )
               VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11)
               RETURNING id, email, full_name, role, approval_status, department_id, department_name, designation, city, created_at`,
              [
                email,
                passwordHash,
                full_name,
                phone,
                address,
                finalUserRole, // Use mapped role
                null,
                department_name,
                roleInfo?.role_name || official_type || designation, // Use role_name from database
                city,
                approvalStatus
              ]
            );
            user = result.rows[0];
            // Add default values for missing columns
            user.email_verified = false; // Default for new registrations
            // Note: OTP cannot be stored without verification_token column, so skip email sending
            // Note: dep_id is stored in departmentofficers table, not users table
            console.warn('verification_token column missing - run migration 20260219_add_users_dep_id.sql');
          } catch (fallbackError) {
            // If fallback also fails, rollback and throw
            try {
              await client.query('ROLLBACK');
            } catch (rbErr) {
              // Ignore
            }
            throw fallbackError;
          }
        } else {
          // For any other error, throw the original error
          throw colError;
        }
      }

      // Send OTP email only if verification_token column exists (i.e., migration was run)
      if (columnsExist) {
        try {
          await sendOtpEmail(user.email, otp);
          console.log('OTP email process completed');
        } catch (emailError) {
          // Log but don't fail registration if email sending fails
          console.error('Failed to send OTP email (non-critical):', emailError.message);
        }
      }

      console.log('About to create department officer record for user:', user.id);
      
      // Check if transaction is still valid before proceeding
      try {
        await client.query('SELECT 1');
      } catch (txCheckError) {
        console.error('Transaction check failed - transaction may be aborted:', txCheckError.message);
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          error: 'Registration failed due to database transaction error. Please try again.' 
        });
      }

      // Create departmentofficers record for officers/heads
      const isOfficerRole = ['department_officer', 'department_head', 'ward_officer', 'city_commissioner', 'district_collector'].includes(finalUserRole);
      if (isOfficerRole) {
        // Only create departmentofficers record if we have a valid department_id
        // If no department found, admin will create record during approval
        if (!resolvedDepartmentId) {
          console.warn(' No department_id found during registration');
          console.warn('   departmentofficers record will be created by admin during approval');
        } else {
          try {
            const staffId = `STAFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            
            // Insert department officer record (use department_id, not dep_id)
            await client.query(
              `INSERT INTO departmentofficers (
                user_id,
                department_id,
                staff_id,
                role,
                zone,
                ward,
                specialization
              )
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (user_id) DO UPDATE
                 SET staff_id = EXCLUDED.staff_id,
                     role = EXCLUDED.role,
                     zone = EXCLUDED.zone,
                     ward = EXCLUDED.ward,
                     specialization = EXCLUDED.specialization`,
              [
                user.id,
                resolvedDepartmentId,
                staffId,
                user.designation || user.role,
                zone || null,
                ward || null,
                user.designation || null
              ]
            );
            console.log('Department officer record created with department_id:', resolvedDepartmentId);
          } catch (deptOfficerError) {
            await client.query('ROLLBACK');
            console.error('Failed to create department officer record:', deptOfficerError);
            throw new Error(`Failed to create department officer record: ${deptOfficerError.message}`);
          }
        }
      }

      // Store government hierarchy information when provided (state/central, district, taluka, city, ward level officials)
      if (official_type || hierarchy_level) {
        const type = String(official_type).toLowerCase();

        // State / Central level officials
        if (hierarchy_level === 'state_central' || type.includes('state') || type.includes('central')) {
          await client.query(
            `INSERT INTO state_central_officials (user_id, level_type, ministry_name, jurisdiction)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE
               SET level_type = EXCLUDED.level_type,
                   ministry_name = EXCLUDED.ministry_name,
                   jurisdiction = EXCLUDED.jurisdiction`,
            [
              user.id,
              level_type || (type.includes('central') ? 'central' : 'state'),
              ministry_name || official_type || null,
              jurisdiction || address || null
            ]
          );
        }

        // District-level officials (e.g., District Collector)
        if (hierarchy_level === 'district' || type.includes('district')) {
          await client.query(
            `INSERT INTO district_officials (user_id, district, designation)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE
               SET district = EXCLUDED.district,
                   designation = EXCLUDED.designation`,
            [user.id, district || city || null, official_type]
          );
        }

        // Taluka / Block-level officials
        if (hierarchy_level === 'taluka' || type.includes('taluka')) {
          await client.query(
            `INSERT INTO taluka_officials (user_id, district, taluka, designation, block_name)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE
               SET district = EXCLUDED.district,
                   taluka = EXCLUDED.taluka,
                   designation = EXCLUDED.designation,
                   block_name = EXCLUDED.block_name`,
            [
              user.id,
              district || null,
              taluka || city || null,
              official_type,
              block_name || null
            ]
          );
        }

        // Ward-level officials (e.g., Nagar Sevak, Zonal Officer) if ward is provided
        if (hierarchy_level === 'ward' || ward) {
          await client.query(
            `INSERT INTO ward_officers (user_id, ward_number, city, district, zone)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE
               SET ward_number = EXCLUDED.ward_number,
                   city = EXCLUDED.city,
                   district = EXCLUDED.district,
                   zone = EXCLUDED.zone`,
            [
              user.id,
              ward,
              city || district || null,
              district || null,
              zone || null
            ]
          );
        }

        // City-level officials (e.g., Municipal Commissioner) when we at least know district/city
        if (hierarchy_level === 'city' || !type.includes('district')) {
          const cityName = city || district || null;
          if (cityName) {
            await client.query(
              `INSERT INTO city_officials (user_id, city, district, designation, corporation_name)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO UPDATE
                 SET city = EXCLUDED.city,
                     district = EXCLUDED.district,
                     designation = EXCLUDED.designation,
                     corporation_name = EXCLUDED.corporation_name`,
              [
                user.id,
                cityName,
                district || cityName,
                official_type,
                corporation_name || null
              ]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Use department_id instead of dep_id
      let finalDepartmentId = resolvedDepartmentId;

      // Officers need approval - don't generate tokens yet
      return res.status(201).json({
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          approval_status: user.approval_status,
          department_id: finalDepartmentId,
          email_verified: user.email_verified
        },
        requiresOtpVerification: true,
        requiresApproval: true
      });
    }
  } catch (error) {
    // Rollback transaction if it's still active
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors (transaction might already be rolled back)
      console.warn('Rollback error (ignored):', rollbackError.message);
    }
    
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email or department ID already exists' });
    }
    if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({ error: 'Invalid department reference' });
    }
    if (error.code === '42703') { // Undefined column
      return res.status(500).json({ 
        error: 'Database schema mismatch. Please run migrations.',
        details: error.message 
      });
    }
    if (error.code === '25P02') { // Transaction aborted
      return res.status(500).json({ 
        error: 'Transaction error. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Registration failed', 
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let result;
    let user = null;
    let isCitizen = false;

    // 1) Try to find in Users table first (admins / officers)
    // Fetch dep_id from departmentofficers table via LEFT JOIN
    // Prioritize records with non-null dep_id
    try {
      result = await pool.query(
        `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.status, 
                u.department_id, u.department_name, u.approval_status, u.rejection_reason, 
                u.email_verified, dept_off.dep_id
         FROM users u
         LEFT JOIN departmentofficers dept_off ON u.id = dept_off.user_id
         WHERE u.email = $1
         ORDER BY dept_off.dep_id NULLS LAST
         LIMIT 1`,
        [email]
      );
    } catch (colError) {
      // Fallback if dep_id column doesn't exist in departmentofficers table yet
      if (colError.code === '42703') {
        try {
          // Try without dep_id column
          result = await pool.query(
            `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.status, 
                    u.department_id, u.department_name, u.approval_status, u.rejection_reason, 
                    u.email_verified
             FROM users u
             WHERE u.email = $1`,
            [email]
          );
          // Add default values for missing columns
          if (result.rows.length > 0) {
            result.rows[0].dep_id = null;
            if (result.rows[0].email_verified === undefined) {
              result.rows[0].email_verified = true; // Default to verified for existing users
            }
          }
        } catch (fallbackError) {
          // If email_verified column also doesn't exist
          if (fallbackError.code === '42703') {
            result = await pool.query(
              `SELECT id, email, password_hash, full_name, role, status, 
                      department_id, department_name, approval_status, rejection_reason
               FROM users WHERE email = $1`,
              [email]
            );
            // Add default values
            if (result.rows.length > 0) {
              result.rows[0].dep_id = null;
              result.rows[0].email_verified = true;
            }
          } else {
            throw fallbackError;
          }
        }
      } else {
        throw colError;
      }
    }

    if (result.rows.length > 0) {
      user = result.rows[0];
      isCitizen = false;

      // Check if account is active
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      // Check approval status for officials/admins
      if (user.approval_status === 'pending') {
        return res.status(403).json({ 
          error: 'Account pending approval',
          message: 'Your account is awaiting admin approval. You will be notified once approved.',
          approval_status: 'pending'
        });
      }

      if (user.approval_status === 'rejected') {
        return res.status(403).json({ 
          error: 'Account rejected',
          message: user.rejection_reason || 'Your account registration was rejected by admin.',
          approval_status: 'rejected'
        });
      }

      // Require email verification for officials/admins
      if (!user.email_verified) {
        return res.status(403).json({
          error: 'Email not verified',
          message: 'Please verify your email using the OTP sent to your registered address.',
          requiresEmailVerification: true
        });
      }
    } else {
      // 2) Fallback to citizens table
      result = await pool.query(
        `SELECT id, email, password_hash, full_name, phone, is_active
         FROM citizens WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = result.rows[0];
      isCitizen = true;

      // Check if citizen is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is not active' });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const userData = {
      role: isCitizen ? 'citizen' : user.role,
      department_id: isCitizen ? null : user.department_id
    };
    
    console.log('🔑 Generating tokens for user:', {
      userId: user.id,
      email: user.email,
      userData: userData
    });
    
    const { accessToken, refreshToken } = generateTokens(user.id, userData);

    // Revoke old refresh tokens and insert new one
    await pool.query(
      'UPDATE refreshtokens SET revoked = true WHERE user_id = $1 AND revoked = false',
      [user.id]
    );

    // Insert new refresh token with user_type
    await pool.query(
      `INSERT INTO refreshtokens (user_id, token, expires_at, user_type)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)`,
      [user.id, refreshToken, isCitizen ? 'citizen' : 'user']
    );

    // Update last login
    if (isCitizen) {
      await pool.query(
        'UPDATE citizens SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: isCitizen ? 'citizen' : user.role,
        department_id: isCitizen ? null : user.department_id,
        department_name: isCitizen ? null : user.department_name,
        approval_status: isCitizen ? 'approved' : user.approval_status,
        department_id: isCitizen ? null : user.department_id
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const result = await pool.query(
      `SELECT rt.*, rt.user_type 
       FROM refreshtokens rt
       WHERE rt.token = $1 AND rt.user_id = $2 AND rt.revoked = false AND rt.expires_at > NOW()`,
      [refreshToken, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokenData = result.rows[0];
    const isCitizen = tokenData.user_type === 'citizen';

    // Fetch user data to include in new token
    let userData = { role: null, department_id: null };
    
    if (isCitizen) {
      const citizenResult = await pool.query(
        'SELECT id FROM citizens WHERE id = $1',
        [decoded.userId]
      );
      if (citizenResult.rows.length > 0) {
        userData = { role: 'citizen', department_id: null };
      }
    } else {
      const userResult = await pool.query(
        'SELECT role, department_id FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (userResult.rows.length > 0) {
        userData = {
          role: userResult.rows[0].role,
          department_id: userResult.rows[0].department_id
        };
      }
    }

    const tokens = generateTokens(decoded.userId, userData);

    await pool.query(
      'UPDATE refreshtokens SET revoked = true WHERE token = $1',
      [refreshToken]
    );

    await pool.query(
      `INSERT INTO refreshtokens (user_id, token, expires_at, user_type)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)`,
      [decoded.userId, tokens.refreshToken, isCitizen ? 'citizen' : 'user']
    );

    res.json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    let result;
    try {
      result = await pool.query(
        `SELECT id, email_verified, verification_token, verification_token_expiry 
         FROM users WHERE email = $1`,
        [email]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        result = await pool.query(
          `SELECT id, email_verified, verification_token FROM users WHERE email = $1`,
          [email]
        );
      } else throw colErr;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    if (user.verification_token !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (user.verification_token_expiry && new Date(user.verification_token_expiry) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    try {
      await pool.query(
        `UPDATE users 
         SET email_verified = true, verification_token = null, verification_token_expiry = null, updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
    } catch (upErr) {
      if (upErr.code === '42703') {
        await pool.query(
          `UPDATE users SET email_verified = true, verification_token = null, updated_at = NOW() WHERE id = $1`,
          [user.id]
        );
      } else throw upErr;
    }

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      `SELECT id, email_verified, verification_token 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    // Generate new OTP
    const newOtp = generateOtp();

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    try {
      await pool.query(
        `UPDATE users 
         SET verification_token = $1,
             verification_token_expiry = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newOtp, otpExpiry, user.id]
      );
    } catch (updateError) {
      if (updateError.code === '42703') {
        await pool.query(
          `UPDATE users SET verification_token = $1, updated_at = NOW() WHERE id = $2`,
          [newOtp, user.id]
        ).catch(() => {});
      } else {
        throw updateError;
      }
    }

    // Send OTP email
    await sendOtpEmail(email, newOtp);

    return res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP', details: error.message });
  }
};

// Password reset email (same SMTP as OTP)
const sendPasswordResetEmail = async (email, resetToken, frontendResetUrl) => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.log(`\n📧 Password reset link (SMTP not configured):`);
      console.log(`   To: ${email}`);
      console.log(`   Reset link: ${frontendResetUrl}\n`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465',
      auth: { user: smtpUser, pass: smtpPassword },
    });

    await transporter.sendMail({
      from: `"IGRS Portal" <${smtpUser}>`,
      to: email,
      subject: 'Reset your password - IGRS Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1F2937;">Reset your password</h2>
          <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
          <p><a href="${frontendResetUrl}" style="color: #3B82F6;">${frontendResetUrl}</a></p>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
      text: `Reset your password: ${frontendResetUrl}\n\nIf you did not request this, ignore this email.`,
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'If an account exists with this email, you will receive a reset link.' });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users 
       SET reset_token = $1, reset_token_expiry = $2, updated_at = NOW() 
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );

    const baseUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
    const frontendResetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetToken, frontendResetUrl);

    return res.status(200).json({ message: 'If an account exists with this email, you will receive a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await pool.query(
      `SELECT id, email FROM users 
       WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = null, reset_token_expiry = null, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query(
        'UPDATE refreshtokens SET revoked = true WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    if (req.user.role === 'citizen') {
      const result = await pool.query(
        `SELECT id, email, full_name, phone, address, profile_image, created_at, last_login,
                total_grievances, resolved_grievances, location_address
         FROM citizens WHERE id = $1`,
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      const row = result.rows[0];
      const user = {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        phone: row.phone,
        address: row.address || row.location_address,
        profile_image: row.profile_image,
        created_at: row.created_at,
        last_login: row.last_login,
        role: 'citizen',
        total_grievances: row.total_grievances ?? 0,
        resolved_grievances: row.resolved_grievances ?? 0
      };
      return res.json({ user });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
              u.department_id, u.profile_image, u.address, u.created_at, u.last_login,
              u.approval_status, u.approved_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
