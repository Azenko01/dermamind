import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';
import { TodayService } from './today.service';

@Module({
  imports: [ScoringModule, AiModule],
  controllers: [RoutinesController],
  providers: [RoutinesService, TodayService],
})
export class RoutinesModule {}
