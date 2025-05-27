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

const AveragePriceBarChart = ({ data }) => (
  <Card>
    <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
      <ChartBar className="w-6 h-6 text-blue-500" />
      <Typography variant="h5" color="blue-gray">Povprečne cene</Typography>
    </CardHeader>
    <CardBody className="px-0 pt-2">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
          <XAxis dataKey="store" />
          <YAxis />
          <Tooltip formatter={value => `${value.toFixed(2)} €`} />
          <Bar dataKey="avgPrice" name="Cena (€)" barSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={storeColors[entry.store] || '#8884d8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardBody>
  </Card>
);

export default AveragePriceBarChart;