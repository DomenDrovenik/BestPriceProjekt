import React from 'react';
import { Typography } from '@material-tailwind/react';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';

export function UpdatedBadge({ updatedAt }) {
  const date = typeof updatedAt === 'string'
    ? parseISO(updatedAt)
    : updatedAt;

  // koliko časa je minilo
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: sl });
  const hours = (Date.now() - date.getTime()) / 36e5;

  // barvna koda
  let color = 'text-green-600';
  if (hours > 168) color = 'text-red-600';
  else if (hours > 120) color = 'text-yellow-600';

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <ShieldCheckIcon className="w-4 h-4" />
      <Typography variant="small">
        {relative.replace('pred ', '')} nazaj
      </Typography>
    </div>
  );
}

export default UpdatedBadge;