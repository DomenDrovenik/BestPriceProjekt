import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartSpline } from 'lucide-react';

// Prednastavljene barve za trgovine
const defaultColors = [
  '#8884d8',  // violet
  '#82ca9d',  // green
  '#ffc658',  // yellow
  '#ff7300',  // orange
  '#0088FE',  // blue
];

const PriceTrendLineChart = ({ data, stores }) => (
  <Card>
    <CardHeader floated={false} shadow={false} className="flex gap-2">
      <ChartSpline className="w-6 h-6 text-green-500" />
      <Typography variant="h5" color="blue-gray">Razvoj povprečnih cen skozi čas</Typography>
    </CardHeader>
    
    <CardBody className="px-0 pt-2">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={d => new Date(d).toLocaleDateString('sl-SI')}
          />
          <YAxis />
          <Tooltip
            formatter={value => `${value.toFixed(2)} €`}
            labelFormatter={d => new Date(d).toLocaleDateString('sl-SI')}
          />
          <Legend />
          {stores.map((store, index) => (
            <Line
              key={store}
              type="monotone"
              dataKey={store}
              name={store}
              stroke={defaultColors[index % defaultColors.length]}
              strokeWidth={2}
              dot={false}
              connectNulls  // poveže prekinjene črte
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Podpis grafa */}
      <Typography variant="small" className="mt-4 px-4 text-center text-gray-600">
        Graf prikazuje gibanje povprečnih cen izdelkov v izbranih trgovinah. Črte označujejo posamezne trgovine, na osi X je čas, na osi Y pa cena v evrih.
      </Typography>
    </CardBody>
  </Card>
);

export default PriceTrendLineChart;