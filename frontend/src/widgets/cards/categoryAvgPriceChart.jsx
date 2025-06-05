// src/widgets/cards/CategoryAvgPriceChart.jsx
import React, { useState, useEffect } from 'react';
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

// SWR fetcher
const fetcher = url => fetch(url).then(res => res.json());

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
  if (cat.includes("sladki") || cat.includes("sladkarije") || cat.includes("sladkor") || sub.includes("čokolada")) return "Sladkor, sladkarije in prigrizki";
  if (cat.includes("pijače") || sub.includes("sokovi")) return "Pijače";
  if (cat.includes("bio") || sub.includes("zdrava")) return "Bio izdelki";
  if (cat.includes("delikatesni") || cat.includes("gotove jedi") || cat.includes("delikatesa") || sub.includes("pripravljene")) return "Pripravljene jedi";
  if (cat.includes("kava") || sub.includes("zajtrk") || sub.includes("kosmiči") || sub.includes("marmelada") ||
      sub.includes("namazi") || sub.includes("čaj") || sub.includes("maslo") || sub.includes("med") ||
      sub.includes("nutella") || sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi") ||
      sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") || sub.includes("sladki namazi")) return "Vse za zajtrk";
  if (sub.includes("vse za peko") || cat.includes("jajca")) return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";
  return "Drugo";
};

export function CategoryAvgPriceChart() {
  // Z uporabo useSWR pridobimo vse izdelke
  const { data: products, error } = useSWR('https://bestpriceprojekt-production.up.railway.app/api/all-products', fetcher);

  // Stanje, ki pove, ali je mobilni pogled (širina < 768px)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Funkcija, ki nastavi stanje isMobile glede na trenutni viewport
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Na začetku preverimo
    handleResize();

    // Poslušamo spremembe velikosti okna
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return <Typography color="red" className="text-center py-4">Napaka pri nalaganju podatkov</Typography>;
  }
  if (!products) {
    return <Typography className="text-center py-4">Nalagam…</Typography>;
  }

  // 1) Zberemo unikatne trgovine in kategorije
  const stores = Array.from(new Set(products.map(p => p.store)));
  const categories = Array.from(new Set(
    products.map(p => normalizeCategory(p.category, p.subcategory))
  ));

  // 2) Izračunamo povprečne cene po kategorijah in trgovinah
  const data = categories.map(cat => {
    const rec = { category: cat };
    stores.forEach(store => {
      const vals = products
        .filter(p => p.store === store && normalizeCategory(p.category, p.subcategory) === cat)
        .map(p => parseFloat((p.actionPrice ?? p.price ?? '0').toString().replace(',', '.')));
      rec[store] = vals.length ? (vals.reduce((sum, v) => sum + v, 0) / vals.length) : null;
    });
    return rec;
  });

  return (
    <Card className="w-full">
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-blue-500" />
        <Typography variant="h5">Povprečne cene po kategorijah</Typography>
      </CardHeader>

      <CardBody className="px-2">
        <div className={isMobile ? "overflow-x-auto" : ""}>
          <div style={{ width: isMobile ? Math.max(categories.length * 100, 300) : '100%' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <XAxis
                  dataKey="category"
                  tick={{ angle: -30, textAnchor: 'end', fontSize: isMobile ? 10 : 12 }}
                  interval={0}
                  height={isMobile ? 80 : 60}
                />
                <YAxis
                  label={{
                    value: '€',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -10,
                    fontSize: 12,
                  }}
                />
                <Tooltip formatter={v => v != null ? `${v.toFixed(2)} €` : '-'} />
                {!isMobile && <Legend verticalAlign="top" />}

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
          </div>
        </div>

        {/* Podpis grafa - vedno pod grafom */}
        <Typography variant="small" className="mt-4 text-gray-600 text-center">
          Vsaka skupina stolpcev prikazuje povprečno ceno izdelkov izbrane kategorije v posamezni trgovini.
        </Typography>
        {isMobile && <Typography variant="small" className="mt-4 text-gray-600 text-center">
            Barve označujejo trgovine in če kliknete na posamezno kategorijo se prikažejo tudi povprečne cene glede na trgovino.
            <br /> 
            Graf lahko pomikate vodoravno, da si ogledate vse kategorije.
            </Typography>
        }

      </CardBody>
    </Card>
  );
}

export default CategoryAvgPriceChart;