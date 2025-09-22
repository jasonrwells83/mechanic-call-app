import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ShopSettings,
  ShopHoursSettings,
  ShopClosure,
  BayConfigurationItem,
  SchedulingDefaultsConfig,
  JobStatus,
  StatusPalette,
} from '@/types/database';
import { settingsApi } from '@/lib/api-client';
import { usePreferencesStore, useUIStore } from '@/stores';

type ValidationErrors = {
  hours?: string[];
  bays?: string[];
  statusPalettes?: string[];
  schedulingDefaults?: string[];
};

interface SettingsFormContextValue {
  data: ShopSettings;
  loading: boolean;
  saving: boolean;
  isDirty: boolean;
  validationErrors: ValidationErrors;
  flatErrors: string[];
  updateHours: (updater: (prev: ShopHoursSettings) => ShopHoursSettings) => void;
  updateBays: (updater: (prev: BayConfigurationItem[]) => BayConfigurationItem[]) => void;
  updateStatusPalettes: (
    updater: (prev: Record<JobStatus, StatusPalette>) => Record<JobStatus, StatusPalette>
  ) => void;
  updateSchedulingDefaults: (
    updater: (prev: SchedulingDefaultsConfig) => SchedulingDefaultsConfig
  ) => void;
  saveChanges: () => Promise<void>;
  resetChanges: () => void;
  reload: () => Promise<void>;
}

const SettingsFormContext = createContext<SettingsFormContextValue | undefined>(undefined);

