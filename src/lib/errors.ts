export type ErrorCategory =
  | 'unique_constraint'
  | 'foreign_key_constraint'
  | 'check_constraint'
  | 'not_null_violation'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'rate_limit'
  | 'not_found'
  | 'unknown';

export type ErrorContext = {
  action?: string;
};

export type UserFriendlyError = {
  category: ErrorCategory;
  message: string;
  debugMessage: string;
  code?: string;
  constraint?: string;
  column?: string;
};

const constraintMessageOverrides: Record<string, string> = {
  profiles_mobile_key: 'This mobile number is already in use. Try a different number.',
  profiles_email_key: 'This email is already in use. Try signing in instead.',
  properties_price_check: 'Price must be a positive value.',
  properties_price_positive: 'Property price must be greater than zero.',
  properties_area_check: 'Area must be a positive value.',
  properties_latitude_range: 'Invalid property location. Latitude must be between -90 and 90.',
  properties_longitude_range: 'Invalid property location. Longitude must be between -180 and 180.',
  tenant_not_owner: 'Security Violation: Owners cannot book their own property.',
  visit_bookings_tenant_not_owner: 'Security Violation: Owners cannot book their own property.',
  visit_bookings_visit_date_not_past: 'Invalid Date: You cannot book a visit in the past.',
  unique_active_booking_per_tenant: 'Duplicate Booking: You already have an active visit scheduled for this property.',
  unique_slot_occupancy: 'Race Condition: This slot was just booked by another user. Please pick another time.',
};

const columnFriendlyNames: Record<string, string> = {
  title: 'Property Title',
  description: 'Property Description',
  price: 'Price',
  area: 'Carpet Area',
  locality: 'Locality',
  address: 'Full Address',
  city: 'City',
};

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

const pickString = (...values: Array<unknown>) => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return '';
};

const extractConstraintFromMessage = (message: string) => {
  const m =
    message.match(/unique constraint\s+"([^"]+)"/i) ||
    message.match(/foreign key constraint\s+"([^"]+)"/i) ||
    message.match(/check constraint\s+"([^"]+)"/i) ||
    message.match(/constraint\s+"([^"]+)"/i);
  return m?.[1];
};

const extractColumnFromMessage = (message: string) => {
  const m = message.match(/column\s+"([^"]+)"/i);
  return m?.[1];
};

const isSqlState = (code: string) => /^[0-9A-Z]{5}$/.test(code);

export const getUserFriendlyError = (error: unknown, context: ErrorContext = {}): UserFriendlyError => {
  const anyErr = error as Record<string, unknown> | null | undefined;
  const message = pickString(anyErr?.message, anyErr?.error_description, anyErr?.msg);
  const code = pickString(anyErr?.code, anyErr?.error_code, anyErr?.statusCode, anyErr?.status);
  const details = pickString(anyErr?.details, anyErr?.hint);

  const debugMessage = [
    context.action ? `action=${context.action}` : '',
    code ? `code=${code}` : '',
    message ? `message=${message}` : '',
    details ? `details=${details}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const normalizedMessage = message.toLowerCase();
  const normalizedCode = typeof code === 'string' ? code : '';

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network error') ||
    normalizedMessage.includes('load failed')
  ) {
    return {
      category: 'network',
      message: 'Network error. Please check your connection and try again.',
      debugMessage,
      code: normalizedCode || undefined,
    };
  }

  if (normalizedCode === '401' || normalizedMessage.includes('jwt') || normalizedMessage.includes('not authenticated')) {
    return {
      category: 'authentication',
      message: 'Please log in again to continue.',
      debugMessage,
      code: normalizedCode || undefined,
    };
  }

  if (normalizedCode === '403' || normalizedMessage.includes('not authorized') || normalizedMessage.includes('permission denied')) {
    return {
      category: 'authorization',
      message: 'You do not have permission to perform this action.',
      debugMessage,
      code: normalizedCode || undefined,
    };
  }

  if (normalizedCode === '404') {
    return {
      category: 'not_found',
      message: 'The requested resource was not found.',
      debugMessage,
      code: normalizedCode,
    };
  }

  const constraint = extractConstraintFromMessage(message);
  const column = extractColumnFromMessage(message);

  const sqlState = isSqlState(normalizedCode) ? normalizedCode : '';
  const isUniqueViolation =
    sqlState === '23505' || normalizedMessage.includes('duplicate key value violates unique constraint');
  const isForeignKeyViolation =
    sqlState === '23503' || normalizedMessage.includes('violates foreign key constraint');
  const isCheckViolation = sqlState === '23514' || normalizedMessage.includes('violates check constraint');
  const isNotNullViolation = sqlState === '23502' || normalizedMessage.includes('violates not-null constraint');

  if (isUniqueViolation) {
    const override = constraint ? constraintMessageOverrides[constraint] : undefined;
    return {
      category: 'unique_constraint',
      message:
        override ||
        (column
          ? `${toTitle(column)} already exists. Please use a different ${toTitle(column).toLowerCase()}.`
          : 'This value already exists. Please use a different value.'),
      debugMessage,
      code: sqlState || normalizedCode || undefined,
      constraint,
      column,
    };
  }

  if (isForeignKeyViolation) {
    return {
      category: 'foreign_key_constraint',
      message:
        'This action cannot be completed because it is linked to other data. Please remove related items and try again.',
      debugMessage,
      code: sqlState || normalizedCode || undefined,
      constraint,
      column,
    };
  }

  if (isCheckViolation) {
    return {
      category: 'check_constraint',
      message: 'Some of the information you entered is not valid. Please review and try again.',
      debugMessage,
      code: sqlState || normalizedCode || undefined,
      constraint,
      column,
    };
  }

  if (isNotNullViolation) {
    return {
      category: 'not_null_violation',
      message: column ? `${toTitle(column)} is required. Please fill it in and try again.` : 'A required field is missing.',
      debugMessage,
      code: sqlState || normalizedCode || undefined,
      constraint,
      column,
    };
  }

  if (normalizedMessage.includes('rate limit') || normalizedCode === '429') {
    return {
      category: 'rate_limit',
      message: 'Too many requests. Please wait a moment and try again.',
      debugMessage,
      code: normalizedCode || undefined,
    };
  }

  if (typeof message === 'string' && message.trim().length > 0 && !message.includes('constraint')) {
    return {
      category: 'unknown',
      message,
      debugMessage,
      code: normalizedCode || undefined,
      constraint,
      column,
    };
  }

  if (normalizedMessage.includes('invalid input') || normalizedMessage.includes('malformed')) {
    return {
      category: 'validation',
      message: column ? `The value for ${columnFriendlyNames[column] || toTitle(column)} is not valid.` : 'Please check your input and try again.',
      debugMessage,
      code: normalizedCode || undefined,
      column,
    };
  }

  return {
    category: 'unknown',
    message: 'Something went wrong. Please try again.',
    debugMessage,
    code: normalizedCode || undefined,
    constraint,
    column,
  };
};

export const getUserFriendlyErrorMessage = (error: unknown, context: ErrorContext = {}) =>
  getUserFriendlyError(error, context).message;

export const logError = (error: unknown, context: ErrorContext = {}) => {
  const info = getUserFriendlyError(error, context);
  console.error('AppError', info.debugMessage, { category: info.category, code: info.code, constraint: info.constraint, column: info.column, raw: error });
};

