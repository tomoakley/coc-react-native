import { Dispose } from '../util/dispose';
import { Global } from './global';

export class Commands extends Dispose {
  constructor() {
    super();
    this.push(new Global());
  }
}
