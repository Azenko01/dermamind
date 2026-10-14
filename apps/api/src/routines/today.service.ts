import { STEPS_BY_TIME, TIMES_OF_DAY, type TimeOfDay } from '@dermamind/scoring';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TodayDto } from './routines.dto';

/** "Today" is the calendar day in Poland, whatever the server's time zone. */
export function warsawDay(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

const asDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Dziś T1 (PLAN.md 3.6, 6.2): skin check-in and ticking off today's routine. */
@Injectable()
export class TodayService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<TodayDto> {
    const day = warsawDay();
    const monday = asDate(day);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return isoDay(d);
    });

    const [checkins, logs] = await Promise.all([
      this.prisma.skinCheckin.findMany({
        where: { userId, day: { gte: asDate(week[0]!), lte: asDate(week[6]!) } },
      }),
      this.prisma.routineLog.findMany({
        where: { userId, day: asDate(day) },
        include: { routine: true },
      }),
    ]);
    const mood = (d: string) => checkins.find((c) => isoDay(c.day) === d)?.mood ?? null;
    const done = (time: TimeOfDay) =>
      logs.find((l) => l.routine.timeOfDay === time)?.doneSteps ?? [];
    return {
      day,
      mood: mood(day),
      done: { am: done('am'), pm: done('pm') },
      week: week.map((d) => ({ day: d, mood: mood(d) })),
    };
  }

  async setMood(userId: string, mood: number): Promise<TodayDto> {
    const day = asDate(warsawDay());
    await this.prisma.skinCheckin.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, mood },
      update: { mood },
    });
    return this.get(userId);
  }

  /** Positions must point at filled steps of that routine. */
  async setDone(userId: string, time: TimeOfDay, doneSteps: number[]): Promise<TodayDto> {
    if (!TIMES_OF_DAY.includes(time)) throw new BadRequestException('time must be am or pm');
    const routine = await this.prisma.routine.findUnique({
      where: { userId_timeOfDay: { userId, timeOfDay: time } },
      include: { items: { select: { position: true } } },
    });
    if (!routine) throw new NotFoundException(`No ${time} routine yet`);
    const filled = new Set(routine.items.map((i) => i.position));
    const bad = doneSteps.filter((p) => p > STEPS_BY_TIME[time].length || !filled.has(p));
    if (bad.length)
      throw new BadRequestException(`Steps ${bad.join(', ')} are empty in the ${time} routine`);

    const day = asDate(warsawDay());
    const sorted = [...doneSteps].sort((a, b) => a - b);
    await this.prisma.routineLog.upsert({
      where: { userId_routineId_day: { userId, routineId: routine.id, day } },
      create: { userId, routineId: routine.id, day, doneSteps: sorted },
      update: { doneSteps: sorted },
    });
    return this.get(userId);
  }
}
