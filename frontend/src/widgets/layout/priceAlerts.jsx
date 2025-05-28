import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Typography,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
} from '@material-tailwind/react';
import { BellIcon } from '@heroicons/react/24/solid';

export function PriceAlerts({
  alerts,
  onRemove,  // callback za izbris
  onReset,   // callback za ponastavitev
  onUpdate,  // callback za urejanje targetPrice
  onSeen,
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const toggleOpen = () => {
    setOpen(prev => !prev);
    if (open) {
      setEditingId(null);
      setEditValue('');
    }
  };

  const startEdit = (id, current) => {
    setEditingId(id);
    setEditValue(current.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = (id) => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      return alert('Vnesi veljavno ceno.');
    }
    onUpdate && onUpdate(id, newPrice);
    setEditingId(null);
    setEditValue('');
  };

  

  return (
    <>
      {/* Povzetek alarmov */}
      <Card className="mb-6">
        <CardBody>
          <Typography variant="h5" className="mb-4 flex items-center gap-2">
            <BellIcon className="w-6 h-6 text-red-500" /> Cenovni alarmi
          </Typography>

          <Typography variant="h6" className="mt-4">Aktivni alarmi</Typography>
          {alerts.filter(a => !a.triggered).length > 0 ? (
            alerts.filter(a => !a.triggered).map(a => (
              <div key={a.id} className="flex justify-between items-center py-1">
                <span>
                  {a.productName} <em>({a.targetPrice.toFixed(2)} €)</em>
                </span>
              </div>
            ))
          ) : (
            <Typography color="gray">Ni aktivnih alarmov</Typography>
          )}

          <Typography variant="h6" className="mt-6">Izpolnjeni alarmi</Typography>
          {alerts.filter(a => a.triggered).length > 0 ? (
            alerts.filter(a => a.triggered).map(a => (
              <div key={a.id} className="flex justify-between items-center py-1">
                <span>
                  {a.productName} – {a.currentPrice.toFixed(2)} €{' '}
                  <small>({new Date(a.triggeredAt?.seconds * 1000).toLocaleString()})</small>
                </span>
                {a.triggered && !a.seen && (
                  <Button 
                    onClick={() => onSeen(a.id)}
                    size="sm" variant="text"
                  >
                    Označi opaženo
                  </Button>
                )}
                <Button size="sm" variant="text" onClick={() => onReset(a.id)}>
                  Reset
                </Button>
                
                
              </div>
            ))
          ) : (
            <Typography color="gray">Ni izpolnjenih alarmov</Typography>
          )}

          <div className="mt-6 flex justify-end">
            <Button size="sm" variant="text" onClick={toggleOpen}>
              Uredi alarme
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Modal za urejanje alarmov */}
      <Dialog size="md" open={open} handler={toggleOpen} className="!z-50">
        <DialogHeader>Urejanje cenovnih alarmov</DialogHeader>
        <DialogBody divider className="space-y-4">
          {alerts.length === 0 ? (
            <Typography color="gray">Ni nastavljenih alarmov.</Typography>
          ) : (
            alerts.map(a => (
              <Card key={a.id} className="p-2">
                <CardBody className="flex justify-between items-center">
                  <div>
                    <Typography className="font-medium">{a.productName}</Typography>
                    {editingId === a.id ? (
                      <Input
                        type="number"
                        size="sm"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                    ) : (
                      <Typography variant="small" color="gray">
                        Cilj: {a.targetPrice.toFixed(2)} €
                        {a.triggered && `, uresničeno: ${a.currentPrice.toFixed(2)} €`}
                      </Typography>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId === a.id ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(a.id)}>Shrani</Button>
                        <Button size="sm" variant="text" onClick={cancelEdit}>Prekliči</Button>
                      </>
                    ) : (
                      <>
                        {!a.triggered && (
                          <Button
                            size="sm"
                            color="blue"
                            variant="text"
                            onClick={() => startEdit(a.id, a.targetPrice)}
                          >
                            Uredi
                          </Button>
                        )}
                        {!a.triggered && (
                          <Button
                            size="sm"
                            color="red"
                            variant="text"
                            onClick={() => onRemove(a.id)}
                          >
                            Izbriši
                          </Button>
                        )}
                        {a.triggered && (
                          <Button
                            size="sm"
                            variant="text"
                            onClick={() => onReset(a.id)}
                          >
                            Ponastavi
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={toggleOpen}>Zapri</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

export default PriceAlerts;