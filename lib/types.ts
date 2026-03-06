export type UserRole = 'operator' | 'worker' | 'admin'
export type SpaceType = 'airbnb' | 'partyroom' | 'studio' | 'gym' | 'unmanned_store' | 'study_cafe' | 'practice_room' | 'workspace' | 'other'
export type JobStatus =
    | 'OPEN' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED'
    | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED'
    | 'DISPUTED' | 'PAID_OUT' | 'CANCELED'
export type WorkerTier = 'STARTER' | 'SILVER' | 'GOLD' | 'MASTER'
export type PaymentStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED'
export type DisputeStatus = 'OPEN' | 'AUTO_RESOLVED' | 'ESCALATED' | 'RESOLVED' | 'CLOSED'

export interface User {
    id: string
    email?: string
    phone?: string
    name: string
    role: UserRole
    profile_image?: string
    tier?: WorkerTier
    total_jobs?: number
    avg_rating?: number
    bio?: string
    bank_account?: { bank_name: string; account_number: string; account_holder: string }
    business_name?: string
    is_active: boolean
    is_verified: boolean
    preferences?: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface Space {
    id: string
    operator_id: string
    name: string
    type: SpaceType
    description?: string
    address: string
    address_detail?: string
    location?: unknown
    size_sqm?: number
    size_pyeong?: number
    floor_count?: number
    cleaning_tool_location?: string
    parking_guide?: string
    trash_guide?: string
    reference_photos?: string[]
    checklist_template: ChecklistItem[]
    base_price: number
    estimated_duration: number
    cleaning_difficulty: string
    photos: string[]
    is_active: boolean
    biz_type?: 'BUSINESS' | 'INDIVIDUAL'
    biz_reg_number?: string
    biz_email?: string
    biz_reg_image?: string
    cash_receipt_number?: string
    created_at: string
    updated_at: string
}

export interface ChecklistItem {
    id: string
    label: string
    required: boolean
    completed?: boolean
    photo_url?: string
}

export interface Job {
    id: string
    space_id: string
    operator_id: string
    worker_id?: string
    status: JobStatus
    scheduled_at: string
    estimated_duration: number
    started_at?: string
    completed_at?: string
    price: number
    price_breakdown?: Record<string, number>
    checklist: ChecklistItem[]
    special_instructions?: string
    is_urgent: boolean
    is_recurring: boolean
    time_window_start?: string
    time_window_end?: string
    pre_damage_report?: { desc: string; photo_url?: string }[]
    recurring_config?: Record<string, unknown>
    matching_score?: number
    auto_approved: boolean
    supplies_to_check?: string[]
    supply_shortages?: string[]
    extra_charge_amount?: number
    extra_charge_reason?: string
    checklist_completed?: ChecklistItem[]
    targeting_worker_id?: string
    cleaning_difficulty?: string
    reclean_instructions?: string
    created_at: string
    updated_at: string
    // 조인된 데이터
    spaces?: Space
    users?: User
}

export interface Payment {
    id: string
    job_id: string
    operator_id: string
    worker_id?: string
    gross_amount: number
    platform_fee: number
    withholding_tax: number
    penalty: number
    bonus: number
    worker_payout: number
    status: PaymentStatus
    pg_provider?: string
    pg_order_id?: string
    pg_payment_key?: string
    paid_at?: string
    escrow_released_at?: string
    worker_paid_at?: string
    created_at: string
    updated_at: string
}

export interface Review {
    id: string
    job_id: string
    reviewer_id: string
    reviewee_id: string
    rating: number
    rating_breakdown?: Record<string, number>
    comment?: string
    is_public: boolean
    created_at: string
}

export interface Dispute {
    id: string
    job_id: string
    reporter_id: string
    status: DisputeStatus
    category: string
    description: string
    evidence_urls: string[]
    ai_verdict?: string
    ai_confidence?: number
    ai_reasoning?: string
    final_verdict?: string
    refund_amount: number
    created_at: string
    updated_at: string
}

export interface FavoritePartner {
    id: string
    operator_id: string
    worker_id: string
    created_at: string
    users?: User
}

export interface AgentEvent {
    id: string
    event_type: string
    payload: Record<string, unknown>
    processed_by: string[]
    processing_status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
    source?: string
    priority: number
    created_at: string
}

// 가격 계산 옵션
export interface PriceOptions {
    base_price: number
    space_type: SpaceType
    scheduled_at: string
    is_urgent: boolean
    extra_trash: boolean
    size_sqm?: number
}

export interface MatchingInput {
    job: Job
    worker: User
    worker_lat: number
    worker_lng: number
    space_lat: number
    space_lng: number
}

export interface Message {
    id: string
    job_id: string
    sender_id: string
    receiver_id: string
    content: string
    is_read: boolean
    created_at: string
}
