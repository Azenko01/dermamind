import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { LANGS, type Lang } from './prompts/common';

export class LangQueryDto {
  @ApiPropertyOptional({ enum: LANGS, default: 'pl' })
  @IsOptional()
  @IsIn(LANGS)
  lang: Lang = 'pl';
}

export class AiTextDto {
  @ApiProperty({ description: 'Text to show; a fixed fallback when source = fallback' })
  text!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ingredient card: what to watch out for',
  })
  caution!: string | null;

  @ApiProperty({
    enum: ['ai', 'cache', 'fallback'],
    description: 'ai/cache → show "Opis wygenerowany przez AI"',
  })
  source!: 'ai' | 'cache' | 'fallback';

  @ApiProperty({ enum: ['not_configured', 'limit', 'error', 'refused'], nullable: true })
  fallbackReason!: 'not_configured' | 'limit' | 'error' | 'refused' | null;

  @ApiProperty({ example: '2026-10-14.1' })
  promptVersion!: string;
}
