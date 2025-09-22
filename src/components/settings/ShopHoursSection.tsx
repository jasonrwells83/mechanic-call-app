import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Plus, Trash2 } from 'lucide-react';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import type { Weekday } from '@/types/database';

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

const dayOrder: Array<{ id: Weekday; label: string }> = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

type ClosureDraft = {
  name: string;
  startDate: string;
  endDate: string;
  appliesTo: 'shop' | 'bay';
};

const emptyClosureDraft: ClosureDraft = {
  name: '',
  startDate: '',
  endDate: '',
  appliesTo: 'shop',
};

export function ShopHoursSection() {
  const { data, updateHours } = useSettingsForm();
  const hours = data.hours;
  const [isAddingClosure, setIsAddingClosure] = useState(false);
  const [closureDraft, setClosureDraft] = useState<ClosureDraft>(emptyClosureDraft);

  const schedule = useMemo(
    () =>
      dayOrder.map(({ id, label }) => ({
        id,
        label,
        config: hours.days[id],
      })),
    [hours.days],
  );

  const openDaysCount = useMemo(
    () => schedule.filter((day) => !day.config.closed).length,
    [schedule],
  );

  const handleToggleDay = (dayId: Weekday, isOpen: boolean) => {
    updateHours((current) => ({
      ...current,
      days: {
        ...current.days,
        [dayId]: {
          ...current.days[dayId],
          closed: !isOpen,
        },
      },
    }));
  };

  const handleTimeChange = (dayId: Weekday, field: 'open' | 'close', value: string) => {
    updateHours((current) => ({
      ...current,
      days: {
        ...current.days,
        [dayId]: {
          ...current.days[dayId],
          [field]: value,
        },
      },
    }));
  };

  const resetClosureDraft = () => {
    setClosureDraft(emptyClosureDraft);
    setIsAddingClosure(false);
  };

  const handleSaveClosure = () => {
    if (!closureDraft.name || !closureDraft.startDate) {
      return;
    }

    updateHours((current) => ({
      ...current,
      closures: [
        ...current.closures,
        {
          ...closureDraft,
          id: `closure-${Date.now()}`,
          endDate: closureDraft.endDate || closureDraft.startDate,
        },
      ],
    }));

    resetClosureDraft();
  };

  const handleRemoveClosure = (closureId: string) => {
    updateHours((current) => ({
      ...current,
      closures: current.closures.filter((closure) => closure.id !== closureId),
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Zone</CardTitle>
              <CardDescription>
                Determines how hours display across calendar, call intake, and reporting flows
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {openDaysCount} open days / week
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shop-timezone">Primary time zone</Label>
            <Select
              value={hours.timezone}
              onValueChange={(value) =>
                updateHours((current) => ({
                  ...current,
                  timezone: value,
                }))
              }
            >
              <SelectTrigger id="shop-timezone">
                <SelectValue placeholder="Select time zone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Display note</Label>
            <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              Calendar, forecast reports, and reminder schedules will reference the selected time zone.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Weekly operating hours</CardTitle>
          <CardDescription>
            Toggle availability by day and adjust default open/close times. These defaults feed the scheduling grid, suggested slots, and customer confirmations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Day</TableHead>
                <TableHead className="w-[160px]">Opens</TableHead>
                <TableHead className="w-[160px]">Closes</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((day) => (
                <TableRow key={day.id} className={day.config.closed ? 'bg-muted/40' : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        id={`is-open-${day.id}`}
                        checked={!day.config.closed}
                        onCheckedChange={(checked) => handleToggleDay(day.id, checked)}
                      />
                      <div className="flex flex-col">
                        <Label htmlFor={`is-open-${day.id}`} className="text-base font-medium">
                          {day.label}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {!day.config.closed ? 'Included in scheduling availability' : 'Marked as closed'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`open-${day.id}`} className="text-xs text-muted-foreground">
                        Opens at
                      </Label>
                      <Input
                        id={`open-${day.id}`}
                        type="time"
                        value={day.config.open}
                        onChange={(event) => handleTimeChange(day.id, 'open', event.target.value)}
                        disabled={day.config.closed}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`close-${day.id}`} className="text-xs text-muted-foreground">
                        Closes at
                      </Label>
                      <Input
                        id={`close-${day.id}`}
                        type="time"
                        value={day.config.close}
                        onChange={(event) => handleTimeChange(day.id, 'close', event.target.value)}
                        disabled={day.config.closed}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {!day.config.closed ? 'Applies by default to all bays' : 'Excluded from booking suggestions'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Closures & exceptions</CardTitle>
              <CardDescription>
                Add holidays, bay downtime, and ad-hoc overrides that should block scheduling availability.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddingClosure(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add exception
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hours.closures.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
              No closures scheduled yet. Add holidays or bay downtime to prevent accidental bookings.
            </div>
          ) : (
            <div className="space-y-3">
              {hours.closures.map((closure) => (
                <div
                  key={closure.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{closure.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {closure.appliesTo === 'shop' ? 'Entire shop' : 'Specific bay'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {closure.startDate === closure.endDate
                        ? closure.startDate
                        : `${closure.startDate} → ${closure.endDate}`}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveClosure(closure.id)}
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isAddingClosure && (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exception-name">Exception name</Label>
                  <Input
                    id="exception-name"
                    value={closureDraft.name}
                    onChange={(event) =>
                      setClosureDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="e.g. Labor Day"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exception-scope">Scope</Label>
                  <Select
                    value={closureDraft.appliesTo}
                    onValueChange={(value: 'shop' | 'bay') =>
                      setClosureDraft((current) => ({ ...current, appliesTo: value }))
                    }
                  >
                    <SelectTrigger id="exception-scope">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shop">Entire shop</SelectItem>
                      <SelectItem value="bay">Specific bay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exception-start">Start date</Label>
                  <Input
                    id="exception-start"
                    type="date"
                    value={closureDraft.startDate}
                    onChange={(event) =>
                      setClosureDraft((current) => ({ ...current, startDate: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exception-end">End date</Label>
                  <Input
                    id="exception-end"
                    type="date"
                    value={closureDraft.endDate}
                    onChange={(event) =>
                      setClosureDraft((current) => ({ ...current, endDate: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-end">
                <Button variant="ghost" onClick={resetClosureDraft} className="md:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSaveClosure} className="md:w-auto">
                  Save exception
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
