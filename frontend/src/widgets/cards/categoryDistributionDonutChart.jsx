// src/widgets/cards/CategoryDistributionDonutChart.jsx
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartPie } from 'lucide-react';

const fetcher = (url) => fetch(url).then((r) => r.json());

// Paleta barv (lahko poljubno razširite ali spremenite)
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE',
  '#a4de6c', '#d0ed57', '#8dd1e1', '#ffbb28', '#00C49F',
  '#FF8042', '#845EC2', '#D65DB1', '#FF6F91', '#FF9671',
];

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
  if (cat.includes("kava") || sub.includes("zajtrk") || sub.includes("kosmiči") || sub.includes("marmelada")
      || sub.includes("namazi") || sub.includes("čaj") || sub.includes("maslo") || sub.includes("med")
      || sub.includes("nutella") || sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi")
      || sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") || sub.includes("sladki namazi")) return "Vse za zajtrk";
  if (sub.includes("vse za peko") || cat.includes("jajca")) return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";
  return "Drugo";
};

export function CategoryDistributionDonutChart() {
  const { data: products, error } = useSWR('http://localhost:3000/api/all-products', fetcher);
  // Stanje za zaznavanje mobilnega pogleda
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    // Na začetku preverimo
    handleResize();
    // Registriramo poslušalca dogodka resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return <Typography color="red" className="text-center py-4">Napaka pri nalaganju</Typography>;
  }
  if (!products) {
    return <Typography className="text-center py-4">Nalagam…</Typography>;
  }

  // Preštej izdelke po kategorijah
  const counts = products.reduce((acc, p) => {
    const cat = normalizeCategory(p.category, p.subcategory);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  // Na mobilnih napravah naredimo donut graf manjši
  const innerR = isMobile ? 60 : 110;
  const outerR = isMobile ? 90 : 200;
  const height = isMobile ? 300 : 500;

  return (
    <Card className="w-full">
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartPie className="w-6 h-6 text-indigo-500" />
        <Typography variant="h5">Porazdelitev izdelkov po kategorijah</Typography>
      </CardHeader>

      <CardBody className="flex flex-col items-center px-2">
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={innerR}
                outerRadius={outerR}
                // Na mobilnih napravah ne uporabljamo label (preveč natrpano);
                // na večjih zaslonih prikažemo nalepke.
                label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => `${v} izdelkov`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Podpis grafu: vedno pod grafom, ne glede na velikost */}
        <Typography variant="small" className="mt-2 text-center text-gray-600 px-2">
        {isMobile
            ? "Graf prikazuje, koliko izdelkov je v posamezni kategoriji, če klikneš na kategorijo se ti prikaže število." 
            : "Graf prikazuje, kolikšen delež vseh izdelkov v bazi pripada posamezni kategoriji (v %), če greš na posamezno kategorijo se prikaže tudi število izdelkov v tej kategoriji." }
        </Typography>
      </CardBody>
    </Card>
  );
}

export default CategoryDistributionDonutChart;