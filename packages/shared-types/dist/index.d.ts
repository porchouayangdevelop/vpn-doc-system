export type BankRole = 'maker' | 'unit_head' | 'branch' | 'department' | 'it_head' | 'it_po' | 'it_staff' | 'admin';
export declare const BANK_ROLES: BankRole[];
export type DocType = 'open_teller' | 'close_teller' | 'update_teller' | 'transfer';
export type DocStatus = 'draft' | 'pending_unit' | 'pending_branch' | 'pending_dept' | 'pending_it_head' | 'pending_it_po' | 'approved' | 'completed' | 'rejected' | 'cancelled';
export type ApprovalAction = 'approve' | 'reject' | 'forward' | 'assign' | 'complete';
export interface UserContext {
    keycloakId: string;
    userId: string;
    employeeCode: string;
    fullName: string;
    email: string;
    role: BankRole;
    branchId: string;
    departmentId: string | null;
}
export interface XUserHeaders {
    'x-user-id': string;
    'x-user-keycloak-id': string;
    'x-user-role': BankRole;
    'x-user-branch-id': string;
    'x-user-department-id': string;
    'x-user-email': string;
    'x-user-name': string;
    'x-user-employee-code': string;
    'x-internal-secret': string;
}
export interface KeycloakClaims {
    sub: string;
    email: string;
    name: string;
    preferred_username: string;
    employee_code?: string;
    branch_id?: string;
    department_id?: string;
    role?: BankRole;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
}
export type KafkaTopic = 'doc.submitted' | 'approval.action' | 'doc.completed' | 'doc.rejected' | 'doc.cancelled' | 'notification.send' | 'audit.log' | 'sla.breach' | 'execution.request' | 'execution.result';
export interface KafkaEvent<T = unknown> {
    eventId: string;
    topic: KafkaTopic;
    timestamp: string;
    producerId: string;
    version: number;
    data: T;
}
export interface DocSubmittedEvent {
    documentId: string;
    docNo: string;
    docType: DocType;
    makerId: string;
    makerName: string;
    makerEmail: string;
    branchId: string;
}
export interface ApprovalActionEvent {
    documentId: string;
    docNo: string;
    docType: DocType;
    action: ApprovalAction;
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorRole: BankRole;
    fromStatus: DocStatus;
    toStatus: DocStatus;
    comment: string | null;
    makerId: string;
    makerName: string;
    makerEmail: string;
    assignedTo: string | null;
    assignedName: string | null;
    deadline: string | null;
}
export interface DocCompletedEvent {
    documentId: string;
    docNo: string;
    docType: DocType;
    itStaffId: string;
    itStaffName: string;
    makerId: string;
    makerEmail: string;
    cbsRef: string | null;
}
export interface DocRejectedEvent {
    documentId: string;
    docNo: string;
    docType: DocType;
    actorId: string;
    actorName: string;
    actorRole: BankRole;
    reason: string;
    makerId: string;
    makerEmail: string;
}
export interface AuditLogEvent {
    documentId: string | null;
    docNo: string | null;
    actorId: string | null;
    actorName: string | null;
    actorRole: BankRole | null;
    action: string;
    entityType: string;
    entityId: string;
    oldStatus: string | null;
    newStatus: string | null;
    oldSnapshot: Record<string, unknown> | null;
    newSnapshot: Record<string, unknown> | null;
    ipAddress: string | null;
}
export interface SlaBreach {
    documentId: string;
    docNo: string;
    docType: DocType;
    currentStatus: DocStatus;
    stepName: string;
    assignedRole: BankRole;
    submittedAt: string;
    hoursOverdue: number;
    makerId: string;
    makerEmail: string;
}
export interface ExecutionRequest {
    documentId: string;
    docNo: string;
    docType: DocType;
    payload: Record<string, unknown>;
    itStaffId: string;
    requestedAt: string;
}
export interface ExecutionResult {
    documentId: string;
    docNo: string;
    success: boolean;
    cbsRef: string | null;
    cbsResponse: Record<string, unknown> | null;
    errorMessage: string | null;
    executedAt: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: ValidationError[];
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: Pagination;
}
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export declare class ServiceError extends Error {
    statusCode: number;
    errors?: ValidationError[] | undefined;
    constructor(statusCode: number, message: string, errors?: ValidationError[] | undefined);
}
//# sourceMappingURL=index.d.ts.map