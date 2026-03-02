import { describe, expect, it } from 'vitest';
import { getUserFriendlyError } from './errors';

describe('getUserFriendlyError', () => {
  it('maps unique constraint violations with known constraint name', () => {
    const err = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "profiles_mobile_key"',
      details: 'Key (mobile)=(+919999999999) already exists.',
    };
    const info = getUserFriendlyError(err, { action: 'profile.update' });
    expect(info.category).toBe('unique_constraint');
    expect(info.message).toContain('mobile number');
    expect(info.message.toLowerCase()).not.toContain('duplicate key');
    expect(info.constraint).toBe('profiles_mobile_key');
  });

  it('maps foreign key constraint violations', () => {
    const err = {
      code: '23503',
      message: 'insert or update on table "child" violates foreign key constraint "child_parent_id_fkey"',
    };
    const info = getUserFriendlyError(err, { action: 'import.row' });
    expect(info.category).toBe('foreign_key_constraint');
    expect(info.message.toLowerCase()).toContain('linked');
  });

  it('maps check constraint violations', () => {
    const err = {
      code: '23514',
      message: 'new row for relation "profiles" violates check constraint "profiles_trust_score_check"',
    };
    const info = getUserFriendlyError(err);
    expect(info.category).toBe('check_constraint');
    expect(info.message.toLowerCase()).toContain('not valid');
  });

  it('maps not-null violations and surfaces column name when present', () => {
    const err = {
      code: '23502',
      message: 'null value in column "name" violates not-null constraint',
    };
    const info = getUserFriendlyError(err);
    expect(info.category).toBe('not_null_violation');
    expect(info.message.toLowerCase()).toContain('name');
    expect(info.message.toLowerCase()).toContain('required');
  });

  it('maps network-like failures', () => {
    const err = new Error('Failed to fetch');
    const info = getUserFriendlyError(err, { action: 'profile.update' });
    expect(info.category).toBe('network');
    expect(info.message.toLowerCase()).toContain('network');
  });
});

