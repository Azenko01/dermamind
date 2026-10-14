import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ProductListItemDto } from './products.dto';

export class PageQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ type: Number, default: 30, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 30;
}

export class ScanDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ type: String, nullable: true, example: '5901234123457' })
  barcode!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  scannedAt!: string;

  @ApiProperty({
    type: ProductListItemDto,
    nullable: true,
    description: 'null = code not in the catalogue',
  })
  product!: ProductListItemDto | null;
}

export class ScanListDto {
  @ApiProperty({ type: [ScanDto] })
  items!: ScanDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
