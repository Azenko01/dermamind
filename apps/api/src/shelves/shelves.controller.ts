import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { ParseShelfKindPipe } from './shelf-kind.pipe';
import { AddShelfItemDto, SHELF_KINDS, ShelvesDto, type SystemShelfKind } from './shelves.dto';
import { ShelvesService } from './shelves.service';

@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@Controller('me/shelves')
export class ShelvesController {
  constructor(private readonly shelves: ShelvesService) {}

  @Get()
  @ApiOkResponse({ type: ShelvesDto })
  list(@CurrentUser() user: AuthUser): Promise<ShelvesDto> {
    return this.shelves.list(user.sub);
  }

  /** Idempotent. Adding to "Lubię" removes it from "Unikam" and the other way round. */
  @Post(':kind/items')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'kind', enum: SHELF_KINDS })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Unknown product' })
  async add(
    @CurrentUser() user: AuthUser,
    @Param('kind', ParseShelfKindPipe) kind: SystemShelfKind,
    @Body() dto: AddShelfItemDto,
  ): Promise<void> {
    await this.shelves.add(user.sub, kind, dto.productId);
  }

  @Delete(':kind/items/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'kind', enum: SHELF_KINDS })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('kind', ParseShelfKindPipe) kind: SystemShelfKind,
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<void> {
    await this.shelves.remove(user.sub, kind, productId);
  }
}
