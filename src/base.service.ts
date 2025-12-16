import { SeekerModuleOptions } from './interfaces/module.interface';

export abstract class BaseService {
  protected readonly options: SeekerModuleOptions;

  constructor(options: SeekerModuleOptions) {
    this.options = options;
  }

  protected getConfig(): SeekerModuleOptions {
    return { ...this.options };
  }
}

