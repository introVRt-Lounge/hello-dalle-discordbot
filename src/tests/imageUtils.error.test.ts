import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { generateImage } from '../utils/imageUtils';

describe('generateImage error handling', () => {
  const mock = new MockAdapter(axios);

  beforeEach(() => {
    mock.reset();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  test('includes OpenAI error message and code in thrown error', async () => {
    const path = 'https://api.openai.com/v1/images/generations';
    mock.onPost(path).reply(400, {
      error: {
        message: 'Content policy violation: sexual content is not allowed',
        type: 'invalid_request_error',
        code: 'content_policy_violation',
        param: null,
      },
    });

    await expect(generateImage('prompt')).rejects.toThrow(
      /Failed to generate image: Content policy violation: sexual content is not allowed \(status: 400, type: invalid_request_error, code: content_policy_violation\)/
    );
  });
});

