import React from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
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
  Label
} from 'recharts';
import govBasketData from '@/data/govBasketData';
import { ChartLine } from 'lucide-react';

const fetcher = url => fetch(url).then(res => res.json());

export function ExtendedBasketChart() {
  const { data: extendedItems, error } = useSWR('http://localhost:3000/api/basket/extended', fetcher);

  if (error) {
    return <Typography color="red" className="text-center py-4">Napaka pri nalaganju razširjene košarice</Typography>;
  }
  if (!extendedItems) {
    return <Typography className="text-center py-4">Nalagam…</Typography>;
  }

  const ourExt = extendedItems.reduce((sum, item) => sum + (item.avgPrice || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const lastGov = govBasketData.slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop().date;

  const merged = [
    ...govBasketData.map(d => ({ date: d.date, gov: d.extended, our: null })),
    { date: today, gov: null, our: ourExt }
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartLine className="w-6 h-6 text-red-500" />
        <Typography variant="h5">Razširjena košarica</Typography>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={merged} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceArea x1={lastGov} x2={today} fill="rgba(200,200,200,0.2)" />
            <Line dataKey="gov" name="Razširjena košarica" stroke="#82ca9d" dot={false} />
            <Line dataKey="our" name="Naša razširjena košarica" stroke="#d00000" dot={{ r: 6 }} />
            <ReferenceDot x={today} y={ourExt} fill="#d00000" r={6}>
              <Label value={`${ourExt.toFixed(2)}€`} position="top" />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

export default ExtendedBasketChart;