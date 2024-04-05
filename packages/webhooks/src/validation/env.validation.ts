import { plainToInstance } from 'class-transformer';
import { IsNumber, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  FORDEFI_PUBLIC_KEY: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  WEBHOOK_PORT: number;

  BROKER_CONNECTION_STRING: string;

  BROKER_SIGNATURE_STATUS_QUEUE_NAME: string;

  @IsNumber()
  BROKER_RECONNECT_MSEC: number;

  @IsNumber()
  BROKER_QUEUE_PREFETCH: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
