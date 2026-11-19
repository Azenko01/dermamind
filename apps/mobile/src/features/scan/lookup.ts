import { router } from 'expo-router';
import { api, errorText } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

/**
 * After a scan or a typed code (PLAN.md 6.5 flow 2):
 * - known with ingredients → product card with Match Score,
 * - known without ingredients (Open Beauty Facts record) → "Dodaj produkt" prefilled with name,
 *   brand and photo, the user only adds the ingredient list,
 * - unknown → "Dodaj produkt" with only the code.
 * Returns an error text when the lookup itself failed (offline, rate limit), otherwise navigates.
 */
export async function openByEan(ean: string): Promise<string | null> {
  const res = await api
    .GET('/v1/products/by-ean/{ean}', { params: { path: { ean } } })
    .catch(() => null);
  void queryClient.invalidateQueries({ queryKey: ['scans'] });

  const product = res?.data;
  if (product?.hasIngredientList) {
    queryClient.setQueryData(['product', product.id], product);
    router.replace({ pathname: '/product/[id]', params: { id: String(product.id) } });
    return null;
  }
  if (product) {
    router.replace({
      pathname: '/scan/[ean]',
      params: {
        ean,
        name: product.name,
        brand: product.brand ?? '',
        imageUrl: product.imageUrl ?? '',
        category: product.category,
      },
    });
    return null;
  }
  if (res?.response.status === 404) {
    router.replace({ pathname: '/scan/[ean]', params: { ean } });
    return null;
  }
  return errorText(res?.response.status, {
    400: 'To nie wygląda na poprawny kod EAN.',
    429: 'Za dużo skanów naraz. Odczekaj minutę i spróbuj ponownie.',
  });
}
