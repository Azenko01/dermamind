import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { CatalogService } from './catalog.service';
import { PageQueryDto, ScanListDto } from './dto/scans.dto';

/** "Historia skanów" in Profil — newest first, unknown codes included. */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@Controller('me/scans')
export class ScansController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: ScanListDto })
  list(@CurrentUser() user: AuthUser, @Query() q: PageQueryDto): Promise<ScanListDto> {
    return this.catalog.scans(user.sub, q.page, q.pageSize);
  }
}
