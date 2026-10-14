import { ApiProperty } from '@nestjs/swagger';
import { ProductListItemDto } from '../catalog/dto/products.dto';

const CAUTIONS = [
  'fragrance_sensitive',
  'irritant_sensitive',
  'irritant_barrier',
  'comedogenic',
  'drying_alcohol',
] as const;

export class IngredientEffectDto {
  @ApiProperty({ description: 'skin_concerns.code' })
  concern!: string;

  @ApiProperty({ minimum: -2, maximum: 2 })
  effect!: number;
}

export class IngredientFlagsDto {
  @ApiProperty() isFragrance!: boolean;
  @ApiProperty() isAlcoholDrying!: boolean;
  @ApiProperty() isFungalAcneTrigger!: boolean;
  @ApiProperty() isEuAllergen!: boolean;
  @ApiProperty() isParaben!: boolean;
  @ApiProperty() isSulfate!: boolean;
  @ApiProperty() isSilicone!: boolean;
  @ApiProperty() isOil!: boolean;
  @ApiProperty() isAnimalDerived!: boolean;
  @ApiProperty() isReefHarmful!: boolean;
}

export class IngredientForYouDto {
  @ApiProperty()
  avoided!: boolean;

  @ApiProperty({ type: String, nullable: true })
  avoidedGroup!: string | null;

  @ApiProperty({ type: [String], description: "The user's concerns it helps, strongest first" })
  helps!: string[];

  @ApiProperty({ type: [String] })
  hurts!: string[];

  @ApiProperty({ enum: CAUTIONS, isArray: true })
  cautions!: (typeof CAUTIONS)[number][];
}

export class IngredientDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'NIACINAMIDE' })
  inciName!: string;

  @ApiProperty({ example: 'Niacinamide' })
  displayName!: string;

  @ApiProperty({ type: [String] })
  functions!: string[];

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 5 })
  comedogenic!: number | null;

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 3 })
  irritationRisk!: number | null;

  @ApiProperty({ type: IngredientFlagsDto })
  flags!: IngredientFlagsDto;

  @ApiProperty({ type: [String], description: 'ingredient_groups.code' })
  groups!: string[];

  @ApiProperty({ type: [IngredientEffectDto] })
  effects!: IngredientEffectDto[];

  @ApiProperty({
    type: IngredientForYouDto,
    nullable: true,
    description: 'null without a skin profile',
  })
  forYou!: IngredientForYouDto | null;

  @ApiProperty({
    type: [ProductListItemDto],
    description: 'Up to 10 products with it, best match first',
  })
  products!: ProductListItemDto[];
}
