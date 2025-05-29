import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Typography, Button } from '@material-tailwind/react';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';

function ShoppingListsComponent({ lists, onCreate }) {
  const navigate = useNavigate();
  const handleOpen = (id) => {
    navigate(`/shopping-list`);
  };

  return (
    <Card className="mb-6">
      <CardBody>
        <Typography variant="h5" className="mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="w-6 h-6 text-indigo-500" /> Seznami
        </Typography>
        {lists.length ? (
          <ul className="space-y-2">
            {lists.map(l => (
              <li
                key={l.id}
                className="p-2 rounded hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                onClick={() => handleOpen(l.id)}
              >
                <div>
                  <Typography className="font-medium">{l.name}</Typography>
                  <Typography variant="small" color="gray">
                    {l.items?.length || 0} elementov
                  </Typography>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Typography color="gray">Ni shranjenih seznamov</Typography>
        )}
        <Button
          size="sm"
          variant="text"
          onClick={() => 
            handleOpen()
          }
        >
          Ustvari nov seznam
        </Button>
      </CardBody>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders when props don’t change
export const ShoppingLists = memo(ShoppingListsComponent);
