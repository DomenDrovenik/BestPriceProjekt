// src/pages/Dashboard.jsx
import React from 'react';
import useSWR from 'swr';
import { Card, Typography } from '@material-tailwind/react';
import AveragePriceBarChart from '@/widgets/cards/averagePriceBarChart';
import PriceTrendLineChart from '@/widgets/cards/priceTrendLineChart';
import BasicBasketChart from '@/widgets/cards/basicBasketChart';
import ExtendedBasketChart from '@/widgets/cards/extendedBasketChart';
import { ArrowLeftRight } from 'lucide-react';
import { Footer } from '@/widgets/layout';

// SWR fetcher je že definiran v App.jsx preko SWRConfig
export function Dashboard() {
  // 1) Povprečne cene
  const { data: avgData, error: avgError } =
    useSWR('http://localhost:3000/api/dashboard/average-prices');
  // 2) Trend cen
  const {
    data: trendResp,
    error: trendError
  } = useSWR('http://localhost:3000/api/dashboard/price-trends');

  // Loading / napake
  const loading = !avgData || !trendResp;
  const error = avgError || trendError;

  if (loading) {
    return (
      <Typography className="text-center py-4">Nalagam analitiko…</Typography>
    );
  }
  if (error) {
    return (
      <Typography color="red" className="text-center py-4">
        Napaka pri nalaganju podatkov.
      </Typography>
    );
  }

  // iz trend endpointa razpakiramo
  const trendData = trendResp.data;
  const trendStores = trendResp.stores || [];

  return (
    <>
      {/* Hero sekcija */}
      <div className="relative flex h-[40vh] items-center justify-center bg-gray-100">
        <div
          className="absolute top-0 h-full w-full bg-[url('/img/line-graph.png')] bg-cover bg-center"
        />
        <Card className="absolute p-8 bg-transparent shadow-none">
          <Typography variant="h2" className="text-white">
            Analiza cen živil
          </Typography>
          <Typography variant="lead" className="text-white">
            Primerjajte trende, variabilnost in relativne razlike
          </Typography>
        </Card>
      </div>

      {/* Prvi dve vizualki */}
      <section className="-mt-32 bg-white px-4 pb-20 pt-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="w-full h-[450px]">
              <AveragePriceBarChart data={avgData} />
            </div>
            <div className="w-full h-[450px]">
              <PriceTrendLineChart data={trendData} stores={trendStores} />
            </div>
          </div>
        </div>
      </section>
      <br />

      {/* Primerjava košarice */}
      <section className="container mx-auto py-8">
        {/* Centeriran naslov z ikono */}
        <div className="w-full flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-black" />
            <Typography variant="h4">Primerjava cene košarice</Typography>
          </div>
        </div>

        {/* Dva grafa ob bok */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow-sm p-4 h-[450px]">
            <BasicBasketChart />
          </div>
          <div className="bg-white rounded shadow-sm p-4 h-[450px]">
            <ExtendedBasketChart />
          </div>
        </div>
      </section>
      <br />

    </>
  );
}

export default Dashboard;