import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({ imports: [ScoringModule], controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
