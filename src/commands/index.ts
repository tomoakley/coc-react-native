import { Dispose } from '../util/dispose';
import { Dev } from './dev';

export class Commands extends Dispose {
  constructor() {
    super();
    this.push(new Dev());
  }
}
