import React from 'react';
import { Typography } from '@material-tailwind/react';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';
import { parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

export function UpdatedBadge({ updatedAt }) {
  if (!updatedAt) return null;

  // parse string timestamps
  const date = typeof updatedAt === 'string'
    ? parseISO(updatedAt)
    : updatedAt;

  const now = new Date();
  const days = differenceInDays(now, date);
  let text;

  if (days > 0) {
    text = days === 1 ? '1 dan nazaj' : `${days} dni nazaj`;
  } else {
    const hours = differenceInHours(now, date);
    if (hours > 0) {
      text = hours === 1 ? '1 ura nazaj' : `${hours} ur nazaj`;
    } 
  }

  // determine color (hours since update)
  const ageHours = (now.getTime() - date.getTime()) / 36e5;
  let colorClass = 'text-red-600';
  if (ageHours > 168) colorClass = 'text-green-600';
  else if (ageHours > 120) colorClass = 'text-yellow-600';

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <ShieldCheckIcon className="w-4 h-4" />
      <Typography variant="small">{text}</Typography>
    </div>
  );
}

export default UpdatedBadge;