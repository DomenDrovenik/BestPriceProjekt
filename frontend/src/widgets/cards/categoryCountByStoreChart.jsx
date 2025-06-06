import React from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardBody, Typography } from "@material-tailwind/react";
import { ChartBar } from "lucide-react";

// Barve za posamezno trgovino (upoštevajte, da se ujema z oznakami “store”).
const storeColors = {
  "Tuš": "#8884d8",
  "Mercator": "#82ca9d",
  "Jager": "#ffc658",
  "Lidl": "#ff7300",
  "Hofer": "#0088FE",
};

// Globalni fetcher za SWR
const fetcher = (url) => fetch(url).then((res) => res.json());

// Funkcija za normalizacijo kategorij (enaka kot jo uporabljate drugod)
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
      sub.includes("nutella") || sub.includes("prepečenci") || sub.includes("toasti") ||
      sub.includes("sirni namazi") || sub.includes("žitarice") || sub.includes("otroška hrana") ||
      sub.includes("kakav") || sub.includes("sladki namazi")) return "Vse za zajtrk";
  if (sub.includes("vse za peko") || cat.includes("jajca")) return "Vse za peko";
  if (sub.includes("tuja prehrana") || sub.includes("hrana tujih dežel")) return "Tuja prehrana";
  return "Drugo";
};

export function CategoryCountByStoreChart() {
  // 1) Pridobimo vse izdelke
  const { data: products, error } = useSWR(
    "https://bestpriceprojekt-production.up.railway.app/api/all-products",
    fetcher
  );

  if (error) {
    return (
      <Typography color="red" className="text-center">
        Napaka pri nalaganju podatkov
      </Typography>
    );
  }
  if (!products) {
    return (
      <Typography className="text-center">
        Nalagam…
      </Typography>
    );
  }

  // 2) Zberemo seznam vseh trgovin (šele iz dobljenih izdelkov)
  const stores = Array.from(new Set(products.map((p) => p.store)));

  // 3) Normaliziramo kategorije iz vseh izdelkov in dobimo unikatne kategorije
  const categoriesSet = new Set(
    products.map((p) => normalizeCategory(p.category, p.subcategory))
  );
  const categories = Array.from(categoriesSet);

  // 4) Za vsako kategorijo in trgovino preštejemo izdelke
  const data = categories.map((cat) => {
    const rec = { category: cat };
    stores.forEach((store) => {
      const count = products.filter(
        (p) =>
          p.store === store &&
          normalizeCategory(p.category, p.subcategory) === cat
      ).length;
      rec[store] = count;
    });
    return rec;
  });

  // 5) Izračun minimalne širine za graf (približno 80px na kategorijo)
  const minChartWidth = Math.max(categories.length * 80, 300);

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-green-500" />
        <Typography variant="h5">Število izdelkov po kategorijah (po trgovinah)</Typography>
      </CardHeader>
      <CardBody>
        {/* Zunanji div omogoča horizontalni scroll */}
        <div style={{ overflowX: "auto" }}>
          {/* Notranji div z minimalno širino, da se graf na mobilnem zasuče v vodoravno smer */}
          <div style={{ width: minChartWidth, height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
              >
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis
                  label={{
                    value: "Število izdelkov",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                {stores.map((store) => (
                  <Bar
                    key={store}
                    dataKey={store}
                    name={store}
                    fill={storeColors[store] || "#555"}
                    barSize={30}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Typography variant="small" className="mt-2 text-center text-gray-600">
          Vsak stolpec (po barvi) predstavlja število izdelkov izbrane kategorije v določeni trgovini.
        </Typography>
      </CardBody>
    </Card>
  );
}

export default CategoryCountByStoreChart;