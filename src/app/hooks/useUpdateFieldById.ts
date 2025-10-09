import { useState, useCallback } from "react";
import { mutate } from "swr";
import { sanitizeInput } from "../utils/sanitizers";
import { supabase } from "@/lib/supabase";
import { UUIDTypes } from "uuid";

type UseUpdateFieldReturn = {
  updateField: (
    tableName: string,
    tableId: UUIDTypes,
    fieldName: string,
    rawNewValue: string,
  ) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
};

export const useUpdateFieldById = (swrKey: string): UseUpdateFieldReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateField = useCallback(
    async (tableName: string, tableId: UUIDTypes, fieldName: string, rawNewValue: string) => {
      setIsLoading(true);
      setError(null);

      const cleanNewValue = sanitizeInput(rawNewValue);

      const updatePayload = {
        [fieldName]: cleanNewValue,
      };

      try {
        const { error: updateError } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq("id", tableId);

        if (updateError) {
          throw updateError;
        }

        await mutate(swrKey);
      } catch (err) {
        console.error("Update failed:", err);
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred during update."),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [swrKey],
  );

  return { updateField, isLoading, error };
};
