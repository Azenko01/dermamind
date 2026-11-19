import { Module } from '@nestjs/common';
import { ProductImagesController } from './product-images.controller';

@Module({ controllers: [ProductImagesController] })
export class ProductImagesModule {}
