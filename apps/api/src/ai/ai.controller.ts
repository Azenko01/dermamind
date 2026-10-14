import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { AiTextDto, LangQueryDto } from './ai.dto';
import { AiService } from './ai.service';

/**
 * AI texts load separately from the screens they belong to (PLAN.md 6.5): the card shows at once,
 * the text follows. Never fails because of AI — without an answer the response is a fixed text.
 */
@ApiTags('ai')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('ingredients/:id/explain')
  @ApiOkResponse({ type: AiTextDto })
  @ApiNotFoundResponse()
  explain(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: LangQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiTextDto> {
    return this.ai.explainIngredient(id, user.sub, q.lang);
  }

  @Get('products/:id/summary')
  @ApiOkResponse({ type: AiTextDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'No skin profile yet — nothing to explain' })
  summary(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: LangQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiTextDto> {
    return this.ai.productSummary(id, user.sub, q.lang);
  }
}
