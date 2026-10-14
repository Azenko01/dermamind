import { TIMES_OF_DAY, type TimeOfDay } from '@dermamind/scoring';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import {
  GenerateResultDto,
  GenerateRoutinesDto,
  MoodDto,
  PutRoutinesDto,
  RoutineLogDto,
  RoutinesDto,
  TodayDto,
} from './routines.dto';
import { RoutinesService } from './routines.service';
import { TodayService } from './today.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class RoutinesController {
  constructor(
    private readonly routines: RoutinesService,
    private readonly today: TodayService,
  ) {}

  @Get('routines')
  @ApiOkResponse({ type: RoutinesDto })
  get(@CurrentUser() user: AuthUser): Promise<RoutinesDto> {
    return this.routines.get(user.sub);
  }

  @Put('routines')
  @ApiOkResponse({ type: RoutinesDto })
  @ApiBadRequestResponse({
    description: 'Step not in that routine, product category not fitting the step',
  })
  put(@CurrentUser() user: AuthUser, @Body() dto: PutRoutinesDto): Promise<RoutinesDto> {
    return this.routines.put(user.sub, dto);
  }

  /** Rebuilds the chosen routines; uses the daily AI limit when AI is available. */
  @Post('routines/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GenerateResultDto })
  @ApiConflictResponse({ description: 'No skin profile yet' })
  generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateRoutinesDto,
  ): Promise<GenerateResultDto> {
    return this.routines.generate(user.sub, dto.times?.length ? dto.times : ['am', 'pm']);
  }

  @Get('today')
  @ApiOkResponse({ type: TodayDto })
  getToday(@CurrentUser() user: AuthUser): Promise<TodayDto> {
    return this.today.get(user.sub);
  }

  @Put('today/mood')
  @ApiOkResponse({ type: TodayDto })
  mood(@CurrentUser() user: AuthUser, @Body() dto: MoodDto): Promise<TodayDto> {
    return this.today.setMood(user.sub, dto.mood);
  }

  @Put('today/routine/:time')
  @ApiParam({ name: 'time', enum: TIMES_OF_DAY })
  @ApiOkResponse({ type: TodayDto })
  @ApiNotFoundResponse({ description: 'No routine for that time of day' })
  done(
    @CurrentUser() user: AuthUser,
    @Param('time') time: string,
    @Body() dto: RoutineLogDto,
  ): Promise<TodayDto> {
    if (!(TIMES_OF_DAY as readonly string[]).includes(time))
      throw new BadRequestException('time must be am or pm');
    return this.today.setDone(user.sub, time as TimeOfDay, dto.doneSteps);
  }
}
