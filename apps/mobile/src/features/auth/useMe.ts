import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/v1/me');
      if (error || !data) throw new Error(`GET /v1/me failed: ${response.status}`);
      return data;
    },
  });
}
