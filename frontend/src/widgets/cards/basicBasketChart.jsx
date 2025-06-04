import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Collapse,
  List,
  ListItem,
} from '@material-tailwind/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceDot,
  Label,
} from 'recharts';
import govBasketData from '@/data/govBasketData';
import { ChartLine } from 'lucide-react';

const fetcher = url => fetch(url).then(res => res.json());
// fixed list of 15 basic basket items
const BASIC_ITEMS = [
  'pšenična bela moka, tip 500',
  'beli kruh',
  'testenine, polži majhni',
  'goveje meso',
  'svinjsko meso',
  'piščančje meso',
  'sveže polnomastno mleko (3,5 %)',
  'tekoči jogurt (3,2 %)',
  'poltrdi polmastni sir',
  'maslo',
  'jajca hlevske reje, kategorija M',
  'jabolka, različne sorte',
  'jedilni krompir',
  'sončnično olje',
  'beli sladkor',
];

export function BasicBasketChart() {
  const { data: basicItems, error } = useSWR('https://bestpriceprojekt-production.up.railway.app/api/basket/basic', fetcher);
  const [openList, setOpenList] = useState(false);

  if (error) return <Typography color="red" className="text-center py-4">Napaka pri nalaganju košarice</Typography>;
  if (!basicItems) return <Typography className="text-center py-4">Nalagam…</Typography>;

  const ourBasic = basicItems.reduce((sum, item) => sum + (item.avgPrice || 0), 0);
  const today = new Date().toISOString().slice(0,10);
  const lastGov = govBasketData.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop().date;

  const merged = [
    ...govBasketData.map(d=>({ date:d.date, gov:d.basic, our:null })),
    { date:today, gov:null, our:ourBasic }
  ].sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartLine className="w-6 h-6 text-purple-500" />
        <Typography variant="h5">Primerjava osnovne košarice</Typography>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={merged} margin={{ top:20, right:30, bottom:5, left:0 }}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={value => `${value.toFixed(2)} €`} />
            <Legend />
            <ReferenceArea x1={lastGov} x2={today} fill="rgba(200,200,200,0.2)" />
            <Line dataKey="gov" name="Vladni popisi" stroke="#8884d8" dot={false} connectNulls />
            <Line dataKey="our" name="Naša košarica" stroke="#ff7300" dot={{ r:6 }} />
            <ReferenceDot x={today} y={ourBasic} fill="#ff7300" r={6}>
              <Label value={`${ourBasic.toFixed(2)}€`} position="top" />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>

        <Typography variant="small" className="text-center text-gray-600">
          Črta prikazuje povprečno ceno osnovne košarice (15 skupin živil) iz vladnih popisov ter današnji izračun iz naše baze. Sivo področje označuje obdobje brez podatkov.<br />
          Vir podatkov: <a href="https://www.gov.si/zbirke/projekti-in-programi/ukrepi-za-omilitev-draginje/hrana-in-prehranske-verige/spremljanje-cen-zivil/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GOV.SI – spremljanje cen živil</a>
        </Typography>

        <div className="flex justify-center">
          <Button variant="text" size="sm" onClick={()=>setOpenList(o=>!o)}>
            {openList ? 'Skrij seznam izdelkov' : 'Prikaži seznam izdelkov'}
          </Button>
        </div>
        <Collapse open={openList}>
        <List className="mt-2 grid grid-cols-2 gap-1">
            {BASIC_ITEMS.map((it, idx)=>(
              <ListItem key={idx} className="pl-0">
                <Typography variant="small">• {it}</Typography>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardBody>
    </Card>
  );
}

export default BasicBasketChart;