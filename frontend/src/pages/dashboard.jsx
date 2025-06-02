// src/pages/Dashboard.jsx
import React from 'react';
import useSWR from 'swr';
import { Card, Typography } from '@material-tailwind/react';
import AveragePriceBarChart from '@/widgets/cards/averagePriceBarChart';
import PriceTrendLineChart from '@/widgets/cards/priceTrendLineChart';
import BasicBasketChart from '@/widgets/cards/basicBasketChart';
import ExtendedBasketChart from '@/widgets/cards/extendedBasketChart';
import CategoryAvgPriceChart from '@/widgets/cards/CategoryAvgPriceChart';
import CategoryDistributionDonutChart from '@/widgets/cards/CategoryDistributionDonutChart';
import { ArrowLeftRight } from 'lucide-react';
import { Footer } from '@/widgets/layout';
import { CategoryDiscountShareChart } from '@/widgets/cards';

// SWR fetcher is configured globally via SWRConfig in App.jsx
export function Dashboard() {
  // 1) Povprečne cene
  const { data: avgData, error: avgError } =
    useSWR('http://localhost:3000/api/dashboard/average-prices');
  // 2) Trend cen
  const { data: trendResp, error: trendError } =
    useSWR('http://localhost:3000/api/dashboard/price-trends');

  // Loading / napake
  const loading = !avgData || !trendResp;
  const error = avgError || trendError;

  if (loading) {
    return <Typography className="text-center py-4">Nalagam analitiko…</Typography>;
  }
  if (error) {
    return <Typography color="red" className="text-center py-4">Napaka pri nalaganju podatkov.</Typography>;
  }

  // Trend endpoint returns { data: [...], stores: [...] }
  const trendData = trendResp.data;
  const trendStores = trendResp.stores || [];

  return (
    <>
      {/* Hero sekcija */}
      <div className="relative flex h-[40vh] items-center justify-center bg-gray-100">
        <div className="absolute top-0 h-full w-full bg-[url('/img/line-graph.png')] bg-cover bg-center" />
        <Card className="absolute p-8 bg-transparent shadow-none">
          <Typography variant="h2" className="text-white">Analiza cen živil</Typography>
          <Typography variant="lead" className="text-white">Primerjajte trende, variabilnost in relativne razlike</Typography>
        </Card>
      </div>

      {/* Prvi dve vizualki */}
      <section className="-mt-32 bg-white px-4 pb-20 pt-4">
  <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
    {/* both children will now stretch to the same height */}
    <div className="w-full min-h-[450px] flex flex-col">
      <AveragePriceBarChart
        data={avgData}
        // override the default height to fill its parent
        containerProps={{ className: 'flex-1' }}
      />
    </div>
    <div className="w-full min-h-[450px] flex flex-col">
      <PriceTrendLineChart
        data={trendData}
        stores={trendStores}
        containerProps={{ className: 'flex-1' }}
      />
    </div>
  </div>
</section>

      {/* Primerjava košarice */}
      <section className="container mx-auto py-8 px-4">
        {/* Centeriran naslov z ikono */}
        <div className="w-full flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-black" />
            <Typography variant="h4">Primerjava cene košarice</Typography>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow-sm p-4 min-h-[450px]"><BasicBasketChart /></div>
        <div className="bg-white rounded shadow-sm p-4 min-h-[450px]"><ExtendedBasketChart /></div>
        </div>
      </section>

      <br />

      {/* Cene po kategorijah */}
      <section className="container mx-auto py-8 px-4">
        <Typography variant="h4" className="text-center mb-6">Statistika po kategorijah</Typography>
        <div className="w-full min-h-[450px] mb-8">
          <CategoryAvgPriceChart />
        </div>
        <br />
        <div className="w-full min-h-[450px]">
          <CategoryDistributionDonutChart />
        </div>
      </section>
      <br />
      <section className="container mx-auto py-8 px-4">
        <div className="w-full min-h-[450px]">
          <CategoryDiscountShareChart />
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Dashboard;
