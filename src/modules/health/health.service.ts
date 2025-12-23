import { Injectable } from '@nestjs/common';
import * as packageJson from '../../../package.json';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      version: packageJson.version,
      timestamp: new Date().toISOString(),
    };
  }
}
