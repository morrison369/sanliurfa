// Generated SDK (@sanliurfa/sdk)
class ApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://sanliurfa.com/api';
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };
  }

  async get(path) {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  async post(path, body) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }
}

export { ApiClient };
