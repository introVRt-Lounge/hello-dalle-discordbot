import axios, { AxiosError } from 'axios';

function safeStringify(value: unknown): string {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return str.length > 1200 ? str.slice(0, 1200) + ' …[truncated]' : str;
  } catch {
    return String(value);
  }
}

export function formatAxiosError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<any>;
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const data = err.response?.data;

    // OpenAI style error payload
    const openaiErr = data?.error ?? data?.['error'];
    const message: string | undefined = openaiErr?.message ?? data?.message ?? err.message;
    const type: string | undefined = openaiErr?.type ?? data?.type;
    const code: string | number | undefined = openaiErr?.code ?? data?.code;
    const param: string | undefined = openaiErr?.param ?? data?.param;

    if (message || type || code) {
      const parts: string[] = [];
      if (status) parts.push(`status: ${status}${statusText ? ' ' + statusText : ''}`);
      if (type) parts.push(`type: ${type}`);
      if (code !== undefined) parts.push(`code: ${code}`);
      if (param) parts.push(`param: ${param}`);
      const meta = parts.length ? ` (${parts.join(', ')})` : '';
      return `${message}${meta}`;
    }

    // Fallback - include body excerpt
    const body = data ? safeStringify(data) : '';
    const statusPart = status ? `HTTP ${status}${statusText ? ' ' + statusText : ''}` : 'HTTP error';
    return `${statusPart}${body ? ` - ${body}` : ''}`;
  }

  // Non-axios error
  if (error instanceof Error) return error.message;
  return String(error);
}

