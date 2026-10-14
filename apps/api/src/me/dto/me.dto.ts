import {
  AVOID_GROUPS,
  BUDGETS,
  CONCERNS,
  MUST_HAVES,
  SPF_USAGE,
  type AvoidGroup,
  type Budget,
  type ConcernCode,
  type MustHave,
  type SkinType,
  type SpfUsage,
} from '@dermamind/scoring';
import { ApiProperty } from '@nestjs/swagger';
import { QuizAnswersDto } from './quiz.dto';

const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal'] as const satisfies readonly SkinType[];

export class ProfileDto {
  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ example: 'pl' })
  locale!: string;

  @ApiProperty({ enum: SKIN_TYPES, nullable: true })
  skinType!: SkinType | null;

  @ApiProperty({ type: Number, nullable: true, minimum: -3, maximum: 3 })
  oilLevel!: number | null;

  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 3 })
  barrierLevel!: number | null;

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 4 })
  sensitivityLevel!: number | null;

  @ApiProperty()
  isSensitive!: boolean;

  @ApiProperty({ enum: CONCERNS, isArray: true, description: 'Ordered by priority' })
  concerns!: ConcernCode[];

  @ApiProperty({ enum: AVOID_GROUPS, isArray: true })
  avoidGroups!: AvoidGroup[];

  @ApiProperty({ type: [String], description: 'INCI names as entered in the quiz' })
  avoidIngredients!: string[];

  @ApiProperty({ enum: MUST_HAVES, isArray: true })
  mustHaves!: MustHave[];

  @ApiProperty({ enum: SPF_USAGE, nullable: true })
  usesSpf!: SpfUsage | null;

  @ApiProperty({ enum: BUDGETS, nullable: true })
  budget!: Budget | null;

  @ApiProperty({ type: QuizAnswersDto, nullable: true })
  quizAnswers!: QuizAnswersDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  onboardedAt!: string | null;
}

export class MeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty()
  isGuest!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ProfileDto })
  profile!: ProfileDto;
}
