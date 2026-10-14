import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto, SubmissionDto } from './submissions.dto';

/** D4 "Zgłoś produkt": unknown products go to a moderation queue (admin panel later). */
@ApiTags('submissions')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('product-submissions')
export class SubmissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiCreatedResponse({ type: SubmissionDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSubmissionDto,
  ): Promise<SubmissionDto> {
    // TODO(Sprint 6): optional package photo (needs file storage).
    const s = await this.prisma.productSubmission.create({
      data: {
        userId: user.sub,
        barcode: dto.barcode ?? null,
        name: dto.name,
        brand: dto.brand || null,
        inciRaw: dto.inciRaw || null,
      },
    });
    return { id: s.id, status: s.status, createdAt: s.createdAt.toISOString() };
  }
}
