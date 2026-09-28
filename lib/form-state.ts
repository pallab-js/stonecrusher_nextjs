export type FormState = { error?: string; success?: string } | null;

export function err(error: string): FormState {
  return { error };
}

export function ok(success: string): FormState {
  return { success };
}
