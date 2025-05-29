import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
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
import { Collapse, List, ListItem } from '@material-tailwind/react';

const fetcher = url => fetch(url).then(res => res.json());
// fixed list of 28 extended basket items
const EXTENDED_ITEMS = [
  'pršut','piščančje hrenovke','kuhan pršut','panceta ali sušena slanina',
  'piščančje meso','goveje meso','sir gavda','mocarela','sveže mleko',
  'trajno polnomastno mleko','trajno pol posneto mleko','kisla smetana','jogurt',
  'jajca','bel kruh','polbel kruh','bageta','kajzerica','žemlja','krompir',
  'jabolka','korenje','banane','čebula','limone','sončnično olje','oljčno olje','maslo'
];

export function ExtendedBasketChart() {
  const { data: extendedItems, error } = useSWR('http://localhost:3000/api/basket/extended', fetcher);
  const [openList, setOpenList] = useState(false);
  if (error) return <Typography color="red" className="text-center py-4">Napaka pri nalaganju košarice</Typography>;
  if (!extendedItems) return <Typography className="text-center py-4">Nalagam…</Typography>;

  const ourExt = extendedItems.reduce((sum,i)=>sum+(i.avgPrice||0),0);
  const today = new Date().toISOString().slice(0,10);
  const lastGov = govBasketData.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop().date;

  const merged = [
    ...govBasketData.map(d=>({ date:d.date, gov:d.extended, our:null })),
    { date:today, gov:null, our:ourExt }
  ].sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartLine className="w-6 h-6 text-red-500" />
        <Typography variant="h5">Razširjena košarica</Typography>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={merged} margin={{ top:20, right:30, bottom:5, left:0 }}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={value=>`${value.toFixed(2)} €`} />
            <Legend />
            <ReferenceArea x1={lastGov} x2={today} fill="rgba(200,200,200,0.2)" />
            <Line dataKey="gov" name="Vladni popisi" stroke="#82ca9d" dot={false} connectNulls />
            <Line dataKey="our" name="Naša košarica" stroke="#d00000" dot={{ r:6 }} />
            <ReferenceDot x={today} y={ourExt} fill="#d00000" r={6}>
              <Label value={`${ourExt.toFixed(2)}€`} position="top" />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>

        <Typography variant="small" className="text-center text-gray-600">
          Črta prikazuje povprečno ceno razširjene košarice (28 skupin živil) iz vladnih popisov ter današnji izračun iz naše baze. Sivo področje označuje obdobje brez podatkov.<br />
          Vir podatkov: <a href="https://www.gov.si/zbirke/projekti-in-programi/ukrepi-za-omilitev-draginje/hrana-in-prehranske-verige/spremljanje-cen-zivil/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GOV.SI – spremljanje cen živil</a>
        </Typography>

        <div className="flex justify-center">
          <Button variant="text" size="sm" onClick={()=>setOpenList(o=>!o)}>
            {openList ? 'Skrij seznam izdelkov' : 'Prikaži seznam izdelkov'}
          </Button>
        </div>
        <Collapse open={openList}>
        <List className="mt-2 grid grid-cols-2 gap-1">
            {EXTENDED_ITEMS.map((it,idx)=>(
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

export default ExtendedBasketChart;
