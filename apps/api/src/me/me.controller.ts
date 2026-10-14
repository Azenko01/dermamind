import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { MeDto } from './dto/me.dto';
import { QuizAnswersDto } from './dto/quiz.dto';
import { MeService } from './me.service';

/** Everything here is scoped to the user from the access token — no ids in the URL. */
@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOkResponse({ type: MeDto })
  get(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.me.get(user.sub);
  }

  @Put('quiz')
  @ApiOkResponse({ type: MeDto, description: 'Profile with skin type, barrier and sensitivity' })
  @ApiBadRequestResponse({ description: 'Validation errors' })
  saveQuiz(@CurrentUser() user: AuthUser, @Body() answers: QuizAnswersDto): Promise<MeDto> {
    return this.me.saveQuiz(user.sub, answers);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Account and all its data deleted' })
  delete(@CurrentUser() user: AuthUser): Promise<void> {
    return this.me.delete(user.sub);
  }
}
