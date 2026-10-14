import { ROUTINE_STEPS, TIMES_OF_DAY, type RoutineStep, type TimeOfDay } from '@dermamind/scoring';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductListItemDto } from '../catalog/dto/products.dto';

// ─── input ───

export class RoutineStepInputDto {
  @ApiProperty({ enum: ROUTINE_STEPS })
  @IsIn(ROUTINE_STEPS)
  step!: RoutineStep;

  @ApiProperty({ type: Number, nullable: true, description: 'null = empty slot' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  productId!: number | null;
}

export class PutRoutinesDto {
  @ApiProperty({
    type: [RoutineStepInputDto],
    description: 'Morning; any of the 5 steps, each once',
  })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => RoutineStepInputDto)
  am!: RoutineStepInputDto[];

  @ApiProperty({ type: [RoutineStepInputDto], description: 'Evening; no "protect" step' })
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => RoutineStepInputDto)
  pm!: RoutineStepInputDto[];
}

export class GenerateRoutinesDto {
  @ApiPropertyOptional({ enum: TIMES_OF_DAY, isArray: true, default: ['am', 'pm'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(TIMES_OF_DAY, { each: true })
  times?: TimeOfDay[];
}

export class MoodDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: '1 źle … 5 super' })
  @IsInt()
  @Min(1)
  @Max(5)
  mood!: number;
}

export class RoutineLogDto {
  @ApiProperty({ type: [Number], description: 'Positions (1…5) of the steps done today' })
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  doneSteps!: number[];
}

// ─── output ───

export class RoutineSlotDto {
  @ApiProperty({ description: '1-based, in application order' })
  position!: number;

  @ApiProperty({ enum: ROUTINE_STEPS })
  step!: RoutineStep;

  @ApiProperty({ type: ProductListItemDto, nullable: true })
  product!: ProductListItemDto | null;
}

export class RoutineDto {
  @ApiProperty({ enum: TIMES_OF_DAY })
  time!: TimeOfDay;

  @ApiProperty({
    type: [RoutineSlotDto],
    description: 'Every step of this time of day, filled or not',
  })
  steps!: RoutineSlotDto[];

  @ApiProperty({
    enum: ['ai', 'rules'],
    nullable: true,
    description: 'Set after generation, cleared on manual edits',
  })
  generatedBy!: 'ai' | 'rules' | null;

  @ApiProperty({ type: String, nullable: true, description: 'Explanation of a generated routine' })
  summary!: string | null;
}

export class ConflictSideDto {
  @ApiProperty() productId!: number;
  @ApiProperty() productName!: string;
  @ApiProperty() ingredient!: string;
}

export class RoutineConflictDto {
  @ApiProperty({ enum: TIMES_OF_DAY }) time!: TimeOfDay;
  @ApiProperty({ minimum: 1, maximum: 2, description: '1 = take care, 2 = don’t combine' })
  severity!: number;
  @ApiProperty({
    example: 'retinoid_exfoliant',
    description: 'Key for the Polish explanation in the app',
  })
  noteKey!: string;
  @ApiProperty({ type: ConflictSideDto }) a!: ConflictSideDto;
  @ApiProperty({ type: ConflictSideDto }) b!: ConflictSideDto;
}

export class RoutineScoreDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'null = empty routine or no skin profile',
  })
  score!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  averageProductScore!: number | null;

  @ApiProperty({ description: 'Morning has products but no sunscreen (−10)' })
  missingSpf!: boolean;

  @ApiProperty({ type: [RoutineConflictDto], description: '−10 each' })
  conflicts!: RoutineConflictDto[];

  @ApiProperty()
  productCount!: number;
}

export class RoutinesDto {
  @ApiProperty({ type: RoutineDto }) am!: RoutineDto;
  @ApiProperty({ type: RoutineDto }) pm!: RoutineDto;
  @ApiProperty({ type: RoutineScoreDto }) score!: RoutineScoreDto;

  @ApiProperty({
    description: 'Fixed text (not from the model): see a dermatologist for skin problems',
  })
  disclaimer!: string;
}

export class GenerateResultDto extends RoutinesDto {
  @ApiProperty({ enum: ['ai', 'rules'] })
  generatedBy!: 'ai' | 'rules';

  @ApiProperty({
    enum: ['not_configured', 'limit', 'error', 'refused', 'invalid_pick'],
    nullable: true,
    description: 'Why the rules were used instead of AI',
  })
  fallbackReason!: 'not_configured' | 'limit' | 'error' | 'refused' | 'invalid_pick' | null;

  @ApiProperty({
    type: [String],
    description: '"am:protect" etc. — steps without any suitable product',
  })
  emptySteps!: string[];
}

export class TodayDayDto {
  @ApiProperty({ example: '2026-10-14' }) day!: string;
  @ApiProperty({ type: Number, nullable: true }) mood!: number | null;
}

export class TodayDoneDto {
  @ApiProperty({ type: [Number], example: [1, 2] }) am!: number[];
  @ApiProperty({ type: [Number], example: [] }) pm!: number[];
}

export class TodayDto {
  @ApiProperty({ example: '2026-10-14', description: 'Today in Europe/Warsaw' })
  day!: string;

  @ApiProperty({ type: Number, nullable: true })
  mood!: number | null;

  @ApiProperty({ type: TodayDoneDto, description: 'Done step positions today' })
  done!: TodayDoneDto;

  @ApiProperty({ type: [TodayDayDto], description: 'Monday…Sunday of this week' })
  week!: TodayDayDto[];
}
