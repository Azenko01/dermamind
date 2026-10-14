import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { SHELF_KINDS, type SystemShelfKind } from './shelves.dto';

@Injectable()
export class ParseShelfKindPipe implements PipeTransform<string, SystemShelfKind> {
  transform(value: string): SystemShelfKind {
    if (!(SHELF_KINDS as readonly string[]).includes(value)) {
      throw new BadRequestException(`kind must be one of: ${SHELF_KINDS.join(', ')}`);
    }
    return value as SystemShelfKind;
  }
}
