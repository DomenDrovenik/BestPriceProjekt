// src/widgets/cards/CategoryDiscountShareChart.jsx
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartBar } from 'lucide-react'; // ikonca za popuste

const fetcher = (url) => fetch(url).then((r) => r.json());

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
  if (
    cat.includes("delikatesni") ||
    cat.includes("gotove jedi") ||
    cat.includes("delikatesa") ||
    sub.includes("pripravljene")
  ) return "Pripravljene jedi";
  if (
    cat.includes("kava") || sub.includes("zajtrk") || sub.includes("kosmiči") ||
    sub.includes("marmelada") || sub.includes("namazi") || sub.includes("čaj") ||
    sub.includes("maslo") || sub.includes("med") || sub.includes("nutella") ||
    sub.includes("prepečenci") || sub.includes("toasti") || sub.includes("sirni namazi") ||
    sub.includes("žitarice") || sub.includes("otroška hrana") || sub.includes("kakav") ||
    sub.includes("sladki namazi")
  ) return "Vse za zajtrk";
  if (sub.includes("vse za peko") || cat.includes("jajca")) return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";
  return "Drugo";
};

export function CategoryDiscountShareChart() {
  const { data: products, error } = useSWR('http://localhost:3000/api/all-products', fetcher);
  const [isMobile, setIsMobile] = useState(false);

  // Preverimo širino zaslona, da vemo, ali smo na mobilni napravi
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return <Typography color="red" className="text-center py-4">Napaka pri nalaganju podatkov</Typography>;
  }
  if (!products) {
    return <Typography className="text-center py-4">Nalagam…</Typography>;
  }

  // Pripravimo statistiko: za vsako kategorijo število akcijskih in vseh izdelkov
  const stats = {};
  products.forEach((p) => {
    const cat = normalizeCategory(p.category, p.subcategory);
    if (!stats[cat]) {
      stats[cat] = { total: 0, promo: 0 };
    }
    stats[cat].total += 1;
    if (p.actionPrice != null) {
      stats[cat].promo += 1;
    }
  });

  // Oblikujemo polja za graf
  const data = Object.entries(stats).map(([category, { total, promo }]) => ({
    category,
    promoShare: Math.round((promo / total) * 100), // odstotek
  }));

  return (
    <Card className="w-full">
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-red-500" />
        <Typography variant="h5">Delež akcijskih izdelkov po kategorijah</Typography>
      </CardHeader>

      <CardBody className="px-2">
        <div className="w-full" style={{ height: isMobile ? 400 : 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {isMobile ? (
              // Horizontalni bar chart za mobilno
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 20, right: 30, bottom: 20, left: 100 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="promoShare" name="Odstotek akcijskih" fill="#ff7300">
                  {data.map((_, idx) => (
                    <Cell key={idx} fill="#ff7300" />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              // Navpični bar chart za večje zaslone
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, bottom: 60, left: 0 }}
              >
                <XAxis
                  dataKey="category"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{
                    value: '% izdelkov na akciji',
                    angle: -90,
                    position: 'insideLeft',
                    dy: 60,
                  }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="promoShare" name="Odstotek akcijskih" fill="#ff7300" barSize={40}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill="#ff7300" />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <Typography variant="small" className="mt-2 text-center text-gray-600 px-2">
          {isMobile
            ? "Horizontalni graf prikazuje odstotek izdelkov v akciji znotraj vsake kategorije. Kategorije so na levo (Y), odstotek na X (v %)"
            : "Navpični graf prikazuje odstotek izdelkov, ki so trenutno v akciji, znotraj vsake kategorije. Stolpci so po kategorijah, na osi Y je odstotek."}
        </Typography>
      </CardBody>
    </Card>
  );
}

export default CategoryDiscountShareChart;