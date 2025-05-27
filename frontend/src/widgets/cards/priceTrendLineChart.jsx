import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { ChartLine } from 'lucide-react';

// Prednastavljene barve za trgovine (po vrsti ali glede na ime)
const defaultColors = [
  '#8884d8',  // violet
  '#82ca9d',  // green
  '#ffc658',  // yellow
  '#ff7300',  // orange
  '#0088FE',  // blue
];

const PriceTrendLineChart = ({ data, stores }) => (
  <Card>
    <CardHeader floated={false} shadow={false} className="flex items-center gap-2">
      <ChartLine className="w-6 h-6 text-green-500" />
      <Typography variant="h5" color="blue-gray">Trend cen skozi čas</Typography>
    </CardHeader>
    <CardBody className="px-0 pt-2">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={d => new Date(d).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip
            formatter={value => `${value.toFixed(2)} €`}
            labelFormatter={d => new Date(d).toLocaleDateString()}
          />
          <Legend />
          {stores.map((store, index) => (
            <Line
              key={store}
              type="monotone"
              dataKey={store}
              dot={false}
              name={store}
              stroke={defaultColors[index % defaultColors.length]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardBody>
  </Card>
);

export default PriceTrendLineChart;
