import pool from '../config/database.js';

const runBudgetSystemMigration = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating budget management tables...');

    // 1. BUDGET ALLOCATIONS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.budget_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        allocation_id VARCHAR(100) UNIQUE NOT NULL,
        department_id UUID NOT NULL REFERENCES public.departments(id),
        allocation_amount NUMERIC(15,2) NOT NULL,
        allocation_date DATE NOT NULL,
        financial_year VARCHAR(20) NOT NULL,
        scheme_name VARCHAR(255),
        allocation_purpose TEXT,
        allocated_by VARCHAR(255),
        approval_authority VARCHAR(255),
        budget_type VARCHAR(50) CHECK (budget_type IN ('Operational', 'Emergency', 'Maintenance', 'Infrastructure')),
        budget_source VARCHAR(100) CHECK (budget_source IN ('State Government', 'Central Government', 'Municipal Corporation', 'Special Grant')),
        status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Exhausted', 'Cancelled', 'On Hold')),
        documents JSONB DEFAULT '[]'::jsonb,
        remarks TEXT,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 2. BUDGET DOCUMENTS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.budget_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        allocation_id UUID REFERENCES public.budget_allocations(id) ON DELETE CASCADE,
        grievance_id UUID REFERENCES public.usergrievance(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        file_size BIGINT,
        uploaded_by UUID REFERENCES public.users(id),
        uploaded_by_name VARCHAR(255),
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_verified BOOLEAN DEFAULT false,
        verified_by UUID REFERENCES public.users(id),
        verified_at TIMESTAMP WITH TIME ZONE,
        verification_notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `);

    // 3. DROP AND RECREATE GRIEVANCE COST TRACKING
    await client.query(`DROP TABLE IF EXISTS public.grievancecosttracking CASCADE`);
    
    await client.query(`
      CREATE TABLE public.grievancecosttracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        grievance_id UUID NOT NULL UNIQUE REFERENCES public.usergrievance(id),
        allocation_id UUID REFERENCES public.budget_allocations(id),
        labor_cost NUMERIC(12,2) DEFAULT 0,
        material_cost NUMERIC(12,2) DEFAULT 0,
        equipment_cost NUMERIC(12,2) DEFAULT 0,
        transport_cost NUMERIC(12,2) DEFAULT 0,
        contractor_cost NUMERIC(12,2) DEFAULT 0,
        misc_cost NUMERIC(12,2) DEFAULT 0,
        total_cost NUMERIC(12,2) DEFAULT 0,
        budget_allocated NUMERIC(12,2),
        budget_used NUMERIC(12,2) DEFAULT 0,
        budget_remaining NUMERIC(12,2),
        cost_breakdown JSONB DEFAULT '{}'::jsonb,
        resource_usage JSONB DEFAULT '{"workers_assigned": 0, "hours_worked": 0, "equipment_used": [], "contractor_name": null, "contractor_id": null, "materials_used": []}'::jsonb,
        proof_documents JSONB DEFAULT '[]'::jsonb,
        approval_workflow JSONB DEFAULT '{"created_by": null, "verified_by": null, "approved_by_finance": null, "approved_by_head": null, "status": "Created"}'::jsonb,
        status VARCHAR(50) DEFAULT 'within_budget' CHECK (status IN ('within_budget', 'near_limit', 'exceeded', 'approved', 'pending_approval')),
        work_location JSONB DEFAULT '{}'::jsonb,
        work_started_at TIMESTAMP WITH TIME ZONE,
        work_completed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 4. BUDGET USAGE ANALYTICS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.budget_usage_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        department_id UUID NOT NULL REFERENCES public.departments(id),
        financial_year VARCHAR(20) NOT NULL,
        month VARCHAR(20),
        total_allocated NUMERIC(15,2) DEFAULT 0,
        total_used NUMERIC(15,2) DEFAULT 0,
        total_remaining NUMERIC(15,2) DEFAULT 0,
        utilization_percentage NUMERIC(5,2) DEFAULT 0,
        category_breakdown JSONB DEFAULT '{}'::jsonb,
        grievances_funded INTEGER DEFAULT 0,
        grievances_resolved INTEGER DEFAULT 0,
        avg_cost_per_grievance NUMERIC(12,2) DEFAULT 0,
        labor_total NUMERIC(12,2) DEFAULT 0,
        material_total NUMERIC(12,2) DEFAULT 0,
        equipment_total NUMERIC(12,2) DEFAULT 0,
        transport_total NUMERIC(12,2) DEFAULT 0,
        contractor_total NUMERIC(12,2) DEFAULT 0,
        budget_efficiency_score NUMERIC(5,2) DEFAULT 0,
        cost_efficiency_score NUMERIC(5,2) DEFAULT 0,
        analytics_data JSONB DEFAULT '{}'::jsonb,
        UNIQUE(department_id, financial_year, month)
      )
    `);

    // 5. BUDGET ALERTS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.budget_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        department_id UUID NOT NULL REFERENCES public.departments(id),
        allocation_id UUID REFERENCES public.budget_allocations(id),
        grievance_id UUID REFERENCES public.usergrievance(id),
        alert_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        alert_data JSONB DEFAULT '{}'::jsonb,
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID REFERENCES public.users(id),
        resolution_notes TEXT,
        notified_officers JSONB DEFAULT '[]'::jsonb,
        is_acknowledged BOOLEAN DEFAULT false
      )
    `);

    // 6. EXPENSE APPROVAL WORKFLOW TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.expense_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        cost_tracking_id UUID NOT NULL REFERENCES public.grievancecosttracking(id),
        grievance_id UUID NOT NULL REFERENCES public.usergrievance(id),
        created_by UUID REFERENCES public.users(id),
        created_at_step TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verified_by UUID REFERENCES public.users(id),
        verified_at TIMESTAMP WITH TIME ZONE,
        verification_notes TEXT,
        approved_by_finance UUID REFERENCES public.users(id),
        approved_by_finance_at TIMESTAMP WITH TIME ZONE,
        finance_notes TEXT,
        approved_by_head UUID REFERENCES public.users(id),
        approved_by_head_at TIMESTAMP WITH TIME ZONE,
        head_notes TEXT,
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_reference VARCHAR(255),
        current_status VARCHAR(50) DEFAULT 'Created' CHECK (current_status IN ('Created', 'Verified', 'Approved', 'Paid', 'Rejected')),
        rejected_by UUID REFERENCES public.users(id),
        rejected_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT
      )
    `);

    console.log('Creating indexes...');

    // CREATE INDEXES
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_allocations_dept ON public.budget_allocations(department_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_allocations_fy ON public.budget_allocations(financial_year)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_documents_allocation ON public.budget_documents(allocation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_documents_grievance ON public.budget_documents(grievance_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cost_tracking_grievance ON public.grievancecosttracking(grievance_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_analytics_dept ON public.budget_usage_analytics(department_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_dept ON public.budget_alerts(department_id)`);

    console.log('Creating triggers...');

    // CREATE TRIGGER FUNCTION
    await client.query(`
      CREATE OR REPLACE FUNCTION update_total_cost()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.total_cost = COALESCE(NEW.labor_cost, 0) + 
                         COALESCE(NEW.material_cost, 0) + 
                         COALESCE(NEW.equipment_cost, 0) + 
                         COALESCE(NEW.transport_cost, 0) + 
                         COALESCE(NEW.contractor_cost, 0) + 
                         COALESCE(NEW.misc_cost, 0);
        
        NEW.budget_remaining = COALESCE(NEW.budget_allocated, 0) - COALESCE(NEW.budget_used, 0);
        
        IF NEW.budget_allocated IS NOT NULL AND NEW.budget_allocated > 0 THEN
          IF NEW.budget_used > NEW.budget_allocated THEN
            NEW.status = 'exceeded';
          ELSIF NEW.budget_used >= (NEW.budget_allocated * 0.9) THEN
            NEW.status = 'near_limit';
          ELSE
            NEW.status = 'within_budget';
          END IF;
        END IF;
        
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_total_cost ON public.grievancecosttracking;
      CREATE TRIGGER trigger_update_total_cost
      BEFORE INSERT OR UPDATE ON public.grievancecosttracking
      FOR EACH ROW
      EXECUTE FUNCTION update_total_cost();
    `);

    console.log('Inserting sample data...');

    // INSERT SAMPLE DATA
    const deptResult = await client.query(`SELECT id FROM public.departments WHERE name = 'Water Supply Department' LIMIT 1`);
    
    if (deptResult.rows.length > 0) {
      const deptId = deptResult.rows[0].id;

      // Insert sample budget allocation
      await client.query(`
        INSERT INTO public.budget_allocations (
          allocation_id, department_id, allocation_amount, allocation_date,
          financial_year, scheme_name, allocation_purpose, allocated_by,
          approval_authority, budget_type, budget_source, status
        ) VALUES (
          'BUDGET-2025-26-001', $1, 50000000.00, '2025-04-01',
          '2025-26', 'Jal Jeevan Mission', 'Water Supply Infrastructure and Maintenance',
          'Finance Secretary - Maharashtra', 'Chief Minister Office',
          'Operational', 'State Government', 'Active'
        ) ON CONFLICT (allocation_id) DO NOTHING
      `, [deptId]);

      // Insert sample analytics
      await client.query(`
        INSERT INTO public.budget_usage_analytics (
          department_id, financial_year, month, total_allocated, total_used,
          total_remaining, utilization_percentage, grievances_funded,
          grievances_resolved, avg_cost_per_grievance, labor_total,
          material_total, equipment_total, transport_total, contractor_total,
          budget_efficiency_score, cost_efficiency_score
        ) VALUES (
          $1, '2025-26', 'February', 50000000.00, 13245000.00,
          36755000.00, 26.49, 1284, 932, 4250.00, 4500000.00,
          6200000.00, 1500000.00, 1045000.00, 0.00, 82.00, 7.8
        ) ON CONFLICT (department_id, financial_year, month) DO NOTHING
      `, [deptId]);
    }

    await client.query('COMMIT');
    console.log('✅ Budget system migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default runBudgetSystemMigration;
