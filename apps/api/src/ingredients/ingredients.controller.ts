import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../common/auth-user';
import { IngredientDetailDto } from './ingredients.dto';
import { IngredientsService } from './ingredients.service';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get(':id')
  @ApiOkResponse({ type: IngredientDetailDto })
  @ApiNotFoundResponse()
  get(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<IngredientDetailDto> {
    return this.ingredients.get(id, req.user?.sub);
  }
}
