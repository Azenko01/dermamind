import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Accepts EAN-13 / EAN-8 (and UPC-A as EAN-13) with a valid check digit. */
@Injectable()
export class EanPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const ean = normalizeEan(value ?? '');
    if (!isValidEan(ean)) throw new BadRequestException('Not a valid EAN-13 / EAN-8 code');
    return ean;
  }
}
