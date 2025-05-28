import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceArea, ReferenceDot, Label } from 'recharts';
import govBasketData from '@/data/govBasketData';
import { ChartLine } from 'lucide-react';

export function BasicBasketChart() {
  const [basicItems, setBasicItems] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3000/api/basket/basic');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setBasicItems(data);
      } catch {
        setError('Napaka pri nalaganju osnovne košarice');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Typography className="text-center py-4">Nalagam…</Typography>;
  if (error)   return <Typography color="red" className="text-center py-4">{error}</Typography>;

  const ourBasic = basicItems.reduce((s,i)=>s + (i.avgPrice||0),0);
  const today    = new Date().toISOString().slice(0,10);
  const lastGov  = govBasketData.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop().date;

  const merged = [
    ...govBasketData.map(d=>({ date:d.date, gov:d.basic, our:null })),
    { date:today, gov:null, our:ourBasic }
  ].sort((a,b)=>a.date.localeCompare(b.date));

  const fmt = d=>d;

  return (
    <Card>
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartLine className="w-6 h-6 text-purple-500" />
        <Typography variant="h5">Osnovna košarica</Typography>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={merged} margin={{ top:20, right:30, bottom:5, left:0 }}>
            <XAxis dataKey="date" tickFormatter={fmt} />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceArea x1={lastGov} x2={today} fill="rgba(200,200,200,0.2)" />
            <Line dataKey="gov" name="Osnovna košarica" stroke="#8884d8" dot={false} />
            <Line dataKey="our" name="Naša osnovna košarica" stroke="#ff7300" dot={{ r:6 }} />
            <ReferenceDot x={today} y={ourBasic} fill="#ff7300" r={6}>
              <Label value={`${ourBasic.toFixed(2)}€`} position="top" />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

export default BasicBasketChart;