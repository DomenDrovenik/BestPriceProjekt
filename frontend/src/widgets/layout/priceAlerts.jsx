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
        {alerts.length ? (
          <ul className="list-disc list-inside space-y-2">
            {alerts.map(a => (
              <li key={a.id}>
                <Typography>
                  {a.productName} – pod {a.priceThreshold.toFixed(2)} €
                </Typography>
              </li>
            ))}
          </ul>
        ) : (
          <Typography color="gray">Ni nastavljenih alarmov</Typography>
        )}
        <Button size="sm" variant="text" onClick={onEdit}>
          Uredi
        </Button>
      </CardBody>
    </Card>
  );
}
