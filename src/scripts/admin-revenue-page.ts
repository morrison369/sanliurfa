import { fetchAdminRevenue } from '../lib/admin-browser-client';

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

async function loadRevenueData(): Promise<void> {
  try {
    const result = await fetchAdminRevenue();
    const { summary, byTier } = result.data;

    setText('totalMRR', `$${summary.totalMRR.toFixed(2)}`);
    setText('activeSubscriptions', summary.totalActiveSubscriptions.toString());
    setText('churnRate', `${summary.churnRatePercent}%`);
    setText('totalRevenue', `$${summary.totalRevenueAllTime.toFixed(2)}`);

    if (byTier.free) {
      setText('freeTierCount', byTier.free.count.toString());
    }

    if (byTier.premium) {
      setText('premiumTierCount', byTier.premium.count.toString());
      setText('premiumTierRevenue', `$${byTier.premium.monthlyRevenue.toFixed(2)}`);
    }

    if (byTier.pro) {
      setText('proTierCount', byTier.pro.count.toString());
      setText('proTierRevenue', `$${byTier.pro.monthlyRevenue.toFixed(2)}`);
    }
  } catch (error) {
    console.error('Gelir verileri yüklenemedi:', error);
  }
}

export function initAdminRevenuePage(): void {
  void loadRevenueData();
  window.setInterval(() => {
    void loadRevenueData();
  }, 5 * 60 * 1000);
}
