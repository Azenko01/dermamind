import type { components } from '@dermamind/api-client';
import { useQuery } from '@tanstack/react-query';
import { useMe } from '@/features/auth/useMe';
import { api } from '@/lib/api';

export type AiText = components['schemas']['AiTextDto'];
type Lang = 'pl' | 'en' | 'uk';

function useLang(): Lang {
  const locale = useMe().data?.profile.locale;
  return locale === 'en' || locale === 'uk' ? locale : 'pl';
}

// AI texts are fetched separately from the card, so the card never waits for them (PLAN.md 6.5).
// A real text is kept for a day; a fallback (no key, no credit, limit, error) is refetched next time
// the screen opens, so it disappears as soon as the server can answer again.
const DAY = 24 * 60 * 60 * 1000;
const aiQuery = {
  staleTime: (q: { state: { data?: AiText } }) => (q.state.data?.source === 'fallback' ? 0 : DAY),
  gcTime: DAY,
  retry: 0,
} as const;

export function useIngredientExplain(id: number) {
  const lang = useLang();
  return useQuery({
    ...aiQuery,
    queryKey: ['ai', 'ingredient', id, lang],
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => {
      const res = await api.GET('/v1/ai/ingredients/{id}/explain', {
        params: { path: { id }, query: { lang } },
      });
      if (!res.data) throw new Error(`AI explain failed: ${res.response.status}`);
      return res.data;
    },
  });
}

export function useProductSummary(id: number, enabled: boolean) {
  const lang = useLang();
  return useQuery({
    ...aiQuery,
    queryKey: ['ai', 'product', id, lang],
    enabled: enabled && Number.isInteger(id) && id > 0,
    queryFn: async () => {
      const res = await api.GET('/v1/ai/products/{id}/summary', {
        params: { path: { id }, query: { lang } },
      });
      if (!res.data) throw new Error(`AI summary failed: ${res.response.status}`);
      return res.data;
    },
  });
}
