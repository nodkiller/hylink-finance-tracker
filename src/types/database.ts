export type ProjectType = 'Retainer' | 'KOL' | 'Ad-hoc'
export type ProjectStatus = 'Pending Approval' | 'Active' | 'Completed' | 'Reconciled' | 'Rejected'
export type RevenueStatus = 'Paid' | 'Unpaid' | 'Overdue'
export type ExpenseStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid'
export type UserRole = 'Staff' | 'Controller' | 'Admin' | 'Super Admin'

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          brand_id: string
          name: string
          project_code: string | null
          type: ProjectType
          estimated_revenue: number | null
          status: ProjectStatus
          notes: string | null
          rejection_reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          project_code?: string | null
          type: ProjectType
          estimated_revenue?: number | null
          status?: ProjectStatus
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          project_code?: string | null
          type?: ProjectType
          estimated_revenue?: number | null
          status?: ProjectStatus
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      revenues: {
        Row: {
          id: string
          project_id: string
          description: string | null
          invoice_number: string | null
          amount: number
          status: RevenueStatus
          issue_date: string
          received_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          description?: string | null
          invoice_number?: string | null
          amount: number
          status?: RevenueStatus
          issue_date: string
          received_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          description?: string | null
          invoice_number?: string | null
          amount?: number
          status?: RevenueStatus
          issue_date?: string
          received_date?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          project_id: string
          description: string
          payee: string
          invoice_number: string
          amount: number
          status: ExpenseStatus
          attachment_url: string
          approver_id: string | null
          payment_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          description: string
          payee: string
          invoice_number: string
          amount: number
          status?: ExpenseStatus
          attachment_url: string
          approver_id?: string | null
          payment_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          description?: string
          payee?: string
          invoice_number?: string
          amount?: number
          status?: ExpenseStatus
          attachment_url?: string
          approver_id?: string | null
          payment_date?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
        }
      }
    }
  }
}
