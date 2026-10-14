import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../common/auth-user';
import { CatalogService } from './catalog.service';
import { ProductDetailDto, ProductListDto, ProductsQueryDto } from './dto/products.dto';
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

  /** Before ':id' so "barcode" is never read as an id. */
  @Get('barcode/:ean')
  @ApiOkResponse({ type: ProductDetailDto })
  @ApiNotFoundResponse({
    description: 'Unknown code — the app offers "Wklej skład" / "Zgłoś produkt"',
  })
  @ApiBadRequestResponse({ description: 'Not a valid EAN' })
  byBarcode(
    @Param('ean', EanPipe) ean: string,
    @Req() req: AuthedRequest,
  ): Promise<ProductDetailDto> {
    return this.catalog.byBarcode(ean, req.user?.sub);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductDetailDto })
  @ApiNotFoundResponse()
  get(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<ProductDetailDto> {
    return this.catalog.get(id, req.user?.sub);
  }
}
