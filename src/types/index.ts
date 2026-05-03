export type Language = 'fr' | 'ar' | 'ma'

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'

export type WorkType =
  | 'crown'
  | 'bridge'
  | 'denture'
  | 'implant'
  | 'veneer'
  | 'inlay'
  | 'night_guard'
  | 'retainer'
  | 'other'

export type Material =
  | 'metal_ceramic'
  | 'full_ceramic'
  | 'zirconia'
  | 'resin'
  | 'metal'
  | 'composite'
  | 'other'

export type UserRole = 'lab_admin' | 'lab_staff' | 'dentist'

export type DentistStatus = 'pending' | 'active' | 'rejected'

export interface UserProfile {
  id: string
  role: UserRole
  status?: DentistStatus
  full_name: string
  phone: string
  clinic: string
  email?: string
  avatar_url?: string
  created_at: string
}

export interface DentistUser {
  id: string
  full_name: string
  email: string
  phone: string
  clinic: string
  city: string
  status: DentistStatus
  created_at: string
}

export interface OrderFile {
  id: string
  order_id: string
  name: string
  size: number
  mime_type: string
  storage_path: string
  url?: string
  uploaded_by: string
  created_at: string
}

export interface Dentist {
  id: string
  name: string
  clinic: string
  phone: string
  email: string
  address: string
  city: string
  balance: number
  created_at: string
}

export type PaymentStatus = 'inte_betald' | 'betald'

export interface Order {
  id: string
  order_number: string
  dentist_id: string
  dentist?: Dentist
  dentist_user_id?: string
  patient_name: string
  work_type: WorkType
  material: Material
  shade: string
  tooth_numbers: string
  received_date: string
  due_date: string
  delivery_date?: string
  status: OrderStatus
  price: number | null
  payment_status: PaymentStatus
  paid_at?: string | null
  notes?: string
  tracking_number?: string
  hidden_for_dentist?: boolean
  files?: OrderFile[]
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  name: string
  age: number
  gender: 'male' | 'female'
  dentist_id: string
  dentist?: Dentist
  created_at: string
}

export interface MockUser {
  id: string
  email: string
  created_at: string
}
