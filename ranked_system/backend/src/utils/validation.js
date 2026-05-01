import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, digits, _ and -');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(200, 'Password is too long');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200),
});

export const linkRedeemSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(16)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')),
});

const teamEnum = z.enum(['red', 'yellow', 'green', 'blue']);
const winConditionEnum = z.enum([
  'row',
  'column',
  'diagonal',
  'blackout',
  'majority',
  'manhunt',
  'race',
]);

export const gameReportSchema = z.object({
  game_uuid: z.string().uuid(),
  mode: z.string().min(1).max(40),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  duration_seconds: z.number().int().min(0).max(60 * 60 * 24),
  winning_team: teamEnum.nullable().optional(),
  win_condition: winConditionEnum.nullable().optional(),
  participants: z
    .array(
      z.object({
        mc_uuid: z.string().uuid(),
        mc_username: z.string().min(1).max(32),
        team: teamEnum,
        is_winner: z.boolean(),
      }),
    )
    .min(1)
    .max(64),
});

export const linkRequestSchema = z.object({
  mc_uuid: z.string().uuid(),
  mc_username: z.string().min(1).max(32),
});
