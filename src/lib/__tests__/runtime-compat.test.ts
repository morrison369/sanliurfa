import { describe, expect, it } from 'vitest';

describe('Runtime compat hardening', () => {
  it('should create customized contract documents from templates', async () => {
    const { documentManager, templateManager } = await import('../legal-contracts');

    const template = templateManager.createTemplate({
      name: 'Vendor Agreement',
      type: 'vendor',
      description: 'Vendor base template',
      content: 'Agreement between {{partyNames}} starting {{startDate}} for {{value}} {{currency}}.',
      sections: ['Parties', 'Commercials']
    });

    const contract = templateManager.createContractFromTemplate(template.id, {
      name: 'Acme Vendor Agreement',
      parties: ['Sanliurfa Ltd', 'Acme Corp'],
      startDate: new Date('2026-05-01').getTime(),
      value: 150000,
      currency: 'USD',
      createdBy: 'legal-team'
    });

    const [document] = documentManager.listDocuments(contract.id, 'contract');
    expect(contract.name).toBe('Acme Vendor Agreement');
    expect(document.content).toContain('Sanliurfa Ltd, Acme Corp');
    expect(document.content).toContain('2026-05-01');
    expect(document.content).toContain('150000 USD');
  });

  it('should stream deterministic LLM chunks without artificial delay', async () => {
    const { llmClient } = await import('../llm-integration');
    const chunks: string[] = [];

    const response = await llmClient.generateStreaming(
      {
        model: 'claude-3-sonnet',
        prompt: 'Explain observability budgets and alert fatigue in practical terms',
        maxTokens: 24
      },
      chunk => chunks.push(chunk)
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('').trim()).toBe(response.content);
    expect(response.latencyMs).toBeGreaterThan(0);
    expect(response.finishReason).toBe('stop');
  }, 20000);

  it('should notify realtime subscribers through supabase compat channel', async () => {
    process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';
    const { notifyRealtime, subscribeToTable, supabase } = await import('../supabase');
    const directEvents: string[] = [];
    const helperEvents: string[] = [];

    const channel = supabase
      .channel('places')
      .on('postgres_changes', { table: 'places' }, payload => {
        directEvents.push(payload.eventType);
      })
      .subscribe();

    const subscription = subscribeToTable('places', payload => {
      helperEvents.push(payload.eventType);
    });

    await new Promise(resolve => queueMicrotask(resolve));

    notifyRealtime('places', {
      eventType: 'INSERT',
      new: { id: 'place-1', name: 'Balik Golu' }
    });

    expect(helperEvents).toContain('SUBSCRIBED');
    expect(helperEvents).toContain('INSERT');
    expect(directEvents).toContain('INSERT');

    subscription.unsubscribe();
    channel.unsubscribe();
  });

  it('should respect event filters and stop emitting after unsubscribe', async () => {
    process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';
    const { notifyRealtime, supabase } = await import('../supabase');
    const events: string[] = [];

    const channel = supabase
      .channel('places-update-only')
      .on('postgres_changes', { table: 'places', event: 'UPDATE' }, payload => {
        events.push(payload.eventType);
      })
      .subscribe();

    await new Promise(resolve => queueMicrotask(resolve));

    notifyRealtime('places', { eventType: 'INSERT', new: { id: 'place-1' } });
    notifyRealtime('places', { eventType: 'UPDATE', new: { id: 'place-1' } });

    expect(events).toEqual(['UPDATE']);

    channel.unsubscribe();
    notifyRealtime('places', { eventType: 'UPDATE', new: { id: 'place-2' } });

    expect(events).toEqual(['UPDATE']);
  });
});
