import { useCallback, useState } from 'react';

export type ValidationRule = {
  required?: string; // Error message if field is empty
  minLength?: { min: number; message: string };
  maxLength?: { max: number; message: string };
  pattern?: { regex: RegExp; message: string };
  min?: { min: number; message: string }; // For numbers
  max?: { max: number; message: string }; // For numbers
  custom?: (value: any) => string | null; // Custom validation, return null if valid
};

export type ValidationRules = Record<string, ValidationRule>;

interface UseFormValidationReturn {
  errors: Record<string, string>;
  validate: (fieldName: string, value: any, rules: ValidationRule) => string | null;
  validateAll: (values: Record<string, any>, rules: ValidationRules) => Record<string, string>;
  hasErrors: () => boolean;
  clearError: (fieldName: string) => void;
  clearErrors: () => void;
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((_fieldName: string, value: any, rules: ValidationRule): string | null => {
    // Required
    if (rules.required && !value) {
      return rules.required;
    }

    // Only validate other rules if value is provided
    if (!value) return null;

    // Min length
    if (rules.minLength && String(value).length < rules.minLength.min) {
      return rules.minLength.message;
    }

    // Max length
    if (rules.maxLength && String(value).length > rules.maxLength.max) {
      return rules.maxLength.message;
    }

    // Pattern (regex)
    if (rules.pattern && !rules.pattern.regex.test(String(value))) {
      return rules.pattern.message;
    }

    // Min value (for numbers)
    if (rules.min && Number(value) < rules.min.min) {
      return rules.min.message;
    }

    // Max value (for numbers)
    if (rules.max && Number(value) > rules.max.max) {
      return rules.max.message;
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, []);

  const validateAll = useCallback((values: Record<string, any>, rules: ValidationRules): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const error = validate(fieldName, values[fieldName], fieldRules);
      if (error) newErrors[fieldName] = error;
    }
    setErrors(newErrors);
    return newErrors;
  }, [validate]);

  const hasErrors = useCallback(() => Object.keys(errors).length > 0, [errors]);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, validateAll, hasErrors, clearError, clearErrors };
}