const EMPTY_SETTINGS: ShopSettings = {
  id: 'settings-draft',
  shopName: 'Mechanic Shop OS',
  address: '',
  phone: '',
  email: '',
  hours: {
    timezone: 'America/Los_Angeles',
    days: {
      monday: { open: '08:00', close: '17:00', closed: false },
      tuesday: { open: '08:00', close: '17:00', closed: false },
      wednesday: { open: '08:00', close: '17:00', closed: false },
      thursday: { open: '08:00', close: '17:00', closed: false },
      friday: { open: '08:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true },
    },
    closures: [],
  },
  bays: [
    {
      id: 'bay-1',
      name: 'Bay 1',
      shortCode: 'B1',
      isActive: true,
      supportsHeavyDuty: false,
      notes: '',
    },
    {
      id: 'bay-2',
      name: 'Bay 2',
      shortCode: 'B2',
      isActive: true,
      supportsHeavyDuty: true,
      notes: '',
    },
  ],
  statusPalettes: {
    'incoming-call': { primary: '#64748B', accent: '#E2E8F0' },
    scheduled: { primary: '#2563EB', accent: '#DDE9FF' },
    'in-bay': { primary: '#16A34A', accent: '#D1FADF' },
    'waiting-parts': { primary: '#EA580C', accent: '#FFE8D5' },
    completed: { primary: '#0F172A', accent: '#CBD5F5' },
  },
  schedulingDefaults: {
    defaultJobDuration: 60,
    minimumSlotIncrement: 30,
    bufferMinutes: 10,
    enableAutoBuffers: true,
    lockEditingWithinMinutes: 30,
    allowSameDayScheduling: true,
    overbookingPolicy: 'soft',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function normalizeSettings(data: ShopSettings | null | undefined): ShopSettings {
  if (!data) {
    return { ...EMPTY_SETTINGS };
  }

  return {
    ...EMPTY_SETTINGS,
    ...data,
    hours: {
      ...EMPTY_SETTINGS.hours,
      ...data.hours,
      days: {
        ...EMPTY_SETTINGS.hours.days,
        ...(data.hours?.days ?? {}),
      },
      closures: data.hours?.closures ?? [],
    },
    bays: (data.bays && data.bays.length > 0 ? data.bays : EMPTY_SETTINGS.bays).map((bay) => ({
      ...bay,
      id: bay.id || `bay-${Math.random().toString(36).slice(2, 8)}`,
      name: bay.name || 'Unnamed Bay',
      shortCode: bay.shortCode || bay.id?.toUpperCase() || 'BAY',
      notes: bay.notes ?? '',
      isActive: bay.isActive ?? true,
      supportsHeavyDuty: bay.supportsHeavyDuty ?? false,
    })),
    statusPalettes: {
      ...EMPTY_SETTINGS.statusPalettes,
      ...(data.statusPalettes ?? {}),
    },
    schedulingDefaults: {
      ...EMPTY_SETTINGS.schedulingDefaults,
      ...(data.schedulingDefaults ?? {}),
    },
  };
}

function serializeSettings(settings: ShopSettings) {
  return JSON.stringify(settings);
}

function validateTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function validateHex(value: string) {
  return /^#([0-9A-F]{6})$/i.test(value);
}

function validateClosures(closures: ShopClosure[]) {
  const errors: string[] = [];
  closures.forEach((closure) => {
    if (!closure.name.trim()) {
      errors.push('Closure entries require a name.');
    }
    if (!closure.startDate) {
      errors.push(`Closure "${closure.name || 'Unnamed'}" is missing a start date.`);
    }
    if (closure.endDate && closure.startDate > closure.endDate) {
      errors.push(`Closure "${closure.name || 'Unnamed'}" ends before it starts.`);
    }
  });
  return errors;
}

function validateSettings(settings: ShopSettings): ValidationErrors {
  const errors: ValidationErrors = {};

  const hourIssues: string[] = [];
  Object.entries(settings.hours.days).forEach(([day, hours]) => {
    if (!hours.closed) {
      if (!validateTime(hours.open) || !validateTime(hours.close)) {
        hourIssues.push(`${day} has invalid time format. Use HH:MM.`);
      }
      if (hours.open >= hours.close) {
        hourIssues.push(`${day} closing time must be after opening time.`);
      }
    }
  });
  hourIssues.push(...validateClosures(settings.hours.closures));
  if (!settings.hours.timezone) {
    hourIssues.push('Select a timezone for shop hours.');
  }
  if (hourIssues.length) {
    errors.hours = hourIssues;
  }

  const bayIssues: string[] = [];
  const shortCodes = new Set<string>();
  if (!settings.bays.some((bay) => bay.isActive)) {
    bayIssues.push('At least one bay must remain active.');
  }
  settings.bays.forEach((bay, index) => {
    if (!bay.name.trim()) {
      bayIssues.push(`Bay ${index + 1} requires a display name.`);
    }
    const code = bay.shortCode.trim().toUpperCase();
    if (!code) {
      bayIssues.push(`Bay ${bay.name || index + 1} needs a short code.`);
    }
    if (shortCodes.has(code)) {
      bayIssues.push(`Short code "${code}" is duplicated.`);
    }
    shortCodes.add(code);
  });
  if (bayIssues.length) {
    errors.bays = bayIssues;
  }

  const paletteIssues: string[] = [];
  Object.entries(settings.statusPalettes).forEach(([status, palette]) => {
    if (!validateHex(palette.primary)) {
      paletteIssues.push(`${status} primary color must be a valid hex code.`);
    }
    if (!validateHex(palette.accent)) {
      paletteIssues.push(`${status} accent color must be a valid hex code.`);
    }
  });
  if (paletteIssues.length) {
    errors.statusPalettes = paletteIssues;
  }

  const schedulingIssues: string[] = [];
  const defaults = settings.schedulingDefaults;
  if (defaults.defaultJobDuration <= 0) {
    schedulingIssues.push('Default job duration must be greater than 0.');
  }
  if (defaults.minimumSlotIncrement <= 0) {
    schedulingIssues.push('Minimum slot increment must be greater than 0.');
  }
  if (defaults.bufferMinutes < 0 || defaults.bufferMinutes > 240) {
    schedulingIssues.push('Buffer minutes must be between 0 and 240.');
  }
  if (!['strict', 'soft', 'manual'].includes(defaults.overbookingPolicy)) {
    schedulingIssues.push('Select a valid overbooking policy.');
  }
  if (schedulingIssues.length) {
    errors.schedulingDefaults = schedulingIssues;
  }

  return errors;
}

export const SettingsFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const addToast = useUIStore((state) => state.addToast);
  const setShopSettings = usePreferencesStore((state) => state.setShopSettings);

  const [data, setData] = useState<ShopSettings>(EMPTY_SETTINGS);
  const [initialData, setInitialData] = useState<ShopSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const flatErrors = useMemo(
    () => Object.values(validationErrors).flatMap((section) => section ?? []),
    [validationErrors]
  );

  const isDirty = useMemo(() => {
    return serializeSettings(data) !== serializeSettings(initialData);
  }, [data, initialData]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getShopSettings();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load settings');
      }

      const normalized = normalizeSettings(response.data);
      setData(normalized);
      setInitialData(normalized);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to load shop settings', error);
      addToast?.({
        type: 'error',
        title: 'Unable to load settings',
        message: error instanceof Error ? error.message : 'Unexpected error occurred',
        duration: 5000,
      });
      const fallback = normalizeSettings(null);
      setData(fallback);
      setInitialData(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateHours = (updater: (prev: ShopHoursSettings) => ShopHoursSettings) => {
    setData((prev) => ({
      ...prev,
      hours: updater(prev.hours),
    }));
  };

  const updateBays = (updater: (prev: BayConfigurationItem[]) => BayConfigurationItem[]) => {
    setData((prev) => ({
      ...prev,
      bays: updater(prev.bays),
    }));
  };

  const updateStatusPalettes = (
    updater: (prev: Record<JobStatus, StatusPalette>) => Record<JobStatus, StatusPalette>
  ) => {
    setData((prev) => ({
      ...prev,
      statusPalettes: updater(prev.statusPalettes),
    }));
  };

  const updateSchedulingDefaults = (
    updater: (prev: SchedulingDefaultsConfig) => SchedulingDefaultsConfig
  ) => {
    setData((prev) => ({
      ...prev,
      schedulingDefaults: updater(prev.schedulingDefaults),
    }));
  };

  const saveChanges = async () => {
    const errors = validateSettings(data);
    setValidationErrors(errors);
    const hasErrors = Object.values(errors).some((section) => section && section.length > 0);
    if (hasErrors) {
      addToast?.({
        type: 'error',
        title: 'Check form errors',
        message: 'Resolve validation issues before saving.',
        duration: 5000,
      });
      return;
    }

    setSaving(true);
    try {
      const response = await settingsApi.updateShopSettings(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save settings');
      }

      const normalized = normalizeSettings(response.data);
      setData(normalized);
      setInitialData(normalized);
      setValidationErrors({});
      setShopSettings(normalized);

      addToast?.({
        type: 'success',
        title: 'Settings saved',
        message: 'Configuration preferences updated successfully.',
        duration: 4000,
      });
    } catch (error) {
      console.error('Failed to save shop settings', error);
      addToast?.({
        type: 'error',
        title: 'Save failed',
        message: error instanceof Error ? error.message : 'Unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setData(initialData);
    setValidationErrors({});
  };

  const contextValue: SettingsFormContextValue = {
    data,
    loading,
    saving,
    isDirty,
    validationErrors,
    flatErrors,
    updateHours,
    updateBays,
    updateStatusPalettes,
    updateSchedulingDefaults,
    saveChanges,
    resetChanges,
    reload: loadSettings,
  };

  return (
    <SettingsFormContext.Provider value={contextValue}>
      {children}
    </SettingsFormContext.Provider>
  );
};

export function useSettingsForm() {
  const context = useContext(SettingsFormContext);
  if (!context) {
    throw new Error('useSettingsForm must be used within a SettingsFormProvider');
  }
  return context;
}
