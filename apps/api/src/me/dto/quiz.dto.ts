import {
  AFTER_WASH,
  AVOID_GROUPS,
  BARRIER_SYMPTOMS,
  BUDGETS,
  CONCERNS,
  MUST_HAVES,
  REACTION_FREQUENCIES,
  SEASONAL_CHANGES,
  SHINE_LEVELS,
  SPF_USAGE,
  STRUGGLES,
  TRIGGERS,
  type AfterWash,
  type AvoidGroup,
  type BarrierSymptom,
  type Budget,
  type ConcernCode,
  type MustHave,
  type QuizAnswers,
  type ReactionFrequency,
  type SeasonalChange,
  type ShineLevel,
  type SpfUsage,
  type Struggle,
  type Trigger,
} from '@dermamind/scoring';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ShineDto {
  @ApiProperty({ enum: SHINE_LEVELS, description: 'Forehead and nose' })
  @IsIn(SHINE_LEVELS)
  tZone!: ShineLevel;

  @ApiProperty({ enum: SHINE_LEVELS })
  @IsIn(SHINE_LEVELS)
  cheeks!: ShineLevel;

  @ApiProperty({ enum: SHINE_LEVELS, description: 'Chin and jaw' })
  @IsIn(SHINE_LEVELS)
  jaw!: ShineLevel;
}

const upperTrim = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').toUpperCase() : v))
    : value;

/** Body of PUT /v1/me/quiz — the raw answers of O6–O19. Skin type etc. are computed on the server. */
export class QuizAnswersDto implements QuizAnswers {
  @ApiProperty({ enum: STRUGGLES })
  @IsIn(STRUGGLES)
  struggle!: Struggle;

  @ApiProperty({ enum: CONCERNS, isArray: true, description: 'First = main concern' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(CONCERNS, { each: true })
  concerns!: ConcernCode[];

  @ApiProperty({ type: ShineDto })
  @ValidateNested()
  @Type(() => ShineDto)
  shine!: ShineDto;

  @ApiProperty({ enum: AFTER_WASH })
  @IsIn(AFTER_WASH)
  afterWash!: AfterWash;

  @ApiProperty({ enum: BARRIER_SYMPTOMS, isArray: true, description: 'Empty = none' })
  @IsArray()
  @ArrayUnique()
  @IsIn(BARRIER_SYMPTOMS, { each: true })
  symptoms!: BarrierSymptom[];

  @ApiProperty({ enum: REACTION_FREQUENCIES })
  @IsIn(REACTION_FREQUENCIES)
  reactionFrequency!: ReactionFrequency;

  @ApiProperty({ enum: TRIGGERS, isArray: true, description: 'Empty = none' })
  @IsArray()
  @ArrayUnique()
  @IsIn(TRIGGERS, { each: true })
  triggers!: Trigger[];

  @ApiProperty({ enum: SEASONAL_CHANGES })
  @IsIn(SEASONAL_CHANGES)
  seasonal!: SeasonalChange;

  @ApiProperty({ enum: AVOID_GROUPS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(AVOID_GROUPS, { each: true })
  avoidGroups!: AvoidGroup[];

  @ApiProperty({
    type: [String],
    example: ['LIMONENE', 'ALCOHOL DENAT.'],
    description: 'INCI names',
  })
  @Transform(upperTrim)
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @Matches(/^[^<>\p{Cc}]+$/u, { each: true })
  avoidIngredients!: string[];

  @ApiProperty({ enum: MUST_HAVES, isArray: true, description: 'Empty = no requirements' })
  @IsArray()
  @ArrayUnique()
  @IsIn(MUST_HAVES, { each: true })
  mustHaves!: MustHave[];

  @ApiProperty({ enum: SPF_USAGE })
  @IsIn(SPF_USAGE)
  usesSpf!: SpfUsage;

  @ApiProperty({ enum: BUDGETS })
  @IsIn(BUDGETS)
  budget!: Budget;
}
