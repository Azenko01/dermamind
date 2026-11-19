import {
  isValidEan,
  normalizeEan,
  PRODUCT_FLAGS,
  type ConReason,
  type IngredientRating,
  type MatchLabel,
} from '@dermamind/scoring';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ProductCategory } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

@ValidatorConstraint({ name: 'ean' })
export class IsEanConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidEan(value);
  }
  defaultMessage() {
    return 'must be a valid EAN-13 / EAN-8 code';
  }
}

export const PRODUCT_CATEGORIES = Object.values(ProductCategory);
export const PRODUCT_SORTS = ['score', 'name', 'price_asc', 'price_desc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

const MATCH_LABELS = ['great', 'good', 'caution', 'poor'] as const satisfies readonly MatchLabel[];
const RATINGS = [
  'good',
  'caution',
  'bad',
  'neutral',
] as const satisfies readonly IngredientRating[];
const CON_REASONS = [
  'harms_concern',
  'fragrance_sensitive',
  'irritant_sensitive',
  'irritant_barrier',
  'comedogenic',
  'drying_alcohol',
] as const satisfies readonly ConReason[];

export class ProductsQueryDto {
  @ApiPropertyOptional({ description: 'Search in product name and brand' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;

  @ApiPropertyOptional({
    enum: PRODUCT_SORTS,
    description: 'Default: score for users with a skin profile, otherwise name',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;

  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class MatchSummaryDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({
    enum: ['ok', 'excluded'],
    description: 'excluded = contains an avoided ingredient (score ≤ 40)',
  })
  status!: 'ok' | 'excluded';

  @ApiProperty({ enum: MATCH_LABELS })
  label!: MatchLabel;

  @ApiProperty({ description: 'Incomplete INCI or > 30% of ingredients without data' })
  lowConfidence!: boolean;
}

export class ProductListItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  brand!: string | null;

  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  category!: ProductCategory;

  @ApiProperty({ type: Number, nullable: true })
  pricePln!: number | null;

  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ description: 'false = only key ingredients are known' })
  inciComplete!: boolean;

  @ApiProperty({
    type: MatchSummaryDto,
    nullable: true,
    description: 'null without a skin profile',
  })
  match!: MatchSummaryDto | null;
}

export class ProductListDto {
  @ApiProperty({ type: [ProductListItemDto] })
  items!: ProductListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class MatchProDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredient!: string;

  @ApiProperty({ description: 'skin_concerns.code' })
  concern!: string;

  @ApiProperty({ description: 'Points added to the score' })
  impact!: number;
}

export class MatchConDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredient!: string;

  @ApiProperty({ enum: CON_REASONS })
  reason!: ConReason;

  @ApiPropertyOptional({ description: 'For harms_concern' })
  concern?: string;

  @ApiProperty({ description: 'Points taken off (negative)' })
  impact!: number;
}

export class MatchExclusionDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredient!: string;

  @ApiPropertyOptional({ description: 'ingredient_groups.code when excluded through a group' })
  group?: string;
}

export class MatchConfidenceDto {
  @ApiProperty()
  inciComplete!: boolean;

  @ApiProperty({ description: 'Share of ingredients without any data, 0–1' })
  unknownShare!: number;
}

export class MatchDetailDto extends MatchSummaryDto {
  @ApiProperty({ type: MatchConfidenceDto })
  confidence!: MatchConfidenceDto;

  @ApiProperty({ description: 'The user put this product on the "Unikam" shelf' })
  avoidedByUser!: boolean;

  @ApiProperty({ type: [MatchProDto] })
  pros!: MatchProDto[];

  @ApiProperty({ type: [MatchConDto] })
  cons!: MatchConDto[];

  @ApiProperty({ type: [MatchExclusionDto] })
  excludedBy!: MatchExclusionDto[];
}

export class ProductIngredientDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ description: '1 = highest concentration' })
  position!: number;

  @ApiProperty({ example: 'NIACINAMIDE' })
  inciName!: string;

  @ApiProperty({ example: 'Niacinamide' })
  displayName!: string;

  @ApiProperty({ type: [String], example: ['humectant'] })
  functions!: string[];

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 5 })
  comedogenic!: number | null;

  @ApiProperty()
  isFungalAcneTrigger!: boolean;

  @ApiProperty()
  isEuAllergen!: boolean;

  @ApiProperty()
  isFragrance!: boolean;

  @ApiProperty({
    enum: RATINGS,
    nullable: true,
    description: 'For the current user; null without a profile',
  })
  rating!: IngredientRating | null;
}

export class ProductFlagsDto implements Record<(typeof PRODUCT_FLAGS)[number], boolean | null> {
  @ApiProperty({ type: Boolean, nullable: true }) alcohol_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) fragrance_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) silicone_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) pore_clogger_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) eu_allergen_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) oil_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) sulfate_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) paraben_free!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) fungal_acne_safe!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) vegan!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) reef_safe!: boolean | null;
  @ApiProperty({ type: Boolean, nullable: true }) cruelty_free!: boolean | null;
}

export const PRODUCT_SOURCES = ['curated', 'obf', 'user'] as const;
export type ProductSourceKind = (typeof PRODUCT_SOURCES)[number];

export class ProductDetailDto extends ProductListItemDto {
  @ApiProperty({ type: String, nullable: true, description: 'Page the data came from' })
  sourceUrl!: string | null;

  @ApiProperty({
    enum: PRODUCT_SOURCES,
    description:
      'curated = our catalogue, obf = Open Beauty Facts (show "Dane: Open Beauty Facts (ODbL)"), user = added by this user',
  })
  source!: ProductSourceKind;

  @ApiProperty({ type: String, nullable: true, description: 'EAN-13 / EAN-8' })
  barcode!: string | null;

  @ApiProperty({ description: 'Sold in Poland according to Open Beauty Facts' })
  isPolishMarket!: boolean;

  @ApiProperty({
    description:
      'false = we have no ingredient list yet (e.g. Open Beauty Facts record without one) — the app asks the user to paste it',
  })
  hasIngredientList!: boolean;

  @ApiProperty({
    type: [String],
    description: 'Names from the list we do not know, exactly as written (never guessed)',
  })
  unknownIngredients!: string[];

  @ApiProperty({ description: 'source = user: waiting for the team to check it' })
  needsReview!: boolean;

  @ApiProperty({
    enum: ['own', 'like', 'avoid'],
    isArray: true,
    description: 'My shelves with this product („Mam”, „Lubię”, „Unikam”); empty without a token',
  })
  myShelves!: ('own' | 'like' | 'avoid')[];

  @ApiProperty({
    type: ProductFlagsDto,
    description: 'null = no data (incomplete INCI / brand info)',
  })
  flags!: ProductFlagsDto;

  @ApiProperty({ type: [ProductIngredientDto] })
  ingredients!: ProductIngredientDto[];

  @ApiProperty({ type: MatchDetailDto, nullable: true })
  declare match: MatchDetailDto | null;
}

export class CreateUserProductDto {
  @ApiPropertyOptional({ example: '5901234123457', description: 'Scanned EAN-13 / EAN-8' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? normalizeEan(value) : undefined,
  )
  @Validate(IsEanConstraint)
  ean?: string;

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

  @ApiProperty({ description: 'Ingredient list as printed on the package' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(10_000)
  inciRaw!: string;

  @ApiPropertyOptional({
    enum: PRODUCT_CATEGORIES,
    description: 'Default: the Open Beauty Facts category for this code, otherwise other',
  })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;
}
