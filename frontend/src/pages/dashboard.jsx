import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react'
import AveragePriceBarChart from '@/widgets/cards/averagePriceBarChart';
import PriceTrendLineChart from '@/widgets/cards/priceTrendLineChart';
import BasicBasketChart from '@/widgets/cards/basicBasketChart';
import { ExtendedBasketChart } from '@/widgets/cards';
import { ArrowLeftRight } from 'lucide-react';



export function Dashboard() {
    const [avgData, setAvgData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [trendStores, setTrendStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const [avgRes, trendRes] = await Promise.all([
            fetch('http://localhost:3000/api/dashboard/average-prices'),
            fetch('http://localhost:3000/api/dashboard/price-trends'),
          ]);
          if (!avgRes.ok || !trendRes.ok) {
            throw new Error('En ali več zahtevkov ni uspel');
          }
          const [avgJson, trendJson] = await Promise.all([
            avgRes.json(),
            trendRes.json(),
          ]);
          setAvgData(avgJson);
          // trend endpoint returns { data: [...], stores: [...] }
          setTrendData(trendJson.data);
          setTrendStores(trendJson.stores || []);
        } catch (err) {
          console.error('Napaka pri nalaganju podatkov za graf:', err);
          setError('Napaka pri nalaganju podatkov.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, []);
  
    if (loading) {
      return (
        <Typography className="text-center py-4">Nalagam analitiko…</Typography>
      );
    }
    if (error) {
      return (
        <Typography color="red" className="text-center py-4">{error}</Typography>
      );
    }
  return (
    <>
      <div className="relative flex h-[40vh] items-center justify-center bg-gray-100">
      <div className="absolute top-0 h-full w-full bg-[url('/img/line-graph.png')] bg-cover bg-center" />
        <Card className="absolute p-8 bg-transparent shadow-none">
          <Typography variant="h2" className="text-white">Analiza cen živil</Typography>
          <Typography variant="lead" className="text-white">Primerjajte trende, variabilnost in relativne razlike</Typography>
        </Card>
      </div>
      <section className="-mt-32 bg-white px-4 pb-20 pt-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* vsak graf v svojem divu, da lahko lažje upravljaš višino */}
            <div className="w-full h-[450px] bg-white rounded shadow-sm p-4">
              <AveragePriceBarChart data={avgData} />
            </div>
            <div className="w-full h-[450px] bg-white rounded shadow-sm p-4">
              <PriceTrendLineChart data={trendData} stores={trendStores} />
            </div>
          </div>
        </div>
      </section>
      <section className="container mx-auto py-8">
      {/* Centeriran naslov */}
      <div className="w-full flex justify-center mb-6">
  <div className="flex items-center gap-2">
    <ArrowLeftRight className="w-6 h-6 text-black-500" />
    <Typography variant="h4">Primerjava cene košarice</Typography>
  </div>
</div>

      {/* Dva stolpca z razmikom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow-sm p-4 h-[450px]">
          <BasicBasketChart />
        </div>
        <div className="bg-white rounded shadow-sm p-4 h-[450px]">
          <ExtendedBasketChart />
        </div>
      </div>
    </section>
    </>
  );
}

export default Dashboard;