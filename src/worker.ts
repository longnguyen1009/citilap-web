import app from 'vinext/server/fetch-handler';
import { runSchedules } from './server/services/cms-schedule.service';
import type { MediaEnvironment } from './server/services/media-library.service';

const worker = {
  ...app,
  async scheduled(_event: unknown, env: MediaEnvironment) {
    await runSchedules(env);
  },
};

export default worker;
