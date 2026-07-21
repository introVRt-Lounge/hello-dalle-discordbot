import { Client } from 'discord.js';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  execSync: jest.fn(),
}));

jest.mock('../config', () => ({
  BOTSPAM_CHANNEL_ID: 'channel-1',
  GEMINI_API_KEY: 'test-gemini-key',
  GOOGLE_CLOUD_PROJECT_ID: 'gen-lang-client-test',
}));

import { execFileSync, execSync } from 'child_process';
import { CostMonitoringService } from '../services/costMonitoringService';

const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('CostMonitoringService BigQuery invocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls bq via execFileSync argv (no shell) so backticks are not expanded', async () => {
    mockExecFileSync.mockReturnValue('total_cost,is_current_month\n12.5,true\n40.0,false\n' as any);

    const service = new CostMonitoringService({} as Client);
    const costs = await service.getAllCosts();

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(mockExecFileSync).toHaveBeenCalledTimes(1);

    const [cmd, args] = mockExecFileSync.mock.calls[0];
    expect(cmd).toBe('bq');
    expect(args?.[0]).toBe('--project_id=gen-lang-client-test');
    expect(args?.[1]).toBe('query');
    expect(args?.[args.length - 1]).toContain('`gen-lang-client-test.billing_data.gcp_billing_export_v1_*`');

    expect(costs).toHaveLength(1);
    expect(costs[0].thisMonth).toBe(12.5);
    expect(costs[0].lifetime).toBe(52.5);
  });
});
