export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          year: number
          month: number
          pay_period: 'first_half' | 'second_half'
          status: 'draft' | 'submitted'
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          month: number
          pay_period: 'first_half' | 'second_half'
          status?: 'draft' | 'submitted'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'draft' | 'submitted'
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timesheets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      time_entries: {
        Row: {
          id: string
          timesheet_id: string
          entry_date: string
          regular_hours: number
          holiday_hours: number
          sick_hours: number
          vacation_hours: number
          overtime_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          timesheet_id: string
          entry_date: string
          regular_hours?: number
          holiday_hours?: number
          sick_hours?: number
          vacation_hours?: number
          overtime_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          regular_hours?: number
          holiday_hours?: number
          sick_hours?: number
          vacation_hours?: number
          overtime_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_entries_timesheet_id_fkey'
            columns: ['timesheet_id']
            isOneToOne: false
            referencedRelation: 'timesheets'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
