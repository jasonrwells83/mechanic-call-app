import { Router, type Request, type Response } from 'express';
import { databaseService } from '../services/database';
import type {
  Appointment,
  Customer,
  DashboardScheduleEntry,
  DashboardStats,
  Job,
  ShopSettings,
  Vehicle,
  Weekday,
} from '../types/database';

const router = Router();

const DAY_NAMES: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MS_IN_HOUR = 1000 * 60 * 60;

const startOfDay = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const endOfDay = (date: Date) => {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 1);
  return end;
};

const startOfWeek = (date: Date) => {
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)
  const isoMondayOffset = (day + 6) % 7; // Monday as start of week
  const start = startOfDay(date);
  start.setDate(start.getDate() - isoMondayOffset);
  return start;
};

const endOfWeek = (weekStart: Date) => {
  const end = new Date(weekStart.getTime());
  end.setDate(end.getDate() + 7);
  return end;
};

const timeStringToMinutes = (value?: string) => {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const roundTo = (value: number, decimals: number = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateDailyCapacity = (settings: ShopSettings | null, day: Weekday) => {
  if (!settings) {
    // Default: 2 active bays, 8 hours each
    return 16;
  }

  const activeBays = settings.bays.filter((bay) => bay.isActive).length || 1;
  const dayConfig = settings.hours.days[day];

  if (!dayConfig || dayConfig.closed) {
    return 0;
  }

  const openMinutes = timeStringToMinutes(dayConfig.open);
  const closeMinutes = timeStringToMinutes(dayConfig.close);

  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
    return 0;
  }

  const dailyHours = (closeMinutes - openMinutes) / 60;
  return roundTo(dailyHours * activeBays, 2);
};

const buildScheduleEntries = (
  appointments: Appointment[],
  jobsById: Map<string, Job>,
  customersById: Map<string, Customer>,
  vehiclesById: Map<string, Vehicle>
): DashboardScheduleEntry[] => {
  return appointments
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((appointment) => {
      const job = jobsById.get(appointment.jobId);
      const customer = job ? customersById.get(job.customerId) : undefined;
      const vehicle = job ? vehiclesById.get(job.vehicleId) : undefined;

      return {
        appointmentId: appointment.id,
        jobId: appointment.jobId,
        jobTitle: job?.title,
        status: job?.status,
        bay: appointment.bay,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        customerName: customer?.name,
        vehicle: vehicle
          ? {
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              licensePlate: vehicle.licensePlate,
            }
          : undefined,
      } satisfies DashboardScheduleEntry;
    });
};

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(weekStart);
    const todayDayName = DAY_NAMES[now.getDay()];

    const [jobs, appointments, customers, vehicles, settings] = await Promise.all([
      databaseService.getAllJobs(),
      databaseService.getAllAppointments(),
      databaseService.getAllCustomers(),
      databaseService.getAllVehicles(),
      databaseService.getShopSettings(),
    ]);

    const todaysAppointments = appointments.filter((appointment) => {
      const start = new Date(appointment.startAt);
      return start >= todayStart && start < todayEnd;
    });

    const jobsById = new Map(jobs.map((job) => [job.id, job] as const));
    const customersById = new Map(customers.map((customer) => [customer.id, customer] as const));
    const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle] as const));

    const carsScheduled = new Set(todaysAppointments.map((appointment) => appointment.jobId)).size;
    const hoursBooked = todaysAppointments.reduce((sum, appointment) => {
      const start = new Date(appointment.startAt).getTime();
      const end = new Date(appointment.endAt).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return sum;
      }
      return sum + (end - start) / MS_IN_HOUR;
    }, 0);

    const waitingOnParts = jobs.filter((job) => job.status === 'waiting-parts').length;
    const completedToday = jobs.filter((job) => {
      if (job.status !== 'completed') {
        return false;
      }
      const updatedAt = new Date(job.updatedAt);
      return updatedAt >= todayStart && updatedAt < todayEnd;
    }).length;

    const completedThisWeek = jobs.filter((job) => {
      if (job.status !== 'completed') {
        return false;
      }
      const updatedAt = new Date(job.updatedAt);
      return updatedAt >= weekStart && updatedAt < weekEnd;
    });

    const averageJobTime = completedThisWeek.length
      ? completedThisWeek.reduce((sum, job) => sum + (job.estHours ?? 0), 0) / completedThisWeek.length
      : 0;

    const scheduleEntries = buildScheduleEntries(
      todaysAppointments,
      jobsById,
      customersById,
      vehiclesById
    );

    const stats: DashboardStats = {
      today: {
        carsScheduled,
        hoursBooked: roundTo(hoursBooked, 2),
        totalCapacity: calculateDailyCapacity(settings, todayDayName),
        waitingOnParts,
        completed: completedToday,
      },
      thisWeek: {
        jobsCompleted: completedThisWeek.length,
        averageJobTime: roundTo(averageJobTime, 2),
      },
      todaySchedule: scheduleEntries,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load dashboard stats',
    });
  }
});

export default router;
