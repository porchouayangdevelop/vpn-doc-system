export const BANK_ROLES = [
    'maker', 'unit_head', 'branch', 'department',
    'it_head', 'it_po', 'it_staff', 'admin',
];
// ── Service error ─────────────────────────────────────────
export class ServiceError extends Error {
    statusCode;
    errors;
    constructor(statusCode, message, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'ServiceError';
    }
}
//# sourceMappingURL=index.js.map