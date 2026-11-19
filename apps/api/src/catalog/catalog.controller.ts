import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser, type AuthedRequest } from '../common/auth-user';
import { CatalogService } from './catalog.service';
import {
  CreateUserProductDto,
  ProductDetailDto,
  ProductListDto,
  ProductsQueryDto,
} from './dto/products.dto';
import { EanPipe } from './ean.pipe';

/** Public catalogue (PLAN.md 3.4); with an access token every product gets the user's Match Score. */
@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: ProductListDto })
  list(@Query() query: ProductsQueryDto, @Req() req: AuthedRequest): Promise<ProductListDto> {
    return this.catalog.list(query, req.user?.sub);
  }

  /**
   * Before ':id' so "by-ean" is never read as an id. Our catalogue first, then Open Beauty Facts
   * (saved as source = obf); rate-limited because a miss may call OBF.
   */
  @Get('by-ean/:ean')
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ default: true })
  @ApiOkResponse({
    type: ProductDetailDto,
    description: 'hasIngredientList = false → the app asks the user to paste the ingredient list',
  })
  @ApiNotFoundResponse({ description: 'Unknown code — the app offers "Dodaj produkt"' })
  @ApiBadRequestResponse({ description: 'Not a valid EAN' })
  @ApiTooManyRequestsResponse()
  byEan(@Param('ean', EanPipe) ean: string, @Req() req: AuthedRequest): Promise<ProductDetailDto> {
    return this.catalog.byEan(ean, req.user?.sub);
  }

  /** "Dodaj produkt" after a scan — only the author sees it until moderation. */
  @Post()
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @SkipThrottle({ scan: true })
  @ApiCreatedResponse({ type: ProductDetailDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUserProductDto,
  ): Promise<ProductDetailDto> {
    return this.catalog.createUserProduct(user.sub, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductDetailDto })
  @ApiNotFoundResponse()
  get(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<ProductDetailDto> {
    return this.catalog.get(id, req.user?.sub);
  }
}
