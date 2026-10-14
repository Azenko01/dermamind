import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { ProductListItemDto } from '../catalog/dto/products.dto';

export const SHELF_KINDS = ['own', 'like', 'avoid'] as const;
export type SystemShelfKind = (typeof SHELF_KINDS)[number];

export class ShelfItemDto {
  @ApiProperty({ type: String, format: 'date-time' })
  addedAt!: string;

  @ApiProperty({ type: ProductListItemDto })
  product!: ProductListItemDto;
}

export class ShelfDto {
  @ApiProperty({ enum: SHELF_KINDS, description: 'own = „Mam”, like = „Lubię”, avoid = „Unikam”' })
  kind!: SystemShelfKind;

  @ApiProperty({ type: [ShelfItemDto], description: 'Newest first' })
  items!: ShelfItemDto[];
}

export class ShelvesDto {
  @ApiProperty({ type: [ShelfDto] })
  shelves!: ShelfDto[];
}

export class AddShelfItemDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  productId!: number;
}
