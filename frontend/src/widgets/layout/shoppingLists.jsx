import React from 'react';
import { Card, CardBody, Typography, Button } from '@material-tailwind/react';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';

export function ShoppingLists({ lists, onCreate }) {
  return (
    <Card className="mb-6">
      <CardBody>
        <Typography variant="h5" className="mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="w-6 h-6 text-indigo-500" /> Seznami
        </Typography>
        {lists.length ? (
          <ul className="list-decimal list-inside space-y-2">
            {lists.map(l => (
              <li key={l.id}>
                <Typography className="font-medium">{l.name}</Typography>
                <Typography variant="small" color="gray">
                  {l.items?.length || 0} elementov
                </Typography>
              </li>
            ))}
          </ul>
        ) : (
          <Typography color="gray">Ni shranjenih seznamov</Typography>
        )}
        <Button size="sm" variant="text" onClick={onCreate}>
          Ustvari nov seznam
        </Button>
      </CardBody>
    </Card>
  );
}