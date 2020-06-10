import { Dispose } from '../util/dispose';
import { Global } from './global';
import { Dev } from './dev';

export class Commands extends Dispose {
  constructor() {
    super();
    this.push(new Global(), new Dev());
  }
}
