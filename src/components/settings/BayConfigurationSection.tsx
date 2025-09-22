import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useSettingsForm } from '@/hooks/useSettingsForm';

export function BayConfigurationSection() {
  const { data, updateBays } = useSettingsForm();
  const bays = data.bays;

  const activeCount = useMemo(
    () => bays.filter((bay) => bay.isActive).length,
    [bays],
  );

  const updateBay = <K extends keyof typeof bays[number]>(
    id: string,
    field: K,
    value: (typeof bays[number])[K],
  ) => {
    updateBays((current) =>
      current.map((bay) =>
        bay.id === id
          ? {
              ...bay,
              [field]: value,
            }
          : bay,
      ),
    );
  };

  const addBay = () => {
    const nextIndex = bays.length + 1;
    updateBays((current) => [
      ...current,
      {
        id: `bay-${Date.now()}`,
        name: `Bay ${nextIndex}`,
        shortCode: `B${nextIndex}`,
        isActive: true,
        supportsHeavyDuty: false,
        notes: '',
      },
    ]);
  };

  const removeBay = (id: string) => {
    updateBays((current) => current.filter((bay) => bay.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service bay directory</CardTitle>
              <CardDescription>
                Rename bays and configure availability. Calendar lanes, kanban filters, and reporting will read from these labels.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {activeCount} active bays
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bays.map((bay, index) => (
            <div
              key={bay.id}
              className="space-y-4 rounded-lg border border-border bg-muted/10 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">{bay.name || `Bay ${index + 1}`}</Label>
                    {!bay.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customize the label that appears in scheduler columns and job cards.
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`bay-active-${bay.id}`}
                      checked={bay.isActive}
                      onCheckedChange={(checked) => updateBay(bay.id, 'isActive', checked)}
                    />
                    <Label htmlFor={`bay-active-${bay.id}`} className="text-sm">
                      Active
                    </Label>
                  </div>
                  {bays.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBay(bay.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove bay
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`bay-name-${bay.id}`}>Display name</Label>
                  <Input
                    id={`bay-name-${bay.id}`}
                    value={bay.name}
                    onChange={(event) => updateBay(bay.id, 'name', event.target.value)}
                    placeholder={`Bay ${index + 1}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`bay-shortcode-${bay.id}`}>Short code</Label>
                  <Input
                    id={`bay-shortcode-${bay.id}`}
                    value={bay.shortCode}
                    onChange={(event) => updateBay(bay.id, 'shortCode', event.target.value.toUpperCase())}
                    placeholder={`B${index + 1}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in condensed UI (mobile kanban, reporting tables).
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/40 p-3">
                  <Switch
                    id={`bay-heavy-duty-${bay.id}`}
                    checked={bay.supportsHeavyDuty}
                    onCheckedChange={(checked) => updateBay(bay.id, 'supportsHeavyDuty', checked)}
                  />
                  <div>
                    <Label htmlFor={`bay-heavy-duty-${bay.id}`} className="text-sm font-medium">
                      Supports heavy-duty jobs
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Flags the bay for transmissions, engine swaps, and oversized vehicles.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`bay-notes-${bay.id}`}>Internal notes</Label>
                <Textarea
                  id={`bay-notes-${bay.id}`}
                  value={bay.notes}
                  onChange={(event) => updateBay(bay.id, 'notes', event.target.value)}
                  placeholder="Surface quick reminders for dispatchers and advisors."
                  rows={3}
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addBay} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add service bay
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
          <CardDescription>
            Align bay names with signage in the shop so advisors and technicians reference the same nomenclature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Reordering and persistence will be handled when InstantDB integration lands in Task 10.6.</li>
            <li>Heavy-duty flag informs scheduling suggestions and prevents double-booking specialized lifts.</li>
            <li>Notes surface in the right dock for advisors when selecting a bay for a job.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
