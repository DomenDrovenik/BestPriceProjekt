import React from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartBar } from 'lucide-react'; // ikonca za popuste

const COLORS = {
  Tuš: '#8884d8',
  Mercator: '#82ca9d',
  Jager: '#ffc658',
  Lidl: '#ff7300',
  Hofer: '#0088FE',
};

const fetcher = url => fetch(url).then(r => r.json());
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

export function CategoryDiscountShareChart() {
  const { data: products, error } = useSWR('http://localhost:3000/api/all-products', fetcher);
  if (error) return <Typography color="red">Napaka pri nalaganju</Typography>;
  if (!products) return <Typography className="text-center">Nalagam…</Typography>;

  // zberi po kategorijah in trgovinah
  const stats = {};
  products.forEach(p => {
    const cat = normalizeCategory(p.category, p.subcategory);
    stats[cat] = stats[cat] || { total: 0, promo: 0 };
    stats[cat].total++;
    if (p.actionPrice != null) stats[cat].promo++;
  });

  // pripravimo niz za graf
  const data = Object.entries(stats).map(([cat, { total, promo }]) => ({
    category: cat,
    Odstotek_akcijskih: Math.round((promo/total)*100),
  }));

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-red-500" />
        <Typography variant="h5">Delež akcijskih izdelkov po kategorijah</Typography>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top:20, right:30, bottom:60, left:0 }}>
            <XAxis dataKey="category" angle={-30} textAnchor="end" interval={0} />
            <YAxis label={{ value: '% izdelkov na akciji', angle:-90, position:'insideLeft', dy: 60 }} />
            <Tooltip formatter={v => `${v}%`} />
            <Bar dataKey="Odstotek_akcijskih" fill="#ff7300" barSize={40}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill="#ff7300" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="small" className="mt-2 text-center text-gray-600">
          Stolpci prikazujejo odstotek izdelkov, ki so trenutno v akciji znotraj posamezne kategorije.
        </Typography>
      </CardBody>
    </Card>
  );
}