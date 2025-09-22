import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useSettingsForm } from '@/hooks/useSettingsForm';

type DurationOption = {
  label: string;
  value: number;
};

const durationOptions: DurationOption[] = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1 hour 30 minutes', value: 90 },
  { label: '2 hours', value: 120 },
];

const slotOptions: DurationOption[] = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
];

const bufferPresets = [0, 5, 10, 15, 30];

function formatMinutes(value: number) {
  if (value < 60) {
    return `${value} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (minutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr ${minutes} min`;
}

export function SchedulingDefaultsSection() {
  const { data, updateSchedulingDefaults } = useSettingsForm();
  const defaults = data.schedulingDefaults;
  const [customBuffer, setCustomBuffer] = useState<string>(String(defaults.bufferMinutes));

  useEffect(() => {
    setCustomBuffer(String(defaults.bufferMinutes));
  }, [defaults.bufferMinutes]);

  const slotSummary = useMemo(() => {
    return `${formatMinutes(defaults.minimumSlotIncrement)} slots with ${formatMinutes(defaults.defaultJobDuration)} default jobs`;
  }, [defaults.minimumSlotIncrement, defaults.defaultJobDuration]);

  const handleDurationChange = (field: 'defaultJobDuration' | 'minimumSlotIncrement', value: number) => {
    updateSchedulingDefaults((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleBufferPreset = (value: number) => {
    updateSchedulingDefaults((current) => ({ ...current, bufferMinutes: value }));
    setCustomBuffer(String(value));
  };

  const handleCustomBufferChange = (value: string) => {
    setCustomBuffer(value);
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 240) {
      updateSchedulingDefaults((current) => ({ ...current, bufferMinutes: numeric }));
    }
  };

  const handleToggle = (
    field: keyof typeof defaults,
    value: boolean,
  ) => {
    updateSchedulingDefaults((current) => ({ ...current, [field]: value }));
  };

  const handleSelect = (
    field: keyof typeof defaults,
    value: string,
  ) => {
    updateSchedulingDefaults((current) => ({
      ...current,
      [field]: value as typeof defaults['overbookingPolicy'],
    }));
  };

  const editingLockSummary = useMemo(() => {
    if (defaults.lockEditingWithinMinutes === 0) {
      return 'Jobs can be edited up until start time.';
    }
    return `Editing disabled ${formatMinutes(defaults.lockEditingWithinMinutes)} before start.`;
  }, [defaults.lockEditingWithinMinutes]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduling defaults</CardTitle>
              <CardDescription>
                Define the baseline experience for new appointments, including default durations, slot increments, and buffer logic.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {slotSummary}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default job duration</Label>
              <Select
                value={String(defaults.defaultJobDuration)}
                onValueChange={(value) => handleDurationChange('defaultJobDuration', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applied when creating jobs from calls, quick actions, or the calendar.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum slot increment</Label>
              <Select
                value={String(defaults.minimumSlotIncrement)}
                onValueChange={(value) => handleDurationChange('minimumSlotIncrement', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  {slotOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines the grid interval in the calendar and the increments suggested in availability pickers.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Automatic buffers</Label>
            <div className="flex flex-wrap gap-2">
              {bufferPresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={defaults.bufferMinutes === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBufferPreset(preset)}
                >
                  {formatMinutes(preset)}
                </Button>
              ))}
              <Input
                value={customBuffer}
                onChange={(event) => handleCustomBufferChange(event.target.value)}
                className="w-24"
                aria-label="Custom buffer minutes"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Applies a buffer before and after each job. Auto buffers are enforced when drag reordering or dropping jobs on the calendar.
            </p>
            <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/40 p-3">
              <Switch
                id="enable-auto-buffers"
                checked={defaults.enableAutoBuffers}
                onCheckedChange={(checked) => handleToggle('enableAutoBuffers', checked)}
              />
              <div>
                <Label htmlFor="enable-auto-buffers" className="text-sm font-medium">
                  Enforce buffers automatically
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, buffers become optional when staff reschedule jobs.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editing-lock-slider">Editing lock window</Label>
              <input
                id="editing-lock-slider"
                type="range"
                min={0}
                max={240}
                step={15}
                value={defaults.lockEditingWithinMinutes}
                onChange={(event) =>
                  updateSchedulingDefaults((current) => ({
                    ...current,
                    lockEditingWithinMinutes: Number(event.target.value),
                  }))
                }
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0 min</span>
                <span>240 min</span>
              </div>
              <p className="text-xs text-muted-foreground">{editingLockSummary}</p>
            </div>
            <div className="space-y-2">
              <Label>Overbooking policy</Label>
              <Select
                value={defaults.overbookingPolicy}
                onValueChange={(value) => handleSelect('overbookingPolicy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict — block overlaps entirely</SelectItem>
                  <SelectItem value="soft">Soft — warn but allow overrides</SelectItem>
                  <SelectItem value="manual">Manual — advisors decide case-by-case</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls how the calendar conflict detector behaves when overlaps occur.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/40 p-3">
              <Switch
                id="allow-same-day"
                checked={defaults.allowSameDayScheduling}
                onCheckedChange={(checked) => handleToggle('allowSameDayScheduling', checked)}
              />
              <div>
                <Label htmlFor="allow-same-day" className="text-sm font-medium">
                  Allow same-day scheduling
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, the earliest bookable slot shifts to the following business day.
                </p>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Advanced settings</AlertTitle>
              <AlertDescription>
                InstantDB persistence hooks in Task 10.6 will push these defaults to the backend and sync team-wide.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow notes</CardTitle>
          <CardDescription>
            Scheduling defaults feed the availability suggestion engine, call intake quick actions, and the job creation wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Slot increment and default duration should align so staff aren’t forced into fractional adjustments.</p>
          <p>- Buffers help technicians reset bays; consider longer windows when mixing heavy-duty work.</p>
          <p>- Editing lock prevents last-minute changes from disrupting the shop floor; keep it reasonable for rush jobs.</p>
        </CardContent>
      </Card>
    </div>
  );
}
