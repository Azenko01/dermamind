import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../common/auth-user';
import { AnalyzeInciDto, AnalyzeResultDto } from './analyze.dto';
import { AnalyzeService } from './analyze.service';

@ApiTags('analyze')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyze: AnalyzeService) {}

  @Post('inci')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AnalyzeResultDto })
  @ApiBadRequestResponse({ description: 'Empty text or more than 300 ingredients' })
  inci(@Body() dto: AnalyzeInciDto, @Req() req: AuthedRequest): Promise<AnalyzeResultDto> {
    return this.analyze.analyzeInci(dto.inci, req.user?.sub);
  }
}
