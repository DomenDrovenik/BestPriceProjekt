// src/widgets/cards/CategoryAvgPriceChart.jsx
import React from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartBar } from 'lucide-react';

// Preslikava trgovine → barva
const storeColors = {
  'Tuš': '#8884d8',
  'Mercator': '#82ca9d',
  'Jager': '#ffc658',
  'Lidl': '#ff7300',
  'Hofer': '#0088FE',
};

// fetcher za SWR
const fetcher = url => fetch(url).then(r => r.json());

// Funkcija za normalizacijo kategorij
const normalizeCategory = (category, subcategory) => {
    const cat = (category || "").toLowerCase();
    const sub = (subcategory || "").toLowerCase();
    if (cat.includes("sadje") || sub.includes("zelenjava")) return "Sadje in zelenjava";
    if (cat.includes("mleko") || cat.includes("mlečni izdelki") || sub.includes("sir")) return "Mlečni izdelki";
    if (cat.includes("meso") || sub.includes("ribe")) return "Meso in ribe";
    if (cat.includes("kruh") || sub.includes("toast")) return "Pekovski izdelki";
    if (cat.includes("zamrznjena") || sub.includes("sladoled")) return "Zamrznjena hrana";
    if (cat.includes("konzervirana") || cat.includes("konzervire") || sub.includes("konzerve")) return "Konzervirana živila";
    if (cat.includes("olje") || sub.includes("sol")) return "Olja in maščobe";
    if (cat.includes("testenine") || sub.includes("juhe")) return "Testenine, žita, juhe";
    if (cat.includes("sladki") || cat.includes("sladkarije") || cat.includes("sladkor")  || sub.includes("čokolada") ) return "Sladkor, sladkarije in prigrizki";
    if (cat.includes("pijače") || sub.includes("sokovi")) return "Pijače";
    if (cat.includes("bio") || sub.includes("zdrava")) return "Bio izdelki";
    if (cat.includes("delikatesni") || cat.includes("gotove jedi") || cat.includes("delikatesa") || sub.includes("pripravljene")) return "Pripravljene jedi";
     if ( cat.includes("kava") || sub.includes("zajtrk") || sub.includes("kosmiči") || sub.includes("marmelada") ||
      sub.includes("namazi") || sub.includes("čaj") || sub.includes("kava") ||
      sub.includes("maslo") || sub.includes("med") || sub.includes("nutella") ||
      sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi") ||
      sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") ||
      sub.includes("sladki namazi")) return "Vse za zajtrk";
    if (sub.includes("vse za peko") || cat.includes("jajca"))  return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";

    return "Drugo";
  };

export function CategoryAvgPriceChart() {
  const { data: products, error } = useSWR('http://localhost:3000/api/all-products', fetcher);

  if (error) return <Typography color="red">Napaka pri nalaganju podatkov</Typography>;
  if (!products) return <Typography className="text-center">Nalagam…</Typography>;

  // 1) zberi unikatne trgovine in kategorije
  const stores = [...new Set(products.map(p => p.store))];
  const categories = [...new Set(
    products.map(p => normalizeCategory(p.category, p.subcategory))
  )];

  // 2) za vsako kategorijo in trgovino izračunaj povprečje
  const data = categories.map(cat => {
    const rec = { category: cat };
    stores.forEach(store => {
      const vals = products
        .filter(p => p.store === store && normalizeCategory(p.category, p.subcategory) === cat)
        .map(p => parseFloat((p.actionPrice ?? p.price ?? '0').toString().replace(',', '.')));
      rec[store] = vals.length
        ? vals.reduce((sum, v) => sum + v, 0) / vals.length
        : null;
    });
    return rec;
  });

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-blue-500" />
        <Typography variant="h5">Povprečne cene po kategorijah</Typography>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <XAxis
              dataKey="category"
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis label={{ value: '€', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={v => v != null ? `${v.toFixed(2)} €` : '-'} />
            <Legend verticalAlign="top" />
            {stores.map(store => (
              <Bar
                key={store}
                dataKey={store}
                name={store}
                barSize={30}
                fill={storeColors[store] || '#888'}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="small" className="mt-2 text-center text-gray-600">
          Vsaka skupina stolpcev prikazuje povprečno ceno izdelkov izbrane kategorije v posamezni trgovini.
        </Typography>
      </CardBody>
    </Card>
  );
}

export default CategoryAvgPriceChart;