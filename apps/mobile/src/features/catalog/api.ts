import type { components, paths } from '@dermamind/api-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type ProductsQuery = NonNullable<paths['/v1/products']['get']['parameters']['query']>;
export type ProductItem = components['schemas']['ProductListItemDto'];
export type ProductDetail = components['schemas']['ProductDetailDto'];

export function useProducts(query: ProductsQuery) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: async () => {
      const res = await api.GET('/v1/products', { params: { query } });
      if (!res.data) throw new Error(`GET /v1/products failed: ${res.response.status}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => {
      const res = await api.GET('/v1/products/{id}', { params: { path: { id } } });
      if (!res.data) throw new ProductError(res.response.status);
      return res.data;
    },
  });
}

/** Waits until typing stops before searching. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export class ProductError extends Error {
  constructor(readonly status: number) {
    super(`GET /v1/products/:id failed: ${status}`);
  }
}
