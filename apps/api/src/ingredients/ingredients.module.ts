import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({
  imports: [ScoringModule],
  controllers: [IngredientsController],
  providers: [IngredientsService],
})
export class IngredientsModule {}
