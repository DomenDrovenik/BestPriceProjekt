import React from 'react';
import { Card, CardBody, Typography, Button } from '@material-tailwind/react';
import { BellIcon } from '@heroicons/react/24/solid';

export function PriceAlerts({ alerts, onEdit }) {
  return (
    <Card className="mb-6">
      <CardBody>
        <Typography variant="h5" className="mb-4 flex items-center gap-2">
          <BellIcon className="w-6 h-6 text-red-500" /> Cenovni alarmi
        </Typography>
        {/* v sekciji Cenovni alarmi */}
<Typography variant="h6" className="mt-4">Aktivni alarmi</Typography>
{alerts.filter(a=>!a.triggered).map(a=>(
  <div key={a.id} className="flex justify-between">
    <span>{a.productName} <em>({a.targetPrice}€)</em></span>
    <Button size="sm" color="red" onClick={()=>removeAlert(a.id)}>X</Button>
  </div>
))}
<Typography variant="h6" className="mt-4">Izpolnjeni alarmi</Typography>
{alerts.filter(a=>a.triggered).map(a=>(
  <div key={a.id} className="flex justify-between">
    <span>
      {a.productName} – {a.currentPrice}€ <small>({new Date(a.triggeredAt?.seconds*1000).toLocaleString()})</small>
    </span>
    <Button size="sm" onClick={()=>resetAlert(a.id)}>Reset</Button>
  </div>
))}
        <Button size="sm" variant="text" onClick={onEdit}>
          Uredi
        </Button>
      </CardBody>
    </Card>
  );
}
