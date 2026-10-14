import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MatchDetailDto, ProductFlagsDto, ProductIngredientDto } from '../catalog/dto/products.dto';

export class AnalyzeInciDto {
  @ApiProperty({
    description:
      'Ingredient list as printed on the package (commas, one per line, "Skład:" prefix…)',
    example: 'Aqua, Glycerin, Niacinamide, Parfum',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(10_000)
  inci!: string;
}

export class AnalyzedIngredientDto {
  @ApiProperty({ description: 'Position in the pasted list, 1 = first' })
  position!: number;

  @ApiProperty({ description: 'The name as parsed from the text', example: 'AQUA (WATER)' })
  input!: string;

  @ApiProperty({ type: ProductIngredientDto, nullable: true, description: 'null = not recognised' })
  ingredient!: ProductIngredientDto | null;
}

export class AnalyzeResultDto {
  @ApiProperty({ type: [AnalyzedIngredientDto] })
  ingredients!: AnalyzedIngredientDto[];

  @ApiProperty({ type: [String], description: 'Names we could not match (parsed form)' })
  unknown!: string[];

  @ApiProperty({ type: ProductFlagsDto, description: 'With unknown names a "yes" becomes null' })
  flags!: ProductFlagsDto;

  @ApiProperty({ type: MatchDetailDto, nullable: true, description: 'null without a skin profile' })
  match!: MatchDetailDto | null;

  @ApiProperty({
    enum: ['rules', 'ai'],
    description:
      'ai = the rule parser left many names unknown and the AI parser read the list better',
  })
  parsedBy!: 'rules' | 'ai';
}
