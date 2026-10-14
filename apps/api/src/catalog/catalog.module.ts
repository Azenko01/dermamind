import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ScansController } from './scans.controller';

@Module({
  imports: [ScoringModule],
  controllers: [CatalogController, ScansController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
