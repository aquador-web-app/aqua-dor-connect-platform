import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useSecurityUtils = () => {
  const { isAdmin } = useAuth();

  const generateSecurePassword = (length: number = 12): string => {
    // Use crypto.getRandomValues for secure random generation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => chars[byte % chars.length]).join('');
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