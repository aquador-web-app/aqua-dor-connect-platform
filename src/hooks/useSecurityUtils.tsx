import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useSecurityUtils = () => {
  const { isAdmin } = useAuth();

  const generateSecurePassword = (length: number = 16): string => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + digits + symbols;

    if (length < 12) length = 12;

    const randIndex = (charset: string) => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return Math.floor((buf[0] / 4294967296) * charset.length);
    };

    // Ensure at least one from each category
    const required = [
      upper[randIndex(upper)],
      lower[randIndex(lower)],
      digits[randIndex(digits)],
      symbols[randIndex(symbols)],
    ];

    const remainingLen = length - required.length;
    const array = new Uint8Array(remainingLen);
    crypto.getRandomValues(array);
    const rest = Array.from(array, (b) => all[b % all.length]);

    const passwordArr = [...required, ...rest];
    // Fisher–Yates shuffle
    for (let i = passwordArr.length - 1; i > 0; i--) {
      const j = randIndex(all.slice(0, i + 1));
      [passwordArr[i], passwordArr[j]] = [passwordArr[j], passwordArr[i]];
    }

    return passwordArr.join('');
  };

  const logSecurityEvent = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_old_values: oldValues,
        p_new_values: newValues
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const validateAdminAccess = (): boolean => {
    if (!isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
    return true;
  };

  return {
    generateSecurePassword,
    logSecurityEvent,
    validateAdminAccess
  };
};