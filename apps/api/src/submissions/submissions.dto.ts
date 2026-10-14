import { isValidEan, normalizeEan } from '@dermamind/scoring';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

@ValidatorConstraint({ name: 'ean' })
class IsEan implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidEan(value);
  }
  defaultMessage() {
    return 'barcode must be a valid EAN-13 / EAN-8 code';
  }
}

export class CreateSubmissionDto {
  @ApiPropertyOptional({ example: '5901234123457' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? normalizeEan(value) : undefined,
  )
  @Validate(IsEan)
  barcode?: string;

  @ApiProperty({ example: 'Krem nawilżający z ceramidami' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Bielenda' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Ingredient list as printed on the package' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10_000)
  inciRaw?: string;
}

export class SubmissionDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}
