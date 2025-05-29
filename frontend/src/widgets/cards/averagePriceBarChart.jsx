import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartBar } from 'lucide-react';

// Specifične barve za vsako trgovino
const storeColors = {
  'Tuš': '#8884d8',
  'Mercator': '#82ca9d',
  'Jager': '#ffc658',
  'Lidl': '#ff7300',
  'Hofer': '#0088FE',
};

const AveragePriceBarChart = ({ data }) => {
  // Predoblikujemo vhodne podatke: dodamo labelo z imenom trgovine in številom izdelkov
  const chartData = data.map(({ store, avgPrice, count }) => ({
    store,
    avgPrice,
    count,
    label: `${store} (${count})`,
  }));

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
        <ChartBar className="w-6 h-6 text-blue-500" />
        <Typography variant="h5" color="blue-gray">Povprečne cene izdelkov po trgovinah</Typography>
      </CardHeader>
      <CardBody className="px-0 pt-2">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 40, left: 0 }}>
            <XAxis 
              dataKey="label" 
              interval={0} 
              tick={{ angle: -30, textAnchor: 'end' }} 
              height={60}
            />
            <YAxis />
            <Tooltip formatter={value => `${value.toFixed(2)} €`} />
            <Bar dataKey="avgPrice" name="Povprečna cena (€)" barSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={storeColors[entry.store] || '#8884d8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="small" className="mt-4 text-gray-600 text-center">
       Vsaka stolpec prikazuje povprečno ceno vseh izdelkov izbrane trgovine (v oklepaju je število izdelkov, uporabljenih za izračun).  
       Na vertikalni osi je cena v evrih, barve ločujejo trgovine.
     </Typography>
      </CardBody>
    </Card>
  );
};

export default AveragePriceBarChart;