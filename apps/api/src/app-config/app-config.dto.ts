import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagsDto {
  @ApiProperty({ description: 'AI texts and routine generator (Sprint 4)' })
  ai!: boolean;

  @ApiProperty({ description: 'Barcode scanner (Sprint 3)' })
  scanner!: boolean;
}

export class AppConfigDto {
  @ApiProperty({ example: '0.1.0', description: 'Older app builds must show the update screen' })
  minAppVersion!: string;

  @ApiProperty({ example: '0.1.0' })
  latestAppVersion!: string;

  @ApiProperty({ type: FeatureFlagsDto })
  features!: FeatureFlagsDto;
}
