import type { components } from '@dermamind/api-client';
import { stepForCategory, type RoutineStep, type TimeOfDay } from '@dermamind/scoring';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '@/lib/api';

export type Routines = components['schemas']['RoutinesDto'];
export type Today = components['schemas']['TodayDto'];
export type Shelves = components['schemas']['ShelvesDto'];
export type ShelfKind = Shelves['shelves'][number]['kind'];

async function data<T>(res: { data?: T; response: Response }, what: string): Promise<T> {
  if (!res.data) throw new Error(errorText(res.response.status, {}) || `${what} failed`);
  return res.data;
}

export function useRoutines() {
  return useQuery({
    queryKey: ['routines'],
    queryFn: async () => data(await api.GET('/v1/me/routines'), 'routines'),
  });
}

/** Scores depend on routines, shelves (Unikam) and today's log — refresh what shows them. */
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['routines'] }),
      qc.invalidateQueries({ queryKey: ['today'] }),
    ]);
}

/** Puts one product into one slot (or empties it), keeping the rest of both routines. */
export function useSetSlot() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { time: TimeOfDay; step: RoutineStep; productId: number | null }) => {
      const current =
        qc.getQueryData<Routines>(['routines']) ??
        (await data(await api.GET('/v1/me/routines'), 'routines'));
      const body = (time: TimeOfDay) =>
        current[time].steps.map((s) => ({
          step: s.step,
          productId: time === v.time && s.step === v.step ? v.productId : (s.product?.id ?? null),
        }));
      const res = await api.PUT('/v1/me/routines', { body: { am: body('am'), pm: body('pm') } });
      if (!res.data) {
        throw new Error(
          errorText(res.response.status, { 400: 'Ten produkt nie pasuje do tego kroku.' }),
        );
      }
      return res.data;
    },
    onSuccess: (routines) => {
      qc.setQueryData(['routines'], routines);
      void invalidate();
    },
  });
}

export function useGenerateRoutine() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async () => {
      const res = await api.POST('/v1/me/routines/generate', { body: { times: ['am', 'pm'] } });
      if (!res.data) {
        throw new Error(
          errorText(res.response.status, { 409: 'Najpierw wypełnij quiz o skórze.' }),
        );
      }
      return res.data;
    },
    onSuccess: (routines) => {
      qc.setQueryData(['routines'], routines);
      void invalidate();
    },
  });
}

export function useToday() {
  return useQuery({
    queryKey: ['today'],
    queryFn: async () => data(await api.GET('/v1/me/today'), 'today'),
  });
}

export function useSetMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mood: number) =>
      data(await api.PUT('/v1/me/today/mood', { body: { mood } }), 'mood'),
    onSuccess: (today) => qc.setQueryData(['today'], today),
  });
}

export function useSetDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { time: TimeOfDay; doneSteps: number[] }) =>
      data(
        await api.PUT('/v1/me/today/routine/{time}', {
          params: { path: { time: v.time } },
          body: { doneSteps: v.doneSteps },
        }),
        'done',
      ),
    onMutate: (v) => {
      // tick at once; the server answer replaces it
      const prev = qc.getQueryData<Today>(['today']);
      if (prev)
        qc.setQueryData(['today'], { ...prev, done: { ...prev.done, [v.time]: v.doneSteps } });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['today'], ctx.prev),
    onSuccess: (today) => qc.setQueryData(['today'], today),
  });
}

export function useShelves() {
  return useQuery({
    queryKey: ['shelves'],
    queryFn: async () => data(await api.GET('/v1/me/shelves'), 'shelves'),
  });
}

/** Adding/removing changes scores (Unikam), so products and routines refresh too. */
export function useToggleShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { kind: ShelfKind; productId: number; on: boolean }) => {
      const res = v.on
        ? await api.POST('/v1/me/shelves/{kind}/items', {
            params: { path: { kind: v.kind } },
            body: { productId: v.productId },
          })
        : await api.DELETE('/v1/me/shelves/{kind}/items/{productId}', {
            params: { path: { kind: v.kind, productId: v.productId } },
          });
      if (!res.response.ok) throw new Error(errorText(res.response.status));
    },
    onSuccess: () =>
      Promise.all(
        ['shelves', 'product', 'products', 'routines', 'scans'].map((k) =>
          qc.invalidateQueries({ queryKey: [k] }),
        ),
      ),
  });
}

/** Where "Dodaj do rutyny" puts a product of this category. */
export function slotFor(category: string, time: TimeOfDay): RoutineStep | null {
  return stepForCategory(category, time);
}

/** Morning until 15:00, evening after — for "Dzisiejsza rutyna". */
export function currentTime(now = new Date()): TimeOfDay {
  return now.getHours() < 15 ? 'am' : 'pm';
}
