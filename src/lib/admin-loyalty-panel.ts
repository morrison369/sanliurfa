export interface AdminLoyaltyReward {
  id: string;
  reward_name: string;
  category: string;
  points_cost: number;
}

export function extractAdminLoyaltyRewards(
  payload: { data?: AdminLoyaltyReward[] } | { data?: { data?: AdminLoyaltyReward[] } } | null | undefined,
): AdminLoyaltyReward[] {
  if (!payload) return [];

  if (Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: AdminLoyaltyReward[] }).data;
  }

  const nested = (payload as { data?: { data?: unknown } }).data?.data;
  if (Array.isArray(nested)) {
    return nested as AdminLoyaltyReward[];
  }

  return [];
}

function renderRewardsTable(rewards: AdminLoyaltyReward[]): string {
  if (rewards.length === 0) {
    return '<p class="text-sm text-gray-600">Ödül bulunamadı.</p>';
  }

  return `
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th class="px-4 py-2 text-left">Ödül</th>
          <th class="px-4 py-2 text-left">Kategori</th>
          <th class="px-4 py-2 text-right">Puan</th>
        </tr>
      </thead>
      <tbody>
        ${rewards
          .map(
            (reward) => `
              <tr>
                <td class="px-4 py-2">${reward.reward_name}</td>
                <td class="px-4 py-2">${reward.category}</td>
                <td class="px-4 py-2 text-right">${reward.points_cost.toLocaleString('tr-TR')}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function renderAdminLoyaltyPanel(options: {
  activeTab: 'rewards';
  rewards: AdminLoyaltyReward[];
  error: string | null;
}): string {
  return `
    <div class="w-full space-y-4">
      <div class="flex space-x-2 border-b border-gray-200">
        <button
          type="button"
          data-admin-loyalty-tab="rewards"
          class="border-b-2 border-blue-600 px-4 py-2 font-medium text-blue-600"
        >
          Ödüller
        </button>
      </div>
      ${options.error ? `<div class="text-red-600">${options.error}</div>` : ''}
      <div class="space-y-4">
        ${renderRewardsTable(options.rewards)}
      </div>
    </div>
  `;
}
