import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AppEnv } from '../config';

/** File names `pnpm catalog:attach-images` stores: letters, digits, "-", "_" and an image type. */
export const PRODUCT_IMAGE_FILE = /^[A-Za-z0-9_-]{1,64}\.(jpe?g|png|webp)$/;

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * The team's own product photos (data/images/). Public like the catalogue; only the strict file
 * name pattern above is served, never a path.
 */
@ApiTags('catalog')
@Controller('product-images')
export class ProductImagesController {
  private readonly dir: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.dir = config.get('productImagesDir', { infer: true });
  }

  @Get(':file')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The photo' })
  @ApiBadRequestResponse({ description: 'Not a product image file name' })
  @ApiNotFoundResponse()
  get(@Param('file') file: string, @Res() res: Response): void {
    const match = PRODUCT_IMAGE_FILE.exec(file);
    if (!match) throw new BadRequestException('Not a product image file name');
    const path = join(this.dir, file);
    if (!existsSync(path)) throw new NotFoundException('No such image');
    res.setHeader('Content-Type', TYPES[match[1]!.toLowerCase()]!);
    // a new photo gets a new file name (see attach-images), so long caching is safe
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.sendFile(path);
  }
}
